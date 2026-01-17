import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

// This endpoint should be called by a cron job every hour
// It handles expired matches and cascades to next lender
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();
    const now = new Date();
    
    let expiredCount = 0;
    let cascadedCount = 0;
    let noMatchCount = 0;

    // Find expired pending matches
    const { data: expiredMatches, error } = await supabase
      .from('loan_matches')
      .select(`
        *,
        loan:loans(
          id,
          amount,
          currency,
          borrower_id,
          match_status,
          borrower:users!borrower_id(email, full_name)
        )
      `)
      .eq('status', 'pending')
      .lt('expires_at', now.toISOString());

    if (error) {
      console.error('Error fetching expired matches:', error);
      return NextResponse.json({ error: 'Failed to fetch expired matches' }, { status: 500 });
    }

    if (!expiredMatches || expiredMatches.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired matches to process',
        processed: 0,
      });
    }

    // Group by loan_id to process each loan once
    const loanIds = Array.from(new Set(expiredMatches.map(m => m.loan_id)));

    for (const loanId of loanIds) {
      const loanMatches = expiredMatches.filter(m => m.loan_id === loanId);
      const loan = loanMatches[0]?.loan;

      if (!loan || loan.match_status === 'matched') continue;

      // Mark all expired matches for this loan as expired
      const expiredMatchIds = loanMatches.map(m => m.id);
      await supabase
        .from('loan_matches')
        .update({ status: 'expired' })
        .in('id', expiredMatchIds);

      expiredCount += expiredMatchIds.length;

      // Update lender stats (decrease acceptance rate for non-response)
      for (const match of loanMatches) {
        const prefField = match.lender_user_id ? 'user_id' : 'business_id';
        const prefValue = match.lender_user_id || match.lender_business_id;

        const { data: prefs } = await supabase
          .from('lender_preferences')
          .select('acceptance_rate, total_loans_funded')
          .eq(prefField, prefValue)
          .single();

        if (prefs) {
          // Decrease acceptance rate by considering no-response as decline
          const totalOffered = (prefs.total_loans_funded || 0) + 1;
          const newRate = ((prefs.acceptance_rate || 100) * (prefs.total_loans_funded || 0)) / totalOffered;
          
          await supabase
            .from('lender_preferences')
            .update({ acceptance_rate: Math.max(0, newRate) })
            .eq(prefField, prefValue);
        }
      }

      // Find next pending match for this loan
      const { data: nextMatch } = await supabase
        .from('loan_matches')
        .select('*')
        .eq('loan_id', loanId)
        .eq('status', 'pending')
        .order('match_rank', { ascending: true })
        .limit(1)
        .single();

      if (nextMatch) {
        // Cascade to next lender
        await notifyNextLender(supabase, loan, nextMatch);

        // Update loan with new current match
        await supabase
          .from('loans')
          .update({ current_match_id: nextMatch.id })
          .eq('id', loanId);

        cascadedCount++;
      } else {
        // No more lenders available
        await supabase
          .from('loans')
          .update({
            match_status: 'no_match',
            current_match_id: null,
          })
          .eq('id', loanId);

        // Notify borrower
        if (loan.borrower?.email) {
          const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          await sendEmail({
            to: loan.borrower.email,
            subject: '😔 Unable to Find a Matching Lender',
            html: `
              <!DOCTYPE html>
              <html>
                <body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: #fef9c3; padding: 30px; border-radius: 16px; border: 1px solid #fde047;">
                    <h2 style="color: #854d0e; margin-top: 0;">Unable to Find a Lender</h2>
                    <p>Hi ${loan.borrower.full_name || 'there'},</p>
                    <p>We were unable to find a lender for your ${loan.currency} ${loan.amount.toLocaleString()} loan request.</p>
                    <p>This could happen if:</p>
                    <ul>
                      <li>No lenders matched your criteria</li>
                      <li>Available lenders didn't respond in time</li>
                      <li>The loan amount or terms didn't match lender preferences</li>
                    </ul>
                    <p>You can submit a new loan request with different terms, or try again later when more lenders are available.</p>
                    <a href="${APP_URL}/loans/new" style="display: inline-block; background: #854d0e; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 15px;">
                      Submit New Request
                    </a>
                  </div>
                </body>
              </html>
            `,
          });
        }

        // Create notification
        await supabase.from('notifications').insert({
          user_id: loan.borrower_id,
          loan_id: loanId,
          type: 'no_match',
          title: 'Unable to Find a Lender',
          message: `We couldn't find a matching lender for your ${loan.currency} ${loan.amount} loan request.`,
        });

        noMatchCount++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      expiredMatches: expiredCount,
      cascadedToNextLender: cascadedCount,
      noMatchLoans: noMatchCount,
    });
  } catch (error) {
    console.error('Error processing expired matches:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper: Notify next lender
async function notifyNextLender(supabase: any, loan: any, match: any) {
  let lenderEmail: string | null = null;
  let lenderName = 'Lender';

  if (match.lender_user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', match.lender_user_id)
      .single();
    lenderEmail = user?.email;
    lenderName = user?.full_name || 'Lender';
  } else if (match.lender_business_id) {
    const { data: business } = await supabase
      .from('business_profiles')
      .select('contact_email, business_name')
      .eq('id', match.lender_business_id)
      .single();
    lenderEmail = business?.contact_email;
    lenderName = business?.business_name || 'Lender';
  }

  // Check if lender has auto-accept
  const prefField = match.lender_user_id ? 'user_id' : 'business_id';
  const prefValue = match.lender_user_id || match.lender_business_id;

  const { data: prefs } = await supabase
    .from('lender_preferences')
    .select('auto_accept, interest_rate')
    .eq(prefField, prefValue)
    .single();

  if (prefs?.auto_accept) {
    // Auto-accept this loan
    const loanUpdate: any = {
      status: 'active',
      match_status: 'matched',
      matched_at: new Date().toISOString(),
      interest_rate: prefs.interest_rate,
    };

    if (match.lender_user_id) {
      loanUpdate.lender_id = match.lender_user_id;
    } else {
      loanUpdate.business_lender_id = match.lender_business_id;
    }

    await supabase
      .from('loans')
      .update(loanUpdate)
      .eq('id', loan.id);

    await supabase
      .from('loan_matches')
      .update({
        status: 'auto_accepted',
        was_auto_accepted: true,
        responded_at: new Date().toISOString(),
      })
      .eq('id', match.id);

    // Notify borrower of auto-match
    if (loan.borrower?.email) {
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await sendEmail({
        to: loan.borrower.email,
        subject: '⚡ Loan Matched with New Lender!',
        html: `
          <body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">⚡ New Lender Match!</h1>
            </div>
            <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0;">
              <p>Hi ${loan.borrower.full_name || 'there'}!</p>
              <p>Your loan has been matched with <strong>${lenderName}</strong>!</p>
              <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #22c55e;">${loan.currency} ${loan.amount.toLocaleString()}</p>
              </div>
              <a href="${APP_URL}/loans/${loan.id}" style="display: block; background: #22c55e; color: white; text-decoration: none; padding: 16px; border-radius: 8px; text-align: center;">
                View Your Loan →
              </a>
            </div>
          </body>
        `,
      });
    }

    return;
  }

  // Send notification email to lender
  if (lenderEmail) {
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await sendEmail({
      to: lenderEmail,
      subject: `🎯 New Loan Available: ${loan.currency} ${loan.amount.toLocaleString()}`,
      html: `
        <body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">🎯 Loan Match Available!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb;">
            <p>Hi ${lenderName}!</p>
            <p>A loan that matches your preferences is now available (the previous lender didn't respond).</p>
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
              <p style="font-size: 32px; font-weight: bold; color: #4f46e5;">${loan.currency} ${loan.amount.toLocaleString()}</p>
            </div>
            <p style="color: #854d0e; background: #fef9c3; padding: 12px; border-radius: 8px;">
              ⏰ You have 24 hours to respond.
            </p>
            <a href="${APP_URL}/lender/matches/${match.id}" style="display: block; background: #4f46e5; color: white; text-decoration: none; padding: 16px; border-radius: 8px; text-align: center; margin-top: 20px;">
              Review & Accept →
            </a>
          </div>
        </body>
      `,
    });
  }

  // In-app notification
  if (match.lender_user_id) {
    await supabase.from('notifications').insert({
      user_id: match.lender_user_id,
      loan_id: loan.id,
      type: 'loan_match_offer',
      title: '🎯 Loan Match Available!',
      message: `A ${loan.currency} ${loan.amount.toLocaleString()} loan is now available. You have 24h to respond.`,
    });
  }
}

// GET endpoint for status check
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Match expiry cron endpoint. POST to process expired matches.',
  });
}
