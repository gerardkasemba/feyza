import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const RESTRICTION_DAYS = 90;

/**
 * Check Debt Clearance API
 * 
 * Called after a payment is made by a blocked borrower.
 * If all outstanding debt is cleared, starts the 90-day restriction period.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const serviceSupabase = await createServiceRoleClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { loan_id } = body;

    if (!loan_id) {
      return NextResponse.json({ error: 'loan_id is required' }, { status: 400 });
    }

    // Get the loan and borrower info
    const { data: loan, error: loanError } = await serviceSupabase
      .from('loans')
      .select('id, borrower_id, currency')
      .eq('id', loan_id)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Get borrower info
    const { data: borrower, error: borrowerError } = await serviceSupabase
      .from('users')
      .select('id, email, full_name, is_blocked, blocked_at')
      .eq('id', loan.borrower_id)
      .single();

    if (borrowerError || !borrower) {
      return NextResponse.json({ error: 'Borrower not found' }, { status: 404 });
    }

    // If borrower is not blocked, nothing to do
    if (!borrower.is_blocked) {
      return NextResponse.json({ 
        success: true, 
        message: 'Borrower is not blocked',
        is_blocked: false,
      });
    }

    // Check if borrower has any outstanding debt across ALL loans
    const { data: outstandingPayments, error: paymentsError } = await serviceSupabase
      .from('payment_schedule')
      .select('id, amount, loan_id')
      .eq('loan_id', loan_id)
      .in('status', ['pending', 'overdue', 'failed', 'defaulted']);

    if (paymentsError) {
      console.error('[DebtClearance] Error fetching payments:', paymentsError);
      return NextResponse.json({ error: 'Failed to check payments' }, { status: 500 });
    }

    const totalOutstanding = outstandingPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    console.log(`[DebtClearance] Borrower ${borrower.id} has ${loan.currency} ${totalOutstanding} outstanding`);

    if (totalOutstanding > 0) {
      // Still has debt
      return NextResponse.json({
        success: true,
        message: 'Borrower still has outstanding debt',
        is_blocked: true,
        outstanding_amount: totalOutstanding,
        currency: loan.currency,
      });
    }

    // ============================================
    // DEBT IS CLEARED - START 90-DAY RESTRICTION
    // ============================================
    
    const now = new Date();
    const restrictionEndsAt = new Date(now.getTime() + RESTRICTION_DAYS * 24 * 60 * 60 * 1000);

    console.log(`[DebtClearance] Debt cleared for borrower ${borrower.id}. Starting 90-day restriction.`);

    // Update borrower - still blocked but with restriction end date
    await serviceSupabase
      .from('users')
      .update({
        debt_cleared_at: now.toISOString(),
        restriction_ends_at: restrictionEndsAt.toISOString(),
        // Keep is_blocked = true until restriction ends
      })
      .eq('id', borrower.id);

    // Update the borrower_blocks record
    await serviceSupabase
      .from('borrower_blocks')
      .update({
        debt_cleared_at: now.toISOString(),
        restriction_ends_at: restrictionEndsAt.toISOString(),
        status: 'debt_cleared',
      })
      .eq('user_id', borrower.id)
      .eq('status', 'active');

    // Create notification
    await serviceSupabase.from('notifications').insert({
      user_id: borrower.id,
      type: 'debt_cleared',
      title: '✅ Debt Cleared - 90-Day Restriction Started',
      message: `Your outstanding debt has been cleared. You will be able to request loans again after ${restrictionEndsAt.toLocaleDateString()}.`,
    });

    // Send email
    if (borrower.email) {
      await sendEmail({
        to: borrower.email,
        subject: '✅ Your Debt Has Been Cleared - What Happens Next',
        html: getDebtClearedEmail(borrower.full_name, restrictionEndsAt),
      });
    }

    // Notify lender that debt is cleared
    const { data: loanWithLender } = await serviceSupabase
      .from('loans')
      .select('lender_id, business_lender_id')
      .eq('id', loan_id)
      .single();

    if (loanWithLender) {
      let lenderId = loanWithLender.lender_id;
      
      if (loanWithLender.business_lender_id) {
        const { data: business } = await serviceSupabase
          .from('business_profiles')
          .select('user_id')
          .eq('id', loanWithLender.business_lender_id)
          .single();
        lenderId = business?.user_id;
      }

      if (lenderId) {
        await serviceSupabase.from('notifications').insert({
          user_id: lenderId,
          loan_id: loan_id,
          type: 'debt_cleared_by_borrower',
          title: '✅ Borrower Debt Cleared',
          message: `${borrower.full_name} has cleared their outstanding debt on their loan.`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Debt cleared, 90-day restriction started',
      is_blocked: true, // Still blocked during restriction
      restriction_ends_at: restrictionEndsAt.toISOString(),
      restriction_days_remaining: RESTRICTION_DAYS,
    });

  } catch (error) {
    console.error('[DebtClearance] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getDebtClearedEmail(name: string, restrictionEndsAt: Date): string {
  const formattedDate = restrictionEndsAt.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:40px 20px;">
          <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <tr><td style="background:linear-gradient(135deg,#059669,#047857);padding:30px;text-align:center;">
              <h1 style="margin:0;color:white;font-size:24px;">✅ Debt Cleared!</h1>
            </td></tr>
            <tr><td style="padding:30px;">
              <p style="font-size:16px;color:#374151;">Hi ${name},</p>
              <p style="font-size:16px;color:#374151;">Thank you for clearing your outstanding debt. This is an important step in restoring your account.</p>
              
              <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:20px;margin:20px 0;">
                <h3 style="margin:0 0 10px;color:#92400e;">What happens now?</h3>
                <p style="margin:0;font-size:14px;color:#92400e;">
                  As part of our commitment to responsible lending, there is a <strong>90-day restriction period</strong> before you can request new loans. This helps ensure healthy borrowing habits.
                </p>
              </div>
              
              <div style="background:#f3f4f6;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
                <p style="margin:0 0 5px;font-size:14px;color:#6b7280;">Your restriction ends on:</p>
                <p style="margin:0;font-size:24px;font-weight:bold;color:#374151;">${formattedDate}</p>
              </div>
              
              <h3 style="color:#374151;margin:20px 0 10px;">After the restriction period:</h3>
              <ul style="color:#374151;font-size:14px;line-height:1.8;">
                <li>Your account will be unblocked automatically</li>
                <li>You'll start as a "Starter" (Neutral) borrower</li>
                <li>You can build your rating back up with on-time payments</li>
              </ul>
              
              <p style="font-size:16px;color:#374151;">We'll send you an email when your restriction period ends and you can request loans again.</p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center" style="padding:20px 0;">
                  <a href="${APP_URL}/dashboard" style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">View Dashboard</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}
