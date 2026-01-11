import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Get PayPal access token
async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

// Create PayPal payout (transfer money from borrower to lender)
async function createPayPalPayout(
  accessToken: string,
  senderEmail: string,
  recipientEmail: string,
  amount: number,
  currency: string,
  note: string
) {
  // Note: PayPal Payouts API requires business account and approval
  // This creates a payout batch to transfer funds
  const response = await fetch(`${PAYPAL_API_URL}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: `LoanTrack_${Date.now()}`,
        email_subject: 'LoanTrack Payment',
        email_message: note,
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount.toFixed(2),
            currency: currency,
          },
          receiver: recipientEmail,
          note: note,
          sender_item_id: `payment_${Date.now()}`,
        },
      ],
    }),
  });

  return response.json();
}

// POST: Process automatic payment for a specific loan/schedule item
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for automated calls
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow authenticated users to trigger their own payments
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const { scheduleId, loanId } = body;

    if (!scheduleId || !loanId) {
      return NextResponse.json({ error: 'scheduleId and loanId are required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Get loan details with borrower and lender info
    const { data: loan } = await supabase
      .from('loans')
      .select(`
        *,
        borrower:users!borrower_id(*),
        lender:users!lender_id(*),
        business_lender:business_profiles(*, owner:users!user_id(*))
      `)
      .eq('id', loanId)
      .single();

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Get schedule item
    const { data: scheduleItem } = await supabase
      .from('payment_schedule')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (!scheduleItem) {
      return NextResponse.json({ error: 'Schedule item not found' }, { status: 404 });
    }

    if (scheduleItem.is_paid) {
      return NextResponse.json({ error: 'Payment already made' }, { status: 400 });
    }

    // Check if borrower has PayPal connected
    if (!loan.borrower?.paypal_connected || !loan.borrower?.paypal_email) {
      return NextResponse.json({ error: 'Borrower PayPal not connected' }, { status: 400 });
    }

    // Get lender PayPal email
    let lenderPayPalEmail: string | null = null;
    if (loan.lender_type === 'personal' && loan.lender?.paypal_email) {
      lenderPayPalEmail = loan.lender.paypal_email;
    } else if (loan.lender_type === 'business' && loan.business_lender?.owner?.paypal_email) {
      lenderPayPalEmail = loan.business_lender.owner.paypal_email;
    }

    if (!lenderPayPalEmail) {
      return NextResponse.json({ error: 'Lender PayPal not connected' }, { status: 400 });
    }

    // Process PayPal payment
    const accessToken = await getPayPalAccessToken();
    
    const payoutResult = await createPayPalPayout(
      accessToken,
      loan.borrower.paypal_email,
      lenderPayPalEmail,
      scheduleItem.amount,
      loan.currency,
      `LoanTrack payment for loan ${loan.id}`
    );

    if (payoutResult.error) {
      console.error('PayPal payout error:', payoutResult);
      return NextResponse.json({ error: 'PayPal payment failed', details: payoutResult }, { status: 500 });
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        loan_id: loan.id,
        schedule_id: scheduleId,
        amount: scheduleItem.amount,
        payment_date: new Date().toISOString(),
        status: 'confirmed', // Auto-payments are auto-confirmed
        confirmed_by: loan.lender_id || loan.business_lender?.user_id,
        confirmation_date: new Date().toISOString(),
        note: 'Automatic PayPal payment',
        paypal_transaction_id: payoutResult.batch_header?.payout_batch_id,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
    }

    // Update schedule item
    await supabase
      .from('payment_schedule')
      .update({
        is_paid: true,
        payment_id: payment?.id,
      })
      .eq('id', scheduleId);

    // Update loan totals
    const newAmountPaid = loan.amount_paid + scheduleItem.amount;
    const newAmountRemaining = loan.amount_remaining - scheduleItem.amount;
    const isCompleted = newAmountRemaining <= 0;

    await supabase
      .from('loans')
      .update({
        amount_paid: newAmountPaid,
        amount_remaining: Math.max(0, newAmountRemaining),
        status: isCompleted ? 'completed' : loan.status,
      })
      .eq('id', loan.id);

    // Send confirmation emails
    // To borrower
    await sendEmail({
      to: loan.borrower.email,
      subject: `Payment processed - ${loan.currency} ${scheduleItem.amount}`,
      html: getPaymentProcessedEmail({
        recipientName: loan.borrower.full_name,
        amount: scheduleItem.amount,
        currency: loan.currency,
        loanId: loan.id,
        isCompleted,
        remainingAmount: Math.max(0, newAmountRemaining),
      }),
    });

    // To lender
    const lenderEmail = loan.lender?.email || loan.business_lender?.contact_email || loan.business_lender?.owner?.email;
    const lenderName = loan.lender?.full_name || loan.business_lender?.business_name;
    
    if (lenderEmail) {
      await sendEmail({
        to: lenderEmail,
        subject: `Payment received - ${loan.currency} ${scheduleItem.amount}`,
        html: getPaymentReceivedEmail({
          recipientName: lenderName || 'Lender',
          borrowerName: loan.borrower.full_name,
          amount: scheduleItem.amount,
          currency: loan.currency,
          loanId: loan.id,
          isCompleted,
        }),
      });
    }

    // Create notifications
    await supabase.from('notifications').insert([
      {
        user_id: loan.borrower_id,
        loan_id: loan.id,
        type: 'payment_confirmed',
        title: 'Payment processed',
        message: `Your automatic payment of ${loan.currency} ${scheduleItem.amount} was processed successfully.`,
      },
    ]);

    return NextResponse.json({ 
      success: true, 
      payoutId: payoutResult.batch_header?.payout_batch_id,
      isCompleted,
    });
  } catch (error) {
    console.error('Auto-charge error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Email template for payment processed (borrower)
function getPaymentProcessedEmail(params: {
  recipientName: string;
  amount: number;
  currency: string;
  loanId: string;
  isCompleted: boolean;
  remainingAmount: number;
}) {
  const { recipientName, amount, currency, loanId, isCompleted, remainingAmount } = params;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">✅ Payment Processed</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 18px; margin-bottom: 20px;">Hi ${recipientName}! 👋</p>
          
          <p>Your automatic payment has been processed successfully.</p>
          
          <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; margin: 0 0 10px 0;">Amount Charged</p>
            <span style="font-weight: bold; font-size: 32px; color: #22c55e;">${currency} ${amount.toLocaleString()}</span>
          </div>
          
          ${isCompleted ? `
            <div style="background: #dcfce7; padding: 16px; border-radius: 12px; margin: 20px 0; text-align: center;">
              <p style="color: #166534; font-weight: bold; margin: 0;">🎉 Congratulations! Your loan is now fully paid off!</p>
            </div>
          ` : `
            <p style="color: #6b7280;">Remaining balance: <strong>${currency} ${remainingAmount.toLocaleString()}</strong></p>
          `}
          
          <a href="${APP_URL}/loans/${loanId}" style="display: block; background: #22c55e; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
            View Loan Details →
          </a>
        </div>
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
          Sent via LoanTrack • Simple loan tracking for everyone
        </p>
      </body>
    </html>
  `;
}

// Email template for payment received (lender)
function getPaymentReceivedEmail(params: {
  recipientName: string;
  borrowerName: string;
  amount: number;
  currency: string;
  loanId: string;
  isCompleted: boolean;
}) {
  const { recipientName, borrowerName, amount, currency, loanId, isCompleted } = params;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">💰 Payment Received</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 18px; margin-bottom: 20px;">Hi ${recipientName}! 👋</p>
          
          <p>You've received a payment from <strong>${borrowerName}</strong>.</p>
          
          <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; margin: 0 0 10px 0;">Amount Received</p>
            <span style="font-weight: bold; font-size: 32px; color: #22c55e;">${currency} ${amount.toLocaleString()}</span>
          </div>
          
          ${isCompleted ? `
            <div style="background: #dcfce7; padding: 16px; border-radius: 12px; margin: 20px 0; text-align: center;">
              <p style="color: #166534; font-weight: bold; margin: 0;">✅ This loan has been fully repaid!</p>
            </div>
          ` : ''}
          
          <p style="color: #6b7280; font-size: 14px;">The payment has been sent to your PayPal account.</p>
          
          <a href="${APP_URL}/loans/${loanId}" style="display: block; background: #22c55e; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
            View Loan Details →
          </a>
        </div>
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
          Sent via LoanTrack • Simple loan tracking for everyone
        </p>
      </body>
    </html>
  `;
}
