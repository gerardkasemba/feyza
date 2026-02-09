import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

      // TODO: Send email notification
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
  } catch (error: any) {
    console.error('Error submitting payment proof:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit payment proof' },
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

      // TODO: Notify admins

      return NextResponse.json({
        success: true,
        message: 'Payment disputed. Our team will review this.',
        transaction: { id: transaction_id, status: 'disputed' },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error processing payment action:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process payment action' },
      { status: 500 }
    );
  }
}
