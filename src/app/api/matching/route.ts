import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

interface MatchResult {
  lender_user_id: string | null;
  lender_business_id: string | null;
  match_score: number;
  auto_accept: boolean;
  interest_rate: number;
  lender_name: string;
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

    console.log('Loan details:', { amount: loan.amount, currency: loan.currency, borrower: loan.borrower?.full_name });

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
    console.log('Attempting to find matching lenders for loan:', loan_id);
    
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
          business:business_profiles!business_id(id, business_name, contact_email)
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

      // Filter and score lenders
      if (lenderPrefs && lenderPrefs.length > 0) {
        matches = lenderPrefs
          .filter((lp: any) => {
            // Check capital available
            const available = (lp.capital_pool || 0) - (lp.capital_reserved || 0);
            if (available < loan.amount) return false;
            
            // Check first-time borrower restrictions
            if (isFirstTimeBorrower) {
              // Skip if lender doesn't allow first-time borrowers
              if (lp.allow_first_time_borrowers === false) {
                console.log(`Skipping lender ${lp.business?.business_name || lp.user_id}: doesn't allow first-time borrowers`);
                return false;
              }
              // Check first-time borrower limit
              const firstTimeLimit = lp.first_time_borrower_limit ?? lp.max_amount;
              if (loan.amount > firstTimeLimit) {
                console.log(`Skipping lender ${lp.business?.business_name || lp.user_id}: first-time limit ${firstTimeLimit} < requested ${loan.amount}`);
                return false;
              }
            }
            
            return true;
          })
          .map((lp: any) => ({
            lender_user_id: lp.user_id,
            lender_business_id: lp.business_id,
            match_score: 80, // Default score for fallback
            auto_accept: lp.auto_accept || false,
            interest_rate: lp.interest_rate || 10,
            lender_name: lp.business?.business_name || 'Lender',
            first_time_borrower_limit: lp.first_time_borrower_limit,
          }))
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
        const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const isFirstTime = isFirstTimeBorrower;
        
        await sendEmail({
          to: loan.borrower.email,
          subject: '📋 Loan Request Update - No Matching Lenders Found',
          html: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0;">📋 Loan Request Update</h1>
                </div>
                
                <div style="background: #fff7ed; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #fed7aa;">
                  <p style="font-size: 18px;">Hi ${loan.borrower.full_name || 'there'}! 👋</p>
                  
                  <p>We couldn't find a matching business lender for your loan request at this time.</p>
                  
                  <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #fed7aa;">
                    <p style="margin: 0;"><strong>Requested Amount:</strong> ${loan.currency} ${loan.amount.toLocaleString()}</p>
                    ${loan.purpose ? `<p style="margin: 10px 0 0 0;"><strong>Purpose:</strong> ${loan.purpose}</p>` : ''}
                  </div>
                  
                  ${isFirstTime ? `
                  <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0; color: #1e40af; font-size: 14px;">
                      <strong>💡 First-time borrower tip:</strong> As a new user, some lenders have limits on how much they'll lend to first-timers. 
                      Try requesting a smaller amount (e.g., $100-$300) to build your borrowing history first.
                    </p>
                  </div>
                  ` : ''}
                  
                  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0; color: #166534; font-size: 14px;">
                      <strong>What you can do:</strong>
                    </p>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #166534; font-size: 14px;">
                      <li>Try a smaller loan amount</li>
                      <li>Request from a friend or family member instead</li>
                      <li>Check back later as new lenders join regularly</li>
                    </ul>
                  </div>
                  
                  <a href="${APP_URL}/loans/new" style="display: block; background: #10b981; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
                    Try a Different Amount →
                  </a>
                  
                  <a href="${APP_URL}/loans/${loan.id}" style="display: block; color: #6b7280; text-decoration: none; text-align: center; font-size: 14px;">
                    View your loan request
                  </a>
                </div>
                
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
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
          title: '📋 No Matching Lenders',
          message: isFirstTime 
            ? `No lenders found for your ${loan.currency} ${loan.amount} request. As a first-time borrower, try a smaller amount to build history.`
            : `No lenders currently available for your ${loan.currency} ${loan.amount} request. Try a smaller amount or ask a friend.`,
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

  // Simple flow: Loan is active immediately, lender will send PayPal payment
  // funds_sent tracks whether lender has paid the borrower
  const updateData: any = {
    status: 'active',
    match_status: 'matched',
    matched_at: new Date().toISOString(),
    interest_rate: lenderInterestRate,
    total_interest: totalInterest,
    total_amount: totalAmount,
    repayment_amount: repaymentAmount,
    amount_remaining: totalAmount,
    invite_accepted: true,
    lender_signed: true,
    lender_signed_at: new Date().toISOString(),
    funds_sent: false, // Lender hasn't paid borrower yet
  };

  if (match.lender_user_id) {
    updateData.lender_id = match.lender_user_id;
  } else if (match.lender_business_id) {
    updateData.business_lender_id = match.lender_business_id;
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
  // Get lender email
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
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const reviewUrl = `${APP_URL}/lender/matches/${matchId}`;

    await sendEmail({
      to: lenderEmail,
      subject: `🎯 New Loan Match: ${loan.currency} ${loan.amount}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header with logo -->
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <!-- Logo -->
              <div style="margin-bottom: 20px;">
                <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                    alt="Feyza Logo" 
                    style="height: 40px; width: auto; filter: brightness(0) invert(1);">
              </div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎯 You've Been Matched!</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">New Loan Opportunity</p>
            </div>
            
            <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
              <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${lenderName}! 👋</p>
              
              <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                A borrower matches your lending preferences. Here are the details:
              </p>
              
              <!-- Loan Details Card -->
              <div style="background: white; padding: 25px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.08);">
                <!-- Loan Amount Highlight -->
                <div style="text-align: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb;">
                  <p style="color: #047857; margin: 0; font-size: 14px; font-weight: 500;">Loan Amount</p>
                  <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0;">
                    ${loan.currency} ${loan.amount.toLocaleString()}
                  </p>
                </div>
                
                <!-- Borrower Details Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                  <div>
                    <p style="color: #047857; margin: 0 0 5px 0; font-size: 14px; font-weight: 500;">Borrower</p>
                    <p style="color: #065f46; margin: 0; font-size: 16px; font-weight: 600;">
                      ${loan.borrower?.full_name || 'Anonymous'}
                    </p>
                  </div>
                  
                  <div>
                    <p style="color: #047857; margin: 0 0 5px 0; font-size: 14px; font-weight: 500;">Rating</p>
                    <div style="display: inline-block; background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                      ${loan.borrower?.borrower_rating || 'Neutral'}
                    </div>
                  </div>
                  
                  ${loan.recipient_country ? `
                  <div>
                    <p style="color: #047857; margin: 0 0 5px 0; font-size: 14px; font-weight: 500;">Recipient Country</p>
                    <p style="color: #065f46; margin: 0; font-size: 16px; font-weight: 500;">
                      ${loan.recipient_country}
                    </p>
                  </div>
                  ` : ''}
                  
                  ${loan.purpose ? `
                  <div>
                    <p style="color: #047857; margin: 0 0 5px 0; font-size: 14px; font-weight: 500;">Purpose</p>
                    <p style="color: #065f46; margin: 0; font-size: 16px; font-weight: 500;">
                      ${loan.purpose}
                    </p>
                  </div>
                  ` : ''}
                </div>
              </div>
              
              <!-- Time Sensitive Alert -->
              <div style="background: linear-gradient(to right, #fef9c3, #fef3c7); border: 1px solid #fde047; border-radius: 8px; padding: 18px; margin: 25px 0; position: relative;">
                <div style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%);">
                  <span style="background: #059669; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px;">⏰</span>
                </div>
                <div style="margin-left: 35px;">
                  <p style="margin: 0; color: #854d0e; font-size: 14px; line-height: 1.5;">
                    <strong style="color: #059669;">Time Sensitive:</strong> You have 24 hours to accept or decline this loan. 
                    If you don't respond, it will be offered to the next matching lender.
                  </p>
                </div>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${reviewUrl}" 
                  style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                          color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; 
                          font-weight: 600; text-align: center; font-size: 16px;
                          box-shadow: 0 4px 15px rgba(5, 150, 105, 0.25); transition: all 0.2s ease;"
                  onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(5, 150, 105, 0.35)';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 15px rgba(5, 150, 105, 0.25)';">
                  Review & Accept Loan →
                </a>
                
                <p style="color: #047857; font-size: 14px; margin-top: 15px; text-align: center;">
                  <a href="${APP_URL}/lender/preferences" style="color: #059669; text-decoration: none; font-weight: 500;">
                    💡 Enable auto-accept in your preferences
                  </a>
                </p>
              </div>
              
              <!-- Quick Actions -->
              <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; margin: 25px 0;">
                <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Quick Actions</h3>
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                  <a href="${APP_URL}/lender/loans" 
                    style="display: inline-block; background: #f0fdf4; color: #059669; text-decoration: none; 
                            padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500; 
                            border: 1px solid #059669; transition: all 0.2s ease;"
                    onmouseover="this.style.background='#dcfce7';"
                    onmouseout="this.style.background='#f0fdf4';">
                    View All Matches
                  </a>
                  <a href="${APP_URL}/lender/preferences" 
                    style="display: inline-block; background: #f0fdf4; color: #059669; text-decoration: none; 
                            padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500; 
                            border: 1px solid #059669; transition: all 0.2s ease;"
                    onmouseover="this.style.background='#dcfce7';"
                    onmouseout="this.style.background='#f0fdf4';">
                    Update Preferences
                  </a>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                <p style="margin: 0 0 10px 0;">Questions about this match?</p>
                <p style="margin: 0;">
                  <a href="${APP_URL}/help/lender-matches" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                    Help Center
                  </a>
                  <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                    Contact Support
                  </a>
                </p>
              </div>
            </div>
            
            <!-- Signature -->
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;">Feyza • Smart Loan Matching System</p>
            </div>
          </body>
        </html>
      `,
    });
  }

  // Create in-app notification
  if (match.lender_user_id) {
    await supabase.from('notifications').insert({
      user_id: match.lender_user_id,
      loan_id: loan.id,
      type: 'loan_match_offer',
      title: '🎯 New Loan Match!',
      message: `A ${loan.currency} ${loan.amount} loan matches your preferences. You have 24h to respond.`,
    });
  }
}

// Helper: Send match confirmation emails
async function sendMatchNotifications(supabase: any, loan: any, match: MatchResult, isAutoAccept: boolean) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
      subject: isAutoAccept ? '✅ Loan Auto-Accepted!' : '✅ You Accepted a Loan!',
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header with gradient background and logo -->
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
              <!-- Logo -->
              <div style="margin-bottom: 20px;">
                <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                    alt="Feyza Logo" 
                    style="height: 40px; width: auto; filter: brightness(0) invert(1);">
              </div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">${isAutoAccept ? '✅ Loan Auto-Accepted!' : '✅ Loan Accepted!'}</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">${isAutoAccept ? 'Automated matching complete' : 'Successfully matched with borrower'}</p>
            </div>
            
            <!-- Content area -->
            <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
              <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${lenderName}! 👋</p>
              
              <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                ${isAutoAccept 
                  ? 'Your auto-accept setting has successfully matched you with a new loan!' 
                  : 'You have successfully accepted a loan request from a verified borrower.'}
              </p>
              
              <!-- Loan details card -->
              <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                <h3 style="margin: 0 0 20px 0; color: #065f46; font-size: 20px; font-weight: 600; text-align: center;">Loan Details</h3>
                
                <!-- Amount highlight -->
                <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                  <p style="color: #166534; margin: 0 0 8px 0; font-size: 14px; font-weight: 500;">Loan Amount</p>
                  <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 0 0 8px 0; letter-spacing: -0.5px;">
                    ${loan.currency} ${loan.amount.toLocaleString()}
                  </p>
                  <p style="color: #047857; margin: 0; font-size: 16px; font-weight: 500;">
                    Interest Rate: <strong>${match.interest_rate}%</strong> p.a.
                  </p>
                </div>
                
                <!-- Borrower info -->
                <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                  <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 15px;">
                    <div>
                      <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">Borrower</p>
                      <p style="color: #166534; margin: 0; font-weight: 500; font-size: 16px;">
                        ${loan.borrower?.full_name || 'Anonymous Borrower'}
                      </p>
                    </div>
                    <div>
                      <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">Loan Purpose</p>
                      <p style="color: #166534; margin: 0; font-weight: 500; font-size: 16px;">
                        ${loan.purpose || 'Not specified'}
                      </p>
                    </div>
                  </div>
                  
                  ${loan.repayment_term ? `
                  <div style="margin-top: 20px;">
                    <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">Repayment Term</p>
                    <p style="color: #166534; margin: 0; font-weight: 500; font-size: 16px;">
                      ${loan.repayment_term} ${loan.repayment_term_unit || 'months'}
                    </p>
                  </div>
                  ` : ''}
                </div>
              </div>
              
              <!-- Action required notice -->
              <div style="background: linear-gradient(to right, #fef3c7, #fde68a); border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 20px 0; position: relative;">
                <div style="position: absolute; top: -10px; left: 20px; background: #f59e0b; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                  Action Required
                </div>
                <div style="margin-top: 10px;">
                  <p style="margin: 0 0 10px 0; color: #92400e; font-size: 16px; font-weight: 600;">
                    💰 Send Payment to Borrower
                  </p>
                  <p style="margin: 0; color: #92400e; font-size: 15px;">
                    Please send <strong>${loan.currency} ${loan.amount.toLocaleString()}</strong> 
                    to the borrower via PayPal within the next 24 hours.
                  </p>
                </div>
              </div>
              
              <!-- CTA Buttons -->
              <div style="display: flex; gap: 15px; margin: 24px 0; flex-wrap: wrap;">
                <a href="${APP_URL}/loans/${loan.id}" 
                  style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                          color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                          font-weight: 600; text-align: center; font-size: 16px; flex: 1; min-width: 200px;
                          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                  onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                  View Loan & Send Payment →
                </a>
                
                <a href="${APP_URL}/dashboard" 
                  style="display: inline-block; background: white; 
                          color: #059669; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                          font-weight: 600; text-align: center; font-size: 16px; border: 2px solid #059669;
                          box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1); transition: all 0.2s ease; flex: 1; min-width: 200px;"
                  onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';this.style.background='#f0fdf4';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(5, 150, 105, 0.1)';this.style.background='white';">
                  Go to Dashboard
                </a>
              </div>
              
              <!-- Auto-accept info (if applicable) -->
              ${isAutoAccept ? `
              <div style="background: #dcfce7; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
                <p style="margin: 0; color: #065f46; font-size: 14px;">
                  ℹ️ <strong>Auto-accept enabled:</strong> This loan was automatically accepted based on your matching preferences. 
                  You can adjust these settings in your <a href="${APP_URL}/lender/preferences" style="color: #059669; font-weight: 500; text-decoration: none;">Lender Preferences</a>.
                </p>
              </div>
              ` : ''}
              
              <!-- Footer -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                <p style="margin: 0 0 10px 0;">Need help with the payment process?</p>
                <p style="margin: 0;">
                  <a href="${APP_URL}/help/payment-process" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                    Payment Guide
                  </a>
                  <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                    Contact Support
                  </a>
                </p>
              </div>
            </div>
            
            <!-- Signature -->
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;">Feyza • Automated Loan Matching System</p>
            </div>
          </body>
        </html>
      `,
    });
  }

  // 2. Email to BORROWER
  if (loan.borrower?.email) {
  await sendEmail({
    to: loan.borrower.email,
    subject: isAutoAccept ? '⚡ Loan Instantly Matched!' : '🎉 Your Loan Has Been Accepted!',
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
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
              ${isAutoAccept ? '⚡ Instant Match!' : '🎉 Loan Accepted!'}
            </h1>
            ${isAutoAccept ? '<p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Automatically approved by our system</p>' : ''}
          </div>
          
          <!-- Content area -->
          <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
            <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${loan.borrower.full_name || 'there'}! 👋</p>
            
            <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
              Great news! Your loan has been ${isAutoAccept ? 'instantly matched and approved' : 'accepted'} by 
              <strong style="color: #059669;">${lenderName}</strong>.
            </p>
            
            <!-- Loan details card -->
            <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
              <h3 style="margin: 0 0 20px 0; color: #065f46; font-size: 20px; font-weight: 600; text-align: center;">Loan Details</h3>
              
              <div style="text-align: center; margin-bottom: 20px;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">Loan Amount</p>
                <p style="font-size: 40px; font-weight: bold; color: #059669; margin: 10px 0; letter-spacing: -0.5px;">
                  ${loan.currency} ${loan.amount.toLocaleString()}
                </p>
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 25px;">
                <div style="text-align: center; padding: 15px; background: #f0fdf4; border-radius: 8px;">
                  <p style="color: #065f46; margin: 0; font-size: 13px; font-weight: 600;">Interest Rate</p>
                  <p style="color: #059669; margin: 8px 0 0 0; font-size: 22px; font-weight: bold;">${match.interest_rate}%</p>
                  <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 12px;">per annum</p>
                </div>
                
                <div style="text-align: center; padding: 15px; background: #f0fdf4; border-radius: 8px;">
                  <p style="color: #065f46; margin: 0; font-size: 13px; font-weight: 600;">Lender</p>
                  <p style="color: #059669; margin: 8px 0 0 0; font-size: 18px; font-weight: bold;">${lenderName}</p>
                  <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 12px;">Verified Partner</p>
                </div>
              </div>
            </div>
            
            <!-- Next steps -->
            <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin: 25px 0;">
              <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="background: #059669; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span style="font-size: 18px;">💰</span>
                </div>
                <div>
                  <h4 style="margin: 0 0 8px 0; color: #065f46; font-weight: 600;">Next Steps</h4>
                  <p style="margin: 0; color: #166534; line-height: 1.6;">
                    The lender will send <strong>${loan.currency} ${loan.amount.toLocaleString()}</strong> to your PayPal account. 
                    You'll receive another notification when the payment is sent!
                  </p>
                </div>
              </div>
            </div>
            
            <!-- Timeline -->
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0;">
              <h4 style="color: #065f46; margin: 0 0 15px 0; font-weight: 600;">📋 What Happens Next:</h4>
              <div style="display: flex; flex-direction: column; gap: 15px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                  <div style="background: #059669; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0;">
                    1
                  </div>
                  <div>
                    <p style="color: #166534; margin: 0; font-weight: 500;">Lender prepares payment</p>
                    <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Typically within 24 hours</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 15px;">
                  <div style="background: #86efac; color: #065f46; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0;">
                    2
                  </div>
                  <div>
                    <p style="color: #166534; margin: 0; font-weight: 500;">Payment sent to PayPal</p>
                    <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">You'll receive payment notification</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 15px;">
                  <div style="background: #bbf7d0; color: #065f46; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0;">
                    3
                  </div>
                  <div>
                    <p style="color: #166534; margin: 0; font-weight: 500;">Funds available</p>
                    <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Start repaying according to schedule</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- CTA Button -->
            <a href="${APP_URL}/loans/${loan.id}" 
              style="display: block; background: linear-gradient(to right, #059669, #047857); 
                      color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                      font-weight: 600; text-align: center; margin: 24px 0; font-size: 16px;
                      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
              onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
              onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
              View Your Loan Details →
            </a>
            
            <!-- Footer -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
              <p style="margin: 0 0 10px 0;">Questions about your loan?</p>
              <p style="margin: 0;">
                <a href="${APP_URL}/help/loan-acceptance" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                  Help Center
                </a>
                <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                  Contact Support
                </a>
                <a href="${APP_URL}/contact/${lenderName}" style="color: #059669; text-decoration: none; font-weight: 500;">
                  Contact Lender
                </a>
              </p>
            </div>
          </div>
          
          <!-- Signature -->
          <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">Feyza • Secure Loan Matching</p>
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
