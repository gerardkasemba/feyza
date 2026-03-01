import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email-core';
import { getPaymentConfirmationNeededEmail } from '@/lib/email-dashboard';

const log = logger('payments-proof');

// POST: Submit payment proof (for manual payment methods)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      loan_id,
      payment_schedule_id,
      payment_provider_id,
      amount,
      currency = 'USD',
      transaction_type, // 'disbursement' or 'repayment'
      proof_type, // 'screenshot', 'receipt', 'reference_number', 'photo'
      proof_url,
      proof_reference, // Transaction ID from CashApp, M-Pesa code, etc.
      description,
      receiver_payment_identifier, // The $cashtag, phone number, etc. they sent to
    } = body;

    // Validate required fields
    if (!loan_id || !payment_provider_id || !amount || !transaction_type) {
      return NextResponse.json(
        { error: 'Missing required fields: loan_id, payment_provider_id, amount, transaction_type' },
        { status: 400 }
      );
    }

    // Get the loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*, borrower:borrower_id(id, full_name, email), lender:lender_id(id, full_name, email)')
      .eq('id', loan_id)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Determine sender and receiver based on transaction type
    let sender_id, receiver_id;
    if (transaction_type === 'disbursement') {
      // Lender sends to Borrower
      sender_id = loan.lender_id;
      receiver_id = loan.borrower_id;
    } else if (transaction_type === 'repayment') {
      // Borrower sends to Lender
      sender_id = loan.borrower_id;
      receiver_id = loan.lender_id;
    } else {
      return NextResponse.json({ error: 'Invalid transaction_type' }, { status: 400 });
    }

    // Verify the user is the sender
    if (user.id !== sender_id) {
      return NextResponse.json(
        { error: 'Only the sender can submit payment proof' },
        { status: 403 }
      );
    }

    // Get payment provider details
    const { data: provider } = await supabase
      .from('payment_providers')
      .select('*')
      .eq('id', payment_provider_id)
      .single();

    // Create the payment transaction
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .insert({
        loan_id,
        payment_schedule_id,
        payment_provider_id,
        sender_id,
        receiver_id,
        transaction_type,
        amount,
        currency,
        net_amount: amount, // For manual payments, no platform fees
        status: proof_url || proof_reference ? 'awaiting_confirmation' : 'awaiting_proof',
        proof_type,
        proof_url,
        proof_reference,
        proof_uploaded_at: proof_url || proof_reference ? new Date().toISOString() : null,
        proof_uploaded_by: user.id,
        description,
        metadata: {
          receiver_payment_identifier,
          provider_name: provider?.name,
          provider_type: provider?.provider_type,
        },
      })
      .select()
      .single();

    if (txError) throw txError;

    // Create notification for receiver to confirm
    if (proof_url || proof_reference) {
      await supabase.from('notifications').insert({
        user_id: receiver_id,
        type: 'payment_confirmation_needed',
        title: 'Payment Confirmation Needed',
        message: `${user.email} sent you a ${transaction_type} of ${currency} ${amount.toLocaleString()} via ${provider?.name || 'manual payment'}. Please confirm receipt.`,
        data: {
          transaction_id: transaction.id,
          loan_id,
          amount,
          currency,
          provider: provider?.name,
        },
        is_read: false,
      });

      // Send email notification to receiver
      const receiver = transaction_type === 'repayment' ? loan.lender : loan.borrower;
      const sender = transaction_type === 'repayment' ? loan.borrower : loan.lender;
      const receiverObj = Array.isArray(receiver) ? receiver[0] : receiver;
      const senderObj = Array.isArray(sender) ? sender[0] : sender;

      if (receiverObj?.email) {
        try {
          const { subject, html } = getPaymentConfirmationNeededEmail({
            borrowerName: receiverObj.full_name || receiverObj.email,
            amount,
            currency,
            lenderName: senderObj?.full_name || senderObj?.email || user.email || 'your counterpart',
            accessToken: loan.borrower_access_token || '',
            loanId: loan_id,
          });
          await sendEmail({ to: receiverObj.email, subject, html });
        } catch (emailErr) {
          // Non-fatal — in-app notification already sent
          log.warn('Failed to send payment proof email:', emailErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        provider: provider?.name,
        awaiting_confirmation: transaction.status === 'awaiting_confirmation',
      },
      message: proof_url || proof_reference
        ? 'Payment proof submitted. Waiting for recipient to confirm.'
        : 'Transaction created. Please upload proof of payment.',
    });
  } catch (error: unknown) {
    log.error('Error submitting payment proof:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to submit payment proof' },
      { status: 500 }
    );
  }
}

// PATCH: Confirm or dispute a payment
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      transaction_id,
      action, // 'confirm' or 'dispute'
      note,
      dispute_reason,
    } = body;

    if (!transaction_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: transaction_id, action' },
        { status: 400 }
      );
    }

    // Get the transaction
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .select('*, loan:loan_id(*)')
      .eq('id', transaction_id)
      .single();

    if (txError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Only the receiver can confirm/dispute
    if (user.id !== transaction.receiver_id) {
      return NextResponse.json(
        { error: 'Only the recipient can confirm or dispute this payment' },
        { status: 403 }
      );
    }

    // Handle confirmation
    if (action === 'confirm') {
      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          status: 'completed',
          confirmed_by: user.id,
          confirmed_at: new Date().toISOString(),
          confirmation_note: note,
          completed_at: new Date().toISOString(),
        })
        .eq('id', transaction_id);

      if (updateError) throw updateError;

      // Update loan based on transaction type
      if (transaction.transaction_type === 'disbursement') {
        // Loan is now funded
        await supabase
          .from('loans')
          .update({
            status: 'active',
            funded_at: new Date().toISOString(),
            disbursement_confirmed: true,
            disbursement_confirmed_at: new Date().toISOString(),
          })
          .eq('id', transaction.loan_id);

        // Increment loans_active on vouchers for this borrower (same as accept/dwolla/setup-loan)
        const borrowerId = (transaction.loan as { borrower_id?: string })?.borrower_id;
        if (borrowerId) {
          try {
            const serviceSupabase = await createServiceRoleClient();
            const { onVoucheeNewLoan } = await import('@/lib/vouching/accountability');
            await onVoucheeNewLoan(serviceSupabase as any, borrowerId, transaction.loan_id);
          } catch (err) {
            log.error('[PaymentProof] onVoucheeNewLoan error (non-fatal):', err);
          }
        }
      } else if (transaction.transaction_type === 'repayment') {
        // Update payment schedule if linked
        if (transaction.payment_schedule_id) {
          await supabase
            .from('payment_schedule')
            .update({
              is_paid: true,
              paid_at: new Date().toISOString(),
              payment_method: 'manual',
              payment_reference: transaction.proof_reference,
            })
            .eq('id', transaction.payment_schedule_id);
        }

        // Update loan amounts
        const newAmountPaid = (transaction.loan?.amount_paid || 0) + transaction.amount;
        const newAmountRemaining = (transaction.loan?.amount_remaining || transaction.loan?.total_amount) - transaction.amount;

        await supabase
          .from('loans')
          .update({
            amount_paid: newAmountPaid,
            amount_remaining: Math.max(0, newAmountRemaining),
            status: newAmountRemaining <= 0 ? 'completed' : 'active',
            completed_at: newAmountRemaining <= 0 ? new Date().toISOString() : null,
          })
          .eq('id', transaction.loan_id);
      }

      // Notify sender
      await supabase.from('notifications').insert({
        user_id: transaction.sender_id,
        type: 'payment_confirmed',
        title: 'Payment Confirmed',
        message: `Your payment of ${transaction.currency} ${transaction.amount.toLocaleString()} has been confirmed.`,
        data: { transaction_id, loan_id: transaction.loan_id },
        is_read: false,
      });

      // ── Trust Score + Vouches + Loan completion pipeline ──────────────
      // BUG FIX: This was completely missing. When a lender confirmed a
      // proof-based payment (CashApp/Venmo/Zelle), the trust score, voucher
      // accountability, user stats, and lender capital release pipeline
      // never fired.
      if (transaction.transaction_type === 'repayment' && transaction.sender_id) {
        try {
          const serviceSupabase = await createServiceRoleClient();
          const { onPaymentCompleted } = await import('@/lib/payments/handler');

          // Determine payment timing
          let dueDate: string | undefined;
          if (transaction.payment_schedule_id) {
            const { data: schedItem } = await serviceSupabase
              .from('payment_schedule')
              .select('due_date')
              .eq('id', transaction.payment_schedule_id)
              .single();
            dueDate = schedItem?.due_date;
          }

          const trustResult = await onPaymentCompleted({
            supabase: serviceSupabase,
            loanId: transaction.loan_id,
            borrowerId: transaction.sender_id,
            paymentId: transaction.payment_schedule_id || transaction_id,
            scheduleId: transaction.payment_schedule_id || undefined,
            amount: Number(transaction.amount),
            dueDate,
            paymentMethod: 'manual',
          });

          log.info('[PaymentProof] Trust score update result:', trustResult);
        } catch (trustErr) {
          log.error('[PaymentProof] Trust score update failed (non-fatal):', trustErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Payment confirmed successfully',
        transaction: { id: transaction_id, status: 'completed' },
      });
    }

    // Handle dispute
    if (action === 'dispute') {
      if (!dispute_reason) {
        return NextResponse.json(
          { error: 'Dispute reason is required' },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          status: 'disputed',
          disputed_at: new Date().toISOString(),
          disputed_by: user.id,
          dispute_reason,
        })
        .eq('id', transaction_id);

      if (updateError) throw updateError;

      // Notify sender
      await supabase.from('notifications').insert({
        user_id: transaction.sender_id,
        type: 'payment_disputed',
        title: 'Payment Disputed',
        message: `Your payment of ${transaction.currency} ${transaction.amount.toLocaleString()} has been disputed. Reason: ${dispute_reason}`,
        data: { transaction_id, loan_id: transaction.loan_id, dispute_reason },
        is_read: false,
      });

      // Notify admins about the dispute
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        try {
          const { emailWrapper } = await import('@/lib/email-core');
          const { subject, html } = {
            subject: `⚠️ Payment Disputed — Transaction ${transaction_id}`,
            html: emailWrapper({
              title: '⚠️ Payment Dispute Filed',
              subtitle: 'Action Required',
              content: `
                <p style="color: #374151;">A payment dispute has been filed and requires review.</p>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 16px 0; border: 1px solid #fecaca;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr><td style="padding: 6px 0; color: #6b7280; width: 40%;">Transaction ID</td><td style="padding: 6px 0; font-weight: 600; color: #111;">${transaction_id}</td></tr>
                    <tr><td style="padding: 6px 0; color: #6b7280;">Loan ID</td><td style="padding: 6px 0; font-weight: 600; color: #111;">${transaction.loan_id}</td></tr>
                    <tr><td style="padding: 6px 0; color: #6b7280;">Amount</td><td style="padding: 6px 0; font-weight: 600; color: #111;">${transaction.currency} ${Number(transaction.amount).toLocaleString()}</td></tr>
                    <tr><td style="padding: 6px 0; color: #6b7280;">Disputed By</td><td style="padding: 6px 0; font-weight: 600; color: #111;">${user.email}</td></tr>
                    <tr><td style="padding: 6px 0; color: #6b7280;">Reason</td><td style="padding: 6px 0; font-weight: 600; color: #dc2626;">${dispute_reason}</td></tr>
                    <tr><td style="padding: 6px 0; color: #6b7280;">Filed At</td><td style="padding: 6px 0; font-weight: 600; color: #111;">${new Date().toLocaleString()}</td></tr>
                  </table>
                </div>
              `,
              ctaText: 'Review in Admin Panel',
              ctaUrl: `${APP_URL}/admin/disputes?transaction=${transaction_id}`,
              footerNote: 'This is an automated alert from the Feyza platform.',
            }),
          };
          await sendEmail({ to: adminEmail, subject, html });
        } catch (emailErr) {
          // Non-fatal — dispute is recorded, email delivery is best-effort
          log.warn('Failed to send admin dispute notification:', emailErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Payment disputed. Our team will review this.',
        transaction: { id: transaction_id, status: 'disputed' },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    log.error('Error processing payment action:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to process payment action' },
      { status: 500 }
    );
  }
}
