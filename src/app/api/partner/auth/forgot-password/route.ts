// POST /api/partner/auth/forgot-password
//
// Triggers Feyza's password reset flow for a user email.
// Supabase sends the reset email — the link lands on feyza.app/auth/reset-password.
// Protected by X-Partner-Secret header.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPartnerSecret } from '../../_auth';
import { logger } from '@/lib/logger';

const log = logger('partner-auth-forgot-password');

export async function POST(req: NextRequest) {
  const guard = verifyPartnerSecret(req);
  if (guard) return guard;

  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );

    // Always redirect to feyza.app for the reset flow
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    if (error) {
      log.error('[Partner /auth/forgot-password]', error);
      // Don't reveal if email exists — always return 200
    }

    // Always return 200 to prevent email enumeration
    return NextResponse.json({
      message: 'If an account exists with that email, a reset link has been sent.',
    });
  } catch (err: unknown) {
    log.error('[Partner /auth/forgot-password]', err);
    return NextResponse.json({ error: 'Request failed' }, { status: 500 });
  }
}
