// GET /api/partner/users/search?q=<term>
//
// Capital Circle uses this to let circle organizers find and invite Feyza users.
// Returns minimal safe public data — no sensitive fields.
// Protected by X-Partner-Secret header.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPartnerSecret } from '../../_auth';
import { logger } from '@/lib/logger';

const log = logger('partner-users-search');

export async function GET(req: NextRequest) {
  const guard = verifyPartnerSecret(req);
  if (guard) return guard;

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const term = q.toLowerCase();

    const { data, error } = await supabase
      .from('users')
      .select(`
        id, full_name, username, email, phone_number,
        trust_tier, vouch_count, verification_status,
        avatar_url, is_blocked, is_suspended
      `)
      .or(
        `username.ilike.%${term}%,email.ilike.%${term}%,phone_number.ilike.%${term}%,full_name.ilike.%${term}%`,
      )
      .eq('is_blocked', false)
      .limit(10);

    if (error) throw error;

    // Return minimal safe profile — mask email/phone for privacy
    const users = (data ?? []).map(u => ({
      id:         u.id,
      full_name:  u.full_name,
      username:   u.username ?? null,
      avatar_url: u.avatar_url ?? null,
      // Mask email: first 2 chars + domain
      email_hint: u.email
        ? `${u.email.slice(0, 2)}***@${u.email.split('@')[1]}`
        : null,
      // Mask phone: last 4 digits
      phone_hint: u.phone_number
        ? `***-${u.phone_number.slice(-4)}`
        : null,
      trust_tier:   u.trust_tier ?? 'tier_1',
      vouch_count:  u.vouch_count ?? 0,
      is_verified:  u.verification_status === 'verified',
      is_suspended: u.is_suspended ?? false,
    }));

    return NextResponse.json({ users });
  } catch (err: unknown) {
    log.error('[Partner /users/search]', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
