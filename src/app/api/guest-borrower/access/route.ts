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
      subject: '🔑 Access Your Loan(s) on LoanTrack',
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">Access Your Loan</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0;">
              <p style="font-size: 16px; color: #374151;">Hi there,</p>
              
              <p style="color: #374151;">
                You requested access to your loan(s) on LoanTrack. Click the link(s) below to view and manage your loans:
              </p>
              
              <ul style="list-style: none; padding: 0; margin: 20px 0;">
                ${loanLinks}
              </ul>

              <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  ⏰ These links will expire in <strong>24 hours</strong>. 
                  You can always request new links from the access page.
                </p>
              </div>
              
              <p style="color: #374151;">
                From your loan page you can:
              </p>
              <ul style="color: #374151;">
                <li>View your loan details and payment schedule</li>
                <li>Set up your payment method</li>
                <li>Track your payments</li>
                <li>Make payments to your lender</li>
              </ul>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If you didn't request this, you can safely ignore this email.
              </p>
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
