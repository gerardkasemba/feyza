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
        // Platform fee is deducted from the payment amount
        const { transferUrl, transferIds, feeInfo } = await createFacilitatedTransfer({
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
        
        console.log(`[Auto-Pay] Fee info: gross=$${feeInfo.grossAmount}, fee=$${feeInfo.platformFee}, net=$${feeInfo.netAmount}`);

        // Record all transfer steps with fee info
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
              platform_fee: feeInfo.platformFee,
              fee_type: feeInfo.feeType,
              gross_amount: feeInfo.grossAmount,
              net_amount: feeInfo.netAmount,
            });
        }

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
          console.error(`[Auto-Pay] Error updating payment_schedule ${payment.id}:`, scheduleUpdateError);
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
          console.error(`[Auto-Pay] Error creating payment record:`, paymentInsertError);
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
          })
          .eq('id', loan.id);

        if (loanUpdateError) {
          console.error(`[Auto-Pay] Error updating loan ${loan.id}:`, loanUpdateError);
        }

        // Update borrower stats
        await updateBorrowerStats(supabase, loan, payment, isCompleted);

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

  // Update borrower's missed payment count
  if (loan.borrower_id) {
    const { data: borrower } = await supabase
      .from('users')
      .select('payments_missed, borrower_rating')
      .eq('id', loan.borrower_id)
      .single();

    if (borrower) {
      const newMissedCount = (borrower.payments_missed || 0) + 1;
      
      // Downgrade rating if too many missed payments
      let newRating = borrower.borrower_rating || 'neutral';
      if (newMissedCount >= 3) {
        newRating = 'worst';
      } else if (newMissedCount >= 2) {
        newRating = 'bad';
      } else if (newMissedCount >= 1 && (newRating === 'good' || newRating === 'great')) {
        newRating = 'neutral';
      }

      await supabase
        .from('users')
        .update({
          payments_missed: newMissedCount,
          borrower_rating: newRating,
          borrower_rating_updated_at: new Date().toISOString(),
        })
        .eq('id', loan.borrower_id);

      console.log(`[Auto-Pay] Updated borrower ${loan.borrower_id} missed count: ${newMissedCount}, rating: ${newRating}`);
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

    // Check if payment is already paid
    if (payment.is_paid) {
      return NextResponse.json(
        { error: 'This payment has already been processed' },
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
    
    console.log(`[Manual Pay] Fee info: gross=$${feeInfo.grossAmount}, fee=$${feeInfo.platformFee}, net=$${feeInfo.netAmount}`);

    // Record transfers with fee info
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
          platform_fee: feeInfo.platformFee,
          fee_type: feeInfo.feeType,
          gross_amount: feeInfo.grossAmount,
          net_amount: feeInfo.netAmount,
        });
    }

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
      console.error('Error updating payment_schedule:', updateError);
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
      console.error('Error creating payment record:', paymentInsertError);
    } else {
      // Link payment record to schedule
      await supabase
        .from('payment_schedule')
        .update({ payment_id: paymentRecord.id })
        .eq('id', payment.id);
    }

    console.log(`Payment ${payment.id} marked as paid`);

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
      })
      .eq('id', loan.id);

    if (loanUpdateError) {
      console.error('Error updating loan:', loanUpdateError);
    }

    console.log(`Loan ${loan.id} updated - paid: ${newAmountPaid}, remaining: ${newAmountRemaining}`);

    // Update borrower stats
    await updateBorrowerStats(supabase, loan, payment, isCompleted);

    // Send payment received email
    await sendPaymentReceivedEmail(loan, payment, Math.max(0, newAmountRemaining), isCompleted);

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

  } catch (error: any) {
    console.error('Manual payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment processing failed' },
      { status: 500 }
    );
  }
}

// Update borrower stats after payment
async function updateBorrowerStats(
  supabase: any,
  loan: any,
  payment: any,
  isLoanCompleted: boolean
) {
  try {
    // Determine borrower - could be a user or guest
    const borrowerId = loan.borrower_id;
    if (!borrowerId) {
      console.log('[Stats] No borrower_id, skipping stats update');
      return;
    }

    // Get current borrower stats
    const { data: borrower, error: borrowerError } = await supabase
      .from('users')
      .select('*')
      .eq('id', borrowerId)
      .single();

    if (borrowerError || !borrower) {
      console.error('[Stats] Error fetching borrower:', borrowerError);
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

    console.log(`[Stats] Payment timing: ${paymentTiming} (days diff: ${daysDiff})`);

    // Calculate new stats
    const newTotalPaymentsMade = (borrower.total_payments_made || 0) + 1;
    const newPaymentsEarly = (borrower.payments_early || 0) + (paymentTiming === 'early' ? 1 : 0);
    const newPaymentsOnTime = (borrower.payments_on_time || 0) + (paymentTiming === 'on_time' ? 1 : 0);
    const newPaymentsLate = (borrower.payments_late || 0) + (paymentTiming === 'late' ? 1 : 0);
    const newTotalAmountRepaid = (borrower.total_amount_repaid || 0) + payment.amount;
    const newCurrentOutstanding = Math.max(0, (borrower.current_outstanding_amount || 0) - payment.amount);

    // Prepare update object
    const statsUpdate: any = {
      total_payments_made: newTotalPaymentsMade,
      payments_early: newPaymentsEarly,
      payments_on_time: newPaymentsOnTime,
      payments_late: newPaymentsLate,
      total_amount_repaid: newTotalAmountRepaid,
      current_outstanding_amount: newCurrentOutstanding,
    };

    // If loan is completed, update additional stats
    if (isLoanCompleted) {
      const newTotalLoansCompleted = (borrower.total_loans_completed || 0) + 1;
      const newLoansAtCurrentTier = (borrower.loans_at_current_tier || 0) + 1;
      
      statsUpdate.total_loans_completed = newTotalLoansCompleted;
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
        console.log(`[Stats] Rating updated: ${borrower.borrower_rating} -> ${newRating}`);
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
            
            console.log(`[Stats] Tier upgraded: ${currentTier} -> ${newTier}, max: $${tierLimits[newTier]}`);
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
      console.error('[Stats] Error updating borrower stats:', updateError);
    } else {
      console.log(`[Stats] Borrower ${borrowerId} stats updated successfully`);
    }

  } catch (error) {
    console.error('[Stats] Error in updateBorrowerStats:', error);
  }
}
