import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { VouchService, TrustScoreService, vouchStrengthLabel } from '@/lib/trust-score';
import { sendEmail } from '@/lib/email';
import { checkVouchingEligibility } from '@/lib/vouching/accountability';
import { logger } from '@/lib/logger';

const log = logger('vouches');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// GET: Get vouches for/by a user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.id;
    const type = searchParams.get('type') || 'received'; // 'received' or 'given'

    const serviceClient = await createServiceRoleClient();
    const vouchService = new VouchService(serviceClient);

    let vouches;
    if (type === 'given') {
      vouches = await vouchService.getVouchesBy(userId);
    } else {
      vouches = await vouchService.getVouchesFor(userId);
    }

    // Also get pending requests if viewing own profile
    let pendingRequests = [];
    if (userId === user.id) {
      const { data: requests } = await serviceClient
        .from('vouch_requests')
        .select(`
          *,
          requester:users!requester_id(
            id,
            full_name,
            username,
            email
          )
        `)
        .eq('requested_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      pendingRequests = requests || [];
    }

    return NextResponse.json({
      vouches,
      pendingRequests,
    });
  } catch (error: unknown) {
    log.error('Error fetching vouches:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST: Create a vouch or vouch request
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const serviceClient = await createServiceRoleClient();
    const vouchService = new VouchService(serviceClient);

    // ── Verification gate: check eligibility before any vouch action ─────
    // Gates: account age ≥ 7 days, full_name set, not vouching_locked
    // Note: client sends action 'accept' when accepting a vouch request (not 'accept_request')
    if (action === 'vouch' || action === 'accept' || action === 'accept_request') {
      const eligibility = await checkVouchingEligibility(serviceClient, user.id);
      if (!eligibility.eligible) {
        return NextResponse.json(
          {
            error: eligibility.reason,
            code: eligibility.code,
            vouching_blocked: true,
          },
          { status: 403 }
        );
      }
    }

    // Create a vouch directly
    if (action === 'vouch') {
      const { voucheeId, vouch_type, relationship, relationship_details, known_years, message, guarantee_percentage, guarantee_max_amount, is_public } = body;

      if (!voucheeId) {
        return NextResponse.json({ error: 'voucheeId is required' }, { status: 400 });
      }

      const result = await vouchService.createVouch(user.id, voucheeId, {
        vouch_type: vouch_type || 'character',
        relationship: relationship || 'friend',
        relationship_details,
        known_years,
        message,
        guarantee_percentage,
        guarantee_max_amount,
        is_public,
      });

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // Send notification to vouchee
      const { data: vouchee } = await serviceClient
        .from('users')
        .select('email, full_name')
        .eq('id', voucheeId)
        .single();

      const { data: voucher } = await serviceClient
        .from('users')
        .select('full_name, trust_tier, vouch_count, vouching_success_rate')
        .eq('id', user.id)
        .single();

      if (vouchee?.email) {
        await sendEmail({
          to: vouchee.email,
          subject: `${voucher?.full_name || 'Someone'} vouched for you on Feyza! 🎉`,
          html: getVouchReceivedEmail({
            voucheeName: vouchee.full_name?.split(' ')[0] || 'there',
            voucherName: voucher?.full_name || 'Someone',
            voucherTier: voucher?.trust_tier || 'tier_1',
            voucherSuccessRate: voucher?.vouching_success_rate ?? 100,
            relationship: relationship || 'friend',
            message: message || '',
            vouchStrength: result.vouch?.vouch_strength || 0,
          }),
        });
      }

      return NextResponse.json({ vouch: result.vouch });
    }

    // Request a vouch
    if (action === 'request') {
      const { targetUserId, targetEmail, targetName, message, suggestedRelationship } = body;

      const result = await vouchService.requestVouch(
        user.id,
        targetUserId,
        targetEmail,
        message,
        suggestedRelationship
      );

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // Send email notification
      const { data: requester } = await serviceClient
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const emailTo = targetEmail || (await serviceClient
        .from('users')
        .select('email')
        .eq('id', targetUserId)
        .single()).data?.email;

      if (emailTo) {
        await sendEmail({
          to: emailTo,
          subject: `${requester?.full_name || 'Someone'} is asking for your vouch on Feyza`,
          html: getVouchRequestEmail({
            targetName: targetName || 'there',
            requesterName: requester?.full_name || 'Someone',
            message: message || '',
            requestId: (result.request as any)?.id,
            inviteToken: (result.request as any)?.invite_token,
          }),
        });
      }

      return NextResponse.json({ request: result.request });
    }

    // Accept a vouch request
    if (action === 'accept') {
      const { requestId, vouch_type, relationship, relationship_details, known_years, message } = body;

      const result = await vouchService.acceptVouchRequest(requestId, user.id, {
        vouch_type: vouch_type || 'character',
        relationship: relationship || 'friend',
        relationship_details,
        known_years,
        message,
      });

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ vouch: result.vouch });
    }

    // Decline a vouch request
    if (action === 'decline') {
      const { requestId, reason } = body;

      const result = await vouchService.declineVouchRequest(requestId, user.id, reason);

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    // Revoke a vouch
    if (action === 'revoke') {
      const { vouchId, reason } = body;

      const result = await vouchService.revokeVouch(user.id, vouchId, reason);

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    log.error('Error processing vouch action:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Email templates
function getVouchReceivedEmail(params: {
  voucheeName: string;
  voucherName: string;
  voucherTier: string;
  voucherSuccessRate: number;
  relationship: string;
  message: string;
  vouchStrength: number;
}): string {
  const { voucheeName, voucherName, voucherTier, voucherSuccessRate, relationship, message, vouchStrength } = params;

  // Map tier to display label
  const tierLabels: Record<string, string> = {
    tier_1: 'Basic Member', tier_2: 'Building Trust',
    tier_3: 'Established Trust', tier_4: 'High Trust',
  };
  const tierLabel = tierLabels[voucherTier] ?? 'Member';

  // Voucher success rate styling
  const successRateColor =
    voucherSuccessRate >= 90 ? '#059669' :
    voucherSuccessRate >= 70 ? '#10b981' :
    voucherSuccessRate >= 50 ? '#f59e0b' : '#ef4444';
  const successRateLabel =
    voucherSuccessRate >= 90 ? 'Excellent track record' :
    voucherSuccessRate >= 70 ? 'Good track record' :
    voucherSuccessRate >= 50 ? 'Mixed track record' : 'Poor track record';

  // Strength label and color
  const strengthColors: Record<number, { color: string; label: string; description: string }> = {};
  for (let i = 1; i <= 10; i++) {
    if (i >= 9)      strengthColors[i] = { color: '#059669', label: 'Exceptional', description: 'Maximum trust signal' };
    else if (i >= 7) strengthColors[i] = { color: '#10b981', label: 'Strong',      description: 'High-confidence vouch' };
    else if (i >= 5) strengthColors[i] = { color: '#3b82f6', label: 'Solid',       description: 'Good endorsement' };
    else if (i >= 3) strengthColors[i] = { color: '#f59e0b', label: 'Moderate',    description: 'Decent endorsement' };
    else             strengthColors[i] = { color: '#9ca3af', label: 'Light',        description: 'Basic endorsement' };
  }
  const s = strengthColors[vouchStrength] ?? strengthColors[1];
  // Progress bar width in % for strength display (1-10 → 10%-100%)
  const barWidth = Math.round(vouchStrength * 10);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 30px rgba(5,150,105,0.12);">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#059669 0%,#047857 60%,#065f46 100%);padding:40px;text-align:center;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:20px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="44" style="display:block;border:0;" /></td></tr>
            </table>
            <div style="font-size:48px;margin-bottom:12px;">🎉</div>
            <h1 style="color:#fff;margin:0;font-size:30px;font-weight:700;">You've Been Vouched!</h1>
            <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:16px;">Your trust just went up a notch</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:36px 40px 0;">
            <p style="margin:0 0 24px;font-size:17px;color:#111827;">Hi ${voucheeName}! 👋</p>

            <!-- Voucher card -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;margin:0 0 24px;">
              <tr>
                <td style="padding:24px 28px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:middle;">
                        <div style="width:52px;height:52px;background:linear-gradient(135deg,#059669,#047857);border-radius:50%;text-align:center;line-height:52px;font-size:22px;font-weight:700;color:#fff;display:inline-block;">
                          ${voucherName.charAt(0).toUpperCase()}
                        </div>
                      </td>
                      <td style="padding-left:16px;vertical-align:middle;">
                        <p style="margin:0;font-size:18px;font-weight:700;color:#065f46;">${voucherName}</p>
                        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">
                          <span style="background:#d1fae5;color:#065f46;padding:2px 10px;border-radius:20px;font-weight:600;">${tierLabel}</span>
                          &nbsp;
                          <span style="background:${successRateColor}18;color:${successRateColor};padding:2px 10px;border-radius:20px;font-weight:600;font-size:12px;">${voucherSuccessRate.toFixed(0)}% success — ${successRateLabel}</span>
                          &nbsp;• ${relationship}
                        </p>
                      </td>
                    </tr>
                  </table>

                  ${message ? `
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #bbf7d0;">
                    <tr>
                      <td style="padding-top:16px;">
                        <p style="margin:0;font-size:15px;font-style:italic;color:#374151;line-height:1.7;">"${message}"</p>
                      </td>
                    </tr>
                  </table>` : ''}
                </td>
              </tr>
            </table>

            <!-- Vouch strength -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;margin:0 0 24px;">
              <tr>
                <td style="padding:24px 28px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:middle;">
                        <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Vouch Strength</p>
                        <p style="margin:0;font-size:22px;font-weight:800;color:${s.color};">${s.label} — ${vouchStrength}/10</p>
                        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${s.description}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top:12px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e5e7eb;border-radius:99px;overflow:hidden;">
                          <tr>
                            <td style="width:${barWidth}%;background:${s.color};height:8px;border-radius:99px;"></td>
                            <td></td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Impact -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;margin:0 0 24px;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#065f46;">✨ What this means for you</p>
                  <p style="margin:0 0 6px;font-size:14px;color:#065f46;">✅ Your Trust Score has increased</p>
                  <p style="margin:0 0 6px;font-size:14px;color:#065f46;">✅ Business lenders see your growing network</p>
                  <p style="margin:0;font-size:14px;color:#065f46;">✅ Higher trust = better rates &amp; higher loan limits</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:8px 40px 40px;text-align:center;">
            <a href="${APP_URL}/vouch/requests" style="display:inline-block;background:linear-gradient(135deg,#059669,#047857);color:#fff;text-decoration:none;padding:18px 48px;border-radius:12px;font-size:17px;font-weight:700;box-shadow:0 6px 20px rgba(5,150,105,0.35);">
              View Your Trust Profile →
            </a>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Feyza · Building Trust Together · <a href="https://feyza.app" style="color:#9ca3af;text-decoration:none;">feyza.app</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function getVouchRequestEmail(params: {
  targetName: string;
  requesterName: string;
  message: string;
  requestId: string;
  inviteToken?: string;
}): string {
  const { targetName, requesterName, message, requestId, inviteToken } = params;
  
  const actionUrl = inviteToken
    ? `${APP_URL}/vouch/accept?token=${inviteToken}`
    : `${APP_URL}/vouch/requests`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  
  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">Someone Needs Your Vouch</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Help build trust in your community</p>
  </div>
  
  <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
    <p style="font-size: 18px; color: #166534;">Hi ${targetName}! 👋</p>
    
    <p style="color: #374151;"><strong>${requesterName}</strong> is asking you to vouch for them on Feyza.</p>
    
    ${message ? `
    <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
      <p style="color: #6b7280; margin: 0 0 10px; font-size: 14px;">Their message:</p>
      <p style="color: #374151; font-style: italic; margin: 0;">"${message}"</p>
    </div>
    ` : ''}
    
    <div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
      <p style="color: #92400e; margin: 0; font-size: 14px;">
        <strong>What is a vouch?</strong><br>
        A vouch is your statement of trust in this person. It helps them get loans and builds their Trust Score. Only vouch for people you actually know and trust.
      </p>
    </div>
    
    <div style="text-align: center; margin: 25px 0;">
      <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; margin-right: 10px;">Review Request →</a>
    </div>
    
    <p style="color: #6b7280; font-size: 13px; text-align: center;">You can accept or decline this request. Only vouch if you truly trust this person.</p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">Feyza • Building Trust Together</div>
</body>
</html>
  `;
}
