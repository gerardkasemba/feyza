import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { sendMatchNotifications, buildLenderMatchEmail, buildBorrowerQueuedEmail } from './matching-emails';
import { SupabaseServiceClient } from '@/lib/supabase/server';
import type { Loan } from '@/types';
import { onVoucheeNewLoan } from '@/lib/vouching/accountability';

const log = logger('matching-lib-matching-helpers');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface BusinessProfile {
  id: string;
  business_name: string;
  contact_email: string;
  user_id: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

export interface MatchResult {
  lender_user_id: string | null;
  lender_business_id: string | null;
  match_score: number;
  auto_accept: boolean;
  interest_rate: number;
  lender_name: string;
  lender_email?: string;
  business?: BusinessProfile;
  user?: UserProfile;
}

export async function assignLoanToLender(
  supabase: SupabaseServiceClient,
  loan: Loan,
  match: MatchResult,
  matchId: string | undefined,
  isAutoAccept: boolean
) {
  log.info('Assigning loan to lender:', { loanId: loan.id, match, isAutoAccept });
  
  // Calculate interest based on lender's rate.
  // The DB constraint check_total_interest requires:
  //   total_interest = amount * (interest_rate / 100)   [when uses_apr_calculation = false]
  // This is a FLAT rate (e.g. 20% on $100 = $20 total interest regardless of term).
  const lenderInterestRate = match.interest_rate || 0;
  const loanAmount = loan.amount || 0;
  const totalInstallments = loan.total_installments || 1;

  const totalInterest = Math.round(loanAmount * (lenderInterestRate / 100) * 100) / 100;
  const totalAmount = Math.round((loanAmount + totalInterest) * 100) / 100;
  const repaymentAmount = Math.round((totalAmount / totalInstallments) * 100) / 100;

  log.info('Interest calculation:', {
    lenderInterestRate,
    loanAmount,
    totalInstallments,
    totalInterest,
    totalAmount,
    repaymentAmount,
  });

  // For auto-accept: The loan is matched but lender hasn't explicitly signed yet.
  // They'll sign when they fund the loan.
  // lender_signed should only be true after lender explicitly reviews and funds.
  const updateData: Record<string, unknown> = {
    status: isAutoAccept ? 'pending' : 'active',
    match_status: 'matched',
    matched_at: new Date().toISOString(),
    interest_rate: lenderInterestRate,
    total_interest: totalInterest,
    total_amount: totalAmount,
    repayment_amount: repaymentAmount,
    amount_remaining: totalAmount,
    invite_accepted: true,
    uses_apr_calculation: false, // Required: tells check_total_interest to expect flat-rate formula
    lender_signed: !isAutoAccept,
    lender_signed_at: !isAutoAccept ? new Date().toISOString() : null,
    funds_sent: false,
    auto_matched: isAutoAccept,
  };

  if (match.lender_user_id) {
    updateData.lender_id = match.lender_user_id;
  } else if (match.lender_business_id) {
    updateData.business_lender_id = match.lender_business_id;
  }

  // Set lender name and email for notifications
  if (match.lender_name) {
    updateData.lender_name = match.lender_name;
  }
  if (match.lender_email) {
    updateData.lender_email = match.lender_email;
  }

  const { error: updateError } = await supabase
    .from('loans')
    .update(updateData)
    .eq('id', loan.id);

  if (updateError) {
    log.error('Error updating loan:', updateError);
    throw updateError;
  }

  // Update payment schedule with new amounts
  if (totalInstallments > 0) {
    const principalPerPayment = Math.round((loanAmount / totalInstallments) * 100) / 100;
    const interestPerPayment = Math.round((totalInterest / totalInstallments) * 100) / 100;
    
    // Get existing schedule items
    const { data: scheduleItems } = await supabase
      .from('payment_schedule')
      .select('id')
      .eq('loan_id', loan.id)
      .order('due_date', { ascending: true });
    
    if (scheduleItems && scheduleItems.length > 0) {
      // Update each schedule item with new amounts
      for (const item of scheduleItems) {
        await supabase
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

  // Update the match record
  if (matchId) {
    await supabase
      .from('loan_matches')
      .update({
        status: isAutoAccept ? 'auto_accepted' : 'accepted',
        responded_at: new Date().toISOString(),
        was_auto_accepted: isAutoAccept,
      })
      .eq('id', matchId);
  }

  // Update lender preferences (rotation tracking)
  const prefUpdate: Record<string, unknown> = {
    last_loan_assigned_at: new Date().toISOString(),
  };

  if (match.lender_user_id) {
    await supabase
      .from('lender_preferences')
      .update(prefUpdate)
      .eq('user_id', match.lender_user_id);
  } else if (match.lender_business_id) {
    await supabase
      .from('lender_preferences')
      .update(prefUpdate)
      .eq('business_id', match.lender_business_id);
  }

  // Reserve capital
  await reserveLenderCapital(supabase, match, loan.amount);

  // Send notification emails
  await sendMatchNotifications(supabase, loan, match, isAutoAccept);

  // Track active loan on all vouchers only when loan is actually active (not pending).
  // When isAutoAccept, status is 'pending' until lender funds; setup-loan/dwolla will call onVoucheeNewLoan then.
  if (!isAutoAccept && loan.borrower_id) {
    try {
      await onVoucheeNewLoan(supabase as any, loan.borrower_id, loan.id);
    } catch (err) {
      log.error('[Matching] onVoucheeNewLoan error (non-fatal):', err);
    }
  }

  // Create notification for borrower
  await supabase.from('notifications').insert({
    user_id: loan.borrower_id,
    loan_id: loan.id,
    type: 'loan_matched',
    title: isAutoAccept ? 'Loan Matched & Approved! 🎉' : 'Loan Accepted! 🎉',
    message: `Your loan of ${loan.currency} ${loan.amount} has been matched with ${match.lender_name}.`,
  });

  log.info('Loan successfully assigned to lender');
  return true;
}

// Helper: Reserve capital from lender's pool
export async function reserveLenderCapital(supabase: SupabaseServiceClient, match: MatchResult, amount: number) {
  const field = match.lender_user_id ? 'user_id' : 'business_id';
  const value = match.lender_user_id || match.lender_business_id;

  // Get current preferences
  const { data: prefs } = await supabase
    .from('lender_preferences')
    .select('capital_pool, capital_reserved, total_loans_funded, total_amount_funded')
    .eq(field, value)
    .single();

  if (prefs) {
    await supabase
      .from('lender_preferences')
      .update({
        capital_reserved: (prefs.capital_reserved || 0) + amount,
        total_loans_funded: (prefs.total_loans_funded || 0) + 1,
        total_amount_funded: (prefs.total_amount_funded || 0) + amount,
      })
      .eq(field, value);
  }
}

// Helper: Notify a single lender of a pending match opportunity
// Called in broadcast mode — all matched lenders receive this simultaneously.
export async function notifyLenderOfMatch(supabase: SupabaseServiceClient, loan: Loan, match: MatchResult, matchId: string | undefined) {
  log.info(`[Matching] Notifying lender: ${match.lender_name}, matchId: ${matchId}`);

  // Resolve authoritative email & name
  let lenderEmail: string | null = match.lender_email || null;
  let lenderName = match.lender_name;

  if (match.lender_user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', match.lender_user_id)
      .single();
    if (user) {
      lenderEmail = user.email || lenderEmail;
      lenderName = user.full_name || lenderName;
    }
  } else if (match.lender_business_id) {
    const { data: business } = await supabase
      .from('business_profiles')
      .select('contact_email, business_name')
      .eq('id', match.lender_business_id)
      .single();
    if (business) {
      lenderEmail = business.contact_email || lenderEmail;
      lenderName = business.business_name || lenderName;
    }
  }

  if (lenderEmail && matchId) {
    const reviewUrl = `${APP_URL}/lender/matches/${matchId}`;
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const expiresStr = expires.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });

    await sendEmail({
      to: lenderEmail,
      subject: `🎯 New Loan Opportunity: ${loan.currency} ${loan.amount.toLocaleString()} — Review Now`,
      html: buildLenderMatchEmail({
        lenderName,
        borrowerName: loan.borrower?.full_name || 'A borrower',
        borrowerRating: loan.borrower?.borrower_rating,
        amount: loan.amount,
        currency: loan.currency,
        purpose: loan.purpose,
        reviewUrl,
        expiresStr,
      }),
    }).catch(err => log.error(`[Matching] Email failed for ${lenderEmail}:`, err));
  } else {
    log.warn(`[Matching] No email for lender ${match.lender_name} (matchId: ${matchId})`);
  }

  // In-app notification
  const matchData = { match_id: matchId, amount: loan.amount, currency: loan.currency };
  const notifMsg = `A ${loan.currency} ${loan.amount.toLocaleString()} loan request matches your preferences. Review within 24 hours.`;

  if (match.lender_user_id) {
    void supabase.from('notifications').insert({
      user_id: match.lender_user_id,
      loan_id: loan.id,
      type: 'loan_match_offer',
      title: '🎯 New Loan Match Available',
      message: notifMsg,
      data: matchData,
    // @ts-ignore
    }).catch((e: unknown) => log.error('Notification insert failed', e));
  }
  if (match.lender_business_id) {
    const { data: business } = await supabase
      .from('business_profiles')
      .select('user_id, business_name')
      .eq('id', match.lender_business_id)
      .single();
    if (business?.user_id) {
      await supabase.from('notifications').insert({
        user_id: business.user_id,
        loan_id: loan.id,
        type: 'loan_match_offer',
        title: '🎯 New Loan Match Available',
        message: `A ${loan.currency} ${loan.amount.toLocaleString()} loan matches your ${business.business_name} preferences. Review within 24h.`,
        data: { ...matchData, business_name: business.business_name },
      // @ts-ignore
      }).catch((e: unknown) => log.error('Business notification insert failed', e));
    }
  }
}

// Helper: Notify borrower that their loan is in the review queue
export async function notifyBorrowerLoanQueued(supabase: SupabaseServiceClient, loan: Loan, matchCount: number) {
  if (!loan.borrower?.email) return;

  await sendEmail({
    to: loan.borrower.email,
    subject: `⏳ Your loan request is under review — ${loan.currency} ${loan.amount.toLocaleString()}`,
    html: buildBorrowerQueuedEmail({
      borrowerName: loan.borrower.full_name || 'there',
      amount: loan.amount,
      currency: loan.currency,
      matchCount,
      loanUrl: `${APP_URL}/loans/${loan.id}`,
    }),
  }).catch(err => log.error('[Matching] Borrower queued email failed:', err));

  void supabase.from('notifications').insert({
    user_id: loan.borrower_id,
    loan_id: loan.id,
    type: 'loan_in_review',
    title: '⏳ Loan Under Review',
    message: `Your ${loan.currency} ${loan.amount.toLocaleString()} request has been sent to ${matchCount} lender${matchCount !== 1 ? 's' : ''}. You'll be notified as soon as one accepts.`,
  // @ts-ignore
}).catch((e: unknown) => log.error('Borrower notification insert failed', e));

}
