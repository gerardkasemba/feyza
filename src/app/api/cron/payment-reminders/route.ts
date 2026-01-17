import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { format, addDays } from 'date-fns';

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
          subject: `⏰ Payment Reminder - $${payment.amount.toFixed(2)} due in 3 days`,
          html: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #10b981; font-size: 28px; margin: 0;">Feyza</h1>
                  </div>
                  
                  <div style="background: white; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0;">
                    <div style="text-align: center; margin-bottom: 20px;">
                      <div style="width: 60px; height: 60px; background: #dbeafe; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="font-size: 28px;">⏰</span>
                      </div>
                    </div>
                    
                    <h2 style="color: #1e40af; text-align: center; margin-bottom: 20px;">Payment Reminder</h2>
                    
                    <p style="font-size: 16px; color: #374151;">Hi ${borrowerName},</p>
                    
                    <p style="color: #374151;">
                      This is a friendly reminder that you have a loan payment coming up in <strong>3 days</strong>.
                    </p>
                    
                    <div style="background: #dbeafe; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
                      <p style="color: #1e40af; margin: 0; font-size: 28px; font-weight: bold;">
                        $${payment.amount.toFixed(2)}
                      </p>
                      <p style="color: #3b82f6; margin: 8px 0 0 0; font-size: 14px;">
                        Due ${format(new Date(payment.due_date), 'EEEE, MMMM d, yyyy')}
                      </p>
                    </div>
                    
                    <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                      <p style="color: #374151; margin: 0; font-size: 14px;">
                        <strong>Payment ${paymentNumber} of ${totalPayments}</strong><br>
                        Loan from: ${lenderName}
                      </p>
                    </div>
                    
                    ${loan.borrower_bank_connected ? `
                      <div style="background: #d1fae5; padding: 16px; border-radius: 8px; margin: 20px 0;">
                        <p style="color: #065f46; margin: 0; font-size: 14px;">
                          ✅ <strong>Auto-Pay Enabled</strong> - This payment will be automatically deducted from your bank account on the due date. No action needed!
                        </p>
                      </div>
                    ` : `
                      <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0;">
                        <p style="color: #92400e; margin: 0; font-size: 14px;">
                          ⚠️ Please ensure you have sufficient funds in your connected bank account.
                        </p>
                      </div>
                    `}
                    
                    <a href="${APP_URL}/borrower/${loan.borrower_access_token}" style="display: block; background: #10b981; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-align: center; margin-top: 24px;">
                      View Loan Details →
                    </a>
                    
                    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
                      Questions? Reply to this email or contact your lender directly.
                    </p>
                  </div>
                </div>
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
      subject: `⏰ Payment Reminder (Test) - $${payment.amount.toFixed(2)}`,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: white; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0;">
                <h2 style="color: #1e40af; text-align: center;">⏰ Payment Reminder (Test)</h2>
                <p>Hi ${borrowerName},</p>
                <p>Your payment of <strong>$${payment.amount.toFixed(2)}</strong> is due on ${format(new Date(payment.due_date), 'MMMM d, yyyy')}.</p>
                <p>Loan from: ${lenderName}</p>
                ${loan.borrower_bank_connected 
                  ? '<p style="color: green;">✅ Auto-Pay is enabled - no action needed!</p>'
                  : '<p style="color: orange;">⚠️ Please ensure you have sufficient funds.</p>'
                }
              </div>
            </div>
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
