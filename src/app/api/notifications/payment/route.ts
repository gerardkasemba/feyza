import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getPaymentConfirmationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId, paymentId, amount } = body;

    const supabase = await createServiceRoleClient();

    // Get loan with lender info
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        *,
        borrower:users!borrower_id(*),
        lender:users!lender_id(*)
      `)
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Send email to lender (if they have an account)
    if (loan.lender?.email) {
      const { subject, html } = getPaymentConfirmationEmail({
        recipientName: loan.lender.full_name,
        amount,
        currency: loan.currency,
        loanId: loan.id,
        role: 'lender',
      });

      await sendEmail({
        to: loan.lender.email,
        subject,
        html,
      });
    }

    // If personal loan, send to invite email
    if (loan.invite_email && !loan.lender_id) {
      const { subject, html } = getPaymentConfirmationEmail({
        recipientName: 'Lender',
        amount,
        currency: loan.currency,
        loanId: loan.id,
        role: 'lender',
      });

      await sendEmail({
        to: loan.invite_email,
        subject,
        html,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending payment notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
