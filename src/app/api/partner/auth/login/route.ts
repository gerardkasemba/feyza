// POST /api/partner/auth/login
//
// Capital Circle calls this to authenticate a user with their Feyza credentials.
// Returns Supabase session tokens + safe user profile.
// Protected by X-Partner-Secret header.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPartnerSecret, toPartnerUser } from '../../_auth';

export async function POST(req: NextRequest) {
  const guard = verifyPartnerSecret(req);
  if (guard) return guard;

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      );
    }

    // Use Supabase auth to sign in
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      );
    }

    // Fetch full user profile from users table
    // Note: is_verified is derived from verification_status in toPartnerUser()
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select(`
        id, email, full_name, avatar_url, phone, phone_number, username,
        verification_status, is_blocked, is_suspended,
        trust_tier, vouch_count, active_vouches_count, created_at
      `)
      .eq('id', authData.user.id)
      .single();

    if (userError || !userRow) {
      console.error('[Partner /auth/login] User profile fetch error:', userError);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      access_token:  authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_in:    authData.session.expires_in ?? 3600,
      user:          toPartnerUser(userRow),
    });
  } catch (err: any) {
    console.error('[Partner /auth/login]', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
