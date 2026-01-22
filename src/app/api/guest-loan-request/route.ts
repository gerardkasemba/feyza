import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { randomBytes } from 'crypto';
import { validateRepaymentSchedule } from '@/lib/smartSchedule';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const body = await request.json();

    const { 
      amount, 
      currency, 
      purpose, 
      full_name, 
      email, 
      description,
      proposed_frequency,
      proposed_installments,
      proposed_payment_amount,
      proposed_start_date,
      bank_connected,
      // Dwolla info from bank connection
      borrower_dwolla_customer_url,
      borrower_dwolla_customer_id,
      borrower_dwolla_funding_source_url,
      borrower_dwolla_funding_source_id,
      borrower_plaid_access_token,
      borrower_bank_name,
      borrower_bank_account_mask,
      borrower_bank_account_type,
    } = body;

    // Validation
    if (!amount || !currency || !purpose || !full_name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (!bank_connected) {
      return NextResponse.json(
        { error: 'Please connect your bank account to receive the loan' },
        { status: 400 }
      );
    }

    // Validate proposed repayment schedule
    if (proposed_frequency && proposed_installments) {
      const validation = validateRepaymentSchedule(amount, proposed_frequency, proposed_installments);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.message },
          { status: 400 }
        );
      }
    }

    // Check if user exists with this email (for linking if they have an account)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    // Generate access token for guest
    const accessToken = generateToken();
    const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create loan request record with Dwolla info
    const { data: loanRequest, error: createError } = await supabase
      .from('loan_requests')
      .insert({
        amount,
        currency,
        purpose,
        description,
        borrower_name: full_name,
        borrower_email: email.toLowerCase(),
        borrower_user_id: existingUser?.id || null,
        status: 'pending',
        access_token: accessToken,
        access_token_expires: tokenExpires.toISOString(),
        // Proposed repayment schedule
        proposed_frequency: proposed_frequency || 'monthly',
        proposed_installments: proposed_installments || 1,
        proposed_payment_amount: proposed_payment_amount || amount,
        proposed_start_date: proposed_start_date || null,
        // Dwolla/bank info for receiving funds
        borrower_dwolla_customer_url,
        borrower_dwolla_customer_id,
        borrower_dwolla_funding_source_url,
        borrower_dwolla_funding_source_id,
        borrower_plaid_access_token,
        borrower_bank_name,
        borrower_bank_account_mask,
        borrower_bank_account_type,
        borrower_bank_connected: bank_connected,
      })
      .select()
      .single();

    if (createError) {
      console.error('Create loan request error:', createError);
      throw createError;
    }

    // Send confirmation email to borrower
    await sendEmail({
      to: email,
      subject: 'Loan Request Submitted - Feyza',
      html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color:#f9fafb;">

          <!-- Card -->
          <div style="background:white; border-radius:16px; overflow:hidden; border:1px solid #e5e7eb;">

            <!-- Header -->
            <div style="background:linear-gradient(135deg, #059669 0%, #047857 100%); padding:30px 20px; text-align:center;">

              <!-- Logo (email-safe centered) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:15px;">
                    <img
                      src="https://feyza.app/feyza.png"
                      alt="Feyza Logo"
                      height="48"
                      style="display:block; height:48px; width:auto; border:0; outline:none; text-decoration:none;"
                    />
                  </td>
                </tr>
              </table>

              <h1 style="color:white; margin:0; font-size:28px; font-weight:700;">
                ✅ Request Submitted!
              </h1>
            </div>

            <!-- Content -->
            <div style="background:#f8fafc; padding:30px;">

              <p style="font-size:18px; color:#374151; margin-top:0;">
                Hi ${full_name},
              </p>

              <p style="color:#374151;">
                Your loan request has been submitted successfully! Your bank account is connected and ready to receive funds.
              </p>

              <!-- Amount Card -->
              <div style="background:white; padding:20px; border-radius:12px; margin:20px 0; border:1px solid #e5e7eb; text-align:center;">
                <p style="color:#6b7280; margin:0 0 10px 0; font-size:14px;">
                  Request Amount
                </p>
                <p style="font-size:32px; font-weight:bold; color:#059669; margin:0;">
                  ${currency} ${amount.toLocaleString()}
                </p>
                <p style="color:#6b7280; margin:10px 0 0 0; font-size:14px;">
                  Purpose: ${purpose.charAt(0).toUpperCase() + purpose.slice(1)}
                </p>
              </div>

              <!-- Bank Connected -->
              <div style="background:#d1fae5; padding:14px 16px; border-radius:8px; margin:16px 0;">
                <p style="color:#065f46; margin:0; font-size:14px;">
                  ✅ <strong>Bank Connected</strong> — When your loan is accepted, funds will be sent directly to your bank account via ACH transfer.
                </p>
              </div>

              <!-- Next Steps -->
              <h3 style="color:#374151; margin-top:24px;">
                What’s next?
              </h3>

              <ol style="color:#374151; padding-left:20px; margin-top:10px;">
                <li style="margin-bottom:12px;">
                  <strong>Share your request</strong> — Send the link below to friends, family, or anyone who might be willing to lend.
                </li>
                <li style="margin-bottom:12px;">
                  <strong>Wait for a lender</strong> — Once accepted, money is sent directly to your bank.
                </li>
                <li style="margin-bottom:12px;">
                  <strong>Receive funds</strong> — Typically arrives in 1–3 business days via ACH.
                </li>
              </ol>

              <!-- CTA -->
              <a
                href="${APP_URL}/loan-request/${loanRequest.id}?token=${accessToken}"
                style="display:block; background:linear-gradient(to right, #059669, #047857); color:white; text-decoration:none; padding:16px 32px; border-radius:8px; font-weight:600; text-align:center; margin:24px 0;"
              >
                View & Share Your Request →
              </a>

              <!-- Tip -->
              <div style="background:#fef3c7; padding:16px; border-radius:8px; margin-top:20px;">
                <p style="color:#92400e; margin:0; font-size:14px;">
                  💡 <strong>Tip:</strong> Share your loan request with people you trust. More visibility increases your chances of finding a lender faster.
                </p>
              </div>

              <!-- Footer note -->
              <p style="color:#6b7280; font-size:13px; margin-top:30px; text-align:center;">
                If you have any questions, reply to this email. This link expires in 7 days.
              </p>

            </div>
          </div>
        </body>
      </html>
      `,
    });

    return NextResponse.json({
      success: true,
      request_id: loanRequest.id,
      message: 'Loan request submitted successfully',
    });

  } catch (error) {
    console.error('Guest loan request error:', error);
    return NextResponse.json(
      { error: 'Failed to submit loan request' },
      { status: 500 }
    );
  }
}

// GET: Fetch all pending loan requests (for matching/browsing)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: requests, error, count } = await supabase
      .from('loan_requests')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      requests,
      total: count,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Fetch loan requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loan requests' },
      { status: 500 }
    );
  }
}
