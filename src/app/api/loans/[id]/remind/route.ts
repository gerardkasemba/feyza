import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getPaymentReminderEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

const log = logger('loans-id-remind');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { id: loanId } = await params;

    log.info('Remind API called for loan:', loanId);

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
      log.error('Loan query error:', loanError);
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
            <!-- Header with logo and dynamic gradient -->
            <div style="background: linear-gradient(135deg, ${isOverdue ? '#dc2626' : '#059669'} 0%, ${isOverdue ? '#b91c1c' : '#047857'} 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
              <!-- Logo -->
              <div style="margin-bottom: 20px;">
                <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                    alt="Feyza Logo" 
                    style="height: 40px; width: auto; filter: brightness(0) invert(1);">
              </div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
                ${isOverdue ? '⚠️ Payment Overdue' : '💰 Payment Reminder'}
              </h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Feyza Payment System</p>
            </div>
            
            <!-- Content area with dynamic background -->
            <div style="background: ${isOverdue ? '#fef2f2' : '#f0fdf4'}; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid ${isOverdue ? '#fecaca' : '#bbf7d0'}; border-top: none;">
              <p style="font-size: 18px; color: ${isOverdue ? '#991b1b' : '#166534'}; margin-bottom: 20px;">Hi ${borrowerName},</p>
              
              <p style="color: ${isOverdue ? '#991b1b' : '#166534'}; line-height: 1.6;">
                <strong style="color: ${isOverdue ? '#dc2626' : '#059669'};">${lenderName}</strong> has sent you a payment reminder.
              </p>
              
              <!-- Payment Details Card -->
              <div style="background: white; padding: 24px; border-radius: 12px; margin: 25px 0; border: 1px solid ${isOverdue ? '#fecaca' : '#bbf7d0'}; box-shadow: 0 2px 8px rgba(${isOverdue ? '220, 38, 38' : '5, 150, 105'}, 0.1);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                  <div>
                    <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px; font-weight: 500;">Payment Amount</p>
                    <p style="font-size: 36px; font-weight: bold; color: ${isOverdue ? '#dc2626' : '#059669'}; margin: 0;">
                      ${loan.currency} ${payment.amount.toLocaleString()}
                    </p>
                  </div>
                  
                  <!-- Status Badge -->
                  <div style="background: ${isOverdue ? '#fee2e2' : '#dcfce7'}; padding: 8px 16px; border-radius: 20px; border: 1px solid ${isOverdue ? '#fecaca' : '#bbf7d0'};">
                    <p style="color: ${isOverdue ? '#dc2626' : '#059669'}; margin: 0; font-weight: 600; font-size: 14px;">
                      ${isOverdue 
                        ? `⚠️ ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''} overdue`
                        : daysUntilDue === 0 
                          ? 'Due Today'
                          : `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`
                      }
                    </p>
                  </div>
                </div>
                
                <!-- Due Date -->
                <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 20px;">
                  <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px; font-weight: 500;">Due Date</p>
                  <p style="color: ${isOverdue ? '#991b1b' : '#166534'}; margin: 0; font-size: 16px; font-weight: 500;">
                    ${dueDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              
              <!-- Lender Message -->
              ${message ? `
                <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid ${isOverdue ? '#dc2626' : '#059669'}; box-shadow: 0 2px 8px rgba(${isOverdue ? '220, 38, 38' : '5, 150, 105'}, 0.1);">
                  <p style="color: #6b7280; margin: 0 0 12px 0; font-size: 14px; font-weight: 500;">
                    Message from <span style="color: ${isOverdue ? '#dc2626' : '#059669'};">${lenderName}</span>:
                  </p>
                  <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
                    <p style="color: #1f2937; margin: 0; font-style: italic; line-height: 1.6;">"${message}"</p>
                  </div>
                </div>
              ` : ''}
              
              <!-- Action Buttons -->
              <div style="display: flex; gap: 15px; margin: 30px 0; flex-wrap: wrap;">
                <a href="${loanLink}" 
                  style="display: inline-block; background: linear-gradient(to right, ${isOverdue ? '#dc2626' : '#059669'}, ${isOverdue ? '#b91c1c' : '#047857'}); 
                          color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                          font-weight: 600; text-align: center; font-size: 16px;
                          box-shadow: 0 4px 12px rgba(${isOverdue ? '220, 38, 38' : '5, 150, 105'}, 0.2); transition: all 0.2s ease;
                          flex: 2; min-width: 250px;"
                  onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(${isOverdue ? '220, 38, 38' : '5, 150, 105'}, 0.3)';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(${isOverdue ? '220, 38, 38' : '5, 150, 105'}, 0.2)';">
                  View Loan & Make Payment →
                </a>
                
                <a href="${APP_URL}/help/payments" 
                  style="display: inline-block; background: white; 
                          color: ${isOverdue ? '#dc2626' : '#059669'}; text-decoration: none; padding: 16px 24px; border-radius: 8px; 
                          font-weight: 600; text-align: center; font-size: 16px; border: 2px solid ${isOverdue ? '#dc2626' : '#059669'};
                          box-shadow: 0 2px 8px rgba(${isOverdue ? '220, 38, 38' : '5, 150, 105'}, 0.1); transition: all 0.2s ease;
                          flex: 1; min-width: 150px;"
                  onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(${isOverdue ? '220, 38, 38' : '5, 150, 105'}, 0.2)';this.style.background='${isOverdue ? '#fef2f2' : '#f0fdf4'}';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(${isOverdue ? '220, 38, 38' : '5, 150, 105'}, 0.1)';this.style.background='white';">
                  Payment Help
                </a>
              </div>
              
              <!-- Important Information -->
              <div style="background: ${isOverdue ? '#fee2e2' : '#dcfce7'}; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid ${isOverdue ? '#fecaca' : '#bbf7d0'};">
                <h4 style="color: ${isOverdue ? '#991b1b' : '#065f46'}; margin: 0 0 10px 0; font-weight: 600; font-size: 16px;">
                  ${isOverdue ? '⚠️ Important:' : '💡 Important:'}
                </h4>
                <ul style="margin: 0; padding-left: 20px; color: ${isOverdue ? '#991b1b' : '#065f46'};">
                  <li style="margin-bottom: 8px; line-height: 1.5; font-size: 14px;">
                    ${isOverdue ? 'Late payments may affect your credit score and future loan eligibility.' : 'Timely payments help maintain good standing with lenders.'}
                  </li>
                  <li style="margin-bottom: 8px; line-height: 1.5; font-size: 14px;">
                    If you've already made this payment, please mark it as paid in your account.
                  </li>
                  <li style="line-height: 1.5; font-size: 14px;">
                    Contact your lender directly if you need to discuss payment arrangements.
                  </li>
                </ul>
              </div>
              
              <!-- Footer -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid ${isOverdue ? '#fecaca' : '#bbf7d0'}; color: ${isOverdue ? '#b91c1c' : '#047857'}; font-size: 14px;">
                <p style="margin: 0 0 10px 0;">Need assistance with payment?</p>
                <p style="margin: 0;">
                  <a href="${APP_URL}/help/payments" style="color: ${isOverdue ? '#dc2626' : '#059669'}; text-decoration: none; font-weight: 500; margin-right: 15px;">
                    Payment FAQ
                  </a>
                  <a href="mailto:support@feyza.com" style="color: ${isOverdue ? '#dc2626' : '#059669'}; text-decoration: none; font-weight: 500;">
                    Contact Support
                  </a>
                </p>
              </div>
            </div>
            
            <!-- Signature -->
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;">Feyza • Secure Payment Processing</p>
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
    log.error('Error sending reminder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
