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
      payment_method,
      payment_username,
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

    if (!payment_method || !payment_username) {
      return NextResponse.json(
        { error: 'Please specify how you want to receive the loan' },
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

    // Check if user exists with this email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    // Generate access token for guest
    const accessToken = generateToken();
    const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create loan request record
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
        // Borrower's receive payment method
        borrower_payment_method: payment_method,
        borrower_payment_username: payment_username,
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
      subject: '✅ Loan Request Submitted - Feyza',
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
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">✅ Request Submitted!</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Your loan request is now active</p>
            </div>
            
            <!-- Content area -->
            <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
              <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${full_name},</p>
              
              <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                Your loan request has been submitted successfully! Here's what happens next:
              </p>
              
              <!-- Loan details card -->
              <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                <div style="text-align: center;">
                  <p style="color: #047857; margin: 0 0 8px 0; font-size: 14px; font-weight: 500;">REQUEST AMOUNT</p>
                  <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 0; line-height: 1.2;">
                    ${currency} ${amount.toLocaleString()}
                  </p>
                  <div style="display: inline-block; background: #dcfce7; color: #065f46; padding: 6px 16px; border-radius: 20px; margin-top: 12px; font-weight: 500; font-size: 14px;">
                    ${purpose.charAt(0).toUpperCase() + purpose.slice(1)}
                  </div>
                </div>
              </div>
              
              <!-- Process steps -->
              <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                <h3 style="color: #065f46; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">What's Next?</h3>
                
                <div style="display: flex; flex-direction: column; gap: 20px;">
                  <!-- Step 1 -->
                  <div style="display: flex; gap: 15px; align-items: flex-start;">
                    <div style="background: #059669; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">1</div>
                    <div>
                      <p style="color: #065f46; margin: 0 0 5px 0; font-weight: 600;">Share Your Request</p>
                      <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.5;">
                        Send your request link to friends, family, or anyone who might be willing to lend you money.
                      </p>
                    </div>
                  </div>
                  
                  <!-- Step 2 -->
                  <div style="display: flex; gap: 15px; align-items: flex-start;">
                    <div style="background: #059669; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">2</div>
                    <div>
                      <p style="color: #065f46; margin: 0 0 5px 0; font-weight: 600;">Wait for a Lender</p>
                      <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.5;">
                        When someone accepts your request, you'll receive an email notification immediately.
                      </p>
                    </div>
                  </div>
                  
                  <!-- Step 3 -->
                  <div style="display: flex; gap: 15px; align-items: flex-start;">
                    <div style="background: #059669; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">3</div>
                    <div>
                      <p style="color: #065f46; margin: 0 0 5px 0; font-weight: 600;">Finalize the Loan</p>
                      <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.5;">
                        Set up your payment method to receive funds and start your repayment journey.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Primary CTA -->
              <a href="${APP_URL}/loan-request/${loanRequest.id}?token=${accessToken}" 
                style="display: block; background: linear-gradient(to right, #059669, #047857); 
                        color: white; text-decoration: none; padding: 18px 32px; border-radius: 8px; 
                        font-weight: 600; text-align: center; margin: 24px 0; font-size: 16px;
                        box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                View & Share Your Request →
              </a>
              
              <!-- Tip box -->
              <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #86efac;">
                <div style="display: flex; gap: 12px; align-items: flex-start;">
                  <div style="color: #059669; font-size: 20px; flex-shrink: 0;">💡</div>
                  <div>
                    <p style="color: #065f46; margin: 0 0 8px 0; font-weight: 600;">Sharing Tip</p>
                    <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.5;">
                      Share your loan request link with people you trust. The more people see it, the faster you'll find a lender!
                    </p>
                  </div>
                </div>
              </div>
              
              <!-- Additional options -->
              <div style="display: flex; gap: 15px; margin-top: 20px; flex-wrap: wrap;">
                <a href="${APP_URL}/loans" 
                  style="display: inline-block; background: white; 
                          color: #059669; text-decoration: none; padding: 12px 24px; border-radius: 8px; 
                          font-weight: 500; text-align: center; font-size: 14px; border: 1px solid #059669;
                          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.1); transition: all 0.2s ease;
                          flex: 1; min-width: 150px;"
                  onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 8px rgba(5, 150, 105, 0.15)';this.style.background='#f0fdf4';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 6px rgba(5, 150, 105, 0.1)';this.style.background='white';">
                  View All Loans
                </a>
                
                <a href="${APP_URL}/help/loan-process" 
                  style="display: inline-block; background: white; 
                          color: #059669; text-decoration: none; padding: 12px 24px; border-radius: 8px; 
                          font-weight: 500; text-align: center; font-size: 14px; border: 1px solid #059669;
                          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.1); transition: all 0.2s ease;
                          flex: 1; min-width: 150px;"
                  onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 8px rgba(5, 150, 105, 0.15)';this.style.background='#f0fdf4';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 6px rgba(5, 150, 105, 0.1)';this.style.background='white';">
                  How It Works
                </a>
              </div>
              
              <!-- Footer -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                <p style="margin: 0 0 10px 0;">If you have any questions, just reply to this email.</p>
                <p style="margin: 0; font-size: 13px; color: #047857;">
                  <strong>Note:</strong> This link expires in 7 days.
                </p>
              </div>
            </div>
            
            <!-- Signature -->
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;">Feyza • Loan Request System</p>
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
