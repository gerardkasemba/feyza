import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { onPaymentCompleted } from '@/lib/payments/handler';

const log = logger('loans-reconcile');

/**
 * POST /api/loans/reconcile
 *
 * Reconciles a loan's amount_paid, amount_remaining, and status by
 * summing all paid payment_schedule items rather than trusting the
 * potentially stale incremental values on the loan row.
 *
 * Use this to fix loans that show incorrect balances after the stale-
 * loan-data bug caused payments to not accumulate correctly.
 *
 * Body: { loan_id: string }
 * Auth: must be the borrower of the loan, or an admin (service role bypasses check).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loan_id } = body;

    if (!loan_id) {
      return NextResponse.json({ error: 'loan_id is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = await createServiceRoleClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the loan
    const { data: loan, error: loanError } = await serviceSupabase
      .from('loans')
      .select('id, amount, total_amount, amount_paid, amount_remaining, status, borrower_id')
      .eq('id', loan_id)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Only the borrower (or admin) can trigger reconciliation
    if (loan.borrower_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Already completed — nothing to do
    if (loan.status === 'completed') {
      return NextResponse.json({
        reconciled: false,
        message: 'Loan is already completed',
        loan_id,
      });
    }

    // Fetch all payment_schedule items for this loan
    const { data: scheduleItems, error: scheduleError } = await serviceSupabase
      .from('payment_schedule')
      .select('id, amount, is_paid')
      .eq('loan_id', loan_id);

    if (scheduleError) {
      return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
    }

    const totalScheduled = scheduleItems?.length ?? 0;
    const paidItems = scheduleItems?.filter((s) => s.is_paid) ?? [];
    const allPaymentsPaid = totalScheduled > 0 && paidItems.length === totalScheduled;

    // Authoritative amount paid = sum of all paid schedule items
    const truePaid = paidItems.reduce((sum: number, s) => sum + (Number(s.amount) || 0), 0);
    const loanTotal = (Number(loan.total_amount) > 0) ? Number(loan.total_amount) : Number(loan.amount);
    const trueRemaining = Math.max(0, loanTotal - truePaid);
    const isCompleted = allPaymentsPaid || trueRemaining <= 0.50;

    // Check if anything needs updating
    const dbPaid = Number(loan.amount_paid) || 0;
    const dbRemaining = Number(loan.amount_remaining) ?? 0;
    const dbStatus = loan.status;

    const needsUpdate =
      Math.abs(dbPaid - (isCompleted ? loanTotal : truePaid)) > 0.01 ||
      Math.abs(dbRemaining - (isCompleted ? 0 : trueRemaining)) > 0.01 ||
      (isCompleted && dbStatus !== 'completed');

    if (!needsUpdate) {
      return NextResponse.json({
        reconciled: false,
        message: 'Loan balances are already correct',
        loan_id,
        amount_paid: dbPaid,
        amount_remaining: dbRemaining,
        status: dbStatus,
      });
    }

    // Apply the correction
    const { error: updateError } = await serviceSupabase
      .from('loans')
      .update({
        amount_paid: isCompleted ? loanTotal : truePaid,
        amount_remaining: isCompleted ? 0 : trueRemaining,
        status: isCompleted ? 'completed' : loan.status,
        completed_at: isCompleted ? new Date().toISOString() : null,
        last_payment_at: paidItems.length > 0 ? new Date().toISOString() : null,
      })
      .eq('id', loan_id);

    if (updateError) {
      log.error('[Reconcile] Update failed:', updateError);
      return NextResponse.json({ error: 'Reconciliation update failed' }, { status: 500 });
    }

    log.info(`[Reconcile] Loan ${loan_id} fixed: paid ${dbPaid} -> ${isCompleted ? loanTotal : truePaid}, remaining ${dbRemaining} -> ${isCompleted ? 0 : trueRemaining}, status ${dbStatus} -> ${isCompleted ? 'completed' : dbStatus}`);

    // If reconcile just completed the loan, run the trust/voucher pipeline (awaited for consistency).
    // onPaymentCompleted has its own dedup guard (checks trust_score_events) so it's
    // safe to call even if the payment was already partially processed.
    let pipelineResult: { trustScoreUpdated?: boolean; loanCompleted?: boolean; error?: string } | null = null;
    if (isCompleted && dbStatus !== 'completed' && loan.borrower_id) {
      try {
        const result = await onPaymentCompleted({
          supabase: serviceSupabase as any,
          loanId: loan_id,
          borrowerId: loan.borrower_id,
          paymentMethod: 'manual',
          amount: loanTotal,
          skipUserStats: true, // reconcile doesn't re-process individual payment stats
        });
        pipelineResult = {
          trustScoreUpdated: result.trustScoreUpdated,
          loanCompleted: result.loanCompleted,
          error: result.error,
        };
        if (result.error) log.error('[Reconcile] Trust/voucher pipeline reported:', result.error);
      } catch (err) {
        log.error('[Reconcile] Trust/voucher pipeline error:', err);
        pipelineResult = { error: (err as Error).message };
      }
    }

    return NextResponse.json({
      reconciled: true,
      loan_id,
      was: {
        amount_paid: dbPaid,
        amount_remaining: dbRemaining,
        status: dbStatus,
      },
      now: {
        amount_paid: isCompleted ? loanTotal : truePaid,
        amount_remaining: isCompleted ? 0 : trueRemaining,
        status: isCompleted ? 'completed' : loan.status,
      },
      paid_installments: paidItems.length,
      total_installments: totalScheduled,
      ...(pipelineResult && { pipeline: pipelineResult }),
    });
  } catch (error: unknown) {
    log.error('[Reconcile] Error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Internal server error' }, { status: 500 });
  }
}
