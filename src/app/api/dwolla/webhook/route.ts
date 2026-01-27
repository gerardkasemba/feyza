import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/dwolla';
import { sendEmail, getDisbursementFailedEmail, getFundsArrivedEmail } from '@/lib/email';
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
  // NOTE: Database constraint allows: 'pending', 'processing', 'completed', 'failed', 'cancelled'
  let newStatus: string;
  
  if (COMPLETED_EVENTS.includes(topic)) {
    newStatus = 'completed';  // Changed from 'processed' to match DB constraint
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
      processed_at: newStatus === 'completed' ? new Date().toISOString() : null,
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
  if (newStatus === 'completed') {
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
        const failedEmail = getDisbursementFailedEmail({
          lenderName: loan.lender_name || 'Lender',
          borrowerName: loan.borrower_name || 'Borrower',
          amount: loan.amount,
          currency: loan.currency,
          loanId: loan.id,
          errorMessage: 'The bank transfer could not be completed.',
        });
        await sendEmail({
          to: loan.lender_email,
          subject: failedEmail.subject,
          html: failedEmail.html,
        });
      } catch (e) {
        console.error('[Dwolla Webhook] Failed to send failure email:', e);
      }
    }
  }
}

async function sendFundsArrivedEmails(loan: any) {
  // Extract names and emails from loan
  const borrowerName = loan.borrower_name || loan.borrower_invite_email?.split('@')[0] || 'Borrower';
  const borrowerEmail = loan.borrower_invite_email || loan.borrower_email;
  const lenderName = loan.lender_name || 'Lender';
  
  // Email to borrower
  if (borrowerEmail) {
    try {
      const arrivedEmail = getFundsArrivedEmail({
        borrowerName: borrowerName,
        amount: loan.amount,
        currency: loan.currency,
        loanId: loan.id,
      });
      await sendEmail({
        to: borrowerEmail,
        subject: arrivedEmail.subject,
        html: arrivedEmail.html,
      });
      console.log(`[Dwolla Webhook] ✅ Sent funds arrived email to borrower: ${borrowerEmail}`);
    } catch (e) {
      console.error('[Dwolla Webhook] Failed to send borrower email:', e);
    }
  }

  // Email to lender
  if (loan.lender_email) {
    try {
      await sendEmail({
        to: loan.lender_email,
        subject: 'Loan Disbursement Complete – Feyza',
        html: `
      <!DOCTYPE html>
      <html lang="en">
        <body style="margin:0; padding:0; background:#f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding:40px 16px;">
                
                <!-- Main Card -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.05);">
                  
                  <!-- Header -->
                  <tr>
                    <td align="center" style="background:linear-gradient(135deg,#059669,#047857); padding:32px 24px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="padding-bottom:16px;">
                            <img
                              src="https://feyza.app/feyza.png"
                              alt="Feyza Logo"
                              height="42"
                              style="display:block; height:42px; width:auto; border:0; outline:none; text-decoration:none;"
                            />
                          </td>
                        </tr>
                      </table>

                      <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700;">
                        Disbursement Complete
                      </h1>
                      <p style="margin:8px 0 0; color:rgba(255,255,255,0.9); font-size:15px;">
                        Funds have been successfully released
                      </p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding:32px 28px; color:#111827;">
                      <p style="margin:0 0 14px;">
                        Hi <strong>${loan.lender_name || 'there'}</strong>,
                      </p>

                      <p style="margin:0 0 18px; line-height:1.6; color:#374151;">
                        The loan funds have been successfully transferred to
                        <strong>${loan.borrower_name || 'the borrower'}</strong>.
                      </p>

                      <!-- Summary Box -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; margin:24px 0;">
                        <tr>
                          <td style="padding:16px 18px; font-size:15px; color:#065f46;">
                            <p style="margin:0 0 6px;">
                              <strong>Amount:</strong> $${loan.amount?.toLocaleString()}
                            </p>
                            <p style="margin:0;">
                              <strong>Status:</strong> ✅ Deposited
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 22px; line-height:1.6; color:#374151;">
                        Repayments will begin on
                        <strong>
                          ${loan.start_date
                            ? format(new Date(loan.start_date), 'MMMM d, yyyy')
                            : 'the scheduled start date'}
                        </strong>.
                      </p>

                      <!-- CTA -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center">
                            <a
                              href="${APP_URL}/lender/${loan.invite_token}"
                              style="display:inline-block; background:#059669; color:#ffffff; padding:14px 32px; border-radius:10px; text-decoration:none; font-weight:600; font-size:15px;"
                            >
                              View Loan Dashboard
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" style="background:#f9fafb; padding:20px 24px; border-top:1px solid #e5e7eb;">
                      <p style="margin:0; font-size:12px; color:#6b7280;">
                        This is an automated message from Feyza.
                      </p>
                      <p style="margin:6px 0 0; font-size:12px; color:#9ca3af;">
                        © ${new Date().getFullYear()} Feyza
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
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
