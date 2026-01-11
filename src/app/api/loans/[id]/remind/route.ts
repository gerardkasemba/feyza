import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { id: loanId } = await params;

    console.log('Remind API called for loan:', loanId);

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    // Parse request body
    let body: { payment_id?: string; message?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }
    
    const { payment_id, message } = body;

    // Get loan details - use simpler query first
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        *,
        borrower:users!borrower_id(id, email, full_name),
        lender:users!lender_id(id, email, full_name),
        business_lender:business_profiles!business_lender_id(id, business_name, contact_email)
      `)
      .eq('id', loanId)
      .single();

    if (loanError) {
      console.error('Loan query error:', loanError);
      return NextResponse.json({ error: 'Loan not found', details: loanError.message }, { status: 404 });
    }

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Get borrower email - support both registered users and guest borrowers
    let borrowerEmail: string | null = null;
    let borrowerName = 'there';
    
    if (loan.borrower?.email) {
      borrowerEmail = loan.borrower.email;
      borrowerName = loan.borrower.full_name || 'there';
    } else if (loan.borrower_invite_email) {
      borrowerEmail = loan.borrower_invite_email;
    }
    
    if (!borrowerEmail) {
      return NextResponse.json({ error: 'Borrower email not found' }, { status: 400 });
    }

    // Get lender name
    const lenderName = loan.lender?.full_name || loan.business_lender?.business_name || 'Your lender';
    
    // Build loan link - use guest access token for guest borrowers
    const loanLink = loan.borrower_access_token 
      ? `${APP_URL}/borrower/${loan.borrower_access_token}`
      : `${APP_URL}/loans/${loanId}`;

    // Get specific payment if provided, otherwise get next upcoming payment
    let payment = null;
    if (payment_id) {
      const { data: paymentData } = await supabase
        .from('payment_schedule')
        .select('*')
        .eq('id', payment_id)
        .eq('loan_id', loanId)
        .single();
      payment = paymentData;
    } else {
      // Get the next unpaid payment
      const { data: nextPayment } = await supabase
        .from('payment_schedule')
        .select('*')
        .eq('loan_id', loanId)
        .eq('is_paid', false)
        .order('due_date', { ascending: true })
        .limit(1)
        .single();
      payment = nextPayment;
    }

    if (!payment) {
      return NextResponse.json({ error: 'No pending payments found' }, { status: 400 });
    }

    const dueDate = new Date(payment.due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysUntilDue < 0;

    // Send reminder email to borrower
    await sendEmail({
      to: borrowerEmail,
      subject: isOverdue 
        ? `⚠️ Payment Overdue - Reminder from ${lenderName}`
        : `💰 Payment Reminder from ${lenderName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: ${isOverdue ? '#ef4444' : '#f59e0b'}; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">${isOverdue ? '⚠️ Payment Overdue' : '💰 Payment Reminder'}</h1>
            </div>
            
            <div style="background: ${isOverdue ? '#fef2f2' : '#fffbeb'}; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid ${isOverdue ? '#fecaca' : '#fde68a'};">
              <p style="font-size: 18px;">Hi ${borrowerName},</p>
              
              <p><strong>${lenderName}</strong> has sent you a payment reminder.</p>
              
              <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid ${isOverdue ? '#fecaca' : '#fde68a'};">
                <p style="color: #6b7280; margin: 0 0 10px 0;">Payment Amount</p>
                <p style="font-size: 32px; font-weight: bold; color: ${isOverdue ? '#ef4444' : '#f59e0b'}; margin: 0;">
                  ${loan.currency} ${payment.amount.toLocaleString()}
                </p>
                <p style="color: #6b7280; margin: 10px 0 0 0;">
                  ${isOverdue 
                    ? `<span style="color: #ef4444; font-weight: bold;">⚠️ ${Math.abs(daysUntilDue)} days overdue</span>` 
                    : daysUntilDue === 0 
                      ? '<span style="color: #f59e0b; font-weight: bold;">Due Today!</span>'
                      : `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`
                  }
                </p>
                <p style="color: #6b7280; margin: 5px 0 0 0;">
                  Due Date: ${dueDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              
              ${message ? `
                <div style="background: white; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isOverdue ? '#ef4444' : '#f59e0b'};">
                  <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">Message from ${lenderName}:</p>
                  <p style="color: #1f2937; margin: 0; font-style: italic;">"${message}"</p>
                </div>
              ` : ''}
              
              <a href="${loanLink}" style="display: block; background: ${isOverdue ? '#ef4444' : '#f59e0b'}; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
                View Loan & Make Payment →
              </a>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                If you've already made this payment, please mark it as paid in your account or contact your lender.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    // Record that a manual reminder was sent
    await supabase
      .from('payment_schedule')
      .update({ 
        last_manual_reminder_at: new Date().toISOString(),
        manual_reminder_count: (payment.manual_reminder_count || 0) + 1,
      })
      .eq('id', payment.id);

    // Create notification for borrower (only if they have an account)
    if (loan.borrower_id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: loan.borrower_id,
          type: 'payment_reminder',
          title: isOverdue ? 'Payment Overdue Reminder' : 'Payment Reminder',
          message: `${lenderName} sent you a reminder. ${loan.currency} ${payment.amount.toLocaleString()} is ${isOverdue ? 'overdue' : 'due soon'}.`,
          loan_id: loanId,
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder sent successfully',
      sent_to: borrowerEmail,
      payment_amount: payment.amount,
      due_date: payment.due_date,
    });

  } catch (error) {
    console.error('Error sending reminder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
