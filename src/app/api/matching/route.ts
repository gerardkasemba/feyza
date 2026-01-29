import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getNoMatchFoundEmail, getNewMatchForLenderEmail, getLoanAcceptedBorrowerEmail, getLoanAcceptedLenderEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface MatchResult {
  lender_user_id: string | null;
  lender_business_id: string | null;
  match_score: number;
  auto_accept: boolean;
  interest_rate: number;
  lender_name: string;
  lender_email?: string;
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
      
      // Fallback: Query lender_preferences directly
      const { data: lenderPrefs, error: prefsError } = await supabase
        .from('lender_preferences')
        .select(`
          *,
          business:business_profiles!business_id(id, business_name, contact_email),
          user:users!user_id(id, full_name, email)
        `)
        .eq('is_active', true)
        .gte('capital_pool', loan.amount)
        .lte('min_amount', loan.amount)
        .gte('max_amount', loan.amount);

      if (prefsError) {
        console.error('Fallback query error:', prefsError);
        await supabase
          .from('loans')
          .update({ match_status: 'no_match' })
          .eq('id', loan_id);
        return NextResponse.json({ error: 'Matching failed: ' + prefsError.message }, { status: 500 });
      }

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
      const result = await assignLoanToLender(supabase, loan, bestMatch, bestMatchRecord?.id, true);
      
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
      // MANUAL: Notify lender and wait for response
      await notifyLenderOfMatch(supabase, loan, bestMatch, bestMatchRecord?.id);

      // Update loan with current match
      await supabase
        .from('loans')
        .update({ 
          match_status: 'matching',
          current_match_id: bestMatchRecord?.id,
          match_attempts: (loan.match_attempts || 0) + 1,
        })
        .eq('id', loan_id);

      return NextResponse.json({
        success: true,
        status: 'pending_acceptance',
        message: `Loan offered to ${bestMatch.lender_name}. Waiting for response (24h timeout).`,
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
  
  // Calculate interest based on lender's rate
  const lenderInterestRate = match.interest_rate || 0;
  const loanAmount = loan.amount || 0;
  const totalInstallments = loan.total_installments || 1;
  const repaymentFrequency = loan.repayment_frequency || 'monthly';
  
  // Calculate loan term in years for interest calculation
  let weeksPerPeriod = 4; // monthly default
  if (repaymentFrequency === 'weekly') weeksPerPeriod = 1;
  else if (repaymentFrequency === 'biweekly') weeksPerPeriod = 2;
  else if (repaymentFrequency === 'monthly') weeksPerPeriod = 4;
  
  const totalWeeks = totalInstallments * weeksPerPeriod;
  const loanTermYears = totalWeeks / 52;
  
  // Calculate total interest (simple interest: Principal × Rate × Time)
  const totalInterest = Math.round((loanAmount * (lenderInterestRate / 100) * loanTermYears) * 100) / 100;
  const totalAmount = Math.round((loanAmount + totalInterest) * 100) / 100;
  const repaymentAmount = Math.round((totalAmount / totalInstallments) * 100) / 100;
  
  console.log('Interest calculation:', { 
    lenderInterestRate, 
    loanAmount, 
    totalInstallments, 
    loanTermYears, 
    totalInterest, 
    totalAmount,
    repaymentAmount 
  });

  // For auto-accept: The loan is matched but lender hasn't explicitly signed yet.
  // They'll sign when they fund the loan.
  // lender_signed should only be true after lender explicitly reviews and funds.
  const updateData: any = {
    status: isAutoAccept ? 'pending' : 'active', // Auto-accept stays pending until lender funds
    match_status: 'matched',
    matched_at: new Date().toISOString(),
    interest_rate: lenderInterestRate,
    total_interest: totalInterest,
    total_amount: totalAmount,
    repayment_amount: repaymentAmount,
    amount_remaining: totalAmount,
    invite_accepted: true,
    // For auto-accept: Don't mark as signed yet - lender will sign when they fund
    // For manual accept: Lender explicitly accepted, so they've effectively signed
    lender_signed: !isAutoAccept,
    lender_signed_at: !isAutoAccept ? new Date().toISOString() : null,
    funds_sent: false, // Lender hasn't paid borrower yet
    auto_matched: isAutoAccept, // Track that this was auto-matched
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

// Helper: Notify lender of a match
async function notifyLenderOfMatch(supabase: any, loan: any, match: MatchResult, matchId: string | undefined) {
  console.log(`[Matching] ========== NOTIFY LENDER START ==========`);
  console.log(`[Matching] Loan ID: ${loan.id}, Amount: ${loan.currency} ${loan.amount}`);
  console.log(`[Matching] Match ID: ${matchId}`);
  console.log(`[Matching] Match data:`, JSON.stringify({
    lender_user_id: match.lender_user_id, 
    lender_business_id: match.lender_business_id,
    lender_name: match.lender_name,
    lender_email: match.lender_email,
    auto_accept: match.auto_accept,
  }, null, 2));

  // Get lender email - use match.lender_email as fallback
  let lenderEmail: string | null = match.lender_email || null;
  let lenderName = match.lender_name;

  if (match.lender_user_id) {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', match.lender_user_id)
      .single();
    if (userError) {
      console.error(`[Matching] Failed to fetch user ${match.lender_user_id}:`, userError);
    } else if (user) {
      lenderEmail = user.email || lenderEmail;
      lenderName = user.full_name || lenderName;
    }
  } else if (match.lender_business_id) {
    const { data: business, error: bizError } = await supabase
      .from('business_profiles')
      .select('contact_email, business_name')
      .eq('id', match.lender_business_id)
      .single();
    if (bizError) {
      console.error(`[Matching] Failed to fetch business ${match.lender_business_id}:`, bizError);
    } else if (business) {
      lenderEmail = business.contact_email || lenderEmail;
      lenderName = business.business_name || lenderName;
    }
  }

  console.log(`[Matching] Will send email to: ${lenderEmail}, name: ${lenderName}`);

  if (lenderEmail) {
    const reviewUrl = `${APP_URL}/lender/matches/${matchId}`;

    try {
      await sendEmail({
        to: lenderEmail,
        subject: `🎯 New Loan Match: ${loan.currency} ${loan.amount.toLocaleString()}`,
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>

      <body style="margin:0; padding:0; background:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#333;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center" style="padding:20px;">
              <!-- CARD -->
              <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:16px; overflow:hidden; border:1px solid #bbf7d0;">

                <!-- HEADER -->
                <tr>
                  <td style="background:linear-gradient(135deg,#059669,#047857); padding:30px;">
                    <table width="100%" role="presentation">
                      <tr>
                        <td align="center" style="padding-bottom:20px;">
                          <img
                            src="https://feyza.app/feyza.png"
                            alt="Feyza"
                            height="40"
                            style="display:block; border:0; outline:none; text-decoration:none;"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:600;">
                            🎯 You've Been Matched!
                          </h1>
                          <p style="margin:10px 0 0; color:rgba(255,255,255,0.9); font-size:16px;">
                            New Loan Opportunity
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- BODY -->
                <tr>
                  <td style="background:#f0fdf4; padding:30px;">
                    <p style="font-size:18px; color:#065f46; margin:0 0 20px;">
                      Hi ${lenderName}! 👋
                    </p>

                    <p style="color:#065f46; margin:0 0 20px;">
                      A borrower matches your lending preferences. Here are the details:
                    </p>

                    <!-- LOAN CARD -->
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff; border:1px solid #bbf7d0; border-radius:12px; margin:20px 0;">
                      <tr>
                        <td align="center" style="padding:25px; border-bottom:1px solid #e5e7eb;">
                          <p style="margin:0; font-size:14px; color:#047857;">Loan Amount</p>
                          <p style="margin:10px 0 0; font-size:34px; font-weight:bold; color:#059669;">
                            ${loan.currency} ${loan.amount.toLocaleString()}
                          </p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:20px;">
                          <p style="margin:0 0 8px; color:#047857; font-size:14px;">Borrower</p>
                          <p style="margin:0 0 15px; color:#065f46; font-size:16px; font-weight:600;">
                            ${loan.borrower?.full_name || 'Anonymous'}
                          </p>

                          <p style="margin:0 0 8px; color:#047857; font-size:14px;">Rating</p>
                          <span style="display:inline-block; background:#d1fae5; color:#065f46; padding:6px 14px; border-radius:20px; font-size:14px; font-weight:600;">
                            ${loan.borrower?.borrower_rating || 'Neutral'}
                          </span>

                          ${loan.recipient_country ? `
                            <p style="margin:20px 0 5px; color:#047857; font-size:14px;">Recipient Country</p>
                            <p style="margin:0; color:#065f46;">${loan.recipient_country}</p>
                          ` : ''}

                          ${loan.purpose ? `
                            <p style="margin:20px 0 5px; color:#047857; font-size:14px;">Purpose</p>
                            <p style="margin:0; color:#065f46;">${loan.purpose}</p>
                          ` : ''}
                        </td>
                      </tr>
                    </table>

                    <!-- ALERT -->
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fef9c3; border:1px solid #fde047; border-radius:8px; margin:25px 0;">
                      <tr>
                        <td style="padding:16px;">
                          <p style="margin:0; font-size:14px; color:#854d0e;">
                            <strong style="color:#059669;">⏰ Time Sensitive:</strong>
                            You have 24 hours to accept or decline this loan.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA -->
                    <table width="100%" role="presentation" style="margin:30px 0;">
                      <tr>
                        <td align="center">
                          <a
                            href="${reviewUrl}"
                            style="display:inline-block; background:#059669; color:#ffffff; text-decoration:none; padding:16px 40px; border-radius:8px; font-weight:600; font-size:16px;"
                          >
                            Review & Accept Loan →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- FOOTER LINKS -->
                    <p style="font-size:14px; color:#047857;">
                      <a href="${APP_URL}/help/lender-matches" style="color:#059669; text-decoration:none; font-weight:500;">Help Center</a>
                      &nbsp;•&nbsp;
                      <a href="mailto:support@feyza.com" style="color:#059669; text-decoration:none; font-weight:500;">Contact Support</a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- SIGNATURE -->
              <p style="margin-top:20px; font-size:12px; color:#6b7280;">
                Feyza • Smart Loan Matching System
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `,
      });
      console.log(`[Matching] ✅ Sent match notification email to ${lenderEmail}`);
    } catch (emailError) {
      console.error(`[Matching] ❌ Failed to send email to ${lenderEmail}:`, emailError);
    }
  } else {
    console.log(`[Matching] ⚠️ No email address found for lender, skipping email notification`);
  }

  // Create in-app notification for lender
  // Include match_id in data so notification can link to review page
  if (match.lender_user_id) {
    // Individual lender notification
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: match.lender_user_id,
      loan_id: loan.id,
      type: 'loan_match_offer',
      title: '🎯 New Loan Match!',
      message: `A ${loan.currency} ${loan.amount.toLocaleString()} loan matches your preferences. You have 24h to respond.`,
      data: { match_id: matchId, amount: loan.amount, currency: loan.currency },
    });
    if (notifError) {
      console.error(`[Matching] Failed to create notification for lender ${match.lender_user_id}:`, notifError);
    } else {
      console.log(`[Matching] ✅ Created in-app notification for lender user ${match.lender_user_id}, match_id: ${matchId}`);
    }
  } else if (match.lender_business_id) {
    // Business lender notification - find the business owner
    const { data: business, error: bizError } = await supabase
      .from('business_profiles')
      .select('user_id, business_name')
      .eq('id', match.lender_business_id)
      .single();
    
    if (bizError) {
      console.error(`[Matching] Failed to get business profile ${match.lender_business_id}:`, bizError);
    } else if (business?.user_id) {
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: business.user_id,
        loan_id: loan.id,
        type: 'loan_match_offer',
        title: '🎯 New Loan Match!',
        message: `A ${loan.currency} ${loan.amount.toLocaleString()} loan matches your ${business.business_name} lending preferences. Review and accept within 24h.`,
        data: { match_id: matchId, amount: loan.amount, currency: loan.currency, business_name: business.business_name },
      });
      if (notifError) {
        console.error(`[Matching] Failed to create notification for business owner ${business.user_id}:`, notifError);
      } else {
        console.log(`[Matching] ✅ Created in-app notification for business owner ${business.user_id}, match_id: ${matchId}`);
      }
    } else {
      console.log(`[Matching] Business ${match.lender_business_id} has no user_id, skipping notification`);
    }
  } else {
    console.log(`[Matching] No lender_user_id or lender_business_id, skipping notification`);
  }

  console.log(`[Matching] ========== NOTIFY LENDER END ==========`);
}

// Helper: Send match confirmation emails
async function sendMatchNotifications(supabase: any, loan: any, match: MatchResult, isAutoAccept: boolean) {
    // 1. Email to LENDER (confirmation of auto-accept or acceptance)
  let lenderEmail: string | null = null;
  let lenderName = match.lender_name;

  if (match.lender_user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', match.lender_user_id)
      .single();
    lenderEmail = user?.email;
    lenderName = user?.full_name || lenderName;
  } else if (match.lender_business_id) {
    const { data: business } = await supabase
      .from('business_profiles')
      .select('contact_email, business_name')
      .eq('id', match.lender_business_id)
      .single();
    lenderEmail = business?.contact_email;
    lenderName = business?.business_name || lenderName;
  }

  if (lenderEmail) {
    await sendEmail({
      to: lenderEmail,
      subject: isAutoAccept ? 'Loan Auto-Accepted!' : 'You Accepted a Loan!',
      html: `
      <!DOCTYPE html>
      <html lang="en">
        <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
          
          <!-- Wrapper -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding:20px;">
                
                <!-- Card -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">

                  <!-- HEADER -->
                  <tr>
                    <td style="background:#059669;padding:30px;text-align:center;">
                      
                      <!-- Logo -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="padding-bottom:20px;">
                            <img
                              src="https://feyza.app/feyza.png"
                              alt="Feyza Logo"
                              height="40"
                              style="display:block;height:40px;width:auto;border:0;outline:none;text-decoration:none;"
                            />
                          </td>
                        </tr>
                      </table>

                      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:600;">
                        ${isAutoAccept ? 'Loan Auto-Accepted!' : 'Loan Accepted!'}
                      </h1>
                      <p style="margin:8px 0 0;color:#d1fae5;font-size:15px;">
                        ${isAutoAccept ? 'Automated matching complete' : 'Successfully matched with borrower'}
                      </p>
                    </td>
                  </tr>

                  <!-- CONTENT -->
                  <tr>
                    <td style="background:#f0fdf4;padding:30px;border:1px solid #bbf7d0;border-top:none;">
                      
                      <p style="font-size:18px;color:#065f46;margin:0 0 20px;">
                        Hi ${lenderName} 👋
                      </p>

                      <p style="color:#065f46;line-height:1.6;margin:0 0 20px;">
                        ${isAutoAccept
                          ? 'Your auto-accept settings successfully matched you with a new loan.'
                          : 'You have successfully accepted a loan request from a verified borrower.'}
                      </p>

                      <!-- LOAN DETAILS -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                        style="background:#ffffff;border-radius:12px;border:1px solid #bbf7d0;margin:20px 0;">
                        <tr>
                          <td style="padding:24px;text-align:center;">
                            <h3 style="margin:0 0 16px;color:#065f46;font-size:20px;">Loan Details</h3>

                            <div style="background:#dcfce7;padding:18px;border-radius:8px;margin-bottom:20px;">
                              <p style="margin:0;color:#065f46;font-size:14px;">Loan Amount</p>
                              <p style="margin:6px 0;font-size:34px;font-weight:bold;color:#059669;">
                                ${loan.currency} ${loan.amount.toLocaleString()}
                              </p>
                              <p style="margin:0;color:#047857;font-size:15px;">
                                Interest Rate: <strong>${match.interest_rate}%</strong> p.a.
                              </p>
                            </div>

                            <!-- DETAILS -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="padding:10px 0;text-align:left;">
                                  <p style="margin:0;color:#6b7280;font-size:13px;">Borrower</p>
                                  <p style="margin:0;color:#065f46;font-weight:500;">
                                    ${loan.borrower?.full_name || 'Anonymous Borrower'}
                                  </p>
                                </td>
                                <td style="padding:10px 0;text-align:left;">
                                  <p style="margin:0;color:#6b7280;font-size:13px;">Purpose</p>
                                  <p style="margin:0;color:#065f46;font-weight:500;">
                                    ${loan.purpose || 'Not specified'}
                                  </p>
                                </td>
                              </tr>
                            </table>

                            ${loan.repayment_term ? `
                            <p style="margin-top:15px;color:#065f46;">
                              Repayment Term: <strong>${loan.repayment_term} ${loan.repayment_term_unit || 'months'}</strong>
                            </p>
                            ` : ''}
                          </td>
                        </tr>
                      </table>

                      <!-- ACTION REQUIRED -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                        style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;margin:20px 0;">
                        <tr>
                          <td style="padding:18px;">
                            <p style="margin:0 0 8px;color:#92400e;font-weight:600;">
                              💰 Action Required: Send Payment
                            </p>
                            <p style="margin:0;color:#92400e;">
                              Please send <strong>${loan.currency} ${loan.amount.toLocaleString()}</strong>
                              to the borrower via PayPal within 24 hours.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- CTA BUTTON -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="padding:20px 0;">
                            <a href="${APP_URL}/loans/${loan.id}"
                              style="background:#059669;color:#ffffff;text-decoration:none;
                                    padding:14px 32px;border-radius:8px;
                                    font-weight:600;font-size:16px;display:inline-block;">
                              View Loan & Send Payment →
                            </a>
                          </td>
                        </tr>
                      </table>

                      ${isAutoAccept ? `
                      <p style="background:#dcfce7;padding:14px;border-radius:8px;border:1px solid #86efac;
                                color:#065f46;font-size:14px;">
                        ℹ️ This loan was auto-accepted based on your preferences.
                        Manage settings in <a href="${APP_URL}/lender/preferences" style="color:#059669;">Lender Preferences</a>.
                      </p>
                      ` : ''}

                      <!-- FOOTER -->
                      <div style="margin-top:30px;padding-top:20px;border-top:1px solid #bbf7d0;color:#047857;font-size:14px;">
                        <p style="margin:0 0 8px;">Need help?</p>
                        <a href="${APP_URL}/help/payment-process" style="color:#059669;text-decoration:none;font-weight:500;">Payment Guide</a>
                        &nbsp;•&nbsp;
                        <a href="mailto:support@feyza.com" style="color:#059669;text-decoration:none;font-weight:500;">Support</a>
                      </div>

                    </td>
                  </tr>

                </table>

                <p style="margin-top:20px;color:#6b7280;font-size:12px;text-align:center;">
                  Feyza • Automated Loan Matching System
                </p>

              </td>
            </tr>
          </table>

        </body>
      </html>
      `,
    });
  }

  // 2. Email to BORROWER
  if (loan.borrower?.email) {
  await sendEmail({
    to: loan.borrower.email,
    subject: isAutoAccept ? 'Loan Instantly Matched!' : 'Your Loan Has Been Accepted!',
    html: `
    <!DOCTYPE html>
    <html>
      <body style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background: #f9fafb;
      ">

        <!-- ===== HEADER ===== -->
        <div style="
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          padding: 30px;
          border-radius: 16px 16px 0 0;
          text-align: center;
        ">

          <!-- Logo (email-safe centered) -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding-bottom: 20px;">
                <img
                  src="https://feyza.app/feyza.png"
                  alt="Feyza Logo"
                  height="40"
                  style="display:block; height:40px; width:auto; border:0; outline:none; text-decoration:none;"
                />
              </td>
            </tr>
          </table>

          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
            ${isAutoAccept ? '⚡ Instant Match!' : '🎉 Loan Accepted!'}
          </h1>

          ${
            isAutoAccept
              ? `<p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">
                  Automatically approved by our system
                </p>`
              : ''
          }
        </div>

        <!-- ===== CONTENT ===== -->
        <div style="
          background: #f0fdf4;
          padding: 30px;
          border-radius: 0 0 16px 16px;
          border: 1px solid #bbf7d0;
          border-top: none;
        ">

          <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">
            Hi ${loan.borrower.full_name || 'there'}! 👋
          </p>

          <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
            Great news! Your loan has been
            ${isAutoAccept ? 'instantly matched and approved' : 'accepted'}
            by <strong style="color:#059669;">${lenderName}</strong>.
          </p>

          <!-- ===== LOAN DETAILS ===== -->
          <div style="
            background: white;
            padding: 24px;
            border-radius: 12px;
            margin: 20px 0;
            border: 1px solid #bbf7d0;
            box-shadow: 0 2px 8px rgba(5,150,105,0.1);
          ">

            <h3 style="
              margin: 0 0 20px;
              color: #065f46;
              font-size: 20px;
              font-weight: 600;
              text-align: center;
            ">
              Loan Details
            </h3>

            <div style="text-align: center; margin-bottom: 20px;">
              <p style="color: #6b7280; margin: 0; font-size: 14px;">Loan Amount</p>
              <p style="
                font-size: 40px;
                font-weight: bold;
                color: #059669;
                margin: 10px 0;
                letter-spacing: -0.5px;
              ">
                ${loan.currency} ${loan.amount.toLocaleString()}
              </p>
            </div>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 8px; text-align: center;">
                  <div style="background:#f0fdf4; padding:15px; border-radius:8px;">
                    <p style="color:#065f46; margin:0; font-size:13px; font-weight:600;">Interest Rate</p>
                    <p style="color:#059669; margin:8px 0 0; font-size:22px; font-weight:bold;">
                      ${match.interest_rate}%
                    </p>
                    <p style="color:#6b7280; margin:5px 0 0; font-size:12px;">per annum</p>
                  </div>
                </td>

                <td style="padding: 8px; text-align: center;">
                  <div style="background:#f0fdf4; padding:15px; border-radius:8px;">
                    <p style="color:#065f46; margin:0; font-size:13px; font-weight:600;">Lender</p>
                    <p style="color:#059669; margin:8px 0 0; font-size:18px; font-weight:bold;">
                      ${lenderName}
                    </p>
                    <p style="color:#6b7280; margin:5px 0 0; font-size:12px;">Verified Partner</p>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- ===== NEXT STEPS ===== -->
          <div style="
            background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
            border: 1px solid #86efac;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
          ">
            <h4 style="margin:0 0 8px; color:#065f46; font-weight:600;">Next Steps</h4>
            <p style="margin:0; color:#166534; line-height:1.6;">
              The lender will send
              <strong>${loan.currency} ${loan.amount.toLocaleString()}</strong>
              to your PayPal account. You’ll receive another notification when the payment is sent.
            </p>
          </div>

          <!-- ===== CTA ===== -->
          <a href="${APP_URL}/loans/${loan.id}"
            style="
              display:block;
              background: linear-gradient(to right, #059669, #047857);
              color:white;
              text-decoration:none;
              padding:16px 32px;
              border-radius:8px;
              font-weight:600;
              text-align:center;
              margin:24px 0;
              font-size:16px;
              box-shadow:0 4px 12px rgba(5,150,105,0.2);
            ">
            View Your Loan Details →
          </a>

          <!-- ===== FOOTER ===== -->
          <div style="
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #bbf7d0;
            color: #047857;
            font-size: 14px;
            text-align:center;
          ">
            <p style="margin:0 0 10px;">Questions about your loan?</p>
            <p style="margin:0;">
              <a href="${APP_URL}/help/loan-acceptance" style="color:#059669; text-decoration:none; font-weight:500;">Help Center</a> •
              <a href="mailto:support@feyza.com" style="color:#059669; text-decoration:none; font-weight:500;">Contact Support</a>
            </p>
          </div>
        </div>

        <!-- ===== SIGNATURE ===== -->
        <div style="text-align:center; margin-top:20px; color:#6b7280; font-size:12px;">
          Feyza • Secure Loan Matching
        </div>

      </body>
    </html>
    `,
  });
  }
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
