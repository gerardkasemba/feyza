import { logger } from '@/lib/logger';
import { onLoanCompletedForBusiness } from '@/lib/business/borrower-trust-service';
const log = logger('handler');
/**
 * Centralized Payment Handler
 *
 * All payment systems (Manual, Dwolla, PayPal, Stripe, Auto-pay, Early-pay)
 * call this after a payment is successfully processed to update Trust Score,
 * vouches, lender capital, and borrower tier.
 */

import { TrustScoreService } from '@/lib/trust-score';
import { SupabaseClient } from '@supabase/supabase-js';
import { onVoucheeLoanCompleted, onVoucheePaymentMade } from '@/lib/vouching/accountability';

export interface PaymentCompletedParams {
  supabase: SupabaseClient;
  loanId: string;
  borrowerId: string;
  paymentId?: string;
  scheduleId?: string;
  amount: number;
  dueDate?: string;
  paidDate?: string;
  paymentMethod: 'manual' | 'dwolla' | 'paypal' | 'stripe' | 'auto' | 'early';
  /**
   * Set true when the caller (e.g. payments/create) already updated
   * users.total_payments_made / payments_early / payments_on_time / payments_late.
   * Prevents double-counting those stats.
   */
  skipUserStats?: boolean;
}

export interface PaymentResult {
  success: boolean;
  trustScoreUpdated: boolean;
  loanCompleted: boolean;
  newTrustScore?: number;
  error?: string;
}

/**
 * Call this after any payment is successfully processed.
 * Updates trust score, checks if loan is completed, updates lender capital,
 * fires voucher completion pipeline, upgrades borrower tier.
 */
export async function onPaymentCompleted(params: PaymentCompletedParams): Promise<PaymentResult> {
  const {
    supabase,
    loanId,
    borrowerId,
    paymentId,
    scheduleId,
    amount,
    dueDate,
    paidDate = new Date().toISOString(),
    paymentMethod,
    skipUserStats = false,
  } = params;

  log.info(`[PaymentHandler] Processing ${paymentMethod} payment for loan ${loanId}`);

  let trustScoreUpdated = false;
  let loanCompleted = false;
  let newTrustScore: number | undefined;

  try {
    const trustService = new TrustScoreService(supabase);

    // ── 1. Calculate timing ────────────────────────────────────────────────
    let daysFromDue = 0;
    if (dueDate) {
      const due  = new Date(dueDate);
      const paid = new Date(paidDate);
      daysFromDue = Math.floor((paid.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    }
    log.info(`[PaymentHandler] Days from due: ${daysFromDue} (negative = early)`);

    // ── 2. Deduplication guard ─────────────────────────────────────────────
    // Prevent the same payment from writing a duplicate trust_score_event
    const resolvedPaymentId = paymentId || scheduleId;
    if (resolvedPaymentId) {
      const { data: existingEvent } = await supabase
        .from('trust_score_events')
        .select('id')
        .eq('user_id', borrowerId)
        .eq('payment_id', resolvedPaymentId)
        .in('event_type', ['payment_ontime', 'payment_early', 'payment_late'])
        .maybeSingle();

      if (existingEvent) {
        log.info(`[PaymentHandler] Trust event already exists for payment ${resolvedPaymentId} — skipping duplicate`);
        // Still check loan completion below
        trustScoreUpdated = true; // Don't report as error — it was already done
      }
    }

    // ── 3. Record trust score event (if not a dupe) ────────────────────────
    if (!trustScoreUpdated) {
      try {
        await trustService.onPaymentMade(
          borrowerId,
          loanId,
          resolvedPaymentId,
          amount,
          daysFromDue
        );
        trustScoreUpdated = true;
        log.info(`[PaymentHandler] ✅ Trust score updated for borrower ${borrowerId}`);
      } catch (trustError: unknown) {
        log.error(`[PaymentHandler] ❌ Failed to update trust score:`, trustError);
        log.error(`[PaymentHandler] Trust error details:`, {
          message: (trustError instanceof Error ? trustError.message : String(trustError)),
          details: (trustError as any).details,
          hint:    (trustError as any).hint,
        });
      }

      // ── 3b. Reward vouchers on on-time / early borrower payments ──────────
      // AWAITED — fire-and-forget promises are killed by serverless runtimes
      // the moment the HTTP response is sent. loans_completed stayed 0 because
      // onVoucheeLoanCompleted (below) suffered the same fate.
      try {
        await onVoucheePaymentMade(supabase, borrowerId, loanId, daysFromDue);
      } catch (vouchPayErr) {
        log.error(`[PaymentHandler] onVoucheePaymentMade error:`, vouchPayErr);
      }
    }

    // ── 4. Update user payment stats (skipped if caller already did it) ────
    if (!skipUserStats) {
      try {
        const { data: userStats } = await supabase
          .from('users')
          .select('total_payments_made, auto_payments_count, manual_payments_count, payments_on_time, payments_early, payments_late')
          .eq('id', borrowerId)
          .single();

        const isAutoPay = paymentMethod === 'dwolla' || paymentMethod === 'auto';
        const updateData: Record<string, unknown> = {
          total_payments_made: (userStats?.total_payments_made || 0) + 1,
        };

        if (isAutoPay) {
          updateData.auto_payments_count  = (userStats?.auto_payments_count  || 0) + 1;
        } else {
          updateData.manual_payments_count = (userStats?.manual_payments_count || 0) + 1;
        }

        if (daysFromDue <= 0) {
          if (daysFromDue < -2) {
            updateData.payments_early   = (userStats?.payments_early   || 0) + 1;
          } else {
            updateData.payments_on_time = (userStats?.payments_on_time || 0) + 1;
          }
        } else {
          updateData.payments_late = (userStats?.payments_late || 0) + 1;
        }

        await supabase.from('users').update(updateData).eq('id', borrowerId);
        log.info(`[PaymentHandler] ✅ User payment stats updated`);
      } catch (statsError) {
        log.error(`[PaymentHandler] Failed to update user stats:`, statsError);
      }
    }

    // ── 5. Check if loan is now fully completed ────────────────────────────
    const { data: loan } = await supabase
      .from('loans')
      .select('id, amount, amount_remaining, status, business_lender_id')
      .eq('id', loanId)
      .single();

    if (loan) {
      const { count: unpaidCount } = await supabase
        .from('payment_schedule')
        .select('id', { count: 'exact', head: true })
        .eq('loan_id', loanId)
        .eq('is_paid', false);

      const isFullyPaid =
        unpaidCount === 0 ||
        (loan.amount_remaining !== null && Number(loan.amount_remaining) <= 0) ||
        loan.status === 'completed';

      if (isFullyPaid) {
        // Use event dedup instead of status check — callers (payments/create, payments/manual)
        // already mark the loan 'completed' before calling us, so status !== 'completed' would
        // always block this pipeline even on genuine first-time completions.
        const { data: existingCompletionEvent } = await supabase
          .from('trust_score_events')
          .select('id')
          .eq('user_id', borrowerId)
          .eq('loan_id', loanId)
          .in('event_type', ['loan_completed', 'first_loan_completed'])
          .maybeSingle();

        if (!existingCompletionEvent) {
          loanCompleted = true;
          log.info(`[PaymentHandler] 🎉 Loan ${loanId} completed — firing completion pipeline!`);

          // Mark loan completed if caller didn't (defensive)
          if (loan.status !== 'completed') {
            await supabase
              .from('loans')
              .update({ status: 'completed', completed_at: new Date().toISOString() })
              .eq('id', loanId);
          }

          // Record loan completion for trust score
          await trustService.onLoanCompleted(borrowerId, loanId, Number(loan.amount));
          log.info(`[PaymentHandler] ✅ Loan completion recorded for trust score`);

          // Update borrower_business_trust (replaces tr_update_trust_on_loan_complete trigger)
          if (loan.business_lender_id) {
            try {
              await onLoanCompletedForBusiness(supabase, borrowerId, loan.business_lender_id as string, Number(loan.amount));
            } catch (err) {
              log.error(`[PaymentHandler] borrower trust completion error:`, err);
            }
          }

          // ── Voucher completion pipeline — AWAITED ──────────────────────────
          // Must be INSIDE the if(!existingCompletionEvent) guard — previously it
          // leaked outside due to a missing closing brace, causing it to run on
          // every fully-paid check instead of only on the first completion.
          try {
            const voucherResult = await onVoucheeLoanCompleted(supabase, borrowerId, loanId);
            log.info(`[PaymentHandler] Voucher completion pipeline:`, voucherResult);
          } catch (voucherErr) {
            log.error(`[PaymentHandler] Voucher pipeline error:`, voucherErr);
          }

        // ── Release and increase lender capital ───────────────────────────
        try {
          const { data: fullLoan } = await supabase
            .from('loans')
            .select('id, amount, total_interest, total_amount, lender_id, business_lender_id')
            .eq('id', loanId)
            .single();

          if (fullLoan && (fullLoan.business_lender_id || fullLoan.lender_id)) {
            const lenderFilter = fullLoan.business_lender_id
              ? `business_id.eq.${fullLoan.business_lender_id}`
              : `user_id.eq.${fullLoan.lender_id}`;

            const { data: lenderPref } = await supabase
              .from('lender_preferences')
              .select('id, capital_pool, capital_reserved')
              .or(lenderFilter)
              .single();

            if (lenderPref) {
              const principal    = Number(fullLoan.amount)         || 0;
              const interest     = Number(fullLoan.total_interest) || 0;
              const newReserved  = Math.max(0, (lenderPref.capital_reserved || 0) - principal);
              const newPool      = (lenderPref.capital_pool || 0) + interest;

              await supabase
                .from('lender_preferences')
                .update({ capital_reserved: newReserved, capital_pool: newPool })
                .eq('id', lenderPref.id);

              log.info(`[PaymentHandler] 💰 Capital updated: interest +${interest}, reserved -${principal}`);

              if (fullLoan.business_lender_id) {
                const { data: bizStats } = await supabase
                  .from('business_profiles')
                  .select('total_interest_earned')
                  .eq('id', fullLoan.business_lender_id)
                  .single();

                await supabase
                  .from('business_profiles')
                  .update({ total_interest_earned: (bizStats?.total_interest_earned || 0) + interest })
                  .eq('id', fullLoan.business_lender_id);
              }
            }
          }
        } catch (capitalError) {
          log.error(`[PaymentHandler] Failed to update lender capital:`, capitalError);
        }

        // ── Update total_loans_completed on user ──────────────────────────
        try {
          const { data: userCompletion } = await supabase
            .from('users')
            .select('total_loans_completed')
            .eq('id', borrowerId)
            .single();

          if (userCompletion !== null) {
            await supabase
              .from('users')
              .update({
                total_loans_completed: (userCompletion?.total_loans_completed || 0) + 1,
              })
              .eq('id', borrowerId);
            log.info(`[PaymentHandler] ✅ total_loans_completed incremented`);
          }
        } catch (completionErr) {
          log.error(`[PaymentHandler] Failed to update total_loans_completed:`, completionErr);
        }
        } // end if (!existingCompletionEvent)
      }
    }

    // ── 6. Get updated trust score ─────────────────────────────────────────
    // If the loan just completed, force a full recalculate so the returned score
    // reflects the completion bonus immediately (not a stale cached value).
    const scoreData = loanCompleted
      ? await trustService.recalculate(borrowerId)
      : await trustService.getScore(borrowerId);
    if (scoreData) {
      newTrustScore = scoreData.score;
    }

    return { success: true, trustScoreUpdated, loanCompleted, newTrustScore };

  } catch (error: unknown) {
    log.error(`[PaymentHandler] Error processing payment:`, error);
    return {
      success: true, // Payment itself succeeded
      trustScoreUpdated: false,
      loanCompleted: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Call this when a payment fails
 */
export async function onPaymentFailed(params: {
  supabase: SupabaseClient;
  borrowerId: string;
  loanId: string;
  scheduleId?: string;
  reason?: string;
}): Promise<void> {
  const { supabase, borrowerId, loanId, scheduleId, reason } = params;
  log.info(`[PaymentHandler] Recording failed payment for loan ${loanId}`);

  try {
    const trustService = new TrustScoreService(supabase);
    await trustService.recordEvent(borrowerId, {
      event_type: 'payment_failed',
      score_impact: -5,
      title: 'Payment Failed',
      description: reason || 'Payment failed',
      loan_id: loanId,
      payment_id: scheduleId,
    });
    log.info(`[PaymentHandler] ✅ Failed payment recorded`);
  } catch (error) {
    log.error(`[PaymentHandler] Error recording failed payment:`, error);
  }
}

/**
 * Call this when a borrower misses a payment (from cron job)
 */
export async function onPaymentMissed(params: {
  supabase: SupabaseClient;
  borrowerId: string;
  loanId: string;
  scheduleId: string;
  daysOverdue: number;
}): Promise<void> {
  const { supabase, borrowerId, loanId, scheduleId, daysOverdue } = params;
  log.info(`[PaymentHandler] Recording missed payment for loan ${loanId}, ${daysOverdue} days overdue`);

  try {
    const trustService = new TrustScoreService(supabase);

    let scoreChange = -3;
    if (daysOverdue > 30)      scoreChange = -15;
    else if (daysOverdue > 14) scoreChange = -8;
    else if (daysOverdue > 7)  scoreChange = -5;

    await trustService.recordEvent(borrowerId, {
      event_type: daysOverdue > 30 ? 'payment_missed' : 'payment_late',
      score_impact: scoreChange,
      title: daysOverdue > 30 ? 'Payment Missed' : 'Late Payment',
      description: `Payment ${daysOverdue} days overdue`,
      loan_id: loanId,
      payment_id: scheduleId,
      metadata: { days_overdue: daysOverdue },
    });
    log.info(`[PaymentHandler] ✅ Missed payment recorded (${scoreChange} pts)`);
  } catch (error) {
    log.error(`[PaymentHandler] Error recording missed payment:`, error);
  }
}
