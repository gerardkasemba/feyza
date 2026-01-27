import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getGuestLenderAcceptedEmail, getLoanAcceptedBorrowerEmail } from '@/lib/email';
import { randomBytes } from 'crypto';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { id: requestId } = await params;
    const body = await request.json();

    const { lender_email, lender_name } = body;

    if (!lender_email || !lender_name) {
      return NextResponse.json(
        { error: 'Lender email and name are required' },
        { status: 400 }
      );
    }

    // Fetch the loan request
    const { data: loanRequest, error: fetchError } = await supabase
      .from('loan_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !loanRequest) {
      return NextResponse.json(
        { error: 'Loan request not found' },
        { status: 404 }
      );
    }

    if (loanRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'This loan request is no longer available' },
        { status: 400 }
      );
    }

    // Check if lender already has an account
    const { data: existingLender } = await supabase
      .from('users')
      .select('id')
      .eq('email', lender_email.toLowerCase())
      .single();

    // Generate lender access token
    const lenderToken = generateToken();
    const borrowerToken = generateToken();
    const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create the loan with borrower's proposed schedule
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .insert({
        amount: loanRequest.amount,
        currency: loanRequest.currency,
        purpose: loanRequest.purpose,
        borrower_id: loanRequest.borrower_user_id, // May be null for guest
        borrower_invite_email: loanRequest.borrower_email,
        lender_id: existingLender?.id || null,
        lender_type: 'personal',
        invite_email: lender_email.toLowerCase(),
        invite_token: lenderToken,
        invite_accepted: true,
        borrower_access_token: borrowerToken,
        borrower_access_token_expires: tokenExpires.toISOString(),
        status: 'pending', // Pending until lender sets terms
        interest_rate: 0,
        interest_type: 'simple',
        total_interest: 0,
        total_amount: loanRequest.amount,
        // Use borrower's proposed schedule as defaults
        repayment_frequency: loanRequest.proposed_frequency || 'monthly',
        repayment_amount: loanRequest.proposed_payment_amount || loanRequest.amount,
        total_installments: loanRequest.proposed_installments || 1,
        start_date: new Date().toISOString(),
        // Copy borrower's receive payment method
        borrower_payment_method: loanRequest.borrower_payment_method,
        borrower_payment_username: loanRequest.borrower_payment_username,
      })
      .select()
      .single();

    if (loanError) {
      console.error('Create loan error:', loanError);
      throw loanError;
    }

    // Update loan request status
    await supabase
      .from('loan_requests')
      .update({
        status: 'accepted',
        accepted_by_email: lender_email.toLowerCase(),
        accepted_by_name: lender_name,
        accepted_at: new Date().toISOString(),
        loan_id: loan.id,
      })
      .eq('id', requestId);

    // Send email to lender to set up loan terms
    await sendEmail({
      to: lender_email,
      subject: 'You accepted a loan request - Set your terms',
      html: `
      <!DOCTYPE html>
      <html>
        <body style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9fafb;
        ">

          <!-- Card -->
          <div style="
            background: white;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid #bbf7d0;
          ">

            <!-- Header -->
            <div style="
              background: linear-gradient(135deg, #059669 0%, #047857 100%);
              padding: 30px;
              text-align: center;
            ">

              <!-- Logo (email-safe centered) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 15px;">
                    <img
                      src="https://feyza.app/feyza.png"
                      alt="Feyza Logo"
                      height="48"
                      style="display:block; height:48px; width:auto; border:0; outline:none; text-decoration:none;"
                    />
                  </td>
                </tr>
              </table>

              <h1 style="color: white; margin: 0; font-size: 26px;">
                🤝 Thank You!
              </h1>
            </div>

            <!-- Body -->
            <div style="
              background: #f0fdf4;
              padding: 30px;
            ">
              <p style="font-size: 18px; color: #374151; margin-top: 0;">
                Hi ${lender_name},
              </p>

              <p style="color: #374151;">
                Thank you for agreeing to help
                <strong>${loanRequest.borrower_name}</strong>
                with their loan request.
              </p>

              <!-- Loan Amount Card -->
              <div style="
                background: white;
                padding: 20px;
                border-radius: 12px;
                margin: 24px 0;
                border: 1px solid #bbf7d0;
                text-align: center;
              ">
                <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">
                  Loan Amount
                </p>
                <p style="
                  font-size: 32px;
                  font-weight: bold;
                  color: #059669;
                  margin: 0;
                ">
                  ${loanRequest.currency} ${loanRequest.amount.toLocaleString()}
                </p>
              </div>

              <p style="color: #374151;">
                <strong>Next step:</strong> Set your loan terms (interest rate, repayment schedule, etc.).
              </p>

              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 24px 0;">
                    <a
                      href="${APP_URL}/lender/setup-loan/${loan.id}?token=${lenderToken}"
                      style="
                        display: inline-block;
                        background: #059669;
                        color: white;
                        text-decoration: none;
                        padding: 16px 36px;
                        border-radius: 8px;
                        font-weight: bold;
                        font-size: 16px;
                      "
                    >
                      Set Loan Terms →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; text-align: center; margin-bottom: 0;">
                This link expires in 7 days. You don’t need an account to continue.
              </p>
            </div>
          </div>

        </body>
      </html>
      `,
    });

    // Send email to borrower that their request was accepted
    await sendEmail({
      to: loanRequest.borrower_email,
      subject: 'Great news! Your loan request was accepted',
      html: `
      <!DOCTYPE html>
      <html>
        <body style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9fafb;
        ">
          <!-- Card -->
          <div style="
            background: white;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid #e5e7eb;
          ">

            <!-- Header -->
            <div style="
              background: linear-gradient(135deg, #059669 0%, #047857 100%);
              padding: 30px;
              text-align: center;
            ">
              <!-- Logo (email-safe centered) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 15px;">
                    <img
                      src="https://feyza.app/feyza.png"
                      alt="Feyza Logo"
                      height="48"
                      style="display:block; height:48px; width:auto; border:0; outline:none;"
                    />
                  </td>
                </tr>
              </table>

              <h1 style="color: white; margin: 0; font-size: 26px;">
                🎉 Request Accepted!
              </h1>
            </div>

            <!-- Content -->
            <div style="background: #f8fafc; padding: 30px;">
              <p style="font-size: 18px; color: #374151;">
                Hi ${loanRequest.borrower_name},
              </p>

              <p style="color: #374151;">
                Great news! <strong>${lender_name}</strong> has agreed to help you with your loan request.
              </p>

              <!-- Loan Amount -->
              <div style="
                background: white;
                padding: 20px;
                border-radius: 12px;
                margin: 20px 0;
                border: 1px solid #d1fae5;
                text-align: center;
              ">
                <p style="color: #6b7280; margin: 0 0 8px 0;">
                  Loan Amount
                </p>
                <p style="
                  font-size: 32px;
                  font-weight: bold;
                  color: #059669;
                  margin: 0;
                ">
                  ${loanRequest.currency} ${loanRequest.amount.toLocaleString()}
                </p>
              </div>

              <!-- Next Steps -->
              <p style="color: #374151; font-weight: 600;">
                What happens next?
              </p>

              <ol style="color: #374151; padding-left: 20px;">
                <li style="margin-bottom: 8px;">
                  Your lender will set the loan terms (interest, repayment schedule)
                </li>
                <li style="margin-bottom: 8px;">
                  You'll receive the terms to review and sign
                </li>
                <li style="margin-bottom: 8px;">
                  Once both parties sign, the loan begins
                </li>
              </ol>

              <!-- CTA -->
              <a
                href="${APP_URL}/borrower/${borrowerToken}"
                style="
                  display: block;
                  background: linear-gradient(to right, #059669, #047857);
                  color: white;
                  text-decoration: none;
                  padding: 16px 32px;
                  border-radius: 8px;
                  font-weight: bold;
                  text-align: center;
                  margin: 24px 0;
                "
              >
                View Your Loan →
              </a>

              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                We’ll notify you when the loan terms are ready for your review.
              </p>
            </div>

            <!-- Footer -->
            <div style="
              background: #f9fafb;
              padding: 16px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
            ">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This is an automated message from Feyza.
              </p>
            </div>

          </div>
        </body>
      </html>
      `,
    });

    return NextResponse.json({
      success: true,
      loan_id: loan.id,
      lender_token: lenderToken,
      message: 'Loan request accepted successfully',
    });

  } catch (error) {
    console.error('Accept loan request error:', error);
    return NextResponse.json(
      { error: 'Failed to accept loan request' },
      { status: 500 }
    );
  }
}
