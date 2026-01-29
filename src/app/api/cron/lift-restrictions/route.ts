import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Restriction Lifter Cron Job
 * 
 * This cron job:
 * 1. Finds borrowers whose 90-day restriction has ended
 * 2. Unblocks them and resets their rating to "neutral" (starter)
 * 3. Notifies them that they can request loans again
 * 
 * Run daily via cron: 0 7 * * * (7 AM daily)
 */
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
    
    const results = {
      restrictionsLifted: 0,
      notificationsSent: 0,
      errors: [] as string[],
    };

    // ============================================
    // 1. FIND BORROWERS WITH ENDED RESTRICTIONS
    // ============================================
    
    const { data: borrowersToUnblock, error: fetchError } = await supabase
      .from('users')
      .select('id, email, full_name, restriction_ends_at, default_count')
      .eq('is_blocked', true)
      .not('restriction_ends_at', 'is', null)
      .lte('restriction_ends_at', now.toISOString());

    if (fetchError) {
      console.error('[RestrictionLifter] Error fetching borrowers:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch borrowers' }, { status: 500 });
    }

    console.log(`[RestrictionLifter] Found ${borrowersToUnblock?.length || 0} borrowers to unblock`);

    // ============================================
    // 2. PROCESS EACH BORROWER
    // ============================================
    
    for (const borrower of borrowersToUnblock || []) {
      try {
        console.log(`[RestrictionLifter] Unblocking borrower ${borrower.id} (${borrower.full_name})`);
        
        // Unblock the borrower and reset to starter
        await supabase
          .from('users')
          .update({
            is_blocked: false,
            borrower_rating: 'neutral', // Back to starter
            // Keep the history fields for reference
            // blocked_at, blocked_reason, debt_cleared_at stay as-is
          })
          .eq('id', borrower.id);

        // Update the borrower_blocks record
        await supabase
          .from('borrower_blocks')
          .update({
            restriction_lifted_at: now.toISOString(),
            status: 'restriction_ended',
          })
          .eq('user_id', borrower.id)
          .eq('status', 'debt_cleared');

        // Create notification
        await supabase.from('notifications').insert({
          user_id: borrower.id,
          type: 'restriction_lifted',
          title: '🎉 Account Restriction Lifted',
          message: 'Your 90-day restriction period has ended. You can now request loans again as a Starter borrower.',
        });

        // Send email
        if (borrower.email) {
          await sendEmail({
            to: borrower.email,
            subject: 'Your Feyza Account Restriction Has Been Lifted',
            html: getRestrictionLiftedEmail(borrower.full_name, borrower.default_count || 1),
          });
          results.notificationsSent++;
        }

        results.restrictionsLifted++;
        
      } catch (err: any) {
        console.error(`[RestrictionLifter] Error unblocking ${borrower.id}:`, err);
        results.errors.push(`Failed to unblock ${borrower.id}: ${err.message}`);
      }
    }

    console.log('[RestrictionLifter] Completed:', results);
    
    return NextResponse.json({
      success: true,
      ...results,
    });
    
  } catch (error) {
    console.error('[RestrictionLifter] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getRestrictionLiftedEmail(name: string, defaultCount: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:40px 20px;">
          <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <tr><td style="background:linear-gradient(135deg,#059669,#047857);padding:30px;text-align:center;">
              <h1 style="margin:0;color:white;font-size:24px;">🎉 Welcome Back!</h1>
            </td></tr>
            <tr><td style="padding:30px;">
              <p style="font-size:16px;color:#374151;">Hi ${name},</p>
              <p style="font-size:16px;color:#374151;">Great news! Your 90-day restriction period has ended, and your account has been fully restored.</p>
              
              <div style="background:#d1fae5;border:1px solid #059669;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
                <p style="margin:0;font-size:18px;color:#047857;font-weight:bold;">✅ You can now request loans again</p>
              </div>
              
              <h3 style="color:#374151;margin:20px 0 10px;">Your account status:</h3>
              <ul style="color:#374151;font-size:14px;line-height:1.8;">
                <li>Rating: <strong>Starter (Neutral)</strong></li>
                <li>Loan requests: <strong>Enabled</strong></li>
                <li>Previous defaults: ${defaultCount}</li>
              </ul>
              
              <p style="font-size:16px;color:#374151;">You're starting fresh! Make your payments on time to build your rating back up and unlock better loan terms.</p>
              
              <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:20px 0;">
                <p style="margin:0;font-size:14px;color:#92400e;">
                  <strong>💡 Tip:</strong> Consistent on-time payments will help you progress from Neutral → Good → Great rating, unlocking lower interest rates and higher loan amounts.
                </p>
              </div>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center" style="padding:20px 0;">
                  <a href="${APP_URL}/loans/new" style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">Request a Loan</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

// GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
