import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/dwolla';
import { sendEmail } from '@/lib/email';
import { format } from 'date-fns';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Dwolla webhook events - from https://developers.dwolla.com/docs/webhook-events
// Bank transfers (verified customers moving money to/from bank)
const BANK_TRANSFER_COMPLETED = 'customer_bank_transfer_completed';
const BANK_TRANSFER_CREATED = 'customer_bank_transfer_created';
const BANK_TRANSFER_FAILED = 'customer_bank_transfer_failed';
const BANK_TRANSFER_CANCELLED = 'customer_bank_transfer_cancelled';

// Balance transfers (between balances or unverified customers)
const TRANSFER_COMPLETED = 'customer_transfer_completed';
const TRANSFER_CREATED = 'customer_transfer_created';
const TRANSFER_FAILED = 'customer_transfer_failed';
const TRANSFER_CANCELLED = 'customer_transfer_cancelled';

// Group events by resulting status
const COMPLETED_EVENTS = [BANK_TRANSFER_COMPLETED, TRANSFER_COMPLETED];
const CREATED_EVENTS = [BANK_TRANSFER_CREATED, TRANSFER_CREATED];
const FAILED_EVENTS = [BANK_TRANSFER_FAILED, TRANSFER_FAILED];
const CANCELLED_EVENTS = [BANK_TRANSFER_CANCELLED, TRANSFER_CANCELLED];

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-request-signature-sha-256') || '';
    const topic = request.headers.get('x-dwolla-topic') || '';
    
    console.log('[Dwolla Webhook] ==========================================');
    console.log('[Dwolla Webhook] Received webhook');
    console.log('[Dwolla Webhook] Topic from header:', topic);
    
    // Verify webhook signature
    const webhookSecret = process.env.DWOLLA_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(body, signature, webhookSecret);
      if (!isValid) {
        console.error('[Dwolla Webhook] ❌ Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      console.log('[Dwolla Webhook] ✅ Signature verified');
    } else {
      console.log('[Dwolla Webhook] ⚠️ No signature verification (missing secret or signature)');
    }

    const payload = JSON.parse(body);
    const { topic: payloadTopic, _links, resourceId, id: eventId, created } = payload;
    
    // Use topic from payload (more reliable than header)
    const eventTopic = payloadTopic || topic;
    
    console.log('[Dwolla Webhook] Event ID:', eventId);
    console.log('[Dwolla Webhook] Event topic:', eventTopic);
    console.log('[Dwolla Webhook] Resource ID:', resourceId);
    console.log('[Dwolla Webhook] Created:', created);

    // Get the resource URL (transfer URL)
    const resourceUrl = _links?.resource?.href;
    if (!resourceUrl) {
      console.log('[Dwolla Webhook] No resource URL in payload');
      return NextResponse.json({ received: true });
    }
    console.log('[Dwolla Webhook] Resource URL:', resourceUrl);

    // Extract transfer ID from URL (last segment)
    const transferId = resourceUrl.split('/').pop();
    if (!transferId) {
      console.log('[Dwolla Webhook] Could not extract transfer ID');
      return NextResponse.json({ received: true });
    }
    console.log('[Dwolla Webhook] Transfer ID:', transferId);

    // Only process transfer events
    if (!eventTopic.includes('transfer')) {
      console.log('[Dwolla Webhook] Ignoring non-transfer event:', eventTopic);
      return NextResponse.json({ received: true });
    }

    const supabase = await createServiceRoleClient();
    await handleTransferEvent(supabase, eventTopic, transferId, resourceUrl);

    console.log('[Dwolla Webhook] ==========================================');
    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('[Dwolla Webhook] Error:', error);
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
  
  if (COMPLETED_EVENTS.includes(topic)) {
    newStatus = 'processed';
  } else if (CREATED_EVENTS.includes(topic)) {
    newStatus = 'pending';
  } else if (FAILED_EVENTS.includes(topic)) {
    newStatus = 'failed';
  } else if (CANCELLED_EVENTS.includes(topic)) {
    newStatus = 'cancelled';
  } else {
    console.log(`[Dwolla Webhook] Unknown event topic: ${topic}`);
    return;
  }

  console.log(`[Dwolla Webhook] Event "${topic}" → status "${newStatus}"`);

  // Find transfer in our database by dwolla_transfer_id
  const { data: transfer, error: findError } = await supabase
    .from('transfers')
    .select('*, loan:loans(*)')
    .eq('dwolla_transfer_id', transferId)
    .single();

  if (findError || !transfer) {
    console.log(`[Dwolla Webhook] ❌ Transfer not found in DB: ${transferId}`);
    
    // Debug: show what transfers we have
    const { data: recentTransfers } = await supabase
      .from('transfers')
      .select('id, dwolla_transfer_id, status, type, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    console.log('[Dwolla Webhook] Recent transfers in DB:', JSON.stringify(recentTransfers, null, 2));
    return;
  }

  console.log(`[Dwolla Webhook] Found transfer: ${transfer.id}`);
  console.log(`[Dwolla Webhook] Current status: ${transfer.status}, New status: ${newStatus}`);

  // Skip if status hasn't changed
  if (transfer.status === newStatus) {
    console.log(`[Dwolla Webhook] Status unchanged, skipping`);
    return;
  }

  // Update transfer status
  const { error: updateError } = await supabase
    .from('transfers')
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString(),
      processed_at: newStatus === 'processed' ? new Date().toISOString() : null,
    })
    .eq('id', transfer.id);

  if (updateError) {
    console.error('[Dwolla Webhook] ❌ Error updating transfer:', updateError);
    return;
  }

  console.log(`[Dwolla Webhook] ✅ Transfer updated to "${newStatus}"`);

  const loan = transfer.loan;
  if (!loan) {
    console.log('[Dwolla Webhook] No loan associated with transfer');
    return;
  }

  // Handle status changes for disbursements
  if (newStatus === 'processed') {
    await handleTransferCompleted(supabase, transfer, loan);
  } else if (newStatus === 'failed') {
    await handleTransferFailed(supabase, transfer, loan);
  }
}

async function handleTransferCompleted(supabase: any, transfer: any, loan: any) {
  console.log(`[Dwolla Webhook] Processing completed ${transfer.type} for loan ${loan.id}`);

  if (transfer.type === 'disbursement') {
    // Update loan status
    const { error } = await supabase
      .from('loans')
      .update({
        disbursement_status: 'completed',
        funds_sent: true,
      })
      .eq('id', loan.id);
    
    if (error) {
      console.error('[Dwolla Webhook] ❌ Error updating loan:', error);
    } else {
      console.log(`[Dwolla Webhook] ✅ Loan ${loan.id} updated: disbursement_status=completed, funds_sent=true`);
    }

    // Send email notifications
    await sendFundsArrivedEmails(loan);
  }
}

async function handleTransferFailed(supabase: any, transfer: any, loan: any) {
  console.log(`[Dwolla Webhook] Processing failed ${transfer.type} for loan ${loan.id}`);

  if (transfer.type === 'disbursement') {
    await supabase
      .from('loans')
      .update({ disbursement_status: 'failed' })
      .eq('id', loan.id);
    
    console.log(`[Dwolla Webhook] ✅ Loan ${loan.id} updated: disbursement_status=failed`);

    // Notify lender of failure
    if (loan.lender_email) {
      try {
        await sendEmail({
          to: loan.lender_email,
          subject: '❌ Loan Disbursement Failed - Feyza',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Disbursement Failed</h2>
              <p>The transfer of $${loan.amount?.toLocaleString()} to ${loan.borrower_name || 'the borrower'} could not be completed.</p>
              <p>This is usually due to insufficient funds or a bank account issue.</p>
              <a href="${APP_URL}/lender/${loan.invite_token}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">View Loan</a>
            </div>
          `,
        });
      } catch (e) {
        console.error('[Dwolla Webhook] Failed to send failure email:', e);
      }
    }
  }
}

async function sendFundsArrivedEmails(loan: any) {
  // Email to borrower
  if (loan.borrower_invite_email) {
    try {
      await sendEmail({
        to: loan.borrower_invite_email,
        subject: '✅ Loan Funds Have Arrived! - Feyza',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; padding: 20px;">
              <h1 style="color: #10b981;">✅ Funds Received!</h1>
            </div>
            <p>Hi ${loan.borrower_name || 'there'},</p>
            <p>Great news! <strong>$${loan.amount?.toLocaleString()}</strong> has been deposited into your bank account from ${loan.lender_name || 'your lender'}.</p>
            <div style="background: #d1fae5; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
              <p style="font-size: 28px; font-weight: bold; color: #065f46; margin: 0;">$${loan.amount?.toLocaleString()}</p>
              <p style="color: #047857; margin: 8px 0 0;">Successfully deposited</p>
            </div>
            <p>Your first payment of <strong>$${loan.repayment_amount?.toFixed(2) || '0.00'}</strong> is due on <strong>${loan.start_date ? format(new Date(loan.start_date), 'MMMM d, yyyy') : 'your scheduled date'}</strong>.</p>
            <a href="${APP_URL}/borrower/${loan.borrower_access_token}" style="display: block; background: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; text-align: center; margin-top: 20px;">View Loan Details</a>
          </div>
        `,
      });
      console.log(`[Dwolla Webhook] ✅ Sent funds arrived email to borrower: ${loan.borrower_invite_email}`);
    } catch (e) {
      console.error('[Dwolla Webhook] Failed to send borrower email:', e);
    }
  }

  // Email to lender
  if (loan.lender_email) {
    try {
      await sendEmail({
        to: loan.lender_email,
        subject: '✅ Loan Disbursement Complete - Feyza',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; padding: 20px;">
              <h1 style="color: #10b981;">✅ Disbursement Complete</h1>
            </div>
            <p>Hi ${loan.lender_name || 'there'},</p>
            <p>The loan funds have been successfully transferred to <strong>${loan.borrower_name || 'the borrower'}</strong>.</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Amount:</strong> $${loan.amount?.toLocaleString()}</p>
              <p><strong>Status:</strong> ✅ Deposited</p>
            </div>
            <p>Repayments will begin on ${loan.start_date ? format(new Date(loan.start_date), 'MMMM d, yyyy') : 'the scheduled start date'}.</p>
            <a href="${APP_URL}/lender/${loan.invite_token}" style="display: block; background: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; text-align: center; margin-top: 20px;">View Loan Dashboard</a>
          </div>
        `,
      });
      console.log(`[Dwolla Webhook] ✅ Sent disbursement complete email to lender: ${loan.lender_email}`);
    } catch (e) {
      console.error('[Dwolla Webhook] Failed to send lender email:', e);
    }
  }
}

// GET endpoint for webhook verification
export async function GET() {
  return NextResponse.json({ 
    status: 'active',
    message: 'Dwolla webhook endpoint',
    handled_events: {
      completed: COMPLETED_EVENTS,
      created: CREATED_EVENTS,
      failed: FAILED_EVENTS,
      cancelled: CANCELLED_EVENTS,
    },
  });
}
