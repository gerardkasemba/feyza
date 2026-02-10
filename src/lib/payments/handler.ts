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

    // Record payment event for trust score
    await trustService.onPaymentMade(
      borrowerId,
      loanId,
      paymentId || scheduleId || 'unknown',
      amount,
      daysFromDue
    );

    trustScoreUpdated = true;
    console.log(`[PaymentHandler] ✅ Trust score updated for borrower ${borrowerId}`);

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
        await trustService.onLoanCompleted(borrowerId, loanId, loan.amount);
        console.log(`[PaymentHandler] ✅ Loan completion recorded for trust score`);

        // Update borrowing tier
        try {
          const { data: userStats } = await supabase
            .from('users')
            .select('borrowing_tier, loans_at_current_tier, total_loans_completed')
            .eq('id', borrowerId)
            .single();

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
            console.log(`[PaymentHandler] 🎖️ User ${borrowerId} upgraded to tier ${currentTier + 1}`);
          } else {
            tierUpdate.loans_at_current_tier = loansAtTier;
          }

          await supabase
            .from('users')
            .update(tierUpdate)
            .eq('id', borrowerId);

          console.log(`[PaymentHandler] ✅ Borrowing tier updated:`, tierUpdate);
        } catch (tierError) {
          console.error(`[PaymentHandler] Failed to update borrowing tier:`, tierError);
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
