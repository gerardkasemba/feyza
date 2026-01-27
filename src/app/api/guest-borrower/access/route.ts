import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getAccessLoansEmail } from '@/lib/email';
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

    // Use the first access token for the email link
    const primaryToken = accessTokens[0]?.token || '';
    
    const accessEmail = getAccessLoansEmail({
      borrowerName: loans[0]?.borrower_invite_email?.split('@')[0] || email.split('@')[0],
      accessToken: primaryToken,
      loanCount: uniqueLoans.length,
    });
    await sendEmail({
      to: email,
      subject: accessEmail.subject,
      html: accessEmail.html,
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
