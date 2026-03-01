import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { calculateSimpleTrustTier, getStoredTier } from '@/lib/trust/simple-tier';
import { logger } from '@/lib/logger';

const log = logger('borrower-loan-power');

/** Tier policy row from lender_tier_policies */
interface TierPolicy {
  lender_id: string;
  max_loan_amount: number;
  interest_rate: number;
  [key: string]: unknown;
}

/** Lender preference row for capital availability check */
interface LenderPrefCapital {
  user_id: string;
  capital_pool: number | null;
  capital_reserved: number | null;
}


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
      // Display uses ALL active tier policies — no capital-pool gate here.
      // The loan-power card shows what's *possible* for this borrower's tier.
      // The matching engine (matching/route.ts) enforces live capital availability.
      // Gating here caused lenders whose capital_pool was 0 (not yet set) to be
      // invisible to borrowers, making the card show stale backward-compat lenders.
      for (const policy of tierPolicies as unknown as TierPolicy[]) {
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
    // ONLY run if Block 1 found zero tier policies for this tier.
    // If tier policies exist, they are the authoritative limits — don't let legacy
    // lender_preferences.max_amount override them (a business row with user_id=null
    // would slip through the policy-exclusion check and replace $100 with $500).
    if (activeLenderCount > 0) {
      // Tier policies found — skip backward-compat block entirely.
    } else {
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
    } // end else (no tier policies found — backward-compat block)

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
        nextTierMaxAmount = Math.max(...(nextPolicies as unknown as TierPolicy[]).map((p: any) => p.max_loan_amount));
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
  } catch (error: unknown) {
    log.error('[GET /api/borrower/loan-power]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
