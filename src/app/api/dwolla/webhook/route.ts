import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyWebhookSignature, getTransfer } from '@/lib/dwolla';
import { sendEmail } from '@/lib/email';
import { format } from 'date-fns';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Dwolla Webhook Events we care about
type DwollaEvent = 
  | 'transfer_created'
  | 'transfer_pending'
  | 'transfer_processed'
  | 'transfer_failed'
  | 'transfer_cancelled'
  | 'customer_transfer_created'
  | 'customer_transfer_completed'
  | 'customer_transfer_failed'
  | 'customer_transfer_cancelled';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-request-signature-sha-256') || '';
    
    // Verify webhook signature in production
    const webhookSecret = process.env.DWOLLA_WEBHOOK_SECRET;
    if (webhookSecret) {
      const isValid = verifyWebhookSignature(body, signature, webhookSecret);
      if (!isValid) {
        console.error('[Dwolla Webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(body);
    const { topic, _links, created } = payload;
    
    console.log(`[Dwolla Webhook] Received event: ${topic}`);
    console.log('[Dwolla Webhook] Payload:', JSON.stringify(payload, null, 2));

    // Get the resource URL (transfer URL)
    const resourceUrl = _links?.resource?.href;
    if (!resourceUrl) {
      console.log('[Dwolla Webhook] No resource URL in payload');
      return NextResponse.json({ received: true });
    }

    // Extract transfer ID from URL
    const transferId = resourceUrl.split('/').pop();
    if (!transferId) {
      console.log('[Dwolla Webhook] Could not extract transfer ID');
      return NextResponse.json({ received: true });
    }

    const supabase = await createServiceRoleClient();

    // Handle transfer events
    if (topic.includes('transfer')) {
      await handleTransferEvent(supabase, topic, transferId, resourceUrl);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('[Dwolla Webhook] Error:', error);
    // Always return 200 to Dwolla to prevent retries for parsing errors
    return NextResponse.json({ received: true, error: error.message });
  }
}

async function handleTransferEvent(
  supabase: any, 
  topic: string, 
  transferId: string,
  resourceUrl: string
) {
  // Map Dwolla event to our status
  let newStatus: string;
  
  switch (topic) {
    case 'transfer_created':
    case 'customer_transfer_created':
      newStatus = 'pending';
      break;
    case 'transfer_pending':
      newStatus = 'pending';
      break;
    case 'transfer_processed':
    case 'customer_transfer_completed':
      newStatus = 'processed';
      break;
    case 'transfer_failed':
    case 'customer_transfer_failed':
      newStatus = 'failed';
      break;
    case 'transfer_cancelled':
    case 'customer_transfer_cancelled':
      newStatus = 'cancelled';
      break;
    default:
      console.log(`[Dwolla Webhook] Unhandled topic: ${topic}`);
      return;
  }

  console.log(`[Dwolla Webhook] Updating transfer ${transferId} to status: ${newStatus}`);

  // Find transfer in our database
  const { data: transfer, error: findError } = await supabase
    .from('transfers')
    .select('*, loan:loans(*)')
    .eq('dwolla_transfer_id', transferId)
    .single();

  if (findError || !transfer) {
    console.log(`[Dwolla Webhook] Transfer ${transferId} not found in database`);
    return;
  }

  // Update transfer status
  const { error: updateError } = await supabase
    .from('transfers')
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('dwolla_transfer_id', transferId);

  if (updateError) {
    console.error('[Dwolla Webhook] Error updating transfer:', updateError);
    return;
  }

  console.log(`[Dwolla Webhook] Transfer ${transferId} updated to ${newStatus}`);

  const loan = transfer.loan;
  if (!loan) return;

  // Handle specific status changes
  if (newStatus === 'processed') {
    await handleTransferProcessed(supabase, transfer, loan);
  } else if (newStatus === 'failed') {
    await handleTransferFailed(supabase, transfer, loan);
  }
}

async function handleTransferProcessed(supabase: any, transfer: any, loan: any) {
  console.log(`[Dwolla Webhook] Transfer processed: ${transfer.type} for loan ${loan.id}`);

  if (transfer.type === 'disbursement') {
    // Update loan disbursement status
    await supabase
      .from('loans')
      .update({
        disbursement_status: 'completed',
        funds_sent: true,
      })
      .eq('id', loan.id);

    // Notify borrower that funds have arrived
    const borrowerEmail = loan.borrower_invite_email;
    if (borrowerEmail) {
      try {
        await sendEmail({
          to: borrowerEmail,
          subject: '✅ Loan Funds Have Arrived!',
          html: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #10b981; font-size: 28px; margin: 0;">Feyza</h1>
                  </div>
                  
                  <div style="background: white; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0;">
                    <div style="text-align: center; margin-bottom: 20px;">
                      <div style="width: 60px; height: 60px; background: #d1fae5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="font-size: 28px;">✅</span>
                      </div>
                    </div>
                    
                    <h2 style="color: #065f46; text-align: center; margin-bottom: 20px;">Funds Have Arrived!</h2>
                    
                    <p style="font-size: 16px; color: #374151;">Hi ${loan.borrower_name || 'there'},</p>
                    
                    <p style="color: #374151;">
                      Great news! The loan funds from <strong>${loan.lender_name || 'your lender'}</strong> have been deposited into your bank account.
                    </p>
                    
                    <div style="background: #d1fae5; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
                      <p style="color: #065f46; margin: 0; font-size: 28px; font-weight: bold;">
                        $${loan.amount.toLocaleString()}
                      </p>
                      <p style="color: #047857; margin: 8px 0 0 0; font-size: 14px;">
                        Successfully deposited
                      </p>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px;">
                      Your first payment of <strong>$${loan.repayment_amount?.toFixed(2) || '0.00'}</strong> is due on <strong>${loan.start_date ? format(new Date(loan.start_date), 'MMMM d, yyyy') : 'TBD'}</strong>.
                    </p>
                    
                    <a href="${APP_URL}/borrower/${loan.borrower_access_token}" style="display: block; background: #10b981; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-align: center; margin-top: 24px;">
                      View Loan Details →
                    </a>
                  </div>
                </div>
              </body>
            </html>
          `,
        });
        console.log(`[Dwolla Webhook] Sent funds arrived email to ${borrowerEmail}`);
      } catch (emailErr) {
        console.error('[Dwolla Webhook] Failed to send funds arrived email:', emailErr);
      }
    }

    // Also notify lender
    const lenderEmail = loan.lender_email;
    if (lenderEmail) {
      try {
        await sendEmail({
          to: lenderEmail,
          subject: '✅ Loan Disbursement Complete',
          html: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #10b981; font-size: 28px; margin: 0;">Feyza</h1>
                  </div>
                  
                  <div style="background: white; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0;">
                    <div style="text-align: center; margin-bottom: 20px;">
                      <div style="width: 60px; height: 60px; background: #d1fae5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="font-size: 28px;">✅</span>
                      </div>
                    </div>
                    
                    <h2 style="color: #065f46; text-align: center; margin-bottom: 20px;">Disbursement Complete</h2>
                    
                    <p style="font-size: 16px; color: #374151;">Hi ${loan.lender_name || 'there'},</p>
                    
                    <p style="color: #374151;">
                      The loan funds have been successfully transferred to <strong>${loan.borrower_name || 'the borrower'}</strong>.
                    </p>
                    
                    <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                      <p style="color: #374151; margin: 0;">
                        <strong>Amount:</strong> $${loan.amount.toLocaleString()}<br>
                        <strong>Status:</strong> ✅ Deposited
                      </p>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px;">
                      Repayments will begin on ${loan.start_date ? format(new Date(loan.start_date), 'MMMM d, yyyy') : 'the scheduled start date'}.
                    </p>
                    
                    <a href="${APP_URL}/lender/${loan.invite_token}" style="display: block; background: #10b981; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-align: center; margin-top: 24px;">
                      View Loan Dashboard →
                    </a>
                  </div>
                </div>
              </body>
            </html>
          `,
        });
        console.log(`[Dwolla Webhook] Sent disbursement complete email to ${lenderEmail}`);
      } catch (emailErr) {
        console.error('[Dwolla Webhook] Failed to send disbursement complete email:', emailErr);
      }
    }

  } else if (transfer.type === 'repayment') {
    // Repayment processed - already handled in auto-pay, but update status if needed
    console.log(`[Dwolla Webhook] Repayment processed for loan ${loan.id}`);
  }
}

async function handleTransferFailed(supabase: any, transfer: any, loan: any) {
  console.log(`[Dwolla Webhook] Transfer failed: ${transfer.type} for loan ${loan.id}`);

  if (transfer.type === 'disbursement') {
    // Update loan disbursement status
    await supabase
      .from('loans')
      .update({
        disbursement_status: 'failed',
      })
      .eq('id', loan.id);

    // Notify lender
    const lenderEmail = loan.lender_email;
    if (lenderEmail) {
      try {
        await sendEmail({
          to: lenderEmail,
          subject: '❌ Loan Disbursement Failed',
          html: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #10b981; font-size: 28px; margin: 0;">Feyza</h1>
                  </div>
                  
                  <div style="background: white; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0;">
                    <div style="text-align: center; margin-bottom: 20px;">
                      <div style="width: 60px; height: 60px; background: #fee2e2; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="font-size: 28px;">❌</span>
                      </div>
                    </div>
                    
                    <h2 style="color: #dc2626; text-align: center; margin-bottom: 20px;">Disbursement Failed</h2>
                    
                    <p style="font-size: 16px; color: #374151;">Hi ${loan.lender_name || 'there'},</p>
                    
                    <p style="color: #374151;">
                      Unfortunately, the loan disbursement to <strong>${loan.borrower_name || 'the borrower'}</strong> could not be completed. This is usually due to insufficient funds or an issue with the bank account.
                    </p>
                    
                    <div style="background: #fee2e2; padding: 16px; border-radius: 8px; margin: 20px 0;">
                      <p style="color: #991b1b; margin: 0;">
                        <strong>Amount:</strong> $${loan.amount.toLocaleString()}<br>
                        <strong>Status:</strong> ❌ Failed
                      </p>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px;">
                      Please check your bank account and try again, or contact support if the issue persists.
                    </p>
                    
                    <a href="${APP_URL}/lender/${loan.invite_token}" style="display: block; background: #10b981; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-align: center; margin-top: 24px;">
                      View Loan Dashboard →
                    </a>
                  </div>
                </div>
              </body>
            </html>
          `,
        });
      } catch (emailErr) {
        console.error('[Dwolla Webhook] Failed to send disbursement failed email:', emailErr);
      }
    }
  }
}

// GET endpoint for webhook verification (Dwolla sends a GET to verify the URL)
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok', message: 'Dwolla webhook endpoint active' });
}
