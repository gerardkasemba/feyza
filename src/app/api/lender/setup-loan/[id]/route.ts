import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { randomBytes } from 'crypto';
import { addDays, addWeeks, format } from 'date-fns';
import { validateRepaymentSchedule } from '@/lib/smartSchedule';
import { createFacilitatedTransfer } from '@/lib/dwolla';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// GET: Fetch loan for setup
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { id: loanId } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Fetch loan with all relevant fields
    const { data: loan, error } = await supabase
      .from('loans')
      .select(`
        id, 
        amount, 
        currency, 
        purpose, 
        borrower_invite_email, 
        status, 
        invite_token,
        repayment_frequency,
        total_installments,
        repayment_amount,
        borrower_payment_method,
        borrower_payment_username
      `)
      .eq('id', loanId)
      .single();

    if (error || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Verify token
    if (loan.invite_token !== token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    // Try to get borrower name and proposal details from loan_requests (if this loan came from a request)
    let borrowerName = null;
    let proposedStartDate = null;
    let proposedFrequency = loan.repayment_frequency;
    let proposedInstallments = loan.total_installments;
    let proposedPaymentAmount = loan.repayment_amount;
    
    const { data: loanRequest } = await supabase
      .from('loan_requests')
      .select('borrower_name, proposed_frequency, proposed_installments, proposed_payment_amount, proposed_start_date')
      .eq('loan_id', loanId)
      .single();
    
    if (loanRequest) {
      borrowerName = loanRequest.borrower_name;
      if (loanRequest.proposed_frequency) proposedFrequency = loanRequest.proposed_frequency;
      if (loanRequest.proposed_installments) proposedInstallments = loanRequest.proposed_installments;
      if (loanRequest.proposed_payment_amount) proposedPaymentAmount = loanRequest.proposed_payment_amount;
      if (loanRequest.proposed_start_date) proposedStartDate = loanRequest.proposed_start_date;
    }
    
    if (!borrowerName && loan.borrower_invite_email) {
      // Extract name from email as fallback
      borrowerName = loan.borrower_invite_email.split('@')[0];
    }

    // Format as expected by frontend (with proposed_ prefix for borrower's proposal)
    const loanData = {
      ...loan,
      borrower_name: borrowerName,
      proposed_frequency: proposedFrequency,
      proposed_installments: proposedInstallments,
      proposed_payment_amount: proposedPaymentAmount,
      proposed_start_date: proposedStartDate,
    };

    return NextResponse.json({ loan: loanData });

  } catch (error) {
    console.error('Fetch loan for setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Save loan terms
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { id: loanId } = await params;
    const body = await request.json();

    console.log('Setup loan request body:', body);

    const {
      token,
      lender_name,
      lender_email,
      lender_dwolla_customer_url,
      lender_dwolla_customer_id,
      lender_dwolla_funding_source_url,
      lender_dwolla_funding_source_id,
      lender_bank_name,
      lender_bank_account_mask,
      interest_rate,
      interest_type,
      repayment_frequency,
      total_installments,
      start_date,
      bank_connected,
    } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Fetch loan and verify token
    const { data: loanData, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError || !loanData) {
      console.error('Loan fetch error:', loanError);
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const loan = loanData;

    if (loan.invite_token !== token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    // Get borrower info and Dwolla details from multiple sources
    const { data: loanRequest } = await supabase
      .from('loan_requests')
      .select('*')
      .eq('loan_id', loanId)
      .single();

    let borrowerEmail = loan.borrower_invite_email;
    let borrowerName = loan.borrower_name || 'there';
    
    // Priority: loan table > loan_request table > users table
    let borrowerDwollaFundingSource = loan.borrower_dwolla_funding_source_url 
      || loanRequest?.borrower_dwolla_funding_source_url;
    let borrowerDwollaCustomerUrl = loan.borrower_dwolla_customer_url 
      || loanRequest?.borrower_dwolla_customer_url;
    
    if (loan.borrower_id) {
      const { data: borrower } = await supabase
        .from('users')
        .select('email, full_name, dwolla_funding_source_url, dwolla_customer_url')
        .eq('id', loan.borrower_id)
        .single();
      
      if (borrower) {
        borrowerEmail = borrower.email;
        borrowerName = borrower.full_name || borrowerName;
        // Use user's Dwolla info if not already set from loan
        if (!borrowerDwollaFundingSource && borrower.dwolla_funding_source_url) {
          borrowerDwollaFundingSource = borrower.dwolla_funding_source_url;
          borrowerDwollaCustomerUrl = borrower.dwolla_customer_url;
        }
      }
    }
    
    // Use loan_request name if available and not already set
    if (loanRequest?.borrower_name && !loan.borrower_name) {
      borrowerName = loanRequest.borrower_name;
    }

    console.log('Borrower Dwolla info:', {
      borrowerDwollaFundingSource,
      borrowerDwollaCustomerUrl,
      source: loan.borrower_dwolla_funding_source_url ? 'loan' 
        : loanRequest?.borrower_dwolla_funding_source_url ? 'loan_request' 
        : 'users'
    });

    // Validate that both parties have bank connected for disbursement
    if (!lender_dwolla_funding_source_url) {
      return NextResponse.json({ error: 'Please connect your bank account' }, { status: 400 });
    }
    
    if (!borrowerDwollaFundingSource) {
      return NextResponse.json({ error: 'Borrower has not connected their bank account' }, { status: 400 });
    }

    // Validate repayment schedule (lenders have more flexibility, so just log warnings)
    const validation = validateRepaymentSchedule(loan.amount, repayment_frequency, total_installments);
    if (!validation.valid) {
      console.warn('Repayment schedule validation warning:', validation.message);
    }

    // Calculate interest
    const principal = loan.amount;
    const rate = (interest_rate || 0) / 100;
    
    let totalInterest = 0;
    if (interest_type === 'simple') {
      totalInterest = principal * rate * (total_installments / 12);
    } else if (rate > 0) {
      const periodsPerYear = repayment_frequency === 'weekly' ? 52 : repayment_frequency === 'biweekly' ? 26 : 12;
      const periodicRate = rate / periodsPerYear;
      totalInterest = principal * Math.pow(1 + periodicRate, total_installments) - principal;
    }

    const totalAmount = principal + totalInterest;
    const repaymentAmount = totalAmount / total_installments;

    // Generate new lender token for ongoing access
    const lenderToken = generateToken();

    // Build update object
    const updateData: Record<string, any> = {
      interest_rate: interest_rate || 0,
      interest_type: interest_type || 'simple',
      total_interest: Math.round(totalInterest * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
      repayment_frequency,
      repayment_amount: Math.round(repaymentAmount * 100) / 100,
      total_installments,
      start_date,
      amount_remaining: Math.round(totalAmount * 100) / 100,
      status: 'active',
      invite_token: lenderToken,
      invite_accepted: true,
      invite_accepted_at: new Date().toISOString(),
      lender_signed: true,
      lender_signed_at: new Date().toISOString(),
      auto_pay_enabled: true,
      // Store lender info
      lender_name,
      lender_email,
      lender_dwolla_customer_url,
      lender_dwolla_customer_id,
      lender_dwolla_funding_source_url,
      lender_dwolla_funding_source_id,
      lender_bank_name,
      lender_bank_account_mask,
      lender_bank_connected: true,
      // Store borrower Dwolla info (from loan_request)
      borrower_name: borrowerName,
      borrower_dwolla_customer_url: borrowerDwollaCustomerUrl,
      borrower_dwolla_customer_id: borrowerDwollaCustomerUrl?.split('/').pop(),
      borrower_dwolla_funding_source_url: borrowerDwollaFundingSource,
      borrower_dwolla_funding_source_id: borrowerDwollaFundingSource?.split('/').pop(),
      borrower_bank_name: loanRequest?.borrower_bank_name,
      borrower_bank_account_mask: loanRequest?.borrower_bank_account_mask,
      borrower_bank_connected: true,
    };

    // Update loan with terms
    const { error: updateError } = await supabase
      .from('loans')
      .update(updateData)
      .eq('id', loanId);

    if (updateError) {
      console.error('Loan update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update loan terms', 
        details: updateError.message,
        hint: updateError.hint || 'Check that all status values are valid'
      }, { status: 500 });
    }

    // Process disbursement: Lender -> Master Account Balance -> Borrower
    // Using facilitated transfer because both parties are unverified customers
    let disbursementTransferId = null;
    try {
      const { transferUrl, transferIds } = await createFacilitatedTransfer({
        sourceFundingSourceUrl: lender_dwolla_funding_source_url,
        destinationFundingSourceUrl: borrowerDwollaFundingSource,
        amount: principal,
        currency: 'USD',
        metadata: {
          loan_id: loanId,
          type: 'disbursement',
        },
      });

      if (transferUrl && transferIds.length > 0) {
        disbursementTransferId = transferIds[transferIds.length - 1]; // Use the final transfer ID
        
        // Record all transfer steps
        for (let i = 0; i < transferIds.length; i++) {
          await supabase
            .from('transfers')
            .insert({
              loan_id: loanId,
              dwolla_transfer_id: transferIds[i],
              dwolla_transfer_url: `https://api-sandbox.dwolla.com/transfers/${transferIds[i]}`,
              type: 'disbursement',
              amount: principal,
              currency: 'USD',
              status: 'pending',
            });
        }

        // Update loan to mark disbursement
        await supabase
          .from('loans')
          .update({
            disbursement_status: 'processing',
            disbursement_transfer_id: disbursementTransferId,
            disbursed_at: new Date().toISOString(),
          })
          .eq('id', loanId);
          
        console.log('Disbursement initiated (facilitated):', disbursementTransferId);
      }
    } catch (disbErr: any) {
      console.error('Disbursement error (continuing anyway):', JSON.stringify(disbErr.body || disbErr, null, 2));
      // Don't fail the whole request - loan is set up, disbursement can be retried
    }

    // Delete any existing schedule for this loan
    await supabase
      .from('payment_schedule')
      .delete()
      .eq('loan_id', loanId);

    // Generate payment schedule with principal and interest breakdown
    const schedule = [];
    let currentDate = new Date(start_date);
    const principalPerPayment = principal / total_installments;
    const interestPerPayment = totalInterest / total_installments;
    
    for (let i = 0; i < total_installments; i++) {
      schedule.push({
        loan_id: loanId,
        due_date: format(currentDate, 'yyyy-MM-dd'),
        amount: Math.round(repaymentAmount * 100) / 100,
        principal_amount: Math.round(principalPerPayment * 100) / 100,
        interest_amount: Math.round(interestPerPayment * 100) / 100,
        is_paid: false,
        status: 'pending',
      });

      // Calculate next due date
      if (repayment_frequency === 'weekly') {
        currentDate = addWeeks(currentDate, 1);
      } else if (repayment_frequency === 'biweekly') {
        currentDate = addWeeks(currentDate, 2);
      } else {
        currentDate = addDays(currentDate, 30);
      }
    }

    // Insert payment schedule
    const { error: scheduleError } = await supabase
      .from('payment_schedule')
      .insert(schedule);

    if (scheduleError) {
      console.error('Schedule insert error:', scheduleError);
    }

    // Notify borrower that loan is funded
    if (borrowerEmail) {
      try {
        await sendEmail({
          to: borrowerEmail,
          subject: '💰 Loan Funded! Money is on the way',
          html: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0;">💰 Loan Funded!</h1>
                </div>
                
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0;">
                  <p style="font-size: 18px; color: #374151;">Hi ${borrowerName},</p>
                  
                  <p style="color: #374151;">
                    Great news! <strong>${lender_name || 'Your lender'}</strong> has funded your loan. The money is on its way to your bank account!
                  </p>
                  
                  <div style="background: #d1fae5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="color: #065f46; margin: 0; font-size: 16px;">
                      💵 <strong>${loan.currency} ${loan.amount.toLocaleString()}</strong> will arrive in 1-3 business days
                    </p>
                  </div>
                  
                  <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
                    <h3 style="margin: 0 0 15px 0; color: #374151;">Repayment Terms</h3>
                    <div style="margin-bottom: 10px;">
                      <span style="color: #6b7280;">Interest Rate:</span>
                      <strong style="float: right;">${interest_rate || 0}% (${interest_type})</strong>
                    </div>
                    <div style="margin-bottom: 10px;">
                      <span style="color: #6b7280;">Total to Repay:</span>
                      <strong style="float: right; color: #2563eb;">${loan.currency} ${Math.round(totalAmount).toLocaleString()}</strong>
                    </div>
                    <div style="margin-bottom: 10px;">
                      <span style="color: #6b7280;">Payment:</span>
                      <strong style="float: right;">${loan.currency} ${Math.round(repaymentAmount).toLocaleString()} ${repayment_frequency}</strong>
                    </div>
                    <div>
                      <span style="color: #6b7280;">First Payment:</span>
                      <strong style="float: right;">${format(new Date(start_date), 'MMM d, yyyy')}</strong>
                    </div>
                  </div>
                  
                  <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="color: #1e40af; margin: 0; font-size: 14px;">
                      ✅ <strong>Auto-Pay Enabled</strong> - Payments will be automatically deducted from your bank account on each due date. No action needed!
                    </p>
                  </div>
                  
                  <a href="${APP_URL}/borrower/${loan.borrower_access_token}" style="display: block; background: #10b981; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
                    View Loan Details →
                  </a>
                </div>
              </body>
            </html>
          `,
        });
      } catch (emailError) {
        console.error('Email send error:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      lender_token: lenderToken,
      disbursement_initiated: !!disbursementTransferId,
      message: 'Loan funded successfully',
    });

  } catch (error) {
    console.error('Save loan terms error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
