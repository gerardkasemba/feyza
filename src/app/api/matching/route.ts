import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getNoMatchFoundEmail, getNewMatchForLenderEmail, getLoanAcceptedBorrowerEmail, getLoanAcceptedLenderEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface BusinessProfile {
  id: string;
  business_name: string;
  contact_email: string;
  user_id: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

interface MatchResult {
  lender_user_id: string | null;
  lender_business_id: string | null;
  match_score: number;
  auto_accept: boolean;
  interest_rate: number;
  lender_name: string;
  lender_email?: string;
  business?: BusinessProfile; // Add this
  user?: UserProfile; // Add this
}

// POST: Find and assign best matching lender for a loan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loan_id } = body;

    console.log('Starting matching for loan:', loan_id);

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
      console.error('Loan not found:', loanError);
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    console.log('Loan details:', { amount: loan.amount, currency: loan.currency, country: loan.country, state: loan.state, borrower: loan.borrower?.full_name, loan_type_id: loan.loan_type_id });

    // Don't match if already has a lender
    if (loan.lender_id || loan.business_lender_id) {
      return NextResponse.json({ 
        error: 'Loan already has a lender assigned',
        status: 'already_matched' 
      }, { status: 400 });
    }

    // Update loan status to matching
    await supabase
      .from('loans')
      .update({ match_status: 'matching' })
      .eq('id', loan_id);

    // Try the database function first, fall back to direct query
    let matches: any[] = [];
    console.log('Attempting to find matching lenders for loan:', loan_id, 'loan_type_id:', loan.loan_type_id);
    
    // Check if borrower is first-time (no completed loans) - needed for matching and emails
    const { count: completedLoans } = await supabase
      .from('loans')
      .select('*', { count: 'exact', head: true })
      .eq('borrower_id', loan.borrower_id)
      .eq('status', 'completed');
    
    const isFirstTimeBorrower = (completedLoans || 0) === 0;
    console.log('Borrower first-time status:', { borrowerId: loan.borrower_id, completedLoans, isFirstTimeBorrower });
    
    // First try the database function
    const { data: rpcMatches, error: rpcError } = await supabase
      .rpc('find_matching_lenders', { p_loan_id: loan_id, p_limit: 5 });

    if (rpcError) {
      console.log('Database function not available, using fallback query:', rpcError.message);
      
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

      const indivLenderIds = (tierPolicies ?? []).map((p: any) => p.lender_id);
      let indivPrefs: any[] = [];
      if (indivLenderIds.length > 0) {
        const { data: ipRows } = await supabase
          .from('lender_preferences')
          .select('id, user_id, capital_pool, capital_reserved, auto_accept, min_amount, min_term_weeks, max_term_weeks, countries, states, user:users!user_id(full_name, email)')
          .eq('is_active', true).is('business_id', null)
          .in('user_id', indivLenderIds).gte('capital_pool', loan.amount);
        indivPrefs = (ipRows ?? []).map((lp: any) => {
          const policy = (tierPolicies ?? []).find((p: any) => p.lender_id === lp.user_id);
          return { ...lp, business_id: null,
            interest_rate: policy?.interest_rate ?? 10,
            max_amount: policy?.max_loan_amount ?? 0,
            allow_first_time_borrowers: true,
            first_time_borrower_limit: policy?.max_loan_amount ?? 0 };
        });
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
        console.error('Fallback query error:', prefsError);
        await supabase.from('loans').update({ match_status: 'no_match' }).eq('id', loan_id);
        return NextResponse.json({ error: 'Matching failed: ' + prefsError.message }, { status: 500 });
      }

      // Step B: check which business lenders have tier policies
      const bizUserIds = (bizPrefsRaw ?? []).map((lp: any) => lp.user_id).filter(Boolean);
      let bizTierPolicies: any[] = [];
      let bizUsersWithTierPolicies: string[] = [];
      if (bizUserIds.length > 0) {
        const { data: btp } = await supabase
          .from('lender_tier_policies')
          .select('lender_id, tier_id, interest_rate, max_loan_amount, is_active')
          .in('lender_id', bizUserIds);
        bizTierPolicies = btp ?? [];
        bizUsersWithTierPolicies = [...new Set(bizTierPolicies.map((p: any) => p.lender_id))];
      }

      // Step C: filter and merge tier data into business prefs
      const bizPrefs = (bizPrefsRaw ?? []).filter((lp: any) => {
        if (!bizUsersWithTierPolicies.includes(lp.user_id)) {
          // No tier policies: match by global max_amount (backward compat)
          return loan.amount <= (lp.max_amount ?? 0);
        }
        // Has tier policies: require active policy for borrower's tier covering the amount
        const pol = bizTierPolicies.find(
          (p: any) => p.lender_id === lp.user_id && p.tier_id === borrowerTier && p.is_active
        );
        return pol && loan.amount <= pol.max_loan_amount;
      }).map((lp: any) => {
        const pol = bizTierPolicies.find(
          (p: any) => p.lender_id === lp.user_id && p.tier_id === borrowerTier && p.is_active
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


      console.log(`[Matching] Found ${lenderPrefs?.length || 0} potential lenders before filtering`);
      
      // If loan has a loan_type_id, fetch which businesses support that loan type
      let businessesWithLoanType: string[] = [];
      if (loan.loan_type_id) {
        const { data: loanTypeData } = await supabase
          .from('business_loan_types')
          .select('business_id')
          .eq('loan_type_id', loan.loan_type_id)
          .eq('is_active', true);
        
        businessesWithLoanType = loanTypeData?.map((lt: any) => lt.business_id) || [];
        console.log(`[Matching] Businesses supporting loan type ${loan.loan_type_id}:`, businessesWithLoanType);
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
        
        businessesWithAnyLoanTypes = [...new Set(allLoanTypes?.map((lt: any) => lt.business_id) || [])];
        console.log(`[Matching] Businesses with ANY loan types configured:`, businessesWithAnyLoanTypes);
      }
      
      // Log each lender preference found
      lenderPrefs?.forEach((lp: any, idx: number) => {
        console.log(`[Matching] Lender ${idx + 1}:`, {
          user_id: lp.user_id,
          business_id: lp.business_id,
          business_name: lp.business?.business_name,
          business_email: lp.business?.contact_email,
          user_name: lp.user?.full_name,
          user_email: lp.user?.email,
          is_active: lp.is_active,
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
              console.log(`[Matching] Skipping lender ${lp.business?.business_name || lp.user_id}: insufficient capital (${available} < ${loan.amount})`);
              return false;
            }
            
            // Check country match
            const lenderCountries = lp.countries || [];
            if (lenderCountries.length > 0 && loan.country) {
              if (!lenderCountries.includes(loan.country)) {
                console.log(`[Matching] Skipping lender ${lp.business?.business_name || lp.user_id}: country mismatch (loan: ${loan.country}, lender accepts: ${lenderCountries.join(', ')})`);
                return false;
              }
            }
            
            // Check state match (only if lender has states configured AND loan has a state)
            const lenderStates = lp.states || [];
            if (lenderStates.length > 0 && loan.state) {
              if (!lenderStates.includes(loan.state)) {
                console.log(`[Matching] Skipping lender ${lp.business?.business_name || lp.user_id}: state mismatch (loan: ${loan.state}, lender accepts: ${lenderStates.join(', ')})`);
                return false;
              }
            }
            
            // Check first-time borrower restrictions
            if (isFirstTimeBorrower) {
              // Skip if lender doesn't allow first-time borrowers
              if (lp.allow_first_time_borrowers === false) {
                console.log(`[Matching] Skipping lender ${lp.business?.business_name || lp.user_id}: doesn't allow first-time borrowers`);
                return false;
              }
              // Check first-time borrower limit
              const firstTimeLimit = lp.first_time_borrower_limit ?? lp.max_amount;
              if (loan.amount > firstTimeLimit) {
                console.log(`[Matching] Skipping lender ${lp.business?.business_name || lp.user_id}: first-time limit ${firstTimeLimit} < requested ${loan.amount}`);
                return false;
              }
            }
            
            // Check loan type match (for business lenders only)
            if (loan.loan_type_id && lp.business_id) {
              // If the business has configured loan types, check if they support this one
              const hasAnyLoanTypes = businessesWithAnyLoanTypes.includes(lp.business_id);
              const supportsThisLoanType = businessesWithLoanType.includes(lp.business_id);
              
              if (hasAnyLoanTypes && !supportsThisLoanType) {
                console.log(`[Matching] Skipping lender ${lp.business?.business_name}: doesn't support loan type ${loan.loan_type_id}`);
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
          .sort((a: any, b: any) => b.match_score - a.match_score)
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

    console.log('Matching result:', { matchCount: matches.length, matches });

    if (!matches || matches.length === 0) {
      console.log('No matching lenders found');
      await supabase
        .from('loans')
        .update({ match_status: 'no_match' })
        .eq('id', loan_id);
      
      // Send email notification to borrower about no match
      if (loan.borrower?.email) {
                const isFirstTime = isFirstTimeBorrower;
        
        await sendEmail({
          to: loan.borrower.email,
          subject: 'Loan Request Update - No Matching Lenders Found',
          html: `
          <!DOCTYPE html>
          <html>
            <body style="
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9fafb;
            ">

              <!-- CARD -->
              <div style="
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 10px 25px rgba(0,0,0,0.05);
              ">

                <!-- HEADER -->
                <div style="
                  background: linear-gradient(135deg, #059669 0%, #047857 100%);
                  padding: 30px;
                  text-align: center;
                ">
                  <!-- LOGO (email-safe centered) -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding-bottom: 15px;">
                        <img
                          src="https://feyza.app/feyza.png"
                          alt="Feyza Logo"
                          height="40"
                          style="display:block; height:40px; width:auto; border:0; outline:none; text-decoration:none;"
                        />
                      </td>
                    </tr>
                  </table>

                  <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">
                    Loan Request Update
                  </h1>
                </div>

                <!-- CONTENT -->
                <div style="
                  background: #f0fdf4;
                  padding: 30px;
                  border: 1px solid #bbf7d0;
                  border-top: none;
                ">
                  <p style="font-size: 16px; margin-top: 0;">
                    Hi ${loan.borrower.full_name || 'there'},
                  </p>

                  <p style="color:#374151;">
                    We couldn’t find a matching business lender for your loan request at this time.
                  </p>

                  <!-- LOAN DETAILS -->
                  <div style="
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    margin: 20px 0;
                    border: 1px solid #bbf7d0;
                  ">
                    <p style="margin: 0;">
                      <strong>Requested Amount:</strong>
                      ${loan.currency} ${loan.amount.toLocaleString()}
                    </p>
                    ${loan.purpose ? `
                      <p style="margin: 10px 0 0 0;">
                        <strong>Purpose:</strong> ${loan.purpose}
                      </p>
                    ` : ''}
                  </div>

                  <!-- FIRST TIME TIP -->
                  ${isFirstTime ? `
                  <div style="
                    background: #ecfeff;
                    border: 1px solid #67e8f9;
                    border-radius: 8px;
                    padding: 16px;
                    margin: 20px 0;
                  ">
                    <p style="margin: 0; color: #155e75; font-size: 14px;">
                      <strong>First-time borrower tip:</strong>
                      Some lenders limit how much they lend to new users.
                      Consider requesting a smaller amount (e.g. $100–$300) to build your borrowing history.
                    </p>
                  </div>
                  ` : ''}

                  <!-- WHAT YOU CAN DO -->
                  <div style="
                    background: #ecfdf5;
                    border: 1px solid #bbf7d0;
                    border-radius: 8px;
                    padding: 16px;
                    margin: 20px 0;
                  ">
                    <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 600;">
                      What you can do next:
                    </p>
                    <ul style="
                      margin: 10px 0 0 0;
                      padding-left: 20px;
                      color: #065f46;
                      font-size: 14px;
                    ">
                      <li>Try a smaller loan amount</li>
                      <li>Request from a friend or family member</li>
                      <li>Check back later as new lenders join</li>
                    </ul>
                  </div>

                  <!-- CTA -->
                  <a
                    href="${APP_URL}/loans/new"
                    style="
                      display: block;
                      background: linear-gradient(to right, #059669, #047857);
                      color: white;
                      text-decoration: none;
                      padding: 16px 32px;
                      border-radius: 8px;
                      font-weight: 600;
                      text-align: center;
                      margin: 24px 0;
                    "
                  >
                    Try a Different Amount →
                  </a>

                  <a
                    href="${APP_URL}/loans/${loan.id}"
                    style="
                      display: block;
                      color: #6b7280;
                      text-decoration: none;
                      text-align: center;
                      font-size: 14px;
                    "
                  >
                    View your loan request
                  </a>
                </div>
              </div>

              <!-- FOOTER -->
              <p style="
                color: #9ca3af;
                font-size: 12px;
                text-align: center;
                margin-top: 20px;
              ">
                Sent via Feyza • Simple loan tracking for everyone
              </p>

            </body>
          </html>
          `,
        });
        
        // Create in-app notification
        await supabase.from('notifications').insert({
          user_id: loan.borrower_id,
          loan_id: loan.id,
          type: 'no_match_found',
          title: 'No Lenders Available',
          message: isFirstTime
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

    console.log('Found', matches.length, 'matching lenders');

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
      console.error('Error creating match records:', insertError);
    }

    // Process the best match
    const bestMatch = matches[0] as MatchResult;
    const bestMatchRecord = createdMatches?.[0];

    console.log('Best match:', { name: bestMatch.lender_name, score: bestMatch.match_score, autoAccept: bestMatch.auto_accept });

    if (bestMatch.auto_accept) {
      // AUTO-ACCEPT: Instantly assign the loan
      console.log('Auto-accepting loan...');
      try {
        await assignLoanToLender(supabase, loan, bestMatch, bestMatchRecord?.id, true);
      } catch (assignErr: any) {
        console.error('[Matching] Auto-accept failed:', assignErr);
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
          error: 'Auto-accept failed: ' + (assignErr.message || 'Unknown error'),
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
      console.log(`[Matching] Broadcasting to ${matches.length} matched lender(s)...`);

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
    console.error('Error in matching engine:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper: Assign loan to a lender
async function assignLoanToLender(
  supabase: any,
  loan: any,
  match: MatchResult,
  matchId: string | undefined,
  isAutoAccept: boolean
) {
  console.log('Assigning loan to lender:', { loanId: loan.id, match, isAutoAccept });
  
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

  console.log('Interest calculation:', {
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
  const updateData: any = {
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
    console.error('Error updating loan:', updateError);
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
  const prefUpdate: any = {
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

  // Create notification for borrower
  await supabase.from('notifications').insert({
    user_id: loan.borrower_id,
    loan_id: loan.id,
    type: 'loan_matched',
    title: isAutoAccept ? 'Loan Matched & Approved! 🎉' : 'Loan Accepted! 🎉',
    message: `Your loan of ${loan.currency} ${loan.amount} has been matched with ${match.lender_name}.`,
  });

  console.log('Loan successfully assigned to lender');
  return true;
}

// Helper: Reserve capital from lender's pool
async function reserveLenderCapital(supabase: any, match: MatchResult, amount: number) {
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
async function notifyLenderOfMatch(supabase: any, loan: any, match: MatchResult, matchId: string | undefined) {
  console.log(`[Matching] Notifying lender: ${match.lender_name}, matchId: ${matchId}`);

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
    }).catch(err => console.error(`[Matching] Email failed for ${lenderEmail}:`, err));
  } else {
    console.warn(`[Matching] No email for lender ${match.lender_name} (matchId: ${matchId})`);
  }

  // In-app notification
  const matchData = { match_id: matchId, amount: loan.amount, currency: loan.currency };
  const notifMsg = `A ${loan.currency} ${loan.amount.toLocaleString()} loan request matches your preferences. Review within 24 hours.`;

  if (match.lender_user_id) {
    await supabase.from('notifications').insert({
      user_id: match.lender_user_id,
      loan_id: loan.id,
      type: 'loan_match_offer',
      title: '🎯 New Loan Match Available',
      message: notifMsg,
      data: matchData,
    }).catch((e: any) => console.error('[Matching] Notification insert failed:', e));
  } else if (match.lender_business_id) {
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
      }).catch((e: any) => console.error('[Matching] Business notification insert failed:', e));
    }
  }
}

// Helper: Notify borrower that their loan is in the review queue
async function notifyBorrowerLoanQueued(supabase: any, loan: any, matchCount: number) {
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
  }).catch(err => console.error('[Matching] Borrower queued email failed:', err));

  await supabase.from('notifications').insert({
    user_id: loan.borrower_id,
    loan_id: loan.id,
    type: 'loan_in_review',
    title: '⏳ Loan Under Review',
    message: `Your ${loan.currency} ${loan.amount.toLocaleString()} request has been sent to ${matchCount} lender${matchCount !== 1 ? 's' : ''}. You'll be notified as soon as one accepts.`,
  }).catch((e: any) => console.error('[Matching] Borrower notification insert failed:', e));
}

// ============================================================
// EMAIL BUILDERS
// ============================================================

function buildLenderMatchEmail(params: {
  lenderName: string;
  borrowerName: string;
  borrowerRating?: string;
  amount: number;
  currency: string;
  purpose?: string;
  reviewUrl: string;
  expiresStr: string;
}): string {
  const { lenderName, borrowerName, borrowerRating, amount, currency, purpose, reviewUrl, expiresStr } = params;
  const ratingColors: Record<string, string> = {
    excellent: '#059669', good: '#10b981', neutral: '#6b7280',
    fair: '#f59e0b', poor: '#ef4444',
  };
  const ratingColor = ratingColors[borrowerRating?.toLowerCase() ?? 'neutral'] ?? '#6b7280';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Loan Opportunity – Feyza</title>
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 30px rgba(5,150,105,0.12);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#059669 0%,#047857 60%,#065f46 100%);padding:40px 40px 35px;text-align:center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <img src="https://feyza.app/feyza.png" alt="Feyza" height="44" style="display:block;border:0;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:50px;padding:6px 16px;margin-bottom:16px;">
                      <span style="color:#d1fae5;font-size:13px;font-weight:600;letter-spacing:0.5px;">🎯 LOAN OPPORTUNITY</span>
                    </div>
                    <h1 style="color:#ffffff;margin:0;font-size:30px;font-weight:700;letter-spacing:-0.5px;">New Match Available</h1>
                    <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:16px;">A borrower matches your lending preferences</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- AMOUNT HERO -->
          <tr>
            <td style="background:#f0fdf4;padding:0;border-bottom:1px solid #bbf7d0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:36px 40px;">
                    <p style="margin:0 0 6px;font-size:13px;color:#047857;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Loan Amount</p>
                    <p style="margin:0;font-size:52px;font-weight:800;color:#065f46;letter-spacing:-2px;line-height:1;">${currency} ${amount.toLocaleString()}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BORROWER INFO -->
          <tr>
            <td style="padding:32px 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;padding-right:20px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Borrower</p>
                    <p style="margin:0;font-size:20px;font-weight:700;color:#111827;">${borrowerName}</p>
                    ${purpose ? `<p style="margin:8px 0 0;font-size:14px;color:#6b7280;">Purpose: <span style="color:#374151;font-weight:500;">${purpose}</span></p>` : ''}
                  </td>
                  ${borrowerRating ? `
                  <td style="vertical-align:top;text-align:right;white-space:nowrap;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Rating</p>
                    <span style="display:inline-block;background:${ratingColor}15;color:${ratingColor};border:1px solid ${ratingColor}40;border-radius:8px;padding:4px 14px;font-size:15px;font-weight:700;text-transform:capitalize;">${borrowerRating}</span>
                  </td>
                  ` : ''}
                </tr>
              </table>
            </td>
          </tr>

          <!-- URGENCY BANNER -->
          <tr>
            <td style="padding:0 40px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef9c3;border:1px solid #fde68a;border-radius:12px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:20px;width:32px;vertical-align:middle;">⏰</td>
                        <td style="vertical-align:middle;padding-left:8px;">
                          <p style="margin:0;font-size:14px;font-weight:700;color:#92400e;">Time-Sensitive Opportunity</p>
                          <p style="margin:4px 0 0;font-size:13px;color:#b45309;">This offer expires ${expiresStr}. First lender to accept gets the loan.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 40px;text-align:center;">
              <a href="${reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669,#047857);color:#ffffff;text-decoration:none;padding:18px 48px;border-radius:12px;font-size:17px;font-weight:700;letter-spacing:0.3px;box-shadow:0 6px 20px rgba(5,150,105,0.35);">
                Review &amp; Accept Loan →
              </a>
              <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">
                Or visit: <a href="${reviewUrl}" style="color:#059669;text-decoration:none;">${reviewUrl}</a>
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
                <a href="${APP_URL}/lender/preferences" style="color:#059669;text-decoration:none;font-weight:500;">Manage Preferences</a>
                &nbsp;•&nbsp;
                <a href="mailto:support@feyza.app" style="color:#059669;text-decoration:none;font-weight:500;">Support</a>
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">Feyza · Intelligent Loan Matching · <a href="https://feyza.app" style="color:#9ca3af;text-decoration:none;">feyza.app</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

function buildBorrowerQueuedEmail(params: {
  borrowerName: string;
  amount: number;
  currency: string;
  matchCount: number;
  loanUrl: string;
}): string {
  const { borrowerName, amount, currency, matchCount, loanUrl } = params;
  const plural = matchCount !== 1;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loan Under Review – Feyza</title>
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 30px rgba(5,150,105,0.12);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#0284c7 0%,#0369a1 60%,#075985 100%);padding:40px 40px 35px;text-align:center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <img src="https://feyza.app/feyza.png" alt="Feyza" height="44" style="display:block;border:0;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:50px;padding:6px 16px;margin-bottom:16px;">
                      <span style="color:#bae6fd;font-size:13px;font-weight:600;letter-spacing:0.5px;">⏳ LOAN STATUS UPDATE</span>
                    </div>
                    <h1 style="color:#ffffff;margin:0;font-size:30px;font-weight:700;letter-spacing:-0.5px;">Your Loan is Under Review</h1>
                    <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:16px;">We've found ${matchCount} matching lender${plural ? 's' : ''} for you</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- AMOUNT -->
          <tr>
            <td style="background:#f0f9ff;padding:0;border-bottom:1px solid #bae6fd;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:36px 40px;">
                    <p style="margin:0 0 6px;font-size:13px;color:#0369a1;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Requested Amount</p>
                    <p style="margin:0;font-size:52px;font-weight:800;color:#0c4a6e;letter-spacing:-2px;line-height:1;">${currency} ${amount.toLocaleString()}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 20px;font-size:17px;color:#111827;">Hi ${borrowerName}! 👋</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
                Great news — we've matched your loan request with <strong style="color:#0284c7;">${matchCount} lender${plural ? 's' : ''}</strong> who fit your needs. 
                ${plural ? 'Each has been notified and the' : 'They have been notified and'} will review your request within the next <strong>24 hours</strong>.
              </p>

              <!-- STEPS -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;margin:0 0 24px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">What happens next</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;">
                                <div style="width:24px;height:24px;background:#059669;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#fff;">1</div>
                              </td>
                              <td style="padding-left:12px;vertical-align:top;">
                                <p style="margin:2px 0 0;font-size:14px;color:#374151;"><strong>Lender reviews</strong> your request (up to 24h)</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;">
                                <div style="width:24px;height:24px;background:#059669;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#fff;">2</div>
                              </td>
                              <td style="padding-left:12px;vertical-align:top;">
                                <p style="margin:2px 0 0;font-size:14px;color:#374151;"><strong>You get notified</strong> the moment someone accepts</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;">
                                <div style="width:24px;height:24px;background:#059669;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#fff;">3</div>
                              </td>
                              <td style="padding-left:12px;vertical-align:top;">
                                <p style="margin:2px 0 0;font-size:14px;color:#374151;"><strong>Funds are sent</strong> to you once the loan is signed</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- TIP -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:14px;color:#065f46;">
                      💡 <strong>Tip:</strong> You can also share your loan request directly with friends or family — personal loans don't need to go through matching.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 40px;text-align:center;">
              <a href="${loanUrl}" style="display:inline-block;background:linear-gradient(135deg,#0284c7,#0369a1);color:#ffffff;text-decoration:none;padding:18px 48px;border-radius:12px;font-size:17px;font-weight:700;letter-spacing:0.3px;box-shadow:0 6px 20px rgba(2,132,199,0.35);">
                Track Your Loan →
              </a>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">Feyza · Intelligent Loan Matching · <a href="https://feyza.app" style="color:#9ca3af;text-decoration:none;">feyza.app</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}



// Helper: Send match confirmation emails (auto-accept or manual accept confirmation)
async function sendMatchNotifications(supabase: any, loan: any, match: MatchResult, isAutoAccept: boolean) {
  // 1. Lender confirmation email
  let lenderEmail: string | null = null;
  let lenderName = match.lender_name;

  if (match.lender_user_id) {
    const { data: user } = await supabase
      .from('users').select('email, full_name').eq('id', match.lender_user_id).single();
    lenderEmail = user?.email;
    lenderName = user?.full_name || lenderName;
  } else if (match.lender_business_id) {
    const { data: business } = await supabase
      .from('business_profiles').select('contact_email, business_name').eq('id', match.lender_business_id).single();
    lenderEmail = business?.contact_email;
    lenderName = business?.business_name || lenderName;
  }

  if (lenderEmail) {
    await sendEmail({
      to: lenderEmail,
      subject: isAutoAccept
        ? `⚡ Loan Auto-Accepted: ${loan.currency} ${loan.amount.toLocaleString()} — Send Funds Now`
        : `✅ Loan Accepted: ${loan.currency} ${loan.amount.toLocaleString()} — Next Steps`,
      html: buildLenderConfirmationEmail({
        lenderName,
        borrowerName: loan.borrower?.full_name || 'the borrower',
        amount: loan.amount,
        currency: loan.currency,
        interestRate: match.interest_rate,
        purpose: loan.purpose,
        loanUrl: `${APP_URL}/loans/${loan.id}`,
        isAutoAccept,
      }),
    }).catch(err => console.error('[Matching] Lender confirmation email failed:', err));
  }

  // 2. Borrower confirmation email
  if (loan.borrower?.email) {
    await sendEmail({
      to: loan.borrower.email,
      subject: isAutoAccept
        ? `⚡ Instantly Matched! Your ${loan.currency} ${loan.amount.toLocaleString()} loan is approved`
        : `🎉 Loan Accepted! ${lenderName} approved your ${loan.currency} ${loan.amount.toLocaleString()} request`,
      html: buildBorrowerMatchedEmail({
        borrowerName: loan.borrower.full_name || 'there',
        lenderName,
        amount: loan.amount,
        currency: loan.currency,
        interestRate: match.interest_rate,
        loanUrl: `${APP_URL}/loans/${loan.id}`,
        isAutoAccept,
      }),
    }).catch(err => console.error('[Matching] Borrower confirmation email failed:', err));
  }
}

function buildLenderConfirmationEmail(params: {
  lenderName: string;
  borrowerName: string;
  amount: number;
  currency: string;
  interestRate: number;
  purpose?: string;
  loanUrl: string;
  isAutoAccept: boolean;
}): string {
  const { lenderName, borrowerName, amount, currency, interestRate, purpose, loanUrl, isAutoAccept } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 30px rgba(5,150,105,0.12);">

        <tr>
          <td style="background:linear-gradient(135deg,#059669 0%,#047857 60%,#065f46 100%);padding:40px;text-align:center;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:20px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="44" style="display:block;border:0;" /></td></tr>
            </table>
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:50px;padding:6px 16px;margin-bottom:16px;">
              <span style="color:#d1fae5;font-size:13px;font-weight:600;">${isAutoAccept ? '⚡ AUTO-ACCEPTED' : '✅ LOAN ACCEPTED'}</span>
            </div>
            <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;">${isAutoAccept ? 'Loan Auto-Matched!' : 'Loan Successfully Accepted!'}</h1>
            <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:15px;">${isAutoAccept ? 'Your auto-accept settings triggered a match' : 'Time to send the funds'}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px 0;">
            <p style="margin:0 0 24px;font-size:17px;color:#111827;">Hi ${lenderName}! 👋</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;">
              <tr>
                <td style="padding:28px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:13px;color:#047857;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Loan Amount</p>
                  <p style="margin:0;font-size:48px;font-weight:800;color:#065f46;letter-spacing:-2px;">${currency} ${amount.toLocaleString()}</p>
                  <p style="margin:10px 0 0;font-size:15px;color:#059669;">at <strong>${interestRate}%</strong> interest per annum</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 28px 28px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #bbf7d0;">
                    <tr>
                      <td style="padding:16px 0 0;">
                        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Borrower</p>
                        <p style="margin:0;font-size:16px;font-weight:600;color:#065f46;">${borrowerName}</p>
                      </td>
                      ${purpose ? `<td style="padding:16px 0 0;text-align:right;">
                        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Purpose</p>
                        <p style="margin:0;font-size:15px;color:#374151;font-weight:500;">${purpose}</p>
                      </td>` : ''}
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef9c3;border:1px solid #fde68a;border-radius:12px;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#92400e;">💰 Action Required</p>
                  <p style="margin:0;font-size:14px;color:#b45309;">Please send <strong>${currency} ${amount.toLocaleString()}</strong> to the borrower to activate this loan. Check their payment details on the loan page.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <a href="${loanUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669,#047857);color:#fff;text-decoration:none;padding:18px 48px;border-radius:12px;font-size:17px;font-weight:700;box-shadow:0 6px 20px rgba(5,150,105,0.35);">
              View Loan &amp; Send Funds →
            </a>
          </td>
        </tr>

        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Feyza · Intelligent Loan Matching · <a href="https://feyza.app" style="color:#9ca3af;text-decoration:none;">feyza.app</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildBorrowerMatchedEmail(params: {
  borrowerName: string;
  lenderName: string;
  amount: number;
  currency: string;
  interestRate: number;
  loanUrl: string;
  isAutoAccept: boolean;
}): string {
  const { borrowerName, lenderName, amount, currency, interestRate, loanUrl, isAutoAccept } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 30px rgba(5,150,105,0.12);">

        <tr>
          <td style="background:linear-gradient(135deg,#059669 0%,#047857 60%,#065f46 100%);padding:40px;text-align:center;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:20px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="44" style="display:block;border:0;" /></td></tr>
            </table>
            <div style="font-size:48px;margin-bottom:12px;">${isAutoAccept ? '⚡' : '🎉'}</div>
            <h1 style="color:#fff;margin:0;font-size:30px;font-weight:700;">${isAutoAccept ? 'Instantly Matched!' : 'Loan Accepted!'}</h1>
            <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:16px;"><strong style="color:#fff;">${lenderName}</strong> approved your request</p>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px 0;">
            <p style="margin:0 0 24px;font-size:17px;color:#111827;">Hi ${borrowerName}! 👋</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;margin-bottom:24px;">
              <tr>
                <td style="padding:28px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:13px;color:#047857;font-weight:600;text-transform:uppercase;letter-spacing:1px;">You're Getting</p>
                  <p style="margin:0;font-size:52px;font-weight:800;color:#065f46;letter-spacing:-2px;">${currency} ${amount.toLocaleString()}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 28px 28px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #bbf7d0;">
                    <tr>
                      <td style="padding:16px 0 0;text-align:center;">
                        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Interest Rate</p>
                        <p style="margin:0;font-size:22px;font-weight:700;color:#059669;">${interestRate}% <span style="font-size:14px;font-weight:400;color:#6b7280;">per annum</span></p>
                      </td>
                      <td style="padding:16px 0 0;text-align:center;">
                        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Lender</p>
                        <p style="margin:0;font-size:18px;font-weight:700;color:#065f46;">${lenderName}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#065f46;">🚀 What happens now</p>
                  <p style="margin:0;font-size:14px;color:#065f46;line-height:1.6;">${lenderName} will send <strong>${currency} ${amount.toLocaleString()}</strong> to your account. You'll get another notification the moment the funds are on their way.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <a href="${loanUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669,#047857);color:#fff;text-decoration:none;padding:18px 48px;border-radius:12px;font-size:17px;font-weight:700;box-shadow:0 6px 20px rgba(5,150,105,0.35);">
              View Your Loan →
            </a>
          </td>
        </tr>

        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Feyza · Secure Loan Matching · <a href="https://feyza.app" style="color:#9ca3af;text-decoration:none;">feyza.app</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}


// GET: Get match status for a loan
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
