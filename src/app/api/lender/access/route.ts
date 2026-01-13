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
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <!-- Header with logo -->
                <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
                  <!-- Logo -->
                  <div style="margin-bottom: 15px;">
                    <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                        alt="Feyza Logo" 
                        style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                  </div>
                  <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Dashboard Access Request</h1>
                </div>
                
                <!-- Content area -->
                <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                  <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi there,</p>
                  
                  <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                    <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">Account Status</h3>
                    <p style="color: #166534; line-height: 1.6; margin-bottom: 15px;">
                      You requested access to your lending dashboard, but we don't have any loan requests associated with 
                      <strong style="color: #059669;">${email}</strong> yet.
                    </p>
                    
                    <div style="background: #dcfce7; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
                      <h4 style="margin: 0 0 10px 0; color: #065f46; font-size: 16px; font-weight: 600;">📨 How It Works:</h4>
                      <p style="color: #166534; margin: 0; font-size: 15px; line-height: 1.5;">
                        If someone wants to borrow from you, they'll send you an invite email with a link to review and accept the loan.
                      </p>
                    </div>
                    
                    <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #fde047;">
                      <h4 style="margin: 0 0 10px 0; color: #854d0e; font-size: 16px; font-weight: 600;">⚠️ Important:</h4>
                      <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5;">
                        If you think this is an error, the person requesting to borrow may have used a different email address.
                        Please check with the borrower to confirm the email address they used.
                      </p>
                    </div>
                  </div>
                  
                  <!-- Action section -->
                  <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                    <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">What You Can Do</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                      <li style="margin-bottom: 10px; line-height: 1.6; padding-left: 5px;">
                        <strong>Wait for an invitation</strong> - Borrowers will send you loan requests directly
                      </li>
                      <li style="margin-bottom: 10px; line-height: 1.6; padding-left: 5px;">
                        <strong>Share your email</strong> - Make sure borrowers have the correct email address
                      </li>
                      <li style="line-height: 1.6; padding-left: 5px;">
                        <strong>Check spam folder</strong> - Sometimes invitation emails can get filtered
                      </li>
                    </ul>
                  </div>
                  
                  <!-- Resources -->
                  <div style="display: flex; flex-wrap: wrap; gap: 15px; margin: 25px 0;">
                    <a href="${APP_URL}/about/lenders" 
                      style="flex: 1; min-width: 150px; background: white; color: #059669; text-decoration: none; 
                              padding: 14px; border-radius: 8px; font-weight: 500; text-align: center; 
                              border: 2px solid #059669; font-size: 14px; transition: all 0.2s ease;"
                      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.1)';this.style.background='#f0fdf4';"
                      onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none';this.style.background='white';">
                      📚 Lender Guide
                    </a>
                    
                    <a href="${APP_URL}/help/dashboard-access" 
                      style="flex: 1; min-width: 150px; background: white; color: #059669; text-decoration: none; 
                              padding: 14px; border-radius: 8px; font-weight: 500; text-align: center; 
                              border: 2px solid #059669; font-size: 14px; transition: all 0.2s ease;"
                      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.1)';this.style.background='#f0fdf4';"
                      onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none';this.style.background='white';">
                      ❓ Help Center
                    </a>
                    
                    <a href="mailto:support@feyza.com" 
                      style="flex: 1; min-width: 150px; background: white; color: #059669; text-decoration: none; 
                              padding: 14px; border-radius: 8px; font-weight: 500; text-align: center; 
                              border: 2px solid #059669; font-size: 14px; transition: all 0.2s ease;"
                      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.1)';this.style.background='#f0fdf4';"
                      onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none';this.style.background='white';">
                      ✉️ Contact Us
                    </a>
                  </div>
                  
                  <!-- Footer -->
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                    <p style="margin: 0 0 10px 0;"><strong>Feyza Lending Platform</strong></p>
                    <p style="margin: 0; font-size: 13px; color: #6b7280;">
                      This is an automated message. Please do not reply to this email.
                    </p>
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
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <!-- Header with logo -->
                <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                  <!-- Logo -->
                  <div style="margin-bottom: 20px;">
                    <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                        alt="Feyza Logo" 
                        style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                  </div>
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">📊 Your Lending Dashboard</h1>
                  <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Secure Access Link</p>
                </div>
                
                <!-- Content area -->
                <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                  <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi there,</p>
                  
                  <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                    Here's your secure link to access your lending dashboard where you can view and manage all your loans:
                  </p>
                  
                  <!-- Main CTA Section -->
                  <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1); text-align: center;">
                    <h3 style="margin: 0 0 20px 0; color: #065f46; font-size: 20px; font-weight: 600;">Direct Access to Your Dashboard</h3>
                    
                    <a href="${dashboardUrl}" 
                      style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                              color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; 
                              font-weight: 600; text-align: center; margin: 20px 0; font-size: 18px;
                              box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                      onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                      Access Your Dashboard →
                    </a>
                    
                    <p style="color: #059669; font-size: 14px; margin: 15px 0 0 0;">
                      <strong>One-click access</strong> to all your lending activities
                    </p>
                  </div>
                  
                  <!-- Security Notice -->
                  <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #86efac;">
                    <h4 style="color: #065f46; margin: 0 0 10px 0; font-weight: 600; font-size: 16px;">🔒 Security Information</h4>
                    <p style="color: #166534; font-size: 14px; line-height: 1.5; margin: 0;">
                      This secure link expires in <strong>30 days</strong>. Keep it safe - anyone with this link can access your lending information.
                    </p>
                  </div>
                  
                  <!-- Dashboard Features -->
                  <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
                    <h4 style="color: #065f46; margin: 0 0 15px 0; font-weight: 600; font-size: 18px;">What you can do in your dashboard:</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-top: 15px;">
                      <div style="padding: 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <div style="color: #059669; font-weight: 600; margin-bottom: 5px;">📈 Monitor Loans</div>
                        <div style="color: #166534; font-size: 14px;">Track active loans and performance metrics</div>
                      </div>
                      <div style="padding: 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <div style="color: #059669; font-weight: 600; margin-bottom: 5px;">💰 Manage Funds</div>
                        <div style="color: #166534; font-size: 14px;">View and adjust your capital pool</div>
                      </div>
                      <div style="padding: 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <div style="color: #059669; font-weight: 600; margin-bottom: 5px;">⚙️ Settings</div>
                        <div style="color: #166534; font-size: 14px;">Configure lending preferences and criteria</div>
                      </div>
                      <div style="padding: 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <div style="color: #059669; font-weight: 600; margin-bottom: 5px;">📊 Analytics</div>
                        <div style="color: #166534; font-size: 14px;">View detailed reports and insights</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Alternative Access -->
                  <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px dashed #059669;">
                    <p style="color: #065f46; margin: 0 0 10px 0; font-weight: 600;">Alternative Access Method:</p>
                    <p style="color: #166534; font-size: 14px; margin: 0; line-height: 1.5;">
                      You can also log in directly at 
                      <a href="${APP_URL}/login" style="color: #059669; font-weight: 500; text-decoration: none;">${APP_URL}/login</a> 
                      using your email credentials.
                    </p>
                  </div>
                  
                  <!-- Footer -->
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                    <p style="margin: 0 0 10px 0;">Questions about your dashboard?</p>
                    <p style="margin: 0;">
                      <a href="${APP_URL}/help/dashboard" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                        Dashboard Guide
                      </a>
                      <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                        Contact Support
                      </a>
                    </p>
                  </div>
                </div>
                
                <!-- Signature -->
                <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                  <p style="margin: 0 0 5px 0;">This is an automated message from Feyza</p>
                  <p style="margin: 0;">
                    If you didn't request this dashboard link, you can safely ignore this email.
                  </p>
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
