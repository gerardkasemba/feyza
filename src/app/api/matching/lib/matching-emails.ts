// Email template builders for matching notifications
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email';
import type { SupabaseServiceClient } from '@/lib/supabase/server';

const log = logger('matching-lib-matching-emails');
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/** Minimal match result shape needed for notification emails */
interface MatchResult {
  lenderId?: string;
  lenderName?: string;
  lender_name: string;
  lender_user_id: string | null;
  lender_business_id: string | null;
  interestRate?: number;
  interest_rate?: number;
}

// ============================================================
// EMAIL BUILDERS
// ============================================================

export function buildLenderMatchEmail(params: {
  lenderName: string;
  borrowerName: string;
  borrowerRating?: string;
  amount: number;
  currency: string;
  purpose?: string;
  reviewUrl: string;
  expiresStr: string;
}): string {
  const { lenderName, borrowerName, borrowerRating, amount, currency, purpose, reviewUrl, expiresStr } = params;
  const ratingColors: Record<string, string> = {
    excellent: '#059669', good: '#10b981', neutral: '#6b7280',
    fair: '#f59e0b', poor: '#ef4444',
  };
  const ratingColor = ratingColors[borrowerRating?.toLowerCase() ?? 'neutral'] ?? '#6b7280';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Loan Opportunity – Feyza</title>
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 30px rgba(5,150,105,0.12);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#059669 0%,#047857 60%,#065f46 100%);padding:40px 40px 35px;text-align:center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <img src="https://feyza.app/feyza.png" alt="Feyza" height="44" style="display:block;border:0;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:50px;padding:6px 16px;margin-bottom:16px;">
                      <span style="color:#d1fae5;font-size:13px;font-weight:600;letter-spacing:0.5px;">🎯 LOAN OPPORTUNITY</span>
                    </div>
                    <h1 style="color:#ffffff;margin:0;font-size:30px;font-weight:700;letter-spacing:-0.5px;">New Match Available</h1>
                    <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:16px;">A borrower matches your lending preferences</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- AMOUNT HERO -->
          <tr>
            <td style="background:#f0fdf4;padding:0;border-bottom:1px solid #bbf7d0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:36px 40px;">
                    <p style="margin:0 0 6px;font-size:13px;color:#047857;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Loan Amount</p>
                    <p style="margin:0;font-size:52px;font-weight:800;color:#065f46;letter-spacing:-2px;line-height:1;">${currency} ${amount.toLocaleString()}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BORROWER INFO -->
          <tr>
            <td style="padding:32px 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;padding-right:20px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Borrower</p>
                    <p style="margin:0;font-size:20px;font-weight:700;color:#111827;">${borrowerName}</p>
                    ${purpose ? `<p style="margin:8px 0 0;font-size:14px;color:#6b7280;">Purpose: <span style="color:#374151;font-weight:500;">${purpose}</span></p>` : ''}
                  </td>
                  ${borrowerRating ? `
                  <td style="vertical-align:top;text-align:right;white-space:nowrap;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Rating</p>
                    <span style="display:inline-block;background:${ratingColor}15;color:${ratingColor};border:1px solid ${ratingColor}40;border-radius:8px;padding:4px 14px;font-size:15px;font-weight:700;text-transform:capitalize;">${borrowerRating}</span>
                  </td>
                  ` : ''}
                </tr>
              </table>
            </td>
          </tr>

          <!-- URGENCY BANNER -->
          <tr>
            <td style="padding:0 40px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef9c3;border:1px solid #fde68a;border-radius:12px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:20px;width:32px;vertical-align:middle;">⏰</td>
                        <td style="vertical-align:middle;padding-left:8px;">
                          <p style="margin:0;font-size:14px;font-weight:700;color:#92400e;">Time-Sensitive Opportunity</p>
                          <p style="margin:4px 0 0;font-size:13px;color:#b45309;">This offer expires ${expiresStr}. First lender to accept gets the loan.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 40px;text-align:center;">
              <a href="${reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669,#047857);color:#ffffff;text-decoration:none;padding:18px 48px;border-radius:12px;font-size:17px;font-weight:700;letter-spacing:0.3px;box-shadow:0 6px 20px rgba(5,150,105,0.35);">
                Review &amp; Accept Loan →
              </a>
              <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">
                Or visit: <a href="${reviewUrl}" style="color:#059669;text-decoration:none;">${reviewUrl}</a>
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
                <a href="${APP_URL}/lender/preferences" style="color:#059669;text-decoration:none;font-weight:500;">Manage Preferences</a>
                &nbsp;•&nbsp;
                <a href="mailto:support@feyza.app" style="color:#059669;text-decoration:none;font-weight:500;">Support</a>
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">Feyza · Intelligent Loan Matching · <a href="https://feyza.app" style="color:#9ca3af;text-decoration:none;">feyza.app</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

export function buildBorrowerQueuedEmail(params: {
  borrowerName: string;
  amount: number;
  currency: string;
  matchCount: number;
  loanUrl: string;
}): string {
  const { borrowerName, amount, currency, matchCount, loanUrl } = params;
  const plural = matchCount !== 1;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loan Under Review – Feyza</title>
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 30px rgba(5,150,105,0.12);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#0284c7 0%,#0369a1 60%,#075985 100%);padding:40px 40px 35px;text-align:center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <img src="https://feyza.app/feyza.png" alt="Feyza" height="44" style="display:block;border:0;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:50px;padding:6px 16px;margin-bottom:16px;">
                      <span style="color:#bae6fd;font-size:13px;font-weight:600;letter-spacing:0.5px;">⏳ LOAN STATUS UPDATE</span>
                    </div>
                    <h1 style="color:#ffffff;margin:0;font-size:30px;font-weight:700;letter-spacing:-0.5px;">Your Loan is Under Review</h1>
                    <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:16px;">We've found ${matchCount} matching lender${plural ? 's' : ''} for you</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- AMOUNT -->
          <tr>
            <td style="background:#f0f9ff;padding:0;border-bottom:1px solid #bae6fd;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:36px 40px;">
                    <p style="margin:0 0 6px;font-size:13px;color:#0369a1;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Requested Amount</p>
                    <p style="margin:0;font-size:52px;font-weight:800;color:#0c4a6e;letter-spacing:-2px;line-height:1;">${currency} ${amount.toLocaleString()}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 20px;font-size:17px;color:#111827;">Hi ${borrowerName}! 👋</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
                Great news — we've matched your loan request with <strong style="color:#0284c7;">${matchCount} lender${plural ? 's' : ''}</strong> who fit your needs. 
                ${plural ? 'Each has been notified and the' : 'They have been notified and'} will review your request within the next <strong>24 hours</strong>.
              </p>

              <!-- STEPS -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;margin:0 0 24px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">What happens next</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;">
                                <div style="width:24px;height:24px;background:#059669;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#fff;">1</div>
                              </td>
                              <td style="padding-left:12px;vertical-align:top;">
                                <p style="margin:2px 0 0;font-size:14px;color:#374151;"><strong>Lender reviews</strong> your request (up to 24h)</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;">
                                <div style="width:24px;height:24px;background:#059669;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#fff;">2</div>
                              </td>
                              <td style="padding-left:12px;vertical-align:top;">
                                <p style="margin:2px 0 0;font-size:14px;color:#374151;"><strong>You get notified</strong> the moment someone accepts</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;">
                                <div style="width:24px;height:24px;background:#059669;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#fff;">3</div>
                              </td>
                              <td style="padding-left:12px;vertical-align:top;">
                                <p style="margin:2px 0 0;font-size:14px;color:#374151;"><strong>Funds are sent</strong> to you once the loan is signed</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- TIP -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:14px;color:#065f46;">
                      💡 <strong>Tip:</strong> You can also share your loan request directly with friends or family — personal loans don't need to go through matching.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 40px;text-align:center;">
              <a href="${loanUrl}" style="display:inline-block;background:linear-gradient(135deg,#0284c7,#0369a1);color:#ffffff;text-decoration:none;padding:18px 48px;border-radius:12px;font-size:17px;font-weight:700;letter-spacing:0.3px;box-shadow:0 6px 20px rgba(2,132,199,0.35);">
                Track Your Loan →
              </a>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">Feyza · Intelligent Loan Matching · <a href="https://feyza.app" style="color:#9ca3af;text-decoration:none;">feyza.app</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}



// Helper: Send match confirmation emails (auto-accept or manual accept confirmation)
export async function sendMatchNotifications(supabase: SupabaseServiceClient, loan: Record<string, any>, match: MatchResult, isAutoAccept: boolean) {
  // 1. Lender confirmation email
  let lenderEmail: string | null = null;
  let lenderName = match.lender_name;

  if (match.lender_user_id) {
    const { data: user } = await supabase
      .from('users').select('email, full_name').eq('id', match.lender_user_id).single();
    lenderEmail = user?.email;
    lenderName = user?.full_name || lenderName;
  } else if (match.lender_business_id) {
    const { data: business } = await supabase
      .from('business_profiles').select('contact_email, business_name').eq('id', match.lender_business_id).single();
    lenderEmail = business?.contact_email;
    lenderName = business?.business_name || lenderName;
  }

  if (lenderEmail) {
    await sendEmail({
      to: lenderEmail,
      subject: isAutoAccept
        ? `⚡ Loan Auto-Accepted: ${loan.currency} ${loan.amount.toLocaleString()} — Send Funds Now`
        : `✅ Loan Accepted: ${loan.currency} ${loan.amount.toLocaleString()} — Next Steps`,
      html: buildLenderConfirmationEmail({
        lenderName,
        borrowerName: loan.borrower?.full_name || 'the borrower',
        amount: loan.amount,
        currency: loan.currency,
        interestRate: match.interest_rate ?? 0,
        purpose: loan.purpose,
        loanUrl: `${APP_URL}/loans/${loan.id}`,
        isAutoAccept,
      }),
    }).catch(err => log.error('[Matching] Lender confirmation email failed:', err));
  }

  // 2. Borrower confirmation email
  if (loan.borrower?.email) {
    await sendEmail({
      to: loan.borrower.email,
      subject: isAutoAccept
        ? `⚡ Instantly Matched! Your ${loan.currency} ${loan.amount.toLocaleString()} loan is approved`
        : `🎉 Loan Accepted! ${lenderName} approved your ${loan.currency} ${loan.amount.toLocaleString()} request`,
      html: buildBorrowerMatchedEmail({
        borrowerName: loan.borrower.full_name || 'there',
        lenderName,
        amount: loan.amount,
        currency: loan.currency,
        interestRate: match.interest_rate ?? 0,
        loanUrl: `${APP_URL}/loans/${loan.id}`,
        isAutoAccept,
      }),
    }).catch(err => log.error('[Matching] Borrower confirmation email failed:', err));
  }
}

export function buildLenderConfirmationEmail(params: {
  lenderName: string;
  borrowerName: string;
  amount: number;
  currency: string;
  interestRate: number;
  purpose?: string;
  loanUrl: string;
  isAutoAccept: boolean;
}): string {
  const { lenderName, borrowerName, amount, currency, interestRate, purpose, loanUrl, isAutoAccept } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 30px rgba(5,150,105,0.12);">

        <tr>
          <td style="background:linear-gradient(135deg,#059669 0%,#047857 60%,#065f46 100%);padding:40px;text-align:center;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:20px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="44" style="display:block;border:0;" /></td></tr>
            </table>
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:50px;padding:6px 16px;margin-bottom:16px;">
              <span style="color:#d1fae5;font-size:13px;font-weight:600;">${isAutoAccept ? '⚡ AUTO-ACCEPTED' : '✅ LOAN ACCEPTED'}</span>
            </div>
            <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;">${isAutoAccept ? 'Loan Auto-Matched!' : 'Loan Successfully Accepted!'}</h1>
            <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:15px;">${isAutoAccept ? 'Your auto-accept settings triggered a match' : 'Time to send the funds'}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px 0;">
            <p style="margin:0 0 24px;font-size:17px;color:#111827;">Hi ${lenderName}! 👋</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;">
              <tr>
                <td style="padding:28px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:13px;color:#047857;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Loan Amount</p>
                  <p style="margin:0;font-size:48px;font-weight:800;color:#065f46;letter-spacing:-2px;">${currency} ${amount.toLocaleString()}</p>
                  <p style="margin:10px 0 0;font-size:15px;color:#059669;">at <strong>${interestRate}%</strong> interest per annum</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 28px 28px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #bbf7d0;">
                    <tr>
                      <td style="padding:16px 0 0;">
                        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Borrower</p>
                        <p style="margin:0;font-size:16px;font-weight:600;color:#065f46;">${borrowerName}</p>
                      </td>
                      ${purpose ? `<td style="padding:16px 0 0;text-align:right;">
                        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Purpose</p>
                        <p style="margin:0;font-size:15px;color:#374151;font-weight:500;">${purpose}</p>
                      </td>` : ''}
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef9c3;border:1px solid #fde68a;border-radius:12px;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#92400e;">💰 Action Required</p>
                  <p style="margin:0;font-size:14px;color:#b45309;">Please send <strong>${currency} ${amount.toLocaleString()}</strong> to the borrower to activate this loan. Check their payment details on the loan page.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <a href="${loanUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669,#047857);color:#fff;text-decoration:none;padding:18px 48px;border-radius:12px;font-size:17px;font-weight:700;box-shadow:0 6px 20px rgba(5,150,105,0.35);">
              View Loan &amp; Send Funds →
            </a>
          </td>
        </tr>

        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Feyza · Intelligent Loan Matching · <a href="https://feyza.app" style="color:#9ca3af;text-decoration:none;">feyza.app</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildBorrowerMatchedEmail(params: {
  borrowerName: string;
  lenderName: string;
  amount: number;
  currency: string;
  interestRate: number;
  loanUrl: string;
  isAutoAccept: boolean;
}): string {
  const { borrowerName, lenderName, amount, currency, interestRate, loanUrl, isAutoAccept } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 30px rgba(5,150,105,0.12);">

        <tr>
          <td style="background:linear-gradient(135deg,#059669 0%,#047857 60%,#065f46 100%);padding:40px;text-align:center;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:20px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="44" style="display:block;border:0;" /></td></tr>
            </table>
            <div style="font-size:48px;margin-bottom:12px;">${isAutoAccept ? '⚡' : '🎉'}</div>
            <h1 style="color:#fff;margin:0;font-size:30px;font-weight:700;">${isAutoAccept ? 'Instantly Matched!' : 'Loan Accepted!'}</h1>
            <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:16px;"><strong style="color:#fff;">${lenderName}</strong> approved your request</p>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px 0;">
            <p style="margin:0 0 24px;font-size:17px;color:#111827;">Hi ${borrowerName}! 👋</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;margin-bottom:24px;">
              <tr>
                <td style="padding:28px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:13px;color:#047857;font-weight:600;text-transform:uppercase;letter-spacing:1px;">You're Getting</p>
                  <p style="margin:0;font-size:52px;font-weight:800;color:#065f46;letter-spacing:-2px;">${currency} ${amount.toLocaleString()}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 28px 28px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #bbf7d0;">
                    <tr>
                      <td style="padding:16px 0 0;text-align:center;">
                        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Interest Rate</p>
                        <p style="margin:0;font-size:22px;font-weight:700;color:#059669;">${interestRate}% <span style="font-size:14px;font-weight:400;color:#6b7280;">per annum</span></p>
                      </td>
                      <td style="padding:16px 0 0;text-align:center;">
                        <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;">Lender</p>
                        <p style="margin:0;font-size:18px;font-weight:700;color:#065f46;">${lenderName}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#065f46;">🚀 What happens now</p>
                  <p style="margin:0;font-size:14px;color:#065f46;line-height:1.6;">${lenderName} will send <strong>${currency} ${amount.toLocaleString()}</strong> to your account. You'll get another notification the moment the funds are on their way.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <a href="${loanUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669,#047857);color:#fff;text-decoration:none;padding:18px 48px;border-radius:12px;font-size:17px;font-weight:700;box-shadow:0 6px 20px rgba(5,150,105,0.35);">
              View Your Loan →
            </a>
          </td>
        </tr>

        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Feyza · Secure Loan Matching · <a href="https://feyza.app" style="color:#9ca3af;text-decoration:none;">feyza.app</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}


// GET: Get match status for a loan
