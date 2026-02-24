// GET  /api/partner/vouches?user_id=&type=received|given  — list vouches
// POST /api/partner/vouches                                — create a vouch
//
// Uses Feyza's VouchService directly — same logic as feyza.app/vouch
// Protected by X-Partner-Secret.

import { NextRequest, NextResponse }  from 'next/server';
import { createClient }               from '@supabase/supabase-js';
import { verifyPartnerSecret }        from '../_auth';
import { VouchService }               from '@/lib/trust-score';
import { checkVouchingEligibility }   from '@/lib/vouching/accountability';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── GET — list vouches ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const guard = verifyPartnerSecret(req);
  if (guard) return guard;

  const user_id = req.nextUrl.searchParams.get('user_id');
  const type    = req.nextUrl.searchParams.get('type') ?? 'received'; // received | given

  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  try {
    const db           = serviceClient();
    const vouchService = new VouchService(db);

    const vouches = type === 'given'
      ? await vouchService.getVouchesBy(user_id)
      : await vouchService.getVouchesFor(user_id);

    // Also fetch pending vouch requests for this user
    const { data: pendingRequests } = await db
      .from('vouch_requests')
      .select(`
        id, message, suggested_relationship, status, created_at,
        requester:users!requester_id(id, full_name, username, avatar_url, trust_tier, vouch_count)
      `)
      .eq('requested_user_id', user_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    // Check eligibility to vouch (for the UI gate)
    const eligibility = await checkVouchingEligibility(db, user_id);

    return NextResponse.json({
      vouches,
      pending_requests:  pendingRequests ?? [],
      can_vouch:         eligibility.eligible,
      vouch_blocked_reason: eligibility.eligible ? null : eligibility.reason,
    });
  } catch (err: any) {
    console.error('[Partner /vouches GET]', err);
    return NextResponse.json({ error: 'Failed to fetch vouches' }, { status: 500 });
  }
}

// ── POST — create a vouch ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const guard = verifyPartnerSecret(req);
  if (guard) return guard;

  try {
    const {
      voucher_id,   // The person doing the vouching
      vouchee_id,   // The person being vouched for
      vouch_type,   // character | guarantee | employment | family
      relationship,
      relationship_details,
      known_years,
      message,
      guarantee_percentage,
      guarantee_max_amount,
      is_public,
    } = await req.json();

    if (!voucher_id || !vouchee_id) {
      return NextResponse.json(
        { error: 'voucher_id and vouchee_id are required' },
        { status: 400 },
      );
    }

    const db = serviceClient();

    // Eligibility gate — same rules as Feyza
    const eligibility = await checkVouchingEligibility(db, voucher_id);
    if (!eligibility.eligible) {
      return NextResponse.json(
        { error: eligibility.reason, code: eligibility.code, vouching_blocked: true },
        { status: 403 },
      );
    }

    const vouchService = new VouchService(db);
    const result = await vouchService.createVouch(voucher_id, vouchee_id, {
      vouch_type:            vouch_type          ?? 'character',
      relationship:          relationship         ?? 'friend',
      relationship_details:  relationship_details ?? undefined,
      known_years:           known_years          ?? undefined,
      message:               message              ?? undefined,
      guarantee_percentage:  guarantee_percentage ?? undefined,
      guarantee_max_amount:  guarantee_max_amount ?? undefined,
      is_public:             is_public            !== false,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, vouch: result.vouch });
  } catch (err: any) {
    console.error('[Partner /vouches POST]', err);
    return NextResponse.json({ error: 'Failed to create vouch' }, { status: 500 });
  }
}
