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
            subject: 'Unable to Find a Matching Lender',
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
                <!-- Main Card -->
                <div style="
                  background: #ffffff;
                  border-radius: 20px;
                  border: 1px solid #bbf7d0;
                  overflow: hidden;
                ">

                  <!-- Header -->
                  <div style="
                    background: linear-gradient(135deg, #059669 0%, #047857 100%);
                    padding: 30px 25px;
                    text-align: center;
                  ">
                    <!-- Logo (email-safe centered) -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="padding-bottom: 15px;">
                          <img
                            src="https://feyza.app/feyza.png"
                            alt="Feyza Logo"
                            height="44"
                            style="display:block; height:44px; width:auto; border:0; outline:none; text-decoration:none;"
                          />
                        </td>
                      </tr>
                    </table>

                    <h1 style="
                      color: #ffffff;
                      font-size: 22px;
                      margin: 0;
                      font-weight: 600;
                    ">
                      Loan Update
                    </h1>
                  </div>

                  <!-- Content -->
                  <div style="padding: 30px 25px; color: #374151;">

                    <h2 style="
                      color: #065f46;
                      font-size: 20px;
                      margin-top: 0;
                    ">
                      Unable to Find a Lender
                    </h2>

                    <p>Hi ${loan.borrower.full_name || 'there'},</p>

                    <p>
                      We were unable to find a lender for your
                      <strong>${loan.currency} ${loan.amount.toLocaleString()}</strong>
                      loan request at this time.
                    </p>

                    <p>This can happen if:</p>

                    <ul style="padding-left: 20px; margin: 15px 0;">
                      <li>No lenders matched your criteria</li>
                      <li>Available lenders did not respond in time</li>
                      <li>The loan amount or terms did not align with lender preferences</li>
                    </ul>

                    <p>
                      You can submit a new loan request with adjusted terms, or try again later
                      when more lenders are available on the platform.
                    </p>

                    <!-- CTA -->
                    <div style="text-align: center; margin-top: 25px;">
                      <a
                        href="${APP_URL}/loans/new"
                        style="
                          display: inline-block;
                          background: #059669;
                          color: #ffffff;
                          text-decoration: none;
                          padding: 14px 28px;
                          border-radius: 10px;
                          font-weight: 600;
                          font-size: 15px;
                        "
                      >
                        Submit New Loan Request
                      </a>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div style="
                    background: #f0fdf4;
                    padding: 20px;
                    border-top: 1px solid #bbf7d0;
                    text-align: center;
                    font-size: 12px;
                    color: #065f46;
                  ">
                    <p style="margin: 0 0 6px 0;">
                      This is an automated message from Feyza.
                    </p>
                    <p style="margin: 0;">
                      If you have questions, contact
                      <a href="mailto:support@feyza.com" style="color:#047857; text-decoration:none;">
                        support@feyza.com
                      </a>
                    </p>
                  </div>

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
        subject: 'Loan Matched with New Lender!',
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

          <!-- MAIN CARD -->
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

              <!-- LOGO (EMAIL-SAFE CENTERED) -->
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

              <h1 style="color:white; margin:0; font-size:26px; font-weight:700;">
                ⚡ New Lender Match!
              </h1>
            </div>

            <!-- CONTENT -->
            <div style="
              background:#f0fdf4;
              padding:30px;
              border:1px solid #bbf7d0;
            ">

              <p style="margin:0 0 12px 0; color:#065f46;">
                Hi ${loan.borrower.full_name || 'there'}!
              </p>

              <p style="margin:0 0 20px 0; color:#065f46;">
                Your loan has been matched with <strong>${lenderName}</strong>.
              </p>

              <!-- AMOUNT -->
              <div style="
                background:white;
                padding:20px;
                border-radius:12px;
                margin:20px 0;
                text-align:center;
                border:1px solid #bbf7d0;
              ">
                <p style="
                  font-size:32px;
                  font-weight:bold;
                  color:#059669;
                  margin:0;
                ">
                  ${loan.currency} ${loan.amount.toLocaleString()}
                </p>
              </div>

              <!-- CTA BUTTON -->
              <a
                href="${APP_URL}/loans/${loan.id}"
                style="
                  display:block;
                  background:linear-gradient(to right, #059669, #047857);
                  color:white;
                  text-decoration:none;
                  padding:16px;
                  border-radius:10px;
                  text-align:center;
                  font-weight:600;
                  font-size:16px;
                "
              >
                View Your Loan →
              </a>

            </div>

            <!-- FOOTER -->
            <div style="
              background:#f9fafb;
              padding:20px;
              text-align:center;
              font-size:12px;
              color:#6b7280;
              border-top:1px solid #e5e7eb;
            ">
              <p style="margin:0;">
                This notification was sent by Feyza
              </p>
            </div>

          </div>

        </body>
      </html>
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
      subject: `New Loan Available: ${loan.currency} ${loan.amount.toLocaleString()}`,
      html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>New Loan Available</title>
    </head>

    <body style="margin:0; padding:0; background:#f9fafb; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; padding:20px;">
        <tr>
          <td align="center">

            <!-- MAIN CARD -->
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:white; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.05);">

              <!-- HEADER -->
              <tr>
                <td style="background:linear-gradient(135deg, #059669 0%, #047857 100%); padding:30px; text-align:center;">

                  <!-- LOGO -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding-bottom:15px;">
                        <img
                          src="https://feyza.app/feyza.png"
                          alt="Feyza Logo"
                          height="48"
                          style="display:block; height:48px; width:auto; border:0; outline:none; text-decoration:none;"
                        />
                      </td>
                    </tr>
                  </table>

                  <h1 style="color:white; margin:0; font-size:26px; font-weight:700;">
                    New Loan Match Available
                  </h1>
                </td>
              </tr>

              <!-- CONTENT -->
              <tr>
                <td style="padding:30px; color:#111827; font-size:15px; line-height:1.6;">

                  <p style="margin-top:0;">Hi <strong>${lenderName}</strong>,</p>

                  <p>
                    A loan that matches your lending preferences is now available.
                    The previous lender did not respond within the required timeframe.
                  </p>

                  <!-- AMOUNT -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:25px 0;">
                    <tr>
                      <td align="center" style="background:#ecfdf5; border:1px solid #bbf7d0; padding:20px; border-radius:12px;">
                        <div style="font-size:32px; font-weight:700; color:#065f46;">
                          ${loan.currency} ${loan.amount.toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- TIMER -->
                  <div style="background:#fef9c3; color:#854d0e; padding:12px; border-radius:8px; font-size:14px; margin-bottom:20px;">
                    ⏰ You have <strong>24 hours</strong> to review and respond to this loan request.
                  </div>

                  <!-- CTA -->
                  <a
                    href="${APP_URL}/lender/matches/${match.id}"
                    style="display:block; background:#059669; color:white; text-decoration:none; padding:16px; border-radius:10px; text-align:center; font-weight:600; font-size:16px;"
                  >
                    Review & Accept Loan
                  </a>

                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td style="background:#f9fafb; padding:20px; text-align:center; font-size:12px; color:#6b7280; border-top:1px solid #e5e7eb;">
                  <p style="margin:0;">
                    This is an automated notification from Feyza.
                  </p>
                  <p style="margin:5px 0 0 0;">
                    Please log in to your account to take action.
                  </p>
                </td>
              </tr>

            </table>

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
      title: 'Loan Match Available!',
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
