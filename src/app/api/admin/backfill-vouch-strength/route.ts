import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { computeVouchStrength, TrustScoreService } from '@/lib/trust-score';
import { logger } from '@/lib/logger';

const log = logger('backfill-vouch-strength');

/**
 * POST /api/admin/backfill-vouch-strength
 *
 * One-time backfill to recalculate vouch_strength and trust_score_boost
 * on all active vouches, then recalculate trust scores for all affected users.
 *
 * Auth: requires ADMIN_SECRET in Authorization header.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceRoleClient();
    const trustService = new TrustScoreService(supabase);

    // 1. Get all active vouches with their voucher profiles
    const { data: vouches, error: vouchError } = await supabase
      .from('vouches')
      .select(`
        id, voucher_id, vouchee_id, vouch_type, relationship, known_years,
        vouch_strength, trust_score_boost
      `)
      .eq('status', 'active');

    if (vouchError) throw vouchError;
    if (!vouches || vouches.length === 0) {
      return NextResponse.json({ message: 'No active vouches found', updated: 0 });
    }

    log.info(`[Backfill] Found ${vouches.length} active vouches`);

    let updated = 0;
    let errors: string[] = [];
    const affectedUserIds = new Set<string>();

    for (const vouch of vouches) {
      try {
        // Get voucher's current tier and success rate
        const { data: voucher } = await supabase
          .from('users')
          .select('trust_tier, vouching_success_rate')
          .eq('id', vouch.voucher_id)
          .single();

        if (!voucher) continue;

        const newStrength = computeVouchStrength({
          voucherTier: voucher.trust_tier || 'tier_1',
          relationship: vouch.relationship || '',
          knownYears: vouch.known_years,
          vouchType: vouch.vouch_type || 'character',
          voucherSuccessRate: voucher.vouching_success_rate ?? 100,
        });

        const newBoost = newStrength;

        if (newStrength !== vouch.vouch_strength || newBoost !== vouch.trust_score_boost) {
          await supabase
            .from('vouches')
            .update({
              vouch_strength: newStrength,
              trust_score_boost: newBoost,
              updated_at: new Date().toISOString(),
            })
            .eq('id', vouch.id);

          log.info(`[Backfill] vouch ${vouch.id}: strength ${vouch.vouch_strength} → ${newStrength}, boost ${vouch.trust_score_boost} → ${newBoost}`);
          updated++;
        }

        // Track affected users for score recalculation
        affectedUserIds.add(vouch.vouchee_id);
        affectedUserIds.add(vouch.voucher_id);
      } catch (err: unknown) {
        errors.push(`vouch ${vouch.id}: ${(err as Error).message}`);
      }
    }

    // 2. Recalculate trust scores for all affected users
    log.info(`[Backfill] Recalculating trust scores for ${affectedUserIds.size} users`);
    let scoresUpdated = 0;

    for (const userId of affectedUserIds) {
      try {
        await trustService.recalculate(userId);
        scoresUpdated++;
      } catch (err: unknown) {
        errors.push(`score recalc ${userId}: ${(err as Error).message}`);
      }
    }

    return NextResponse.json({
      message: 'Backfill complete',
      totalVouches: vouches.length,
      vouchesUpdated: updated,
      scoresRecalculated: scoresUpdated,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: unknown) {
    log.error('[Backfill] Fatal error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
