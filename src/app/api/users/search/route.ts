import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('users-search');

/**
 * GET /api/users/search?q=<term>
 *
 * Search platform users by username, email, phone number, or full name.
 * Used by the vouch/requests "Find someone on Feyza" field.
 * Uses service role so results are not blocked by RLS.
 * Only returns users who are not the current user. Returns minimal public profile data.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const q = request.nextUrl.searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const term = q.trim();
    const termLower = term.toLowerCase();
    const pattern = `%${termLower}%`;
    const service = await createServiceRoleClient();

    // Search by full_name, username, email, phone_number, phone (public.users has both phone and phone_number)
    const baseSelect = 'id, full_name, username, email, phone, phone_number, trust_tier, vouch_count, verification_status';
    const selfId = user.id;

    const [byName, byUsername, byEmail, byPhoneNumber, byPhone] = await Promise.all([
      service.from('users').select(baseSelect).ilike('full_name', pattern).limit(8),
      service.from('users').select(baseSelect).ilike('username', pattern).limit(8),
      service.from('users').select(baseSelect).ilike('email', pattern).limit(8),
      service.from('users').select(baseSelect).ilike('phone_number', pattern).limit(8),
      service.from('users').select(baseSelect).ilike('phone', pattern).limit(8),
    ]);

    const seen = new Set<string>();
    const results: typeof byName.data = [];
    for (const res of [byName, byUsername, byEmail, byPhoneNumber, byPhone]) {
      if (res.error) {
        log.error('[users/search] query error:', res.error);
        continue;
      }
      for (const row of res.data ?? []) {
        if (row.id === selfId) continue;
        if (!seen.has(row.id)) {
          seen.add(row.id);
          results.push(row);
        }
      }
      if (results.length >= 8) break;
    }
    const limited = results.slice(0, 8);

    // Strip sensitive data — only return what the UI needs; ensure display name is never empty
    const users = limited.map((u) => ({
      id: u.id,
      full_name: (u.full_name?.trim()) || (u.username?.trim()) || (u.email?.split('@')[0]) || 'User',
      username: u.username,
      // Mask email: show first 2 chars + domain for privacy
      email_hint: u.email
        ? `${u.email.slice(0, 2)}***@${u.email.split('@')[1]}`
        : null,
      // Mask phone: show last 4 digits only (prefer phone_number, else phone)
      phone_hint: (u.phone_number || (u as { phone?: string }).phone)
        ? `***-${String((u.phone_number || (u as { phone?: string }).phone) ?? '').slice(-4)}`
        : null,
      trust_tier: u.trust_tier,
      vouch_count: u.vouch_count ?? 0,
      is_verified: u.verification_status === 'verified',
    }));

    return NextResponse.json({ users });
  } catch (error: unknown) {
    log.error('[GET /api/users/search]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
