import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getPaymentReminderEmail } from '@/lib/email';
import { addDays, format, startOfDay, endOfDay } from 'date-fns';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// This endpoint is called by Vercel Cron daily
// It handles:
// 1. Sending payment reminders (3 days before due)
// 2. Sending auto-charge warnings (1 day before)
// 3. Processing automatic payments (on due date)
// 4. Sending reminders to guest borrowers
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();
    const today = startOfDay(new Date());
    const todayStr = format(today, 'yyyy-MM-dd');
    const threeDaysFromNow = endOfDay(addDays(today, 3));
    const oneDayFromNow = addDays(today, 1);
    const oneDayStr = format(oneDayFromNow, 'yyyy-MM-dd');

    // Get payments due in the next 3 days (including loans with guest borrowers)
    const { data: upcomingPayments, error } = await supabase
      .from('payment_schedule')
      .select(`
        *,
        loan:loans!loan_id(
          *,
          borrower:users!borrower_id(*),
          lender:users!lender_id(*),
          business_lender:business_profiles(*, owner:users!user_id(*))
        )
      `)
      .eq('is_paid', false)
      .gte('due_date', today.toISOString())
      .lte('due_date', threeDaysFromNow.toISOString());

    if (error) {
      throw error;
    }

    let remindersSent = 0;
    let guestRemindersSent = 0;
    let autoChargeWarnings = 0;
    let autoPaymentsProcessed = 0;
    const errors: string[] = [];

    for (const payment of upcomingPayments || []) {
      const loan = payment.loan;
      if (!loan || loan.status !== 'active') continue;

      const dueDateStr = format(new Date(payment.due_date), 'yyyy-MM-dd');
      const isDueToday = dueDateStr === todayStr;
      const isDueTomorrow = dueDateStr === oneDayStr;

      // Check if we already sent a reminder for this payment
      if (payment.reminder_sent_at) {
        const lastReminder = new Date(payment.reminder_sent_at);
        const daysSinceReminder = (today.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceReminder < 1) continue; // Don't send more than once per day
      }

      try {
        // Handle registered borrowers
        const borrower = loan.borrower;
        
        if (borrower) {
          // Process auto-payment if due today and auto-payment is enabled
          if (isDueToday && loan.auto_payment_enabled && borrower.paypal_connected) {
            const chargeResult = await processAutoPayment(supabase, payment, loan, cronSecret);
            if (chargeResult.success) {
              autoPaymentsProcessed++;
              continue; // Skip reminders if payment was processed
            } else {
              errors.push(`Auto-payment failed for schedule ${payment.id}: ${chargeResult.error}`);
            }
          }

          // Send auto-charge warning 1 day before
          if (isDueTomorrow && loan.auto_payment_enabled && borrower.paypal_connected) {
            await sendEmail({
              to: borrower.email,
              subject: `Payment auto-charge tomorrow - ${loan.currency} ${payment.amount}`,
              html: getAutoChargeWarningEmail({
                borrowerName: borrower.full_name,
                amount: payment.amount,
                currency: loan.currency,
                dueDate: format(new Date(payment.due_date), 'MMMM d, yyyy'),
                loanId: loan.id,
              }),
            });

            await supabase.from('notifications').insert({
              user_id: borrower.id,
              loan_id: loan.id,
              type: 'reminder',
              title: 'Auto-payment tomorrow',
              message: `Your PayPal will be charged ${loan.currency} ${payment.amount} tomorrow for your loan payment.`,
            });

            autoChargeWarnings++;
            continue;
          }

          // Send regular reminder for payments due within 3 days
          if (borrower.email_reminders !== false) {
            const { subject, html } = getPaymentReminderEmail({
              borrowerName: borrower.full_name,
              amount: payment.amount,
              currency: loan.currency,
              dueDate: format(new Date(payment.due_date), 'MMMM d, yyyy'),
              loanId: loan.id,
            });

            const result = await sendEmail({ to: borrower.email, subject, html });

            if (result.success) {
              await supabase.from('notifications').insert({
                user_id: borrower.id,
                loan_id: loan.id,
                type: 'reminder',
                title: 'Payment reminder',
                message: `Payment of ${loan.currency} ${payment.amount} is due on ${format(new Date(payment.due_date), 'MMM d')}.`,
              });

              // Update reminder sent timestamp
              await supabase
                .from('payment_schedule')
                .update({ reminder_sent_at: new Date().toISOString() })
                .eq('id', payment.id);

              remindersSent++;
            }
          }
        } else if (loan.borrower_invite_email) {
          // Handle guest borrowers (no account, just email)
          const guestEmail = loan.borrower_invite_email;
          const guestName = loan.borrower_invite_email.split('@')[0]; // Use email prefix as name
          
          const { subject, html } = getGuestPaymentReminderEmail({
            borrowerName: guestName,
            amount: payment.amount,
            currency: loan.currency,
            dueDate: format(new Date(payment.due_date), 'MMMM d, yyyy'),
            accessToken: loan.borrower_access_token,
            lenderName: loan.lender?.full_name || loan.business_lender?.business_name || 'Your Lender',
          });

          const result = await sendEmail({ to: guestEmail, subject, html });

          if (result.success) {
            // Update reminder sent timestamp
            await supabase
              .from('payment_schedule')
              .update({ reminder_sent_at: new Date().toISOString() })
              .eq('id', payment.id);

            guestRemindersSent++;
          }
        }
      } catch (err: any) {
        errors.push(`Error processing schedule ${payment.id}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalPayments: upcomingPayments?.length || 0,
      processed: {
        remindersSent,
        guestRemindersSent,
        autoChargeWarnings,
        autoPaymentsProcessed,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Manual reminder from lender
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const body = await request.json();
    const { schedule_id, loan_id, lender_token } = body;

    if (!schedule_id || !loan_id) {
      return NextResponse.json({ error: 'Schedule ID and Loan ID are required' }, { status: 400 });
    }

    // Fetch the loan and schedule
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        *,
        borrower:users!borrower_id(email, full_name),
        lender:users!lender_id(full_name),
        business_lender:business_profiles!business_lender_id(business_name)
      `)
      .eq('id', loan_id)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Get schedule item
    const { data: schedule, error: scheduleError } = await supabase
      .from('payment_schedule')
      .select('*')
      .eq('id', schedule_id)
      .eq('loan_id', loan_id)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (schedule.is_paid) {
      return NextResponse.json({ error: 'Payment already made' }, { status: 400 });
    }

    // Check rate limit (max 3 manual reminders per payment, 1 per day)
    const maxReminders = 3;
    const currentCount = schedule.manual_reminder_count || 0;
    
    if (currentCount >= maxReminders) {
      return NextResponse.json({ 
        error: `Maximum ${maxReminders} manual reminders per payment reached` 
      }, { status: 429 });
    }

    if (schedule.last_manual_reminder_at) {
      const lastReminder = new Date(schedule.last_manual_reminder_at);
      const hoursSinceReminder = (Date.now() - lastReminder.getTime()) / (1000 * 60 * 60);
      if (hoursSinceReminder < 24) {
        return NextResponse.json({ 
          error: 'Please wait 24 hours between manual reminders' 
        }, { status: 429 });
      }
    }

    const lenderName = loan.lender?.full_name || loan.business_lender?.business_name || 'Your Lender';
    let emailSent = false;

    // Send to registered borrower
    if (loan.borrower?.email) {
      const { subject, html } = getPaymentReminderEmail({
        borrowerName: loan.borrower.full_name,
        amount: schedule.amount,
        currency: loan.currency,
        dueDate: format(new Date(schedule.due_date), 'MMMM d, yyyy'),
        loanId: loan.id,
        isManual: true,
        lenderName,
      });

      await sendEmail({ to: loan.borrower.email, subject, html });
      emailSent = true;

      // Create notification
      await supabase.from('notifications').insert({
        user_id: loan.borrower_id,
        loan_id: loan.id,
        type: 'reminder',
        title: 'Payment Reminder from ' + lenderName,
        message: `${lenderName} has sent you a reminder. Payment of ${loan.currency} ${schedule.amount} is due on ${format(new Date(schedule.due_date), 'MMM d')}.`,
      });
    } 
    // Send to guest borrower
    else if (loan.borrower_invite_email) {
      const guestEmail = loan.borrower_invite_email;
      const guestName = guestEmail.split('@')[0];

      const { subject, html } = getGuestPaymentReminderEmail({
        borrowerName: guestName,
        amount: schedule.amount,
        currency: loan.currency,
        dueDate: format(new Date(schedule.due_date), 'MMMM d, yyyy'),
        accessToken: loan.borrower_access_token,
        lenderName,
        isManual: true,
      });

      await sendEmail({ to: guestEmail, subject, html });
      emailSent = true;
    }

    if (!emailSent) {
      return NextResponse.json({ error: 'No borrower email found' }, { status: 400 });
    }

    // Update reminder tracking
    await supabase
      .from('payment_schedule')
      .update({
        last_manual_reminder_at: new Date().toISOString(),
        manual_reminder_count: currentCount + 1,
      })
      .eq('id', schedule_id);

    return NextResponse.json({ 
      success: true, 
      message: 'Reminder sent successfully',
      remainingReminders: maxReminders - currentCount - 1,
    });

  } catch (error) {
    console.error('Manual reminder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Process automatic PayPal payment
async function processAutoPayment(
  supabase: any, 
  payment: any, 
  loan: any,
  cronSecret?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${APP_URL}/api/paypal/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cronSecret ? `Bearer ${cronSecret}` : '',
      },
      body: JSON.stringify({
        scheduleId: payment.id,
        loanId: loan.id,
      }),
    });

    if (response.ok) {
      return { success: true };
    }

    const errorData = await response.json();
    return { success: false, error: errorData.error || 'Unknown error' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Email template for auto-charge warning
function getAutoChargeWarningEmail(params: {
  borrowerName: string;
  amount: number;
  currency: string;
  dueDate: string;
  loanId: string;
}) {
  const { borrowerName, amount, currency, dueDate, loanId } = params;
  
return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>

  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background:#f9fafb;">

    <!-- ===== HEADER ===== -->
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">

      <!-- Logo (email-safe centered) -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding-bottom: 15px;">
            <img
              src="https://feyza.app/feyza.png"
              alt="Feyza Logo"
              height="40"
              style="display:block; height:40px; width:auto; border:0; outline:none; text-decoration:none;"
            />
          </td>
        </tr>
      </table>

      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
        ⚡ Auto-Payment Tomorrow
      </h1>

      <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px;">
        Payment Reminder
      </p>
    </div>

    <!-- ===== CONTENT ===== -->
    <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">

      <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">
        Hi ${borrowerName}! 👋
      </p>

      <p style="color: #166534; margin-bottom: 20px;">
        This is a reminder that your PayPal account will be automatically charged
        <strong style="color:#059669;">tomorrow</strong> for your loan payment.
      </p>

      <!-- Payment details -->
      <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5,150,105,0.1);">

        <div style="margin-bottom: 15px;">
          <span style="color:#065f46; font-weight:500;">Amount:</span>
          <span style="font-weight:bold; font-size:28px; margin-left:10px; color:#059669;">
            ${currency} ${amount.toLocaleString()}
          </span>
        </div>

        <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #ecfdf5;">
          <span style="color:#065f46; font-weight:500;">Charge Date:</span>
          <span style="font-weight:bold; margin-left:10px; color:#065f46;">
            ${dueDate}
          </span>
        </div>

        <div style="font-size:14px; color:#047857;">
          <span style="color:#065f46; font-weight:500;">Payment Method:</span>
          <span style="margin-left:10px;">PayPal</span>
        </div>
      </div>

      <!-- Important notice -->
      <div style="background:#dcfce7; padding:16px 20px; border-radius:8px; margin:25px 0; border:1px solid #86efac;">
        <p style="margin:0 0 6px 0; color:#065f46; font-weight:600;">⚠️ Important</p>
        <p style="margin:0; color:#065f46; font-size:14px;">
          Make sure your PayPal account has sufficient funds. If you need to make changes,
          please do so before the charge date.
        </p>
      </div>

      <!-- CTA -->
      <a
        href="${APP_URL}/loans/${loanId}"
        style="display:block; background:linear-gradient(to right, #059669, #047857);
               color:white; text-decoration:none; padding:16px 32px; border-radius:8px;
               font-weight:600; text-align:center; margin:24px 0; font-size:16px;
               box-shadow:0 4px 12px rgba(5,150,105,0.2);">
        View Loan Details →
      </a>

      <!-- Secondary actions -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
        <tr>
          <td align="center" style="padding-bottom:10px;">
            <a href="${APP_URL}/loans/${loanId}/payments"
               style="display:inline-block; background:white; color:#059669; text-decoration:none;
                      padding:12px 24px; border-radius:8px; font-weight:500;
                      font-size:14px; border:1.5px solid #059669;">
              Payment History
            </a>
          </td>
        </tr>
        <tr>
          <td align="center">
            <a href="${APP_URL}/help/payments"
               style="display:inline-block; background:white; color:#059669; text-decoration:none;
                      padding:12px 24px; border-radius:8px; font-weight:500;
                      font-size:14px; border:1.5px solid #059669;">
              Payment Help
            </a>
          </td>
        </tr>
      </table>

      <!-- Footer -->
      <div style="margin-top:30px; padding-top:20px; border-top:1px solid #bbf7d0; color:#047857; font-size:14px; text-align:center;">
        <p style="margin:0 0 10px 0;">Questions about your payment?</p>
        <p style="margin:0;">
          <a href="${APP_URL}/help/auto-payments" style="color:#059669; text-decoration:none; font-weight:500; margin-right:15px;">
            Auto-Payment Guide
          </a>
          <a href="mailto:support@feyza.com" style="color:#059669; text-decoration:none; font-weight:500;">
            Contact Support
          </a>
        </p>
      </div>
    </div>

    <!-- Signature -->
    <div style="text-align:center; margin-top:20px; color:#6b7280; font-size:12px;">
      <p style="margin:0;">Feyza • Automated Payment System</p>
      <p style="margin:5px 0 0 0; font-size:11px;">
        This is an automated reminder. Please do not reply to this email.
      </p>
    </div>

  </body>
</html>
`;
}

// Email template for guest borrower payment reminder
function getGuestPaymentReminderEmail(params: {
  borrowerName: string;
  amount: number;
  currency: string;
  dueDate: string;
  accessToken: string;
  lenderName: string;
  isManual?: boolean;
}): { subject: string; html: string } {
  const { borrowerName, amount, currency, dueDate, accessToken, lenderName, isManual } = params;
  
const subject = isManual 
  ? `Payment Reminder from ${lenderName}`
  : `Payment Reminder - ${currency} ${amount} due ${dueDate}`;

const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>

  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
               line-height: 1.6; color: #333; max-width: 600px;
               margin: 0 auto; padding: 20px; background:#ffffff;">

    <!-- ===== HEADER ===== -->
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%);
                padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">

      <!-- Logo (email-safe centered) -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding-bottom: 20px;">
            <img
              src="https://feyza.app/feyza.png"
              alt="Feyza Logo"
              height="40"
              style="display:block; height:40px; width:auto;
                     border:0; outline:none; text-decoration:none;"
            />
          </td>
        </tr>
      </table>

      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
        ${isManual ? '💬 Reminder from ' + lenderName : '📅 Payment Reminder'}
      </h1>
    </div>

    <!-- ===== CONTENT ===== -->
    <div style="background: #f0fdf4; padding: 30px;
                border-radius: 0 0 16px 16px;
                border: 1px solid #bbf7d0; border-top: none;">

      <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">
        Hi ${borrowerName}! 👋
      </p>

      ${
        isManual
          ? `<p style="color: #166534;">
               <strong style="color: #059669;">${lenderName}</strong>
               has sent you a friendly reminder about your upcoming payment.
             </p>`
          : `<p style="color: #166534;">
               This is a reminder about your upcoming loan payment to
               <strong style="color: #059669;">${lenderName}</strong>.
             </p>`
      }

      <!-- ===== PAYMENT CARD ===== -->
      <div style="background: white; padding: 24px; border-radius: 12px;
                  margin: 20px 0; border: 1px solid #bbf7d0;
                  box-shadow: 0 2px 8px rgba(5,150,105,0.1);">

        <h3 style="margin: 0 0 15px 0; color: #065f46;
                   font-size: 20px; font-weight: 600;">
          Payment Details
        </h3>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#047857; font-size:14px; padding:8px 0;">Amount Due:</td>
            <td style="font-weight:bold; font-size:28px; color:#059669; padding:8px 0;">
              ${currency} ${amount.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td style="color:#047857; font-size:14px; padding:8px 0;">Due Date:</td>
            <td style="font-weight:bold; font-size:18px; color:#166534; padding:8px 0;">
              ${dueDate}
            </td>
          </tr>
          <tr>
            <td style="color:#047857; font-size:14px; padding:8px 0;">Lender:</td>
            <td style="font-weight:500; font-size:16px; color:#166534; padding:8px 0;">
              ${lenderName}
            </td>
          </tr>
        </table>
      </div>

      <p style="color:#166534; margin-bottom:25px;">
        Click the button below to view your loan details and record your payment.
      </p>

      <!-- ===== CTA ===== -->
      <a href="${APP_URL}/borrower/${accessToken}"
         style="display:block; background: linear-gradient(to right, #059669, #047857);
                color:white; text-decoration:none; padding:16px 32px;
                border-radius:8px; font-weight:600; text-align:center;
                margin:24px 0; font-size:16px;
                box-shadow:0 4px 12px rgba(5,150,105,0.25);">
        View Loan & Make Payment →
      </a>

      <!-- ===== TIP ===== -->
      <div style="background:#dcfce7; padding:20px; border-radius:8px;
                  margin:25px 0; border:1px solid #86efac;">
        <h4 style="color:#065f46; margin:0 0 8px 0;">💡 Payment Tip</h4>
        <p style="color:#065f46; margin:0; font-size:14px;">
          After sending your payment, click
          <strong>"I Made This Payment"</strong>
          in your loan dashboard to notify ${lenderName}.
        </p>
      </div>

      <!-- ===== FOOTER ===== -->
      <div style="margin-top:30px; padding-top:20px;
                  border-top:1px solid #bbf7d0;
                  color:#047857; font-size:14px; text-align:center;">
        <p style="margin-bottom:10px;">Need help with your payment?</p>
        <a href="${APP_URL}/help/payments"
           style="color:#059669; text-decoration:none; font-weight:500; margin-right:15px;">
          Payment Help Center
        </a>
        <a href="mailto:support@feyza.com"
           style="color:#059669; text-decoration:none; font-weight:500;">
          Contact Support
        </a>
      </div>
    </div>

    <!-- ===== SIGNATURE ===== -->
    <div style="text-align:center; margin-top:20px;
                color:#6b7280; font-size:12px;">
      Feyza • Simple loan tracking for everyone
    </div>

  </body>
</html>
`;

  
  return { subject, html };
}
