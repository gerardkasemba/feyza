import { createServiceRoleClientDirect } from '@/lib/supabase/server';

export interface SimpleTrustTier {
  tier: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4';
  tierNumber: number;
  tierName: string;
  vouchCount: number;
  nextTierVouches: number; // 0 when at max tier
}

/**
 * Calculate and persist a user's simple trust tier based on active vouch count.
 * Uses vouchee_id (the actual DB column name).
 */
export async function calculateSimpleTrustTier(userId: string): Promise<SimpleTrustTier> {
  const supabase = createServiceRoleClientDirect();

  // Count active vouches received by this user
  const { count } = await supabase
    .from('vouches')
    .select('*', { count: 'exact', head: true })
    .eq('vouchee_id', userId)
    .eq('status', 'active');

  const vouchCount = count ?? 0;

  let tier: SimpleTrustTier['tier'];
  let tierNumber: number;
  let tierName: string;
  let nextTierVouches: number;

  if (vouchCount >= 11) {
    tier = 'tier_4';
    tierNumber = 4;
    tierName = 'High Trust';
    nextTierVouches = 0;
  } else if (vouchCount >= 6) {
    tier = 'tier_3';
    tierNumber = 3;
    tierName = 'Established Trust';
    nextTierVouches = 11 - vouchCount;
  } else if (vouchCount >= 3) {
    tier = 'tier_2';
    tierNumber = 2;
    tierName = 'Building Trust';
    nextTierVouches = 6 - vouchCount;
  } else {
    tier = 'tier_1';
    tierNumber = 1;
    tierName = 'Low Trust';
    nextTierVouches = 3 - vouchCount;
  }

  // Persist to users table (fire-and-forget; non-blocking for callers)
  void (async () => {
    const { error } = await supabase
      .from('users')
      .update({
        trust_tier: tier,
        vouch_count: vouchCount,
        active_vouches_count: vouchCount,
        trust_tier_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('[SimpleTier] Failed to persist tier:', error.message);
    }
  })();

  return { tier, tierNumber, tierName, vouchCount, nextTierVouches };
}

/** Read tier directly from the users row (fast path, no vouch count query). */
export async function getStoredTier(userId: string): Promise<SimpleTrustTier | null> {
  const supabase = createServiceRoleClientDirect();

  const { data } = await supabase
    .from('users')
    .select('trust_tier, vouch_count')
    .eq('id', userId)
    .single();

  if (!data?.trust_tier) return null;

  const vouchCount = data.vouch_count ?? 0;

  const tierMap: Record<string, { tierNumber: number; tierName: string }> = {
    tier_1: { tierNumber: 1, tierName: 'Low Trust' },
    tier_2: { tierNumber: 2, tierName: 'Building Trust' },
    tier_3: { tierNumber: 3, tierName: 'Established Trust' },
    tier_4: { tierNumber: 4, tierName: 'High Trust' },
  };

  const meta = tierMap[data.trust_tier] ?? tierMap['tier_1'];

  const nextTierVouches =
    data.trust_tier === 'tier_1'
      ? 3 - vouchCount
      : data.trust_tier === 'tier_2'
        ? 6 - vouchCount
        : data.trust_tier === 'tier_3'
          ? 11 - vouchCount
          : 0;

  return {
    tier: data.trust_tier as SimpleTrustTier['tier'],
    tierNumber: meta.tierNumber,
    tierName: meta.tierName,
    vouchCount,
    nextTierVouches: Math.max(0, nextTierVouches),
  };
}