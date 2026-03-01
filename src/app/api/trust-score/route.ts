import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { TrustScoreService } from '@/lib/trust-score';
import { logger } from '@/lib/logger';

const log = logger('trust-score');

// GET: Get trust score for a user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.id;

    const serviceClient = await createServiceRoleClient();
    const trustService = new TrustScoreService(serviceClient);

    let score = await trustService.getScore(userId);
    const forceRefresh = searchParams.get('refresh') === '1';

    if (!score) {
      // Create score for user if doesn't exist
      score = await trustService.recalculate(userId);
    } else {
      // Auto-recalculate if score is stale (>2 minutes) or explicitly requested
      // Shorter window so dashboard reflects recent payments/completions quickly
      const lastCalc = score.last_calculated_at ? new Date(score.last_calculated_at) : new Date(0);
      const minutesSince = (Date.now() - lastCalc.getTime()) / 60000;
      if (forceRefresh || minutesSince > 2) {
        log.info(`[TrustScore API] Recalculating — ${forceRefresh ? 'forced' : `${Math.round(minutesSince)}m stale`}`);
        score = await trustService.recalculate(userId) ?? score;
      }
    }

    if (!score) {
      return NextResponse.json({ error: 'Failed to calculate score' }, { status: 500 });
    }

    // Also get recent events
    const events = await trustService.getEvents(userId, 10);

    // Get vouches received (people who vouched for this user) — fetch names from public.users by ID
    const { data: vouchesRaw } = await serviceClient
      .from('vouches')
      .select('id, vouch_type, relationship, vouch_strength, trust_score_boost, created_at, voucher_id')
      .eq('vouchee_id', userId)
      .eq('status', 'active')
      .order('vouch_strength', { ascending: false })
      .limit(5);
    const voucherIds = [...new Set((vouchesRaw ?? []).map((v: { voucher_id?: string }) => v.voucher_id).filter(Boolean))] as string[];
    let voucherMap: Record<string, { id: string; full_name: string; username?: string }> = {};
    if (voucherIds.length > 0) {
      const { data: voucherUsers } = await serviceClient
        .from('users')
        .select('id, full_name, username')
        .in('id', voucherIds);
      const pick = (u: { full_name?: string | null; username?: string | null }) =>
        (u?.full_name?.trim()) || (u?.username?.trim()) || 'Someone';
      voucherMap = (voucherUsers ?? []).reduce(
        (acc, u) => {
          acc[u.id] = { id: u.id, full_name: pick(u), username: u.username ?? undefined };
          return acc;
        },
        {} as Record<string, { id: string; full_name: string; username?: string }>
      );
    }
    const vouches = (vouchesRaw ?? []).map((v: { voucher_id?: string } & Record<string, unknown>) => ({
      ...v,
      voucher: v.voucher_id
        ? (voucherMap[v.voucher_id] ?? { id: v.voucher_id, full_name: 'Someone', username: undefined })
        : { id: '', full_name: 'Someone', username: undefined },
    }));

    // When viewing own profile, also get people you've vouched for (your vouchees)
    // Fetch from public.users by ID so names always come from the same table
    let myVouchees: unknown[] = [];
    if (userId === user.id) {
      const { data: given } = await serviceClient
        .from('vouches')
        .select('id, vouch_type, relationship, vouch_strength, trust_score_boost, created_at, status, vouchee_id')
        .eq('voucher_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      const rows = given || [];
      const voucheeIds = [...new Set(rows.map((r: { vouchee_id?: string }) => r.vouchee_id).filter(Boolean))] as string[];
      let voucheeMap: Record<string, { id: string; full_name: string; username?: string }> = {};
      if (voucheeIds.length > 0) {
        const { data: usersRows } = await serviceClient
          .from('users')
          .select('id, full_name, username')
          .in('id', voucheeIds);
        const pick = (u: { full_name?: string | null; username?: string | null }) =>
          (u?.full_name?.trim()) || (u?.username?.trim()) || 'Someone';
        voucheeMap = (usersRows ?? []).reduce(
          (acc, u) => {
            acc[u.id] = { id: u.id, full_name: pick(u), username: u.username ?? undefined };
            return acc;
          },
          {} as Record<string, { id: string; full_name: string; username?: string }>
        );
      }
      myVouchees = rows.map((row: { vouchee_id?: string } & Record<string, unknown>) => ({
        ...row,
        vouchee: row.vouchee_id
          ? (voucheeMap[row.vouchee_id] ?? { id: row.vouchee_id, full_name: 'Someone', username: undefined })
          : { id: '', full_name: 'Someone', username: undefined },
      }));
    }

    // Get user payment stats (auto-pay vs manual)
    const { data: userProfile } = await serviceClient
      .from('users')
      .select(`
        total_payments_made,
        payments_on_time,
        payments_early,
        payments_late,
        payments_missed,
        auto_payments_count,
        manual_payments_count,
        auto_pay_enabled,
        dwolla_funding_source_url
      `)
      .eq('id', userId)
      .single();

    return NextResponse.json({
      score,
      recentEvents: events,
      topVouches: vouches || [],
      myVouchees,
      paymentStats: userProfile ? {
        totalPayments: userProfile.total_payments_made || 0,
        onTime: userProfile.payments_on_time || 0,
        early: userProfile.payments_early || 0,
        late: userProfile.payments_late || 0,
        missed: userProfile.payments_missed || 0,
        autoPayments: userProfile.auto_payments_count || 0,
        manualPayments: userProfile.manual_payments_count || 0,
        autoPayEnabled: userProfile.auto_pay_enabled || false,
        bankConnected: !!userProfile.dwolla_funding_source_url,
      } : null,
    });
  } catch (error: unknown) {
    log.error('Error fetching trust score:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST: Recalculate trust score
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userId = body.userId || user.id;

    // Only allow users to recalculate their own score (or admins)
    if (userId !== user.id) {
      const { data: profile } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const serviceClient = await createServiceRoleClient();
    const trustService = new TrustScoreService(serviceClient);

    const score = await trustService.recalculate(userId);

    return NextResponse.json({ score });
  } catch (error: unknown) {
    log.error('Error recalculating trust score:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
