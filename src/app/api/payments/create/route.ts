import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendEmail, getPaymentConfirmationEmail, getEarlyPaymentLenderEmail } from '@/lib/email';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    
    const { loanId, scheduleId, amount, note, proofUrl } = body;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*, lender:users!lender_id(*), guest_lender:guest_lenders!guest_lender_id(*)')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Verify user is the borrower
    if (loan.borrower_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get schedule item to determine if payment is early, on-time, or late
    let paymentTiming = 'on_time'; // early, on_time, late
    let daysDiff = 0;
    
    if (scheduleId) {
      const { data: scheduleItem } = await supabase
        .from('payment_schedule')
        .select('due_date')
        .eq('id', scheduleId)
        .single();
      
      if (scheduleItem) {
        const dueDate = new Date(scheduleItem.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        
        daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 0) {
          paymentTiming = 'early';
        } else if (daysDiff === 0) {
          paymentTiming = 'on_time';
        } else {
          paymentTiming = 'late';
        }
      }
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        loan_id: loanId,
        schedule_id: scheduleId || null,
        amount: amount,
        payment_date: new Date().toISOString(),
        status: 'pending',
        note: note || null,
        proof_url: proofUrl || null,
      })
      .select()
      .single();

    if (paymentError) {
      throw paymentError;
    }

    // Update schedule item if provided
    if (scheduleId) {
      await supabase
        .from('payment_schedule')
        .update({ 
          is_paid: true, 
          status: 'paid',
          payment_id: payment.id,
          paid_at: new Date().toISOString(),
          paid_days_diff: daysDiff, // Track timing
        })
        .eq('id', scheduleId);
    }

    // Update borrower payment stats
    const statsUpdate: Record<string, any> = {
      total_payments_made: (await getCurrentValue(supabase, user.id, 'total_payments_made')) + 1,
    };
    
    if (paymentTiming === 'early') {
      statsUpdate.payments_early = (await getCurrentValue(supabase, user.id, 'payments_early')) + 1;
    } else if (paymentTiming === 'on_time') {
      statsUpdate.payments_on_time = (await getCurrentValue(supabase, user.id, 'payments_on_time')) + 1;
    } else {
      statsUpdate.payments_late = (await getCurrentValue(supabase, user.id, 'payments_late')) + 1;
    }

    await supabase
      .from('users')
      .update(statsUpdate)
      .eq('id', user.id);

    // Update loan totals
    const newAmountPaid = (loan.amount_paid || 0) + amount;
    const newAmountRemaining = Math.max(0, (loan.total_amount || loan.amount) - newAmountPaid);
    const newStatus = newAmountRemaining <= 0 ? 'completed' : 'active';

    await supabase
      .from('loans')
      .update({
        amount_paid: newAmountPaid,
        amount_remaining: newAmountRemaining,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId);

    // If loan is completed, update borrower's tier progress
    if (newStatus === 'completed') {
      await updateBorrowerTierProgress(supabase, user.id, loan.amount);
    }

    // Update borrower rating
    await updateBorrowerRating(supabase, user.id);

    // Create notification for lender
    const lenderEmail = loan.lender?.email || loan.guest_lender?.paypal_email || loan.invite_email;
    const lenderName = loan.lender?.full_name || loan.guest_lender?.full_name || 'Lender';

    if (loan.lender_id) {
      await supabase.from('notifications').insert({
        user_id: loan.lender_id,
        loan_id: loanId,
        type: 'payment_received',
        title: 'Payment Received',
        message: `A payment of ${loan.currency} ${amount} has been marked as paid and needs your confirmation.`,
      });
    }

    // Send email to lender
    if (lenderEmail) {
      // If it's an early payment, send special early payment notification
      if (paymentTiming === 'early' && scheduleId) {
        const { data: scheduleItem } = await supabase
          .from('payment_schedule')
          .select('due_date')
          .eq('id', scheduleId)
          .single();

        const { data: borrower } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const earlyEmail = getEarlyPaymentLenderEmail({
          lenderName: lenderName,
          borrowerName: borrower?.full_name || 'Borrower',
          amount: amount,
          currency: loan.currency,
          originalDueDate: scheduleItem ? format(new Date(scheduleItem.due_date), 'MMMM d, yyyy') : 'N/A',
          remainingBalance: newAmountRemaining,
          loanId: loan.id,
          isCompleted: newStatus === 'completed',
        });

        await sendEmail({ to: lenderEmail, subject: earlyEmail.subject, html: earlyEmail.html });
      } else {
        // Standard payment confirmation email
        const { subject, html } = getPaymentConfirmationEmail({
          recipientName: lenderName,
          amount: amount,
          currency: loan.currency,
          loanId: loan.id,
          role: 'lender',
        });

        await sendEmail({ to: lenderEmail, subject, html });
      }
    }

    return NextResponse.json({ 
      success: true, 
      payment,
      paymentTiming,
      loan: {
        amount_paid: newAmountPaid,
        amount_remaining: newAmountRemaining,
        status: newStatus,
      }
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getCurrentValue(supabase: any, userId: string, field: string): Promise<number> {
  const { data } = await supabase
    .from('users')
    .select(field)
    .eq('id', userId)
    .single();
  
  return data?.[field] || 0;
}

async function updateBorrowerRating(supabase: any, userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('total_payments_made, payments_on_time, payments_early, payments_late, payments_missed')
    .eq('id', userId)
    .single();

  if (!user || !user.total_payments_made) return;

  const total = user.total_payments_made;
  const earlyRatio = user.payments_early / total;
  const onTimeRatio = user.payments_on_time / total;
  const lateRatio = user.payments_late / total;
  const missedRatio = (user.payments_missed || 0) / total;

  let rating = 'neutral';

  if (earlyRatio > 0.5) {
    rating = 'great';
  } else if ((onTimeRatio + earlyRatio) > 0.8) {
    rating = 'good';
  } else if ((lateRatio + missedRatio) >= 0.3 && (lateRatio + missedRatio) < 0.5) {
    rating = 'poor';
  } else if (lateRatio > 0.5) {
    rating = 'bad';
  } else if (missedRatio > 0.7) {
    rating = 'worst';
  }

  await supabase
    .from('users')
    .update({ 
      borrower_rating: rating,
      borrower_rating_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

async function updateBorrowerTierProgress(supabase: any, userId: string, loanAmount: number) {
  const { data: user } = await supabase
    .from('users')
    .select('borrowing_tier, loans_at_current_tier, total_loans_completed')
    .eq('id', userId)
    .single();

  if (!user) return;

  const currentTier = user.borrowing_tier || 1;
  const loansAtTier = (user.loans_at_current_tier || 0) + 1;
  const totalCompleted = (user.total_loans_completed || 0) + 1;

  const updates: Record<string, any> = {
    loans_at_current_tier: loansAtTier,
    total_loans_completed: totalCompleted,
  };

  // Check for tier upgrade (need 3 loans at current tier)
  // Tier 5 -> 6 requires completing a $2000+ loan
  if (currentTier < 5 && loansAtTier >= 3) {
    updates.borrowing_tier = currentTier + 1;
    updates.loans_at_current_tier = 0;
    updates.max_borrowing_amount = getTierAmount(currentTier + 1);
  } else if (currentTier === 5 && loanAmount >= 2000) {
    updates.borrowing_tier = 6;
    updates.loans_at_current_tier = 0;
    updates.max_borrowing_amount = 999999;
  }

  await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);
}

function getTierAmount(tier: number): number {
  const amounts: Record<number, number> = {
    1: 150,
    2: 300,
    3: 600,
    4: 1200,
    5: 2000,
    6: 999999,
  };
  return amounts[tier] || 150;
}
