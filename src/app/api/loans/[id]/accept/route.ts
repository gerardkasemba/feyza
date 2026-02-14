import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getLoanAcceptedEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const supabase = await createServerSupabaseClient();
    const serviceSupabase = await createServiceRoleClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the loan with all details using service role to avoid RLS issues
    const { data: loan, error: loanError } = await serviceSupabase
      .from('loans')
      .select('*, borrower:users!borrower_id(*)')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      console.error('Error fetching loan:', loanError);
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Check loan status
    if (loan.status !== 'pending' && loan.status !== 'matched') {
      return NextResponse.json({ 
        error: `Cannot accept loan with status: ${loan.status}` 
      }, { status: 400 });
    }

    // Verify user is the lender or business owner
    let isAuthorized = false;
    let lenderName = user.user_metadata?.full_name || 'Your lender';
    
    // Check if user is individual lender
    if (loan.lender_id === user.id) {
      isAuthorized = true;
    }
    
    // Check if user owns the business lender
    if (!isAuthorized && loan.business_lender_id) {
      const { data: businessProfile } = await serviceSupabase
        .from('business_profiles')
        .select('user_id, business_name')
        .eq('id', loan.business_lender_id)
        .single();
      
      if (businessProfile?.user_id === user.id) {
        isAuthorized = true;
        if (businessProfile?.business_name) {
          lenderName = businessProfile.business_name;
        }
      }
    }
    
    // Check if loan was sent directly to this user (no lender assigned yet)
    // This handles the case where loan is pending/matched but no lender_id
    if (!isAuthorized && !loan.lender_id) {
      // Check if there's a lender match for this user
      const { data: match } = await serviceSupabase
        .from('lender_matches')
        .select('id')
        .eq('loan_id', loanId)
        .eq('lender_id', user.id)
        .single();
      
      if (match) {
        isAuthorized = true;
      }
      
      // Also check if user has a business that was matched
      if (!isAuthorized) {
        const { data: businessMatch } = await serviceSupabase
          .from('lender_matches')
          .select('id, business_profiles!inner(user_id, business_name)')
          .eq('loan_id', loanId)
          .not('business_lender_id', 'is', null);
        
        const userMatch = businessMatch?.find((m: any) => 
          m.business_profiles?.user_id === user.id
        );
        if (userMatch) {
          isAuthorized = true;
          lenderName = (userMatch as any).business_profiles?.business_name || lenderName;
        }
      }
    }

    // Get user's full name for lender name if not set
    if (isAuthorized && lenderName === 'Your lender') {
      const { data: userProfile } = await serviceSupabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (userProfile?.full_name) {
        lenderName = userProfile.full_name;
      }
    }

    if (!isAuthorized) {
      console.log('Authorization failed for user:', user.id, 'on loan:', loanId);
      return NextResponse.json({ error: 'Not authorized to accept this loan' }, { status: 403 });
    }

    // Get lender email
    let lenderEmail = user.email;
    
    // If business lender, get business contact email
    if (loan.business_lender_id) {
      const { data: business } = await serviceSupabase
        .from('business_profiles')
        .select('contact_email, business_name')
        .eq('id', loan.business_lender_id)
        .single();
      if (business) {
        lenderEmail = business.contact_email || user.email;
        lenderName = business.business_name || lenderName;
      }
    }

    // Get lender's interest rate
    
    let interestRate = loan.interest_rate || 0; // Default to loan's current rate
    let interestType = loan.interest_type || 'simple';

    if (loan.business_lender_id) {
      // Get business lender's interest rate from preferences first
      const { data: lenderPref } = await serviceSupabase
        .from('lender_preferences')
        .select('interest_rate')
        .eq('business_id', loan.business_lender_id)
        .single();
      
      if (lenderPref?.interest_rate !== null && lenderPref?.interest_rate !== undefined) {
        interestRate = lenderPref.interest_rate;
        console.log(`[Accept] Using lender preference interest rate: ${interestRate}%`);
      } else {
        // Fall back to business profile default rate
        const { data: business } = await serviceSupabase
          .from('business_profiles')
          .select('default_interest_rate, interest_type')
          .eq('id', loan.business_lender_id)
          .single();
        
        if (business) {
          interestRate = business.default_interest_rate || 0;
          interestType = business.interest_type || 'simple';
          console.log(`[Accept] Using business profile interest rate: ${interestRate}% (${interestType})`);
        }
      }
    }

    // FIXED: Calculate total interest correctly based on interest type
    let totalInterest: number;
    let totalAmount: number;

    if (interestType === 'compound') {
      // For compound interest, we need the term in months
      const loanMonths = loan.total_installments * 
        (loan.repayment_frequency === 'weekly' ? 0.25 : 
         loan.repayment_frequency === 'biweekly' ? 0.5 : 1);
      
      // Compound interest formula: A = P(1 + r/n)^(nt) - P
      // For monthly compounding: A = P(1 + r/12)^months - P
      const monthlyRate = interestRate / 100 / 12;
      const compoundAmount = loan.amount * Math.pow(1 + monthlyRate, loanMonths);
      totalInterest = Math.round((compoundAmount - loan.amount) * 100) / 100;
      
      console.log(`[Accept] Compound interest calculation:`, {
        principal: loan.amount,
        rate: interestRate,
        months: loanMonths,
        monthlyRate,
        compoundAmount,
        totalInterest
      });
    } else {
      // SIMPLE INTEREST: Total interest = principal * (rate / 100)
      // rate is the TOTAL interest percentage (e.g., 20% means $20 interest on $100)
      totalInterest = Math.round(loan.amount * (interestRate / 100) * 100) / 100;
      
      console.log(`[Accept] Simple interest calculation:`, {
        principal: loan.amount,
        rate: interestRate,
        totalInterest,
        expected: loan.amount * (interestRate / 100)
      });
    }

    totalAmount = Math.round((loan.amount + totalInterest) * 100) / 100;

    console.log(`[Accept] Calculated interest for loan ${loanId}:`, {
      principal: loan.amount,
      rate: interestRate,
      type: interestType,
      totalInterest,
      totalAmount
    });

    // Update loan status to active and set lender details + interest
    const { error: updateError } = await serviceSupabase
      .from('loans')
      .update({
        status: 'active',
        lender_id: user.id,
        lender_name: lenderName,
        lender_email: lenderEmail,
        interest_rate: interestRate,
        interest_type: interestType,
        total_interest: totalInterest,
        total_amount: totalAmount,
        amount_remaining: totalAmount, // Set remaining to total (principal + interest)
        updated_at: new Date().toISOString(),
        uses_apr_calculation: false, // Explicitly set to false for simple interest
      })
      .eq('id', loanId);

    if (updateError) {
      console.error('Error updating loan:', updateError);
      return NextResponse.json({ error: 'Failed to accept loan: ' + updateError.message }, { status: 500 });
    }

    console.log(`[Accept] Loan ${loanId} updated with interest rate ${interestRate}%`);

    // Regenerate payment schedule with new interest
    try {
      // Delete old schedule
      await serviceSupabase
        .from('payment_schedule')
        .delete()
        .eq('loan_id', loanId);

      // Calculate per-installment amounts
      const paymentAmount = Math.round((totalAmount / loan.total_installments) * 100) / 100;
      const principalPerPayment = Math.round((loan.amount / loan.total_installments) * 100) / 100;
      const interestPerPayment = Math.round((totalInterest / loan.total_installments) * 100) / 100;

      // Generate new schedule
      const schedule = [];
      let currentDate = new Date(loan.start_date);
      
      for (let i = 0; i < loan.total_installments; i++) {
        // Adjust last payment to account for rounding
        const isLast = i === loan.total_installments - 1;
        const adjustedPayment = isLast ? 
          totalAmount - (paymentAmount * i) : paymentAmount;
        const adjustedPrincipal = isLast ? 
          loan.amount - (principalPerPayment * i) : principalPerPayment;
        const adjustedInterest = isLast ? 
          totalInterest - (interestPerPayment * i) : interestPerPayment;

        schedule.push({
          loan_id: loanId,
          due_date: currentDate.toISOString().split('T')[0],
          amount: adjustedPayment,
          principal_amount: adjustedPrincipal,
          interest_amount: adjustedInterest,
          is_paid: false,
          status: 'pending',
        });

        // Move to next payment date based on frequency
        if (loan.repayment_frequency === 'weekly') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (loan.repayment_frequency === 'biweekly') {
          currentDate.setDate(currentDate.getDate() + 14);
        } else if (loan.repayment_frequency === 'monthly') {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }

      // Insert new schedule
      const { error: scheduleError } = await serviceSupabase
        .from('payment_schedule')
        .insert(schedule);

      if (scheduleError) {
        console.error('[Accept] Error regenerating payment schedule:', scheduleError);
      } else {
        console.log(`[Accept] Regenerated payment schedule for loan ${loanId} with ${schedule.length} installments`);
      }
    } catch (scheduleError) {
      console.error('[Accept] Error in schedule regeneration:', scheduleError);
      // Don't fail the acceptance if schedule regeneration fails
    }

    // Create disbursement if loan has recipient info (for diaspora loans)
    if (loan.recipient_name && loan.disbursement_method) {
      try {
        await serviceSupabase.from('disbursements').insert({
          loan_id: loanId,
          amount: loan.amount,
          currency: loan.currency || 'USD',
          disbursement_method: loan.disbursement_method,
          // Mobile Money
          mobile_provider: loan.mobile_money_provider,
          mobile_number: loan.mobile_money_phone,
          mobile_name: loan.mobile_money_name,
          // Bank Transfer
          bank_name: loan.bank_name,
          bank_account_name: loan.bank_account_name,
          bank_account_number: loan.bank_account_number,
          bank_branch: loan.bank_branch,
          bank_swift_code: loan.bank_swift_code,
          // Cash Pickup
          pickup_location: loan.cash_pickup_location,
          // Recipient
          recipient_name: loan.recipient_name,
          recipient_phone: loan.recipient_phone,
          recipient_id_type: loan.picker_id_type,
          recipient_id_number: loan.picker_id_number,
          recipient_country: loan.recipient_country,
          status: 'pending',
        });
        console.log('Disbursement created for loan:', loanId);
      } catch (disbursementError) {
        console.error('Error creating disbursement:', disbursementError);
        // Don't fail the loan acceptance if disbursement creation fails
      }
    }

    // Create notification for borrower
    try {
      await serviceSupabase.from('notifications').insert({
        user_id: loan.borrower_id,
        loan_id: loanId,
        type: 'loan_accepted',
        title: 'Loan Accepted! 🎉',
        message: `${lenderName} has accepted your loan request for ${loan.currency || 'USD'} ${loan.amount}. They will send the funds shortly.`,
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    // Send email to borrower
    if (loan.borrower?.email) {
      try {
        const { subject, html } = getLoanAcceptedEmail({
          borrowerName: loan.borrower.full_name || 'there',
          lenderName,
          amount: loan.amount,
          currency: loan.currency || 'USD',
          loanId: loan.id,
        });

        await sendEmail({ to: loan.borrower.email, subject, html });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    }

    // Redirect to fund page so lender can sign and send funds
    return NextResponse.json({ 
      success: true, 
      redirectUrl: `/loans/${loanId}/fund`,
      message: 'Loan accepted! Please proceed to fund the loan.',
    });
  } catch (error: any) {
    console.error('Error accepting loan:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error.message || 'Unknown error') 
    }, { status: 500 });
  }
}