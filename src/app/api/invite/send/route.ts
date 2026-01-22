import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendEmail, getLoanInviteEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      loanId, 
      inviteToken, 
      email, 
      phone, 
      borrowerName, 
      amount, 
      currency, 
      purpose,
      lenderType,
      businessId 
    } = body;

    console.log('Invite send request:', { lenderType, email, businessId, borrowerName });

    // Personal loan - send invite email to friend/family
    if (lenderType === 'personal' && email) {
      try {
        const { subject, html } = getLoanInviteEmail({
          borrowerName: borrowerName || 'Someone',
          amount: amount || 0,
          currency: currency || 'USD',
          inviteToken: inviteToken || '',
          purpose,
        });

        const result = await sendEmail({
          to: email,
          subject,
          html,
        });

        if (!result.success) {
          console.error('Failed to send invite email:', result.error);
        } else {
          console.log('Invite email sent successfully to:', email);
        }
      } catch (emailError) {
        console.error('Email send error:', emailError);
      }
    }

    // Business loan - notify the business owner
    if (lenderType === 'business' && businessId) {
      try {
        const supabase = await createServerSupabaseClient();
        
        // Get the business profile with owner info
        const { data: business, error: bizError } = await supabase
          .from('business_profiles')
          .select('*, owner:users!user_id(*)')
          .eq('id', businessId)
          .single();

        if (bizError) {
          console.error('Error fetching business:', bizError);
        }

        if (business?.owner?.email) {
          const emailContent = getBusinessLoanRequestEmail({
            businessName: business.business_name,
            borrowerName: borrowerName || 'A user',
            amount: amount || 0,
            currency: currency || 'USD',
            purpose,
            loanId: loanId || '',
          });

          const result = await sendEmail({
            to: business.owner.email,
            subject: emailContent.subject,
            html: emailContent.html,
          });

          if (!result.success) {
            console.error('Failed to send business notification email:', result.error);
          } else {
            console.log('Business loan request email sent to:', business.owner.email);
          }
        } else {
          console.log('No business owner email found for business:', businessId);
        }
      } catch (bizError) {
        console.error('Business email error:', bizError);
      }
    }

    if (phone) {
      console.log('SMS invite requested for:', phone, '- SMS not yet implemented');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in invite send:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getBusinessLoanRequestEmail(params: {
  businessName: string;
  borrowerName: string;
  amount: number;
  currency: string;
  purpose?: string;
  loanId: string;
}) {
  const { businessName, borrowerName, amount, currency, purpose, loanId } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const loanUrl = `${APP_URL}/business`;

return {
  subject: `New loan request from ${borrowerName}`,
  html: `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>

    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;background:#ffffff;">
      
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:20px;">
            
            <!-- ===== CONTAINER ===== -->
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

              <!-- ===== HEADER ===== -->
              <tr>
                <td style="background:linear-gradient(135deg,#059669 0%,#047857 100%);padding:30px;border-radius:16px 16px 0 0;text-align:center;">
                  
                  <!-- Logo -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding-bottom:15px;">
                        <img
                          src="https://feyza.app/feyza.png"
                          alt="Feyza Logo"
                          height="40"
                          style="display:block;height:40px;width:auto;border:0;outline:none;text-decoration:none;"
                        />
                      </td>
                    </tr>
                  </table>

                  <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:600;">
                    📋 New Loan Request
                  </h1>
                  <p style="margin:8px 0 0 0;color:rgba(255,255,255,0.9);font-size:16px;">
                    Ready for your review
                  </p>
                </td>
              </tr>

              <!-- ===== MAIN CONTENT ===== -->
              <tr>
                <td style="background:#f0fdf4;padding:30px;border-radius:0 0 16px 16px;border:1px solid #bbf7d0;border-top:none;">
                  
                  <p style="font-size:18px;color:#166534;margin-bottom:20px;">
                    Hi ${businessName} team! 👋
                  </p>

                  <p style="color:#166534;margin-bottom:20px;">
                    You have a new loan request from
                    <strong style="color:#059669;">${borrowerName}</strong>:
                  </p>

                  <!-- ===== REQUEST DETAILS ===== -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                    style="background:#ffffff;border-radius:12px;border:1px solid #bbf7d0;box-shadow:0 2px 8px rgba(5,150,105,0.1);margin:20px 0;">
                    <tr>
                      <td style="padding:24px;">
                        <h3 style="margin:0 0 20px 0;color:#065f46;font-size:18px;font-weight:600;">
                          Request Details
                        </h3>

                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="color:#047857;font-size:14px;font-weight:500;">
                              Requested Amount:
                            </td>
                            <td align="right" style="font-weight:bold;font-size:28px;color:#059669;">
                              ${currency} ${amount.toLocaleString()}
                            </td>
                          </tr>
                        </table>

                        ${purpose ? `
                        <div style="border-top:1px solid #bbf7d0;padding-top:15px;margin-top:15px;">
                          <p style="margin:0 0 8px 0;color:#047857;font-size:14px;font-weight:500;">
                            Purpose:
                          </p>
                          <div style="background:#f0fdf4;padding:12px;border-radius:8px;border-left:4px solid #059669;">
                            <p style="margin:0;color:#166534;line-height:1.5;">
                              ${purpose}
                            </p>
                          </div>
                        </div>
                        ` : ``}
                      </td>
                    </tr>
                  </table>

                  <!-- ===== ACTIONS ===== -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                    style="background:#ffffff;border-radius:12px;border:1px solid #bbf7d0;box-shadow:0 2px 8px rgba(5,150,105,0.1);margin:25px 0;">
                    <tr>
                      <td style="padding:20px;">
                        <h3 style="margin:0 0 15px 0;color:#065f46;font-size:18px;font-weight:600;">
                          Next Steps
                        </h3>

                        <p style="color:#166534;font-size:14px;margin-bottom:20px;">
                          Review this request in your business dashboard to accept or decline.
                          Please review borrower details and risk assessment before deciding.
                        </p>

                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td align="center" style="padding-bottom:10px;">
                              <a href="${loanUrl}"
                                style="display:inline-block;background:linear-gradient(to right,#059669,#047857);color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:8px;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(5,150,105,0.2);">
                                Review Request →
                              </a>
                            </td>
                          </tr>
                          <tr>
                            <td align="center">
                              <a href="${APP_URL}/business/requests"
                                style="display:inline-block;background:#ffffff;color:#059669;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:16px;border:2px solid #059669;">
                                View All Requests
                              </a>
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>
                  </table>

                  <!-- ===== FOOTER LINKS ===== -->
                  <div style="margin-top:30px;padding-top:20px;border-top:1px solid #bbf7d0;color:#047857;font-size:14px;">
                    <p style="margin:0 0 10px 0;">Need help reviewing loan requests?</p>
                    <p style="margin:0;">
                      <a href="${APP_URL}/help/lender-guide" style="color:#059669;text-decoration:none;font-weight:500;margin-right:15px;">
                        Lender Guide
                      </a>
                      <a href="mailto:support@feyza.com" style="color:#059669;text-decoration:none;font-weight:500;">
                        Contact Support
                      </a>
                    </p>
                  </div>

                </td>
              </tr>
            </table>

            <!-- ===== SIGNATURE ===== -->
            <div style="text-align:center;margin-top:20px;color:#6b7280;font-size:12px;">
              <p style="margin:0;">Feyza • Automated Loan Matching System</p>
              <p style="margin:5px 0 0 0;font-size:11px;color:#9ca3af;">
                This is an automated notification. Please do not reply.
              </p>
            </div>

          </td>
        </tr>
      </table>

    </body>
  </html>
  `,
};
}
