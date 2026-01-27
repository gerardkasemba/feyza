import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getPaymentReminderEmail } from '@/lib/email';
import { format, addDays } from 'date-fns';

// Next.js 16 route configuration for cron jobs
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for cron execution

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// This endpoint should be called by a cron job daily
// Vercel Cron: Add to vercel.json: { "crons": [{ "path": "/api/cron/payment-reminders", "schedule": "0 9 * * *" }] }

export async function GET(request: NextRequest) {
  // Verify cron secret in production
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceRoleClient();
    
    // Get date 3 days from now
    const reminderDate = addDays(new Date(), 3).toISOString().split('T')[0];
    
    console.log(`[Payment Reminders] Checking for payments due on ${reminderDate}`);

    // Find all unpaid payments due in 3 days
    const { data: upcomingPayments, error: fetchError } = await supabase
      .from('payment_schedule')
      .select(`
        *,
        loan:loans(*)
      `)
      .eq('is_paid', false)
      .eq('due_date', reminderDate);

    if (fetchError) {
      console.error('[Payment Reminders] Error fetching payments:', fetchError);
      throw fetchError;
    }

    if (!upcomingPayments || upcomingPayments.length === 0) {
      console.log('[Payment Reminders] No payments due in 3 days');
      return NextResponse.json({ 
        success: true, 
        message: 'No reminders to send',
        sent: 0 
      });
    }

    console.log(`[Payment Reminders] Found ${upcomingPayments.length} upcoming payments`);

    let sentCount = 0;
    let errorCount = 0;

    for (const payment of upcomingPayments) {
      try {
        const loan = payment.loan;

        // Skip if loan is not active
        if (loan?.status !== 'active') {
          console.log(`[Payment Reminders] Skipping payment ${payment.id} - loan not active`);
          continue;
        }

        // Get borrower email from loan_requests if not on loan
        let borrowerEmail = loan.borrower_invite_email;
        
        if (!borrowerEmail) {
          const { data: loanRequest } = await supabase
            .from('loan_requests')
            .select('borrower_email')
            .eq('loan_id', loan.id)
            .single();
          
          borrowerEmail = loanRequest?.borrower_email;
        }

        if (!borrowerEmail) {
          console.log(`[Payment Reminders] No borrower email for loan ${loan.id}`);
          continue;
        }

        const borrowerName = loan.borrower_name || 'there';
        const lenderName = loan.lender_name || 'Your Lender';
        const paymentNumber = await getPaymentNumber(supabase, loan.id, payment.id);
        const totalPayments = loan.total_installments || '?';

        // Send reminder email to borrower
        await sendEmail({
          to: borrowerEmail,
          subject: `Payment Reminder - $${payment.amount.toFixed(2)} due in 3 days`,
          html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Payment Reminder</title>
        </head>

        <body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding:40px 20px;">

                <!-- Container -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%;">

                  <!-- Header / Logo -->
                  <tr>
                    <td align="center" style="padding-bottom:30px;">
                      <img
                        src="https://feyza.app/feyza.png"
                        alt="Feyza"
                        height="48"
                        style="display:block; height:48px; width:auto; border:0; outline:none; text-decoration:none;"
                      />
                    </td>
                  </tr>

                  <!-- Card -->
                  <tr>
                    <td style="background:#ffffff; border-radius:16px; border:1px solid #e5e7eb; padding:30px;">

                      <!-- Icon -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="padding-bottom:20px;">
                            <div style="width:60px; height:60px; background:#ecfdf5; border-radius:50%; line-height:60px; text-align:center; font-size:28px;">
                              ⏰
                            </div>
                          </td>
                        </tr>
                      </table>

                      <!-- Title -->
                      <h2 style="margin:0 0 20px 0; text-align:center; color:#065f46; font-size:22px;">
                        Payment Reminder
                      </h2>

                      <!-- Greeting -->
                      <p style="font-size:16px; color:#374151; margin-bottom:12px;">
                        Hi ${borrowerName},
                      </p>

                      <p style="font-size:16px; color:#374151; margin-bottom:20px;">
                        This is a friendly reminder that you have a loan payment coming up in
                        <strong>3 days</strong>.
                      </p>

                      <!-- Amount Box -->
                      <div style="background:#ecfdf5; padding:20px; border-radius:12px; text-align:center; margin-bottom:20px;">
                        <p style="margin:0; font-size:28px; font-weight:bold; color:#047857;">
                          $${payment.amount.toFixed(2)}
                        </p>
                        <p style="margin-top:8px; font-size:14px; color:#059669;">
                          Due ${format(new Date(payment.due_date), 'EEEE, MMMM d, yyyy')}
                        </p>
                      </div>

                      <!-- Payment Info -->
                      <div style="background:#f9fafb; padding:16px; border-radius:8px; margin-bottom:20px;">
                        <p style="margin:0; font-size:14px; color:#374151;">
                          <strong>Payment ${paymentNumber} of ${totalPayments}</strong><br/>
                          Loan from: ${lenderName}
                        </p>
                      </div>

                      <!-- Auto Pay / Warning -->
                      ${
                        loan.borrower_bank_connected
                          ? `
                        <div style="background:#d1fae5; padding:16px; border-radius:8px; margin-bottom:20px;">
                          <p style="margin:0; font-size:14px; color:#065f46;">
                            ✅ <strong>Auto-Pay Enabled</strong><br/>
                            This payment will be automatically deducted on the due date.
                          </p>
                        </div>
                      `
                          : `
                        <div style="background:#fef3c7; padding:16px; border-radius:8px; margin-bottom:20px;">
                          <p style="margin:0; font-size:14px; color:#92400e;">
                            ⚠️ Please ensure you have sufficient funds in your connected bank account.
                          </p>
                        </div>
                      `
                      }

                      <!-- CTA -->
                      <a
                        href="${APP_URL}/borrower/${loan.borrower_access_token}"
                        style="
                          display:block;
                          background:#059669;
                          color:#ffffff;
                          text-decoration:none;
                          padding:14px 28px;
                          border-radius:8px;
                          font-weight:600;
                          text-align:center;
                          margin-top:24px;
                        "
                      >
                        View Loan Details →
                      </a>

                      <!-- Footer Note -->
                      <p style="margin-top:24px; font-size:12px; color:#9ca3af; text-align:center;">
                        Questions? Reply to this email or contact your lender directly.
                      </p>

                    </td>
                  </tr>

                  <!-- Bottom Footer -->
                  <tr>
                    <td align="center" style="padding-top:20px; font-size:12px; color:#9ca3af;">
                      © ${new Date().getFullYear()} Feyza
                    </td>
                  </tr>

                </table>

              </td>
            </tr>
          </table>
        </body>
        </html>
          `,
        });

        console.log(`[Payment Reminders] Sent reminder to ${borrowerEmail} for payment ${payment.id}`);
        sentCount++;

      } catch (err: any) {
        console.error(`[Payment Reminders] Error sending reminder for payment ${payment.id}:`, err);
        errorCount++;
      }
    }

    console.log(`[Payment Reminders] Complete. Sent: ${sentCount}, Errors: ${errorCount}`);

    return NextResponse.json({
      success: true,
      date: reminderDate,
      sent: sentCount,
      errors: errorCount,
    });

  } catch (error: any) {
    console.error('[Payment Reminders] Fatal error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment reminders failed' },
      { status: 500 }
    );
  }
}

// Helper function to get payment number
async function getPaymentNumber(supabase: any, loanId: string, paymentId: string): Promise<number> {
  const { data: allPayments } = await supabase
    .from('payment_schedule')
    .select('id')
    .eq('loan_id', loanId)
    .order('due_date', { ascending: true });
  
  if (!allPayments) return 1;
  
  const index = allPayments.findIndex((p: any) => p.id === paymentId);
  return index >= 0 ? index + 1 : 1;
}

// POST endpoint for manual testing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loan_id } = body;

    if (!loan_id) {
      return NextResponse.json({ error: 'loan_id required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Get next unpaid payment for this loan
    const { data: payment } = await supabase
      .from('payment_schedule')
      .select(`*, loan:loans(*)`)
      .eq('loan_id', loan_id)
      .eq('is_paid', false)
      .order('due_date', { ascending: true })
      .limit(1)
      .single();

    if (!payment) {
      return NextResponse.json({ error: 'No unpaid payments found' }, { status: 404 });
    }

    const loan = payment.loan;
    let borrowerEmail = loan.borrower_invite_email;

    if (!borrowerEmail) {
      const { data: loanRequest } = await supabase
        .from('loan_requests')
        .select('borrower_email')
        .eq('loan_id', loan_id)
        .single();
      borrowerEmail = loanRequest?.borrower_email;
    }

    if (!borrowerEmail) {
      return NextResponse.json({ error: 'No borrower email found' }, { status: 400 });
    }

    const borrowerName = loan.borrower_name || 'there';
    const lenderName = loan.lender_name || 'Your Lender';

    await sendEmail({
      to: borrowerEmail,
      subject: `Payment Reminder - $${payment.amount.toFixed(2)}`,
      html: `
    <!DOCTYPE html>
    <html lang="en">
      <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;padding:40px 0;">
          <tr>
            <td align="center">

              <!-- Card -->
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
                
                <!-- Header -->
                <tr>
                  <td align="center" style="padding:30px 20px 20px;border-bottom:1px solid #bbf7d0;background:#f0fdf4;">
                    <img
                      src="https://feyza.app/feyza.png"
                      alt="Feyza Logo"
                      height="40"
                      style="display:block;height:40px;width:auto;border:0;outline:none;text-decoration:none;margin-bottom:15px;"
                    />
                    <h2 style="margin:0;color:#065f46;font-size:22px;font-weight:600;">
                      ⏰ Payment Reminder
                    </h2>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:30px 30px 10px;color:#334155;font-size:16px;line-height:1.6;">
                    <p style="margin:0 0 15px;">Hi <strong>${borrowerName}</strong>,</p>

                    <p style="margin:0 0 15px;">
                      This is a friendly reminder that your payment of
                      <strong>$${payment.amount.toFixed(2)}</strong>
                      is due on
                      <strong>${format(new Date(payment.due_date), 'MMMM d, yyyy')}</strong>.
                    </p>

                    <p style="margin:0 0 15px;">
                      Loan from: <strong>${lenderName}</strong>
                    </p>

                    ${
                      loan.borrower_bank_connected
                        ? `
                        <div style="margin-top:20px;padding:15px;border-radius:10px;background:#ecfdf5;border:1px solid #bbf7d0;color:#065f46;">
                          ✅ <strong>Auto-Pay is enabled</strong><br />
                          No action is needed on your part.
                        </div>
                      `
                        : `
                        <div style="margin-top:20px;padding:15px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;">
                          ⚠️ <strong>Manual payment required</strong><br />
                          Please ensure you have sufficient funds available.
                        </div>
                      `
                    }
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" style="padding:20px 30px 30px;border-top:1px solid #e5e7eb;color:#64748b;font-size:13px;">
                    <p style="margin:0 0 6px;">
                      This is an automated reminder from Feyza.
                    </p>
                    <p style="margin:0;">
                      If you have questions, contact support at
                      <a href="mailto:support@feyza.com" style="color:#059669;text-decoration:none;font-weight:500;">
                        support@feyza.com
                      </a>
                    </p>
                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>

      </body>
    </html>
      `,
    });

    return NextResponse.json({
      success: true,
      sent_to: borrowerEmail,
      payment_id: payment.id,
      amount: payment.amount,
      due_date: payment.due_date,
    });

  } catch (error: any) {
    console.error('Manual reminder error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send reminder' },
      { status: 500 }
    );
  }
}
