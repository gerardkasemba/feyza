import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { randomBytes } from 'crypto';
import { addDays, addWeeks, format } from 'date-fns';
import { validateRepaymentSchedule } from '@/lib/smartSchedule';

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

    // Try to get borrower name from loan_requests (if this loan came from a request)
    let borrowerName = null;
    const { data: loanRequest } = await supabase
      .from('loan_requests')
      .select('borrower_name')
      .eq('loan_id', loanId)
      .single();
    
    if (loanRequest?.borrower_name) {
      borrowerName = loanRequest.borrower_name;
    } else if (loan.borrower_invite_email) {
      // Extract name from email as fallback
      borrowerName = loan.borrower_invite_email.split('@')[0];
    }

    // Format as expected by frontend (with proposed_ prefix for borrower's proposal)
    const loanData = {
      ...loan,
      borrower_name: borrowerName,
      proposed_frequency: loan.repayment_frequency,
      proposed_installments: loan.total_installments,
      proposed_payment_amount: loan.repayment_amount,
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
      interest_rate,
      interest_type,
      repayment_frequency,
      total_installments,
      start_date,
      payment_method,
      payment_username,
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

    // Get borrower info separately
    let borrowerEmail = loan.borrower_invite_email;
    let borrowerName = 'there';
    
    if (loan.borrower_id) {
      const { data: borrower } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', loan.borrower_id)
        .single();
      
      if (borrower) {
        borrowerEmail = borrower.email;
        borrowerName = borrower.full_name || 'there';
      }
    }

    // Validate repayment schedule (lenders have more flexibility, so just log warnings)
    const validation = validateRepaymentSchedule(loan.amount, repayment_frequency, total_installments);
    if (!validation.valid) {
      console.warn('Repayment schedule validation warning:', validation.message);
      // For lenders, we allow it but log the warning
      // They may have special arrangements with the borrower
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

    // Build update object - only include fields that exist
    const updateData: Record<string, any> = {
      interest_rate: interest_rate || 0,
      interest_type: interest_type || 'simple',
      total_interest: Math.round(totalInterest * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
      repayment_frequency,
      repayment_amount: Math.round(repaymentAmount * 100) / 100,
      total_installments,
      start_date,
      status: 'active', // Set to active - loan terms are set, ready to start
      invite_token: lenderToken,
      invite_accepted: true,
      // Save lender's payment info for borrower to repay
      lender_preferred_payment_method: payment_method || null,
    };

    // Add lender payment details based on method
    if (payment_method === 'paypal') {
      updateData.lender_paypal_email = payment_username;
    } else if (payment_method === 'cashapp') {
      updateData.lender_cashapp_username = payment_username;
    } else if (payment_method === 'venmo') {
      updateData.lender_venmo_username = payment_username;
    }

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

    // Notify borrower that terms are set
    if (borrowerEmail) {
      try {
      await sendEmail({
        to: borrowerEmail,
        subject: '📋 Loan terms are ready for your review',
        html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <!-- Header with logo -->
              <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
                <!-- Logo -->
                <div style="margin-bottom: 20px;">
                  <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                      alt="Feyza Logo" 
                      style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                </div>
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">📋 Loan Terms Ready</h1>
                <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Review Your Loan Agreement</p>
              </div>
              
              <!-- Content area -->
              <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${borrowerName},</p>
                
                <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                  Great news! Your lender has set the terms for your loan. Please review them carefully before proceeding.
                </p>
                
                <!-- Loan Terms Summary Card -->
                <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                  <h3 style="margin: 0 0 20px 0; color: #065f46; font-size: 20px; font-weight: 600; padding-bottom: 10px; border-bottom: 2px solid #f0fdf4;">
                    📊 Loan Terms Summary
                  </h3>
                  
                  <div style="display: grid; gap: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0fdf4;">
                      <span style="color: #047857; font-weight: 500;">Loan Amount:</span>
                      <strong style="color: #059669; font-size: 18px;">${loan.currency} ${loan.amount.toLocaleString()}</strong>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0fdf4;">
                      <span style="color: #047857; font-weight: 500;">Interest Rate:</span>
                      <strong style="color: #059669;">${interest_rate || 0}% (${interest_type})</strong>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0fdf4;">
                      <span style="color: #047857; font-weight: 500;">Total Repayment:</span>
                      <strong style="color: #059669; font-size: 18px;">${loan.currency} ${Math.round(totalAmount).toLocaleString()}</strong>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0fdf4;">
                      <span style="color: #047857; font-weight: 500;">Payment Amount:</span>
                      <strong style="color: #059669;">${loan.currency} ${Math.round(repaymentAmount).toLocaleString()} ${repayment_frequency}</strong>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0;">
                      <span style="color: #047857; font-weight: 500;">First Payment Due:</span>
                      <strong style="color: #059669;">${format(new Date(start_date), 'MMM d, yyyy')}</strong>
                    </div>
                  </div>
                  
                  <!-- Important Note -->
                  <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #d97706;">
                    <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5;">
                      ⚠️ <strong>Important:</strong> Review all terms carefully. Once accepted, these terms become legally binding.
                    </p>
                  </div>
                </div>
                
                <!-- Action Buttons -->
                <div style="display: flex; gap: 15px; margin: 30px 0; flex-wrap: wrap;">
                  <a href="${APP_URL}/borrower/${loan.borrower_access_token}" 
                    style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                            color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                            font-weight: 600; text-align: center; font-size: 16px; flex: 1;
                            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease; min-width: 200px;"
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                    onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                    Review & Accept Terms →
                  </a>
                  
                  <a href="${APP_URL}/help/loan-agreements" 
                    style="display: inline-block; background: white; 
                            color: #059669; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                            font-weight: 600; text-align: center; font-size: 16px; border: 2px solid #059669;
                            box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1); transition: all 0.2s ease; flex: 1;
                            min-width: 200px;"
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';this.style.background='#f0fdf4';"
                    onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(5, 150, 105, 0.1)';this.style.background='white';">
                    Need Help?
                  </a>
                </div>
                
                <!-- Next Steps -->
                <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #86efac;">
                  <h4 style="color: #065f46; margin: 0 0 15px 0; font-weight: 600;">📝 What Happens Next:</h4>
                  <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                    <li style="margin-bottom: 8px; line-height: 1.5;">Review all terms and conditions carefully</li>
                    <li style="margin-bottom: 8px; line-height: 1.5;">Accept the terms to proceed with funding</li>
                    <li style="line-height: 1.5;">Once accepted, funds will be disbursed according to the agreed timeline</li>
                  </ul>
                </div>
                
                <!-- Deadline Reminder -->
                <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d97706;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #92400e; font-size: 18px;">⏰</span>
                    <div>
                      <p style="color: #92400e; margin: 0; font-weight: 600;">Response Required</p>
                      <p style="color: #92400e; margin: 5px 0 0 0; font-size: 14px;">Please review and respond within 48 hours to avoid expiration of these terms.</p>
                    </div>
                  </div>
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                  <p style="margin: 0 0 10px 0;">Questions about these terms?</p>
                  <p style="margin: 0;">
                    <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                      Contact our support team for assistance
                    </a>
                  </p>
                </div>
              </div>
              
              <!-- Signature -->
              <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">Feyza • Secure Loan Management</p>
              </div>
            </body>
          </html>
        `,
      });
      } catch (emailError) {
        console.error('Email send error:', emailError);
        // Don't fail the whole request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      lender_token: lenderToken,
      message: 'Loan terms saved successfully',
    });

  } catch (error) {
    console.error('Save loan terms error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
