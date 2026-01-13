import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { randomBytes } from 'crypto';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Generate a secure access token
function generateAccessToken(): string {
  return randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find loans where this email is the borrower (via invite_email or user email)
    // First check if there's a user with this email
    const { data: user } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase())
      .single();

    let loans: any[] = [];

    if (user) {
      // User exists, find their loans as borrower
      const { data: userLoans } = await supabase
        .from('loans')
        .select(`
          *,
          lender:users!lender_id(full_name, email),
          business_lender:business_profiles!business_lender_id(business_name)
        `)
        .eq('borrower_id', user.id)
        .in('status', ['pending', 'pending_funds', 'active']);
      
      loans = userLoans || [];
    }

    // Also check for loans where this email was invited (guest borrower)
    const { data: inviteLoans } = await supabase
      .from('loans')
      .select(`
        *,
        lender:users!lender_id(full_name, email),
        business_lender:business_profiles!business_lender_id(business_name)
      `)
      .eq('borrower_invite_email', email.toLowerCase())
      .in('status', ['pending', 'pending_funds', 'active']);

    if (inviteLoans) {
      loans = [...loans, ...inviteLoans];
    }

    // Remove duplicates by loan id
    const uniqueLoans = loans.filter((loan, index, self) =>
      index === self.findIndex((l) => l.id === loan.id)
    );

    if (uniqueLoans.length === 0) {
      return NextResponse.json({ 
        error: 'No active loans found for this email address' 
      }, { status: 404 });
    }

    // Generate access tokens for each loan and store them
    const accessTokens: { loanId: string; token: string; lenderName: string }[] = [];
    
    for (const loan of uniqueLoans) {
      const token = generateAccessToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store the access token
      await supabase
        .from('loans')
        .update({
          borrower_access_token: token,
          borrower_access_token_expires: expiresAt.toISOString(),
        })
        .eq('id', loan.id);

      const lenderName = loan.lender?.full_name || loan.business_lender?.business_name || 'Your lender';
      accessTokens.push({ loanId: loan.id, token, lenderName });
    }

    // Send email with access links
    const loanLinks = accessTokens.map(({ token, lenderName }) => 
      `<li style="margin-bottom: 10px;">
        <strong>${lenderName}</strong><br>
        <a href="${APP_URL}/borrower/${token}" style="color: #2563eb;">Access Loan →</a>
      </li>`
    ).join('');

      await sendEmail({
        to: email,
        subject: '🔑 Access Your Loan(s) on Feyza',
        html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <!-- Header with logo and gradient -->
              <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                <!-- Logo -->
                <div style="margin-bottom: 20px;">
                  <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                      alt="Feyza Logo" 
                      style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                </div>
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🔑 Access Your Loan(s)</h1>
                <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Secure Loan Portal Access</p>
              </div>
              
              <!-- Content area -->
              <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi there,</p>
                
                <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                  You requested access to your loan(s) on Feyza. Click the link(s) below to view and manage your loans:
                </p>
                
                <!-- Loan Links Container -->
                <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                  <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">Your Loan Access Links</h3>
                  <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border: 1px solid #86efac;">
                    <ul style="list-style: none; padding: 0; margin: 0;">
                      ${loanLinks}
                    </ul>
                  </div>
                </div>

                <!-- Warning/Info Box -->
                <div style="background: linear-gradient(to right, #fef3c7, #fef9c3); padding: 18px; border-radius: 8px; margin: 20px 0; border: 1px solid #fde047;">
                  <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="color: #92400e; font-size: 20px;">⏰</div>
                    <div>
                      <p style="color: #92400e; margin: 0; font-size: 15px; line-height: 1.5;">
                        <strong style="color: #854d0e;">These links will expire in 24 hours.</strong><br>
                        You can always request new links from the access page if needed.
                      </p>
                    </div>
                  </div>
                </div>
                
                <!-- Features Section -->
                <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                  <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">From your loan page you can:</h3>
                  <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                    <li style="margin-bottom: 10px; line-height: 1.6; padding-left: 5px;">View your loan details and payment schedule</li>
                    <li style="margin-bottom: 10px; line-height: 1.6; padding-left: 5px;">Set up your payment method securely</li>
                    <li style="margin-bottom: 10px; line-height: 1.6; padding-left: 5px;">Track your payments and view history</li>
                    <li style="line-height: 1.6; padding-left: 5px;">Make payments directly to your lender</li>
                  </ul>
                </div>
                
                <!-- Security Tips -->
                <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #86efac;">
                  <h4 style="color: #065f46; margin: 0 0 10px 0; font-weight: 600;">🔒 Security Tips:</h4>
                  <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                    <li style="margin-bottom: 8px; font-size: 14px;">Never share these links with anyone</li>
                    <li style="margin-bottom: 8px; font-size: 14px;">Ensure you're on a secure connection when accessing</li>
                    <li style="font-size: 14px;">Log out after completing your session</li>
                  </ul>
                </div>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${APP_URL}/loans" 
                    style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                            color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                            font-weight: 600; text-align: center; font-size: 16px;
                            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                    onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                    Manage All Loans →
                  </a>
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                  <p style="margin: 0 0 10px 0;">If you didn't request this, you can safely ignore this email.</p>
                  <p style="margin: 0;">
                    <a href="${APP_URL}/help/security" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                      Security Help
                    </a>
                    <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                      Contact Support
                    </a>
                  </p>
                </div>
              </div>
              
              <!-- Signature -->
              <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">Feyza • Secure Loan Management System</p>
                <p style="margin: 5px 0 0 0; font-size: 11px; color: #9ca3af;">This link expires in 24 hours for your security</p>
              </div>
            </body>
          </html>
        `,
      });

    return NextResponse.json({
      success: true,
      message: 'Access link sent to your email',
      loansFound: uniqueLoans.length,
    });

  } catch (error) {
    console.error('Guest borrower access error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
