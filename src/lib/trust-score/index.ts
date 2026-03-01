import { logger } from '@/lib/logger';
const log = logger('index');
/**
 * Feyza Trust Score System
 *
 * A revolutionary alternative to traditional credit scores.
 * Based on actual behaviour, not debt history.
 *
 * Score components (weights unchanged):
 *   Payment History  40%  – on-time payments, early payments, missed payments, streaks
 *   Loan Completion  25%  – successfully completed loans vs defaults
 *   Social Trust     15%  – vouches received AND vouching track record (both sides)
 *   Verification     10%  – identity, employment, address, bank
 *   Platform Tenure  10%  – time on platform
 *
 * ── Fixed bugs in this rewrite ─────────────────────────────────────────────
 *
 * Bug 1 – calculateSocialScore was one-sided.
 *   It only read vouches where vouchee_id = user (boosts received). The voucher's
 *   track record (loans_completed / loans_defaulted on their given vouches) was
 *   never read. This meant calling recalculate(voucherId) after a vouchee repaid
 *   produced an identical score every time — the +1 / +2 trust_score_events were
 *   written but the formula had no path to use them. Fixed: social score now blends
 *   vouchee side (60%) + voucher track-record side (40%).
 *
 * Bug 2 – Missed / overdue payments never penalised.
 *   calculatePaymentScore only queried is_paid = true. Borrowers with past-due
 *   unpaid installments received no penalty. Fixed: missed payments (is_paid=false
 *   AND due_date < today) are now counted and each subtracts IMPACTS.PAYMENT_MISSED.
 *
 * Bug 3 – missed_payments column in trust_scores never written.
 *   getUserStats omitted the field; scoreData therefore never included it so the
 *   DB column sat at 0 permanently. Fixed: calculatePaymentScore now returns
 *   missed_payments in its stats and recalculate() includes it in the upsert.
 *
 * Bug 4 – calculateCompletionScore cliff at 1 completed loan.
 *   The old formula (completionRate = (completed/total)*60, completionBonus = min(completed*5,40))
 *   scored 115 (→ clamped 100) after just ONE completed loan. Every subsequent loan
 *   added nothing because the ceiling was already hit. Fixed: rebalanced weights so
 *   rate contributes max 25 pts and volume bonus takes many loans to saturate.
 *
 * Bug 5 – createVouch never updated voucher's trust score row.
 *   After issuing a vouch the vouchee's score was recalculated, but the voucher's
 *   trust_scores.vouches_given stat was never refreshed. Fixed: createVouch now
 *   calls recalculate(voucherId) after creating the vouch.
 *
 * Bug 6 – calculateSocialScore did SELECT * with a join.
 *   Only trust_score_boost was needed from the vouches table. Fixed: minimal select.
 *
 * Bug 7 – Lender/voucher scores permanently frozen at 50.
 *   When the voucher is also the lender (or any user with no borrower loan history),
 *   payment_score and completion_score are both stuck at 50 (their neutral defaults).
 *   Those two components carry 65% of the total weight, so even a perfect social score
 *   can only move the needle by ~7.5 pts on the final score. Worse: the voucher-side
 *   social contribution is only 40% of the social score at 15% weight = 6% of total,
 *   meaning +4 pts per completed vouchee = 0.24 pts on the final → rounds to zero.
 *   Fixed: when a user has ZERO borrower loan history, the score uses lender weights
 *   that redistribute the payment/completion share to social, verification, and tenure.
 *   Additionally, the voucher-side social formula now gives a meaningful jump on the
 *   first completion (+20 instead of +4) so the signal is visible at all.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { calculateSimpleTrustTier } from '@/lib/trust/simple-tier';

// ============================================
// TYPES
// ============================================

export interface TrustScore {
  id: string;
  user_id: string;
  score: number;
  score_grade: string;
  score_label: string;

  // Component scores
  payment_score: number;
  completion_score: number;
  social_score: number;
  verification_score: number;
  tenure_score: number;

  // Stats
  total_loans: number;
  completed_loans: number;
  active_loans: number;
  defaulted_loans: number;

  total_payments: number;
  ontime_payments: number;
  early_payments: number;
  late_payments: number;
  missed_payments: number;

  total_amount_borrowed: number;
  total_amount_repaid: number;

  current_streak: number;
  best_streak: number;

  vouches_received: number;
  vouches_given: number;
  vouch_defaults: number;

  created_at: string;
  updated_at: string;
  last_calculated_at: string;
}

export interface TrustScoreEvent {
  event_type: TrustEventType;
  score_impact: number;
  title: string;
  description?: string;
  loan_id?: string;
  payment_id?: string;
  other_user_id?: string;
  vouch_id?: string;
  metadata?: Record<string, any>;
}

export type TrustEventType =
  | 'payment_ontime'
  | 'payment_early'
  | 'payment_late'
  | 'payment_missed'
  | 'payment_failed'
  | 'loan_completed'
  | 'loan_defaulted'
  | 'loan_started'
  | 'vouch_received'
  | 'vouch_given'
  | 'vouch_revoked'
  | 'vouchee_defaulted'
  | 'verification_completed'
  | 'streak_milestone'
  | 'first_loan_completed'
  | 'amount_milestone';

export interface Vouch {
  id: string;
  voucher_id: string;
  vouchee_id: string;
  vouch_type: 'character' | 'guarantee' | 'employment' | 'family';
  relationship: string;
  relationship_details?: string;
  known_years?: number;
  message?: string;
  guarantee_percentage?: number;
  guarantee_max_amount?: number;
  vouch_strength: number;
  trust_score_boost: number;
  status: 'active' | 'revoked' | 'expired' | 'claimed';
  is_public: boolean;
  created_at: string;

  // Joined data
  voucher?: {
    id: string;
    full_name: string;
    username?: string;
    trust_score?: TrustScore;
  };
}

// ============================================
// VOUCH STRENGTH CALCULATOR
// ============================================

/**
 * Compute a 1–10 vouch strength score based on:
 *   - Voucher's trust tier    (carries most weight — their social credibility)
 *   - Relationship type       (family/partner means more accountability)
 *   - Known years             (longer = more reliable signal)
 *   - Vouch type              (guarantee > employment > character)
 *
 * Scale: 1 = minimal endorsement, 10 = maximum trust signal
 */
export function computeVouchStrength(params: {
  voucherTier: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | string;
  relationship: string;
  knownYears?: number;
  vouchType: 'character' | 'guarantee' | 'employment' | 'family' | string;
  /**
   * The voucher's historical success rate (0–100).
   * Defaults to 100 (no penalty) for first-time vouchers.
   */
  voucherSuccessRate?: number;
}): number {
  const { voucherTier, relationship, knownYears, vouchType, voucherSuccessRate = 100 } = params;

  // Tier base (1–5 points)
  const tierBase: Record<string, number> = {
    tier_1: 1,
    tier_2: 2,
    tier_3: 3.5,
    tier_4: 5,
  };
  const base = tierBase[voucherTier] ?? 1;

  // Longevity bonus (0–2 points)
  const years = knownYears ?? 0;
  const longevity = years >= 10 ? 2 : years >= 5 ? 1.5 : years >= 2 ? 1 : years >= 1 ? 0.5 : 0;

  // Relationship bonus (0–2 points)
  const rel = relationship?.toLowerCase() ?? '';
  let relBonus = 0;
  if (['spouse', 'partner', 'parent', 'sibling', 'family', 'child'].some(r => rel.includes(r))) {
    relBonus = 2;
  } else if (['close friend', 'best friend', 'mentor', 'manager', 'employer'].some(r => rel.includes(r))) {
    relBonus = 1.5;
  } else if (['friend', 'colleague', 'coworker', 'classmate'].some(r => rel.includes(r))) {
    relBonus = 1;
  } else {
    relBonus = 0.5;
  }

  // Type bonus (0–1 point)
  const typeBonus: Record<string, number> = {
    guarantee: 1,
    family: 0.75,
    employment: 0.5,
    character: 0,
  };
  const type = typeBonus[vouchType] ?? 0;

  const raw = base + longevity + relBonus + type;
  const baseStrength = Math.min(10, Math.max(1, Math.round(raw)));

  // Success-rate multiplier — skin-in-the-game decay.
  const successMultiplier =
    voucherSuccessRate >= 100 ? 1.00 :
    voucherSuccessRate >= 80  ? 0.90 :
    voucherSuccessRate >= 60  ? 0.75 :
    voucherSuccessRate >= 40  ? 0.55 : 0.35;

  return Math.min(10, Math.max(1, Math.round(baseStrength * successMultiplier)));
}

/**
 * Convert a 1–10 vouch strength into a human-readable label.
 */
export function vouchStrengthLabel(strength: number): {
  label: string;
  description: string;
  color: string;
} {
  if (strength >= 9) return { label: 'Exceptional', description: 'Highest trust signal',   color: '#059669' };
  if (strength >= 7) return { label: 'Strong',       description: 'High-confidence vouch',  color: '#10b981' };
  if (strength >= 5) return { label: 'Solid',        description: 'Good trust endorsement', color: '#3b82f6' };
  if (strength >= 3) return { label: 'Moderate',     description: 'Moderate endorsement',   color: '#f59e0b' };
  return                   { label: 'Light',         description: 'Basic endorsement',      color: '#9ca3af' };
}

// ============================================
// SCORE WEIGHTS
// ============================================

const WEIGHTS = {
  PAYMENT:      0.40,   // 40%
  COMPLETION:   0.25,   // 25%
  SOCIAL:       0.15,   // 15%
  VERIFICATION: 0.10,   // 10%
  TENURE:       0.10,   // 10%
};

/**
 * Weights used when a user has NO borrower loan history (i.e. they are a lender,
 * a voucher who has never borrowed, or a brand-new user).
 *
 * Payment and Completion are "not applicable" rather than "neutral 50" — we
 * redistribute their 65% share to the components that can actually reflect the
 * user's behaviour: Social (how reliable their vouching is), Verification, and Tenure.
 *
 *   Social:       45%  (was 15%)
 *   Verification: 30%  (was 10%)
 *   Tenure:       25%  (was 10%)
 *   Payment:       0%  (was 40%)
 *   Completion:    0%  (was 25%)
 */
const LENDER_WEIGHTS = {
  PAYMENT:      0.00,
  COMPLETION:   0.00,
  SOCIAL:       0.45,
  VERIFICATION: 0.30,
  TENURE:       0.25,
};

// Score impacts for events
const IMPACTS = {
  // Payment events (applied per payment inside calculatePaymentScore)
  PAYMENT_ONTIME:          2,
  PAYMENT_EARLY:           5,  // Slightly higher so early completions visibly move the score
  PAYMENT_LATE_1_7_DAYS:  -3,
  PAYMENT_LATE_8_14_DAYS: -5,
  PAYMENT_LATE_15_30_DAYS:-8,
  PAYMENT_MISSED:         -15,  // per unpaid past-due instalment

  // Loan events (applied inside calculateCompletionScore)
  LOAN_COMPLETED:          10,
  LOAN_DEFAULTED:         -30,
  FIRST_LOAN_COMPLETED:    15,

  // Streak bonuses (applied once per recalculate)
  STREAK_5:    5,
  STREAK_10:  10,
  STREAK_25:  20,
  STREAK_50:  35,
  STREAK_100: 50,

  // Vouch events (used in recordEvent callers, not in recalculate)
  VOUCH_RECEIVED_BASE:   3,
  VOUCH_RECEIVED_STRONG: 8,
  VOUCHEE_DEFAULTED:    -10,

  // Verification (applied inside calculateVerificationScore)
  KYC_COMPLETED:        10,
  BANK_CONNECTED:        5,
  EMPLOYMENT_VERIFIED:   8,
  ADDRESS_VERIFIED:      5,

  // Amount milestones
  REPAID_1000:   5,
  REPAID_5000:  10,
  REPAID_10000: 15,
  REPAID_25000: 25,
};

// ============================================
// TRUST SCORE SERVICE
// ============================================

export class TrustScoreService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // ─── Public: get stored score ───────────────────────────────────────────────

  async getScore(userId: string): Promise<TrustScore | null> {
    const { data, error } = await this.supabase
      .from('trust_scores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      log.error('Error fetching trust score:', error);
      return null;
    }
    return data;
  }

  // ─── Public: full recalculate ───────────────────────────────────────────────

  async recalculate(userId: string): Promise<TrustScore | null> {
    log.info(`[TrustScore] Recalculating for user ${userId}`);

    // Run all component calculations in parallel where possible
    const [
      paymentResult,
      completionScore,
      socialScore,
      verificationScore,
      tenureScore,
      stats,
    ] = await Promise.all([
      this.calculatePaymentScore(userId),
      this.calculateCompletionScore(userId),
      this.calculateSocialScore(userId),
      this.calculateVerificationScore(userId),
      this.calculateTenureScore(userId),
      this.getUserStats(userId),
    ]);

    const paymentScore = paymentResult.score;
    const paymentStats = paymentResult.stats;

    // Bug 7 fix: when user has NO borrower loan history (lender, voucher-only, new user),
    // payment and completion components are "not applicable" not "neutral 50".
    // Use LENDER_WEIGHTS to redistribute their share to the components that can actually
    // reflect behaviour for a non-borrower (social, verification, tenure).
    const hasBorrowerLoans = stats.total_loans > 0;
    const w = hasBorrowerLoans ? WEIGHTS : LENDER_WEIGHTS;

    log.info(`[TrustScore] Using ${hasBorrowerLoans ? 'borrower' : 'lender'} weights for ${userId} (total_loans=${stats.total_loans})`);

    const finalScore = Math.round(
      paymentScore      * w.PAYMENT +
      completionScore   * w.COMPLETION +
      socialScore       * w.SOCIAL +
      verificationScore * w.VERIFICATION +
      tenureScore       * w.TENURE
    );
    const clampedScore = Math.max(0, Math.min(100, finalScore));

    const scoreGrade =
      clampedScore >= 97 ? 'A+' : clampedScore >= 93 ? 'A'  : clampedScore >= 90 ? 'A-' :
      clampedScore >= 87 ? 'B+' : clampedScore >= 83 ? 'B'  : clampedScore >= 80 ? 'B-' :
      clampedScore >= 77 ? 'C+' : clampedScore >= 73 ? 'C'  : clampedScore >= 70 ? 'C-' :
      clampedScore >= 60 ? 'D'  : 'F';

    const scoreLabel =
      clampedScore >= 97 ? 'Exceptional'       : clampedScore >= 93 ? 'Outstanding'       :
      clampedScore >= 90 ? 'Excellent'          : clampedScore >= 87 ? 'Very Good'         :
      clampedScore >= 83 ? 'Good'               : clampedScore >= 80 ? 'Above Average'     :
      clampedScore >= 70 ? 'Building Trust'     : clampedScore >= 60 ? 'Needs Improvement' : 'Poor';

    const scoreData = {
      user_id:            userId,
      score:              clampedScore,
      score_grade:        scoreGrade,
      score_label:        scoreLabel,
      payment_score:      paymentScore,
      completion_score:   completionScore,
      social_score:       socialScore,
      verification_score: verificationScore,
      tenure_score:       tenureScore,
      last_calculated_at: new Date().toISOString(),
      // Payment timing stats
      total_payments:     paymentStats.total_payments,
      ontime_payments:    paymentStats.ontime_payments,
      early_payments:     paymentStats.early_payments,
      late_payments:      paymentStats.late_payments,
      missed_payments:    paymentStats.missed_payments,  // Bug 3 fixed: was always omitted
      current_streak:     paymentStats.current_streak,
      best_streak:        paymentStats.best_streak,
      // Loan / vouch stats
      ...stats,
    };

    const { user_id, ...updateFields } = scoreData;

    const { data: updateData, error: updateError } = await this.supabase
      .from('trust_scores')
      .update(updateFields)
      .eq('user_id', userId)
      .select();

    if (updateError) {
      log.error('[TrustScore] Error updating:', updateError);
    }

    if (updateData && updateData.length > 0) {
      log.info(`[TrustScore] Updated score → ${clampedScore} (${scoreGrade})`);
      return updateData[0];
    }

    // No existing row — insert
    log.info(`[TrustScore] No existing record, inserting for user ${userId}`);
    const { data: insertData, error: insertError } = await this.supabase
      .from('trust_scores')
      .insert(scoreData)
      .select();

    if (insertError) {
      log.error('[TrustScore] Error inserting:', insertError);
      if (insertError.code === '23505') {
        return await this.getScore(userId);
      }
      return null;
    }

    if (insertData && insertData.length > 0) {
      log.info(`[TrustScore] Inserted new score: ${clampedScore}`);
      return insertData[0];
    }

    log.error('[TrustScore] Neither update nor insert returned data');
    return null;
  }

  // ─── Payment score (40%) ────────────────────────────────────────────────────
  //
  // Reads every paid instalment and every PAST-DUE unpaid instalment.
  // Returns a 0–100 score and the raw stats needed for trust_scores columns.

  private async calculatePaymentScore(userId: string): Promise<{
    score: number;
    stats: {
      current_streak:  number;
      best_streak:     number;
      ontime_payments: number;
      early_payments:  number;
      late_payments:   number;
      missed_payments: number;   // Bug 3 fix: now returned
      total_payments:  number;
    };
  }> {
    const empty = {
      score: 50,
      stats: {
        current_streak: 0, best_streak: 0,
        ontime_payments: 0, early_payments: 0, late_payments: 0,
        missed_payments: 0, total_payments: 0,
      },
    };

    const { data: loans } = await this.supabase
      .from('loans')
      .select('id')
      .eq('borrower_id', userId);

    if (!loans || loans.length === 0) return empty;

    const loanIds = loans.map((l: any) => l.id);
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Paid instalments
    const { data: paidPayments } = await this.supabase
      .from('payment_schedule')
      .select('due_date, paid_at')
      .in('loan_id', loanIds)
      .eq('is_paid', true);

    // Bug 2 fix: missed/overdue instalments — unpaid and past their due date
    const { data: missedPayments } = await this.supabase
      .from('payment_schedule')
      .select('due_date')
      .in('loan_id', loanIds)
      .eq('is_paid', false)
      .lt('due_date', today);

    const missedCount = missedPayments?.length ?? 0;

    if ((!paidPayments || paidPayments.length === 0) && missedCount === 0) return empty;

    let score = 50;
    let ontime = 0;
    let early  = 0;
    let late   = 0;
    let streak    = 0;
    let maxStreak = 0;

    const sorted = [...(paidPayments || [])].sort((a, b) =>
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

    for (const payment of sorted) {
      const dueDate  = new Date(payment.due_date);
      // If paid_at is NULL (legacy), treat as on-time (neutral assumption)
      const paidDate = payment.paid_at ? new Date(payment.paid_at) : dueDate;
      const daysDiff = Math.floor(
        (paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff < -2) {
        early++;
        score += IMPACTS.PAYMENT_EARLY;
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else if (daysDiff <= 0) {
        ontime++;
        score += IMPACTS.PAYMENT_ONTIME;
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else if (daysDiff <= 7) {
        late++;
        score += IMPACTS.PAYMENT_LATE_1_7_DAYS;
        streak = 0;
      } else if (daysDiff <= 14) {
        late++;
        score += IMPACTS.PAYMENT_LATE_8_14_DAYS;
        streak = 0;
      } else {
        late++;
        score += IMPACTS.PAYMENT_LATE_15_30_DAYS;
        streak = 0;
      }
    }

    // Penalise each missed/overdue instalment (Bug 2 fix)
    score += missedCount * IMPACTS.PAYMENT_MISSED;
    // Each missed instalment also breaks the current streak
    if (missedCount > 0) streak = 0;

    // Streak bonus (on top of per-payment score)
    if      (maxStreak >= 100) score += IMPACTS.STREAK_100;
    else if (maxStreak >= 50)  score += IMPACTS.STREAK_50;
    else if (maxStreak >= 25)  score += IMPACTS.STREAK_25;
    else if (maxStreak >= 10)  score += IMPACTS.STREAK_10;
    else if (maxStreak >= 5)   score += IMPACTS.STREAK_5;

    return {
      score: Math.max(0, Math.min(100, score)),
      stats: {
        current_streak:  streak,
        best_streak:     maxStreak,
        ontime_payments: ontime,
        early_payments:  early,
        late_payments:   late,
        missed_payments: missedCount,   // Bug 3 fix
        total_payments:  (paidPayments?.length ?? 0) + missedCount,
      },
    };
  }

  // ─── Completion score (25%) ─────────────────────────────────────────────────
  //
  // Bug 4 fix: old formula hit 100 after just ONE completed loan.
  // New formula:
  //   rate_bonus    = (completed/total) * 25      → max +25  (rewards consistent completion)
  //   volume_bonus  = min(completed * 4, 40)      → max +40  (rewards many completions)
  //   default_penalty = defaulted * 15            → uncapped downside
  // Max possible: 50 + 25 + 40 = 115 → clamped 100. No artificial cap; 100 is allowed.
  // To max the completion component (100): 10+ completed, 0 defaulted, 100% rate.
  // Overall trust score = weighted sum of 5 components (payment 40%, completion 25%,
  // social 15%, verification 10%, tenure 10%); final score is clamped 0–100.
  // 1 completed / 1 total: 50 + 25 + 4 = 79  ← sensible first-loan score
  // 8 completed / 8 total: 50 + 25 + 32 = 107 → 100  ← takes real track record to max

  private async calculateCompletionScore(userId: string): Promise<number> {
    const { data: loans } = await this.supabase
      .from('loans')
      .select('status')
      .eq('borrower_id', userId);

    if (!loans || loans.length === 0) return 50;

    const total     = loans.length;
    const completed = loans.filter((l: any) => l.status === 'completed').length;
    const defaulted = loans.filter((l: any) => l.status === 'defaulted').length;

    const rateBonus    = total > 0 ? (completed / total) * 25 : 0;
    const volumeBonus  = Math.min(completed * 4, 40);
    const defaultPenalty = defaulted * 15;

    return Math.max(0, Math.min(100, Math.round(50 + rateBonus + volumeBonus - defaultPenalty)));
  }

  // ─── Social score (15%) ─────────────────────────────────────────────────────
  //
  // Bug 1 fix: previously only the VOUCHEE side was computed. The voucher's
  // recalculate() therefore never moved because none of the five components
  // read the given-vouches track record.
  //
  // Now blended:
  //   vouchee_component (60%) — vouches RECEIVED by this user: base 50 + boosts
  //   voucher_component (40%) — vouching TRACK RECORD: completions vs defaults
  //
  // If neither side has data: return 50 (neutral).
  // If only one side has data: that side contributes fully; the other stays neutral.

  private async calculateSocialScore(userId: string): Promise<number> {
    // Bug 6 fix: minimal select — only trust_score_boost needed, no join
    const { data: receivedVouches } = await this.supabase
      .from('vouches')
      .select('trust_score_boost')
      .eq('vouchee_id', userId)
      .eq('status', 'active');

    // Bug 1 fix: also read the vouches this user HAS GIVEN
    const { data: givenVouches } = await this.supabase
      .from('vouches')
      .select('loans_completed, loans_defaulted')
      .eq('voucher_id', userId);

    // ── Vouchee side: how much trust has been extended TO this user ─────────
    let voucheeScore = 50; // neutral when no vouches received
    if (receivedVouches && receivedVouches.length > 0) {
      const totalBoost = receivedVouches.reduce(
        (sum: number, v: any) => sum + (v.trust_score_boost || 0), 0
      );
      // Each vouch contributes up to 10 boost points; sum capped at +50
      voucheeScore = Math.min(100, 50 + Math.min(totalBoost, 50));
    }

    // ── Voucher side: how well has this user's word held up ─────────────────
    //
    // Scoring rationale (Bug 7 fix: previous +4/completion was invisible at 6% of total):
    //
    //   First 3 vouchee completions: +15 each  → proof of good judgment, high signal
    //   Completions 4–7:             + 5 each  → continued track record
    //   Completions 8+:              + 2 each  → diminishing marginal returns, capped ~85
    //   Each vouchee default:        -20        → uncapped, serious endorsement failure
    //
    // While all vouchee loans are still active (no outcomes yet), the voucher side
    // stays neutral at 50 — a clean slate, not a reward and not a penalty.
    let voucherScore = 50; // neutral when no outcomes yet
    if (givenVouches && givenVouches.length > 0) {
      let totalCompleted = 0;
      let totalDefaulted = 0;

      for (const v of givenVouches) {
        totalCompleted += (v as any).loans_completed ?? 0;
        totalDefaulted += (v as any).loans_defaulted ?? 0;
      }

      const totalOutcomes = totalCompleted + totalDefaulted;
      if (totalOutcomes > 0) {
        // Tiered completion bonus: high signal on first few, tapering after
        let completionBonus = 0;
        const tier1 = Math.min(totalCompleted, 3);        // first 3: +15 each
        const tier2 = Math.min(Math.max(0, totalCompleted - 3), 4); // next 4: +5 each
        const tier3 = Math.max(0, totalCompleted - 7);    // beyond 7: +2 each
        completionBonus = tier1 * 15 + tier2 * 5 + tier3 * 2;

        const defaultPenalty = totalDefaulted * 20;       // -20 each, uncapped
        voucherScore = Math.max(0, Math.min(100, 50 + completionBonus - defaultPenalty));
      }
      // If totalOutcomes === 0 (loans still active): keep voucherScore = 50
    }

    // ── Blend ────────────────────────────────────────────────────────────────
    const hasVoucheeData = receivedVouches && receivedVouches.length > 0;
    const hasVoucherData = givenVouches    && givenVouches.length    > 0;

    if (!hasVoucheeData && !hasVoucherData) return 50;

    const blended = voucheeScore * 0.6 + voucherScore * 0.4;
    return Math.max(0, Math.min(100, Math.round(blended)));
  }

  // ─── Verification score (10%) ───────────────────────────────────────────────
  //
  // Starts at 50 (neutral). Verifications add bonus points on top so that
  // new unverified users never drag their overall score below the 50 baseline.

  private async calculateVerificationScore(userId: string): Promise<number> {
    const { data: user } = await this.supabase
      .from('users')
      .select('verification_status, is_verified, selfie_verified, phone_verified, dwolla_customer_id')
      .eq('id', userId)
      .single();

    if (!user) return 50;

    let score = 50;
    if ((user as any).verification_status === 'verified' || (user as any).is_verified) score += 25;
    if ((user as any).selfie_verified)    score += 10;
    if ((user as any).phone_verified)     score +=  8;
    if ((user as any).dwolla_customer_id) score += 12;

    return Math.min(100, score);
  }

  // ─── Tenure score (10%) ─────────────────────────────────────────────────────
  //
  // Starts at 50 for brand-new accounts so that tenure never pushes the
  // combined weighted score below the displayed 50-point default.

  private async calculateTenureScore(userId: string): Promise<number> {
    const { data: user } = await this.supabase
      .from('users')
      .select('created_at')
      .eq('id', userId)
      .single();

    if (!user) return 50;

    const monthsOnPlatform =
      (Date.now() - new Date((user as any).created_at).getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (monthsOnPlatform < 6)  return Math.round(50 + monthsOnPlatform * 2.5);           // 50–65
    if (monthsOnPlatform < 12) return Math.round(65 + (monthsOnPlatform - 6)  * 2.5);    // 65–80
    if (monthsOnPlatform < 24) return Math.round(80 + (monthsOnPlatform - 12) * 1.25);   // 80–95
    return Math.min(100, Math.round(95 + (monthsOnPlatform - 24) * 0.5));                 // 95–100
  }

  // ─── getUserStats ───────────────────────────────────────────────────────────
  //
  // Aggregated counters written to trust_scores columns (not used in scoring itself).

  private async getUserStats(userId: string) {
    const [
      { data: loans },
      { count: vouchesReceived },
      { count: vouchesGiven },
      { data: givenVouches },
    ] = await Promise.all([
      this.supabase.from('loans').select('status, amount, amount_paid').eq('borrower_id', userId),
      this.supabase.from('vouches').select('id', { count: 'exact', head: true }).eq('vouchee_id', userId).eq('status', 'active'),
      this.supabase.from('vouches').select('id', { count: 'exact', head: true }).eq('voucher_id', userId),
      this.supabase.from('vouches').select('loans_defaulted').eq('voucher_id', userId),
    ]);

    const vouchDefaults = (givenVouches || []).reduce(
      (sum: number, v: any) => sum + (v.loans_defaulted || 0), 0
    );

    return {
      total_loans:           (loans as any[])?.length                                                    || 0,
      completed_loans:       (loans as any[])?.filter((l: any) => l.status === 'completed').length       || 0,
      active_loans:          (loans as any[])?.filter((l: any) => l.status === 'active').length          || 0,
      defaulted_loans:       (loans as any[])?.filter((l: any) => l.status === 'defaulted').length       || 0,
      total_amount_borrowed: (loans as any[])?.reduce((s: number, l: any) => s + Number(l.amount), 0)    || 0,
      total_amount_repaid:   (loans as any[])?.reduce((s: number, l: any) => s + Number(l.amount_paid || 0), 0) || 0,
      vouches_received:      vouchesReceived || 0,
      vouches_given:         vouchesGiven    || 0,
      vouch_defaults:        vouchDefaults,
    };
  }

  // ─── recordEvent ────────────────────────────────────────────────────────────
  //
  // Writes a trust_score_events row then triggers a full recalculate.
  // Note: recalculate() does NOT read trust_score_events — it derives the score
  // from raw tables. Events are a permanent audit log / activity feed only.

  async recordEvent(userId: string, event: TrustScoreEvent): Promise<void> {
    log.info(`[TrustScore] Recording event for ${userId}:`, {
      event_type: event.event_type,
      score_impact: event.score_impact,
    });

    try {
      const { error: insertError } = await this.supabase.from('trust_score_events').insert({
        user_id:       userId,
        event_type:    event.event_type,
        score_impact:  event.score_impact,
        title:         event.title,
        description:   event.description,
        loan_id:       event.loan_id       || undefined,
        payment_id:    event.payment_id    || undefined,
        other_user_id: event.other_user_id || undefined,
        vouch_id:      event.vouch_id      || undefined,
        metadata:      event.metadata      || {},
      });

      if (insertError) {
        log.error('[TrustScore] Failed to insert event:', insertError);
        throw insertError;
      }

      log.info('[TrustScore] Event recorded, triggering recalculate...');
      await this.recalculate(userId);
    } catch (error: unknown) {
      log.error('[TrustScore] Error in recordEvent:', {
        message: (error as Error).message,
        details: (error as any).details,
        hint:    (error as any).hint,
      });
      throw error;
    }
  }

  // ─── onPaymentMade ──────────────────────────────────────────────────────────

  async onPaymentMade(
    userId: string,
    loanId: string,
    paymentId: string | undefined,
    amount: number,
    daysFromDue: number   // negative = early, positive = late
  ): Promise<void> {
    let event: TrustScoreEvent;

    if (daysFromDue < -2) {
      event = {
        event_type:   'payment_early',
        score_impact: IMPACTS.PAYMENT_EARLY,
        title:        'Early Payment',
        description:  `Payment of $${amount} made ${Math.abs(daysFromDue)} days early`,
        loan_id:      loanId,
        payment_id:   paymentId,
      };
    } else if (daysFromDue <= 0) {
      event = {
        event_type:   'payment_ontime',
        score_impact: IMPACTS.PAYMENT_ONTIME,
        title:        'On-Time Payment',
        description:  `Payment of $${amount} made on time`,
        loan_id:      loanId,
        payment_id:   paymentId,
      };
    } else if (daysFromDue <= 7) {
      event = {
        event_type:   'payment_late',
        score_impact: IMPACTS.PAYMENT_LATE_1_7_DAYS,
        title:        'Late Payment',
        description:  `Payment of $${amount} made ${daysFromDue} days late`,
        loan_id:      loanId,
        payment_id:   paymentId,
      };
    } else if (daysFromDue <= 14) {
      event = {
        event_type:   'payment_late',
        score_impact: IMPACTS.PAYMENT_LATE_8_14_DAYS,
        title:        'Late Payment',
        description:  `Payment of $${amount} made ${daysFromDue} days late`,
        loan_id:      loanId,
        payment_id:   paymentId,
      };
    } else {
      event = {
        event_type:   'payment_late',
        score_impact: IMPACTS.PAYMENT_LATE_15_30_DAYS,
        title:        'Very Late Payment',
        description:  `Payment of $${amount} made ${daysFromDue} days late`,
        loan_id:      loanId,
        payment_id:   paymentId,
      };
    }

    await this.recordEvent(userId, event);
  }

  // ─── onLoanCompleted ────────────────────────────────────────────────────────

  async onLoanCompleted(userId: string, loanId: string, amount: number): Promise<void> {
    const { data: completedLoans } = await this.supabase
      .from('loans')
      .select('id')
      .eq('borrower_id', userId)
      .eq('status', 'completed');

    const isFirst = completedLoans?.length === 1;

    const event: TrustScoreEvent = {
      event_type:   isFirst ? 'first_loan_completed' : 'loan_completed',
      score_impact: isFirst ? IMPACTS.FIRST_LOAN_COMPLETED : IMPACTS.LOAN_COMPLETED,
      title:        isFirst ? 'First Loan Completed! 🎉' : 'Loan Completed',
      description:  `Successfully repaid $${amount} loan`,
      loan_id:      loanId,
    };

    await this.recordEvent(userId, event);
  }

  // ─── onVouchReceived ────────────────────────────────────────────────────────
  //
  // Bug 5 fix: after recording the event for the vouchee, also recalculate the
  // VOUCHER's score so their vouches_given stat in trust_scores stays current.

  async onVouchReceived(
    voucheeId: string,
    voucherId: string,
    vouchId: string,
    strength: number
  ): Promise<void> {
    const impact = strength >= 7 ? IMPACTS.VOUCH_RECEIVED_STRONG : IMPACTS.VOUCH_RECEIVED_BASE;

    // Update vouchee's score (the person who received the vouch)
    await this.recordEvent(voucheeId, {
      event_type:    'vouch_received',
      score_impact:  impact,
      title:         'New Vouch Received',
      description:   'Someone vouched for your trustworthiness',
      other_user_id: voucherId,
      vouch_id:      vouchId,
    });

    // Bug 5 fix: also refresh the VOUCHER's trust_scores row so that
    // vouches_given and the voucher-side social_score update immediately.
    try {
      await this.recalculate(voucherId);
      log.info(`[TrustScore] Voucher ${voucherId} score refreshed after issuing vouch`);
    } catch (err) {
      // Non-blocking — vouchee event was already recorded successfully
      log.error(`[TrustScore] Failed to refresh voucher score for ${voucherId}:`, err);
    }
  }

  // ─── getEvents / getHistory ─────────────────────────────────────────────────

  async getEvents(userId: string, limit: number = 20): Promise<any[]> {
    const { data } = await this.supabase
      .from('trust_score_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  }

  async getHistory(userId: string, limit: number = 30): Promise<any[]> {
    const { data } = await this.supabase
      .from('trust_score_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  }
}

// ============================================
// VOUCH SERVICE
// ============================================

export class VouchService {
  private supabase: SupabaseClient;
  private trustScoreService: TrustScoreService;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.trustScoreService = new TrustScoreService(supabase);
  }

  async createVouch(
    voucherId: string,
    voucheeId: string,
    data: {
      vouch_type: 'character' | 'guarantee' | 'employment' | 'family';
      relationship: string;
      relationship_details?: string;
      known_years?: number;
      message?: string;
      guarantee_percentage?: number;
      guarantee_max_amount?: number;
      is_public?: boolean;
    }
  ): Promise<{ vouch?: Vouch; error?: string }> {
    if (voucherId === voucheeId) {
      return { error: "You can't vouch for yourself" };
    }

    const { data: existing } = await this.supabase
      .from('vouches')
      .select('id')
      .eq('voucher_id', voucherId)
      .eq('vouchee_id', voucheeId)
      .eq('status', 'active')
      .single();

    if (existing) {
      return { error: 'You have already vouched for this person' };
    }

    // Compute vouch_strength in TypeScript (not DB trigger — consistent across deployments)
    let voucherTier: string = 'tier_1';
    let voucherSuccessRate: number = 100;

    const { data: voucherProfile } = await this.supabase
      .from('users')
      .select('trust_tier, vouching_success_rate')
      .eq('id', voucherId)
      .single();

    if (voucherProfile) {
      voucherTier        = (voucherProfile as any).trust_tier           || 'tier_1';
      voucherSuccessRate = (voucherProfile as any).vouching_success_rate ?? 100;
    }

    const vouchStrength = computeVouchStrength({
      voucherTier,
      relationship:       data.relationship,
      knownYears:         data.known_years,
      vouchType:          data.vouch_type,
      voucherSuccessRate,
    });

    // trust_score_boost: 1-to-1 with vouchStrength (1–10 → up to 10 pts on social score)
    const trustScoreBoost = vouchStrength;

    const { data: vouch, error } = await this.supabase
      .from('vouches')
      .upsert(
        {
          voucher_id:           voucherId,
          vouchee_id:           voucheeId,
          vouch_type:           data.vouch_type,
          relationship:         data.relationship,
          relationship_details: data.relationship_details,
          known_years:          data.known_years,
          message:              data.message,
          guarantee_percentage: data.guarantee_percentage || 0,
          guarantee_max_amount: data.guarantee_max_amount || 0,
          is_public:            data.is_public !== false,
          vouch_strength:       vouchStrength,
          trust_score_boost:    trustScoreBoost,
          status:               'active',
          revoked_at:           null,
          revoked_reason:       null,
          updated_at:           new Date().toISOString(),
        },
        { onConflict: 'voucher_id,vouchee_id', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) {
      log.error('Error creating vouch:', error);
      return { error: (error as Error).message };
    }

    // Update user counters (non-blocking if this fails — vouch already created)
    try {
      const { data: voucheeProfile } = await this.supabase
        .from('users').select('vouch_count, active_vouches_count').eq('id', voucheeId).single();
      await this.supabase.from('users').update({
        vouch_count:          ((voucheeProfile as any)?.vouch_count          ?? 0) + 1,
        active_vouches_count: ((voucheeProfile as any)?.active_vouches_count ?? 0) + 1,
      }).eq('id', voucheeId);

      const { data: vProfile } = await this.supabase
        .from('users').select('vouches_given_total').eq('id', voucherId).single();
      await this.supabase.from('users').update({
        vouches_given_total: ((vProfile as any)?.vouches_given_total ?? 0) + 1,
      }).eq('id', voucherId);
    } catch {
      // Non-blocking
    }

    // onVouchReceived now handles BOTH vouchee and voucher score updates (Bug 5 fix)
    await this.trustScoreService.onVouchReceived(
      voucheeId,
      voucherId,
      (vouch as any).id,
      (vouch as any).vouch_strength
    );

    // Recalculate trust_tier so the matching engine sees the new tier immediately
    await calculateSimpleTrustTier(voucheeId);

    return { vouch: vouch as unknown as Vouch };
  }

  async getVouchesFor(userId: string): Promise<Vouch[]> {
    const { data } = await this.supabase
      .from('vouches')
      .select(`
        *,
        voucher:users!voucher_id(
          id,
          full_name,
          username
        )
      `)
      .eq('vouchee_id', userId)
      .eq('status', 'active')
      .order('vouch_strength', { ascending: false });

    if (data) {
      for (const vouch of data) {
        if ((vouch as any).voucher?.id) {
          const score = await this.trustScoreService.getScore((vouch as any).voucher.id);
          (vouch as any).voucher.trust_score = score;
        }
      }
    }

    return (data || []) as unknown as Vouch[];
  }

  async getVouchesBy(userId: string): Promise<Vouch[]> {
    const { data } = await this.supabase
      .from('vouches')
      .select(`
        *,
        vouchee:users!vouchee_id(
          id,
          full_name,
          username
        )
      `)
      .eq('voucher_id', userId)
      .order('created_at', { ascending: false });

    return (data || []) as unknown as Vouch[];
  }

  async revokeVouch(
    voucherId: string,
    vouchId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('vouches')
      .update({
        status:         'revoked',
        revoked_at:     new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq('id', vouchId)
      .eq('voucher_id', voucherId);

    if (error) {
      return { success: false, error: (error as Error).message };
    }

    const { data: revokedVouch } = await this.supabase
      .from('vouches').select('vouchee_id').eq('id', vouchId).single();

    if ((revokedVouch as any)?.vouchee_id) {
      const voucheeId = (revokedVouch as any).vouchee_id;
      try {
        const { data: voucheeProfile } = await this.supabase
          .from('users').select('vouch_count, active_vouches_count').eq('id', voucheeId).single();
        await this.supabase.from('users').update({
          vouch_count:          Math.max(0, ((voucheeProfile as any)?.vouch_count          ?? 1) - 1),
          active_vouches_count: Math.max(0, ((voucheeProfile as any)?.active_vouches_count ?? 1) - 1),
        }).eq('id', voucheeId);
      } catch {
        // Non-blocking
      }
      await calculateSimpleTrustTier(voucheeId);
      // Also refresh the voucher's score since a vouch being revoked changes their vouches_given count
      try {
        await this.trustScoreService.recalculate(voucherId);
      } catch {
        // Non-blocking
      }
    }

    return { success: true };
  }

  async requestVouch(
    requesterId: string,
    targetUserId?: string,
    targetEmail?: string,
    message?: string,
    suggestedRelationship?: string
  ): Promise<{ request?: Record<string, unknown>; error?: string }> {
    if (!targetUserId && !targetEmail) {
      return { error: 'Must provide either user ID or email' };
    }

    const inviteToken = targetEmail ? this.generateToken() : null;

    const { data, error } = await this.supabase
      .from('vouch_requests')
      .insert({
        requester_id:         requesterId,
        requested_user_id:    targetUserId,
        requested_email:      targetEmail,
        message,
        suggested_relationship: suggestedRelationship,
        invite_token:         inviteToken,
      })
      .select()
      .single();

    if (error) {
      return { error: (error as Error).message };
    }

    return { request: data as Record<string, unknown> };
  }

  async acceptVouchRequest(
    requestId: string,
    userId: string,
    vouchData: {
      vouch_type: 'character' | 'guarantee' | 'employment' | 'family';
      relationship: string;
      relationship_details?: string;
      known_years?: number;
      message?: string;
    }
  ): Promise<{ vouch?: Vouch; error?: string }> {
    const { data: request } = await this.supabase
      .from('vouch_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!request) return { error: 'Request not found' };
    if ((request as any).status !== 'pending') return { error: 'Request is no longer pending' };

    // Only the intended recipient can accept: requested_user_id = userId or invite-by-email (null)
    const requestedUserId = (request as any).requested_user_id;
    if (requestedUserId != null && requestedUserId !== userId) {
      return { error: 'You are not the intended recipient of this vouch request.' };
    }

    const result = await this.createVouch(userId, (request as any).requester_id, vouchData);
    if (result.error) return { error: result.error };

    await this.supabase
      .from('vouch_requests')
      .update({
        status:       'accepted',
        responded_at: new Date().toISOString(),
        vouch_id:     result.vouch?.id,
      })
      .eq('id', requestId);

    return { vouch: result.vouch };
  }

  async declineVouchRequest(
    requestId: string,
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data: req } = await this.supabase
      .from('vouch_requests')
      .select('requested_user_id, status')
      .eq('id', requestId)
      .single();

    if (!req) return { success: false, error: 'Request not found' };
    if ((req as any).status !== 'pending') return { success: false, error: 'Request is no longer pending' };

    // Only the intended recipient can decline: requested_user_id = userId or invite-by-email (null)
    const requestedUserId = (req as any).requested_user_id;
    if (requestedUserId != null && requestedUserId !== userId) {
      return { success: false, error: 'You are not the intended recipient of this vouch request.' };
    }

    const { error } = await this.supabase
      .from('vouch_requests')
      .update({
        status:           'declined',
        responded_at:     new Date().toISOString(),
        response_message: reason,
      })
      .eq('id', requestId);

    if (error) return { success: false, error: (error as Error).message };
    return { success: true };
  }

  private generateToken(): string {
    return Array.from({ length: 32 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        .charAt(Math.floor(Math.random() * 62))
    ).join('');
  }
}

// ============================================
// EXPORTS
// ============================================

export { WEIGHTS, IMPACTS };
