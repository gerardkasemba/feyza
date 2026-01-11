import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

const PAYMENT_METHOD_NAMES: Record<string, string> = {
  paypal: 'PayPal',
  cashapp: 'Cash App',
  venmo: 'Venmo',
};

// POST: Lender confirms they sent payment to borrower
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const body = await request.json();
    const { method, reference, proof_url } = body;

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = await createServiceRoleClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the loan with all details
    const { data: loan, error: loanError } = await serviceSupabase
      .from('loans')
      .select(`
        *,
        borrower:users!borrower_id(id, email, full_name, paypal_email, cashapp_username, venmo_username),
        lender:users!lender_id(id, email, full_name),
        business_lender:business_profiles!business_lender_id(id, business_name, contact_email, user_id)
      `)
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Verify the user is the lender for this loan
    let isLender = loan.lender_id === user.id;
    if (!isLender && loan.business_lender?.user_id === user.id) {
      isLender = true;
    }

    if (!isLender) {
      return NextResponse.json({ error: 'Only the lender can confirm payment sent' }, { status: 403 });
    }

    // Check if funds already sent
    if (loan.funds_sent) {
      return NextResponse.json({ error: 'Payment already confirmed' }, { status: 400 });
    }

    // Update the loan - mark funds as sent
    const { error: updateError } = await serviceSupabase
      .from('loans')
      .update({
        funds_sent: true,
        funds_sent_at: new Date().toISOString(),
        funds_sent_method: method || 'paypal',
        funds_sent_reference: reference || null,
        funds_sent_proof_url: proof_url || null,
      })
      .eq('id', loanId);

    if (updateError) {
      console.error('Error updating loan:', updateError);
      return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 });
    }

    // Get lender info for emails
    const lenderName = loan.lender?.full_name || loan.business_lender?.business_name || 'Your lender';
    const lenderEmail = loan.lender?.email || loan.business_lender?.contact_email;
    const borrowerEmail = loan.borrower?.email;
    const borrowerName = loan.borrower?.full_name || 'Borrower';
    const paymentMethodName = PAYMENT_METHOD_NAMES[method] || method || 'PayPal';

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Send notification email to BORROWER
    if (borrowerEmail) {
      await sendEmail({
        to: borrowerEmail,
        subject: `💰 Payment Sent via ${paymentMethodName}!`,
        html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0;">💰 Payment Sent!</h1>
              </div>
              <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0;">
                <p style="font-size: 18px;">Hi ${borrowerName}! 👋</p>
                
                <p><strong>${lenderName}</strong> has sent your loan payment via <strong>${paymentMethodName}</strong>!</p>
                
                <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; border: 1px solid #bbf7d0;">
                  <p style="color: #6b7280; margin: 0;">Amount Sent</p>
                  <p style="font-size: 32px; font-weight: bold; color: #22c55e; margin: 5px 0;">${loan.currency} ${loan.amount.toLocaleString()}</p>
                  <p style="color: #6b7280; margin: 5px 0;">via ${paymentMethodName}</p>
                  ${reference ? `<p style="color: #6b7280; margin: 5px 0; font-size: 12px;">Reference: ${reference}</p>` : ''}
                </div>
                
                ${proof_url ? `
                <div style="margin: 20px 0;">
                  <p style="font-weight: bold; color: #166534; margin-bottom: 10px;">📸 Payment Proof:</p>
                  <img src="${proof_url}" alt="Payment proof" style="max-width: 100%; border-radius: 8px; border: 1px solid #bbf7d0;" />
                </div>
                ` : ''}
                
                <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0; color: #1e40af; font-size: 14px;">
                    <strong>📅 Next Steps:</strong> Check your ${paymentMethodName} account to confirm receipt. Your repayment schedule starts on ${new Date(loan.start_date).toLocaleDateString()}.
                  </p>
                </div>
                
                <a href="${APP_URL}/loans/${loan.id}" style="display: block; background: #22c55e; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
                  View Loan Details →
                </a>
              </div>
            </body>
          </html>
        `,
      });
    }

    // Send confirmation email to LENDER
    if (lenderEmail) {
      await sendEmail({
        to: lenderEmail,
        subject: '✅ Payment Confirmed!',
        html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0;">✅ Payment Confirmed!</h1>
              </div>
              <div style="background: #f5f3ff; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #c4b5fd;">
                <p style="font-size: 18px;">Hi ${lenderName}! 👋</p>
                
                <p>Your ${paymentMethodName} payment has been confirmed.</p>
                
                <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; border: 1px solid #c4b5fd;">
                  <p style="color: #6b7280; margin: 0;">Amount Sent</p>
                  <p style="font-size: 32px; font-weight: bold; color: #4f46e5; margin: 5px 0;">${loan.currency} ${loan.amount.toLocaleString()}</p>
                  <p style="color: #6b7280; margin: 5px 0;">To: ${borrowerName}</p>
                  <p style="color: #6b7280; margin: 5px 0;">via ${paymentMethodName}</p>
                  ${reference ? `<p style="color: #6b7280; margin: 5px 0; font-size: 12px;">Reference: ${reference}</p>` : ''}
                </div>
                
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0; color: #166534; font-size: 14px;">
                    <strong>📅 Expected Repayment:</strong> ${borrowerName} will repay ${loan.currency} ${loan.total_amount?.toLocaleString() || loan.amount.toLocaleString()} over ${loan.total_installments} ${loan.repayment_frequency} payments.
                  </p>
                </div>
                
                <a href="${APP_URL}/loans/${loan.id}" style="display: block; background: #4f46e5; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
                  View Loan Details →
                </a>
              </div>
            </body>
          </html>
        `,
      });
    }

    // Create notification for borrower
    await serviceSupabase.from('notifications').insert({
      user_id: loan.borrower_id,
      loan_id: loan.id,
      type: 'loan_accepted',
      title: '💰 Payment Received!',
      message: `${lenderName} has sent you ${loan.currency} ${loan.amount} via ${paymentMethodName}. Check your account!`,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed',
      loan_id: loanId,
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: Get funds status for a loan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = await createServiceRoleClient();
    const { data: loan, error } = await serviceSupabase
      .from('loans')
      .select('id, funds_sent, funds_sent_at, funds_sent_method, funds_sent_reference')
      .eq('id', loanId)
      .single();

    if (error || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    return NextResponse.json({
      funds_sent: loan.funds_sent,
      funds_sent_at: loan.funds_sent_at,
      funds_sent_method: loan.funds_sent_method,
      funds_sent_reference: loan.funds_sent_reference,
    });

  } catch (error) {
    console.error('Error getting funds status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
