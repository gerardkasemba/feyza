import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { calculateSimpleTrustTier, getStoredTier } from '@/lib/trust/simple-tier';

/**
 * GET /api/borrower/loan-power
 *
 * Returns the current user's borrowing capacity based on their trust tier:
 * - Their tier name and number
 * - Maximum amount any active lender currently offers for that tier
 * - How many active lenders serve that tier
 * - What they'd unlock at the next tier
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = await createServiceRoleClient();

    // 1. Get borrower's current tier
    const { data: profile } = await supabase
      .from('users')
      .select('trust_tier, vouch_count, trust_tier_updated_at')
      .eq('id', user.id)
      .single();

    const isStale =
      !profile?.trust_tier_updated_at ||
      Date.now() - new Date(profile.trust_tier_updated_at).getTime() > 60 * 60 * 1000;

    const tierData = isStale
      ? await calculateSimpleTrustTier(user.id)
      : (await getStoredTier(user.id)) ?? (await calculateSimpleTrustTier(user.id));

    const currentTier = tierData.tier;
    const vouchCount = tierData.vouchCount;
    const nextTierVouches = tierData.nextTierVouches;

    // 2. Query lender_tier_policies for this tier
    const { data: tierPolicies } = await serviceSupabase
      .from('lender_tier_policies')
      .select('lender_id, max_loan_amount, interest_rate, is_active')
      .eq('tier_id', currentTier)
      .eq('is_active', true);

    let activeLenderCount = 0;
    let maxBusinessAmount = 0;
    let minInterestRate: number | null = null;

    if (tierPolicies && tierPolicies.length > 0) {
      const lenderIds = tierPolicies.map((p: any) => p.lender_id);

      const { data: activePrefs } = await serviceSupabase
        .from('lender_preferences')
        .select('user_id, capital_pool, capital_reserved')
        .in('user_id', lenderIds)
        .eq('is_active', true);

      const activeLenderIds = new Set(
        (activePrefs ?? [])
          .filter((lp: any) => (lp.capital_pool ?? 0) - (lp.capital_reserved ?? 0) > 0)
          .map((lp: any) => lp.user_id)
      );

      for (const policy of tierPolicies) {
        if (!activeLenderIds.has(policy.lender_id)) continue;
        activeLenderCount++;
        if (policy.max_loan_amount > maxBusinessAmount) {
          maxBusinessAmount = policy.max_loan_amount;
        }
        if (minInterestRate === null || policy.interest_rate < minInterestRate) {
          minInterestRate = policy.interest_rate;
        }
      }
    }

    // 3. Backward-compat: business lenders with no tier policies (global max_amount)
    // For lenders that haven't configured per-tier policies we estimate what a
    // borrower at `currentTier` can actually get:
    //   - tier_1 (lowest trust) → use first_time_borrower_limit, NOT max_amount.
    //     max_amount is the absolute ceiling for any borrower; showing it to a
    //     new Tier 1 user is misleading because the matching engine would cap them
    //     at first_time_borrower_limit regardless.
    //   - tier_2+ → use max_amount (they've proven themselves).
    const { data: bizPrefsNoPolicy } = await serviceSupabase
      .from('lender_preferences')
      .select('user_id, max_amount, first_time_borrower_limit, allow_first_time_borrowers, interest_rate, capital_pool, capital_reserved')
      .not('business_id', 'is', null)
      .eq('is_active', true);

    if (bizPrefsNoPolicy && bizPrefsNoPolicy.length > 0) {
      const { data: allTierPolicies } = await serviceSupabase
        .from('lender_tier_policies')
        .select('lender_id');

      const lendersWithPolicies = new Set((allTierPolicies ?? []).map((p: any) => p.lender_id));

      for (const lp of bizPrefsNoPolicy) {
        if (lendersWithPolicies.has(lp.user_id)) continue;
        const available = (lp.capital_pool ?? 0) - (lp.capital_reserved ?? 0);
        if (available <= 0) continue;

        // For Tier 1: use first_time_borrower_limit (or a safe default if unset)
        // For Tier 2+: use max_amount
        const effectiveLimit =
          currentTier === 'tier_1'
            ? (lp.allow_first_time_borrowers === false
                ? 0 // Lender doesn't accept new borrowers — don't count them
                : (lp.first_time_borrower_limit ?? lp.max_amount ?? 0))
            : (lp.max_amount ?? 0);

        if (effectiveLimit <= 0) continue;

        activeLenderCount++;
        if (effectiveLimit > maxBusinessAmount) {
          maxBusinessAmount = effectiveLimit;
        }
        if (minInterestRate === null || (lp.interest_rate ?? 100) < minInterestRate) {
          minInterestRate = lp.interest_rate ?? null;
        }
      }
    }

    // 4. Next tier preview
    const nextTierMap: Record<string, string | null> = {
      tier_1: 'tier_2', tier_2: 'tier_3', tier_3: 'tier_4', tier_4: null,
    };
    const nextTier = nextTierMap[currentTier];
    let nextTierMaxAmount = 0;
    let nextTierLenderCount = 0;

    if (nextTier) {
      const { data: nextPolicies } = await serviceSupabase
        .from('lender_tier_policies')
        .select('lender_id, max_loan_amount')
        .eq('tier_id', nextTier)
        .eq('is_active', true);

      if (nextPolicies && nextPolicies.length > 0) {
        nextTierLenderCount = nextPolicies.length;
        nextTierMaxAmount = Math.max(...nextPolicies.map((p: any) => p.max_loan_amount));
      }
    }

    const tierNameMap: Record<string, string> = {
      tier_1: 'Low Trust', tier_2: 'Building Trust',
      tier_3: 'Established Trust', tier_4: 'High Trust',
    };
    const nextTierNameMap: Record<string, string> = {
      tier_2: 'Building Trust', tier_3: 'Established Trust', tier_4: 'High Trust',
    };

    return NextResponse.json({
      tier: currentTier,
      tierNumber: tierData.tierNumber,
      tierName: tierNameMap[currentTier] ?? 'Unknown',
      vouchCount,
      nextTierVouches,
      businessLenders: {
        activeLenderCount,
        maxAmount: maxBusinessAmount,
        minInterestRate,
      },
      nextTier: nextTier
        ? {
            tier: nextTier,
            tierName: nextTierNameMap[nextTier] ?? 'Next Tier',
            lenderCount: nextTierLenderCount,
            maxAmount: nextTierMaxAmount,
            vouchesNeeded: nextTierVouches,
          }
        : null,
      personalLoansUnlimited: true,
    });
  } catch (error: any) {
    console.error('[GET /api/borrower/loan-power]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
