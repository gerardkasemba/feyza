import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getNoMatchFoundEmail, getNewMatchForLenderEmail, getLoanAcceptedBorrowerEmail, getLoanAcceptedLenderEmail } from '@/lib/email';
import { calculateSimpleTrustTier } from '@/lib/trust/simple-tier';

import {
  MatchResult,
  assignLoanToLender,
  reserveLenderCapital,
  notifyLenderOfMatch,
  notifyBorrowerLoanQueued,
} from './lib/matching-helpers';
import {
  buildLenderMatchEmail,
  buildBorrowerQueuedEmail,
  sendMatchNotifications,
  buildLenderConfirmationEmail,
  buildBorrowerMatchedEmail,
} from './lib/matching-emails';
import { logger } from '@/lib/logger';

const log = logger('matching');
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ─── Internal types for matching logic ────────────────────────────────────────

interface TierPolicy {
  lender_id: string;
  tier_id?: string;
  interest_rate: number;
  max_loan_amount: number;
  is_active?: boolean;
}

interface LenderUser {
  full_name: string;
  email: string;
}

interface LenderBusiness {
  id: string;
  business_name: string;
  contact_email: string;
  user_id: string;
}

interface LenderPref {
  id: string;
  user_id: string;
  business_id: string | null;
  capital_pool: number;
  capital_reserved: number;
  auto_accept: boolean;
  interest_rate: number;
  min_amount: number;
  max_amount: number;
  min_term_weeks?: number;
  max_term_weeks?: number;
  countries?: string[];
  states?: string[];
  allow_first_time_borrowers: boolean;
  first_time_borrower_limit: number;
  user?: LenderUser | null;
  business?: LenderBusiness | null;
  match_score?: number;
}

interface BusinessLoanTypeRow {
  business_id: string;
}

// POST: Find and assign best matching lender for a loan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loan_id } = body;

    log.info('Starting matching for loan:', loan_id);

    if (!loan_id) {
      return NextResponse.json({ error: 'loan_id is required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Get loan details
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        *,
        borrower:users!borrower_id(id, email, full_name, borrower_rating, verification_status)
      `)
      .eq('id', loan_id)
      .single();

    if (loanError || !loan) {
      log.error('Loan not found:', loanError);
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    log.info('Loan details:', { amount: loan.amount, currency: loan.currency, country: loan.country, state: loan.state, borrower: loan.borrower?.full_name, loan_type_id: loan.loan_type_id });

    // Don't match if already has a lender
    if (loan.lender_id || loan.business_lender_id) {
      return NextResponse.json({ 
        error: 'Loan already has a lender assigned',
        status: 'already_matched' 
      }, { status: 400 });
    }

    // ── Ensure borrower trust tier is initialized ──────────────────────────
    // New users default to tier_1 in the DB, but calculateSimpleTrustTier has
    // never been called for them yet. Call it now so the tier is current.
    try {
      await calculateSimpleTrustTier(loan.borrower_id);
    } catch (tierErr) {
      log.warn('[Matching] Could not initialize trust tier (non-fatal):', tierErr);
    }

    // Update loan status to matching
    await supabase
      .from('loans')
      .update({ match_status: 'matching' })
      .eq('id', loan_id);

    // Try the database function first, fall back to direct query
    let matches: MatchResult[] = [];
    log.info('Attempting to find matching lenders for loan', { loan_type_id: loan.loan_type_id, data: loan_id });
    
    // Check if borrower is first-time (no completed loans) - needed for matching and emails
    const { count: completedLoans } = await supabase
      .from('loans')
      .select('*', { count: 'exact', head: true })
      .eq('borrower_id', loan.borrower_id)
      .eq('status', 'completed');
    
    const isFirstTimeBorrower = (completedLoans || 0) === 0;
    log.info('Borrower first-time status:', { borrowerId: loan.borrower_id, completedLoans, isFirstTimeBorrower });
    
    // First try the database function
    const { data: rpcMatches, error: rpcError } = await supabase
      .rpc('find_matching_lenders', { p_loan_id: loan_id, p_limit: 5 });

    if (rpcError) {
      log.info('Database function not available, using fallback query:', rpcError.message);
      
      // INDIVIDUAL lenders: match via lender_tier_policies
      let borrowerTier = 'tier_1';
      const { data: borrowerRow } = await supabase
        .from('users').select('trust_tier').eq('id', loan.borrower_id).single();
      if (borrowerRow?.trust_tier) borrowerTier = borrowerRow.trust_tier;

      const { data: tierPolicies } = await supabase
        .from('lender_tier_policies')
        .select('lender_id, interest_rate, max_loan_amount')
        .eq('tier_id', borrowerTier)
        .eq('is_active', true)
        .gte('max_loan_amount', loan.amount)
        .neq('lender_id', loan.borrower_id);

      const indivLenderIds = (tierPolicies ?? []).map((p: TierPolicy) => p.lender_id);
      let indivPrefs: LenderPref[] = [];
      if (indivLenderIds.length > 0) {
        const { data: ipRows } = await supabase
          .from('lender_preferences')
          .select('id, user_id, capital_pool, capital_reserved, auto_accept, min_amount, min_term_weeks, max_term_weeks, countries, states, user:users!user_id(full_name, email)')
          .eq('is_active', true).is('business_id', null)
          .in('user_id', indivLenderIds).gte('capital_pool', loan.amount);
        indivPrefs = (ipRows ?? []).map((lp: any) => {
          const policy = (tierPolicies ?? []).find((p: TierPolicy) => p.lender_id === lp.user_id);
          return { ...lp, business_id: null,
            interest_rate: policy?.interest_rate ?? 10,
            max_amount: policy?.max_loan_amount ?? 0,
            allow_first_time_borrowers: true,
            first_time_borrower_limit: policy?.max_loan_amount ?? 0 };
        });
      }

      // FALLBACK for new users (tier_1): if no tier-policy lenders found,
      // also query individual lenders who have enough capital and no explicit
      // tier restriction — they accept anyone.
      // IMPORTANT: exclude lenders who have ANY tier policies configured.
      // A tier-policy lender not found in Block 1 was excluded intentionally
      // (loan amount > their tier limit, or capital_pool = 0). Picking them up
      // here at their lender_preferences.interest_rate (default 10%) would
      // apply the wrong rate.
      if (indivPrefs.length === 0) {
        // Fetch all lender IDs who have any tier policy (to exclude from fallback)
        const { data: allTierPolicyRows } = await supabase
          .from('lender_tier_policies')
          .select('lender_id');
        const lendersWithAnyPolicy = new Set(
          (allTierPolicyRows ?? []).map((p: any) => p.lender_id as string)
        );

        const { data: fallbackRows } = await supabase
          .from('lender_preferences')
          .select('id, user_id, capital_pool, capital_reserved, auto_accept, interest_rate, min_amount, max_amount, min_term_weeks, max_term_weeks, countries, states, allow_first_time_borrowers, first_time_borrower_limit, user:users!user_id(full_name, email)')
          .eq('is_active', true)
          .is('business_id', null)
          .gte('capital_pool', loan.amount)
          .lte('min_amount', loan.amount)
          .neq('user_id', loan.borrower_id);

        if (fallbackRows && fallbackRows.length > 0) {
          const filteredFallback = (fallbackRows as any[]).filter(
            (lp: any) => !lendersWithAnyPolicy.has(lp.user_id)
          );
          if (filteredFallback.length > 0) {
            log.info(`[Matching] Tier-policy fallback: found ${filteredFallback.length} individual lender(s) without tier restrictions`);
            indivPrefs = filteredFallback.map((lp: any) => ({
              ...lp,
              allow_first_time_borrowers: lp.allow_first_time_borrowers !== false,
              first_time_borrower_limit: lp.first_time_borrower_limit ?? lp.max_amount ?? 0,
            }));
          }
        }
      }

      // BUSINESS lenders: use tier policies when configured, else fall back to global max_amount
      // Step A: fetch all business lender prefs with enough capital and floor coverage
      const { data: bizPrefsRaw, error: prefsError } = await supabase
        .from('lender_preferences')
        .select(`id, user_id, business_id, capital_pool, capital_reserved,
          auto_accept, interest_rate, min_amount, max_amount,
          countries, states, allow_first_time_borrowers, first_time_borrower_limit,
          business:business_profiles!business_id(id, business_name, contact_email, user_id)`)
        .eq('is_active', true).not('business_id', 'is', null)
        .gte('capital_pool', loan.amount)
        .lte('min_amount', loan.amount)
        .limit(50);

      if (prefsError) {
        log.error('Fallback query error:', prefsError);
        await supabase.from('loans').update({ match_status: 'no_match' }).eq('id', loan_id);
        return NextResponse.json({ error: 'Matching failed: ' + prefsError.message }, { status: 500 });
      }

      // Step B: check which business lenders have tier policies
      const bizUserIds = (bizPrefsRaw ?? []).map((lp: any) => lp.user_id).filter(Boolean);
      let bizTierPolicies: TierPolicy[] = [];
      let bizUsersWithTierPolicies: string[] = [];
      if (bizUserIds.length > 0) {
        const { data: btp } = await supabase
          .from('lender_tier_policies')
          .select('lender_id, tier_id, interest_rate, max_loan_amount, is_active')
          .in('lender_id', bizUserIds);
        bizTierPolicies = btp ?? [];
        bizUsersWithTierPolicies = [...new Set(bizTierPolicies.map((p: TierPolicy) => p.lender_id))];
      }

      // Step C: filter and merge tier data into business prefs
      const bizPrefs = (bizPrefsRaw ?? []).filter((lp: any) => {
        if (!bizUsersWithTierPolicies.includes(lp.user_id)) {
          // No tier policies: match by global max_amount (backward compat)
          return loan.amount <= (lp.max_amount ?? 0);
        }
        // Has tier policies: require active policy for borrower's tier covering the amount
        const pol = bizTierPolicies.find(
          (p: TierPolicy) => p.lender_id === lp.user_id && p.tier_id === borrowerTier && p.is_active
        );
        return pol && loan.amount <= pol.max_loan_amount;
      }).map((lp: any) => {
        const pol = bizTierPolicies.find(
          (p: TierPolicy) => p.lender_id === lp.user_id && p.tier_id === borrowerTier && p.is_active
        );
        return {
          ...lp,
          interest_rate: pol ? pol.interest_rate : lp.interest_rate,
          max_amount: pol ? pol.max_loan_amount : lp.max_amount,
          allow_first_time_borrowers: true,
          first_time_borrower_limit: pol ? pol.max_loan_amount : lp.max_amount,
        };
      });

      const lenderPrefs = [...indivPrefs, ...bizPrefs];


      log.info(`[Matching] Found ${lenderPrefs?.length || 0} potential lenders before filtering`);
      
      // If loan has a loan_type_id, fetch which businesses support that loan type
      let businessesWithLoanType: string[] = [];
      if (loan.loan_type_id) {
        const { data: loanTypeData } = await supabase
          .from('business_loan_types')
          .select('business_id')
          .eq('loan_type_id', loan.loan_type_id)
          .eq('is_active', true);
        
        businessesWithLoanType = loanTypeData?.map((lt: BusinessLoanTypeRow) => lt.business_id) || [];
        log.info(`[Matching] Businesses supporting loan type ${loan.loan_type_id}:`, businessesWithLoanType);
      }
      
      // Also fetch all business_loan_types to check if a business has ANY loan types configured
      const businessIds = lenderPrefs?.filter((lp: any) => lp.business_id).map((lp: any) => lp.business_id) || [];
      let businessesWithAnyLoanTypes: string[] = [];
      if (businessIds.length > 0) {
        const { data: allLoanTypes } = await supabase
          .from('business_loan_types')
          .select('business_id')
          .in('business_id', businessIds)
          .eq('is_active', true);
        
        businessesWithAnyLoanTypes = [...new Set(allLoanTypes?.map((lt: BusinessLoanTypeRow) => lt.business_id) || [])];
        log.info(`[Matching] Businesses with ANY loan types configured:`, businessesWithAnyLoanTypes);
      }
      
      // Log each lender preference found
      lenderPrefs?.forEach((lp: LenderPref, idx: number) => {
        log.info(`[Matching] Lender ${idx + 1}:`, {
          user_id: lp.user_id,
          business_id: lp.business_id,
          business_name: lp.business?.business_name,
          business_email: lp.business?.contact_email,
          user_name: lp.user?.full_name,
          user_email: lp.user?.email,
          is_active: (lp as any).is_active,
          auto_accept: lp.auto_accept,
          capital_pool: lp.capital_pool,
          capital_reserved: lp.capital_reserved,
          available: (lp.capital_pool || 0) - (lp.capital_reserved || 0),
          countries: lp.countries || [],
          states: lp.states || [],
        });
      });

      // Filter and score lenders
      if (lenderPrefs && lenderPrefs.length > 0) {
        matches = lenderPrefs
          .filter((lp: any) => {
            // Check capital available
            const available = (lp.capital_pool || 0) - (lp.capital_reserved || 0);
            if (available < loan.amount) {
              log.info(`[Matching] Skipping lender ${lp.business?.business_name || lp.user_id}: insufficient capital (${available} < ${loan.amount})`);
              return false;
            }
            
            // Check country match
            const lenderCountries = lp.countries || [];
            if (lenderCountries.length > 0 && loan.country) {
              if (!lenderCountries.includes(loan.country)) {
                log.info(`[Matching] Skipping lender ${lp.business?.business_name || lp.user_id}: country mismatch (loan: ${loan.country}, lender accepts: ${lenderCountries.join(', ')})`);
                return false;
              }
            }
            
            // Check state match (only if lender has states configured AND loan has a state)
            const lenderStates = lp.states || [];
            if (lenderStates.length > 0 && loan.state) {
              if (!lenderStates.includes(loan.state)) {
                log.info(`[Matching] Skipping lender ${lp.business?.business_name || lp.user_id}: state mismatch (loan: ${loan.state}, lender accepts: ${lenderStates.join(', ')})`);
                return false;
              }
            }
            
            // Check first-time borrower restrictions
            if (isFirstTimeBorrower) {
              // Skip if lender doesn't allow first-time borrowers
              if (lp.allow_first_time_borrowers === false) {
                log.info(`[Matching] Skipping lender ${lp.business?.business_name || lp.user_id}: doesn't allow first-time borrowers`);
                return false;
              }
              // Check first-time borrower limit
              const firstTimeLimit = lp.first_time_borrower_limit ?? lp.max_amount;
              if (loan.amount > firstTimeLimit) {
                log.info(`[Matching] Skipping lender ${lp.business?.business_name || lp.user_id}: first-time limit ${firstTimeLimit} < requested ${loan.amount}`);
                return false;
              }
            }
            
            // Check loan type match (for business lenders only)
            if (loan.loan_type_id && lp.business_id) {
              // If the business has configured loan types, check if they support this one
              const hasAnyLoanTypes = businessesWithAnyLoanTypes.includes(lp.business_id);
              const supportsThisLoanType = businessesWithLoanType.includes(lp.business_id);
              
              if (hasAnyLoanTypes && !supportsThisLoanType) {
                log.info(`[Matching] Skipping lender ${lp.business?.business_name}: doesn't support loan type ${loan.loan_type_id}`);
                return false;
              }
              // If business has NO loan types configured, they accept all types (backwards compatibility)
            }
            
            return true;
          })
          .map((lp: any) => {
            // Calculate match score - bonus for loan type match and exact location match
            let score = 80; // Default score
            if (lp.auto_accept) score = 100;
            if (loan.loan_type_id && lp.business_id && businessesWithLoanType.includes(lp.business_id)) {
              score += 20; // Bonus for explicit loan type support
            }
            // Bonus for exact country match if lender specified countries
            const lenderCountries = lp.countries || [];
            if (lenderCountries.length > 0 && loan.country && lenderCountries.includes(loan.country)) {
              score += 5;
            }
            // Bonus for exact state match if lender specified states
            const lenderStates = lp.states || [];
            if (lenderStates.length > 0 && loan.state && lenderStates.includes(loan.state)) {
              score += 5;
            }
            
            return {
              lender_user_id: lp.user_id,
              lender_business_id: lp.business_id,
              match_score: score,
              auto_accept: lp.auto_accept || false,
              interest_rate: lp.interest_rate || 10,
              lender_name: lp.business?.business_name || lp.user?.full_name || 'Lender',
              lender_email: lp.business?.contact_email || lp.user?.email,
              first_time_borrower_limit: lp.first_time_borrower_limit,
            };
          })
          // Sort by match score (highest first)
          .sort((a: any, b: any) => (b.match_score ?? 0) - (a.match_score ?? 0))
          .slice(0, 5);
      }
      // After filtering and scoring, fetch business/user details only for top matches
      if (matches && matches.length > 0) {
        const businessIds = matches
          .filter(m => m.lender_business_id)
          .map(m => m.lender_business_id);
        
        const userIds = matches
          .filter(m => m.lender_user_id)
          .map(m => m.lender_user_id);

        // Fetch business details
        if (businessIds.length > 0) {
          const { data: businesses } = await supabase
            .from('business_profiles')
            .select('id, business_name, contact_email, user_id')
            .in('id', businessIds);
          
          // Attach to matches
          matches = matches.map(match => {
            if (match.lender_business_id) {
              const business = businesses?.find(b => b.id === match.lender_business_id);
              return { ...match, business };
            }
            return match;
          });
        }

        // Fetch user details
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, full_name, email')
            .in('id', userIds);
          
          // Attach to matches
          matches = matches.map(match => {
            if (match.lender_user_id) {
              const user = users?.find(u => u.id === match.lender_user_id);
              return { ...match, user };
            }
            return match;
          });
        }
      }
    } else {
      matches = rpcMatches || [];
    }

    log.info('Matching result:', { matchCount: matches.length, matches });

    if (!matches || matches.length === 0) {
      log.info('No matching lenders found');
      await supabase
        .from('loans')
        .update({ match_status: 'no_match' })
        .eq('id', loan_id);
      
      // Send email notification to borrower about no match
      if (loan.borrower?.email) {
        const { subject: noMatchSubject, html: noMatchHtml } = getNoMatchFoundEmail({
          borrowerName: loan.borrower.full_name || 'there',
          amount: loan.amount,
          currency: loan.currency || 'USD',
          requestId: loan.id,
        });
        await sendEmail({ to: loan.borrower.email, subject: noMatchSubject, html: noMatchHtml });
        
        // Create in-app notification
        await supabase.from('notifications').insert({
          user_id: loan.borrower_id,
          loan_id: loan.id,
          type: 'no_match_found',
          title: 'No Lenders Available',
          message: isFirstTimeBorrower
            ? `We couldn’t find a lender for your ${loan.currency} ${loan.amount.toLocaleString()} request yet. 
        As a first-time borrower, consider requesting a smaller amount to build trust and increase your chances of approval.`
            : `There are no lenders available for your ${loan.currency} ${loan.amount.toLocaleString()} request at the moment.
        You may try a smaller amount or invite someone you trust to lend through Feyza.`,
        });
      }
      
      return NextResponse.json({ 
        success: false, 
        message: 'No matching lenders found',
        status: 'no_match',
        isFirstTimeBorrower: isFirstTimeBorrower,
      });
    }

    log.info(`Found ${matches.length} matching lenders`);

    // Create match records for all potential matches
    const matchRecords = matches.map((match: MatchResult, index: number) => ({
      loan_id,
      lender_user_id: match.lender_user_id,
      lender_business_id: match.lender_business_id,
      match_score: match.match_score,
      match_rank: index + 1,
      status: 'pending',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    }));

    const { data: createdMatches, error: insertError } = await supabase
      .from('loan_matches')
      .insert(matchRecords)
      .select();

    if (insertError) {
      log.error('Error creating match records:', insertError);
    }

    // Process the best match
    const bestMatch = matches[0] as MatchResult;
    const bestMatchRecord = createdMatches?.[0];

    log.info('Best match:', { name: bestMatch.lender_name, score: bestMatch.match_score, autoAccept: bestMatch.auto_accept });

    if (bestMatch.auto_accept) {
      // AUTO-ACCEPT: Instantly assign the loan
      log.info('Auto-accepting loan...');
      try {
        await assignLoanToLender(supabase, loan, bestMatch, bestMatchRecord?.id, true);
      } catch (assignErr: unknown) {
        log.error('[Matching] Auto-accept failed:', assignErr);
        // Mark match as failed so lender can still manually accept
        if (bestMatchRecord?.id) {
          await supabase
            .from('loan_matches')
            .update({ status: 'pending' }) // Keep pending so lender can review
            .eq('id', bestMatchRecord.id);
        }
        await supabase
          .from('loans')
          .update({ match_status: 'matching' })
          .eq('id', loan_id);
        return NextResponse.json({
          error: 'Auto-accept failed: ' + ((assignErr as Error).message || 'Unknown error'),
          status: 'auto_accept_failed',
          // Surface the match link so lender can manually review
          manual_review_url: bestMatchRecord?.id
            ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/lender/matches/${bestMatchRecord.id}`
            : null,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        status: 'auto_accepted',
        match: {
          lender_name: bestMatch.lender_name,
          interest_rate: bestMatch.interest_rate,
          match_score: bestMatch.match_score,
        },
        loan_id,
      });
    } else {
      // MANUAL: Broadcast to ALL matched lenders simultaneously.
      // Each gets an email with their own unique match link.
      // The first to accept wins the loan.
      log.info(`[Matching] Broadcasting to ${matches.length} matched lender(s)...`);

      await Promise.allSettled(
        matches.map((match: MatchResult, index: number) => {
          const matchRecord = createdMatches?.[index];
          return notifyLenderOfMatch(supabase, loan, match, matchRecord?.id);
        })
      );

      // Update loan status
      await supabase
        .from('loans')
        .update({ 
          match_status: 'matching',
          current_match_id: bestMatchRecord?.id,
          match_attempts: (loan.match_attempts || 0) + 1,
        })
        .eq('id', loan_id);

      // Notify borrower that their loan is in review
      await notifyBorrowerLoanQueued(supabase, loan, matches.length);

      return NextResponse.json({
        success: true,
        status: 'pending_acceptance',
        message: `Loan sent to ${matches.length} lender(s). Waiting for response (24h timeout).`,
        match: {
          lender_name: bestMatch.lender_name,
          match_score: bestMatch.match_score,
          expires_at: matchRecords[0].expires_at,
        },
        total_matches: matches.length,
      });
    }
  } catch (error) {
    log.error('Error in matching engine:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper: Assign loan to a lender
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const loanId = searchParams.get('loan_id');

  if (!loanId) {
    return NextResponse.json({ error: 'loan_id is required' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  // Get loan with match info
  const { data: loan, error } = await supabase
    .from('loans')
    .select(`
      id,
      status,
      match_status,
      matched_at,
      match_attempts,
      lender_id,
      business_lender_id,
      current_match_id
    `)
    .eq('id', loanId)
    .single();

  if (error || !loan) {
    return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
  }

  // Get match records
  const { data: matches } = await supabase
    .from('loan_matches')
    .select('*')
    .eq('loan_id', loanId)
    .order('match_rank', { ascending: true });

  return NextResponse.json({
    loan_id: loan.id,
    status: loan.status,
    match_status: loan.match_status,
    matched_at: loan.matched_at,
    match_attempts: loan.match_attempts,
    has_lender: !!(loan.lender_id || loan.business_lender_id),
    matches: matches || [],
  });
}
