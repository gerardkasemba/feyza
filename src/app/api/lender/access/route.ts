import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Check if this email has any loans as a lender (invited or guest)
    const { data: loans } = await supabase
      .from('loans')
      .select('id')
      .eq('invite_email', email.toLowerCase())
      .limit(1);

    // Check if guest lender already exists
    let guestLender;
    const { data: existingLender } = await supabase
      .from('guest_lenders')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (existingLender) {
      // Refresh the access token
      const newToken = uuidv4();
      const { data: updated } = await supabase
        .from('guest_lenders')
        .update({
          access_token: newToken,
          access_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLender.id)
        .select()
        .single();
      
      guestLender = updated;
    } else if (loans && loans.length > 0) {
      // Create new guest lender record
      const { data: newLender } = await supabase
        .from('guest_lenders')
        .insert({
          email: email.toLowerCase(),
          access_token: uuidv4(),
          access_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();
      
      guestLender = newLender;
    } else {
      // No loans found for this email - still send email but with helpful message
      try {
        await sendEmail({
          to: email,
          subject: 'Feyza - Dashboard Access Request',
          html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;">
              
              <!-- HEADER -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:linear-gradient(135deg,#059669 0%,#047857 100%);border-radius:16px 16px 0 0;">
                <tr>
                  <td align="center" style="padding:30px 20px 20px;">
                    
                    <!-- Logo (centered, email-safe) -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
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

                    <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:600;">
                      Dashboard Access Request
                    </h1>
                  </td>
                </tr>
              </table>

              <!-- CONTENT -->
              <div style="background:#f0fdf4;padding:30px;border-radius:0 0 16px 16px;border:1px solid #bbf7d0;border-top:none;">
                
                <p style="font-size:18px;color:#166534;margin-bottom:20px;">Hi there,</p>

                <!-- STATUS CARD -->
                <div style="background:white;padding:24px;border-radius:12px;margin:20px 0;border:1px solid #bbf7d0;">
                  <h3 style="margin:0 0 15px;color:#065f46;font-size:20px;font-weight:600;">
                    Account Status
                  </h3>

                  <p style="color:#166534;line-height:1.6;margin-bottom:15px;">
                    You requested access to your lending dashboard, but we don't have any loan requests associated with
                    <strong style="color:#059669;">${email}</strong> yet.
                  </p>

                  <!-- HOW IT WORKS -->
                  <div style="background:#dcfce7;padding:16px;border-radius:8px;margin:20px 0;border:1px solid #86efac;">
                    <strong style="color:#065f46;display:block;margin-bottom:6px;">
                      📨 How It Works
                    </strong>
                    <p style="color:#166534;margin:0;font-size:15px;line-height:1.5;">
                      If someone wants to borrow from you, they'll send you an invite email with a link to review and accept the loan.
                    </p>
                  </div>

                  <!-- IMPORTANT -->
                  <div style="background:#fef3c7;padding:16px;border-radius:8px;margin:20px 0;border:1px solid #fde047;">
                    <strong style="color:#854d0e;display:block;margin-bottom:6px;">
                      ⚠️ Important
                    </strong>
                    <p style="color:#92400e;margin:0;font-size:14px;line-height:1.5;">
                      If you think this is an error, the borrower may have used a different email address.
                      Please confirm the email they used.
                    </p>
                  </div>
                </div>

                <!-- ACTIONS -->
                <div style="background:white;padding:24px;border-radius:12px;margin:20px 0;border:1px solid #bbf7d0;">
                  <h3 style="margin:0 0 15px;color:#065f46;font-size:20px;font-weight:600;">
                    What You Can Do
                  </h3>

                  <ul style="margin:0;padding-left:20px;color:#065f46;font-size:15px;">
                    <li style="margin-bottom:10px;">Wait for an invitation from a borrower</li>
                    <li style="margin-bottom:10px;">Share your correct email address</li>
                    <li>Check your spam folder</li>
                  </ul>
                </div>

                <!-- BUTTONS -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:25px 0;">
                  <tr>
                    <td align="center" style="padding-bottom:10px;">
                      <a href="${APP_URL}/about/lenders"
                        style="display:inline-block;width:100%;max-width:260px;background:white;color:#059669;text-decoration:none;
                              padding:14px;border-radius:8px;font-weight:500;border:2px solid #059669;font-size:14px;">
                        📚 Lender Guide
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom:10px;">
                      <a href="${APP_URL}/help/dashboard-access"
                        style="display:inline-block;width:100%;max-width:260px;background:white;color:#059669;text-decoration:none;
                              padding:14px;border-radius:8px;font-weight:500;border:2px solid #059669;font-size:14px;">
                        ❓ Help Center
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <a href="mailto:support@feyza.com"
                        style="display:inline-block;width:100%;max-width:260px;background:white;color:#059669;text-decoration:none;
                              padding:14px;border-radius:8px;font-weight:500;border:2px solid #059669;font-size:14px;">
                        ✉️ Contact Support
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- FOOTER -->
                <div style="margin-top:30px;padding-top:20px;border-top:1px solid #bbf7d0;color:#047857;font-size:13px;text-align:center;">
                  <strong>Feyza Lending Platform</strong><br />
                  <span style="color:#6b7280;">This is an automated message. Please do not reply.</span>
                </div>

              </div>
            </body>
          </html>
          `,
        });
      } catch (emailError) {
        console.error('Error sending no-loans email:', emailError);
      }

      // Still return success to prevent email enumeration
      return NextResponse.json({ success: true });
    }

    // Send dashboard access link
    if (guestLender) {
      const dashboardUrl = `${APP_URL}/lender/${guestLender.access_token}`;
      
      try {
        await sendEmail({
          to: email,
          subject: 'Your Feyza Lending Dashboard',
          html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                        max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;">

              <!-- ===== HEADER ===== -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#059669 0%,#047857 100%);
                            padding:30px;border-radius:16px 16px 0 0;text-align:center;">

                    <!-- Logo (email-safe centered) -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="padding-bottom:20px;">
                          <img
                            src="https://feyza.app/feyza.png"
                            alt="Feyza Logo"
                            height="40"
                            style="display:block;height:40px;width:auto;border:0;outline:none;text-decoration:none;"
                          />
                        </td>
                      </tr>
                    </table>

                    <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:600;">
                      📊 Your Lending Dashboard
                    </h1>
                    <p style="color:rgba(255,255,255,0.9);margin:10px 0 0 0;font-size:16px;">
                      Secure Access Link
                    </p>
                  </td>
                </tr>
              </table>

              <!-- ===== CONTENT ===== -->
              <div style="background:#f0fdf4;padding:30px;border-radius:0 0 16px 16px;
                          border:1px solid #bbf7d0;border-top:none;">

                <p style="font-size:18px;color:#166534;margin-bottom:20px;">Hi there,</p>

                <p style="color:#166534;line-height:1.6;margin-bottom:20px;">
                  Here's your secure link to access your lending dashboard where you can view
                  and manage all your loans:
                </p>

                <!-- ===== CTA ===== -->
                <div style="background:#ffffff;padding:24px;border-radius:12px;margin:20px 0;
                            border:1px solid #bbf7d0;
                            box-shadow:0 2px 8px rgba(5,150,105,0.1);
                            text-align:center;">

                  <h3 style="margin:0 0 20px 0;color:#065f46;font-size:20px;font-weight:600;">
                    Direct Access to Your Dashboard
                  </h3>

                  <a href="${dashboardUrl}"
                    style="display:inline-block;
                            background:linear-gradient(to right,#059669,#047857);
                            color:#ffffff;text-decoration:none;
                            padding:16px 40px;border-radius:8px;
                            font-weight:600;font-size:18px;
                            box-shadow:0 4px 12px rgba(5,150,105,0.2);">
                    Access Your Dashboard →
                  </a>

                  <p style="color:#059669;font-size:14px;margin:15px 0 0 0;">
                    <strong>One-click access</strong> to all your lending activities
                  </p>
                </div>

                <!-- ===== SECURITY ===== -->
                <div style="background:#dcfce7;padding:20px;border-radius:8px;margin:25px 0;
                            border:1px solid #86efac;">
                  <h4 style="color:#065f46;margin:0 0 10px 0;font-weight:600;font-size:16px;">
                    🔒 Security Information
                  </h4>
                  <p style="color:#166534;font-size:14px;line-height:1.5;margin:0;">
                    This secure link expires in <strong>30 days</strong>. Keep it safe —
                    anyone with this link can access your lending information.
                  </p>
                </div>

                <!-- ===== FEATURES ===== -->
                <div style="background:#ffffff;padding:20px;border-radius:12px;margin:20px 0;
                            border:1px solid #bbf7d0;">
                  <h4 style="color:#065f46;margin:0 0 15px 0;font-weight:600;font-size:18px;">
                    What you can do in your dashboard:
                  </h4>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
                        <strong style="color:#059669;">📈 Monitor Loans</strong><br>
                        <span style="color:#166534;font-size:14px;">Track active loans and performance</span>
                      </td>
                    </tr>
                    <tr><td height="10"></td></tr>
                    <tr>
                      <td style="padding:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
                        <strong style="color:#059669;">💰 Manage Funds</strong><br>
                        <span style="color:#166534;font-size:14px;">View and adjust your capital pool</span>
                      </td>
                    </tr>
                    <tr><td height="10"></td></tr>
                    <tr>
                      <td style="padding:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
                        <strong style="color:#059669;">📊 Analytics</strong><br>
                        <span style="color:#166534;font-size:14px;">Reports and insights</span>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- ===== ALT LOGIN ===== -->
                <div style="background:#f0fdf4;padding:20px;border-radius:8px;margin:20px 0;
                            border:2px dashed #059669;">
                  <p style="color:#065f46;margin:0 0 10px 0;font-weight:600;">
                    Alternative Access Method:
                  </p>
                  <p style="color:#166534;font-size:14px;margin:0;">
                    Log in at
                    <a href="${APP_URL}/login"
                      style="color:#059669;font-weight:500;text-decoration:none;">
                      ${APP_URL}/login
                    </a>
                  </p>
                </div>

                <!-- ===== FOOTER LINKS ===== -->
                <div style="margin-top:30px;padding-top:20px;border-top:1px solid #bbf7d0;
                            color:#047857;font-size:14px;">
                  <p style="margin:0 0 10px 0;">Questions about your dashboard?</p>
                  <p style="margin:0;">
                    <a href="${APP_URL}/help/dashboard"
                      style="color:#059669;text-decoration:none;font-weight:500;margin-right:15px;">
                      Dashboard Guide
                    </a>
                    <a href="mailto:support@feyza.com"
                      style="color:#059669;text-decoration:none;font-weight:500;">
                      Contact Support
                    </a>
                  </p>
                </div>
              </div>

              <!-- ===== SIGNATURE ===== -->
              <div style="text-align:center;margin-top:20px;color:#6b7280;font-size:12px;">
                <p style="margin:0 0 5px 0;">This is an automated message from Feyza</p>
                <p style="margin:0;">If you didn’t request this dashboard link, ignore this email.</p>
              </div>

            </body>
          </html>
          `,
        });
      } catch (emailError) {
        console.error('Error sending dashboard link:', emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in lender access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
