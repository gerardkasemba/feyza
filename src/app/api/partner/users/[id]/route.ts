// GET /api/partner/users/[id]
//
// Returns a user's full partner profile including trust score and KYC status.
// Capital Circle uses this to display member profiles and check eligibility.
// Protected by X-Partner-Secret header.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPartnerSecret, toPartnerUser } from '../../_auth';
import { logger } from '@/lib/logger';

const log = logger('partner-users-id');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = verifyPartnerSecret(req);
  if (guard) return guard;

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    // Fetch user profile
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select(`
        id, email, full_name, avatar_url, phone, phone_number, username,
        verification_status, is_blocked, is_suspended,
        trust_tier, vouch_count, active_vouches_count, created_at
      `)
      .eq('id', id)
      .single();

    if (userError || !userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch trust score if it exists
    const { data: trustScore } = await supabase
      .from('trust_scores')
      .select(`
        score, score_grade, score_label,
        payment_score, completion_score, social_score, verification_score, tenure_score,
        total_loans, completed_loans, defaulted_loans,
        total_payments, ontime_payments, early_payments, late_payments, missed_payments,
        total_amount_borrowed, total_amount_repaid,
        current_streak, best_streak,
        vouches_received, vouches_given, vouch_defaults,
        last_calculated_at
      `)
      .eq('user_id', id)
      .maybeSingle();

    const user = toPartnerUser(userRow);

    // Map trust_score fields to match Capital Circle's FeyzaTrustScore shape
    const formattedTrustScore = trustScore ? {
      // Capital Circle uses 'overall' instead of 'score'
      overall:            trustScore.score,
      score_grade:        trustScore.score_grade,
      score_label:        trustScore.score_label,
      components: {
        payment_history:   trustScore.payment_score    ?? 50,
        loan_completion:   trustScore.completion_score  ?? 50,
        community_vouches: trustScore.social_score      ?? 50,
        verification:      trustScore.verification_score ?? 0,
        platform_tenure:   trustScore.tenure_score      ?? 0,
      },
      // Mirror user trust data into trust_score for convenience
      tier:        user.trust_tier,
      vouch_count: user.vouch_count,
      // Raw stats
      total_loans:           trustScore.total_loans           ?? 0,
      completed_loans:       trustScore.completed_loans        ?? 0,
      defaulted_loans:       trustScore.defaulted_loans        ?? 0,
      total_payments:        trustScore.total_payments         ?? 0,
      ontime_payments:       trustScore.ontime_payments        ?? 0,
      early_payments:        trustScore.early_payments         ?? 0,
      late_payments:         trustScore.late_payments          ?? 0,
      missed_payments:       trustScore.missed_payments        ?? 0,
      total_amount_borrowed: trustScore.total_amount_borrowed  ?? 0,
      total_amount_repaid:   trustScore.total_amount_repaid    ?? 0,
      current_streak:        trustScore.current_streak         ?? 0,
      best_streak:           trustScore.best_streak            ?? 0,
      vouches_received:      trustScore.vouches_received       ?? 0,
      vouches_given:         trustScore.vouches_given          ?? 0,
      vouch_defaults:        trustScore.vouch_defaults         ?? 0,
      last_calculated_at:    trustScore.last_calculated_at     ?? null,
    } : {
      overall: 50, score_grade: 'C', score_label: 'Building Trust',
      components: { payment_history: 50, loan_completion: 50, community_vouches: 50, verification: 0, platform_tenure: 0 },
      tier: user.trust_tier, vouch_count: user.vouch_count,
      total_loans: 0, completed_loans: 0, defaulted_loans: 0,
      total_payments: 0, ontime_payments: 0, early_payments: 0, late_payments: 0, missed_payments: 0,
      total_amount_borrowed: 0, total_amount_repaid: 0,
      current_streak: 0, best_streak: 0,
      vouches_received: 0, vouches_given: 0, vouch_defaults: 0,
      last_calculated_at: null,
    };

    return NextResponse.json({ user, trust_score: formattedTrustScore });
  } catch (err: unknown) {
    log.error(`[Partner /users/${id}]`, err);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}
