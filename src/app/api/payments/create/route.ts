import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { SupabaseServiceClient } from '@/lib/supabase/server';
import { sendEmail, getPaymentConfirmationEmail, getEarlyPaymentLenderEmail } from '@/lib/email';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';
import { createServiceRoleClient } from '@/lib/supabase/server';

const log = logger('payments-create');

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
      .select('*, lender:users!lender_id(*), business_lender:business_profiles!business_lender_id(*)')
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

    // ── Trust Score + Vouches + Loan completion pipeline ──────────────────
    // Use service role so handler can write to users/trust_scores without RLS
    try {
      const serviceSupabase = await createServiceRoleClient();
      const { onPaymentCompleted } = await import('@/lib/payments/handler');
      const trustResult = await onPaymentCompleted({
        supabase: serviceSupabase,
        loanId,
        borrowerId: user.id,
        paymentId: payment.id,
        scheduleId: scheduleId || undefined,
        amount: Number(amount),
        dueDate: scheduleId ? (await (async () => {
          const { data: s } = await serviceSupabase
            .from('payment_schedule').select('due_date').eq('id', scheduleId).single();
          return s?.due_date;
        })()) : undefined,
        paymentMethod: paymentTiming === 'early' ? 'early' : 'manual',
        // payments/create already updated user payment stats above — skip double-count
        skipUserStats: true,
      });
      log.info('[PaymentCreate] Trust result:', trustResult);
    } catch (trustErr) {
      log.error('[PaymentCreate] Trust score update failed (non-fatal):', trustErr);
    }

    // Update borrower rating
    await updateBorrowerRating(supabase, user.id);

    // Create notification for lender
    let lenderEmail = loan.lender?.email || loan.invite_email || loan.lender_email;
    let lenderName = loan.lender?.full_name || loan.lender_name || 'Lender';
    let lenderUserId = loan.lender_id;

    // If no lender email found and there's a business lender, fetch from business_profiles
    if (!lenderEmail && loan.business_lender_id) {
      const { data: business } = await supabase
        .from('business_profiles')
        .select('contact_email, business_name, user_id')
        .eq('id', loan.business_lender_id)
        .single();
      if (business) {
        lenderEmail = business.contact_email;
        lenderName = business.business_name || lenderName;
        lenderUserId = business.user_id;
      }
    }

    if (lenderUserId) {
      await supabase.from('notifications').insert({
        user_id: lenderUserId,
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
    log.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getCurrentValue(supabase: SupabaseServiceClient, userId: string, field: string): Promise<number> {
  const { data } = await supabase
    .from('users')
    .select(field)
    .eq('id', userId)
    .single();
  
  return Number(data?.[(field as any)] || 0);
}

async function updateBorrowerRating(supabase: SupabaseServiceClient, userId: string) {
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
