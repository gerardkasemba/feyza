/**
 * Voucher Accountability Engine
 *
 * This module is the connective tissue between loan outcomes and voucher
 * consequences. Every time a vouchee's loan completes or defaults, this
 * module fires — updating the voucher's track record, their trust score,
 * their vouch_strength on the specific vouch row, and potentially locking
 * their ability to vouch until they fix the mess.
 *
 * Design principles:
 *   - Non-blocking: all writes use try/catch so a voucher consequence
 *     failure never interrupts the borrower payment flow.
 *   - Transparent: every consequence writes a trust_score_events row so
 *     the voucher can see exactly why their score changed.
 *   - Reversible lock: vouching_locked clears automatically when
 *     active_vouchee_defaults drops below 2 (debt cleared / resolved).
 *   - Success-rate decay: the vouching_success_rate multiplier downgrades
 *     every vouch_strength the voucher gives from this point forward,
 *     AND retroactively updates the strength on the triggering vouch.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { TrustScoreService } from '@/lib/trust-score';
import { sendEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

/** Lock a voucher when this many of their active vouchees are in default */
const LOCK_THRESHOLD = 2;

/** Minimum account age in days before a user can vouch */
const MIN_ACCOUNT_AGE_DAYS = 7;

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface VouchingEligibility {
  eligible: boolean;
  reason?: string;
  /** Machine-readable code for the specific gate that blocked */
  code?: 'account_too_new' | 'profile_incomplete' | 'vouching_locked' | 'ok';
}

export interface VoucherConsequenceResult {
  vouchersNotified: number;
  vouchersLocked: number;
  trustEventsRecorded: number;
  errors: string[];
}

// ─── ELIGIBILITY GATE ────────────────────────────────────────────────────────

/**
 * Check whether a user is allowed to vouch for someone.
 * Called in the POST /api/vouches handler before createVouch().
 *
 * Gates (in order of check):
 *   1. Account at least MIN_ACCOUNT_AGE_DAYS old
 *   2. full_name set (profile complete enough to be accountable)
 *   3. Not vouching_locked (2+ active vouchee defaults)
 */
export async function checkVouchingEligibility(
  supabase: SupabaseClient,
  userId: string
): Promise<VouchingEligibility> {
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, created_at, vouching_locked, vouching_locked_reason, active_vouchee_defaults')
    .eq('id', userId)
    .single();

  if (!profile) {
    return { eligible: false, reason: 'Profile not found.', code: 'profile_incomplete' };
  }

  // Gate 1: Account age
  const accountAgeDays = profile.created_at
    ? (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
    : 0;

  if (accountAgeDays < MIN_ACCOUNT_AGE_DAYS) {
    const daysLeft = Math.ceil(MIN_ACCOUNT_AGE_DAYS - accountAgeDays);
    return {
      eligible: false,
      code: 'account_too_new',
      reason: `Your account needs to be at least ${MIN_ACCOUNT_AGE_DAYS} days old before you can vouch for others. ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining.`,
    };
  }

  // Gate 2: Profile completeness
  if (!profile.full_name || profile.full_name.trim().length < 2) {
    return {
      eligible: false,
      code: 'profile_incomplete',
      reason: 'Please complete your profile (add your full name) before vouching for others. This ensures accountability.',
    };
  }

  // Gate 3: Vouching lock (active vouchee defaults)
  if (profile.vouching_locked) {
    const defaults = profile.active_vouchee_defaults ?? LOCK_THRESHOLD;
    return {
      eligible: false,
      code: 'vouching_locked',
      reason:
        profile.vouching_locked_reason ||
        `You currently have ${defaults} people you vouched for who are in default. Resolve these situations before vouching for anyone new.`,
    };
  }

  return { eligible: true, code: 'ok' };
}

// ─── LOAN COMPLETION → VOUCHER REWARD ────────────────────────────────────────

/**
 * Called when a borrower's loan is fully completed.
 * Finds all active vouchers for this borrower and:
 *   - Increments loans_completed on the vouch row
 *   - Recalculates the voucher's overall success rate
 *   - Slightly improves vouch_strength on this row (good outcome signal)
 *   - Records a trust_score_events row for transparency
 *   - Sends an in-app notification (no email — good news, low urgency)
 */
export async function onVoucheeLoanCompleted(
  supabase: SupabaseClient,
  borrowerId: string,
  loanId: string
): Promise<VoucherConsequenceResult> {
  const result: VoucherConsequenceResult = {
    vouchersNotified: 0,
    vouchersLocked: 0,
    trustEventsRecorded: 0,
    errors: [],
  };

  console.log(`[VoucherAccountability] Loan completed — borrower: ${borrowerId}, loan: ${loanId}`);

  try {
    // Find all active vouches for this borrower
    const { data: activeVouches } = await supabase
      .from('vouches')
      .select('id, voucher_id, vouch_strength, loans_completed, loans_defaulted, loans_active')
      .eq('vouchee_id', borrowerId)
      .eq('status', 'active');

    if (!activeVouches || activeVouches.length === 0) {
      console.log(`[VoucherAccountability] No active vouchers for borrower ${borrowerId}`);
      return result;
    }

    const trustService = new TrustScoreService(supabase);

    for (const vouch of activeVouches) {
      try {
        const newCompleted = (vouch.loans_completed ?? 0) + 1;
        const newActive = Math.max(0, (vouch.loans_active ?? 0) - 1);

        // Update vouch row counters
        await supabase
          .from('vouches')
          .update({
            loans_completed: newCompleted,
            loans_active: newActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', vouch.id);

        // Recalculate this voucher's success rate across ALL their vouches
        await recalculateVoucherSuccessRate(supabase, vouch.voucher_id);

        // Record positive trust event for voucher (+2 pts per completed vouchee loan)
        await trustService.recordEvent(vouch.voucher_id, {
          event_type: 'vouch_given' as any,
          score_impact: 2,
          title: '✅ Your Vouchee Repaid a Loan',
          description: 'Someone you vouched for successfully completed a loan. Your trust record improves.',
          loan_id: loanId,
          other_user_id: borrowerId,
          vouch_id: vouch.id,
        });
        result.trustEventsRecorded++;

        // In-app notification (good news — no email needed) — NON-BLOCKING
        void (async () => {
          try {
            const { error } = await supabase.from('notifications').insert({
              user_id: vouch.voucher_id,
              loan_id: loanId,
              type: 'vouchee_loan_completed',
              title: '🎉 Vouchee Repaid Their Loan',
              message:
                'Someone you vouched for just completed repaying a loan. Your vouching track record is improving.',
              data: { vouch_id: vouch.id, borrower_id: borrowerId },
            });
            if (error) console.error('[VoucherAccountability] Notification insert failed:', error.message);
          } catch {
            // swallow
          }
        })();

        result.vouchersNotified++;
      } catch (err: any) {
        console.error(`[VoucherAccountability] Error processing voucher ${vouch.voucher_id}:`, err);
        result.errors.push(`voucher ${vouch.voucher_id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.error('[VoucherAccountability] onVoucheeLoanCompleted error:', err);
    result.errors.push(err.message);
  }

  console.log(`[VoucherAccountability] Completion processed:`, result);
  return result;
}

// ─── LOAN DEFAULT → VOUCHER CONSEQUENCE ──────────────────────────────────────

/**
 * Called when a borrower's loan is marked as defaulted.
 * This is the highest-consequence event in the system.
 *
 * For each active voucher of this borrower:
 *   - Increments loans_defaulted on the vouch row
 *   - Fires VOUCHEE_DEFAULTED (-10 pts) trust event against the voucher
 *   - Recalculates vouching_success_rate (permanent track record damage)
 *   - Downgrades vouch_strength on this vouch row via success-rate multiplier
 *   - Increments active_vouchee_defaults on the voucher's profile
 *   - If active_vouchee_defaults >= LOCK_THRESHOLD → locks vouching
 *   - Sends urgent email + in-app notification to voucher
 */
export async function onVoucheeLoanDefaulted(
  supabase: SupabaseClient,
  borrowerId: string,
  loanId: string
): Promise<VoucherConsequenceResult> {
  const result: VoucherConsequenceResult = {
    vouchersNotified: 0,
    vouchersLocked: 0,
    trustEventsRecorded: 0,
    errors: [],
  };

  console.log(`[VoucherAccountability] Loan DEFAULTED — borrower: ${borrowerId}, loan: ${loanId}`);

  try {
    // Get borrower info for notification emails
    const { data: borrower } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', borrowerId)
      .single();

    const borrowerName = borrower?.full_name || 'Someone you vouched for';

    // Find all active vouches for this borrower
    const { data: activeVouches } = await supabase
      .from('vouches')
      .select('id, voucher_id, vouch_strength, loans_completed, loans_defaulted, loans_active')
      .eq('vouchee_id', borrowerId)
      .eq('status', 'active');

    if (!activeVouches || activeVouches.length === 0) {
      console.log(`[VoucherAccountability] No active vouchers for defaulted borrower ${borrowerId}`);
      return result;
    }

    const trustService = new TrustScoreService(supabase);

    for (const vouch of activeVouches) {
      try {
        const newDefaulted = (vouch.loans_defaulted ?? 0) + 1;
        const newActive = Math.max(0, (vouch.loans_active ?? 0) - 1);

        // Update vouch row counters
        await supabase
          .from('vouches')
          .update({
            loans_defaulted: newDefaulted,
            loans_active: newActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', vouch.id);

        // Recalculate success rate and get the new rate for strength downgrade
        const newSuccessRate = await recalculateVoucherSuccessRate(supabase, vouch.voucher_id);

        // Downgrade this specific vouch's strength using the new success rate
        const degradedStrength = applySuccessRateMultiplier(vouch.vouch_strength ?? 0, newSuccessRate);
        if (degradedStrength !== vouch.vouch_strength) {
          await supabase.from('vouches').update({ vouch_strength: degradedStrength }).eq('id', vouch.id);
        }

        // ── Fire trust score penalty on the VOUCHER ──────────────────────
        await trustService.recordEvent(vouch.voucher_id, {
          event_type: 'vouchee_defaulted' as any,
          score_impact: -10,
          title: '⚠️ Vouchee Defaulted on a Loan',
          description: `${borrowerName} defaulted on a loan you vouched for. This affects your trust score and vouching power.`,
          loan_id: loanId,
          other_user_id: borrowerId,
          vouch_id: vouch.id,
        });
        result.trustEventsRecorded++;

        // ── Increment active defaults on voucher profile ──────────────────
        const { data: voucherProfile } = await supabase
          .from('users')
          .select('active_vouchee_defaults, vouching_locked, full_name, email, vouches_resulted_default')
          .eq('id', vouch.voucher_id)
          .single();

        const prevActiveDefaults = voucherProfile?.active_vouchee_defaults ?? 0;
        const newActiveDefaults = prevActiveDefaults + 1;
        const shouldLock = newActiveDefaults >= LOCK_THRESHOLD;
        const wasAlreadyLocked = voucherProfile?.vouching_locked ?? false;

        const profileUpdate: Record<string, any> = {
          active_vouchee_defaults: newActiveDefaults,
          vouches_resulted_default: (voucherProfile?.vouches_resulted_default ?? 0) + 1,
        };

        if (shouldLock && !wasAlreadyLocked) {
          profileUpdate.vouching_locked = true;
          profileUpdate.vouching_locked_reason =
            `You have ${newActiveDefaults} people you vouched for currently in default. ` +
            `Your ability to vouch for new people is suspended until these are resolved.`;
          profileUpdate.vouching_locked_at = new Date().toISOString();

          console.log(
            `[VoucherAccountability] LOCKING voucher ${vouch.voucher_id} — ${newActiveDefaults} active defaults`
          );
          result.vouchersLocked++;
        }

        await supabase.from('users').update(profileUpdate).eq('id', vouch.voucher_id);

        // ── Send urgent email to voucher ──────────────────────────────────
        if (voucherProfile?.email) {
          void sendEmail({
            to: voucherProfile.email,
            subject: `⚠️ Important: ${borrowerName} defaulted on a loan you vouched for`,
            html: buildVoucherDefaultEmail({
              voucherName: voucherProfile.full_name || 'there',
              borrowerName,
              loanId,
              newActiveDefaults,
              wasLocked: shouldLock && !wasAlreadyLocked,
              successRate: newSuccessRate,
              profileUrl: `${APP_URL}/vouch/requests`,
            }),
          }).catch((err) =>
            console.error(`[VoucherAccountability] Email failed for ${voucherProfile.email}:`, err)
          );
        }

        // ── In-app notification (urgent) — NON-BLOCKING ─────────────────
        void (async () => {
          try {
            const { error } = await supabase.from('notifications').insert({
              user_id: vouch.voucher_id,
              loan_id: loanId,
              type: 'vouchee_loan_defaulted',
              title: '⚠️ Vouchee Defaulted — Action Needed',
              message: `${borrowerName} has defaulted on a loan you vouched for. ${
                shouldLock && !wasAlreadyLocked ? 'Your vouching ability has been suspended.' : 'This affects your trust score.'
              }`,
              data: {
                vouch_id: vouch.id,
                borrower_id: borrowerId,
                active_defaults: newActiveDefaults,
                vouching_locked: shouldLock,
              },
            });
            if (error) console.error('[VoucherAccountability] Notification insert failed:', error.message);
          } catch {
            // swallow
          }
        })();

        result.vouchersNotified++;
      } catch (err: any) {
        console.error(`[VoucherAccountability] Error processing voucher ${vouch.voucher_id}:`, err);
        result.errors.push(`voucher ${vouch.voucher_id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.error('[VoucherAccountability] onVoucheeLoanDefaulted error:', err);
    result.errors.push(err.message);
  }

  console.log(`[VoucherAccountability] Default processed:`, result);
  return result;
}

// ─── VOUCHING LOCK RELEASE ────────────────────────────────────────────────────

/**
 * Called when a previously defaulted loan is resolved (debt cleared,
 * loan restructured, or borrower block lifted). Decrements the voucher's
 * active default count and unlocks them if it drops below LOCK_THRESHOLD.
 */
export async function onVoucheeDefaultResolved(
  supabase: SupabaseClient,
  borrowerId: string,
  loanId: string
): Promise<void> {
  console.log(`[VoucherAccountability] Default resolved — borrower: ${borrowerId}`);

  try {
    const { data: activeVouches } = await supabase
      .from('vouches')
      .select('id, voucher_id')
      .eq('vouchee_id', borrowerId)
      .eq('status', 'active');

    if (!activeVouches?.length) return;

    for (const vouch of activeVouches) {
      try {
        const { data: voucherProfile } = await supabase
          .from('users')
          .select('active_vouchee_defaults, vouching_locked')
          .eq('id', vouch.voucher_id)
          .single();

        if (!voucherProfile) continue;

        const newActiveDefaults = Math.max(0, (voucherProfile.active_vouchee_defaults ?? 1) - 1);
        const shouldUnlock = voucherProfile.vouching_locked && newActiveDefaults < LOCK_THRESHOLD;

        const update: Record<string, any> = { active_vouchee_defaults: newActiveDefaults };

        if (shouldUnlock) {
          update.vouching_locked = false;
          update.vouching_locked_reason = null;
          update.vouching_locked_at = null;
          console.log(`[VoucherAccountability] UNLOCKING voucher ${vouch.voucher_id}`);
        }

        await supabase.from('users').update(update).eq('id', vouch.voucher_id);

        if (shouldUnlock) {
          // NON-BLOCKING notification
          void (async () => {
            try {
              const { error } = await supabase.from('notifications').insert({
                user_id: vouch.voucher_id,
                loan_id: loanId,
                type: 'vouching_unlocked',
                title: '✅ Vouching Ability Restored',
                message:
                  'A previously defaulted vouchee has resolved their debt. Your vouching ability has been restored.',
              });
              if (error) console.error('[VoucherAccountability] Notification insert failed:', error.message);
            } catch {
              // swallow
            }
          })();
        }
      } catch (err: any) {
        console.error(`[VoucherAccountability] Unlock error for voucher ${vouch.voucher_id}:`, err);
      }
    }
  } catch (err: any) {
    console.error('[VoucherAccountability] onVoucheeDefaultResolved error:', err);
  }
}

// ─── INTERNAL HELPERS ────────────────────────────────────────────────────────

/**
 * Recalculate a voucher's overall success rate across ALL their vouches.
 * Writes the result back to users.vouching_success_rate.
 * Returns the new success rate (0–100).
 */
async function recalculateVoucherSuccessRate(
  supabase: SupabaseClient,
  voucherId: string
): Promise<number> {
  const { data: allVouches } = await supabase
    .from('vouches')
    .select('loans_completed, loans_defaulted')
    .eq('voucher_id', voucherId);

  if (!allVouches?.length) return 100;

  let totalCompleted = 0;
  let totalDefaulted = 0;

  for (const v of allVouches) {
    totalCompleted += v.loans_completed ?? 0;
    totalDefaulted += v.loans_defaulted ?? 0;
  }

  const totalOutcomes = totalCompleted + totalDefaulted;
  const successRate =
    totalOutcomes === 0 ? 100 : Math.round((totalCompleted / totalOutcomes) * 100 * 100) / 100;

  await supabase
    .from('users')
    .update({
      vouching_success_rate: successRate,
      vouches_resulted_complete: totalCompleted,
    })
    .eq('id', voucherId);

  return successRate;
}

/**
 * Apply the voucher's success-rate multiplier to a vouch strength score.
 */
export function applySuccessRateMultiplier(baseStrength: number, successRate: number): number {
  const multiplier =
    successRate >= 100 ? 1.0 :
    successRate >= 80  ? 0.9 :
    successRate >= 60  ? 0.75 :
    successRate >= 40  ? 0.55 : 0.35;

  return Math.min(10, Math.max(1, Math.round(baseStrength * multiplier)));
}

// ─── EMAIL BUILDER ────────────────────────────────────────────────────────────

function buildVoucherDefaultEmail(params: {
  voucherName: string;
  borrowerName: string;
  loanId: string;
  newActiveDefaults: number;
  wasLocked: boolean;
  successRate: number;
  profileUrl: string;
}): string {
  const { voucherName, borrowerName, loanId, newActiveDefaults, wasLocked, successRate, profileUrl } = params;

  const successRateColor =
    successRate >= 80 ? '#059669' :
    successRate >= 60 ? '#f59e0b' : '#ef4444';

  const loanUrl = `${APP_URL}/loans/${loanId}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#fef2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef2f2;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 30px rgba(239,68,68,0.12);">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 60%,#991b1b 100%);padding:40px;text-align:center;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:20px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="44" style="display:block;border:0;" /></td></tr>
            </table>
            <div style="font-size:48px;margin-bottom:12px;">⚠️</div>
            <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;">Vouchee Default Notice</h1>
            <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:15px;">Immediate attention required</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:36px 40px 0;">
            <p style="margin:0 0 20px;font-size:17px;color:#111827;">Hi ${voucherName},</p>

            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
              We're writing to let you know that <strong>${borrowerName}</strong>,
              someone you vouched for on Feyza, has <strong style="color:#dc2626;">defaulted on a loan</strong>.
              As their voucher, this affects your trust record on the platform.
            </p>

            <!-- Impact card -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff1f2;border:1px solid #fecaca;border-radius:14px;margin:0 0 24px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;">What this means for you</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;">
                        <table role="presentation" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-size:16px;width:24px;">📉</td>
                            <td style="padding-left:10px;font-size:14px;color:#374151;">Your trust score has decreased by <strong>10 points</strong></td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;">
                        <table role="presentation" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-size:16px;width:24px;">📊</td>
                            <td style="padding-left:10px;font-size:14px;color:#374151;">Your vouching success rate: <strong style="color:${successRateColor};">${successRate.toFixed(0)}%</strong></td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;">
                        <table role="presentation" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-size:16px;width:24px;">🔄</td>
                            <td style="padding-left:10px;font-size:14px;color:#374151;">Future vouches you give carry reduced weight</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;">
                        <table role="presentation" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-size:16px;width:24px;">⚠️</td>
                            <td style="padding-left:10px;font-size:14px;color:#374151;">Active vouchee defaults: <strong style="color:#dc2626;">${newActiveDefaults}</strong> of 2 (lock threshold)</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            ${wasLocked ? `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#7f1d1d;border-radius:14px;margin:0 0 24px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#fca5a5;">🔒 Your Vouching Ability Has Been Suspended</p>
                  <p style="margin:0;font-size:14px;color:#fecaca;line-height:1.6;">
                    You now have ${newActiveDefaults} people in default — the maximum before vouching is suspended.
                    You cannot vouch for new people until these defaults are resolved.
                    This protects the integrity of our trust system.
                  </p>
                </td>
              </tr>
            </table>
            ` : `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef9c3;border:1px solid #fde68a;border-radius:14px;margin:0 0 24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0;font-size:14px;color:#92400e;line-height:1.6;">
                    ⚠️ <strong>Warning:</strong> You have ${newActiveDefaults} active vouchee default.
                    One more will suspend your ability to vouch. Be selective about who you endorse.
                  </p>
                </td>
              </tr>
            </table>
            `}

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;margin:0 0 24px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#374151;">What you can do</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#374151;">→ <strong>Talk to ${borrowerName}</strong> — encourage them to resolve the debt on Feyza.</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#374151;">→ <strong>View the loan</strong> — understand what happened and the current status.</p>
                  <p style="margin:0;font-size:14px;color:#374151;">→ <strong>Review your vouches</strong> — consider who else you've vouched for and their repayment status.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:16px 40px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:8px;">
                  <a href="${loanUrl}" style="display:block;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;text-decoration:none;padding:14px 20px;border-radius:10px;font-size:15px;font-weight:700;text-align:center;">
                    View Loan
                  </a>
                </td>
                <td style="padding-left:8px;">
                  <a href="${profileUrl}" style="display:block;background:#f1f5f9;color:#374151;text-decoration:none;padding:14px 20px;border-radius:10px;font-size:15px;font-weight:600;text-align:center;border:1px solid #e2e8f0;">
                    My Vouching Record
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">
              Vouching is a responsibility. We hold all vouchers accountable for the quality of their endorsements.
            </p>
            <p style="margin:0;font-size:12px;color:#9ca3af;">Feyza · Building Real Trust · <a href="https://feyza.app" style="color:#9ca3af;text-decoration:none;">feyza.app</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}