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
                <div style="background: #10b981; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0;">💰 Payment Received</h1>
                </div>
                
                <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0;">
                  <p style="font-size: 16px;">Hi ${lenderName},</p>
                  
                  <p>Your borrower has recorded a payment of <strong>${loan.currency} ${scheduleItem.amount}</strong>.</p>
                  
                  ${note ? `<p style="background: white; padding: 12px; border-radius: 8px; border-left: 4px solid #10b981;"><em>"${note}"</em></p>` : ''}
                  
                  <p>Please confirm this payment in your LoanTrack dashboard.</p>
                  
                  <a href="${APP_URL}/loans/${loan.id}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin: 20px 0;">
                    View Loan & Confirm →
                  </a>
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
