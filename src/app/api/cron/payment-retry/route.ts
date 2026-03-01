import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { SupabaseServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { createFacilitatedTransfer } from '@/lib/dwolla';
import { onVoucheeLoanDefaulted } from '@/lib/vouching/accountability';
import { logger } from '@/lib/logger';

const log = logger('cron-payment-retry');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const MAX_RETRIES = 3;
const RETRY_INTERVAL_DAYS = 3;
const RESTRICTION_DAYS = 90;

/**
 * Payment Retry & Borrower Blocking System
 * 
 * This cron job:
 * 1. Finds overdue payments that need retry
 * 2. Attempts to charge them
 * 3. After 3 failures, blocks the borrower
 * 4. Notifies borrower at each step
 * 
 * Run daily via cron: 0 6 * * * (6 AM daily)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();
    const now = new Date();
    
    const results = {
      paymentsProcessed: 0,
      retriesAttempted: 0,
      retriesSuccessful: 0,
      borrowersBlocked: 0,
      notificationsSent: 0,
      errors: [] as string[],
    };

    // ============================================
    // 1. FIND PAYMENTS THAT NEED RETRY
    // ============================================
    
    // Payments that are overdue and either:
    // - Never retried (retry_count = 0, past due date)
    // - Have scheduled retry (next_retry_at <= now)
    const { data: paymentsToRetry, error: fetchError } = await supabase
      .from('payment_schedule')
      .select(`
        id, loan_id, amount, currency, due_date, status, 
        retry_count, last_retry_at, next_retry_at, retry_history,
        loan:loans(
          id, borrower_id, currency,
          borrower_dwolla_funding_source_url,
          lender_dwolla_funding_source_url,
          borrower:users!borrower_id(id, email, full_name, is_blocked)
        )
      `)
      .in('status', ['pending', 'overdue', 'failed'])
      .lt('retry_count', MAX_RETRIES)
      .or(`next_retry_at.lte.${now.toISOString()},and(next_retry_at.is.null,due_date.lt.${now.toISOString()})`)
      .order('due_date', { ascending: true })
      .limit(100);

    if (fetchError) {
      log.error('[PaymentRetry] Error fetching payments:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
    }

    log.info(`[PaymentRetry] Found ${paymentsToRetry?.length || 0} payments to process`);

    // ============================================
    // 2. PROCESS EACH PAYMENT
    // ============================================
    
    for (const payment of paymentsToRetry || []) {
      results.paymentsProcessed++;
      
      const loan = payment.loan as any;
const borrower = loan?.borrower as any;
      
      if (!borrower || borrower.is_blocked) {
        log.info(`[PaymentRetry] Skipping payment ${payment.id} - borrower blocked or not found`);
        continue;
      }

      const newRetryCount = (payment.retry_count || 0) + 1;
      const isLastRetry = newRetryCount >= MAX_RETRIES;
      
      log.info(`[PaymentRetry] Processing payment ${payment.id} - Retry #${newRetryCount}/${MAX_RETRIES}`);
      
      // ============================================
      // 3. ATTEMPT TO CHARGE PAYMENT
      // ============================================
      
      let chargeSuccess = false;
      let chargeError = '';
      let providerResponse = {};
      
      try {
        // Attempt Dwolla ACH transfer if funding sources are connected
        if (loan?.borrower_dwolla_funding_source_url && loan?.lender_dwolla_funding_source_url) {
          const { transferUrl, transferIds } = await createFacilitatedTransfer({
            sourceFundingSourceUrl: loan.borrower_dwolla_funding_source_url,
            destinationFundingSourceUrl: loan.lender_dwolla_funding_source_url,
            amount: payment.amount,
            currency: 'USD',
            metadata: {
              loan_id: loan.id,
              payment_id: payment.id,
              type: 'repayment_retry',
              retry_number: newRetryCount,
            },
          });

          if (transferUrl && transferIds.length > 0) {
            chargeSuccess = true;
            providerResponse = { transferUrl, transferId: transferIds[transferIds.length - 1], provider: 'dwolla' };
          } else {
            chargeError = 'Dwolla transfer returned no transfer ID';
            providerResponse = { provider: 'dwolla', transferUrl, transferIds };
          }
        } else {
          // No Dwolla funding sources — cannot charge
          chargeSuccess = false;
          chargeError = !loan?.borrower_dwolla_funding_source_url
            ? 'Borrower bank account not connected'
            : 'Lender bank account not connected';
          providerResponse = { provider: 'none', reason: chargeError };
        }
        
        results.retriesAttempted++;
      } catch (err: unknown) {
        chargeError = (err as Error).message || 'Unknown error';
        log.error(`[PaymentRetry] Charge error for payment ${payment.id}:`, err);
      }

      // ============================================
      // 4. LOG THE RETRY ATTEMPT
      // ============================================
      
      const retryLogEntry = {
        attempted_at: now.toISOString(),
        retry_number: newRetryCount,
        success: chargeSuccess,
        error: chargeError,
        provider_response: providerResponse,
      };
      
      // Add to retry history
      const retryHistory = [...(payment.retry_history || []), retryLogEntry];
      
      // Insert into retry log table
      await supabase.from('payment_retry_log').insert({
        payment_id: payment.id,
        loan_id: payment.loan_id,
        user_id: borrower.id,
        retry_number: newRetryCount,
        success: chargeSuccess,
        error_message: chargeError,
        provider_response: providerResponse,
        next_retry_at: !chargeSuccess && !isLastRetry 
          ? new Date(now.getTime() + RETRY_INTERVAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
          : null,
        will_block_on_failure: isLastRetry,
      });

      // ============================================
      // 5. UPDATE PAYMENT RECORD
      // ============================================
      
      if (chargeSuccess) {
        // Payment successful!
        results.retriesSuccessful++;
        
        await supabase
          .from('payment_schedule')
          .update({
            status: 'paid',
            paid_at: now.toISOString(),
            retry_count: newRetryCount,
            last_retry_at: now.toISOString(),
            next_retry_at: null,
            retry_history: retryHistory,
          })
          .eq('id', payment.id);

        // Notify borrower of successful payment
        await notifyBorrower(supabase, borrower, 'payment_retry_success', {
          amount: payment.amount,
          currency: payment.currency,
          retryNumber: newRetryCount,
        });
        results.notificationsSent++;
        
      } else {
        // Payment failed
        const nextRetryAt = !isLastRetry 
          ? new Date(now.getTime() + RETRY_INTERVAL_DAYS * 24 * 60 * 60 * 1000)
          : null;

        await supabase
          .from('payment_schedule')
          .update({
            status: isLastRetry ? 'defaulted' : 'failed',
            retry_count: newRetryCount,
            last_retry_at: now.toISOString(),
            next_retry_at: nextRetryAt?.toISOString() || null,
            retry_history: retryHistory,
            caused_block: isLastRetry,
          })
          .eq('id', payment.id);

        if (isLastRetry) {
          // ============================================
          // 6. BLOCK THE BORROWER
          // ============================================
          
          log.info(`[PaymentRetry] Blocking borrower ${borrower.id} after ${MAX_RETRIES} failed retries`);
          
          // Calculate total outstanding debt
          const { data: outstandingPayments } = await supabase
            .from('payment_schedule')
            .select('amount')
            .eq('loan_id', payment.loan_id)
            .in('status', ['pending', 'overdue', 'failed', 'defaulted']);
          
          const totalDebt = outstandingPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
          
          // Get current rating before blocking
          const { data: currentUser } = await supabase
            .from('users')
            .select('borrower_rating')
            .eq('id', borrower.id)
            .single();
          
          // Block the borrower
          await supabase
            .from('users')
            .update({
              is_blocked: true,
              blocked_at: now.toISOString(),
              blocked_reason: `Payment default after ${MAX_RETRIES} failed attempts`,
              default_count: (borrower.default_count || 0) + 1,
              pre_default_rating: currentUser?.borrower_rating || 'neutral',
              borrower_rating: 'worst',
            })
            .eq('id', borrower.id);

          // Mark the loan as defaulted so trust score, analytics, and eligibility see it.
          // Schema: loans_status_check must include 'defaulted' (see supabase/feyza-database.sql).
          await supabase
            .from('loans')
            .update({ status: 'defaulted' })
            .eq('id', payment.loan_id);

          // Create block record
          await supabase.from('borrower_blocks').insert({
            user_id: borrower.id,
            loan_id: payment.loan_id,
            payment_id: payment.id,
            blocked_reason: `Payment default: ${payment.currency} ${payment.amount} after ${MAX_RETRIES} failed retry attempts`,
            total_debt_at_block: totalDebt,
            status: 'active',
          });

          // Notify borrower of block
          await notifyBorrower(supabase, borrower, 'account_blocked', {
            amount: payment.amount,
            currency: payment.currency,
            totalDebt,
            reason: `Your account has been blocked due to non-payment after ${MAX_RETRIES} retry attempts.`,
          });
          
          // Notify lender
          await notifyLenderOfDefault(supabase, loan, borrower, payment, totalDebt);

          // ── Fire voucher consequence pipeline (awaited so cron reflects success) ──
          // All active vouchers for this borrower receive:
          //   - Trust score penalty (-10 pts)
          //   - Success rate downgrade
          //   - Potential vouching lock if they hit 2+ active defaults
          //   - Urgent email notification
          try {
            const voucherResult = await onVoucheeLoanDefaulted(supabase, borrower.id, payment.loan_id);
            log.info(`[PaymentRetry] Voucher default pipeline:`, voucherResult);
            if (voucherResult.errors?.length) {
              results.errors.push(...voucherResult.errors.map(e => `voucher: ${e}`));
            }
          } catch (err) {
            log.error(`[PaymentRetry] Voucher pipeline error:`, err);
            results.errors.push(`voucher pipeline: ${(err as Error).message}`);
          }

          results.borrowersBlocked++;
          results.notificationsSent += 2;
          
        } else {
          // Notify borrower of failed retry (not blocked yet)
          await notifyBorrower(supabase, borrower, 'payment_retry_failed', {
            amount: payment.amount,
            currency: payment.currency,
            retryNumber: newRetryCount,
            maxRetries: MAX_RETRIES,
            nextRetryDate: nextRetryAt,
            retriesRemaining: MAX_RETRIES - newRetryCount,
          });
          results.notificationsSent++;
        }
      }
    }

    log.info('[PaymentRetry] Completed:', results);
    
    return NextResponse.json({
      success: true,
      ...results,
    });
    
  } catch (error) {
    log.error('[PaymentRetry] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// HELPER: NOTIFY BORROWER
// ============================================

async function notifyBorrower(
  supabase: SupabaseServiceClient, 
  borrower: Record<string, unknown>, 
  type: 'payment_retry_success' | 'payment_retry_failed' | 'account_blocked',
  data: Record<string, unknown>
) {
  const { amount, currency, retryNumber, maxRetries, nextRetryDate, retriesRemaining, totalDebt, reason } = data;
  
  let title = '';
  let message = '';
  let emailSubject = '';
  let emailHtml = '';
  
  switch (type) {
    case 'payment_retry_success':
      title = '✅ Payment Successful';
      message = `Your payment of ${currency} ${amount} was successfully processed on retry attempt #${retryNumber}.`;
      emailSubject = '✅ Payment Successfully Processed';
      emailHtml = getPaymentSuccessEmail(String(borrower.full_name), Number(amount), String(currency), Number(retryNumber));
      break;
      
    case 'payment_retry_failed':
      title = '⚠️ Payment Failed - Retry Scheduled';
      message = `Payment of ${currency} ${amount} failed (Attempt ${retryNumber}/${maxRetries}). Next retry: ${new Date(nextRetryDate as string).toLocaleDateString()}. ${retriesRemaining} attempts remaining before account block.`;
      emailSubject = `⚠️ Payment Failed - ${retriesRemaining} Retry Attempts Remaining`;
      emailHtml = getPaymentRetryFailedEmail(String(borrower.full_name), Number(amount), String(currency), Number(retryNumber), Number(maxRetries), new Date(String(nextRetryDate || "")), Number(retriesRemaining));
      break;
      
    case 'account_blocked':
      title = '🚫 Account Blocked';
      message = `Your account has been blocked due to payment default. Total outstanding debt: ${currency} ${totalDebt}. Please clear your debt to restore access.`;
      emailSubject = '🚫 Your Feyza Account Has Been Blocked';
      emailHtml = getAccountBlockedEmail(String(borrower.full_name), Number(amount), String(currency), Number(totalDebt));
      break;
  }
  
  // Create in-app notification
  await supabase.from('notifications').insert({
    user_id: borrower.id,
    type: type,
    title,
    message,
  });
  
  // Send email
  if (borrower.email) {
    try {
      await sendEmail({
        to: String(borrower.email),
        subject: emailSubject,
        html: emailHtml,
      });
    } catch (err) {
      log.error('[PaymentRetry] Failed to send email:', err);
    }
  }
}

// ============================================
// HELPER: NOTIFY LENDER OF DEFAULT
// ============================================

async function notifyLenderOfDefault(supabase: SupabaseServiceClient, loan: Record<string, unknown>, borrower: Record<string, unknown>, payment: Record<string, unknown>, totalDebt: number) {
  // Get lender info
  let lenderEmail = '';
  let lenderName = 'Lender';
  let lenderId = '';
  
  if (loan.business_lender_id) {
    const { data: business } = await supabase
      .from('business_profiles')
      .select('business_name, contact_email, user_id')
      .eq('id', loan.business_lender_id)
      .single();
    if (business) {
      lenderEmail = business.contact_email;
      lenderName = business.business_name;
      lenderId = business.user_id;
    }
  } else if (loan.lender_id) {
    const { data: user } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', loan.lender_id)
      .single();
    if (user) {
      lenderEmail = user.email;
      lenderName = user.full_name;
      lenderId = String(loan.lender_id || '');
    }
  }
  
  if (lenderId) {
    await supabase.from('notifications').insert({
      user_id: lenderId,
      loan_id: loan.id,
      type: 'borrower_defaulted',
      title: '⚠️ Borrower Payment Default',
      message: `${borrower.full_name} has defaulted on their loan after 3 failed payment attempts. Outstanding debt: ${payment.currency} ${totalDebt}.`,
    });
  }
  
  if (lenderEmail) {
    try {
      await sendEmail({
        to: lenderEmail,
        subject: `⚠️ Borrower Default Alert - ${borrower.full_name}`,
        html: getLenderDefaultAlertEmail(String(lenderName), String(borrower.full_name), String(payment.currency), Number(totalDebt), String(String(loan.id))),
      });
    } catch (err) {
      log.error('[PaymentRetry] Failed to send lender email:', err);
    }
  }
}

// ============================================
// EMAIL TEMPLATES
// ============================================

function getPaymentSuccessEmail(name: string, amount: number, currency: string, retryNumber: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:40px 20px;">
          <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <tr><td style="background:linear-gradient(135deg,#059669,#047857);padding:30px;text-align:center;">
              <h1 style="margin:0;color:white;font-size:24px;">✅ Payment Successful</h1>
            </td></tr>
            <tr><td style="padding:30px;">
              <p style="font-size:16px;color:#374151;">Hi ${name},</p>
              <p style="font-size:16px;color:#374151;">Great news! Your payment of <strong>${currency} ${amount.toLocaleString()}</strong> was successfully processed on retry attempt #${retryNumber}.</p>
              <p style="font-size:16px;color:#374151;">Thank you for keeping your account in good standing!</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center" style="padding:20px 0;">
                  <a href="${APP_URL}/dashboard" style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">View Dashboard</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

function getPaymentRetryFailedEmail(
  name: string, 
  amount: number, 
  currency: string, 
  retryNumber: number,
  maxRetries: number,
  nextRetryDate: Date,
  retriesRemaining: number
): string {
  const urgencyColor = retriesRemaining === 1 ? '#dc2626' : '#f59e0b';
  
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:40px 20px;">
          <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <tr><td style="background:${urgencyColor};padding:30px;text-align:center;">
              <h1 style="margin:0;color:white;font-size:24px;">⚠️ Payment Failed</h1>
            </td></tr>
            <tr><td style="padding:30px;">
              <p style="font-size:16px;color:#374151;">Hi ${name},</p>
              <p style="font-size:16px;color:#374151;">Unfortunately, your payment of <strong>${currency} ${amount.toLocaleString()}</strong> could not be processed.</p>
              
              <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:20px 0;">
                <p style="margin:0;font-size:14px;color:#92400e;">
                  <strong>Attempt ${retryNumber} of ${maxRetries} failed</strong><br>
                  ${retriesRemaining} retry attempt${retriesRemaining > 1 ? 's' : ''} remaining before account block
                </p>
              </div>
              
              <p style="font-size:16px;color:#374151;">
                <strong>Next retry:</strong> ${new Date(nextRetryDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              
              <p style="font-size:16px;color:#374151;">Please ensure your payment method has sufficient funds to avoid account restrictions.</p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center" style="padding:20px 0;">
                  <a href="${APP_URL}/dashboard" style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">Update Payment Method</a>
                </td></tr>
              </table>
              
              ${retriesRemaining === 1 ? `
                <div style="background:#fee2e2;border:1px solid #dc2626;border-radius:8px;padding:16px;margin:20px 0;">
                  <p style="margin:0;font-size:14px;color:#991b1b;">
                    <strong>⚠️ Final Warning:</strong> If the next retry fails, your account will be blocked and you will not be able to request new loans until your debt is cleared, plus a 90-day restriction period.
                  </p>
                </div>
              ` : ''}
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

function getAccountBlockedEmail(name: string, amount: number, currency: string, totalDebt: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:40px 20px;">
          <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <tr><td style="background:#dc2626;padding:30px;text-align:center;">
              <h1 style="margin:0;color:white;font-size:24px;">🚫 Account Blocked</h1>
            </td></tr>
            <tr><td style="padding:30px;">
              <p style="font-size:16px;color:#374151;">Hi ${name},</p>
              <p style="font-size:16px;color:#374151;">Your Feyza account has been blocked due to non-payment after 3 failed retry attempts.</p>
              
              <div style="background:#fee2e2;border:1px solid #dc2626;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
                <p style="margin:0 0 10px;font-size:14px;color:#991b1b;">Total Outstanding Debt</p>
                <p style="margin:0;font-size:32px;font-weight:bold;color:#dc2626;">${currency} ${totalDebt.toLocaleString()}</p>
              </div>
              
              <h3 style="color:#374151;margin:20px 0 10px;">What this means:</h3>
              <ul style="color:#374151;font-size:14px;line-height:1.8;">
                <li>You cannot request new loans</li>
                <li>Your borrower rating has been set to "Worst"</li>
                <li>This default has been recorded on your profile</li>
              </ul>
              
              <h3 style="color:#374151;margin:20px 0 10px;">How to restore your account:</h3>
              <ol style="color:#374151;font-size:14px;line-height:1.8;">
                <li>Pay off your outstanding debt of ${currency} ${totalDebt.toLocaleString()}</li>
                <li>After payment, you'll have a 90-day restriction period</li>
                <li>After 90 days, you can request loans again as a "Starter" borrower</li>
              </ol>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center" style="padding:20px 0;">
                  <a href="${APP_URL}/dashboard" style="display:inline-block;background:#dc2626;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">Pay Outstanding Debt</a>
                </td></tr>
              </table>
              
              <p style="font-size:14px;color:#6b7280;margin-top:20px;">
                If you believe this is an error or need assistance, please contact our support team.
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

function getLenderDefaultAlertEmail(lenderName: string, borrowerName: string, currency: string, totalDebt: number, loanId: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:40px 20px;">
          <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <tr><td style="background:#f59e0b;padding:30px;text-align:center;">
              <h1 style="margin:0;color:white;font-size:24px;">⚠️ Borrower Default Alert</h1>
            </td></tr>
            <tr><td style="padding:30px;">
              <p style="font-size:16px;color:#374151;">Hi ${lenderName},</p>
              <p style="font-size:16px;color:#374151;">We regret to inform you that <strong>${borrowerName}</strong> has defaulted on their loan payment after 3 failed retry attempts.</p>
              
              <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
                <p style="margin:0 0 10px;font-size:14px;color:#92400e;">Outstanding Debt</p>
                <p style="margin:0;font-size:32px;font-weight:bold;color:#f59e0b;">${currency} ${totalDebt.toLocaleString()}</p>
              </div>
              
              <h3 style="color:#374151;margin:20px 0 10px;">Actions taken:</h3>
              <ul style="color:#374151;font-size:14px;line-height:1.8;">
                <li>Borrower's account has been blocked</li>
                <li>Borrower's rating has been set to "Worst"</li>
                <li>Borrower cannot request new loans until debt is cleared + 90 days</li>
              </ul>
              
              <p style="font-size:16px;color:#374151;">We will continue to pursue payment collection. You will be notified when the borrower clears their debt.</p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center" style="padding:20px 0;">
                  <a href="${APP_URL}/loans/${loanId}" style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">View Loan Details</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

// GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
