import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { onPaymentCompleted } from '@/lib/payments';

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
        sender_batch_id: `Feyza_${Date.now()}`,
        email_subject: 'Feyza Payment',
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
      `Feyza payment for loan ${loan.id}`
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

    // Update Trust Score
    if (loan.borrower_id) {
      try {
        await onPaymentCompleted({
          supabase,
          loanId: loan.id,
          borrowerId: loan.borrower_id,
          paymentId: payment?.id,
          scheduleId: scheduleId,
          amount: scheduleItem.amount,
          dueDate: scheduleItem.due_date,
          paymentMethod: 'paypal',
        });
        console.log('[PayPal] ✅ Trust score updated');
      } catch (trustError) {
        console.error('[PayPal] Trust score update failed:', trustError);
      }
    }

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
      <!-- Header with logo and gradient -->
      <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <!-- Logo -->
        <div style="margin-bottom: 15px;">
          <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
              alt="Feyza Logo" 
              style="height: 40px; width: auto; filter: brightness(0) invert(1);">
        </div>
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">✅ Payment Processed Successfully</h1>
      </div>
      
      <!-- Main content -->
      <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
        <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${recipientName}! 👋</p>
        
        <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">Your automatic payment has been processed successfully.</p>
        
        <!-- Payment amount card -->
        <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
          <p style="color: #047857; margin: 0 0 10px 0; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; font-size: 14px;">Amount Charged</p>
          <span style="font-weight: bold; font-size: 36px; color: #059669; display: block; margin: 10px 0;">${currency} ${amount.toLocaleString()}</span>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 14px;">Payment Date: ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>
        
        <!-- Payment status -->
        ${isCompleted ? `
          <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center; border: 1px solid #86efac;">
            <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
            <p style="color: #065f46; font-weight: 600; margin: 0 0 10px 0; font-size: 18px;">Congratulations!</p>
            <p style="color: #166534; margin: 0; line-height: 1.5;">Your loan is now fully paid off! Well done on completing your repayment journey.</p>
          </div>
        ` : `
          <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5,150,105,0.1);">
            <h3 style="color: #065f46; margin: 0 0 15px 0; font-weight: 600; font-size: 18px;">Payment Summary</h3>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #6b7280;">Remaining Balance:</span>
              <span style="color: #059669; font-weight: 600; font-size: 18px;">${currency} ${remainingAmount.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0;">
              <span style="color: #6b7280;">Progress:</span>
              <span style="color: #059669; font-weight: 600;">${Math.round((amount / (amount + remainingAmount)) * 100)}% Complete</span>
            </div>
          </div>
        `}
        
        <!-- CTA Button -->
        <a href="${APP_URL}/loans/${loanId}" 
          style="display: block; background: linear-gradient(to right, #059669, #047857); 
                  color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                  font-weight: 600; text-align: center; margin: 30px 0; font-size: 16px;
                  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
          onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
          onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
          View Loan Details →
        </a>
        
        <!-- Next payment info (only if loan is ongoing) -->
        ${!isCompleted ? `
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #d1d5db;">
            <p style="color: #4b5563; margin: 0; font-size: 14px; text-align: center;">
              <strong>Next Payment:</strong> Your next automatic payment is scheduled for the same date next month.
            </p>
          </div>
        ` : ''}
        
        <!-- Help section -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0;">
          <p style="color: #047857; font-size: 14px; margin: 0 0 10px 0;">Questions about this payment?</p>
          <p style="margin: 0;">
            <a href="${APP_URL}/help/payments" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px; font-size: 14px;">
              Payment Help Center
            </a>
            <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500; font-size: 14px;">
              Contact Support
            </a>
          </p>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
        <p style="margin: 0;">Feyza • Simple loan tracking for everyone</p>
        <p style="margin: 5px 0 0 0; font-size: 11px;">This is an automated payment confirmation email</p>
      </div>
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
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
      <!-- Header with logo -->
      <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <!-- Logo -->
        <div style="margin-bottom: 15px;">
          <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
               alt="Feyza Logo" 
               style="height: 40px; width: auto; filter: brightness(0) invert(1);">
        </div>
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">💰 Payment Received</h1>
        <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">Successfully processed</p>
      </div>
      
      <!-- Content area -->
      <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
        <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${recipientName}! 👋</p>
        
        <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">Great news! You've received a payment from <strong style="color: #059669;">${borrowerName}</strong>.</p>
        
        <!-- Payment amount card -->
        <div style="background: white; padding: 30px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0; text-align: center; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
          <p style="color: #047857; margin: 0 0 10px 0; font-weight: 500; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Amount Received</p>
          <div style="font-weight: bold; font-size: 36px; color: #059669; margin: 15px 0; text-shadow: 0 2px 4px rgba(5, 150, 105, 0.1);">
            ${currency} ${amount.toLocaleString()}
          </div>
          <div style="display: inline-block; background: #dcfce7; color: #065f46; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 500; margin-top: 10px;">
            ✅ Successfully transferred
          </div>
        </div>
        
        <!-- Loan status if completed -->
        ${isCompleted ? `
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);">
            <div style="display: inline-block; background: white; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="color: #059669; font-size: 24px;">✓</span>
            </div>
            <p style="color: white; font-weight: 600; font-size: 18px; margin: 0 0 8px 0;">Loan Fully Repaid! 🎉</p>
            <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 0;">Congratulations! This loan has been completely paid off.</p>
          </div>
        ` : ''}
        
        <!-- Payment details -->
        <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
          <h3 style="color: #065f46; margin: 0 0 15px 0; font-weight: 600; font-size: 18px;">Payment Details</h3>
          <ul style="margin: 0; padding-left: 20px; color: #166534;">
            <li style="margin-bottom: 10px; line-height: 1.6;">Sent via PayPal to your registered account</li>
            <li style="margin-bottom: 10px; line-height: 1.6;">Processing time may vary by payment provider</li>
            <li style="line-height: 1.6;">You will receive a separate confirmation from PayPal</li>
          </ul>
        </div>
        
        <!-- CTA Button -->
        <a href="${APP_URL}/loans/${loanId}" 
           style="display: block; background: linear-gradient(to right, #059669, #047857); 
                  color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                  font-weight: 600; text-align: center; margin: 30px 0; font-size: 16px;
                  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
           onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
           onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
          View Loan Details →
        </a>
        
        <!-- Additional actions -->
        <div style="display: flex; gap: 15px; margin: 20px 0; flex-wrap: wrap;">
          <a href="${APP_URL}/transactions" 
             style="display: inline-block; flex: 1; background: white; color: #059669; text-decoration: none; 
                    padding: 14px 20px; border-radius: 8px; font-weight: 500; text-align: center; 
                    border: 2px solid #059669; min-width: 180px; font-size: 14px;"
             onmouseover="this.style.background='#f0fdf4';"
             onmouseout="this.style.background='white';">
            View All Transactions
          </a>
          <a href="${APP_URL}/dashboard" 
             style="display: inline-block; flex: 1; background: white; color: #059669; text-decoration: none; 
                    padding: 14px 20px; border-radius: 8px; font-weight: 500; text-align: center; 
                    border: 2px solid #059669; min-width: 180px; font-size: 14px;"
             onmouseover="this.style.background='#f0fdf4';"
             onmouseout="this.style.background='white';">
            Go to Dashboard
          </a>
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
          <p style="margin: 0 0 10px 0;">Need help with this transaction?</p>
          <p style="margin: 0;">
            <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
              Contact Support
            </a>
            <a href="${APP_URL}/help/payments" style="color: #059669; text-decoration: none; font-weight: 500;">
              Payment FAQ
            </a>
          </p>
        </div>
      </div>
      
      <!-- Signature -->
      <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
        <p style="margin: 0;">Feyza • Secure Payment Processing</p>
        <p style="margin: 5px 0 0 0; font-size: 11px; color: #9ca3af;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    </body>
  </html>
`;
}
