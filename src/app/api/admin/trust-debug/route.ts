/**
 * GET /api/admin/trust-debug?userId=<uuid>
 *
 * Diagnostic endpoint. Returns everything the trust score system reads
 * for a given user: raw query results for every component, what score
 * each component would produce, and the final weighted total.
 *
 * Also diagnoses the vouching pipeline — checks whether loans_completed
 * is correctly set on all vouch rows, and whether the completion pipeline
 * ever fired for each completed loan.
 *
 * Auth: must be the user themselves, or an admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('trust-debug');

export async function GET(request: NextRequest) {
  try {
    const supabase  = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('userId') || user.id;

    // Admins can inspect anyone; non-admins only themselves
    if (targetId !== user.id) {
      const { data: profile } = await supabase.from('users').select('is_admin').eq('id', user.id).single();
      if (!(profile as any)?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const svc = await createServiceRoleClient();
    const today = new Date().toISOString().slice(0, 10);

    // ── 1. User profile ──────────────────────────────────────────────────────
    const { data: userProfile } = await svc.from('users')
      .select('id, full_name, user_type, trust_tier, verification_status, is_verified, selfie_verified, phone_verified, dwolla_customer_id, created_at, vouching_success_rate')
      .eq('id', targetId).single();

    // ── 2. Trust scores row ──────────────────────────────────────────────────
    const { data: trustScore } = await svc.from('trust_scores').select('*').eq('user_id', targetId).single();

    // ── 3. Payment data ──────────────────────────────────────────────────────
    const { data: borrowerLoans } = await svc.from('loans')
      .select('id, status, amount, amount_paid').eq('borrower_id', targetId);
    const loanIds = (borrowerLoans || []).map((l: any) => l.id);

    const paidResult   = loanIds.length ? await svc.from('payment_schedule').select('due_date, paid_at').in('loan_id', loanIds).eq('is_paid', true) : { data: [] };
    const missedResult = loanIds.length ? await svc.from('payment_schedule').select('due_date').in('loan_id', loanIds).eq('is_paid', false).lt('due_date', today) : { data: [] };
    const paidPayments   = paidResult.data   || [];
    const missedPayments = missedResult.data || [];

    // ── 4. Vouch data ────────────────────────────────────────────────────────
    const { data: receivedVouches } = await svc.from('vouches')
      .select('id, voucher_id, trust_score_boost, vouch_strength, status, loans_completed, loans_active')
      .eq('vouchee_id', targetId).eq('status', 'active');

    const { data: givenVouches } = await svc.from('vouches')
      .select('id, vouchee_id, loans_completed, loans_defaulted, loans_active, status, created_at')
      .eq('voucher_id', targetId);

    // ── 5. Compute each component ────────────────────────────────────────────
    const up = userProfile as any;

    // Verification
    let verScore = 50;
    if (up?.verification_status === 'verified' || up?.is_verified) verScore += 25;
    if (up?.selfie_verified)    verScore += 10;
    if (up?.phone_verified)     verScore +=  8;
    if (up?.dwolla_customer_id) verScore += 12;
    verScore = Math.min(100, verScore);

    // Tenure
    const months = up?.created_at
      ? (Date.now() - new Date(up.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30) : 0;
    const tenScore =
      months < 6  ? Math.round(50 + months * 2.5) :
      months < 12 ? Math.round(65 + (months -  6) * 2.5) :
      months < 24 ? Math.round(80 + (months - 12) * 1.25) :
                    Math.min(100, Math.round(95 + (months - 24) * 0.5));

    // Payment
    let payScore = 50, early = 0, ontime = 0, late = 0, streak = 0, maxStreak = 0;
    for (const p of paidPayments) {
      const due  = new Date((p as any).due_date);
      const paid = (p as any).paid_at ? new Date((p as any).paid_at) : due;
      const d    = Math.floor((paid.getTime() - due.getTime()) / 86400000);
      if (d < -2)       { early++;  payScore += 4; streak++; maxStreak = Math.max(maxStreak, streak); }
      else if (d <= 0)  { ontime++; payScore += 2; streak++; maxStreak = Math.max(maxStreak, streak); }
      else if (d <= 7)  { late++;   payScore -= 3; streak = 0; }
      else if (d <= 14) { late++;   payScore -= 5; streak = 0; }
      else              { late++;   payScore -= 8; streak = 0; }
    }
    const missedCnt = missedPayments.length;
    payScore += missedCnt * -15;
    if (missedCnt > 0) streak = 0;
    if (maxStreak >= 100) payScore += 50; else if (maxStreak >= 50) payScore += 35;
    else if (maxStreak >= 25) payScore += 20; else if (maxStreak >= 10) payScore += 10;
    else if (maxStreak >= 5) payScore += 5;
    payScore = Math.max(0, Math.min(100, payScore));

    // Completion
    const totalLoans   = (borrowerLoans || []).length;
    const completedCnt = (borrowerLoans || []).filter((l: any) => l.status === 'completed').length;
    const defaultedCnt = (borrowerLoans || []).filter((l: any) => l.status === 'defaulted').length;
    const rateBonus    = totalLoans > 0 ? (completedCnt / totalLoans) * 25 : 0;
    const volBonus     = Math.min(completedCnt * 4, 40);
    const compScore    = Math.max(0, Math.min(100, Math.round(50 + rateBonus + volBonus - defaultedCnt * 15)));

    // Social
    let voucheeScore = 50;
    if ((receivedVouches || []).length > 0) {
      const boost = (receivedVouches || []).reduce((s: number, v: any) => s + (v.trust_score_boost || 0), 0);
      voucheeScore = Math.min(100, 50 + Math.min(boost, 50));
    }
    let voucherScore = 50;
    let tcTotal = 0, tdTotal = 0;
    for (const v of givenVouches || []) { tcTotal += (v as any).loans_completed ?? 0; tdTotal += (v as any).loans_defaulted ?? 0; }
    if (tcTotal + tdTotal > 0) {
      // Updated Bug 7 formula: tiered completion bonus
      const tier1 = Math.min(tcTotal, 3);
      const tier2 = Math.min(Math.max(0, tcTotal - 3), 4);
      const tier3 = Math.max(0, tcTotal - 7);
      const completionBonus = tier1 * 15 + tier2 * 5 + tier3 * 2;
      voucherScore = Math.max(0, Math.min(100, 50 + completionBonus - tdTotal * 20));
    }
    const hasReceived = (receivedVouches || []).length > 0;
    const hasGiven    = (givenVouches    || []).length > 0;
    const socialScore = (!hasReceived && !hasGiven) ? 50
      : Math.max(0, Math.min(100, Math.round(voucheeScore * 0.6 + voucherScore * 0.4)));

    // Determine weight mode — Bug 7 fix: lenders with no borrower loans use lender weights
    const totalBorrowerLoans = (borrowerLoans || []).length;
    const hasBorrowerLoans = totalBorrowerLoans > 0;
    const w = hasBorrowerLoans
      ? { PAYMENT: 0.40, COMPLETION: 0.25, SOCIAL: 0.15, VERIFICATION: 0.10, TENURE: 0.10 }
      : { PAYMENT: 0.00, COMPLETION: 0.00, SOCIAL: 0.45, VERIFICATION: 0.30, TENURE: 0.25 };

    // Final
    const finalScore = Math.max(0, Math.min(100, Math.round(
      payScore * w.PAYMENT + compScore * w.COMPLETION + socialScore * w.SOCIAL + verScore * w.VERIFICATION + tenScore * w.TENURE
    )));

    // ── Pipeline diagnostics ─────────────────────────────────────────────────
    const completedLoans = (borrowerLoans || []).filter((l: any) => l.status === 'completed');
    const pipelineDiag = [];
    for (const loan of completedLoans) {
      const { data: completionEvents } = await svc.from('trust_score_events')
        .select('id').eq('user_id', targetId).eq('loan_id', (loan as any).id)
        .in('event_type', ['loan_completed', 'first_loan_completed']);
      const { data: vouchGivenEvents } = await svc.from('trust_score_events')
        .select('id, user_id').eq('loan_id', (loan as any).id).eq('event_type', 'vouch_given');
      pipelineDiag.push({
        loan_id: (loan as any).id,
        loan_completion_event_exists: (completionEvents || []).length > 0,
        vouch_given_events_count: (vouchGivenEvents || []).length,
        vouch_given_voucher_ids: (vouchGivenEvents || []).map((e: any) => e.user_id),
        problem: (completionEvents || []).length > 0 && (vouchGivenEvents || []).length === 0
          ? 'LOAN COMPLETED BUT NO vouch_given EVENTS → voucher pipeline never ran for this loan. Vouch may have been created AFTER the loan completed. Run backfill.'
          : null,
      });
    }

    // Vouch health
    const vouchHealth = [];
    for (const v of givenVouches || []) {
      const { data: voucheeCompletedLoans } = await svc.from('loans')
        .select('id').eq('borrower_id', (v as any).vouchee_id).eq('status', 'completed');
      const actual   = (voucheeCompletedLoans || []).length;
      const recorded = (v as any).loans_completed ?? 0;
      vouchHealth.push({
        vouch_id: (v as any).id,
        vouchee_id: (v as any).vouchee_id,
        vouch_status: (v as any).status,
        vouch_created_at: (v as any).created_at,
        recorded_loans_completed: recorded,
        actual_vouchee_completed_loans: actual,
        in_sync: recorded === actual,
        needs_backfill: recorded < actual,
      });
    }

    const problems: string[] = [
      ...pipelineDiag.filter((d: any) => d.problem).map((d: any) => d.problem),
      ...vouchHealth.filter((h: any) => h.needs_backfill).map((h: any) =>
        `Vouch ${(h.vouch_id as string).slice(0,8)}: recorded=${h.recorded_loans_completed} but vouchee has ${h.actual_vouchee_completed_loans} completed loans → POST /api/admin/backfill-vouches`
      ),
      ...(trustScore && trustScore.score !== finalScore
        ? [`Score mismatch: DB has ${trustScore.score} but formula computes ${finalScore} → POST /api/trust-score to refresh`]
        : []
      ),
    ];

    return NextResponse.json({
      user_id: targetId,
      stored_score:    trustScore,
      computed_score: {
        payment_score:      payScore,
        completion_score:   compScore,
        social_score:       socialScore,
        verification_score: verScore,
        tenure_score:       tenScore,
        final:              finalScore,
        matches_stored:     trustScore?.score === finalScore,
        weight_mode:        hasBorrowerLoans ? 'borrower (payment 40%, completion 25%, social 15%, ver 10%, tenure 10%)' : 'lender (social 45%, verification 30%, tenure 25%, payment 0%, completion 0%)',
      },
      social_score_breakdown: {
        vouchee_side:                voucheeScore,
        voucher_side:                voucherScore,
        has_received_vouches:        hasReceived,
        has_given_vouches:           hasGiven,
        given_loans_completed_total: tcTotal,
        given_loans_defaulted_total: tdTotal,
      },
      payment_breakdown:  { early, ontime, late, missed: missedCnt, streak, max_streak: maxStreak, paid_total: paidPayments.length },
      loan_breakdown:     { total: totalLoans, completed: completedCnt, defaulted: defaultedCnt, active: (borrowerLoans||[]).filter((l:any)=>l.status==='active').length },
      vouches_received:   receivedVouches,
      vouches_given:      givenVouches,
      verification:       { is_verified: up?.is_verified, verification_status: up?.verification_status, selfie_verified: up?.selfie_verified, phone_verified: up?.phone_verified, bank_connected: !!up?.dwolla_customer_id, score: verScore },
      tenure_months:      Math.round(months * 10) / 10,
      pipeline_diagnostics: pipelineDiag,
      vouch_health:         vouchHealth,
      problems_found:       problems,
      all_clear:            problems.length === 0,
    });
  } catch (err: any) {
    log.error('[trust-debug]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
