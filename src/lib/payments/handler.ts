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
      title: 'Payment failed',
      description: reason || 'Payment failed',
      loan_id: loanId,
      payment_id: scheduleId,
      metadata: { reason },
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
    let eventType: 'payment_late' | 'payment_missed' = 'payment_late';

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
      event_type: eventType,          // 'payment_late' | 'payment_missed'
      score_impact: scoreChange,      // negative number
      title: eventType === 'payment_missed' ? 'Payment missed' : 'Payment late',
      description: `Payment ${daysOverdue} days overdue`,
      loan_id: loanId,
      payment_id: scheduleId,
      metadata: { daysOverdue },
    });

    console.log(`[PaymentHandler] ✅ Missed payment recorded (${scoreChange} pts)`);
  } catch (error) {
    console.error(`[PaymentHandler] Error recording missed payment:`, error);
  }
}
