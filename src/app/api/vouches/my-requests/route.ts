import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('vouches-my-requests');

/** Get display name from public.users row (full_name or username) */
function pickName(u: { full_name?: string | null; username?: string | null } | null | undefined): string {
  const name = (u?.full_name ?? '').trim() || (u?.username ?? '').trim();
  return name || 'Someone';
}

/**
 * GET /api/vouches/my-requests
 * Returns incoming vouch requests, outgoing, vouches received, and vouches given
 * with requester/voucher/vouchee names from public.users (fetched by ID so names always show).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = await createServiceRoleClient();

    // Fetch without embeds so we don't depend on PostgREST relation behavior
    const [incomingRes, outgoingRes, receivedRes, givenRes] = await Promise.all([
      service
        .from('vouch_requests')
        .select('id, status, message, suggested_relationship, created_at, requester_id')
        .eq('requested_user_id', user.id)
        .order('created_at', { ascending: false }),

      service
        .from('vouch_requests')
        .select('id, status, message, suggested_relationship, created_at, requested_email')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false }),

      service
        .from('vouches')
        .select('id, vouch_type, relationship, vouch_strength, trust_score_boost, status, created_at, voucher_id')
        .eq('vouchee_id', user.id)
        .order('created_at', { ascending: false }),

      service
        .from('vouches')
        .select('id, vouch_type, relationship, vouch_strength, trust_score_boost, status, created_at, loans_active, loans_completed, loans_defaulted, vouchee_id')
        .eq('voucher_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    const incoming = incomingRes.data ?? [];
    const outgoing = outgoingRes.data ?? [];
    const received = receivedRes.data ?? [];
    const given = givenRes.data ?? [];

    // Collect all user IDs we need names for (from public.users)
    const userIds = new Set<string>();
    incoming.forEach((r: { requester_id?: string }) => r.requester_id && userIds.add(r.requester_id));
    received.forEach((v: { voucher_id?: string }) => v.voucher_id && userIds.add(v.voucher_id));
    given.forEach((v: { vouchee_id?: string }) => v.vouchee_id && userIds.add(v.vouchee_id));

    const ids = Array.from(userIds);
    let usersMap: Record<string, { id: string; full_name: string; username: string | null }> = {};
    if (ids.length > 0) {
      const { data: usersRows } = await service
        .from('users')
        .select('id, full_name, username')
        .in('id', ids);
      usersMap = (usersRows ?? []).reduce(
        (acc, u) => {
          acc[u.id] = { id: u.id, full_name: pickName(u), username: u.username ?? null };
          return acc;
        },
        {} as Record<string, { id: string; full_name: string; username: string | null }>
      );
    }

    const incomingRequests = incoming.map((r: { requester_id?: string } & Record<string, unknown>) => ({
      ...r,
      requester: r.requester_id
        ? { id: r.requester_id, full_name: usersMap[r.requester_id]?.full_name ?? 'Someone' }
        : { id: '', full_name: 'Someone' },
    }));
    const vouchesReceived = received.map((v: { voucher_id?: string } & Record<string, unknown>) => ({
      ...v,
      voucher: v.voucher_id
        ? { id: v.voucher_id, full_name: usersMap[v.voucher_id]?.full_name ?? 'Someone' }
        : { id: '', full_name: 'Someone' },
    }));
    const vouchesGiven = given.map((v: { vouchee_id?: string } & Record<string, unknown>) => ({
      ...v,
      vouchee: v.vouchee_id
        ? { id: v.vouchee_id, full_name: usersMap[v.vouchee_id]?.full_name ?? 'Someone' }
        : { id: '', full_name: 'Someone' },
    }));

    return NextResponse.json({
      incomingRequests,
      outgoingRequests: outgoing,
      vouchesReceived,
      vouchesGiven,
    });
  } catch (err) {
    log.error('my-requests error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
