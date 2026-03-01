import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('backfill-trust-tiers');

/**
 * POST /api/admin/backfill-trust-tiers
 *
 * One-time backfill to fix stale trust tiers and vouch strengths caused by
 * calculateSimpleTrustTier's fire-and-forget pattern on Vercel serverless.
 *
 * What it does:
 *   1. For every user with active vouches received → recalculate trust_tier
 *   2. For every active vouch → recalculate vouch_strength and trust_score_boost
 *   3. For every user with active vouches (given or received) → recalculate trust score
 *
 * Authorization: Bearer <ADMIN_SECRET>
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();

  const results = {
    tiersRecalculated: 0,
    vouchesRecalculated: 0,
    trustScoresRecalculated: 0,
    errors: [] as string[],
  };

  try {
    // ── Step 1: Recalculate trust tiers for all users with active vouches ──
    log.info('[BackfillTiers] Step 1: Recalculating trust tiers...');

    // Get all unique vouchee_ids with active vouches
    const { data: vouchees } = await supabase
      .from('vouches')
      .select('vouchee_id')
      .eq('status', 'active');

    const uniqueVoucheeIds = [...new Set((vouchees || []).map(v => v.vouchee_id))];
    log.info(`[BackfillTiers] Found ${uniqueVoucheeIds.length} users with active vouches`);

    for (const userId of uniqueVoucheeIds) {
      try {
        // Count active vouches for this user
        const { count } = await supabase
          .from('vouches')
          .select('*', { count: 'exact', head: true })
          .eq('vouchee_id', userId)
          .eq('status', 'active');

        const vouchCount = count ?? 0;

        let tier: string;
        if (vouchCount >= 11) tier = 'tier_4';
        else if (vouchCount >= 6) tier = 'tier_3';
        else if (vouchCount >= 3) tier = 'tier_2';
        else tier = 'tier_1';

        await supabase
          .from('users')
          .update({
            trust_tier: tier,
            vouch_count: vouchCount,
            active_vouches_count: vouchCount,
            trust_tier_updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        results.tiersRecalculated++;
        log.info(`[BackfillTiers] User ${userId.slice(0, 8)}: tier=${tier}, vouches=${vouchCount}`);
      } catch (err) {
        const msg = `Tier for ${userId}: ${(err as Error).message}`;
        results.errors.push(msg);
        log.error(`[BackfillTiers] ${msg}`);
      }
    }

    // ── Step 2: Recalculate vouch_strength for all active vouches ──────────
    log.info('[BackfillTiers] Step 2: Recalculating vouch strengths...');

    const { data: allVouches } = await supabase
      .from('vouches')
      .select('id, voucher_id, vouchee_id, relationship, known_years, vouch_type, vouch_strength')
      .eq('status', 'active');

    if (allVouches && allVouches.length > 0) {
      const { computeVouchStrength } = await import('@/lib/trust-score');

      // Cache voucher profiles to avoid repeated queries
      const voucherCache = new Map<string, { trust_tier: string; vouching_success_rate: number }>();

      for (const vouch of allVouches) {
        try {
          let voucherProfile = voucherCache.get(vouch.voucher_id);
          if (!voucherProfile) {
            const { data: profile } = await supabase
              .from('users')
              .select('trust_tier, vouching_success_rate')
              .eq('id', vouch.voucher_id)
              .single();

            voucherProfile = {
              trust_tier: profile?.trust_tier || 'tier_1',
              vouching_success_rate: profile?.vouching_success_rate ?? 100,
            };
            voucherCache.set(vouch.voucher_id, voucherProfile);
          }

          const newStrength = computeVouchStrength({
            voucherTier: voucherProfile.trust_tier,
            relationship: vouch.relationship || '',
            knownYears: vouch.known_years,
            vouchType: vouch.vouch_type || 'character',
            voucherSuccessRate: voucherProfile.vouching_success_rate,
          });

          const newBoost = newStrength;

          if (newStrength !== vouch.vouch_strength) {
            await supabase
              .from('vouches')
              .update({
                vouch_strength: newStrength,
                trust_score_boost: newBoost,
                updated_at: new Date().toISOString(),
              })
              .eq('id', vouch.id);

            log.info(
              `[BackfillTiers] Vouch ${vouch.id.slice(0, 8)}: strength ${vouch.vouch_strength} → ${newStrength}`
            );
          }

          results.vouchesRecalculated++;
        } catch (err) {
          const msg = `Vouch ${vouch.id}: ${(err as Error).message}`;
          results.errors.push(msg);
          log.error(`[BackfillTiers] ${msg}`);
        }
      }
    }

    // ── Step 3: Recalculate trust scores for all affected users ────────────
    log.info('[BackfillTiers] Step 3: Recalculating trust scores...');

    const allVoucherIds = [...new Set((allVouches || []).map(v => v.voucher_id))];
    const allAffectedUsers = [...new Set([...uniqueVoucheeIds, ...allVoucherIds])];

    const { TrustScoreService } = await import('@/lib/trust-score');
    const trustService = new TrustScoreService(supabase);

    for (const userId of allAffectedUsers) {
      try {
        await trustService.recalculate(userId);
        results.trustScoresRecalculated++;
      } catch (err) {
        const msg = `Trust score for ${userId}: ${(err as Error).message}`;
        results.errors.push(msg);
        log.error(`[BackfillTiers] ${msg}`);
      }
    }

    log.info('[BackfillTiers] Complete:', results);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    log.error('[BackfillTiers] Fatal error:', error);
    return NextResponse.json(
      { error: (error as Error).message, partial_results: results },
      { status: 500 }
    );
  }
}
