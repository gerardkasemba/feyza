import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getLoanAcceptedLenderEmail, getLoanAcceptedBorrowerEmail, getNoMatchFoundEmail, getNewMatchForLenderEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
    let lenderPrefs: any = null;
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
    let match: any = null;
    let loan: any = null;
    let matchId: string | null = null;

    const { data: existingMatch, error: matchError } = await serviceSupabase
      .from('loan_matches')
      .select('*')
      .eq('id', id)
      .single();

    if (existingMatch && !matchError) {
      match = existingMatch;
      matchId = match.id;

      // Verify the user is the lender for this match
      let isAuthorized = match.lender_user_id === user.id;
      if (!isAuthorized && match.lender_business_id) {
        isAuthorized = business?.id === match.lender_business_id;
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

      // Get the loan
      const { data: loanData, error: loanError } = await serviceSupabase
        .from('loans')
        .select('*, borrower:users!borrower_id(id, email, full_name)')
        .eq('id', match.loan_id)
        .single();

      if (loanError || !loanData) {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      }
      loan = loanData;

    } else {
      // No match record - ID might be a loan ID
      console.log('[Matching POST] No match found, trying as loan ID:', id);

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

      const availableCapital = (lenderPrefs.capital_pool || 0) - (lenderPrefs.capital_reserved || 0);
      
      if (loan.amount < lenderPrefs.min_amount || loan.amount > lenderPrefs.max_amount) {
        return NextResponse.json({ error: 'Loan amount outside your preferences' }, { status: 403 });
      }

      if (loan.amount > availableCapital) {
        return NextResponse.json({ error: 'Insufficient capital' }, { status: 403 });
      }

      // Check if loan already has a lender
      if (loan.lender_id || loan.business_lender_id) {
        return NextResponse.json({ error: 'Loan already has a lender' }, { status: 400 });
      }

      // Check if lender already declined this loan
      const lenderId = business?.id || user.id;
      const lenderField = business?.id ? 'lender_business_id' : 'lender_user_id';
      
      const { data: existingDecline } = await serviceSupabase
        .from('loan_matches')
        .select('id')
        .eq('loan_id', loan.id)
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
          loan_id: loan.id,
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
        console.error('[Matching POST] Error creating match:', insertError);
        return NextResponse.json({ error: 'Failed to create match record' }, { status: 500 });
      }

      match = newMatch;
      matchId = newMatch.id;
      console.log('[Matching POST] Created new match record:', matchId);
    }

    // Add loan to match object for further processing
    match.loan = loan;

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

      // Calculate interest.
      // DB constraint check_total_interest requires: total_interest = amount * (rate / 100)
      // when uses_apr_calculation = false (flat rate, not annualized APR).
      const loanAmount = loan.amount || 0;
      const totalInstallments = loan.total_installments || 1;
      
      const totalInterest = Math.round(loanAmount * (interestRate / 100) * 100) / 100;
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
        uses_apr_calculation: false, // Satisfies check_total_interest constraint (flat rate)
        lender_signed: true,
        lender_signed_at: new Date().toISOString(),
        funds_sent: false,
      };

      if (match.lender_user_id) {
        loanUpdate.lender_id = match.lender_user_id;
      } else if (match.lender_business_id) {
        loanUpdate.business_lender_id = match.lender_business_id;
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

            // Email to LENDER (confirmation)
      if (lenderEmail) {
        await sendEmail({
          to: lenderEmail,
          subject: 'You Accepted a Loan!',
          html: `
          <!DOCTYPE html>
          <html lang="en">
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
                border-radius: 20px;
                overflow: hidden;
                border: 1px solid #bbf7d0;
              ">

                <!-- HEADER -->
                <div style="
                  background: linear-gradient(135deg, #059669 0%, #047857 100%);
                  padding: 30px;
                  text-align: center;
                ">

                  <!-- LOGO (email-safe center) -->
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

                  <h1 style="color: white; margin: 0; font-size: 26px;">
                    ✅ Loan Accepted!
                  </h1>
                </div>

                <!-- CONTENT -->
                <div style="
                  background: #f0fdf4;
                  padding: 30px;
                ">

                  <p style="font-size: 18px; margin-top: 0;">
                    Hi ${lenderName}! 👋
                  </p>

                  <p>
                    You have successfully accepted a loan request. Below are the details:
                  </p>

                  <!-- LOAN DETAILS -->
                  <div style="
                    background: white;
                    padding: 20px;
                    border-radius: 14px;
                    margin: 20px 0;
                    border: 1px solid #bbf7d0;
                  ">
                    <div style="text-align: center; margin-bottom: 15px;">
                      <p style="color: #6b7280; margin: 0;">Loan Amount</p>
                      <p style="
                        font-size: 32px;
                        font-weight: bold;
                        color: #047857;
                        margin: 6px 0;
                      ">
                        ${loan.currency} ${loanAmount.toLocaleString()}
                      </p>
                      <p style="color: #6b7280; margin: 4px 0;">
                        Interest Rate: ${interestRate}% p.a.
                      </p>
                      <p style="color: #6b7280; margin: 4px 0;">
                        Total Repayment: ${loan.currency} ${totalAmount.toLocaleString()}
                      </p>
                    </div>

                    <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
                      <p style="margin: 6px 0;">
                        <strong>Borrower:</strong> ${loan.borrower?.full_name || 'Anonymous'}
                      </p>
                      <p style="margin: 6px 0;">
                        <strong>Purpose:</strong> ${loan.purpose || 'Not specified'}
                      </p>
                    </div>
                  </div>

                  <!-- NEXT STEP -->
                  <div style="
                    background: #ecfdf5;
                    border: 1px solid #a7f3d0;
                    border-radius: 10px;
                    padding: 16px;
                    margin: 20px 0;
                  ">
                    <p style="
                      margin: 0;
                      color: #065f46;
                      font-size: 14px;
                    ">
                      <strong>💰 Next Step:</strong>
                      Please send
                      <strong>${loan.currency} ${loanAmount.toLocaleString()}</strong>
                      to the borrower via PayPal.
                    </p>
                  </div>

                  <!-- CTA -->
                  <a
                    href="${APP_URL}/loans/${loan.id}"
                    style="
                      display: block;
                      background: linear-gradient(to right, #059669, #047857);
                      color: white;
                      text-decoration: none;
                      padding: 16px;
                      border-radius: 10px;
                      text-align: center;
                      font-weight: 600;
                      margin-top: 10px;
                    "
                  >
                    View Loan & Send Payment →
                  </a>

                </div>

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
          subject: 'Your Loan Has Been Accepted!',
          html: `
          <!DOCTYPE html>
          <html lang="en">
            <body style="
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9fafb;
            ">

              <!-- Card -->
              <div style="
                background: white;
                border-radius: 16px;
                overflow: hidden;
                border: 1px solid #bbf7d0;
              ">

                <!-- Header -->
                <div style="
                  background: linear-gradient(135deg, #059669 0%, #047857 100%);
                  padding: 30px;
                  text-align: center;
                ">

                  <!-- Logo (email-safe centered) -->
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

                  <h1 style="
                    color: white;
                    margin: 0;
                    font-size: 28px;
                    font-weight: 700;
                  ">
                    Loan Accepted
                  </h1>
                </div>

                <!-- Content -->
                <div style="
                  background: #f0fdf4;
                  padding: 30px;
                ">

                  <p style="margin-top: 0;">
                    Hi ${loan.borrower.full_name || 'there'},
                  </p>

                  <p>
                    Great news! <strong>${lenderName}</strong> has accepted your loan request.
                  </p>

                  <!-- Loan Summary -->
                  <div style="
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    margin: 20px 0;
                    text-align: center;
                    border: 1px solid #bbf7d0;
                  ">
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">
                      Loan Amount
                    </p>

                    <p style="
                      font-size: 32px;
                      font-weight: 700;
                      color: #059669;
                      margin: 6px 0;
                    ">
                      ${loan.currency} ${loanAmount.toLocaleString()}
                    </p>

                    <p style="color: #6b7280; margin: 5px 0; font-size: 14px;">
                      Interest Rate: ${interestRate}% p.a.
                    </p>

                    <p style="color: #6b7280; margin: 5px 0; font-size: 14px;">
                      Total Repayment: ${loan.currency} ${totalAmount.toLocaleString()}
                    </p>
                  </div>

                  <!-- Next Steps -->
                  <div style="
                    background: #ecfdf5;
                    border: 1px solid #bbf7d0;
                    border-radius: 8px;
                    padding: 16px;
                    margin: 20px 0;
                  ">
                    <p style="
                      margin: 0;
                      color: #065f46;
                      font-size: 14px;
                    ">
                      <strong>Next step:</strong>
                      The lender will send
                      <strong>${loan.currency} ${loanAmount.toLocaleString()}</strong>
                      to your PayPal account. You’ll be notified once payment is sent.
                    </p>
                  </div>

                  <!-- CTA -->
                  <a
                    href="${APP_URL}/loans/${loan.id}"
                    style="
                      display: block;
                      background: linear-gradient(to right, #059669, #047857);
                      color: white;
                      text-decoration: none;
                      padding: 16px;
                      border-radius: 8px;
                      text-align: center;
                      font-weight: 600;
                      margin-top: 25px;
                    "
                  >
                    View Your Loan →
                  </a>

                </div>

                <!-- Footer -->
                <div style="
                  background: #f9fafb;
                  padding: 20px;
                  text-align: center;
                  border-top: 1px solid #bbf7d0;
                ">
                  <p style="margin: 0; font-size: 12px; color: #6b7280;">
                    This is an automated notification from Feyza.
                  </p>
                </div>

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
            subject: 'No Matching Lenders Available',
            html: `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>No Matching Lenders</title>
            </head>
            <body style="margin:0; padding:0; background-color:#f9fafb; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
                <tr>
                  <td align="center">

                    <!-- Card -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff; border-radius:16px; border:1px solid #e5e7eb; overflow:hidden;">
                      
                      <!-- Header -->
                      <tr>
                        <td style="background:linear-gradient(135deg, #059669 0%, #047857 100%); padding:32px; text-align:center;">
                          <img
                            src="https://feyza.app/feyza.png"
                            alt="Feyza Logo"
                            height="44"
                            style="display:block; height:44px; width:auto; margin:0 auto 12px; border:0; outline:none; text-decoration:none;"
                          />
                          <h2 style="margin:0; color:#ffffff; font-size:22px; font-weight:600;">
                            Loan Update
                          </h2>
                        </td>
                      </tr>

                      <!-- Content -->
                      <tr>
                        <td style="padding:30px; text-align:left; color:#374151;">
                          <p style="margin:0 0 12px 0;">
                            Hi ${loan.borrower.full_name || 'there'},
                          </p>

                          <p style="margin:0 0 16px 0; line-height:1.6;">
                            At the moment, we couldn’t find a lender that matches your
                            <strong>${loan.currency} ${loan.amount.toLocaleString()}</strong>
                            loan request.
                          </p>

                          <p style="margin:0 0 16px 0; line-height:1.6;">
                            This can happen when lenders are temporarily unavailable or
                            when loan terms are outside their current criteria.
                          </p>

                          <!-- Info box -->
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
                            <tr>
                              <td style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:16px;">
                                <p style="margin:0; color:#065f46; font-size:14px;">
                                  You can try again later or adjust your loan amount,
                                  repayment period, or interest preferences to improve
                                  matching.
                                </p>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:0; line-height:1.6;">
                            We’ll continue working to connect borrowers with the right
                            lenders as availability changes.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background:#f9fafb; padding:20px; text-align:center; border-top:1px solid #e5e7eb;">
                          <p style="margin:0; font-size:12px; color:#6b7280;">
                            This message was sent by Feyza
                          </p>
                          <p style="margin:4px 0 0; font-size:12px; color:#9ca3af;">
                            Please do not reply to this email
                          </p>
                        </td>
                      </tr>

                    </table>
                    <!-- End Card -->

                  </td>
                </tr>
              </table>

            </body>
          </html>
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
        await sendEmail({
      to: lenderEmail,
      subject: `New Loan Match: ${loan.currency} ${loan.amount.toLocaleString()}`,
      html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>

    <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:20px;">
            
            <!-- CARD -->
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
              
              <!-- HEADER -->
              <tr>
                <td style="background:#059669;padding:30px 20px;text-align:center;">
                  
                  <!-- LOGO -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding-bottom:15px;">
                        <img
                          src="https://feyza.app/feyza.png"
                          alt="Feyza Logo"
                          height="40"
                          style="display:block;height:40px;width:auto;border:0;outline:none;text-decoration:none;"
                        />
                      </td>
                    </tr>
                  </table>

                  <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">
                    New Loan Match Available
                  </h1>
                </td>
              </tr>

              <!-- CONTENT -->
              <tr>
                <td style="padding:30px;color:#111827;font-size:15px;line-height:1.6;">
                  
                  <p style="margin-top:0;">Hi <strong>${lenderName}</strong>,</p>

                  <p>
                    A loan request that matches your lending preferences has just been submitted.
                  </p>

                  <!-- AMOUNT -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
                    <tr>
                      <td align="center" style="background:#ecfdf5;border:1px solid #bbf7d0;border-radius:12px;padding:20px;">
                        <p style="margin:0;font-size:32px;font-weight:700;color:#065f46;">
                          ${loan.currency} ${loan.amount.toLocaleString()}
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- WARNING -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
                    <tr>
                      <td style="background:#fef9c3;color:#854d0e;padding:14px;border-radius:8px;font-size:14px;">
                        <strong>Time-sensitive:</strong> You have 24 hours to respond before this loan is offered to another lender.
                      </td>
                    </tr>
                  </table>

                  <!-- CTA -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding-top:10px;">
                        <a
                          href="${APP_URL}/lender/matches/${match.id}"
                          style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:16px 28px;border-radius:8px;font-size:16px;font-weight:600;"
                        >
                          Review & Accept Loan
                        </a>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
                  <p style="margin:0;font-size:12px;color:#6b7280;">
                    This notification was sent by Feyza.
                  </p>
                  <p style="margin:5px 0 0;font-size:12px;color:#9ca3af;">
                    Please do not reply to this email.
                  </p>
                </td>
              </tr>

            </table>
            <!-- END CARD -->

          </td>
        </tr>
      </table>
    </body>
    </html>
    `,
    });
  }

  // In-app notification
  if (match.lender_user_id) {
    await supabase.from('notifications').insert({
      user_id: match.lender_user_id,
      loan_id: loan.id,
      type: 'loan_match_offer',
      title: 'New Loan Opportunity',
      message: `A ${loan.currency} ${loan.amount.toLocaleString()} loan request matches your criteria. Review and respond within 24 hours.`,
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
    let lenderPrefs: any = null;
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

    let loan: any = null;
    let borrower: any = null;
    let isFromMatch = false;

    if (match && !matchError) {
      // Found a match record
      isFromMatch = true;
      
      // Verify user is the lender for this match
      let isAuthorized = match.lender_user_id === user.id;
      if (!isAuthorized && match.lender_business_id) {
        isAuthorized = business?.id === match.lender_business_id;
      }

      if (!isAuthorized) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }

      // Fetch the loan
      const { data: loanData, error: loanError } = await serviceSupabase
        .from('loans')
        .select('*')
        .eq('id', match.loan_id)
        .single();

      if (loanError || !loanData) {
        console.error('[Matching GET] Loan not found:', loanError);
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      }
      loan = loanData;

    } else {
      // No match record found - try to find a loan by ID
      console.log('[Matching GET] No match found, trying as loan ID:', id);
      
      const { data: loanData, error: loanError } = await serviceSupabase
        .from('loans')
        .select('*')
        .eq('id', id)
        .single();

      if (loanError || !loanData) {
        console.error('[Matching GET] Loan not found:', loanError);
        return NextResponse.json({ error: 'Match or loan not found' }, { status: 404 });
      }
      loan = loanData;

      // Verify this loan matches lender's preferences
      if (!lenderPrefs || !lenderPrefs.is_active) {
        return NextResponse.json({ error: 'Lender preferences not active' }, { status: 403 });
      }

      const availableCapital = (lenderPrefs.capital_pool || 0) - (lenderPrefs.capital_reserved || 0);
      
      if (loan.amount < lenderPrefs.min_amount || loan.amount > lenderPrefs.max_amount) {
        return NextResponse.json({ error: 'Loan amount outside your preferences' }, { status: 403 });
      }

      if (loan.amount > availableCapital) {
        return NextResponse.json({ error: 'Insufficient capital' }, { status: 403 });
      }

      // Check if loan already has a lender
      if (loan.lender_id || loan.business_lender_id) {
        return NextResponse.json({ error: 'Loan already has a lender' }, { status: 400 });
      }

      // Check if lender already declined this loan
      const lenderId = business?.id || user.id;
      const lenderField = business?.id ? 'lender_business_id' : 'lender_user_id';
      
      const { data: existingDecline } = await serviceSupabase
        .from('loan_matches')
        .select('id')
        .eq('loan_id', loan.id)
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
      .eq('id', loan.borrower_id)
      .single();

    if (borrowerError) {
      console.error('[Matching GET] Borrower fetch error:', borrowerError);
    }

    borrower = borrowerData || {
      id: loan.borrower_id,
      full_name: 'Unknown',
      borrower_rating: 'neutral',
      verification_status: 'unverified',
      total_payments_made: 0,
      payments_on_time: 0,
      payments_early: 0,
    };

    // Combine the data
    const fullMatch = {
      id: match?.id || loan.id,
      loan_id: loan.id,
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
    console.error('Error fetching match:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
