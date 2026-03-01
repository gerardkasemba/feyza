/**
 * GET /api/vouches/eligibility
 *
 * Pre-flight check called by the VouchButton before opening the modal.
 * Returns the user's current vouching eligibility without side effects.
 * Fast path — single users row read.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { checkVouchingEligibility } from '@/lib/vouching/accountability';
import { logger } from '@/lib/logger';

const log = logger('vouches-eligibility');

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ eligible: false, reason: 'Not authenticated.', code: 'unauthenticated' }, { status: 401 });
    }

    const serviceClient = await createServiceRoleClient();
    const eligibility = await checkVouchingEligibility(serviceClient, user.id);

    return NextResponse.json(eligibility);
  } catch (err: unknown) {
    log.error('[VouchEligibility] Error:', err);
    // Fail open — let the server-side gate in POST /api/vouches catch it
    return NextResponse.json({ eligible: true, code: 'ok' });
  }
}
