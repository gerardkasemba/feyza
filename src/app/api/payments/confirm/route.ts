import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendEmail, getPaymentConfirmationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    
    const { paymentId } = body;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the payment with loan info
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, loan:loans!loan_id(*, borrower:users!borrower_id(*))')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const loan = payment.loan;

    // Verify user is the lender
    let isAuthorized = loan.lender_id === user.id;
    
    if (!isAuthorized && loan.business_lender_id) {
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('user_id')
        .eq('id', loan.business_lender_id)
        .single();
      
      isAuthorized = businessProfile?.user_id === user.id;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'confirmed',
        confirmed_by: user.id,
        confirmation_date: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (updateError) {
      throw updateError;
    }

    // Create notification for borrower
    await supabase.from('notifications').insert({
      user_id: loan.borrower_id,
      loan_id: loan.id,
      type: 'payment_confirmed',
      title: 'Payment Confirmed! ✅',
      message: `Your payment of ${loan.currency} ${payment.amount} has been confirmed.`,
    });

    // Send email to borrower
    if (loan.borrower?.email) {
      const { subject, html } = getPaymentConfirmationEmail({
        recipientName: loan.borrower.full_name || 'there',
        amount: payment.amount,
        currency: loan.currency,
        loanId: loan.id,
        role: 'borrower',
      });

      await sendEmail({ to: loan.borrower.email, subject, html });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
