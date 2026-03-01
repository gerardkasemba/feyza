import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import {
  sendEmail,
  getPaymentReceivedLenderEmail,
  getPaymentProcessedBorrowerEmail,
  getPaymentReceivedGuestLenderEmail,
} from '@/lib/email';
import { logger } from '@/lib/logger';

const log = logger('payments-manual');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  log.info('[Manual Payment API] Starting...');

  try {
    // Verify the user is authenticated
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      log.info('[Manual Payment API] Unauthorized - no user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    log.info('[Manual Payment API] User authenticated:', user.id);

    const body = await request.json();
    const { loanId, paymentId, paymentMethod, transactionReference, proofUrl, platformFee } = body;

    log.info('[Manual Payment API] Request body:', {
      loanId,
      paymentId,
      paymentMethod,
      proofUrl: !!proofUrl,
    });

    if (!loanId || !paymentId || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use service role client to bypass RLS
    const serviceClient = await createServiceRoleClient();

    // Get the loan
    const { data: loan, error: loanError } = await serviceClient
      .from('loans')
      .select(
        `
        *,
        borrower:users!borrower_id(id, full_name, email),
        lender:users!lender_id(id, full_name, email),
        business_lender:business_profiles!business_lender_id(id, business_name, user_id),
        invite_email,
        invite_token
      `
      )
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      log.error('[Manual Payment API] Error fetching loan:', loanError);
      return NextResponse.json({ error: 'Loan not found', details: loanError?.message }, { status: 404 });
    }

    log.info('[Manual Payment API] Loan found:', {
      id: loan.id,
      amount: loan.amount,
      total_amount: (loan as any).total_amount,
      amount_paid: loan.amount_paid,
      borrower_id: loan.borrower_id,
    });

    // Verify the user is the borrower
    if (loan.borrower_id !== user.id) {
      log.info('[Manual Payment API] User is not borrower:', { userId: user.id, borrowerId: loan.borrower_id });
      return NextResponse.json({ error: 'Only the borrower can submit payments' }, { status: 403 });
    }

    // Get the payment schedule entry
    const { data: payment, error: paymentError } = await serviceClient
      .from('payment_schedule')
      .select('*')
      .eq('id', paymentId)
      .eq('loan_id', loanId)
      .single();

    if (paymentError || !payment) {
      log.error('[Manual Payment API] Error fetching payment:', paymentError);
      return NextResponse.json({ error: 'Payment not found', details: paymentError?.message }, { status: 404 });
    }

    log.info('[Manual Payment API] Payment found:', {
      id: payment.id,
      amount: payment.amount,
      is_paid: payment.is_paid,
      status: payment.status,
    });

    if (payment.is_paid) {
      return NextResponse.json({ error: 'Payment already marked as paid' }, { status: 400 });
    }

    // Update the payment schedule
    const paymentUpdateData = {
      is_paid: true,
      status: 'paid',
      payment_status: 'completed',
      paid_at: new Date().toISOString(),
      payment_method: paymentMethod,
      transaction_reference: transactionReference || null,
      payment_proof_url: proofUrl || null,
      manual_payment: true,
      platform_fee: platformFee || 0,
      marked_paid_by: user.id,
    };

    log.info('[Manual Payment API] Updating payment_schedule with:', paymentUpdateData);

    const { data: updatedPayment, error: updatePaymentError } = await serviceClient
      .from('payment_schedule')
      .update(paymentUpdateData)
      .eq('id', paymentId)
      .select()
      .single();

    if (updatePaymentError) {
      log.error('[Manual Payment API] Error updating payment schedule:', updatePaymentError);
      return NextResponse.json(
        { error: 'Failed to update payment', details: updatePaymentError.message },
        { status: 500 }
      );
    }

    log.info('[Manual Payment API] Payment schedule updated:', updatedPayment);

    // ── INSERT INTO payments TABLE ──────────────────────────────────────────
    // Columns must match the deployed payments table exactly:
    //   id, loan_id, schedule_id, amount, payment_date, status,
    //   confirmed_by, confirmation_date, note, proof_url, paypal_transaction_id, created_at
    //
    // IMPORTANT: `transaction_reference` is NOT a column on payments (only on
    // payment_schedule). Including it caused the insert to fail with a
    // PostgreSQL "unknown column" error, silently suppressed as "Non-fatal",
    // leaving payment_schedule.payment_id unlinked.
    const { data: paymentRecord, error: paymentInsertError } = await serviceClient
      .from('payments')
      .insert({
        loan_id: loanId,
        schedule_id: paymentId,
        amount: payment.amount,
        payment_date: new Date().toISOString(),
        status: 'confirmed',
        note: `Manual payment via ${paymentMethod}${
          transactionReference ? ` — ref: ${transactionReference}` : ''
        }${proofUrl ? ' (proof uploaded)' : ''}`,
        // proof_url is the correct column name on payments (not payment_proof_url)
        ...(proofUrl ? { proof_url: proofUrl } : {}),
      })
      .select()
      .single();

    if (paymentInsertError) {
      log.error('[Manual Payment API] Error creating payments record:', paymentInsertError);
      // Non-fatal: payment_schedule is already marked paid; proceed.
    } else if (paymentRecord) {
      // Link payment record back to the schedule row
      await serviceClient.from('payment_schedule').update({ payment_id: paymentRecord.id }).eq('id', paymentId);
      log.info('[Manual Payment API] payments record created:', paymentRecord.id);
    }

    // ── Calculate new amounts (numeric-safe) ────────────────────────────────
    const paymentAmountNum = Number(payment.amount) || 0;
    const currentAmountPaid = Number(loan.amount_paid) || 0;

    // Use total_amount (principal + interest) as the repayment ceiling — consistent with auto-pay.
    // Fallback to amount (principal only) if total_amount is not set.
    const loanTotal = Number((loan as any).total_amount) || Number(loan.amount) || 0;

    const newAmountPaid = currentAmountPaid + paymentAmountNum;
    const newAmountRemaining = Math.max(0, loanTotal - newAmountPaid);

    // Check unpaid schedule entries as the authoritative source of completion,
    // plus a $0.50 rounding tolerance — consistent with auto-pay.
    const { count: unpaidCount } = await serviceClient
      .from('payment_schedule')
      .select('id', { count: 'exact', head: true })
      .eq('loan_id', loanId)
      .eq('is_paid', false);

    const allSchedulePaid = (unpaidCount ?? 1) === 0;
    const isComplete = allSchedulePaid || newAmountRemaining <= 0.5;

    log.info('[Manual Payment API] Calculated amounts:', {
      paymentAmount: paymentAmountNum,
      currentAmountPaid,
      loanTotal,
      newAmountPaid,
      newAmountRemaining,
      unpaidCount,
      isComplete,
    });

    // Update the loan — mirror auto-pay field set exactly
    const loanUpdateData = {
      amount_paid: isComplete ? loanTotal : newAmountPaid,
      amount_remaining: isComplete ? 0 : newAmountRemaining,
      status: isComplete ? 'completed' : loan.status,
      last_payment_at: new Date().toISOString(),
      completed_at: isComplete ? new Date().toISOString() : null,
    };

    log.info('[Manual Payment API] Updating loan with:', loanUpdateData);

    const { data: updatedLoan, error: updateLoanError } = await serviceClient
      .from('loans')
      .update(loanUpdateData)
      .eq('id', loanId)
      .select()
      .single();

    if (updateLoanError) {
      log.error('[Manual Payment API] Error updating loan:', updateLoanError);
      return NextResponse.json(
        { error: 'Payment recorded but failed to update loan totals', details: updateLoanError.message },
        { status: 500 }
      );
    }

    log.info('[Manual Payment API] Loan updated successfully:', {
      loanId,
      newAmountPaid: updatedLoan?.amount_paid,
      newAmountRemaining: updatedLoan?.amount_remaining,
      status: updatedLoan?.status,
    });

    log.info(
      `Manual payment processed: Loan ${loanId}, Payment ${paymentId}, Amount: ${paymentAmountNum}, New total paid: ${newAmountPaid}`
    );

    // ── Email notifications ────────────────────────────────────────────────
    const borrowerName = loan.borrower?.full_name || 'Borrower';
    const borrowerEmail = loan.borrower?.email;

    // Determine lender info
    let lenderName = 'Lender';
    let lenderEmail = '';

    if (loan.lender) {
      lenderName = loan.lender.full_name || 'Lender';
      lenderEmail = loan.lender.email || '';
    } else if (loan.business_lender) {
      lenderName = loan.business_lender.business_name || 'Lender';

      // Get business owner email
      if (loan.business_lender.user_id) {
        const { data: ownerData } = await serviceClient
          .from('users')
          .select('email, full_name')
          .eq('id', loan.business_lender.user_id)
          .single();

        lenderEmail = ownerData?.email || '';
        lenderName = loan.business_lender.business_name || ownerData?.full_name || 'Lender';
      }
    } else if ((loan as any).invite_email) {
      lenderEmail = (loan as any).invite_email;
    }

    // Send email to lender — use guest template when loan has an invite_token
    if (lenderEmail) {
      try {
        const isGuestLoan = !!(loan as any).invite_token;
        let lenderEmailContent;

        if (isGuestLoan && (loan as any).invite_token) {
          lenderEmailContent = getPaymentReceivedGuestLenderEmail({
            lenderName: lenderName.split(' ')[0],
            borrowerName,
            amount: paymentAmountNum,
            currency: loan.currency || 'USD',
            remainingBalance: newAmountRemaining,
            loanId: loan.id,
            accessToken: (loan as any).invite_token,
            isCompleted: isComplete,
          });
        } else {
          lenderEmailContent = getPaymentReceivedLenderEmail({
            lenderName: lenderName.split(' ')[0],
            borrowerName,
            amount: paymentAmountNum,
            currency: loan.currency || 'USD',
            remainingBalance: newAmountRemaining,
            loanId: loan.id,
            isCompleted: isComplete,
          });
        }

        await sendEmail({
          to: lenderEmail,
          subject: lenderEmailContent.subject,
          html: lenderEmailContent.html,
        });

        log.info(`Payment notification email sent to lender: ${lenderEmail}`);
      } catch (emailError) {
        log.error('Failed to send lender email:', emailError);
      }
    }

    // Send confirmation email to borrower
    if (borrowerEmail) {
      try {
        const borrowerEmailContent = getPaymentProcessedBorrowerEmail({
          borrowerName: borrowerName.split(' ')[0],
          lenderName,
          amount: paymentAmountNum,
          currency: loan.currency || 'USD',
          remainingBalance: newAmountRemaining,
          loanId: loan.id,
          isCompleted: isComplete,
        });

        await sendEmail({
          to: borrowerEmail,
          subject: borrowerEmailContent.subject,
          html: borrowerEmailContent.html,
        });

        log.info(`Payment confirmation email sent to borrower: ${borrowerEmail}`);
      } catch (emailError) {
        log.error('Failed to send borrower email:', emailError);
      }
    }

    // ── In-app notification for lender ─────────────────────────────────────
    const notificationMessage = `${borrowerName} has made a payment of $${paymentAmountNum.toLocaleString()} via ${paymentMethod}`;
    const notificationData = { loan_id: loanId, payment_id: paymentId, amount: paymentAmountNum };

    if (loan.lender_id) {
      await serviceClient.from('notifications').insert({
        user_id: loan.lender_id,
        type: 'payment_received',
        title: 'Payment Received',
        message: notificationMessage,
        data: notificationData,
        is_read: false,
      });
    } else if (loan.business_lender?.user_id) {
      await serviceClient.from('notifications').insert({
        user_id: loan.business_lender.user_id,
        type: 'payment_received',
        title: 'Payment Received',
        message: notificationMessage,
        data: notificationData,
        is_read: false,
      });
    }

    // ── Update Trust Score using centralized handler ───────────────────────
    try {
      const { onPaymentCompleted } = await import('@/lib/payments/handler');

      const result = await onPaymentCompleted({
        supabase: serviceClient,
        loanId,
        borrowerId: user.id,
        paymentId,
        scheduleId: paymentId,
        amount: paymentAmountNum,
        dueDate: payment.due_date,
        paymentMethod: 'manual',
      });

      log.info('[Manual Payment] Trust score update result:', result);

      if (!result.trustScoreUpdated) {
        log.error('[Manual Payment] Trust score failed to update:', result.error);
      }

      if (result.loanCompleted) {
        log.info('[Manual Payment] 🎉 Loan completed, tier/eligibility updated!');
      }
    } catch (trustError) {
      log.error('[Manual Payment] Failed to update trust score:', trustError);
      // Don't fail the payment if trust score update fails
    }

    return NextResponse.json({
      success: true,
      newAmountPaid,
      newAmountRemaining,
      isComplete,
      message: 'Payment recorded successfully',
    });
  } catch (error: unknown) {
    log.error('Error processing manual payment:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to process payment' }, { status: 500 });
  }
}