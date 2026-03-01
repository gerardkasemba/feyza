import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { onVoucheeLoanCompleted } from '@/lib/vouching/accountability';
import { logger } from '@/lib/logger';

const log = logger('backfill-vouches');

/**
 * POST /api/admin/backfill-vouches
 *
 * One-time backfill for loans that completed before the voucher pipeline was
 * fixed (loans_completed stuck at 0 despite the loan being paid off).
 *
 * For every completed loan whose borrower has active vouchers AND whose
 * voucher has not yet been credited (loans_completed still 0), this endpoint:
 *   - Increments loans_completed on the vouch row
 *   - Decrements loans_active (prevents double-counting)
 *   - Records a trust_score_event for the voucher (+2 pts)
 *   - Recalculates the voucher's success rate
 *
 * Safe to call multiple times — uses trust_score_events dedup so it won't
 * double-credit vouchers that were already processed.
 *
 * Auth: must be logged in as the lender / admin of the affected business.
 * Pass { loan_id } in the body to target a specific loan, or omit to run
 * across all completed loans for borrowers who have active vouches.
 */
export async function POST(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    // Accepts either:
    //   A) A logged-in session cookie (normal browser usage)
    //   B) Authorization: Bearer <ADMIN_SECRET> header (Postman / CLI usage)
    const authHeader = request.headers.get('authorization') ?? '';
    const adminSecret = process.env.ADMIN_SECRET ?? '';

    let authedUserId: string | null = null;
    let useServiceClientForQuery = false;

    if (adminSecret && authHeader === `Bearer ${adminSecret}`) {
      // Admin secret supplied — bypass session auth, run across ALL completed loans
      log.info('[Backfill] Admin secret auth — running full backfill');
      useServiceClientForQuery = true;
    } else {
      // Fall back to session cookie auth
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized — either pass Authorization: Bearer <ADMIN_SECRET> or log in first' },
          { status: 401 }
        );
      }
      authedUserId = user.id;
    }

    const body = await request.json().catch(() => ({}));
    const { loan_id } = body;

    const serviceClient = await createServiceRoleClient();

    // Build the query for completed loans
    let query = serviceClient
      .from('loans')
      .select('id, borrower_id, completed_at')
      .eq('status', 'completed');

    if (loan_id) {
      // Specific loan targeted — no further scoping needed
      query = query.eq('id', loan_id);
    } else if (useServiceClientForQuery) {
      // Admin secret auth — run across ALL completed loans in the system
      log.info('[Backfill] Full-system backfill (no lender filter)');
    } else {
      // Session auth — scope to this lender's loans only
      const { data: userBusinesses } = await serviceClient
        .from('business_profiles')
        .select('id')
        .eq('user_id', authedUserId!);

      const bizIds = (userBusinesses || []).map((b: any) => b.id);

      if (bizIds.length > 0) {
        query = query.in('business_lender_id', bizIds);
      } else {
        query = query.eq('lender_id', authedUserId!);
      }
    }

    const { data: completedLoans, error: loansError } = await query;

    if (loansError) {
      return NextResponse.json({ error: loansError.message }, { status: 500 });
    }

    if (!completedLoans || completedLoans.length === 0) {
      return NextResponse.json({ message: 'No completed loans found', processed: 0 });
    }

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const loan of completedLoans) {
      try {
        // Check if this loan already has a voucher completion event (dedup guard)
        const { data: existingVoucherEvents } = await serviceClient
          .from('trust_score_events')
          .select('id')
          .eq('loan_id', loan.id)
          .eq('event_type', 'vouch_given')
          .limit(1);

        if (existingVoucherEvents && existingVoucherEvents.length > 0) {
          log.info(`[Backfill] Loan ${loan.id} already has voucher events — skipping`);
          skipped++;
          continue;
        }

        // Check if this borrower even has active vouches
        const { data: vouches } = await serviceClient
          .from('vouches')
          .select('id')
          .eq('vouchee_id', loan.borrower_id)
          .eq('status', 'active')
          .limit(1);

        if (!vouches || vouches.length === 0) {
          skipped++;
          continue;
        }

        // Run the completion pipeline
        const result = await onVoucheeLoanCompleted(serviceClient, loan.borrower_id, loan.id);
        log.info(`[Backfill] Loan ${loan.id}:`, result);

        if (result.errors.length > 0) {
          errors.push(`Loan ${loan.id}: ${result.errors.join(', ')}`);
        } else {
          processed++;
        }
      } catch (err: any) {
        log.error(`[Backfill] Error processing loan ${loan.id}:`, err);
        errors.push(`Loan ${loan.id}: ${err.message}`);
      }
    }

    return NextResponse.json({
      message: `Backfill complete`,
      processed,
      skipped,
      errors,
      total: completedLoans.length,
    });
  } catch (err: any) {
    log.error('[Backfill] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
