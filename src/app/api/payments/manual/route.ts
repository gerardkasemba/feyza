import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getPaymentReceivedLenderEmail, getPaymentProcessedBorrowerEmail } from '@/lib/email';
import { TrustScoreService } from '@/lib/trust-score';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  console.log('[Manual Payment API] Starting...');
  
  try {
    // Verify the user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log('[Manual Payment API] Unauthorized - no user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Manual Payment API] User authenticated:', user.id);

    const body = await request.json();
    const { 
      loanId, 
      paymentId, 
      paymentMethod, 
      transactionReference, 
      proofUrl,
      platformFee 
    } = body;

    console.log('[Manual Payment API] Request body:', { loanId, paymentId, paymentMethod, proofUrl: !!proofUrl });

    if (!loanId || !paymentId || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use service role client to bypass RLS
    const serviceClient = await createServiceRoleClient();

    // Get the loan
    const { data: loan, error: loanError } = await serviceClient
      .from('loans')
      .select(`
        *,
        borrower:users!borrower_id(id, full_name, email),
        lender:users!lender_id(id, full_name, email),
        business_lender:business_profiles!business_lender_id(id, business_name, user_id)
      `)
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      console.error('[Manual Payment API] Error fetching loan:', loanError);
      return NextResponse.json({ error: 'Loan not found', details: loanError?.message }, { status: 404 });
    }

    console.log('[Manual Payment API] Loan found:', { 
      id: loan.id, 
      amount: loan.amount, 
      amount_paid: loan.amount_paid,
      borrower_id: loan.borrower_id 
    });

    // Verify the user is the borrower
    if (loan.borrower_id !== user.id) {
      console.log('[Manual Payment API] User is not borrower:', { userId: user.id, borrowerId: loan.borrower_id });
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
      console.error('[Manual Payment API] Error fetching payment:', paymentError);
      return NextResponse.json({ error: 'Payment not found', details: paymentError?.message }, { status: 404 });
    }

    console.log('[Manual Payment API] Payment found:', { 
      id: payment.id, 
      amount: payment.amount, 
      is_paid: payment.is_paid,
      status: payment.status 
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

    console.log('[Manual Payment API] Updating payment_schedule with:', paymentUpdateData);

    const { data: updatedPayment, error: updatePaymentError } = await serviceClient
      .from('payment_schedule')
      .update(paymentUpdateData)
      .eq('id', paymentId)
      .select()
      .single();

    if (updatePaymentError) {
      console.error('[Manual Payment API] Error updating payment schedule:', updatePaymentError);
      return NextResponse.json({ error: 'Failed to update payment', details: updatePaymentError.message }, { status: 500 });
    }

    console.log('[Manual Payment API] Payment schedule updated:', updatedPayment);

    // Calculate new amounts - ensure numeric conversion
    const paymentAmount = Number(payment.amount) || 0;
    const currentAmountPaid = Number(loan.amount_paid) || 0;
    const loanAmount = Number(loan.amount) || 0;
    
    const newAmountPaid = currentAmountPaid + paymentAmount;
    const newAmountRemaining = Math.max(0, loanAmount - newAmountPaid);
    const isComplete = newAmountPaid >= loanAmount;

    console.log('[Manual Payment API] Calculated amounts:', {
      paymentAmount,
      currentAmountPaid,
      loanAmount,
      newAmountPaid,
      newAmountRemaining,
      isComplete
    });

    // Update the loan
    const loanUpdateData = {
      amount_paid: newAmountPaid,
      amount_remaining: newAmountRemaining,
      status: isComplete ? 'completed' : loan.status,
      completed_at: isComplete ? new Date().toISOString() : null,
    };

    console.log('[Manual Payment API] Updating loan with:', loanUpdateData);

    const { data: updatedLoan, error: updateLoanError } = await serviceClient
      .from('loans')
      .update(loanUpdateData)
      .eq('id', loanId)
      .select()
      .single();

    if (updateLoanError) {
      console.error('[Manual Payment API] Error updating loan:', updateLoanError);
      return NextResponse.json({ 
        error: 'Payment recorded but failed to update loan totals', 
        details: updateLoanError.message 
      }, { status: 500 });
    }

    console.log('[Manual Payment API] Loan updated successfully:', {
      loanId,
      newAmountPaid: updatedLoan?.amount_paid,
      newAmountRemaining: updatedLoan?.amount_remaining,
      status: updatedLoan?.status
    });

    console.log(`Manual payment processed: Loan ${loanId}, Payment ${paymentId}, Amount: ${payment.amount}, New total paid: ${newAmountPaid}`);

    // Send email notifications
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
    } else if (loan.invite_email) {
      lenderEmail = loan.invite_email;
    }

    // Send email to lender
    if (lenderEmail) {
      try {
        const lenderEmailContent = getPaymentReceivedLenderEmail({
          lenderName: lenderName.split(' ')[0],
          borrowerName,
          amount: payment.amount,
          currency: loan.currency || 'USD',
          remainingBalance: newAmountRemaining,
          loanId: loan.id,
          isCompleted: isComplete,
        });

        await sendEmail({
          to: lenderEmail,
          subject: lenderEmailContent.subject,
          html: lenderEmailContent.html,
        });
        console.log(`Payment notification email sent to lender: ${lenderEmail}`);
      } catch (emailError) {
        console.error('Failed to send lender email:', emailError);
      }
    }

    // Send confirmation email to borrower
    if (borrowerEmail) {
      try {
        const borrowerEmailContent = getPaymentProcessedBorrowerEmail({
          borrowerName: borrowerName.split(' ')[0],
          lenderName,
          amount: payment.amount,
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
        console.log(`Payment confirmation email sent to borrower: ${borrowerEmail}`);
      } catch (emailError) {
        console.error('Failed to send borrower email:', emailError);
      }
    }

    // Create in-app notification for lender
    if (loan.lender_id) {
      await serviceClient.from('notifications').insert({
        user_id: loan.lender_id,
        type: 'payment_received',
        title: 'Payment Received',
        message: `${borrowerName} has made a payment of $${payment.amount.toLocaleString()} via ${paymentMethod}`,
        data: { loan_id: loanId, payment_id: paymentId, amount: payment.amount },
        is_read: false,
      });
    } else if (loan.business_lender?.user_id) {
      await serviceClient.from('notifications').insert({
        user_id: loan.business_lender.user_id,
        type: 'payment_received',
        title: 'Payment Received',
        message: `${borrowerName} has made a payment of $${payment.amount.toLocaleString()} via ${paymentMethod}`,
        data: { loan_id: loanId, payment_id: paymentId, amount: payment.amount },
        is_read: false,
      });
    }

    // Update Trust Score using centralized handler
    try {
      const { onPaymentCompleted } = await import('@/lib/payments/handler');
      
      const result = await onPaymentCompleted({
        supabase: serviceClient,
        loanId,
        borrowerId: user.id,
        paymentId,
        scheduleId: paymentId,
        amount: Number(payment.amount),
        dueDate: payment.due_date,
        paymentMethod: 'manual',
      });

      console.log('[Manual Payment] Trust score update result:', result);
      
      if (!result.trustScoreUpdated) {
        console.error('[Manual Payment] Trust score failed to update:', result.error);
      }
      
      if (result.loanCompleted) {
        console.log('[Manual Payment] 🎉 Loan completed, tier/eligibility updated!');
      }
    } catch (trustError) {
      console.error('[Manual Payment] Failed to update trust score:', trustError);
      // Don't fail the payment if trust score update fails
    }


    return NextResponse.json({ 
      success: true, 
      newAmountPaid,
      newAmountRemaining,
      isComplete,
      message: 'Payment recorded successfully'
    });

  } catch (error: any) {
    console.error('Error processing manual payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process payment' },
      { status: 500 }
    );
  }
}
