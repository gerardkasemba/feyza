import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

const PAYMENT_METHOD_NAMES: Record<string, string> = {
  paypal: 'PayPal',
  cashapp: 'Cash App',
  venmo: 'Venmo',
};

// POST: Lender confirms they sent payment to borrower
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const body = await request.json();
    const { method, reference, proof_url } = body;

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = await createServiceRoleClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the loan with all details
    const { data: loan, error: loanError } = await serviceSupabase
      .from('loans')
      .select(`
        *,
        borrower:users!borrower_id(id, email, full_name, paypal_email, cashapp_username, venmo_username),
        lender:users!lender_id(id, email, full_name),
        business_lender:business_profiles!business_lender_id(id, business_name, contact_email, user_id)
      `)
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Verify the user is the lender for this loan
    let isLender = loan.lender_id === user.id;
    if (!isLender && loan.business_lender?.user_id === user.id) {
      isLender = true;
    }

    if (!isLender) {
      return NextResponse.json({ error: 'Only the lender can confirm payment sent' }, { status: 403 });
    }

    // Check if funds already sent
    if (loan.funds_sent) {
      return NextResponse.json({ error: 'Payment already confirmed' }, { status: 400 });
    }

    // Update the loan - mark funds as sent
    const { error: updateError } = await serviceSupabase
      .from('loans')
      .update({
        funds_sent: true,
        funds_sent_at: new Date().toISOString(),
        funds_sent_method: method || 'paypal',
        funds_sent_reference: reference || null,
        funds_sent_proof_url: proof_url || null,
      })
      .eq('id', loanId);

    if (updateError) {
      console.error('Error updating loan:', updateError);
      return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 });
    }

    // Get lender info for emails
    const lenderName = loan.lender?.full_name || loan.business_lender?.business_name || 'Your lender';
    const lenderEmail = loan.lender?.email || loan.business_lender?.contact_email;
    const borrowerEmail = loan.borrower?.email;
    const borrowerName = loan.borrower?.full_name || 'Borrower';
    const paymentMethodName = PAYMENT_METHOD_NAMES[method] || method || 'PayPal';

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Send notification email to BORROWER
    if (borrowerEmail) {
      await sendEmail({
        to: borrowerEmail,
        subject: `💰 Payment Sent via ${paymentMethodName}!`,
        html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <!-- Header with logo and gradient -->
              <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
                <!-- Logo -->
                <div style="margin-bottom: 15px;">
                  <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                      alt="Feyza Logo" 
                      style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                </div>
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">💰 Payment Sent!</h1>
                <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">via ${paymentMethodName}</p>
              </div>
              
              <!-- Content area -->
              <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${borrowerName}! 👋</p>
                
                <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                  <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                    <strong style="color: #059669;">${lenderName}</strong> has sent your loan payment via 
                    <strong style="color: #059669;">${paymentMethodName}</strong>!
                  </p>
                  
                  <!-- Amount display -->
                  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #e6f7ed 100%); padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center; border: 2px dashed #86efac;">
                    <p style="color: #047857; margin: 0 0 5px 0; font-weight: 600; font-size: 14px;">AMOUNT SENT</p>
                    <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0; letter-spacing: -0.5px;">
                      ${loan.currency} ${loan.amount.toLocaleString()}
                    </p>
                    <div style="display: inline-block; background: #dcfce7; padding: 6px 16px; border-radius: 20px; margin: 10px 0;">
                      <p style="color: #065f46; margin: 0; font-weight: 500; font-size: 14px;">
                        via ${paymentMethodName}
                      </p>
                    </div>
                    ${reference ? `
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #bbf7d0;">
                      <p style="color: #047857; margin: 0 0 5px 0; font-size: 13px; font-weight: 500;">REFERENCE</p>
                      <p style="color: #065f46; margin: 0; font-family: 'Monaco', 'Courier New', monospace; font-size: 14px; background: #f0fdf4; padding: 8px 12px; border-radius: 6px; display: inline-block;">
                        ${reference}
                      </p>
                    </div>
                    ` : ''}
                  </div>
                </div>
                
                <!-- Payment Proof Section -->
                ${proof_url ? `
                <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                  <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <div style="background: #059669; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                      <span style="color: white; font-size: 16px;">📸</span>
                    </div>
                    <h3 style="margin: 0; color: #065f46; font-size: 18px; font-weight: 600;">Payment Proof</h3>
                  </div>
                  <img src="${proof_url}" 
                      alt="Payment proof" 
                      style="max-width: 100%; border-radius: 8px; border: 1px solid #bbf7d0; margin-top: 15px;"
                      onerror="this.style.display='none';" />
                  <p style="color: #047857; font-size: 14px; margin: 10px 0 0 0; font-style: italic;">
                    Proof of payment provided by ${lenderName}
                  </p>
                </div>
                ` : ''}
                
                <!-- Next Steps -->
                <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 1px solid #93c5fd; border-radius: 12px; padding: 20px; margin: 20px 0; position: relative;">
                  <div style="position: absolute; top: -12px; left: 20px; background: #3b82f6; color: white; padding: 4px 16px; border-radius: 20px; font-weight: 600; font-size: 14px;">
                    📅 Next Steps
                  </div>
                  <div style="margin-top: 10px;">
                    <p style="margin: 0; color: #1e40af; font-size: 15px; line-height: 1.6;">
                      Check your <strong>${paymentMethodName}</strong> account to confirm receipt. 
                      Your repayment schedule starts on 
                      <strong style="color: #1d4ed8;">${new Date(loan.start_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.
                    </p>
                  </div>
                </div>
                
                <!-- CTA Button -->
                <a href="${APP_URL}/loans/${loan.id}" 
                  style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                          color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                          font-weight: 600; text-align: center; margin: 24px 0; font-size: 16px;
                          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                  onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                  View Loan Details →
                </a>
                
                <!-- Additional Info -->
                <div style="background: #dcfce7; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
                  <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.5;">
                    <strong>💡 Important:</strong> If you don't see the payment in your ${paymentMethodName} account within 24 hours, 
                    please check your transaction history or contact ${paymentMethodName} support directly.
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                  <p style="margin: 0 0 10px 0;">Have questions about this payment?</p>
                  <p style="margin: 0;">
                    <a href="${APP_URL}/loans/${loan.id}/messages" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                      Message ${lenderName}
                    </a>
                    <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                      Contact Support
                    </a>
                  </p>
                </div>
              </div>
              
              <!-- Signature -->
              <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">Feyza • Secure Payment Notification</p>
              </div>
            </body>
          </html>
        `,
      });
    }

    // Send confirmation email to LENDER
    if (lenderEmail) {
      await sendEmail({
        to: lenderEmail,
        subject: '✅ Payment Confirmed!',
        html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <!-- Header with gradient background and logo -->
              <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
                <!-- Logo -->
                <div style="margin-bottom: 20px;">
                  <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                      alt="Feyza Logo" 
                      style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                </div>
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">✅ Payment Confirmed!</h1>
                <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Transaction Successful</p>
              </div>
              
              <!-- Content area -->
              <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${lenderName}! 👋</p>
                
                <p style="color: #166534; line-height: 1.6; margin-bottom: 25px;">Your <strong style="color: #059669;">${paymentMethodName}</strong> payment has been successfully confirmed and processed.</p>
                
                <!-- Payment details card -->
                <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                  <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px; font-weight: 600; text-align: center;">Payment Summary</h3>
                  
                  <div style="text-align: center; margin-bottom: 20px;">
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Amount Sent</p>
                    <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 5px 0; letter-spacing: -0.5px;">
                      ${loan.currency} ${loan.amount.toLocaleString()}
                    </p>
                  </div>
                  
                  <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <span style="color: #6b7280;">To:</span>
                      <span style="color: #065f46; font-weight: 500;">${borrowerName}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <span style="color: #6b7280;">Payment Method:</span>
                      <span style="color: #065f46; font-weight: 500;">${paymentMethodName}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <span style="color: #6b7280;">Status:</span>
                      <span style="color: #059669; font-weight: 500; background: #f0fdf4; padding: 2px 8px; border-radius: 4px;">✅ Confirmed</span>
                    </div>
                    ${reference ? `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                      <span style="color: #6b7280; flex-shrink: 0;">Reference:</span>
                      <span style="color: #065f46; font-weight: 500; text-align: right; font-size: 13px; word-break: break-all; padding-left: 10px;">${reference}</span>
                    </div>
                    ` : ''}
                  </div>
                </div>
                
                <!-- Repayment schedule card -->
                <div style="background: #dcfce7; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #86efac;">
                  <div style="display: flex; align-items: flex-start; gap: 15px;">
                    <div style="background: #059669; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px;">
                      📅
                    </div>
                    <div>
                      <h4 style="margin: 0 0 8px 0; color: #065f46; font-weight: 600;">Expected Repayment Schedule</h4>
                      <p style="margin: 0; color: #166534; font-size: 15px; line-height: 1.5;">
                        <strong>${borrowerName}</strong> will repay <strong>${loan.currency} ${loan.total_amount?.toLocaleString() || loan.amount.toLocaleString()}</strong> 
                        over <strong>${loan.total_installments} ${loan.repayment_frequency}</strong> payments.
                      </p>
                    </div>
                  </div>
                </div>
                
                <!-- Important notes -->
                <div style="background: white; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #fde68a; background: #fffbeb;">
                  <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="color: #92400e; font-size: 14px; flex-shrink: 0;">📌</div>
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                      <strong>Important:</strong> You will receive email notifications for each repayment as they occur.
                    </p>
                  </div>
                </div>
                
                <!-- CTA Button -->
                <a href="${APP_URL}/loans/${loan.id}" 
                  style="display: block; background: linear-gradient(to right, #059669, #047857); 
                          color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                          font-weight: 600; text-align: center; margin: 24px 0; font-size: 16px;
                          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                  onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                  View Loan Details & Repayment Schedule →
                </a>
                
                <!-- Additional actions -->
                <div style="display: flex; gap: 15px; margin-top: 25px; flex-wrap: wrap;">
                  <a href="${APP_URL}/dashboard" 
                    style="display: inline-block; background: white; 
                            color: #059669; text-decoration: none; padding: 12px 24px; border-radius: 8px; 
                            font-weight: 500; text-align: center; font-size: 14px; border: 1px solid #059669;
                            box-shadow: 0 2px 6px rgba(5, 150, 105, 0.1); transition: all 0.2s ease;
                            flex: 1; min-width: 150px;"
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 10px rgba(5, 150, 105, 0.15)';this.style.background='#f0fdf4';"
                    onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 6px rgba(5, 150, 105, 0.1)';this.style.background='white';">
                    Go to Dashboard
                  </a>
                  
                  <a href="${APP_URL}/transactions" 
                    style="display: inline-block; background: white; 
                            color: #059669; text-decoration: none; padding: 12px 24px; border-radius: 8px; 
                            font-weight: 500; text-align: center; font-size: 14px; border: 1px solid #059669;
                            box-shadow: 0 2px 6px rgba(5, 150, 105, 0.1); transition: all 0.2s ease;
                            flex: 1; min-width: 150px;"
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 10px rgba(5, 150, 105, 0.15)';this.style.background='#f0fdf4';"
                    onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 6px rgba(5, 150, 105, 0.1)';this.style.background='white';">
                    View Transactions
                  </a>
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                  <p style="margin: 0;">Questions about this transaction? <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">Contact our support team</a></p>
                </div>
              </div>
              
              <!-- Signature -->
              <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">This is an automated confirmation from Feyza</p>
              </div>
            </body>
          </html>
        `,
      });
    }

    // Create notification for borrower
    await serviceSupabase.from('notifications').insert({
      user_id: loan.borrower_id,
      loan_id: loan.id,
      type: 'loan_accepted',
      title: '💰 Payment Received!',
      message: `${lenderName} has sent you ${loan.currency} ${loan.amount} via ${paymentMethodName}. Check your account!`,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed',
      loan_id: loanId,
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: Get funds status for a loan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = await createServiceRoleClient();
    const { data: loan, error } = await serviceSupabase
      .from('loans')
      .select('id, funds_sent, funds_sent_at, funds_sent_method, funds_sent_reference')
      .eq('id', loanId)
      .single();

    if (error || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    return NextResponse.json({
      funds_sent: loan.funds_sent,
      funds_sent_at: loan.funds_sent_at,
      funds_sent_method: loan.funds_sent_method,
      funds_sent_reference: loan.funds_sent_reference,
    });

  } catch (error) {
    console.error('Error getting funds status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
