import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { calculateSimpleTrustTier, getStoredTier } from '@/lib/trust/simple-tier';
import { logger } from '@/lib/logger';

const log = logger('trust-tier');

/**
 * GET /api/trust/tier
 * Returns the current user's simple trust tier.
 * Uses the stored value first (fast), recalculates if stale (> 1 hour).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check how stale the stored value is
    const { data: profile } = await supabase
      .from('users')
      .select('trust_tier, vouch_count, trust_tier_updated_at')
      .eq('id', user.id)
      .single();

    const isStale =
      !profile?.trust_tier_updated_at ||
      Date.now() - new Date(profile.trust_tier_updated_at).getTime() > 60 * 60 * 1000;

    const tier = isStale
      ? await calculateSimpleTrustTier(user.id)
      : await getStoredTier(user.id) ?? await calculateSimpleTrustTier(user.id);

    return NextResponse.json({ tier });
  } catch (error: unknown) {
    log.error('[GET /api/trust/tier]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
