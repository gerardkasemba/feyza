import { logger } from '@/lib/logger';
import { SupabaseClient } from '@supabase/supabase-js';

const log = logger('borrower-trust-service');

// ─────────────────────────────────────────────────────────────────────────────
// GET OR CREATE TRUST RECORD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the borrower_business_trust record for a borrower+business pair.
 * Creates one if it doesn't exist.
 * Mirrors get_or_create_borrower_trust() Postgres function.
 */
export async function getOrCreateBorrowerTrust(
  supabase: SupabaseClient,
  borrowerId: string,
  businessId: string
): Promise<Record<string, unknown> | null> {
  const { data: existing } = await supabase
    .from('borrower_business_trust')
    .select('*')
    .eq('borrower_id', borrowerId)
    .eq('business_id', businessId)
    .single();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('borrower_business_trust')
    .insert({ borrower_id: borrowerId, business_id: businessId })
    .select()
    .single();

  if (error) {
    // Possible race condition — try to fetch again
    const { data: retry } = await supabase
      .from('borrower_business_trust')
      .select('*')
      .eq('borrower_id', borrowerId)
      .eq('business_id', businessId)
      .single();
    return retry ?? null;
  }

  return created;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAN CREATED  (replaces tr_update_trust_on_loan_create trigger)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called after a loan is inserted with a business_lender_id.
 * Upserts borrower_business_trust and increments total_amount_borrowed.
 * Replaces trigger_update_trust_on_loan_create().
 *
 * Only relevant when the loan has a business lender (not a personal lender).
 */
export async function onLoanCreatedForBusiness(
  supabase: SupabaseClient,
  borrowerId: string,
  businessId: string,
  loanAmount: number
): Promise<void> {
  try {
    // Ensure a trust record exists
    await getOrCreateBorrowerTrust(supabase, borrowerId, businessId);

    // Fetch current then increment total_amount_borrowed
    const { data: trust } = await supabase
      .from('borrower_business_trust')
      .select('total_amount_borrowed, trust_status')
      .eq('borrower_id', borrowerId)
      .eq('business_id', businessId)
      .single();

    if (!trust) return;

    await supabase
      .from('borrower_business_trust')
      .update({
        total_amount_borrowed: (Number(trust.total_amount_borrowed) || 0) + loanAmount,
        trust_status:
          trust.trust_status === 'new' ? 'building' : trust.trust_status,
        updated_at: new Date().toISOString(),
      })
      .eq('borrower_id', borrowerId)
      .eq('business_id', businessId);

    log.info(`[BorrowerTrust] Loan created: total_amount_borrowed +${loanAmount} for ${borrowerId}@${businessId}`);
  } catch (err) {
    log.error('[BorrowerTrust] onLoanCreatedForBusiness error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAN COMPLETED  (replaces tr_update_trust_on_loan_complete trigger)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called when a loan with a business lender is marked 'completed'.
 * Updates completed_loan_count, total_amount_repaid, and trust graduation.
 * Replaces trigger_update_trust_on_loan_complete() + update_borrower_trust_on_completion().
 *
 * Graduation rule: 3+ completed loans → trust_status = 'graduated'.
 */
export async function onLoanCompletedForBusiness(
  supabase: SupabaseClient,
  borrowerId: string,
  businessId: string,
  loanAmount: number
): Promise<void> {
  try {
    // Ensure record exists
    await getOrCreateBorrowerTrust(supabase, borrowerId, businessId);

    // Fetch current state
    const { data: trust } = await supabase
      .from('borrower_business_trust')
      .select('completed_loan_count, total_amount_repaid, has_graduated, trust_status')
      .eq('borrower_id', borrowerId)
      .eq('business_id', businessId)
      .single();

    if (!trust) return;

    const newCompletedCount = (trust.completed_loan_count || 0) + 1;
    const willGraduate      = newCompletedCount >= 3;
    const justGraduating    = willGraduate && !trust.has_graduated;

    await supabase
      .from('borrower_business_trust')
      .update({
        completed_loan_count: newCompletedCount,
        total_amount_repaid:  (Number(trust.total_amount_repaid) || 0) + loanAmount,
        trust_status:         willGraduate ? 'graduated' : 'building',
        has_graduated:        willGraduate ? true : trust.has_graduated,
        graduated_at:         justGraduating ? new Date().toISOString() : undefined,
        updated_at:           new Date().toISOString(),
      })
      .eq('borrower_id', borrowerId)
      .eq('business_id', businessId);

    if (justGraduating) {
      log.info(`[BorrowerTrust] 🎓 Borrower ${borrowerId} GRADUATED with business ${businessId}`);
    } else {
      log.info(`[BorrowerTrust] Loan completed: ${newCompletedCount} loans for ${borrowerId}@${businessId}`);
    }
  } catch (err) {
    log.error('[BorrowerTrust] onLoanCompletedForBusiness error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAN DEFAULTED
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called when a loan with a business lender is marked 'defaulted'.
 * Resets trust (but preserves history).
 * Mirrors reset_borrower_trust_on_default() Postgres function.
 */
export async function onLoanDefaultedForBusiness(
  supabase: SupabaseClient,
  borrowerId: string,
  businessId: string
): Promise<void> {
  try {
    await getOrCreateBorrowerTrust(supabase, borrowerId, businessId);

    await supabase
      .from('borrower_business_trust')
      .update({
        trust_status:      'suspended',
        has_graduated:     false,
        graduated_at:      null,
        updated_at:        new Date().toISOString(),
      })
      .eq('borrower_id', borrowerId)
      .eq('business_id', businessId);

    log.info(`[BorrowerTrust] Loan defaulted: trust reset for ${borrowerId}@${businessId}`);
  } catch (err) {
    log.error('[BorrowerTrust] onLoanDefaultedForBusiness error:', err);
  }
}
