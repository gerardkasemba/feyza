import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getLoanAcceptedLenderEmail, getLoanAcceptedBorrowerEmail, getNoMatchFoundEmail, getNewMatchForLenderEmail } from '@/lib/email';
import { onVoucheeNewLoan } from '@/lib/vouching/accountability';
import { logger } from '@/lib/logger';
import type { SupabaseServiceClient } from '@/lib/supabase/server';
import type { Loan } from '@/types';

const log = logger('matching-id');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/** Lender preferences row returned from lender_preferences table */
type LenderPrefsRow = Record<string, unknown> & {
  id?: string;
  user_id?: string | null;
  business_id?: string | null;
  interest_rate?: number;
  auto_accept?: boolean;
};

/** Loan match row returned from loan_matches table */
type LoanMatchRow = Record<string, unknown> & {
  id: string;
  loan_id: string;
  status: string;
  lender_user_id?: string | null;
  lender_business_id?: string | null;
};

/** Borrower row for match-related operations */
type BorrowerRow = Record<string, unknown> & {
  id: string;
  email: string;
  full_name: string;
};

// POST: Accept or decline a match
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, decline_reason } = body;

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use "accept" or "decline"' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = await createServiceRoleClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business profile if exists
    const { data: business } = await supabase
      .from('business_profiles')
      .select('id, business_name, contact_email')
      .eq('user_id', user.id)
      .single();

    // Get lender preferences
    let lenderPrefs: LenderPrefsRow | null = null;
    if (business?.id) {
      const { data } = await supabase
        .from('lender_preferences')
        .select('*')
        .eq('business_id', business.id)
        .single();
      lenderPrefs = data;
    } else {
      const { data } = await supabase
        .from('lender_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      lenderPrefs = data;
    }

    // Try to find a match record first
    // eslint-disable-next-line prefer-const
  let match: LoanMatchRow | null = null;
    let loan: Loan | null = null;
    let matchId: string | null = null;

    const { data: existingMatch, error: matchError } = await serviceSupabase
      .from('loan_matches')
      .select('*')
      .eq('id', id)
      .single();

    if (existingMatch && !matchError) {
      match = existingMatch;
      matchId = match!.id;

      // Verify the user is the lender for this match
      let isAuthorized = match!.lender_user_id === user.id;
      if (!isAuthorized && match!.lender_business_id) {
        isAuthorized = business?.id === match!.lender_business_id;
      }

      if (!isAuthorized) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }

      // Check if match is still pending
      if (match!.status !== 'pending') {
        return NextResponse.json({ 
          error: `Match already ${match!.status}`,
          status: match!.status 
        }, { status: 400 });
      }

      // Check if match has expired
      if (new Date(match!.expires_at as string) < new Date()) {
        await serviceSupabase
          .from('loan_matches')
          .update({ status: 'expired' })
          .eq('id', matchId);
        return NextResponse.json({ error: 'Match has expired' }, { status: 400 });
      }

      // Get the loan
      const { data: loanData, error: loanError } = await serviceSupabase
        .from('loans')
        .select('*, borrower:users!borrower_id(id, email, full_name)')
        .eq('id', match!.loan_id)
        .single();

      if (loanError || !loanData) {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      }
      loan = loanData;

    } else {
      // No match record - ID might be a loan ID
      log.info('[Matching POST] No match found, trying as loan ID:', id);

      const { data: loanData, error: loanError } = await serviceSupabase
        .from('loans')
        .select('*, borrower:users!borrower_id(id, email, full_name)')
        .eq('id', id)
        .single();

      if (loanError || !loanData) {
        return NextResponse.json({ error: 'Match or loan not found' }, { status: 404 });
      }
      loan = loanData;

      // Verify lender can accept this loan
      if (!lenderPrefs || !lenderPrefs.is_active) {
        return NextResponse.json({ error: 'Lender preferences not active' }, { status: 403 });
      }

      const availableCapital = ((lenderPrefs.capital_pool as number) || 0) - ((lenderPrefs.capital_reserved as number) || 0);
      
      if (loan!.amount < (lenderPrefs.min_amount as number) || loan!.amount > (lenderPrefs.max_amount as number)) {
        return NextResponse.json({ error: 'Loan amount outside your preferences' }, { status: 403 });
      }

      if (loan!.amount > availableCapital) {
        return NextResponse.json({ error: 'Insufficient capital' }, { status: 403 });
      }

      // Check if loan already has a lender
      if (loan!.lender_id || loan!.business_lender_id) {
        return NextResponse.json({ error: 'Loan already has a lender' }, { status: 400 });
      }

      // Check if lender already declined this loan
      const lenderId = business?.id || user.id;
      const lenderField = business?.id ? 'lender_business_id' : 'lender_user_id';
      
      const { data: existingDecline } = await serviceSupabase
        .from('loan_matches')
        .select('id')
        .eq('loan_id', loan!.id)
        .eq(lenderField, lenderId)
        .eq('status', 'declined')
        .single();

      if (existingDecline) {
        return NextResponse.json({ error: 'You already declined this loan' }, { status: 400 });
      }

      // Create a match record for this action
      const { data: newMatch, error: insertError } = await serviceSupabase
        .from('loan_matches')
        .insert({
          loan_id: loan!.id,
          lender_user_id: business?.id ? null : user.id,
          lender_business_id: business?.id || null,
          match_score: 80,
          match_rank: 1,
          status: 'pending',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        log.error('[Matching POST] Error creating match:', insertError);
        return NextResponse.json({ error: 'Failed to create match record' }, { status: 500 });
      }

      match = newMatch;
      matchId = newMatch.id;
      log.info('[Matching POST] Created new match record:', matchId);
    }

    // Add loan to match object for further processing
    match!.loan = loan;

    if (action === 'accept') {
      // ACCEPT: Assign the loan to this lender
      
      // Get lender info and the tier-specific interest rate.
      // IMPORTANT: must read from lender_tier_policies (borrower-tier-specific rate),
      // NOT from lender_preferences.interest_rate which is just a global fallback default.
      // Using the wrong table caused all manually-accepted loans to get 10% regardless of policy.
      let lenderName = 'Lender';
      let lenderEmail: string | null = null;
      let interestRate = 10;

      // 1. Look up borrower's trust tier so we can find the right policy row
      const { data: borrowerRow } = await serviceSupabase
        .from('users')
        .select('trust_tier')
        .eq('id', loan!.borrower_id)
        .single();
      const borrowerTier = borrowerRow?.trust_tier || 'tier_1';

      if (match!.lender_user_id) {
        // Try to get tier-specific rate from lender_tier_policies first
        const { data: tierPolicy } = await serviceSupabase
          .from('lender_tier_policies')
          .select('interest_rate')
          .eq('lender_id', match!.lender_user_id)
          .eq('tier_id', borrowerTier)
          .eq('is_active', true)
          .single();

        if (tierPolicy?.interest_rate != null) {
          interestRate = Number(tierPolicy.interest_rate);
        } else {
          // No tier policy for this borrower's tier — fall back to global lender pref
          const { data: prefs } = await serviceSupabase
            .from('lender_preferences')
            .select('interest_rate')
            .eq('user_id', match!.lender_user_id)
            .single();
          interestRate = prefs?.interest_rate || 10;
        }

        const { data: lenderUser } = await serviceSupabase
          .from('users')
          .select('full_name, email')
          .eq('id', match!.lender_user_id)
          .single();
        lenderName = lenderUser?.full_name || 'Lender';
        lenderEmail = lenderUser?.email || null;

      } else if (match!.lender_business_id) {
        // Business lenders also use tier policies when configured
        const { data: bizUser } = await serviceSupabase
          .from('business_profiles')
          .select('user_id')
          .eq('id', match!.lender_business_id)
          .single();

        if (bizUser?.user_id) {
          const { data: tierPolicy } = await serviceSupabase
            .from('lender_tier_policies')
            .select('interest_rate')
            .eq('lender_id', bizUser.user_id)
            .eq('tier_id', borrowerTier)
            .eq('is_active', true)
            .single();

          if (tierPolicy?.interest_rate != null) {
            interestRate = Number(tierPolicy.interest_rate);
          } else {
            const { data: prefs } = await serviceSupabase
              .from('lender_preferences')
              .select('interest_rate')
              .eq('business_id', match!.lender_business_id)
              .single();
            interestRate = prefs?.interest_rate || 10;
          }
        } else {
          const { data: prefs } = await serviceSupabase
            .from('lender_preferences')
            .select('interest_rate')
            .eq('business_id', match!.lender_business_id)
            .single();
          interestRate = prefs?.interest_rate || 10;
        }

        const { data: business } = await serviceSupabase
          .from('business_profiles')
          .select('business_name, contact_email')
          .eq('id', match!.lender_business_id)
          .single();
        lenderName = business?.business_name || 'Lender';
        lenderEmail = business?.contact_email || null;
      }

      // Calculate interest.
      // DB constraint check_total_interest requires: total_interest = amount * (rate / 100)
      // when uses_apr_calculation = false (flat rate, not annualized APR).
      const loanAmount = loan!.amount || 0;
      const totalInstallments = loan!.total_installments || 1;
      
      const totalInterest = Math.round(loanAmount * (interestRate / 100) * 100) / 100;
      const totalAmount = Math.round((loanAmount + totalInterest) * 100) / 100;
      const repaymentAmount = Math.round((totalAmount / totalInstallments) * 100) / 100;

      // Simple flow: Loan is active, lender will send PayPal payment to borrower
      const loanUpdate: Record<string, unknown> = {
        status: 'active',
        match_status: 'matched',
        matched_at: new Date().toISOString(),
        interest_rate: interestRate,
        total_interest: totalInterest,
        total_amount: totalAmount,
        repayment_amount: repaymentAmount,
        amount_remaining: totalAmount,
        invite_accepted: true,
        uses_apr_calculation: false, // Satisfies check_total_interest constraint (flat rate)
        lender_signed: true,
        lender_signed_at: new Date().toISOString(),
        funds_sent: false,
      };

      if (match!.lender_user_id) {
        loanUpdate.lender_id = match!.lender_user_id;
      } else if (match!.lender_business_id) {
        loanUpdate.business_lender_id = match!.lender_business_id;
      }

      // Set lender name and email for notifications
      if (lenderName) {
        loanUpdate.lender_name = lenderName;
      }
      if (lenderEmail) {
        loanUpdate.lender_email = lenderEmail;
      }

      await serviceSupabase
        .from('loans')
        .update(loanUpdate)
        .eq('id', loan!.id);

      if (loan!.borrower_id) {
        try {
          await onVoucheeNewLoan(serviceSupabase as any, loan!.borrower_id, loan!.id);
        } catch (err) {
          log.error('[MatchingId] onVoucheeNewLoan error (non-fatal):', err);
        }
      }

      // Update payment schedule with new amounts
      if (totalInstallments > 0) {
        const principalPerPayment = Math.round((loanAmount / totalInstallments) * 100) / 100;
        const interestPerPayment = Math.round((totalInterest / totalInstallments) * 100) / 100;
        
        const { data: scheduleItems } = await serviceSupabase
          .from('payment_schedule')
          .select('id')
          .eq('loan_id', loan!.id)
          .order('due_date', { ascending: true });
        
        if (scheduleItems && scheduleItems.length > 0) {
          for (const item of scheduleItems) {
            await serviceSupabase
              .from('payment_schedule')
              .update({
                amount: repaymentAmount,
                principal_amount: principalPerPayment,
                interest_amount: interestPerPayment,
              })
              .eq('id', item.id);
          }
        }
      }

      // Update match
      await serviceSupabase
        .from('loan_matches')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      // Decline other pending matches for this loan
      await serviceSupabase
        .from('loan_matches')
        .update({ status: 'skipped' })
        .eq('loan_id', loan!.id)
        .neq('id', matchId)
        .eq('status', 'pending');

      // Update lender preferences
      const prefField = match!.lender_user_id ? 'user_id' : 'business_id';
      const prefValue = match!.lender_user_id || match!.lender_business_id;

      const { data: prefs } = await serviceSupabase
        .from('lender_preferences')
        .select('capital_reserved, total_loans_funded, total_amount_funded')
        .eq(prefField, prefValue)
        .single();

      if (prefs) {
        await serviceSupabase
          .from('lender_preferences')
          .update({
            capital_reserved: (prefs.capital_reserved || 0) + loan!.amount,
            total_loans_funded: (prefs.total_loans_funded || 0) + 1,
            total_amount_funded: (prefs.total_amount_funded || 0) + loan!.amount,
            last_loan_assigned_at: new Date().toISOString(),
          })
          .eq(prefField, prefValue);
      }

            // Email to LENDER (confirmation)
      if (lenderEmail) {
        const { subject: lenderSubj, html: lenderHtml } = getLoanAcceptedLenderEmail({
          lenderName,
          borrowerName: (loan!.borrower as { full_name?: string })?.full_name || 'Borrower',
          amount: loan!.amount,
          currency: loan!.currency || 'USD',
          loanId: loan!.id,
        });
        await sendEmail({ to: lenderEmail, subject: lenderSubj, html: lenderHtml });
      }

      // Email to BORROWER
      if (loan!.borrower?.email) {
        const { subject: borrowerSubj, html: borrowerHtml } = getLoanAcceptedBorrowerEmail({
          borrowerName: (loan!.borrower as { full_name?: string })?.full_name || 'Borrower',
          lenderName,
          amount: loan!.amount,
          currency: loan!.currency || 'USD',
          interestRate,
          loanId: loan!.id,
          isAutoAccept: false,
        });
        await sendEmail({ to: loan!.borrower.email, subject: borrowerSubj, html: borrowerHtml });
      }

      // Create notification
      await serviceSupabase.from('notifications').insert({
        user_id: loan!.borrower_id,
        loan_id: loan!.id,
        type: 'loan_accepted',
        title: 'Loan Accepted! 🎉',
        message: `${lenderName} has accepted your loan request for ${loan!.currency} ${loan!.amount}.`,
      });

      return NextResponse.json({
        success: true,
        action: 'accepted',
        loan_id: loan!.id,
        message: 'Loan accepted successfully',
      });

    } else {
      // DECLINE: Move to next lender
      
      // Update this match as declined
      await serviceSupabase
        .from('loan_matches')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString(),
          decline_reason,
        })
        .eq('id', matchId);

      // Update lender acceptance rate
      const prefField = match!.lender_user_id ? 'user_id' : 'business_id';
      const prefValue = match!.lender_user_id || match!.lender_business_id;

      // Find next pending match
      const { data: nextMatch } = await serviceSupabase
        .from('loan_matches')
        .select('*')
        .eq('loan_id', loan!.id)
        .eq('status', 'pending')
        .order('match_rank', { ascending: true })
        .limit(1)
        .single();

      if (nextMatch) {
        // Notify next lender
        await notifyNextLender(serviceSupabase, loan!, nextMatch);

        // Update loan with new current match
        await serviceSupabase
          .from('loans')
          .update({ current_match_id: nextMatch.id })
          .eq('id', loan!.id);

        return NextResponse.json({
          success: true,
          action: 'declined',
          message: 'Loan declined. Offering to next matching lender.',
          next_lender_notified: true,
        });
      } else {
        // No more lenders
        await serviceSupabase
          .from('loans')
          .update({ 
            match_status: 'no_match',
            current_match_id: null,
          })
          .eq('id', loan!.id);

        // Notify borrower
        if (loan!.borrower?.email) {
          const { subject: noMatchSubj, html: noMatchHtml } = getNoMatchFoundEmail({
            borrowerName: (loan!.borrower as { full_name?: string })?.full_name || 'Borrower',
            amount: loan!.amount,
            currency: loan!.currency || 'USD',
            requestId: loan!.id,
          });
          await sendEmail({ to: loan!.borrower.email, subject: noMatchSubj, html: noMatchHtml });
        }

        return NextResponse.json({
          success: true,
          action: 'declined',
          message: 'Loan declined. No more matching lenders available.',
          next_lender_notified: false,
        });
      }
    }
  } catch (error) {
    log.error('Error processing match response:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper: Notify next lender in queue
async function notifyNextLender(supabase: SupabaseServiceClient, loan: Loan, match: Record<string, unknown>) {
  let lenderEmail: string | null = null;
  let lenderName = 'Lender';

  if (match!.lender_user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', match!.lender_user_id)
      .single();
    lenderEmail = user?.email;
    lenderName = user?.full_name || 'Lender';
  } else if (match!.lender_business_id) {
    const { data: business } = await supabase
      .from('business_profiles')
      .select('contact_email, business_name')
      .eq('id', match!.lender_business_id)
      .single();
    lenderEmail = business?.contact_email;
    lenderName = business?.business_name || 'Lender';
  }

  if (lenderEmail) {
        const borrowerForEmail = (loan as unknown as { borrower?: { full_name?: string } }).borrower;
        const { subject: matchSubj, html: matchHtml } = getNewMatchForLenderEmail({
          lenderName,
          borrowerName: borrowerForEmail?.full_name || 'Borrower',
          amount: loan!.amount,
          currency: loan!.currency || 'USD',
          purpose: (loan as unknown as { purpose?: string }).purpose,
          matchId: (match!.id as string) || '',
          autoAccept: false,
        });
        await sendEmail({ to: lenderEmail, subject: matchSubj, html: matchHtml });
  }

  // In-app notification
  if (match!.lender_user_id) {
    await supabase.from('notifications').insert({
      user_id: match!.lender_user_id,
      loan_id: loan!.id,
      type: 'loan_match_offer',
      title: 'New Loan Opportunity',
      message: `A ${loan!.currency} ${loan!.amount.toLocaleString()} loan request matches your criteria. Review and respond within 24 hours.`,
    });

  }
}

// GET: Get match details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = await createServiceRoleClient();

    // Get user's business profile if exists
    const { data: business } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Get lender preferences
    let lenderPrefs: LenderPrefsRow | null = null;
    if (business?.id) {
      const { data } = await supabase
        .from('lender_preferences')
        .select('*')
        .eq('business_id', business.id)
        .single();
      lenderPrefs = data;
    } else {
      const { data } = await supabase
        .from('lender_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      lenderPrefs = data;
    }

    // First, try to find a match by ID in loan_matches
    const { data: match, error: matchError } = await serviceSupabase
      .from('loan_matches')
      .select('*')
      .eq('id', id)
      .single();

    let loan: Loan | null = null;
    let borrower: any | null = null;
    let isFromMatch = false;

    if (match && !matchError) {
      // Found a match record
      isFromMatch = true;
      
      // Verify user is the lender for this match
      let isAuthorized = match!.lender_user_id === user.id;
      if (!isAuthorized && match!.lender_business_id) {
        isAuthorized = business?.id === match!.lender_business_id;
      }

      if (!isAuthorized) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }

      // Fetch the loan
      const { data: loanData, error: loanError } = await serviceSupabase
        .from('loans')
        .select('*')
        .eq('id', match!.loan_id)
        .single();

      if (loanError || !loanData) {
        log.error('[Matching GET] Loan not found:', loanError);
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      }
      loan = loanData;

    } else {
      // No match record found - try to find a loan by ID
      log.info('[Matching GET] No match found, trying as loan ID:', id);
      
      const { data: loanData, error: loanError } = await serviceSupabase
        .from('loans')
        .select('*')
        .eq('id', id)
        .single();

      if (loanError || !loanData) {
        log.error('[Matching GET] Loan not found:', loanError);
        return NextResponse.json({ error: 'Match or loan not found' }, { status: 404 });
      }
      loan = loanData;

      // Verify this loan matches lender's preferences
      if (!lenderPrefs || !lenderPrefs.is_active) {
        return NextResponse.json({ error: 'Lender preferences not active' }, { status: 403 });
      }

      const availableCapital = ((lenderPrefs.capital_pool as number) || 0) - ((lenderPrefs.capital_reserved as number) || 0);
      
      if (loan!.amount < (lenderPrefs.min_amount as number) || loan!.amount > (lenderPrefs.max_amount as number)) {
        return NextResponse.json({ error: 'Loan amount outside your preferences' }, { status: 403 });
      }

      if (loan!.amount > availableCapital) {
        return NextResponse.json({ error: 'Insufficient capital' }, { status: 403 });
      }

      // Check if loan already has a lender
      if (loan!.lender_id || loan!.business_lender_id) {
        return NextResponse.json({ error: 'Loan already has a lender' }, { status: 400 });
      }

      // Check if lender already declined this loan
      const lenderId = business?.id || user.id;
      const lenderField = business?.id ? 'lender_business_id' : 'lender_user_id';
      
      const { data: existingDecline } = await serviceSupabase
        .from('loan_matches')
        .select('id')
        .eq('loan_id', loan!.id)
        .eq(lenderField, lenderId)
        .eq('status', 'declined')
        .single();

      if (existingDecline) {
        return NextResponse.json({ error: 'You already declined this loan' }, { status: 400 });
      }
    }

    // Fetch the borrower
    const { data: borrowerData, error: borrowerError } = await serviceSupabase
      .from('users')
      .select('id, full_name, borrower_rating, verification_status, total_payments_made, payments_on_time, payments_early')
      .eq('id', loan!.borrower_id)
      .single();

    if (borrowerError) {
      log.error('[Matching GET] Borrower fetch error:', borrowerError);
    }

    const loanBorrowerName = (loan as any)?.borrower_name;
    borrower = (borrowerData as any) || {
      id: loan!.borrower_id,
      full_name: loanBorrowerName || 'Borrower',
      borrower_rating: 'neutral',
      verification_status: 'unverified',
      total_payments_made: 0,
      payments_on_time: 0,
      payments_early: 0,
    };

    // Combine the data
    const fullMatch = {
      id: match?.id || loan!.id,
      loan_id: loan!.id,
      match_score: match?.match_score || 80,
      match_rank: match?.match_rank || 1,
      status: match?.status || 'pending',
      expires_at: match?.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      lender_user_id: match?.lender_user_id || (business?.id ? null : user.id),
      lender_business_id: match?.lender_business_id || business?.id,
      is_from_match: isFromMatch,
      loan: {
        ...loan,
        borrower
      }
    };

    return NextResponse.json({ match: fullMatch });
  } catch (error) {
    log.error('Error fetching match:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
