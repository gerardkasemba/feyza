import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClientDirect } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('lender-tier-policies');

const VALID_TIERS = ['tier_1', 'tier_2', 'tier_3', 'tier_4'] as const;

/**
 * GET /api/lender/tier-policies
 * Returns all tier policies for the authenticated lender.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: policies, error } = await supabase
      .from('lender_tier_policies')
      .select('*')
      .eq('lender_id', user.id)
      .order('tier_id');

    if (error) throw error;

    return NextResponse.json({ policies: policies ?? [] });
  } catch (error: unknown) {
    log.error('[GET /api/lender/tier-policies]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * PUT /api/lender/tier-policies
 * Upserts all 4 tier policies for the authenticated lender in one shot.
 *
 * Body: Array of { tier_id, interest_rate, max_loan_amount, is_active }
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body: Array<{
      tier_id: string;
      interest_rate: number;
      max_loan_amount: number;
      is_active: boolean;
    }> = await request.json();

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: 'Body must be a non-empty array of policies.' }, { status: 400 });
    }

    // Validate
    for (const policy of body) {
      if (!VALID_TIERS.includes(policy.tier_id as any)) {
        return NextResponse.json({ error: `Invalid tier_id: ${policy.tier_id}` }, { status: 400 });
      }
      if (policy.interest_rate < 0 || policy.interest_rate > 100) {
        return NextResponse.json({ error: 'interest_rate must be 0–100.' }, { status: 400 });
      }
      if (policy.max_loan_amount < 1) {
        return NextResponse.json({ error: 'max_loan_amount must be positive.' }, { status: 400 });
      }
    }

    const rows = body.map((p) => ({
      lender_id: user.id,
      tier_id: p.tier_id,
      interest_rate: p.interest_rate,
      max_loan_amount: p.max_loan_amount,
      is_active: p.is_active,
    }));

    const { data, error } = await supabase
      .from('lender_tier_policies')
      .upsert(rows, { onConflict: 'lender_id,tier_id' })
      .select();

    if (error) throw error;

    return NextResponse.json({ policies: data });
  } catch (error: unknown) {
    log.error('[PUT /api/lender/tier-policies]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
