// POST /api/partner/auth/register
//
// Capital Circle calls this to create a new user on Feyza.
// After successful registration the user lands in Feyza's Supabase auth.users
// and gets a matching row in public.users.
// Protected by X-Partner-Secret header.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPartnerSecret, toPartnerUser } from '../../_auth';
import { logger } from '@/lib/logger';
import { bootstrapTrustScore } from '@/lib/users/user-lifecycle-service';

const log = logger('partner-auth-register');

export async function POST(req: NextRequest) {
  const guard = verifyPartnerSecret(req);
  if (guard) return guard;

  try {
    const { email, password, full_name, phone } = await req.json();

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'email, password, and full_name are required' },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    // Use service role to create the user (bypasses email confirmation)
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    // Check if email already exists
    const { data: existing } = await serviceClient
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true, // Auto-confirm for partner-registered users
      user_metadata: { full_name },
    });

    if (authError || !authData.user) {
      log.error('[Partner /auth/register] Auth error:', authError);
      return NextResponse.json(
        { error: authError?.message ?? 'Registration failed' },
        { status: 400 },
      );
    }

    // Create public.users row
    const { error: profileError } = await serviceClient.from('users').insert({
      id:         authData.user.id,
      email:      email.toLowerCase().trim(),
      full_name,
      phone:      phone ?? null,
      user_type:  'individual',
      trust_tier: 'tier_1',
      vouch_count: 0,
      verification_status: 'pending',
      is_verified: false,
      is_blocked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      log.error('[Partner /auth/register] Profile error:', profileError);
      // Rollback: delete the auth user we just created
      await serviceClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 },
      );
    }

    // Bootstrap trust score (replaces create_trust_score_on_user_create DB trigger)
    // Partner register inserts directly into users, bypassing the auth trigger chain
    await bootstrapTrustScore(serviceClient as any, authData.user.id);

    // Sign in to get session tokens
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );

    const { data: sessionData, error: sessionError } = await anonClient.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (sessionError || !sessionData.session) {
      // Registration succeeded — return user without session (they can login)
      return NextResponse.json({
        access_token:  null,
        refresh_token: null,
        expires_in:    0,
        user: {
          id:                 authData.user.id,
          email:              email.toLowerCase().trim(),
          full_name,
          avatar_url:         null,
          phone:              phone ?? null,
          username:           null,
          kyc_status:         'not_started',
          is_verified:        false,
          verification_status: 'pending',
          trust_tier:         'tier_1',
          vouch_count:        0,
          is_blocked:         false,
          is_suspended:       false,
          created_at:         new Date().toISOString(),
        },
      }, { status: 201 });
    }

    // Fetch full profile
    const { data: userRow } = await serviceClient
      .from('users')
      .select(`
        id, email, full_name, avatar_url, phone, phone_number, username,
        verification_status, is_blocked, is_suspended,
        trust_tier, vouch_count, active_vouches_count, created_at
      `)
      .eq('id', authData.user.id)
      .single();

    return NextResponse.json({
      access_token:  sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_in:    sessionData.session.expires_in ?? 3600,
      user:          userRow ? toPartnerUser(userRow) : null,
    }, { status: 201 });
  } catch (err: unknown) {
    log.error('[Partner /auth/register]', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
