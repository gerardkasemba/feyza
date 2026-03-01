import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, SupabaseServiceClient } from '@/lib/supabase/server';
import { createFacilitatedTransfer } from '@/lib/dwolla';
import { 
  sendEmail, 
  getMissedPaymentEmail, 
  getPaymentReceivedLenderEmail, 
  getPaymentProcessedBorrowerEmail,
  getPaymentReceivedGuestLenderEmail 
} from '@/lib/email';
import { onPaymentCompleted, onPaymentMissed } from '@/lib/payments';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';
import type { Loan, PaymentScheduleItem } from '@/types';

/** Payment row pre-joined with its loan (and lender/borrower) from the batch query */
interface PaymentWithLoan extends PaymentScheduleItem {
  loan: Loan & {
    lender?: { id: string; email: string; full_name: string } | null;
    business_lender?: { id: string; contact_email: string; business_name: string } | null;
    borrower?: { id: string; email: string; full_name: string } | null;
    // Dwolla funding sources stored on the loan record
    borrower_dwolla_funding_source_url?: string;
    lender_dwolla_funding_source_url?: string;
    // Convenience fields from DB views / joins
    lender_email?: string;
    lender_name?: string;
    borrower_name?: string;
    borrower_email?: string;
    borrower_invite_email?: string;
    borrower_access_token?: string;
  };
}

const log = logger('auto-pay');

// Next.js 16 route configuration for cron jobs
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for cron execution

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Batch limit: process at most this many payments per cron run to prevent timeouts.
// At ~800ms per payment (DB + Dwolla), 25 payments ≈ 20 seconds, well within the 60s limit.
// Remaining payments will be picked up in the next scheduled run.
const PAYMENT_BATCH_SIZE = 25;

// Concurrency: process this many payments simultaneously within each batch.
// Higher values speed up processing but risk Dwolla rate limits.
const PAYMENT_CONCURRENCY = 5;

// This endpoint should be called by a cron job daily
// Vercel Cron: Add to vercel.json: { "crons": [{ "path": "/api/cron/auto-pay", "schedule": "0 8 * * *" }] }

export async function GET(request: NextRequest) {
  // Verify cron secret in production
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceRoleClient();
    const today = new Date().toISOString().split('T')[0];
    
    log.info(`Processing payments for ${today}`);

    // Find all unpaid payments due today or earlier.
    // Pre-join lender and borrower so per-payment DB lookups are avoided (eliminates N+1).
    const { data: duePayments, error: fetchError } = await supabase
      .from('payment_schedule')
      .select(`
        *,
        loan:loans(
          *,
          lender:users!lender_id(id, email, full_name),
          business_lender:business_profiles!business_lender_id(id, contact_email, business_name),
          borrower:users!borrower_id(id, email, full_name)
        )
      `)
      .eq('is_paid', false)
      .lte('due_date', today)
      .order('due_date', { ascending: true });

    if (fetchError) {
      log.error('[Auto-Pay] Error fetching due payments:', fetchError);
      throw fetchError;
    }

    if (!duePayments || duePayments.length === 0) {
      log.info('[Auto-Pay] No payments due today');
      return NextResponse.json({ 
        success: true, 
        message: 'No payments due',
        processed: 0 
      });
    }

    log.info(`Found ${duePayments.length} payments to process`);

    // Limit this run to PAYMENT_BATCH_SIZE to prevent timeouts.
    // Any remaining payments will be processed in the next scheduled cron run.
    const batch = duePayments.slice(0, PAYMENT_BATCH_SIZE);
    const remainingAfterBatch = duePayments.length - batch.length;

    if (remainingAfterBatch > 0) {
      log.info(`Batch limited to ${PAYMENT_BATCH_SIZE}. ${remainingAfterBatch} payment(s) deferred to next run.`);
    }

    const results = {
      processed: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process payments in concurrent chunks to balance speed vs. DB/API load.
    for (let i = 0; i < batch.length; i += PAYMENT_CONCURRENCY) {
      const chunk = batch.slice(i, i + PAYMENT_CONCURRENCY);
      const chunkResults = await Promise.allSettled(
        chunk.map((payment) => processOnePayment(supabase, payment))
      );

      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          const { outcome } = result.value;
          if (outcome === 'processed') results.processed++;
          else if (outcome === 'failed') results.failed++;
          else results.skipped++;
        } else {
          results.failed++;
          results.errors.push(result.reason?.message || 'Unknown error');
        }
      }
    }

    log.info(`Complete. Processed: ${results.processed}, Failed: ${results.failed}, Skipped: ${results.skipped}${remainingAfterBatch > 0 ? `, Deferred: ${remainingAfterBatch}` : ''}`);

    return NextResponse.json({
      success: true,
      date: today,
      ...results,
      ...(remainingAfterBatch > 0 && { deferred: remainingAfterBatch, note: `${remainingAfterBatch} payment(s) deferred to next cron run` }),
    });

  } catch (error: unknown) {
    log.error('[Auto-Pay] Fatal error:', error);
    const message = error instanceof Error ? (error as Error).message : 'Auto-pay processing failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Process a single payment: validate, transfer, update DB, send emails.
// Returns outcome: 'processed' | 'skipped' | 'failed'
async function processOnePayment(
  supabase: SupabaseServiceClient,
  payment: PaymentWithLoan
): Promise<{ outcome: 'processed' | 'skipped' | 'failed' }> {
  const loan = payment.loan;

  // Skip payments that are already paid
  if (payment.is_paid) {
    log.info(`Payment ${payment.id} already paid, skipping`);
    return { outcome: 'skipped' };
  }

  // Idempotency: skip if a transfer was already initiated for this payment
  if (payment.transfer_id) {
    log.info(`Payment ${payment.id} already has transfer ${payment.transfer_id}, skipping`);
    return { outcome: 'skipped' };
  }

  // Validate Dwolla funding sources — mark missed if not connected
  if (!loan?.borrower_dwolla_funding_source_url) {
    await handleMissedPayment(supabase, payment, loan, 'Borrower has not connected their bank account');
    return { outcome: 'skipped' };
  }

  if (!loan?.lender_dwolla_funding_source_url) {
    await handleMissedPayment(supabase, payment, loan, 'Lender has not connected their bank account');
    return { outcome: 'skipped' };
  }

  // Initiate Dwolla facilitated transfer with platform fee
  const { transferUrl, transferIds, feeInfo } = await createFacilitatedTransfer({
    sourceFundingSourceUrl: loan.borrower_dwolla_funding_source_url,
    destinationFundingSourceUrl: loan.lender_dwolla_funding_source_url,
    amount: payment.amount,
    currency: 'USD',
    metadata: {
      loan_id: loan.id,
      payment_id: payment.id,
      type: 'repayment',
    },
  });

  if (!transferUrl || transferIds.length === 0) {
    throw new Error('Failed to create transfer');
  }

  const transferId = transferIds[transferIds.length - 1];
  
  log.info(`Fee info: gross=$${feeInfo.grossAmount}, fee=$${feeInfo.platformFee}, net=$${feeInfo.netAmount}`);

  // Record only ONE transfer in database (the final transfer ID)
  // Note: Dwolla facilitated transfers create 2 internal transfers (source→master, master→destination)
  // but from the user's perspective, this is one single transfer
  // Use upsert to prevent duplicates (in case of race conditions)
  await supabase
    .from('transfers')
    .upsert({
      loan_id: loan.id,
      dwolla_transfer_id: transferId,
      dwolla_transfer_url: `https://api-sandbox.dwolla.com/transfers/${transferId}`,
      type: 'repayment',
      amount: payment.amount,
      currency: 'USD',
      status: 'pending',
      platform_fee: feeInfo.platformFee,
      fee_type: feeInfo.feeType,
      gross_amount: feeInfo.grossAmount,
      net_amount: feeInfo.netAmount,
    }, {
      onConflict: 'dwolla_transfer_id',
      ignoreDuplicates: true,
    });

  // Update payment schedule with fee info
  const { error: scheduleUpdateError } = await supabase
    .from('payment_schedule')
    .update({
      is_paid: true,
      status: 'paid',
      transfer_id: transferId,
      paid_at: new Date().toISOString(),
      platform_fee: feeInfo.platformFee,
    })
    .eq('id', payment.id);

  if (scheduleUpdateError) {
    log.error(`Error updating payment_schedule ${payment.id}:`, scheduleUpdateError);
    throw scheduleUpdateError;
  }

  // Create payment record in payments table
  const { data: paymentRecord, error: paymentInsertError } = await supabase
    .from('payments')
    .insert({
      loan_id: loan.id,
      schedule_id: payment.id,
      amount: payment.amount,
      payment_date: new Date().toISOString(),
      status: 'confirmed',
      note: `Auto-pay ACH transfer - Transfer ID: ${transferId} | Fee: $${feeInfo.platformFee.toFixed(2)} | Net to lender: $${feeInfo.netAmount.toFixed(2)}`,
    })
    .select()
    .single();

  if (paymentInsertError) {
    log.error(`Error creating payment record:`, paymentInsertError);
  } else if (paymentRecord) {
    // Link payment record to schedule
    await supabase
      .from('payment_schedule')
      .update({ payment_id: paymentRecord.id })
      .eq('id', payment.id);
  }

  // Check if all scheduled payments are now paid
  const { data: unpaidPayments } = await supabase
    .from('payment_schedule')
    .select('id')
    .eq('loan_id', loan.id)
    .eq('is_paid', false);

  // Update loan amounts
  const newAmountPaid = (loan.amount_paid || 0) + payment.amount;
  const newAmountRemaining = (loan.total_amount || loan.amount) - newAmountPaid;
  
  // Consider loan completed if:
  // 1. All scheduled payments are paid, OR
  // 2. Remaining amount is less than $0.50 (rounding tolerance)
  const allPaymentsPaid = !unpaidPayments || unpaidPayments.length === 0;
  const isCompleted = allPaymentsPaid || newAmountRemaining <= 0.50;
  
  const { error: loanUpdateError } = await supabase
    .from('loans')
    .update({
      amount_paid: isCompleted ? (loan.total_amount || loan.amount) : newAmountPaid,
      amount_remaining: isCompleted ? 0 : Math.max(0, newAmountRemaining),
      status: isCompleted ? 'completed' : 'active',
      last_payment_at: new Date().toISOString(),
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq('id', loan.id);

  if (loanUpdateError) {
    log.error(`Error updating loan ${loan.id}:`, loanUpdateError);
  }

  // Trust Score Update
  // NOTE: For Dwolla ACH payments, the transfer is PENDING at this point.
  // The Dwolla webhook (dwolla/webhook/route.ts) will call onPaymentCompleted()
  // when the transfer actually confirms, preventing a double trust score update.
  // We only update trust score here for non-Dwolla (direct) payments.
  const isDwollaPayment = !!(loan.borrower_dwolla_funding_source_url && loan.lender_dwolla_funding_source_url);
  if (loan.borrower_id && !isDwollaPayment) {
    try {
      const trustResult = await onPaymentCompleted({
        supabase,
        loanId: loan.id,
        borrowerId: loan.borrower_id,
        paymentId: paymentRecord?.id,
        scheduleId: payment.id,
        amount: payment.amount,
        dueDate: payment.due_date,
        paymentMethod: 'auto',
        // auto-pay already updated user payment stats (total_payments_made, etc.) above
        skipUserStats: true,
      });
      
      log.info(`Trust score update result:`, trustResult);
      
      if (!trustResult.trustScoreUpdated) {
        log.error(`Trust score failed to update for payment ${payment.id}:`, trustResult.error);
      }
    } catch (trustError) {
      log.error(`Trust score update failed:`, trustError);
    }
  } else if (isDwollaPayment) {
    log.info(`[AutoPay] Skipping trust score update for Dwolla payment — will be handled by Dwolla webhook on transfer completion`);
  }

  // Send payment received email to lender
  await sendPaymentReceivedEmail(loan, payment, newAmountRemaining, isCompleted, supabase);

  log.info(`Successfully processed payment ${payment.id}`);

  return { outcome: 'processed' };
}

// Handle missed payment - update DB and send notification
async function handleMissedPayment(
  supabase: SupabaseServiceClient,
  payment: PaymentScheduleItem,
  loan: PaymentWithLoan['loan'],
  reason: string
) {
  // Update payment with missed status
  await supabase
    .from('payment_schedule')
    .update({
      status: 'missed',
      notes: `Payment failed: ${reason}`,
    })
    .eq('id', payment.id);

  // Calculate days overdue
  const dueDate = new Date(payment.due_date);
  const now = new Date();
  const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  // Update Trust Score for missed payment
  if (loan.borrower_id) {
    try {
      await onPaymentMissed({
        supabase,
        borrowerId: loan.borrower_id,
        loanId: loan.id,
        scheduleId: payment.id,
        daysOverdue: Math.max(0, daysOverdue),
      });
      log.info(`Trust score penalty applied for missed payment`);
    } catch (trustError) {
      log.error(`Trust score update failed:`, trustError);
    }
  }

  // Update borrower's missed payment count using pre-fetched data (no N+1 query)
  if (loan.borrower_id) {
    const borrower = loan.borrower;
    if (borrower) {
      const newMissedCount = (borrower.payments_missed || 0) + 1;
      let newRating = borrower.borrower_rating || 'neutral';
      if (newMissedCount >= 3) newRating = 'worst';
      else if (newMissedCount >= 2) newRating = 'bad';
      else if (newMissedCount >= 1 && (newRating === 'good' || newRating === 'great')) newRating = 'neutral';

      await supabase
        .from('users')
        .update({
          payments_missed: newMissedCount,
          borrower_rating: newRating,
          borrower_rating_updated_at: new Date().toISOString(),
        })
        .eq('id', loan.borrower_id);

      log.info(`Updated borrower ${loan.borrower_id} missed count: ${newMissedCount}, rating: ${newRating}`);
    }
  }

  // Send email to lender
  const lenderEmail = loan.lender_email;
  const lenderName = loan.lender_name || 'Lender';
  const borrowerName = loan.borrower_name || 'Borrower';

  if (lenderEmail) {
    try {
      await sendEmail({
        to: lenderEmail,
        subject: `Payment Missed - ${borrowerName}`,
        html: `
        <!DOCTYPE html>
        <html lang="en">
          <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; margin:0; padding:0; background-color:#f8fafc;">
            
            <div style="max-width:600px; margin:0 auto; padding:40px 20px;">

              <!-- ===== HEADER WITH LOGO ===== -->
              <div style="margin-bottom:30px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <img
                        src="https://feyza.app/feyza.png"
                        alt="Feyza Logo"
                        height="48"
                        style="display:block; height:48px; width:auto; border:0; outline:none; text-decoration:none;"
                      />
                    </td>
                  </tr>
                </table>
              </div>

              <!-- ===== CARD ===== -->
              <div style="background:#ffffff; padding:30px; border-radius:16px; border:1px solid #e5e7eb; box-shadow:0 10px 25px rgba(0,0,0,0.05);">

                <!-- Icon -->
                <div style="text-align:center; margin-bottom:20px;">
                  <div style="width:60px; height:60px; background:#fef3c7; border-radius:50%; display:inline-block; line-height:60px;">
                    <span style="font-size:28px;">⚠️</span>
                  </div>
                </div>

                <!-- Title -->
                <h2 style="color:#92400e; text-align:center; margin-bottom:20px; font-size:22px;">
                  Payment Missed
                </h2>

                <!-- Body -->
                <p style="font-size:16px; color:#374151;">
                  Hi ${lenderName},
                </p>

                <p style="color:#374151; font-size:15px;">
                  A scheduled payment from <strong>${borrowerName}</strong> was not processed.
                </p>

                <!-- Details Box -->
                <div style="background:#fef3c7; padding:16px; border-radius:10px; margin:20px 0; border:1px solid #fde68a;">
                  <p style="color:#92400e; margin:0; font-size:14px; line-height:1.6;">
                    <strong>Amount:</strong> $${payment.amount.toFixed(2)}<br>
                    <strong>Due Date:</strong> ${format(new Date(payment.due_date), 'MMMM d, yyyy')}<br>
                    <strong>Reason:</strong> ${reason}
                  </p>
                </div>

                <p style="color:#6b7280; font-size:14px; line-height:1.6;">
                  We'll automatically retry this payment. You may also want to reach out to ${borrowerName} directly.
                </p>

                <!-- CTA -->
                <a
                  href="${APP_URL}/lender/${loan.invite_token}"
                  style="display:block; background:#059669; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:10px; font-weight:600; text-align:center; margin-top:24px;"
                >
                  View Loan Dashboard →
                </a>

              </div>

              <!-- ===== FOOTER ===== -->
              <div style="text-align:center; margin-top:30px; font-size:12px; color:#6b7280;">
                <p style="margin:0;">This notification was sent by Feyza</p>
                <p style="margin:4px 0 0 0;">Please do not reply to this email</p>
              </div>

            </div>

          </body>
        </html>
        `,

      });
      log.info(`Sent missed payment email to ${lenderEmail}`);
    } catch (emailErr) {
      log.error('[Auto-Pay] Failed to send missed payment email:', emailErr);
    }
  }
}

// Send payment notification emails to both lender AND borrower
async function sendPaymentReceivedEmail(
  loan: PaymentWithLoan['loan'],
  payment: PaymentScheduleItem,
  amountRemaining: number,
  isCompleted: boolean,
  supabase?: SupabaseServiceClient
) {
  // Use pre-fetched lender/borrower data from the initial batch query (no per-payment DB calls)
  let lenderEmail = loan.lender_email || loan.lender?.email || loan.business_lender?.contact_email;
  let lenderName = loan.lender_name || loan.lender?.full_name || loan.business_lender?.business_name || 'Lender';
  const borrowerName = loan.borrower_name || loan.borrower?.full_name || 'Borrower';
  const borrowerEmail = loan.borrower_invite_email || loan.borrower_email || loan.borrower?.email;
  const currency = loan.currency || 'USD';
  
  // Determine if this is a guest loan (has invite_token)
  const isGuestLoan = !!loan.invite_token;

  // 1. Send email to LENDER
  if (lenderEmail) {
    try {
      if (isGuestLoan && loan.invite_token) {
        // Guest lender - use guest-specific email with access token
        const guestLenderEmail = getPaymentReceivedGuestLenderEmail({
          lenderName: lenderName,
          borrowerName: borrowerName,
          amount: payment.amount,
          currency: currency,
          remainingBalance: amountRemaining,
          loanId: loan.id,
          accessToken: loan.invite_token,
          isCompleted: isCompleted,
        });
        await sendEmail({
          to: lenderEmail,
          subject: guestLenderEmail.subject,
          html: guestLenderEmail.html,
        });
      } else {
        // Logged-in lender - use standard email
        const receivedEmail = getPaymentReceivedLenderEmail({
          lenderName: lenderName,
          borrowerName: borrowerName,
          amount: payment.amount,
          currency: currency,
          remainingBalance: amountRemaining,
          loanId: loan.id,
          isCompleted: isCompleted,
        });
        await sendEmail({
          to: lenderEmail,
          subject: receivedEmail.subject,
          html: receivedEmail.html,
        });
      }
      log.info(`✅ Sent payment received email to lender: ${lenderEmail}`);
    } catch (emailErr) {
      log.error('[Auto-Pay] Failed to send lender payment email:', emailErr);
    }
  } else {
    log.info(`⚠️ No lender email found for loan ${loan.id} - cannot send notification`);
  }

  // 2. Send email to BORROWER
  if (borrowerEmail) {
    try {
      const borrowerPaymentEmail = getPaymentProcessedBorrowerEmail({
        borrowerName: borrowerName,
        lenderName: lenderName,
        amount: payment.amount,
        currency: currency,
        remainingBalance: amountRemaining,
        loanId: loan.id,
        accessToken: isGuestLoan ? loan.borrower_access_token : undefined,
        isCompleted: isCompleted,
      });
      await sendEmail({
        to: borrowerEmail,
        subject: borrowerPaymentEmail.subject,
        html: borrowerPaymentEmail.html,
      });
      log.info(`✅ Sent payment processed email to borrower: ${borrowerEmail}`);
    } catch (emailErr) {
      log.error('[Auto-Pay] Failed to send borrower payment email:', emailErr);
    }
  }
}

// POST endpoint to manually trigger for a specific loan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loan_id, payment_id } = body;

    if (!loan_id && !payment_id) {
      return NextResponse.json(
        { error: 'loan_id or payment_id required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Get the specific payment or next due payment for loan
    let payment;
    
    if (payment_id) {
      const { data } = await supabase
        .from('payment_schedule')
        .select(`*, loan:loans(*)`)
        .eq('id', payment_id)
        .single();
      payment = data;
    } else {
      const { data } = await supabase
        .from('payment_schedule')
        .select(`*, loan:loans(*)`)
        .eq('loan_id', loan_id)
        .eq('is_paid', false)
        .order('due_date', { ascending: true })
        .limit(1)
        .single();
      payment = data;
    }

    if (!payment) {
      return NextResponse.json(
        { error: 'No unpaid payment found' },
        { status: 404 }
      );
    }

    // Check if payment is already paid
    if (payment.is_paid) {
      return NextResponse.json(
        { error: 'This payment has already been processed' },
        { status: 400 }
      );
    }

    // IDEMPOTENCY CHECK: Check if a transfer already exists for this payment
    if (payment.transfer_id) {
      return NextResponse.json(
        { error: 'This payment already has a transfer associated', transfer_id: payment.transfer_id },
        { status: 400 }
      );
    }

    const loan = payment.loan;

    // Use loan-level Dwolla fields
    if (!loan?.borrower_dwolla_funding_source_url) {
      return NextResponse.json(
        { error: 'Borrower has not connected their bank account' },
        { status: 400 }
      );
    }

    if (!loan?.lender_dwolla_funding_source_url) {
      return NextResponse.json(
        { error: 'Lender has not connected their bank account' },
        { status: 400 }
      );
    }

    // Create Dwolla transfer (facilitated) with platform fee
    const { transferUrl, transferIds, feeInfo } = await createFacilitatedTransfer({
      sourceFundingSourceUrl: loan.borrower_dwolla_funding_source_url,
      destinationFundingSourceUrl: loan.lender_dwolla_funding_source_url,
      amount: payment.amount,
      currency: 'USD',
      metadata: {
        loan_id: loan.id,
        payment_id: payment.id,
        type: 'repayment',
      },
    });

    if (!transferUrl || transferIds.length === 0) {
      throw new Error('Failed to create transfer');
    }

    const transferId = transferIds[transferIds.length - 1];
    
    log.info(`[Manual Pay] Fee info: gross=$${feeInfo.grossAmount}, fee=$${feeInfo.platformFee}, net=$${feeInfo.netAmount}`);

    // Record only ONE transfer in database (the final transfer ID)
    // Note: Dwolla facilitated transfers create 2 internal transfers (source→master, master→destination)
    // but from the user's perspective, this is one single transfer
    // Use upsert to prevent duplicates (in case of race conditions)
    await supabase
      .from('transfers')
      .upsert({
        loan_id: loan.id,
        dwolla_transfer_id: transferId,
        dwolla_transfer_url: `https://api-sandbox.dwolla.com/transfers/${transferId}`,
        type: 'repayment',
        amount: payment.amount,
        currency: 'USD',
        status: 'pending',
        platform_fee: feeInfo.platformFee,
        fee_type: feeInfo.feeType,
        gross_amount: feeInfo.grossAmount,
        net_amount: feeInfo.netAmount,
      }, {
        onConflict: 'dwolla_transfer_id',
        ignoreDuplicates: true,
      });

    // Update payment_schedule with fee info
    const { error: updateError } = await supabase
      .from('payment_schedule')
      .update({
        is_paid: true,
        status: 'paid',
        transfer_id: transferId,
        paid_at: new Date().toISOString(),
        platform_fee: feeInfo.platformFee,
      })
      .eq('id', payment.id);

    if (updateError) {
      log.error('Error updating payment_schedule:', updateError);
      throw new Error(`Failed to update payment: ${updateError.message}`);
    }

    // Create payment record in payments table
    const { data: paymentRecord, error: paymentInsertError } = await supabase
      .from('payments')
      .insert({
        loan_id: loan.id,
        schedule_id: payment.id,
        amount: payment.amount,
        payment_date: new Date().toISOString(),
        status: 'confirmed',
        note: `ACH transfer initiated - Transfer ID: ${transferId} | Fee: $${feeInfo.platformFee.toFixed(2)} | Net to lender: $${feeInfo.netAmount.toFixed(2)}`,
      })
      .select()
      .single();

    if (paymentInsertError) {
      log.error('Error creating payment record:', paymentInsertError);
    } else {
      // Link payment record to schedule
      await supabase
        .from('payment_schedule')
        .update({ payment_id: paymentRecord.id })
        .eq('id', payment.id);
    }

    log.info(`Payment ${payment.id} marked as paid`);

    // Check if all scheduled payments are now paid
    const { data: unpaidPayments } = await supabase
      .from('payment_schedule')
      .select('id')
      .eq('loan_id', loan.id)
      .eq('is_paid', false);

    // Update loan
    const newAmountPaid = (loan.amount_paid || 0) + payment.amount;
    const newAmountRemaining = (loan.total_amount || loan.amount) - newAmountPaid;
    
    // Consider loan completed if:
    // 1. All scheduled payments are paid, OR
    // 2. Remaining amount is less than $0.50 (rounding tolerance)
    const allPaymentsPaid = !unpaidPayments || unpaidPayments.length === 0;
    const isCompleted = allPaymentsPaid || newAmountRemaining <= 0.50;
    
    const { error: loanUpdateError } = await supabase
      .from('loans')
      .update({
        amount_paid: isCompleted ? (loan.total_amount || loan.amount) : newAmountPaid,
        amount_remaining: isCompleted ? 0 : Math.max(0, newAmountRemaining),
        status: isCompleted ? 'completed' : 'active',
        last_payment_at: new Date().toISOString(),
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', loan.id);

    if (loanUpdateError) {
      log.error('Error updating loan:', loanUpdateError);
    }

    log.info(`Loan ${loan.id} updated - paid: ${newAmountPaid}, remaining: ${newAmountRemaining}`);

    // ── Trust Score + Voucher Pipeline ──────────────────────────────────────
    // BUG FIX: The POST handler was missing the onPaymentCompleted call entirely.
    // This meant manual payments never updated trust scores, voucher stats, or
    // borrower completion records. Now we call it the same way the GET handler does.
    const isDwollaPayment = !!(loan.borrower_dwolla_funding_source_url && loan.lender_dwolla_funding_source_url);
    if (loan.borrower_id && !isDwollaPayment) {
      try {
        const trustResult = await onPaymentCompleted({
          supabase,
          loanId: loan.id,
          borrowerId: loan.borrower_id,
          paymentId: paymentRecord?.id,
          scheduleId: payment.id,
          amount: payment.amount,
          dueDate: payment.due_date,
          paymentMethod: 'auto',
          skipUserStats: false,
        });
        log.info(`[Manual Pay] Trust score update result:`, trustResult);
      } catch (trustError) {
        log.error(`[Manual Pay] Trust score update failed:`, trustError);
      }
    } else if (isDwollaPayment) {
      log.info(`[Manual Pay] Skipping trust score update — Dwolla webhook will handle it on transfer completion`);
    }

    // Send payment received email
    await sendPaymentReceivedEmail(loan, payment, Math.max(0, newAmountRemaining), isCompleted, supabase);

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      transfer_id: transferId,
      amount: payment.amount,
      amount_remaining: Math.max(0, newAmountRemaining),
      fee: {
        platform_fee: feeInfo.platformFee,
        gross_amount: feeInfo.grossAmount,
        net_amount: feeInfo.netAmount,
        fee_type: feeInfo.feeType,
        fee_label: feeInfo.feeLabel,
      },
    });

  } catch (error: unknown) {
    log.error('Manual payment error:', error);
    const message = error instanceof Error ? (error as Error).message : 'Payment processing failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Update borrower stats after payment
async function updateBorrowerStats(
  supabase: SupabaseServiceClient,
  loan: PaymentWithLoan['loan'],
  payment: PaymentScheduleItem,
  isLoanCompleted: boolean
) {
  try {
    // Determine borrower - could be a user or guest
    const borrowerId = loan.borrower_id;
    if (!borrowerId) {
      log.info('[Stats] No borrower_id, skipping stats update');
      return;
    }

    // Get current borrower stats
    const { data: borrower, error: borrowerError } = await supabase
      .from('users')
      .select('*')
      .eq('id', borrowerId)
      .single();

    if (borrowerError || !borrower) {
      log.error('[Stats] Error fetching borrower:', borrowerError);
      return;
    }

    // Determine if payment was early, on time, or late
    const dueDate = new Date(payment.due_date);
    const paidDate = new Date();
    const daysDiff = Math.floor((dueDate.getTime() - paidDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let paymentTiming: 'early' | 'on_time' | 'late';
    if (daysDiff > 0) {
      paymentTiming = 'early'; // Paid before due date
    } else if (daysDiff >= -1) {
      paymentTiming = 'on_time'; // Paid on due date or 1 day after
    } else {
      paymentTiming = 'late'; // Paid more than 1 day after due date
    }

    log.info(`[Stats] Payment timing: ${paymentTiming} (days diff: ${daysDiff})`);

    // Calculate new stats
    const newTotalPaymentsMade = (borrower.total_payments_made || 0) + 1;
    const newPaymentsEarly = (borrower.payments_early || 0) + (paymentTiming === 'early' ? 1 : 0);
    const newPaymentsOnTime = (borrower.payments_on_time || 0) + (paymentTiming === 'on_time' ? 1 : 0);
    const newPaymentsLate = (borrower.payments_late || 0) + (paymentTiming === 'late' ? 1 : 0);
    const newTotalAmountRepaid = (borrower.total_amount_repaid || 0) + payment.amount;
    const newCurrentOutstanding = Math.max(0, (borrower.current_outstanding_amount || 0) - payment.amount);

    // Prepare update object
    const statsUpdate: Record<string, unknown> = {
      total_payments_made: newTotalPaymentsMade,
      payments_early: newPaymentsEarly,
      payments_on_time: newPaymentsOnTime,
      payments_late: newPaymentsLate,
      total_amount_repaid: newTotalAmountRepaid,
      current_outstanding_amount: newCurrentOutstanding,
    };

    // If loan is completed, update additional stats
    if (isLoanCompleted) {
      const newLoansAtCurrentTier = (borrower.loans_at_current_tier || 0) + 1;
      
      // NOTE: total_loans_completed is intentionally NOT set here.
      // The centralized onPaymentCompleted handler's completion pipeline increments it
      // with a dedup guard (checks trust_score_events for existing loan_completed event).
      // Setting it here as well would double-count completed loans for auto-pay users.
      statsUpdate.loans_at_current_tier = newLoansAtCurrentTier;

      // Calculate new rating based on payment history
      const totalPayments = newTotalPaymentsMade;
      const onTimeOrEarly = newPaymentsEarly + newPaymentsOnTime;
      const onTimeRate = totalPayments > 0 ? onTimeOrEarly / totalPayments : 0;

      let newRating = borrower.borrower_rating || 'neutral';
      if (onTimeRate >= 0.95 && totalPayments >= 4) {
        newRating = 'great';
      } else if (onTimeRate >= 0.85 && totalPayments >= 3) {
        newRating = 'good';
      } else if (onTimeRate >= 0.7) {
        newRating = 'neutral';
      } else if (onTimeRate >= 0.5) {
        newRating = 'poor';
      } else if (totalPayments >= 3) {
        newRating = 'bad';
      }

      if (newRating !== borrower.borrower_rating) {
        statsUpdate.borrower_rating = newRating;
        statsUpdate.borrower_rating_updated_at = new Date().toISOString();
        log.info(`[Stats] Rating updated: ${borrower.borrower_rating} -> ${newRating}`);
      }

      // Check for tier upgrade (only for business loans)
      if (loan.business_lender_id || loan.lender_type === 'business') {
        const currentTier = borrower.borrowing_tier || 1;
        const loansNeededPerTier = [0, 2, 3, 4, 5]; // Tier 1: 2 loans, Tier 2: 3 more, etc.
        
        // Only upgrade if rating is good enough
        if (newRating === 'great' || newRating === 'good' || newRating === 'neutral') {
          if (newLoansAtCurrentTier >= (loansNeededPerTier[currentTier] || 2) && currentTier < 5) {
            const newTier = currentTier + 1;
            const tierLimits = [0, 150, 300, 500, 1000, 2000];
            
            statsUpdate.borrowing_tier = newTier;
            statsUpdate.max_borrowing_amount = tierLimits[newTier] || 2000;
            statsUpdate.loans_at_current_tier = 0; // Reset for new tier
            
            log.info(`[Stats] Tier upgraded: ${currentTier} -> ${newTier}, max: $${tierLimits[newTier]}`);
          }
        }
      }
    }

    // Update borrower
    const { error: updateError } = await supabase
      .from('users')
      .update(statsUpdate)
      .eq('id', borrowerId);

    if (updateError) {
      log.error('[Stats] Error updating borrower stats:', updateError);
    } else {
      log.info(`[Stats] Borrower ${borrowerId} stats updated successfully`);
    }

  } catch (error) {
    log.error('[Stats] Error in updateBorrowerStats:', error);
  }
}
