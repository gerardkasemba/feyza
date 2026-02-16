/**
 * Centralized Payment Handler
 * 
 * All payment systems (Manual, Dwolla, PayPal, Stripe, Auto-pay) should call this
 * after a payment is successfully processed to update Trust Score.
 */

import { TrustScoreService } from '@/lib/trust-score';
import { SupabaseClient } from '@supabase/supabase-js';

export interface PaymentCompletedParams {
  supabase: SupabaseClient;
  loanId: string;
  borrowerId: string;
  paymentId?: string;
  scheduleId?: string;
  amount: number;
  dueDate?: string;
  paidDate?: string;
  paymentMethod: 'manual' | 'dwolla' | 'paypal' | 'stripe' | 'auto';
}

export interface PaymentResult {
  success: boolean;
  trustScoreUpdated: boolean;
  loanCompleted: boolean;
  newTrustScore?: number;
  error?: string;
}

/**
 * Call this after any payment is successfully processed
 * Updates trust score, checks if loan is completed, etc.
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
    paymentMethod 
  } = params;

  console.log(`[PaymentHandler] Processing ${paymentMethod} payment for loan ${loanId}`);

  let trustScoreUpdated = false;
  let loanCompleted = false;
  let newTrustScore: number | undefined;

  try {
    const trustService = new TrustScoreService(supabase);

    // Calculate days from due date (negative = early, positive = late)
    let daysFromDue = 0;
    if (dueDate) {
      const due = new Date(dueDate);
      const paid = new Date(paidDate);
      daysFromDue = Math.floor((paid.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    }

    console.log(`[PaymentHandler] Days from due: ${daysFromDue} (negative = early)`);

    // Record payment event for trust score with error handling
    try {
      await trustService.onPaymentMade(
        borrowerId,
        loanId,
        paymentId || scheduleId || 'unknown',
        amount,  // Payment amount
        daysFromDue
      );
      trustScoreUpdated = true;
      console.log(`[PaymentHandler] ✅ Trust score updated for borrower ${borrowerId}`);
    } catch (trustError: any) {
      console.error(`[PaymentHandler] ❌ Failed to update trust score:`, trustError);
      console.error(`[PaymentHandler] Trust error details:`, {
        message: trustError.message,
        code: trustError.code,
        details: trustError.details,
        hint: trustError.hint,
      });
      // Don't fail the payment, but log the error clearly
    }

    // Update user payment stats
    try {
      const { data: userStats } = await supabase
        .from('users')
        .select('total_payments_made, auto_payments_count, manual_payments_count, payments_on_time, payments_early, payments_late, borrowing_tier, loans_at_current_tier, total_loans_completed')
        .eq('id', borrowerId)
        .single();

      const isAutoPay = paymentMethod === 'dwolla' || paymentMethod === 'auto';
      const updateData: any = {
        total_payments_made: (userStats?.total_payments_made || 0) + 1,
      };

      // Track auto vs manual
      if (isAutoPay) {
        updateData.auto_payments_count = (userStats?.auto_payments_count || 0) + 1;
      } else {
        updateData.manual_payments_count = (userStats?.manual_payments_count || 0) + 1;
      }

      // Track payment timing
      if (daysFromDue <= 0) {
        if (daysFromDue < -2) {
          updateData.payments_early = (userStats?.payments_early || 0) + 1;
        } else {
          updateData.payments_on_time = (userStats?.payments_on_time || 0) + 1;
        }
      } else {
        updateData.payments_late = (userStats?.payments_late || 0) + 1;
      }

      await supabase
        .from('users')
        .update(updateData)
        .eq('id', borrowerId);

      console.log(`[PaymentHandler] ✅ User payment stats updated:`, updateData);
    } catch (statsError) {
      console.error(`[PaymentHandler] Failed to update user stats:`, statsError);
    }

    // Check if loan is now completed
    const { data: loan } = await supabase
      .from('loans')
      .select('id, amount, amount_remaining, status')
      .eq('id', loanId)
      .single();

    if (loan) {
      // Check if all payments are made
      const { count: unpaidCount } = await supabase
        .from('payment_schedule')
        .select('id', { count: 'exact', head: true })
        .eq('loan_id', loanId)
        .eq('is_paid', false);

      if (unpaidCount === 0 || (loan.amount_remaining !== null && loan.amount_remaining <= 0)) {
        loanCompleted = true;
        console.log(`[PaymentHandler] 🎉 Loan ${loanId} completed!`);

        // Update loan status
        await supabase
          .from('loans')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', loanId);

        // Record loan completion for trust score
        await trustService.onLoanCompleted(borrowerId, loanId, Number(loan.amount));
        console.log(`[PaymentHandler] ✅ Loan completion recorded for trust score`);
        // ============================================
        // RELEASE AND INCREASE LENDER CAPITAL
        // ============================================
        try {
          // Get full loan details
          const { data: fullLoan } = await supabase
            .from('loans')
            .select(`
              id,
              amount,
              total_interest,
              total_amount,
              lender_id,
              business_lender_id
            `)
            .eq('id', loanId)
            .single();

          if (fullLoan && (fullLoan.business_lender_id || fullLoan.lender_id)) {
            // Find the lender preference record
            const lenderFilter = fullLoan.business_lender_id
              ? `business_id.eq.${fullLoan.business_lender_id}`
              : `user_id.eq.${fullLoan.lender_id}`;

            const { data: lenderPref } = await supabase
              .from('lender_preferences')
              .select('id, capital_pool, capital_reserved')
              .or(lenderFilter)
              .single();

            if (lenderPref) {
              // Calculate new capital amounts
              const principal = Number(fullLoan.amount) || 0;
              const interest = Number(fullLoan.total_interest) || 0;
              const totalReturn = principal + interest;

              // Release reserved capital (reduce reserved by principal)
              const newReserved = Math.max(0, (lenderPref.capital_reserved || 0) - principal);

              // FIXED: Only add the INTEREST to the pool, not the principal
              // The principal was already in the pool or reserved, we're just earning interest on top
              const newPool = (lenderPref.capital_pool || 0) + interest;

              // Update lender preference
              await supabase
                .from('lender_preferences')
                .update({
                  capital_reserved: newReserved,
                  capital_pool: newPool,
                })
                .eq('id', lenderPref.id);

              console.log(`[PaymentHandler] 💰 Capital updated for lender:`, {
                lender_pref_id: lenderPref.id,
                principal_returned: principal,
                interest_earned: interest,
                total_return: totalReturn,
                old_pool: lenderPref.capital_pool,
                new_pool: newPool,
                old_reserved: lenderPref.capital_reserved,
                new_reserved: newReserved,
              });

              // Update lender stats
              try {
                if (fullLoan.business_lender_id) {
                  const { data: businessStats } = await supabase
                    .from('business_profiles')
                    .select('total_loans_funded, total_amount_funded, total_interest_earned')
                    .eq('id', fullLoan.business_lender_id)
                    .single();

                  await supabase
                    .from('business_profiles')
                    .update({
                      total_interest_earned: (businessStats?.total_interest_earned || 0) + interest,
                    })
                    .eq('id', fullLoan.business_lender_id);
                }
              } catch (statsError) {
                console.error('[PaymentHandler] Failed to update lender stats:', statsError);
              }
            } else {
              console.warn(`[PaymentHandler] No lender preference found for completed loan ${loanId}`);
            }
          }
        } catch (capitalError) {
          console.error(`[PaymentHandler] Failed to update lender capital:`, capitalError);
          // Don't fail the payment if capital update fails
        }

        // Update borrowing tier
        try {
          console.log(`[PaymentHandler] Checking tier upgrade for user ${borrowerId}...`);
          
          const { data: userStats } = await supabase
            .from('users')
            .select('borrowing_tier, loans_at_current_tier, total_loans_completed')
            .eq('id', borrowerId)
            .single();

          if (!userStats) {
            console.error(`[PaymentHandler] ❌ Could not fetch user stats for tier update`);
            throw new Error('User stats not found');
          }

          const currentTier = userStats?.borrowing_tier || 1;
          const loansAtTier = (userStats?.loans_at_current_tier || 0) + 1;
          const totalCompleted = (userStats?.total_loans_completed || 0) + 1;

          const tierUpdate: any = {
            total_loans_completed: totalCompleted,
          };

          // Upgrade tier after 3 loans at current tier (up to tier 6)
          if (loansAtTier >= 3 && currentTier < 6) {
            tierUpdate.borrowing_tier = currentTier + 1;
            tierUpdate.loans_at_current_tier = 0;
            console.log(`[PaymentHandler] 🎖️ User ${borrowerId} upgraded from tier ${currentTier} to tier ${currentTier + 1}!`);
          } else {
            tierUpdate.loans_at_current_tier = loansAtTier;
            console.log(`[PaymentHandler] User ${borrowerId} progress: ${loansAtTier}/3 loans at tier ${currentTier}`);
          }

          const { error: tierUpdateError } = await supabase
            .from('users')
            .update(tierUpdate)
            .eq('id', borrowerId);

          if (tierUpdateError) {
            console.error(`[PaymentHandler] ❌ Failed to update borrowing tier:`, tierUpdateError);
            throw tierUpdateError;
          }

          console.log(`[PaymentHandler] ✅ Borrowing tier updated:`, tierUpdate);
        } catch (tierError: any) {
          console.error(`[PaymentHandler] ❌ Borrowing tier update failed:`, tierError);
          console.error(`[PaymentHandler] Tier error details:`, {
            message: tierError.message,
            code: tierError.code,
            details: tierError.details,
          });
          // Don't fail the payment if tier update fails
        }
      }
    }

    // Get updated trust score
    const scoreData = await trustService.getScore(borrowerId);
    if (scoreData) {
      newTrustScore = scoreData.score;
    }

    return {
      success: true,
      trustScoreUpdated,
      loanCompleted,
      newTrustScore,
    };

  } catch (error: any) {
    console.error(`[PaymentHandler] Error processing payment:`, error);
    
    // Don't fail the payment if trust score update fails
    return {
      success: true, // Payment itself succeeded
      trustScoreUpdated: false,
      loanCompleted: false,
      error: error.message,
    };
  }
}

/**
 * Call this when a payment fails
 * Records the failure for trust score tracking
 */
export async function onPaymentFailed(params: {
  supabase: SupabaseClient;
  borrowerId: string;
  loanId: string;
  scheduleId?: string;
  reason?: string;
}): Promise<void> {
  const { supabase, borrowerId, loanId, scheduleId, reason } = params;

  console.log(`[PaymentHandler] Recording failed payment for loan ${loanId}`);

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

    console.log(`[PaymentHandler] ✅ Failed payment recorded`);
  } catch (error) {
    console.error(`[PaymentHandler] Error recording failed payment:`, error);
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

  console.log(`[PaymentHandler] Recording missed payment for loan ${loanId}, ${daysOverdue} days overdue`);

  try {
    const trustService = new TrustScoreService(supabase);

    // Penalty increases with days overdue
    let scoreChange = -5;
    let eventType = 'payment_late';

    if (daysOverdue > 30) {
      scoreChange = -15;
      eventType = 'payment_missed';
    } else if (daysOverdue > 14) {
      scoreChange = -8;
    } else if (daysOverdue > 7) {
      scoreChange = -5;
    } else {
      scoreChange = -3;
    }

    await trustService.recordEvent(borrowerId, {
      event_type: daysOverdue > 30 ? 'payment_missed' : 'payment_late',
      score_impact: scoreChange,
      title: daysOverdue > 30 ? 'Payment Missed' : 'Late Payment',
      description: `Payment ${daysOverdue} days overdue`,
      loan_id: loanId,
      payment_id: scheduleId,
      metadata: { days_overdue: daysOverdue },
    });


    console.log(`[PaymentHandler] ✅ Missed payment recorded (${scoreChange} pts)`);
  } catch (error) {
    console.error(`[PaymentHandler] Error recording missed payment:`, error);
  }
}
