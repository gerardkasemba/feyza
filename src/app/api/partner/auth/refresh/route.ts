// POST /api/partner/auth/refresh
//
// Capital Circle calls this when the stored access_token has expired.
// Returns a fresh session using the refresh_token.
// Protected by X-Partner-Secret header.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPartnerSecret, toPartnerUser } from '../../_auth';

export async function POST(req: NextRequest) {
  const guard = verifyPartnerSecret(req);
  if (guard) return guard;

  try {
    const body = await req.json().catch(() => null);
    const refresh_token: string | undefined = body?.refresh_token;

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'refresh_token is required' },
        { status: 400 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );

    // Refresh the session
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    // ✅ data.user can be null; guard it (TS18047 fix)
    if (error || !data.session || !data.user) {
      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 },
      );
    }

    // Fetch current user profile from your local users table
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select(`
        id, email, full_name, avatar_url, phone, phone_number, username,
        verification_status, is_blocked, is_suspended,
        trust_tier, vouch_count, active_vouches_count, created_at
      `)
      .eq('id', data.user.id)
      .maybeSingle();

    if (userErr) {
      console.error('[Partner /auth/refresh] Failed to load user row:', userErr);
      // Still return refreshed tokens even if profile lookup fails
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in ?? 3600,
      user: userRow ? toPartnerUser(userRow) : null,
    });
  } catch (err: any) {
    console.error('[Partner /auth/refresh]', err);
    return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 });
  }
}