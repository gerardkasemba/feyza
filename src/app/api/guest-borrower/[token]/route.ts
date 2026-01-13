import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// GET: Fetch loan data for guest borrower
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find loan with this borrower access token
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        amount,
        amount_paid,
        amount_remaining,
        currency,
        interest_rate,
        interest_type,
        total_interest,
        total_amount,
        status,
        purpose,
        start_date,
        repayment_frequency,
        repayment_amount,
        total_installments,
        funds_sent,
        borrower_payment_method,
        borrower_payment_username,
        borrower_access_token_expires,
        lender_paypal_email,
        lender_cashapp_username,
        lender_venmo_username,
        lender_preferred_payment_method,
        lender:users!lender_id(
          full_name,
          email,
          paypal_email,
          cashapp_username,
          venmo_username,
          preferred_payment_method
        ),
        business_lender:business_profiles!business_lender_id(
          business_name,
          paypal_email,
          cashapp_username,
          venmo_username,
          preferred_payment_method
        ),
        schedule:payment_schedule(
          id,
          due_date,
          amount,
          principal_amount,
          interest_amount,
          is_paid,
          status,
          payment_id
        )
      `)
      .eq('borrower_access_token', token)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Invalid or expired access link' }, { status: 404 });
    }

    // Check if token has expired
    if (loan.borrower_access_token_expires) {
      const expiresAt = new Date(loan.borrower_access_token_expires);
      if (expiresAt < new Date()) {
        return NextResponse.json({ error: 'Access link has expired. Please request a new one.' }, { status: 401 });
      }
    }

    // Sort schedule by due date
    if (loan.schedule) {
      loan.schedule.sort((a: any, b: any) => 
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      );
    }

    return NextResponse.json({ loan });

  } catch (error) {
    console.error('Guest borrower GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update borrower payment method
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { token } = await params;
    const body = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Verify token and get loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('id, borrower_access_token_expires')
      .eq('borrower_access_token', token)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Invalid access link' }, { status: 404 });
    }

    // Check expiry
    if (loan.borrower_access_token_expires) {
      const expiresAt = new Date(loan.borrower_access_token_expires);
      if (expiresAt < new Date()) {
        return NextResponse.json({ error: 'Access link has expired' }, { status: 401 });
      }
    }

    const { action, payment_method, payment_username } = body;

    if (action === 'set_payment_method') {
      if (!payment_method || !payment_username) {
        return NextResponse.json({ error: 'Payment method and username are required' }, { status: 400 });
      }

      const { error: updateError } = await supabase
        .from('loans')
        .update({
          borrower_payment_method: payment_method,
          borrower_payment_username: payment_username,
        })
        .eq('id', loan.id);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({ success: true, message: 'Payment method saved' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Guest borrower PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Record a payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { token } = await params;
    const body = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Verify token and get loan
    const { data: loanData, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        currency,
        borrower_access_token_expires,
        lender_id,
        business_lender_id,
        lender:users!lender_id(email, full_name),
        business_lender:business_profiles!business_lender_id(contact_email, business_name)
      `)
      .eq('borrower_access_token', token)
      .single();

    if (loanError || !loanData) {
      return NextResponse.json({ error: 'Invalid access link' }, { status: 404 });
    }

    // Cast to proper types
    const loan = loanData as any;

    // Check expiry
    if (loan.borrower_access_token_expires) {
      const expiresAt = new Date(loan.borrower_access_token_expires);
      if (expiresAt < new Date()) {
        return NextResponse.json({ error: 'Access link has expired' }, { status: 401 });
      }
    }

    const { action, schedule_id, note } = body;

    if (action === 'record_payment') {
      if (!schedule_id) {
        return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
      }

      // Get the schedule item
      const { data: scheduleItem, error: scheduleError } = await supabase
        .from('payment_schedule')
        .select('*')
        .eq('id', schedule_id)
        .eq('loan_id', loan.id)
        .single();

      if (scheduleError || !scheduleItem) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      if (scheduleItem.is_paid) {
        return NextResponse.json({ error: 'Payment already recorded' }, { status: 400 });
      }

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          loan_id: loan.id,
          schedule_id: schedule_id,
          amount: scheduleItem.amount,
          status: 'pending', // Needs lender confirmation
          note: note || 'Payment recorded by borrower',
        })
        .select()
        .single();

      if (paymentError) {
        throw paymentError;
      }

      // Update schedule item
      await supabase
        .from('payment_schedule')
        .update({
          is_paid: true,
          payment_id: payment.id,
          status: 'pending',
        })
        .eq('id', schedule_id);

      // Update loan amounts
      const { data: updatedSchedules } = await supabase
        .from('payment_schedule')
        .select('amount')
        .eq('loan_id', loan.id)
        .eq('is_paid', true);

      const totalPaid = updatedSchedules?.reduce((sum, s) => sum + s.amount, 0) || 0;

      const { data: loanData } = await supabase
        .from('loans')
        .select('amount')
        .eq('id', loan.id)
        .single();

      await supabase
        .from('loans')
        .update({
          amount_paid: totalPaid,
          amount_remaining: (loanData?.amount || 0) - totalPaid,
        })
        .eq('id', loan.id);

      // Notify lender
      const lenderEmail = loan.lender?.email || loan.business_lender?.contact_email;
      const lenderName = loan.lender?.full_name || loan.business_lender?.business_name || 'Lender';

      if (lenderEmail) {
        await sendEmail({
          to: lenderEmail,
          subject: '💰 Payment Received - Confirmation Needed',
          html: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <!-- Header with logo and gradient -->
                <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                  <!-- Logo -->
                  <div style="margin-bottom: 15px;">
                    <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                        alt="Feyza Logo" 
                        style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                  </div>
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">💰 Payment Received</h1>
                  <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">Confirmation Required</p>
                </div>
                
                <!-- Main content area -->
                <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                  <p style="font-size: 18px; color: #166534; margin-bottom: 25px; line-height: 1.5;">Hi ${lenderName},</p>
                  
                  <!-- Payment information card -->
                  <div style="background: white; padding: 25px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                    <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">Payment Recorded</h3>
                    
                    <div style="display: flex; align-items: center; background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #86efac;">
                      <div style="flex: 1;">
                        <p style="margin: 0 0 8px 0; color: #047857; font-size: 14px; font-weight: 500;">Payment Amount</p>
                        <p style="margin: 0; color: #059669; font-size: 28px; font-weight: 700;">${loan.currency} ${scheduleItem.amount}</p>
                      </div>
                      <div style="flex-shrink: 0; background: #059669; color: white; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                        Awaiting Confirmation
                      </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                      <p style="margin: 0 0 8px 0; color: #065f46; font-weight: 600;">Loan Details</p>
                      <p style="margin: 0; color: #166534;">Loan ID: <span style="font-weight: 500;">${loan.id}</span></p>
                      ${loan.borrower ? `<p style="margin: 8px 0 0 0; color: #166534;">Borrower: <span style="font-weight: 500;">${loan.borrower.full_name || loan.borrower.email}</span></p>` : ''}
                    </div>
                    
                    ${note ? `
                    <!-- Payment note -->
                    <div style="background: #f0fdf4; padding: 18px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #059669;">
                      <p style="margin: 0 0 6px 0; color: #065f46; font-weight: 600; font-size: 14px;">📝 Payment Note</p>
                      <p style="margin: 0; color: #166534; font-style: italic; line-height: 1.5;">"${note}"</p>
                    </div>
                    ` : ''}
                  </div>
                  
                  <!-- Action required section -->
                  <div style="background: #fef3c7; padding: 20px; border-radius: 10px; margin: 25px 0; border: 1px solid #fbbf24;">
                    <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 18px; font-weight: 600;">⚠️ Action Required</h3>
                    <p style="margin: 0; color: #92400e; line-height: 1.6; font-size: 15px;">
                      Please verify this payment and confirm it in your Feyza dashboard to update the loan status.
                    </p>
                  </div>
                  
                  <!-- CTA Buttons -->
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${APP_URL}/loans/${loan.id}" 
                      style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                              color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; 
                              font-weight: 600; text-align: center; font-size: 16px; margin-bottom: 15px;
                              box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                      onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                      Review & Confirm Payment →
                    </a>
                    
                    <p style="color: #047857; font-size: 14px; margin: 10px 0 0 0;">
                      Expected confirmation: <strong style="color: #059669;">Within 48 hours</strong>
                    </p>
                  </div>
                  
                  <!-- Help information -->
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #bbf7d0;">
                    <h4 style="margin: 0 0 10px 0; color: #065f46; font-size: 16px; font-weight: 600;">🔍 What to Check:</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #166534; font-size: 14px;">
                      <li style="margin-bottom: 8px;">Verify the payment amount matches your records</li>
                      <li style="margin-bottom: 8px;">Check the payment date and method</li>
                      <li style="margin-bottom: 8px;">Review any attached payment proof or documentation</li>
                      <li>Contact your borrower if you need clarification</li>
                    </ul>
                  </div>
                  
                  <!-- Footer -->
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                    <p style="margin: 0 0 10px 0;">Need help with payment confirmation?</p>
                    <p style="margin: 0;">
                      <a href="${APP_URL}/help/payment-confirmation" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                        Payment Guide
                      </a>
                      <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                        Contact Support
                      </a>
                    </p>
                  </div>
                </div>
                
                <!-- Signature -->
                <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                  <p style="margin: 0;">Feyza • Secure Payment Processing</p>
                </div>
              </body>
            </html>
          `,
        });
      }

      // Also create notification for lender if they have an account
      if (loan.lender_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: loan.lender_id,
            type: 'payment_received',
            title: 'Payment Received',
            message: `Your borrower has recorded a payment of ${loan.currency} ${scheduleItem.amount}. Please confirm.`,
            loan_id: loan.id,
          });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Payment recorded successfully',
        payment_id: payment.id,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Guest borrower POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
