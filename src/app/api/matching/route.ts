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
            return available >= loan.amount;
          })
          .map((lp: any) => ({
            lender_user_id: lp.user_id,
            lender_business_id: lp.business_id,
            match_score: 80, // Default score for fallback
            auto_accept: lp.auto_accept || false,
            interest_rate: lp.interest_rate || 10,
            lender_name: lp.business?.business_name || 'Lender',
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
      return NextResponse.json({ 
        success: false, 
        message: 'No matching lenders found',
        status: 'no_match'
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
            <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎯 You've Been Matched!</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="font-size: 18px; margin-bottom: 20px;">Hi ${lenderName}! 👋</p>
              
              <p>A borrower matches your lending preferences. Here are the details:</p>
              
              <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb;">
                <div style="text-align: center; margin-bottom: 15px;">
                  <p style="color: #6b7280; margin: 0;">Loan Amount</p>
                  <p style="font-size: 32px; font-weight: bold; color: #4f46e5; margin: 5px 0;">${loan.currency} ${loan.amount.toLocaleString()}</p>
                </div>
                <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <div>
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Borrower</p>
                    <p style="margin: 5px 0; font-weight: 500;">${loan.borrower?.full_name || 'Anonymous'}</p>
                  </div>
                  <div>
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Rating</p>
                    <p style="margin: 5px 0; font-weight: 500;">${loan.borrower?.borrower_rating || 'Neutral'}</p>
                  </div>
                  ${loan.recipient_country ? `
                  <div>
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Recipient Country</p>
                    <p style="margin: 5px 0; font-weight: 500;">${loan.recipient_country}</p>
                  </div>
                  ` : ''}
                  ${loan.purpose ? `
                  <div>
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Purpose</p>
                    <p style="margin: 5px 0; font-weight: 500;">${loan.purpose}</p>
                  </div>
                  ` : ''}
                </div>
              </div>
              
              <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #854d0e; font-size: 14px;">
                  <strong>⏰ Time Sensitive:</strong> You have 24 hours to accept or decline this loan. 
                  If you don't respond, it will be offered to the next matching lender.
                </p>
              </div>
              
              <a href="${reviewUrl}" style="display: block; background: #4f46e5; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
                Review & Accept →
              </a>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                💡 Tip: Enable auto-accept in your preferences to automatically fund matching loans.
              </p>
            </div>
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
              Sent via LoanTrack • Simple loan tracking for everyone
            </p>
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
            <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">${isAutoAccept ? '✅ Auto-Accepted!' : '✅ Loan Accepted!'}</h1>
            </div>
            
            <div style="background: #f5f3ff; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #c4b5fd;">
              <p style="font-size: 18px;">Hi ${lenderName}! 👋</p>
              
              <p>${isAutoAccept ? 'Your auto-accept setting matched you with a new loan!' : 'You have successfully accepted a loan request.'}</p>
              
              <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #c4b5fd;">
                <div style="text-align: center; margin-bottom: 15px;">
                  <p style="color: #6b7280; margin: 0;">Loan Amount</p>
                  <p style="font-size: 32px; font-weight: bold; color: #4f46e5; margin: 5px 0;">${loan.currency} ${loan.amount.toLocaleString()}</p>
                  <p style="color: #6b7280; margin: 5px 0;">Interest Rate: ${match.interest_rate}% p.a.</p>
                </div>
                <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
                  <p style="margin: 5px 0;"><strong>Borrower:</strong> ${loan.borrower?.full_name || 'Anonymous'}</p>
                  <p style="margin: 5px 0;"><strong>Purpose:</strong> ${loan.purpose || 'Not specified'}</p>
                </div>
              </div>
              
              <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #854d0e; font-size: 14px;">
                  <strong>💰 Next Step:</strong> Please send <strong>${loan.currency} ${loan.amount.toLocaleString()}</strong> to the borrower via PayPal.
                </p>
              </div>
              
              <a href="${APP_URL}/loans/${loan.id}" style="display: block; background: #4f46e5; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
                View Loan & Send Payment →
              </a>
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
            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">${isAutoAccept ? '⚡ Instant Match!' : '🎉 Loan Accepted!'}</h1>
            </div>
            
            <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0;">
              <p style="font-size: 18px;">Hi ${loan.borrower.full_name || 'there'}! 👋</p>
              
              <p>Great news! Your loan has been ${isAutoAccept ? 'instantly matched and approved' : 'accepted'} by <strong>${lenderName}</strong>.</p>
              
              <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
                <p style="color: #6b7280; margin: 0;">Loan Amount</p>
                <p style="font-size: 32px; font-weight: bold; color: #22c55e; margin: 5px 0;">${loan.currency} ${loan.amount.toLocaleString()}</p>
                <p style="color: #6b7280; margin: 10px 0 0 0;">Interest Rate: ${match.interest_rate}% p.a.</p>
              </div>
              
              <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                  <strong>💰 Next:</strong> The lender will send ${loan.currency} ${loan.amount.toLocaleString()} to your PayPal account. You'll be notified when payment is sent!
                </p>
              </div>
              
              <a href="${APP_URL}/loans/${loan.id}" style="display: block; background: #22c55e; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
                View Your Loan →
              </a>
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
