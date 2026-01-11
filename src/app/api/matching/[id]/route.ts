import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

// POST: Accept or decline a match
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;
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

    // Get the match with loan details
    const { data: match, error: matchError } = await serviceSupabase
      .from('loan_matches')
      .select(`
        *,
        loan:loans(
          *,
          borrower:users!borrower_id(id, email, full_name)
        )
      `)
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Verify the user is the lender for this match
    let isAuthorized = match.lender_user_id === user.id;
    
    if (!isAuthorized && match.lender_business_id) {
      const { data: business } = await supabase
        .from('business_profiles')
        .select('user_id')
        .eq('id', match.lender_business_id)
        .single();
      isAuthorized = business?.user_id === user.id;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check if match is still pending
    if (match.status !== 'pending') {
      return NextResponse.json({ 
        error: `Match already ${match.status}`,
        status: match.status 
      }, { status: 400 });
    }

    // Check if match has expired
    if (new Date(match.expires_at) < new Date()) {
      await serviceSupabase
        .from('loan_matches')
        .update({ status: 'expired' })
        .eq('id', matchId);
      return NextResponse.json({ error: 'Match has expired' }, { status: 400 });
    }

    const loan = match.loan;

    if (action === 'accept') {
      // ACCEPT: Assign the loan to this lender
      
      // Get lender info and preferences
      let lenderName = 'Lender';
      let lenderEmail: string | null = null;
      let interestRate = 10;
      
      if (match.lender_user_id) {
        const { data: prefs } = await serviceSupabase
          .from('lender_preferences')
          .select('interest_rate')
          .eq('user_id', match.lender_user_id)
          .single();
        const { data: lenderUser } = await serviceSupabase
          .from('users')
          .select('full_name, email')
          .eq('id', match.lender_user_id)
          .single();
        interestRate = prefs?.interest_rate || 10;
        lenderName = lenderUser?.full_name || 'Lender';
        lenderEmail = lenderUser?.email || null;
      } else if (match.lender_business_id) {
        const { data: prefs } = await serviceSupabase
          .from('lender_preferences')
          .select('interest_rate')
          .eq('business_id', match.lender_business_id)
          .single();
        const { data: business } = await serviceSupabase
          .from('business_profiles')
          .select('business_name, contact_email')
          .eq('id', match.lender_business_id)
          .single();
        interestRate = prefs?.interest_rate || 10;
        lenderName = business?.business_name || 'Lender';
        lenderEmail = business?.contact_email || null;
      }

      // Calculate interest based on lender's rate
      const loanAmount = loan.amount || 0;
      const totalInstallments = loan.total_installments || 1;
      const repaymentFrequency = loan.repayment_frequency || 'monthly';
      
      let weeksPerPeriod = 4;
      if (repaymentFrequency === 'weekly') weeksPerPeriod = 1;
      else if (repaymentFrequency === 'biweekly') weeksPerPeriod = 2;
      else if (repaymentFrequency === 'monthly') weeksPerPeriod = 4;
      
      const totalWeeks = totalInstallments * weeksPerPeriod;
      const loanTermYears = totalWeeks / 52;
      
      const totalInterest = Math.round((loanAmount * (interestRate / 100) * loanTermYears) * 100) / 100;
      const totalAmount = Math.round((loanAmount + totalInterest) * 100) / 100;
      const repaymentAmount = Math.round((totalAmount / totalInstallments) * 100) / 100;

      // Simple flow: Loan is active, lender will send PayPal payment to borrower
      const loanUpdate: any = {
        status: 'active',
        match_status: 'matched',
        matched_at: new Date().toISOString(),
        interest_rate: interestRate,
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
        loanUpdate.lender_id = match.lender_user_id;
      } else if (match.lender_business_id) {
        loanUpdate.business_lender_id = match.lender_business_id;
      }

      await serviceSupabase
        .from('loans')
        .update(loanUpdate)
        .eq('id', loan.id);

      // Update payment schedule with new amounts
      if (totalInstallments > 0) {
        const principalPerPayment = Math.round((loanAmount / totalInstallments) * 100) / 100;
        const interestPerPayment = Math.round((totalInterest / totalInstallments) * 100) / 100;
        
        const { data: scheduleItems } = await serviceSupabase
          .from('payment_schedule')
          .select('id')
          .eq('loan_id', loan.id)
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
        .eq('loan_id', loan.id)
        .neq('id', matchId)
        .eq('status', 'pending');

      // Update lender preferences
      const prefField = match.lender_user_id ? 'user_id' : 'business_id';
      const prefValue = match.lender_user_id || match.lender_business_id;

      const { data: prefs } = await serviceSupabase
        .from('lender_preferences')
        .select('capital_reserved, total_loans_funded, total_amount_funded')
        .eq(prefField, prefValue)
        .single();

      if (prefs) {
        await serviceSupabase
          .from('lender_preferences')
          .update({
            capital_reserved: (prefs.capital_reserved || 0) + loan.amount,
            total_loans_funded: (prefs.total_loans_funded || 0) + 1,
            total_amount_funded: (prefs.total_amount_funded || 0) + loan.amount,
            last_loan_assigned_at: new Date().toISOString(),
          })
          .eq(prefField, prefValue);
      }

      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      // Email to LENDER (confirmation)
      if (lenderEmail) {
        await sendEmail({
          to: lenderEmail,
          subject: '✅ You Accepted a Loan!',
          html: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0;">✅ Loan Accepted!</h1>
                </div>
                <div style="background: #f5f3ff; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #c4b5fd;">
                  <p style="font-size: 18px;">Hi ${lenderName}! 👋</p>
                  <p>You have successfully accepted a loan request.</p>
                  
                  <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #c4b5fd;">
                    <div style="text-align: center; margin-bottom: 15px;">
                      <p style="color: #6b7280; margin: 0;">Loan Amount</p>
                      <p style="font-size: 32px; font-weight: bold; color: #4f46e5; margin: 5px 0;">${loan.currency} ${loanAmount.toLocaleString()}</p>
                      <p style="color: #6b7280; margin: 5px 0;">Interest Rate: ${interestRate}% p.a.</p>
                      <p style="color: #6b7280; margin: 5px 0;">Total Repayment: ${loan.currency} ${totalAmount.toLocaleString()}</p>
                    </div>
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
                      <p style="margin: 5px 0;"><strong>Borrower:</strong> ${loan.borrower?.full_name || 'Anonymous'}</p>
                      <p style="margin: 5px 0;"><strong>Purpose:</strong> ${loan.purpose || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0; color: #854d0e; font-size: 14px;">
                      <strong>💰 Next Step:</strong> Please send <strong>${loan.currency} ${loanAmount.toLocaleString()}</strong> to the borrower via PayPal.
                    </p>
                  </div>
                  
                  <a href="${APP_URL}/loans/${loan.id}" style="display: block; background: #4f46e5; color: white; text-decoration: none; padding: 16px; border-radius: 8px; text-align: center;">
                    View Loan & Send Payment →
                  </a>
                </div>
              </body>
            </html>
          `,
        });
      }

      // Email to BORROWER
      if (loan.borrower?.email) {
        await sendEmail({
          to: loan.borrower.email,
          subject: '🎉 Your Loan Has Been Accepted!',
          html: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0;">🎉 Loan Accepted!</h1>
                </div>
                <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0;">
                  <p>Hi ${loan.borrower.full_name || 'there'}!</p>
                  <p>Great news! <strong>${lenderName}</strong> has accepted your loan request.</p>
                  <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
                    <p style="color: #6b7280; margin: 0;">Loan Amount</p>
                    <p style="font-size: 32px; font-weight: bold; color: #22c55e; margin: 5px 0;">${loan.currency} ${loanAmount.toLocaleString()}</p>
                    <p style="color: #6b7280; margin: 5px 0;">Interest Rate: ${interestRate}% p.a.</p>
                    <p style="color: #6b7280; margin: 5px 0;">Total Repayment: ${loan.currency} ${totalAmount.toLocaleString()}</p>
                  </div>
                  <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0; color: #1e40af; font-size: 14px;">
                      <strong>💰 Next:</strong> The lender will send ${loan.currency} ${loanAmount.toLocaleString()} to your PayPal account. You'll be notified when payment is sent!
                    </p>
                  </div>
                  <a href="${APP_URL}/loans/${loan.id}" style="display: block; background: #22c55e; color: white; text-decoration: none; padding: 16px; border-radius: 8px; text-align: center;">
                    View Your Loan →
                  </a>
                </div>
              </body>
            </html>
          `,
        });
      }

      // Create notification
      await serviceSupabase.from('notifications').insert({
        user_id: loan.borrower_id,
        loan_id: loan.id,
        type: 'loan_accepted',
        title: 'Loan Accepted! 🎉',
        message: `${lenderName} has accepted your loan request for ${loan.currency} ${loan.amount}.`,
      });

      return NextResponse.json({
        success: true,
        action: 'accepted',
        loan_id: loan.id,
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
      const prefField = match.lender_user_id ? 'user_id' : 'business_id';
      const prefValue = match.lender_user_id || match.lender_business_id;

      // Find next pending match
      const { data: nextMatch } = await serviceSupabase
        .from('loan_matches')
        .select('*')
        .eq('loan_id', loan.id)
        .eq('status', 'pending')
        .order('match_rank', { ascending: true })
        .limit(1)
        .single();

      if (nextMatch) {
        // Notify next lender
        await notifyNextLender(serviceSupabase, loan, nextMatch);

        // Update loan with new current match
        await serviceSupabase
          .from('loans')
          .update({ current_match_id: nextMatch.id })
          .eq('id', loan.id);

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
          .eq('id', loan.id);

        // Notify borrower
        if (loan.borrower?.email) {
          await sendEmail({
            to: loan.borrower.email,
            subject: '😔 No Matching Lenders Available',
            html: `
              <body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #fef9c3; padding: 30px; border-radius: 16px; border: 1px solid #fde047;">
                  <h2 style="color: #854d0e;">No Matching Lenders</h2>
                  <p>Hi ${loan.borrower.full_name || 'there'},</p>
                  <p>Unfortunately, we couldn't find a lender for your ${loan.currency} ${loan.amount} loan request at this time.</p>
                  <p>You can try again later or adjust your loan terms.</p>
                </div>
              </body>
            `,
          });
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
    console.error('Error processing match response:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper: Notify next lender in queue
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

  if (lenderEmail) {
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await sendEmail({
      to: lenderEmail,
      subject: `🎯 New Loan Match: ${loan.currency} ${loan.amount}`,
      html: `
        <body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">🎯 You've Been Matched!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb;">
            <p>Hi ${lenderName}!</p>
            <p>A loan matching your preferences is now available:</p>
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
              <p style="font-size: 32px; font-weight: bold; color: #4f46e5;">${loan.currency} ${loan.amount.toLocaleString()}</p>
            </div>
            <p style="color: #854d0e; background: #fef9c3; padding: 12px; border-radius: 8px;">
              ⏰ You have 24 hours to respond before it's offered to another lender.
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
      title: '🎯 New Loan Match!',
      message: `A ${loan.currency} ${loan.amount} loan is now available. You have 24h to respond.`,
    });
  }
}

// GET: Get match details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: matchId } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = await createServiceRoleClient();

    const { data: match, error } = await serviceSupabase
      .from('loan_matches')
      .select(`
        *,
        loan:loans(
          *,
          borrower:users!borrower_id(
            id, 
            full_name, 
            borrower_rating, 
            verification_status,
            total_payments_made,
            payments_on_time,
            payments_early
          )
        )
      `)
      .eq('id', matchId)
      .single();

    if (error || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Verify user is the lender
    let isAuthorized = match.lender_user_id === user.id;
    if (!isAuthorized && match.lender_business_id) {
      const { data: business } = await supabase
        .from('business_profiles')
        .select('user_id')
        .eq('id', match.lender_business_id)
        .single();
      isAuthorized = business?.user_id === user.id;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    return NextResponse.json({ match });
  } catch (error) {
    console.error('Error fetching match:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
