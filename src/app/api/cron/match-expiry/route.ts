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
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <!-- Header with logo -->
                  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
                    <!-- Logo -->
                    <div style="margin-bottom: 20px;">
                      <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                          alt="Feyza Logo" 
                          style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                    </div>
                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">😔 Unable to Find a Matching Lender</h1>
                  </div>
                  
                  <!-- Content area with green theme -->
                  <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                    <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${loan.borrower.full_name || 'there'},</p>
                    
                    <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                      <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">Loan Request Status</h3>
                      <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                        We were unable to find a lender for your 
                        <strong style="color: #059669;">${loan.currency} ${loan.amount.toLocaleString()}</strong> 
                        loan request.
                      </p>
                      
                      <h4 style="color: #065f46; margin: 25px 0 15px 0; font-weight: 600;">Why this might happen:</h4>
                      <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                        <li style="margin-bottom: 10px; line-height: 1.6; padding-left: 5px;">No lenders matched your criteria at this time</li>
                        <li style="margin-bottom: 10px; line-height: 1.6; padding-left: 5px;">Available lenders didn't respond within the required timeframe</li>
                        <li style="margin-bottom: 10px; line-height: 1.6; padding-left: 5px;">The loan amount or terms didn't match current lender preferences</li>
                        <li style="line-height: 1.6; padding-left: 5px;">Market conditions may have temporarily affected lender availability</li>
                      </ul>
                    </div>
                    
                    <!-- Action section -->
                    <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                      <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">What You Can Do</h3>
                      <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                        You can submit a new loan request with different terms, or try again later when more lenders are available.
                      </p>
                      
                      <!-- CTA Buttons -->
                      <div style="display: flex; gap: 15px; margin-top: 25px; flex-wrap: wrap;">
                        <a href="${APP_URL}/loans/new" 
                          style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                                  color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; 
                                  font-weight: 600; text-align: center; font-size: 16px;
                                  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;
                                  flex: 1; min-width: 200px;"
                          onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                          onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                          Submit New Request →
                        </a>
                        
                        <a href="${APP_URL}/loans" 
                          style="display: inline-block; background: white; 
                                  color: #059669; text-decoration: none; padding: 14px 28px; border-radius: 8px; 
                                  font-weight: 600; text-align: center; font-size: 16px; border: 2px solid #059669;
                                  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1); transition: all 0.2s ease;
                                  flex: 1; min-width: 200px;"
                          onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';this.style.background='#f0fdf4';"
                          onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(5, 150, 105, 0.1)';this.style.background='white';">
                          View My Loans
                        </a>
                      </div>
                    </div>
                    
                    <!-- Tips section -->
                    <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #86efac;">
                      <h4 style="color: #065f46; margin: 0 0 10px 0; font-weight: 600;">💡 Tips for Success:</h4>
                      <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                        <li style="margin-bottom: 8px; font-size: 14px;">Consider adjusting the loan amount or repayment terms</li>
                        <li style="margin-bottom: 8px; font-size: 14px;">Try during business hours when lenders are most active</li>
                        <li style="font-size: 14px;">Ensure your profile information is complete and up-to-date</li>
                      </ul>
                    </div>
                    
                    <!-- Footer -->
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                      <p style="margin: 0 0 10px 0;">Need assistance with your loan request?</p>
                      <p style="margin: 0;">
                        <a href="${APP_URL}/help/loan-requests" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
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
                    <p style="margin: 0;">Feyza • Automated Loan Matching System</p>
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
          <!DOCTYPE html>
          <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <!-- Header with gradient background and logo -->
              <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
                <!-- Logo -->
                <div style="margin-bottom: 15px;">
                  <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                      alt="Feyza Logo" 
                      style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                </div>
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">⚡ Loan Matched!</h1>
                <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">Your request has been connected with a lender</p>
              </div>
              
              <!-- Content area -->
              <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                <p style="font-size: 18px; color: #166534; margin-bottom: 10px;">Hi ${loan.borrower.full_name || 'there'}! 👋</p>
                <p style="color: #166534; line-height: 1.6; margin-bottom: 25px;">
                  Great news! Your loan has been successfully matched with 
                  <strong style="color: #059669; font-weight: 600;">${lenderName}</strong>.
                </p>
                
                <!-- Loan details card -->
                <div style="background: white; padding: 30px; border-radius: 16px; margin: 25px 0; border: 1px solid #bbf7d0; text-align: center; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.1);">
                  <div style="margin-bottom: 20px;">
                    <div style="display: inline-block; background: #dcfce7; padding: 10px 20px; border-radius: 50px; margin-bottom: 15px;">
                      <span style="color: #059669; font-weight: 600; font-size: 14px;">MATCHED</span>
                    </div>
                    <p style="color: #065f46; margin: 5px 0; font-size: 14px;">Connected with: <strong>${lenderName}</strong></p>
                  </div>
                  
                  <div style="margin: 25px 0;">
                    <p style="color: #6b7280; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Loan Amount</p>
                    <p style="font-size: 42px; font-weight: 700; color: #059669; margin: 10px 0; line-height: 1;">
                      ${loan.currency} ${loan.amount.toLocaleString()}
                    </p>
                  </div>
                  
                  <div style="display: flex; justify-content: center; gap: 30px; margin-top: 30px; flex-wrap: wrap;">
                    <div style="text-align: center;">
                      <div style="background: #f0fdf4; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; border: 2px solid #059669;">
                        <span style="color: #059669; font-size: 20px;">📋</span>
                      </div>
                      <p style="color: #065f46; margin: 0; font-size: 14px; font-weight: 600;">Review Details</p>
                    </div>
                    
                    <div style="text-align: center;">
                      <div style="background: #f0fdf4; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; border: 2px solid #059669;">
                        <span style="color: #059669; font-size: 20px;">🤝</span>
                      </div>
                      <p style="color: #065f46; margin: 0; font-size: 14px; font-weight: 600;">Connect with Lender</p>
                    </div>
                    
                    <div style="text-align: center;">
                      <div style="background: #f0fdf4; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; border: 2px solid #059669;">
                        <span style="color: #059669; font-size: 20px;">📄</span>
                      </div>
                      <p style="color: #065f46; margin: 0; font-size: 14px; font-weight: 600;">Next Steps</p>
                    </div>
                  </div>
                </div>
                
                <!-- CTA Button -->
                <a href="${APP_URL}/loans/${loan.id}" 
                  style="display: block; background: linear-gradient(to right, #059669, #047857); 
                          color: white; text-decoration: none; padding: 18px 32px; border-radius: 10px; 
                          font-weight: 600; text-align: center; margin: 30px 0; font-size: 18px;
                          box-shadow: 0 6px 16px rgba(5, 150, 105, 0.25); transition: all 0.3s ease;"
                  onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 10px 25px rgba(5, 150, 105, 0.35)';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.25)';">
                  View Your Loan Details →
                </a>
                
                <!-- Next steps -->
                <div style="background: #dcfce7; padding: 20px; border-radius: 10px; margin: 25px 0; border: 1px solid #86efac;">
                  <h4 style="color: #065f46; margin: 0 0 15px 0; font-weight: 600; font-size: 16px;">📋 What happens next:</h4>
                  <ol style="margin: 0; padding-left: 20px; color: #065f46;">
                    <li style="margin-bottom: 10px; line-height: 1.5;">Review the loan terms and lender details</li>
                    <li style="margin-bottom: 10px; line-height: 1.5;">Communicate with ${lenderName} to finalize arrangements</li>
                    <li style="line-height: 1.5;">Complete any required documentation</li>
                  </ol>
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                  <p style="margin: 0 0 10px 0;">Need help with your matched loan?</p>
                  <p style="margin: 0;">
                    <a href="${APP_URL}/help/matched-loans" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                      View Help Guide
                    </a>
                    <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                      Contact Support
                    </a>
                  </p>
                </div>
              </div>
              
              <!-- Signature -->
              <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">Feyza • Smart Loan Matching Platform</p>
                <p style="margin: 5px 0 0 0; font-size: 11px; color: #9ca3af;">This is an automated message. Please do not reply directly.</p>
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
      subject: `🎯 New Loan Available: ${loan.currency} ${loan.amount.toLocaleString()}`,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header with logo and gradient -->
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <!-- Logo -->
              <div style="margin-bottom: 15px;">
                <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                    alt="Feyza Logo" 
                    style="height: 40px; width: auto; filter: brightness(0) invert(1);">
              </div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎯 Loan Match Available!</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">A new opportunity awaits</p>
            </div>
            
            <!-- Main content -->
            <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
              <p style="font-size: 18px; color: #166534; margin-bottom: 15px;">Hi ${lenderName}! 👋</p>
              
              <p style="color: #166534; line-height: 1.6; margin-bottom: 25px;">
                A loan that matches your preferences is now available <strong style="color: #059669;">(the previous lender didn't respond)</strong>.
              </p>
              
              <!-- Loan amount highlight -->
              <div style="background: white; padding: 30px; border-radius: 12px; margin: 25px 0; text-align: center; border: 2px solid #059669; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.1);">
                <p style="font-size: 14px; color: #047857; margin: 0 0 10px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">AVAILABLE LOAN AMOUNT</p>
                <p style="font-size: 48px; font-weight: 700; color: #059669; margin: 0; line-height: 1;">
                  ${loan.currency} ${loan.amount.toLocaleString()}
                </p>
                <div style="height: 4px; width: 60px; background: linear-gradient(to right, #059669, #047857); margin: 15px auto; border-radius: 2px;"></div>
                <p style="color: #065f46; font-size: 14px; margin: 15px 0 0 0;">
                  Matches your lending preferences
                </p>
              </div>
              
              <!-- Urgency notice -->
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 18px; border-radius: 8px; margin: 25px 0; border: 1px solid #fbbf24;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="background: #d97706; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
                    ⏰
                  </div>
                  <div>
                    <h3 style="margin: 0 0 5px 0; color: #92400e; font-size: 16px; font-weight: 600;">Time-Sensitive Opportunity</h3>
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                      You have <strong>24 hours</strong> to review and respond to this loan request.
                    </p>
                  </div>
                </div>
              </div>
              
              <!-- Additional info (optional - could include borrower details if available) -->
              <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0;">
                <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Why this is a great match:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #166534;">
                  <li style="margin-bottom: 8px; line-height: 1.5;">Matches your preferred loan amount range</li>
                  <li style="margin-bottom: 8px; line-height: 1.5;">Fits within your risk tolerance parameters</li>
                  <li style="line-height: 1.5;">Aligns with your selected industry preferences</li>
                </ul>
              </div>
              
              <!-- Primary CTA -->
              <a href="${APP_URL}/lender/matches/${match.id}" 
                style="display: block; background: linear-gradient(to right, #059669, #047857); 
                        color: white; text-decoration: none; padding: 18px 32px; border-radius: 8px; 
                        font-weight: 600; text-align: center; margin: 30px 0; font-size: 18px;
                        box-shadow: 0 6px 16px rgba(5, 150, 105, 0.25); transition: all 0.2s ease;"
                onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 20px rgba(5, 150, 105, 0.35)';"
                onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.25)';">
                Review & Accept Loan Match →
              </a>
              
              <!-- Secondary action -->
              <div style="text-align: center; margin-top: 20px;">
                <p style="color: #047857; font-size: 14px; margin: 0 0 10px 0;">
                  Need to adjust your matching preferences?
                </p>
                <a href="${APP_URL}/lender/preferences" 
                  style="color: #059669; text-decoration: none; font-weight: 500; font-size: 14px;
                          border-bottom: 1px solid #059669;">
                  Update Lender Preferences
                </a>
              </div>
              
              <!-- Footer -->
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                <p style="margin: 0 0 10px 0;">This is an exclusive opportunity based on your matching criteria.</p>
                <p style="margin: 0;">
                  <a href="${APP_URL}/lender/matches" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                    View All Matches
                  </a>
                  <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                    Get Help
                  </a>
                </p>
              </div>
            </div>
            
            <!-- Signature -->
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;">Feyza • Smart Loan Matching • This is an automated notification</p>
            </div>
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
