import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getLoanAcceptedEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { onLoanCreatedForBusiness } from '@/lib/business/borrower-trust-service';
import { onVoucheeNewLoan } from '@/lib/vouching/accountability';
import { preparePickupFields, logDisbursementCreated } from '@/lib/disbursements';

const log = logger('loans-accept');

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
      log.error('Error fetching loan:', loanError);
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
        .from('loan_matches')
        .select('id')
        .eq('loan_id', loanId)
        .eq('lender_user_id', user.id)
        .single();
      
      if (match) {
        isAuthorized = true;
      }
      
      // Also check if user has a business that was matched
      if (!isAuthorized) {
        const { data: businessMatch } = await serviceSupabase
          .from('loan_matches')
          .select('id, business_profiles!inner(user_id, business_name)')
          .eq('loan_id', loanId)
          .not('lender_business_id', 'is', null);
        
        const userMatch = businessMatch?.find((m) => 
          (m.business_profiles as any)?.[0]?.user_id === user.id
        );
        if (userMatch) {
          isAuthorized = true;
          lenderName = (userMatch as unknown as { business_profiles?: { user_id: string; business_name: string } }).business_profiles?.business_name || lenderName;
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
      log.info('Authorization failed for user', { on_loan: loanId, data: user.id });
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

    // Get lender's interest rate — MUST use lender_tier_policies (borrower-tier-specific),
    // not lender_preferences.interest_rate (just a global fallback default).
    // This route is called when the lender accepts directly from the loan page.

    // Look up borrower's trust tier first
    const { data: borrowerTierRow } = await serviceSupabase
      .from('users')
      .select('trust_tier')
      .eq('id', loan.borrower_id)
      .single();
    const borrowerTier = borrowerTierRow?.trust_tier || 'tier_1';

    let interestRate = 0; // Will be set below; falls back to 0 (personal/free loan)
    let interestType = loan.interest_type || 'simple';

    // Determine the lender's user_id for the tier policy lookup
    let lenderUserId: string | null = user.id;
    if (loan.business_lender_id) {
      const { data: bizProfile } = await serviceSupabase
        .from('business_profiles')
        .select('user_id')
        .eq('id', loan.business_lender_id)
        .single();
      lenderUserId = bizProfile?.user_id || null;
    }

    if (lenderUserId) {
      // Try tier-specific policy first (the authoritative rate for this borrower's tier)
      const { data: tierPolicy } = await serviceSupabase
        .from('lender_tier_policies')
        .select('interest_rate')
        .eq('lender_id', lenderUserId)
        .eq('tier_id', borrowerTier)
        .eq('is_active', true)
        .single();

      if (tierPolicy?.interest_rate != null) {
        interestRate = Number(tierPolicy.interest_rate);
        log.info(`[Accept] Tier policy rate for ${borrowerTier}: ${interestRate}%`);
      } else {
        // No tier policy → fall back to global lender_preferences rate
        const prefField = loan.business_lender_id ? 'business_id' : 'user_id';
        const prefValue = loan.business_lender_id || user.id;
        const { data: lenderPref } = await serviceSupabase
          .from('lender_preferences')
          .select('interest_rate')
          .eq(prefField, prefValue)
          .single();
        interestRate = lenderPref?.interest_rate || 0;
        log.info(`[Accept] No tier policy found, using preference rate: ${interestRate}%`);
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
      
      log.info(`[Accept] Compound interest calculation:`, {
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
      
      log.info(`[Accept] Simple interest calculation:`, {
        principal: loan.amount,
        rate: interestRate,
        totalInterest,
        expected: loan.amount * (interestRate / 100)
      });
    }

    totalAmount = Math.round((loan.amount + totalInterest) * 100) / 100;

    log.info(`[Accept] Calculated interest for loan ${loanId}:`, {
      principal: loan.amount,
      rate: interestRate,
      type: interestType,
      totalInterest,
      totalAmount
    });

    // Normalize cash-pickup fields if present on the loan
    const pickupFields =
      loan.disbursement_method === 'cash_pickup'
        ? preparePickupFields({
            pickerFullName: (loan as any).picker_full_name ?? (loan as any).pickup_person_name,
            recipientName: (loan as any).recipient_name,
            cashPickupLocation: (loan as any).cash_pickup_location ?? (loan as any).pickup_person_location,
            pickerPhone: (loan as any).picker_phone ?? (loan as any).pickup_person_phone,
            pickerIdType: (loan as any).picker_id_type ?? (loan as any).pickup_person_id_type,
            pickerIdNumber: (loan as any).picker_id_number ?? (loan as any).pickup_person_id_number,
          })
        : {};

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
        repayment_amount: Math.round((totalAmount / loan.total_installments) * 100) / 100,
        amount_remaining: totalAmount, // Set remaining to total (principal + interest)
        updated_at: new Date().toISOString(),
        uses_apr_calculation: false, // Explicitly set to false for simple interest
        ...pickupFields,
      })
      .eq('id', loanId);

    if (updateError) {
      log.error('Error updating loan:', updateError);
      return NextResponse.json({ error: 'Failed to accept loan: ' + updateError.message }, { status: 500 });
    }

    log.info(`[Accept] Loan ${loanId} updated with interest rate ${interestRate}%`);

    await logDisbursementCreated({
      loanId,
      amount: loan.amount,
      method: loan.disbursement_method ?? undefined,
      currency: loan.currency ?? undefined,
    }).catch((err) => log.error('[Accept] logDisbursementCreated error (non-fatal):', err));

    // Update borrower_business_trust when loan becomes active (replaces tr_update_trust_on_loan_create trigger)
    if (loan.business_lender_id) {
      onLoanCreatedForBusiness(serviceSupabase as any, loan.borrower_id, loan.business_lender_id as string, Number(loan.amount))
        .catch(err => log.error('[Accept] borrower trust on loan create error:', err));
    }

    // Increment loans_active on all vouches for this borrower (Bug fix: was never called)
    // This is the increment side that makes onVoucheeLoanCompleted's decrement work correctly.
    try {
      await onVoucheeNewLoan(serviceSupabase as any, loan.borrower_id, loanId);
    } catch (err) {
      log.error('[Accept] onVoucheeNewLoan error (non-fatal):', err);
    }

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
        log.error('[Accept] Error regenerating payment schedule:', scheduleError);
      } else {
        log.info(`[Accept] Regenerated payment schedule for loan ${loanId} with ${schedule.length} installments`);
      }
    } catch (scheduleError) {
      log.error('[Accept] Error in schedule regeneration:', scheduleError);
      // Don't fail the acceptance if schedule regeneration fails
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
      log.error('Error creating notification:', notifError);
    }

    // NOTE: loans_active is already incremented by onVoucheeNewLoan() above (line ~248).
    // The duplicate inline block that was here was double-counting — removed.

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
        log.error('Error sending email:', emailError);
      }
    }

    // Redirect to fund page so lender can sign and send funds
    return NextResponse.json({ 
      success: true, 
      redirectUrl: `/loans/${loanId}/fund`,
      message: 'Loan accepted! Please proceed to fund the loan.',
    });
  } catch (error: unknown) {
    log.error('Error accepting loan:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + ((error as Error).message || 'Unknown error') 
    }, { status: 500 });
  }
}