import { logger } from '@/lib/logger';
import { SupabaseClient } from '@supabase/supabase-js';

const log = logger('user-lifecycle-service');

// ─────────────────────────────────────────────────────────────────────────────
// TRUST SCORE BOOTSTRAP  (replaces create_trust_score_on_user_create trigger)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an initial trust_scores row for a newly registered user.
 * Call AFTER inserting a new users row.
 * Replaces create_trust_score_on_user_create trigger.
 */
export async function bootstrapTrustScore(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('trust_scores')
      .upsert({
        user_id:     userId,
        score:       50,
        score_grade: 'C',
        score_label: 'Building Trust',
      }, { onConflict: 'user_id', ignoreDuplicates: true });

    if (error) throw error;

    log.info(`[UserLifecycle] Trust score bootstrapped for user ${userId}`);
  } catch (err) {
    log.error('[UserLifecycle] bootstrapTrustScore error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION  (replaces trigger_check_reverification trigger)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * When a user's verification_status is set to 'verified', stamp the audit
 * fields and set the 3-month re-verification due date.
 * Returns the extra fields to merge into the users UPDATE payload —
 * call this BEFORE the update, then spread the result into your update data.
 *
 * Replaces check_reverification_needed() BEFORE UPDATE trigger.
 *
 * Usage:
 *   const extra = getVerificationApprovalFields(currentUser.verification_status, newStatus);
 *   await supabase.from('users').update({ verification_status: newStatus, ...extra }).eq('id', id);
 */
export function getVerificationApprovalFields(
  oldStatus: string | null | undefined,
  newStatus: string
): Record<string, unknown> {
  if (newStatus === 'verified' && oldStatus !== 'verified') {
    return {
      verified_at:              new Date().toISOString(),
      reverification_due_at:    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      verification_count:       null, // incremented below — caller must read+increment if needed
      reverification_required:  false,
    };
  }
  return {};
}

/**
 * Full verification approval handler — reads current user, computes new fields,
 * writes the update. Returns the updated user or null on error.
 * Call from admin routes instead of raw update.
 */
export async function applyVerificationApproval(
  supabase: SupabaseClient,
  userId: string,
  newStatus: 'verified' | 'rejected' | string,
  reason?: string
): Promise<void> {
  try {
    const { data: current } = await supabase
      .from('users')
      .select('verification_status, verification_count')
      .eq('id', userId)
      .single();

    const updateData: Record<string, unknown> = {
      verification_status:      newStatus,
      verification_reviewed_at: new Date().toISOString(),
    };

    if (newStatus === 'verified' && current?.verification_status !== 'verified') {
      updateData.verified_at             = new Date().toISOString();
      updateData.reverification_due_at   = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      updateData.verification_count      = (current?.verification_count || 0) + 1;
      updateData.reverification_required = false;
    } else if (newStatus === 'rejected') {
      updateData.verification_notes = reason || 'Did not meet verification requirements';
    }

    await supabase.from('users').update(updateData).eq('id', userId);
    log.info(`[UserLifecycle] Verification status → ${newStatus} for user ${userId}`);
  } catch (err) {
    log.error('[UserLifecycle] applyVerificationApproval error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PENDING LOAN PROCESSING  (replaces trigger_process_pending_loans trigger)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * When a user's verification_status changes to 'verified', find any pending
 * loan requests they had (status = 'awaiting_verification') and create real loans.
 * Replaces process_pending_loan_after_verification() AFTER UPDATE trigger.
 *
 * Call AFTER the users.update() that sets verification_status = 'verified'.
 */
export async function processPendingLoansAfterVerification(
  supabase: SupabaseClient,
  userId: string,
  oldStatus: string | null | undefined,
  newStatus: string,
  userFullName?: string
): Promise<void> {
  // Only fire when transitioning TO 'verified'
  if (newStatus !== 'verified' || oldStatus === 'verified') return;

  try {
    const { data: pendingRequests } = await supabase
      .from('pending_loan_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'awaiting_verification');

    if (!pendingRequests || pendingRequests.length === 0) return;

    log.info(`[UserLifecycle] Processing ${pendingRequests.length} pending loan(s) for newly verified user ${userId}`);

    for (const req of pendingRequests) {
      try {
        // Create the actual loan
        const { data: newLoan, error: loanError } = await supabase
          .from('loans')
          .insert({
            borrower_id:        userId,
            business_lender_id: req.business_lender_id ?? undefined,
            lender_id:          req.personal_lender_id  ?? undefined,
            amount:             req.amount,
            purpose:            req.purpose,
            description:        req.description ?? undefined,
            term_months:        req.term_months  ?? undefined,
            status:             'pending',
            match_status:       'pending',
            currency:           'USD',
          })
          .select('id')
          .single();

        if (loanError || !newLoan) {
          log.error(`[UserLifecycle] Failed to create loan from pending_request ${req.id}:`, loanError);
          continue;
        }

        // Mark pending request as processed
        await supabase
          .from('pending_loan_requests')
          .update({
            status:       'loan_created',
            processed_at: new Date().toISOString(),
            updated_at:   new Date().toISOString(),
          })
          .eq('id', req.id);

        // Notify the business lender (if applicable)
        if (req.business_lender_id) {
          const { data: bp } = await supabase
            .from('business_profiles')
            .select('user_id')
            .eq('id', req.business_lender_id)
            .single();

          if (bp?.user_id) {
            await supabase.from('notifications').insert({
              user_id: bp.user_id,
              type:    'new_loan_request',
              title:   'New Loan Request',
              message: `A verified borrower has requested a loan of $${req.amount}`,
              data:    {
                loan_id:       newLoan.id,
                amount:        req.amount,
                borrower_name: userFullName || 'A borrower',
              },
            });
          }
        }

        log.info(`[UserLifecycle] Created loan ${newLoan.id} from pending_request ${req.id}`);
      } catch (loopErr) {
        log.error(`[UserLifecycle] Error processing pending_request ${req.id}:`, loopErr);
      }
    }
  } catch (err) {
    log.error('[UserLifecycle] processPendingLoansAfterVerification error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VOUCH CASCADE  (replaces tr_cascade_vouch_on_tier_change trigger)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * When a user's trust_tier changes, touch all active vouches where they are
 * the voucher so the vouch_calculate_strength trigger re-fires.
 *
 * NOTE: With DB triggers removed, this instead calls recalculateVoucherVouches()
 * which directly recomputes vouch_strength and trust_score_boost in TypeScript.
 *
 * Call AFTER updating users.trust_tier.
 */
export async function recalculateVoucherVouches(
  supabase: SupabaseClient,
  voucherId: string,
  newTier: string
): Promise<void> {
  try {
    const { data: vouches } = await supabase
      .from('vouches')
      .select('id, relationship, known_years, vouch_type, vouch_strength')
      .eq('voucher_id', voucherId)
      .eq('status', 'active');

    if (!vouches || vouches.length === 0) return;

    // Tier base map
    const tierBase: Record<string, number> = {
      tier_4: 5, tier_3: 3.5, tier_2: 2, tier_1: 1,
    };

    // Fetch voucher's current success rate
    const { data: voucherProfile } = await supabase
      .from('users')
      .select('vouching_success_rate')
      .eq('id', voucherId)
      .single();

    const successRate: number = voucherProfile?.vouching_success_rate ?? 100;
    const successMultiplier =
      successRate >= 100 ? 1.0 :
      successRate >= 80  ? 0.9 :
      successRate >= 60  ? 0.75 :
      successRate >= 40  ? 0.55 : 0.35;

    const base = tierBase[newTier] ?? 1;

    for (const vouch of vouches) {
      const years = vouch.known_years ?? 0;
      const longevity = years >= 10 ? 2 : years >= 5 ? 1.5 : years >= 2 ? 1 : years >= 1 ? 0.5 : 0;

      const rel = (vouch.relationship || '').toLowerCase();
      let relBonus = 0.5;
      if (['spouse','partner','parent','sibling','family','child'].some(r => rel.includes(r))) relBonus = 2;
      else if (['close friend','best friend','mentor','manager','employer'].some(r => rel.includes(r))) relBonus = 1.5;
      else if (['friend','colleague','coworker','classmate'].some(r => rel.includes(r))) relBonus = 1;

      const typeBonus: Record<string, number> = { guarantee: 1, family: 0.75, employment: 0.5, character: 0 };
      const type = typeBonus[vouch.vouch_type] ?? 0;

      const raw           = base + longevity + relBonus + type;
      const baseStrength  = Math.min(10, Math.max(1, Math.round(raw)));
      const finalStrength = Math.min(10, Math.max(1, Math.round(baseStrength * successMultiplier)));
      // trust_score_boost = strength directly (1:1). Must match createVouch formula.
      const boost = finalStrength;

      if (finalStrength !== vouch.vouch_strength) {
        await supabase
          .from('vouches')
          .update({ vouch_strength: finalStrength, trust_score_boost: boost, updated_at: new Date().toISOString() })
          .eq('id', vouch.id);
      }
    }

    log.info(`[UserLifecycle] Recalculated ${vouches.length} vouches for voucher ${voucherId} (now ${newTier})`);
  } catch (err) {
    log.error('[UserLifecycle] recalculateVoucherVouches error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSFER STATUS  (replaces tr_normalize_transfer_status trigger)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize 'processed' → 'completed' for transfers.status before writing.
 * Replaces tr_normalize_transfer_status BEFORE INSERT OR UPDATE trigger.
 *
 * Usage: const safeStatus = normalizeTransferStatus(status);
 */
export function normalizeTransferStatus(status: string): string {
  return status === 'processed' ? 'completed' : status;
}
