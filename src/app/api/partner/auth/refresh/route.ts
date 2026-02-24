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
    const body = await req.json();
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

    const {
      data: { session, user },
      error,
    } = await supabase.auth.refreshSession({ refresh_token });

    // ✅ Proper null guard for TypeScript safety
    if (error || !session || !user) {
      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 },
      );
    }

    // Fetch current user profile
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select(`
        id, email, full_name, avatar_url, phone, phone_number, username,
        verification_status, is_verified, is_blocked, is_suspended,
        trust_tier, vouch_count, active_vouches_count, created_at
      `)
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('[Partner /auth/refresh] User fetch error:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      access_token:  session.access_token,
      refresh_token: session.refresh_token,
      expires_in:    session.expires_in ?? 3600,
      user:          userRow ? toPartnerUser(userRow) : null,
    });

  } catch (err) {
    console.error('[Partner /auth/refresh]', err);
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 },
    );
  }
}