import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createFacilitatedTransfer } from '@/lib/dwolla';
import { sendEmail } from '@/lib/email';
import { format } from 'date-fns';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
    
    console.log(`[Auto-Pay] Processing payments for ${today}`);

    // Find all unpaid payments due today or earlier
    const { data: duePayments, error: fetchError } = await supabase
      .from('payment_schedule')
      .select(`
        *,
        loan:loans(*)
      `)
      .eq('is_paid', false)
      .lte('due_date', today)
      .order('due_date', { ascending: true });

    if (fetchError) {
      console.error('[Auto-Pay] Error fetching due payments:', fetchError);
      throw fetchError;
    }

    if (!duePayments || duePayments.length === 0) {
      console.log('[Auto-Pay] No payments due today');
      return NextResponse.json({ 
        success: true, 
        message: 'No payments due',
        processed: 0 
      });
    }

    console.log(`[Auto-Pay] Found ${duePayments.length} payments to process`);

    const results = {
      processed: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const payment of duePayments) {
      try {
        const loan = payment.loan;

        // Skip if loan is not active
        if (loan?.status !== 'active') {
          console.log(`[Auto-Pay] Skipping payment ${payment.id} - loan not active`);
          results.skipped++;
          continue;
        }

        // Use loan-level Dwolla fields (works for both guest and logged-in users)
        const borrowerFundingSource = loan.borrower_dwolla_funding_source_url;
        const lenderFundingSource = loan.lender_dwolla_funding_source_url;

        // Skip if borrower doesn't have bank connected - mark as missed
        if (!borrowerFundingSource) {
          console.log(`[Auto-Pay] Payment ${payment.id} - borrower no bank, marking missed`);
          await handleMissedPayment(supabase, payment, loan, 'Borrower bank not connected');
          results.failed++;
          continue;
        }

        // Skip if lender doesn't have bank connected - mark as missed
        if (!lenderFundingSource) {
          console.log(`[Auto-Pay] Payment ${payment.id} - lender no bank, marking missed`);
          await handleMissedPayment(supabase, payment, loan, 'Lender bank not connected');
          results.failed++;
          continue;
        }

        console.log(`[Auto-Pay] Processing payment ${payment.id} - $${payment.amount}`);

        // Create Dwolla transfer: Borrower -> Master Account -> Lender (facilitated)
        const { transferUrl, transferIds } = await createFacilitatedTransfer({
          sourceFundingSourceUrl: borrowerFundingSource,
          destinationFundingSourceUrl: lenderFundingSource,
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

        // Record all transfer steps
        for (const tid of transferIds) {
          await supabase
            .from('transfers')
            .insert({
              loan_id: loan.id,
              dwolla_transfer_id: tid,
              dwolla_transfer_url: `https://api-sandbox.dwolla.com/transfers/${tid}`,
              type: 'repayment',
              amount: payment.amount,
              currency: 'USD',
              status: 'pending',
            });
        }

        // Update payment schedule
        await supabase
          .from('payment_schedule')
          .update({
            is_paid: true,
            paid_amount: payment.amount,
            transfer_id: transferId,
            paid_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        // Update loan amounts
        const newAmountPaid = (loan.amount_paid || 0) + payment.amount;
        const newAmountRemaining = (loan.total_amount || loan.amount) - newAmountPaid;
        const isCompleted = newAmountRemaining <= 0;
        
        await supabase
          .from('loans')
          .update({
            amount_paid: newAmountPaid,
            amount_remaining: Math.max(0, newAmountRemaining),
            status: isCompleted ? 'completed' : 'active',
            last_payment_at: new Date().toISOString(),
          })
          .eq('id', loan.id);

        // Send payment received email to lender
        await sendPaymentReceivedEmail(loan, payment, newAmountRemaining, isCompleted);

        results.processed++;
        console.log(`[Auto-Pay] Successfully processed payment ${payment.id}`);

      } catch (err: any) {
        console.error(`[Auto-Pay] Error processing payment ${payment.id}:`, err);
        
        // Send missed payment email
        const loan = payment.loan;
        if (loan) {
          await handleMissedPayment(supabase, payment, loan, err.message);
        }
        
        results.failed++;
        results.errors.push(`Payment ${payment.id}: ${err.message}`);
      }
    }

    console.log(`[Auto-Pay] Complete. Processed: ${results.processed}, Failed: ${results.failed}, Skipped: ${results.skipped}`);

    return NextResponse.json({
      success: true,
      date: today,
      ...results,
    });

  } catch (error: any) {
    console.error('[Auto-Pay] Fatal error:', error);
    return NextResponse.json(
      { error: error.message || 'Auto-pay processing failed' },
      { status: 500 }
    );
  }
}

// Handle missed payment - update DB and send notification
async function handleMissedPayment(
  supabase: any, 
  payment: any, 
  loan: any, 
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

  // Send email to lender
  const lenderEmail = loan.lender_email;
  const lenderName = loan.lender_name || 'Lender';
  const borrowerName = loan.borrower_name || 'Borrower';

  if (lenderEmail) {
    try {
      await sendEmail({
        to: lenderEmail,
        subject: `⚠️ Payment Missed - ${borrowerName}`,
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
                    <div style="width: 60px; height: 60px; background: #fef3c7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                      <span style="font-size: 28px;">⚠️</span>
                    </div>
                  </div>
                  
                  <h2 style="color: #b45309; text-align: center; margin-bottom: 20px;">Payment Missed</h2>
                  
                  <p style="font-size: 16px; color: #374151;">Hi ${lenderName},</p>
                  
                  <p style="color: #374151;">
                    A scheduled payment from <strong>${borrowerName}</strong> was not processed.
                  </p>
                  
                  <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #92400e; margin: 0;">
                      <strong>Amount:</strong> $${payment.amount.toFixed(2)}<br>
                      <strong>Due Date:</strong> ${format(new Date(payment.due_date), 'MMMM d, yyyy')}<br>
                      <strong>Reason:</strong> ${reason}
                    </p>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 14px;">
                    We'll automatically retry this payment. You may also want to reach out to ${borrowerName} directly.
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
      console.log(`[Auto-Pay] Sent missed payment email to ${lenderEmail}`);
    } catch (emailErr) {
      console.error('[Auto-Pay] Failed to send missed payment email:', emailErr);
    }
  }
}

// Send payment received email to lender
async function sendPaymentReceivedEmail(
  loan: any, 
  payment: any, 
  amountRemaining: number,
  isCompleted: boolean
) {
  const lenderEmail = loan.lender_email;
  const lenderName = loan.lender_name || 'Lender';
  const borrowerName = loan.borrower_name || 'Borrower';

  if (!lenderEmail) return;

  try {
    await sendEmail({
      to: lenderEmail,
      subject: isCompleted 
        ? `🎉 Loan Paid Off! - ${borrowerName}` 
        : `💰 Payment Received - $${payment.amount.toFixed(2)}`,
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
                    <span style="font-size: 28px;">${isCompleted ? '🎉' : '💰'}</span>
                  </div>
                </div>
                
                <h2 style="color: #065f46; text-align: center; margin-bottom: 20px;">
                  ${isCompleted ? 'Loan Paid in Full!' : 'Payment Received!'}
                </h2>
                
                <p style="font-size: 16px; color: #374151;">Hi ${lenderName},</p>
                
                <p style="color: #374151;">
                  ${isCompleted 
                    ? `Great news! <strong>${borrowerName}</strong> has paid off their loan in full. 🎉`
                    : `<strong>${borrowerName}</strong> has made a payment on their loan.`
                  }
                </p>
                
                <div style="background: #d1fae5; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <p style="color: #065f46; margin: 0; font-size: 24px; font-weight: bold;">
                    $${payment.amount.toFixed(2)}
                  </p>
                  <p style="color: #047857; margin: 4px 0 0 0; font-size: 14px;">
                    Payment received
                  </p>
                </div>
                
                ${!isCompleted ? `
                  <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #374151; margin: 0;">
                      <strong>Remaining Balance:</strong> $${amountRemaining.toFixed(2)}
                    </p>
                  </div>
                ` : ''}
                
                <p style="color: #6b7280; font-size: 14px;">
                  Funds will arrive in your bank account within 1-3 business days.
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
    console.log(`[Auto-Pay] Sent payment received email to ${lenderEmail}`);
  } catch (emailErr) {
    console.error('[Auto-Pay] Failed to send payment received email:', emailErr);
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

    // Create Dwolla transfer (facilitated)
    const { transferUrl, transferIds } = await createFacilitatedTransfer({
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

    // Record transfers
    for (const tid of transferIds) {
      await supabase
        .from('transfers')
        .insert({
          loan_id: loan.id,
          dwolla_transfer_id: tid,
          dwolla_transfer_url: `https://api-sandbox.dwolla.com/transfers/${tid}`,
          type: 'repayment',
          amount: payment.amount,
          currency: 'USD',
          status: 'pending',
        });
    }

    // Update payment
    await supabase
      .from('payment_schedule')
      .update({
        is_paid: true,
        paid_amount: payment.amount,
        transfer_id: transferId,
        paid_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    // Update loan
    const newAmountPaid = (loan.amount_paid || 0) + payment.amount;
    const newAmountRemaining = (loan.total_amount || loan.amount) - newAmountPaid;
    const isCompleted = newAmountRemaining <= 0;
    
    await supabase
      .from('loans')
      .update({
        amount_paid: newAmountPaid,
        amount_remaining: Math.max(0, newAmountRemaining),
        status: isCompleted ? 'completed' : 'active',
        last_payment_at: new Date().toISOString(),
      })
      .eq('id', loan.id);

    // Send payment received email
    await sendPaymentReceivedEmail(loan, payment, Math.max(0, newAmountRemaining), isCompleted);

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      transfer_id: transferId,
      amount: payment.amount,
      amount_remaining: Math.max(0, newAmountRemaining),
    });

  } catch (error: any) {
    console.error('Manual payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment processing failed' },
      { status: 500 }
    );
  }
}