import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getLoanCancelledEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

const log = logger('loans-id-cancel');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { reason } = body;

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*, borrower:users!borrower_id(*), lender:users!lender_id(*)')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Allow cancellation as long as no money has moved:
    // pending / pending_funds = lender not yet involved
    // active + !funds_sent   = lender accepted but hasn't sent payment yet
    const moneyMoved = loan.status === 'active' && loan.funds_sent;
    const notCancellable = !['pending', 'pending_funds', 'active'].includes(loan.status) || moneyMoved;
    if (notCancellable) {
      return NextResponse.json({ error: 'Cannot cancel after funds have been sent' }, { status: 400 });
    }

    // Verify user is the borrower
    if (loan.borrower_id !== user.id) {
      return NextResponse.json({ error: 'Only the borrower can cancel this loan' }, { status: 403 });
    }

    // Update loan status
    const { error: updateError } = await supabase
      .from('loans')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_reason: reason || 'Cancelled by borrower',
        updated_at: new Date().toISOString(),
        // Keep existing values - don't modify financial fields
        // uses_apr_calculation: loan.uses_apr_calculation, // Not needed, but safe to include
      })
      .eq('id', loanId);

    if (updateError) {
      log.error('Error cancelling loan:', updateError);
      return NextResponse.json({ error: 'Failed to cancel loan' }, { status: 500 });
    }

    // Release reserved capital if this was a matched loan
    if (loan.business_lender_id || loan.lender_id) {
      try {
        const serviceSupabase = await createServiceRoleClient();
        
        // Determine which lender preference to update
        const lenderFilter = loan.business_lender_id 
          ? `business_id.eq.${loan.business_lender_id}`
          : `user_id.eq.${loan.lender_id}`;
        
        // Get the lender preference record
        const { data: lenderPref } = await serviceSupabase
          .from('lender_preferences')
          .select('id, capital_reserved')
          .or(lenderFilter)
          .maybeSingle(); // Use maybeSingle instead of single to avoid errors when not found

        if (lenderPref) {
          // Release the reserved capital
          const newReserved = Math.max(0, (lenderPref.capital_reserved || 0) - loan.amount);
          
          await serviceSupabase
            .from('lender_preferences')
            .update({ capital_reserved: newReserved })
            .eq('id', lenderPref.id);

          log.info(`[Cancel] Released ${loan.amount} capital from lender preference ${lenderPref.id}. New reserved: ${newReserved}`);
        } else {
          log.info(`[Cancel] No lender preference found for filter: ${lenderFilter}`);
        }
      } catch (releaseError) {
        log.error('[Cancel] Error releasing capital:', releaseError);
        // Don't fail the cancellation if capital release fails
      }
    }

    // Notify lender if there is one
    if (loan.lender_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: loan.lender_id,
          loan_id: loanId,
          type: 'loan_cancelled',
          title: 'Loan Request Cancelled',
          message: `${loan.borrower?.full_name || 'The borrower'} has cancelled their loan request for ${loan.currency} ${loan.amount}.`,
        });
      } catch (notifError) {
        log.error('Error creating notification:', notifError);
      }
    }

    // Send email to invited lender (personal loan)
    if (loan.invite_email) {
      try {
        await sendEmail({
          to: loan.invite_email,
          subject: 'Loan Request Cancelled',
          html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background:#f9fafb;">

              <!-- ===== HEADER ===== -->
              <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">

                <!-- Logo (email-safe centered) -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom: 20px;">
                      <img
                        src="https://feyza.app/feyza.png"
                        alt="Feyza Logo"
                        height="40"
                        style="display:block; height:40px; width:auto; border:0; outline:none; text-decoration:none;"
                      />
                    </td>
                  </tr>
                </table>

                <h1 style="color:white; margin:0; font-size:24px; font-weight:600;">
                  ❌ Loan Request Cancelled
                </h1>
                <p style="color:rgba(255,255,255,0.9); margin:10px 0 0 0; font-size:16px;">
                  Request Update
                </p>
              </div>

              <!-- ===== CONTENT ===== -->
              <div style="background:#f0fdf4; padding:30px; border-radius:0 0 16px 16px; border:1px solid #bbf7d0; border-top:none;">

                <p style="font-size:18px; color:#166534; margin-bottom:20px;">
                  Hi there,
                </p>

                <!-- Cancellation Notice -->
                <div style="background:white; padding:24px; border-radius:12px; margin:20px 0; border:1px solid #bbf7d0; box-shadow:0 2px 8px rgba(5,150,105,0.1);">
                  <h3 style="margin:0 0 15px 0; color:#065f46; font-size:20px; font-weight:600;">
                    Loan Request Update
                  </h3>

                  <div style="background:#fef2f2; padding:16px; border-radius:8px; border:1px solid #fecaca; margin-bottom:20px;">
                    <p style="margin:0; color:#991b1b; font-weight:500;">
                      ⚠️ This loan request has been cancelled by the borrower.
                    </p>
                  </div>

                  <!-- Details -->
                  <div style="background:#f8fafc; padding:20px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:20px;">
                    <h4 style="margin:0 0 12px 0; color:#475569; font-weight:600;">
                      Request Details:
                    </h4>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px; color:#64748b;">
                      <tr>
                        <td style="padding:4px 0; font-weight:500;">Borrower:</td>
                        <td style="padding:4px 0; color:#334155;">${loan.borrower?.full_name || 'Not specified'}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0; font-weight:500;">Amount:</td>
                        <td style="padding:4px 0; color:#059669; font-weight:600;">
                          ${loan.currency} ${loan.amount.toLocaleString()}
                        </td>
                      </tr>

                      ${loan.loan_term ? `
                      <tr>
                        <td style="padding:4px 0; font-weight:500;">Term:</td>
                        <td style="padding:4px 0; color:#334155;">${loan.loan_term} days</td>
                      </tr>` : ''}

                      ${loan.purpose ? `
                      <tr>
                        <td style="padding:4px 0; font-weight:500;">Purpose:</td>
                        <td style="padding:4px 0; color:#334155;">${loan.purpose}</td>
                      </tr>` : ''}
                    </table>
                  </div>

                  ${reason ? `
                  <div style="background:#f8fafc; padding:20px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:20px;">
                    <h4 style="margin:0 0 12px 0; color:#475569; font-weight:600;">
                      Cancellation Reason:
                    </h4>
                    <p style="margin:0; color:#64748b; line-height:1.6; font-style:italic;">
                      "${reason}"
                    </p>
                  </div>` : ''}

                  <!-- Status -->
                  <div style="background:#f0fdf4; padding:16px; border-radius:8px; border:1px solid #86efac;">
                    <p style="margin:0; color:#065f46; font-weight:500;">
                      ✓ No further action is required from you.
                    </p>
                    <p style="margin:8px 0 0 0; color:#047857; font-size:14px;">
                      This loan request has been removed from your dashboard.
                    </p>
                  </div>
                </div>

                <!-- Actions -->
                <div style="background:white; padding:24px; border-radius:12px; margin:20px 0; border:1px solid #bbf7d0; box-shadow:0 2px 8px rgba(5,150,105,0.1);">
                  <h3 style="margin:0 0 15px 0; color:#065f46; font-size:20px; font-weight:600;">
                    Continue Lending
                  </h3>
                  <p style="color:#166534; line-height:1.6; margin-bottom:20px;">
                    Other borrowers are actively seeking funding. Explore new opportunities to grow your portfolio.
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding-bottom:12px;">
                        <a href="${APP_URL}/lend"
                          style="display:inline-block; background:linear-gradient(to right,#059669,#047857);
                                  color:white; text-decoration:none; padding:14px 28px; border-radius:8px;
                                  font-weight:600; font-size:16px;">
                          Browse New Opportunities →
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td align="center">
                        <a href="${APP_URL}/dashboard"
                          style="display:inline-block; background:white; color:#059669;
                                  text-decoration:none; padding:14px 28px; border-radius:8px;
                                  font-weight:600; font-size:16px; border:2px solid #059669;">
                          View Dashboard
                        </a>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- Footer -->
                <div style="margin-top:30px; padding-top:20px; border-top:1px solid #bbf7d0; color:#047857; font-size:14px;">
                  <p style="margin:0 0 10px 0;">Questions about this cancellation?</p>
                  <p style="margin:0;">
                    <a href="${APP_URL}/help/loan-cancellations" style="color:#059669; text-decoration:none; font-weight:500; margin-right:15px;">
                      Help Center
                    </a>
                    <a href="mailto:support@feyza.com" style="color:#059669; text-decoration:none; font-weight:500;">
                      Contact Support
                    </a>
                  </p>
                </div>
              </div>

              <!-- Signature -->
              <div style="text-align:center; margin-top:20px; color:#6b7280; font-size:12px;">
                <p style="margin:0;">Feyza • Professional Loan Marketplace</p>
                <p style="margin:5px 0 0 0; font-size:11px;">
                  This is an automated notification. Please do not reply to this email.
                </p>
              </div>

            </body>
          </html>
          `,
        });
      } catch (emailError) {
        log.error('Error sending cancellation email:', emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Error cancelling loan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
