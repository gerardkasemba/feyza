import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Define types for the nested data structure
type BusinessProfile = {
  id: string;
  business_name: string;
  contact_email: string;
  user_id: string;
};

type UserProfile = {
  id: string;
  full_name: string;
  email: string;
};

type Borrower = {
  full_name: string;
};

type Loan = {
  id: any;
  amount: any;
  currency: any;
  purpose?: any;
  created_at: any;
  loan_type_id: any;
  borrower: Borrower[] | null; // Changed to array since Supabase returns arrays
};

type LenderPreference = {
  id: string;
  user_id: string;
  business_id: string;
  is_active: boolean;
  min_amount: number;
  max_amount: number;
  capital_pool: number;
  capital_reserved: number;
  business: BusinessProfile[] | null;
  user: UserProfile[] | null;
};

// This endpoint can be called by a cron job (e.g., daily) to notify lenders
// about pending loans that match their preferences but haven't been matched yet
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();

    // Find loans that are pending and have no lender assigned (waiting for match)
    const { data: pendingLoans, error: loansError } = await supabase
      .from('loans')
      .select(`
        id, amount, currency, purpose, created_at, loan_type_id,
        borrower:users!borrower_id(full_name)
      `)
      .eq('status', 'pending')
      .is('lender_id', null)
      .is('business_lender_id', null)
      .or('match_status.is.null,match_status.eq.no_match,match_status.eq.matching')
      .order('created_at', { ascending: false })
      .limit(50);

    if (loansError) {
      console.error('[NotifyLenders] Error fetching pending loans:', loansError);
      return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
    }

    if (!pendingLoans || pendingLoans.length === 0) {
      return NextResponse.json({ message: 'No pending loans to notify about', notified: 0 });
    }

    console.log(`[NotifyLenders] Found ${pendingLoans.length} pending loans`);

    // Find active lenders who might be interested
    const { data: lenders, error: lendersError } = await supabase
      .from('lender_preferences')
      .select(`
        id, user_id, business_id, is_active, min_amount, max_amount, capital_pool, capital_reserved,
        business:business_profiles!business_id(id, business_name, contact_email, user_id),
        user:users!user_id(id, full_name, email)
      `)
      .eq('is_active', true);

    if (lendersError) {
      console.error('[NotifyLenders] Error fetching lenders:', lendersError);
      return NextResponse.json({ error: 'Failed to fetch lenders' }, { status: 500 });
    }

    if (!lenders || lenders.length === 0) {
      return NextResponse.json({ message: 'No active lenders to notify', notified: 0 });
    }

    console.log(`[NotifyLenders] Found ${lenders.length} active lenders`);

    // For each lender, find matching loans and send a summary email
    let notifiedCount = 0;

    for (const lender of lenders as unknown as LenderPreference[]) {
      // Safely access nested properties with array access
      const business = lender.business?.[0];
      const user = lender.user?.[0];
      
      const lenderEmail = business?.contact_email || user?.email;
      const lenderName = business?.business_name || user?.full_name || 'Lender';
      const availableCapital = (lender.capital_pool || 0) - (lender.capital_reserved || 0);

      if (!lenderEmail) continue;

      // Filter loans that match this lender's criteria
      const matchingLoans = (pendingLoans as unknown as Loan[]).filter(loan => {
        if (loan.amount < lender.min_amount || loan.amount > lender.max_amount) return false;
        if (loan.amount > availableCapital) return false;
        return true;
      });

      if (matchingLoans.length === 0) continue;

      // Check if we already sent a notification recently (within 24h)
      const { data: recentNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', business?.user_id || lender.user_id)
        .eq('type', 'pending_loans_digest')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (recentNotif && recentNotif.length > 0) {
        console.log(`[NotifyLenders] Skipping ${lenderName} - already notified recently`);
        continue;
      }

      // Build loan list HTML
      const loanListHtml = matchingLoans.slice(0, 5).map(loan => {
        const borrowerName = loan.borrower?.[0]?.full_name || 'Anonymous';
        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              <strong>${loan.currency} ${loan.amount.toLocaleString()}</strong>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              ${borrowerName}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              ${loan.purpose || 'Not specified'}
            </td>
          </tr>
        `;
      }).join('');

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0; padding:0; background:#f9fafb; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #059669, #047857); padding: 30px; text-align: center;">
                      <img src="https://feyza.app/feyza.png" alt="Feyza" height="40" style="margin-bottom: 15px;">
                      <h1 style="margin: 0; color: white; font-size: 24px;">
                        📋 ${matchingLoans.length} Loan${matchingLoans.length > 1 ? 's' : ''} Waiting for You
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 30px;">
                      <p style="font-size: 16px; color: #374151; margin: 0 0 20px;">
                        Hi ${lenderName}! 👋
                      </p>
                      <p style="font-size: 16px; color: #374151; margin: 0 0 20px;">
                        There are <strong>${matchingLoans.length} loan request${matchingLoans.length > 1 ? 's' : ''}</strong> that match your lending preferences and are waiting for a lender.
                      </p>
                      
                      <!-- Loans Table -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                        <tr style="background: #f3f4f6;">
                          <th style="padding: 12px; text-align: left; font-size: 14px; color: #6b7280;">Amount</th>
                          <th style="padding: 12px; text-align: left; font-size: 14px; color: #6b7280;">Borrower</th>
                          <th style="padding: 12px; text-align: left; font-size: 14px; color: #6b7280;">Purpose</th>
                        </tr>
                        ${loanListHtml}
                      </table>
                      
                      ${matchingLoans.length > 5 ? `<p style="font-size: 14px; color: #6b7280; margin: 0 0 20px;">And ${matchingLoans.length - 5} more...</p>` : ''}
                      
                      <!-- CTA -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${APP_URL}/lender/matches" style="display: inline-block; background: #059669; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                              Review & Accept Loans →
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0; text-align: center;">
                        Your available capital: <strong>USD ${availableCapital.toLocaleString()}</strong>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                        You're receiving this because you have auto-matching enabled on Feyza.
                        <br>
                        <a href="${APP_URL}/lender/preferences" style="color: #059669;">Manage preferences</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      try {
        await sendEmail({
          to: lenderEmail,
          subject: `📋 ${matchingLoans.length} Loan${matchingLoans.length > 1 ? 's' : ''} Waiting for You on Feyza`,
          html: emailHtml,
        });

        // Create a notification record to track that we sent this
        await supabase.from('notifications').insert({
          user_id: business?.user_id || lender.user_id,
          type: 'pending_loans_digest',
          title: `${matchingLoans.length} loans waiting`,
          message: `There are ${matchingLoans.length} loan requests matching your preferences.`,
        });

        notifiedCount++;
        console.log(`[NotifyLenders] Sent digest to ${lenderName} (${lenderEmail}) - ${matchingLoans.length} loans`);
      } catch (emailError) {
        console.error(`[NotifyLenders] Failed to send email to ${lenderEmail}:`, emailError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Notified ${notifiedCount} lenders about pending loans`,
      notified: notifiedCount,
      pendingLoans: pendingLoans.length,
      activeLenders: lenders.length,
    });
  } catch (error) {
    console.error('[NotifyLenders] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint for testing/manual trigger
export async function GET(request: NextRequest) {
  // For manual testing, just redirect to POST
  return POST(request);
}