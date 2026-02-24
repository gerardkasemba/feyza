// POST /api/partner/vouch-requests         — send a vouch request
// POST /api/partner/vouch-requests/accept  — accept a request
// POST /api/partner/vouch-requests/decline — decline a request
//
// Uses Feyza's VouchService directly.
// Protected by X-Partner-Secret.

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { verifyPartnerSecret }       from '../_auth';
import { VouchService }              from '@/lib/trust-score';
import { checkVouchingEligibility }  from '@/lib/vouching/accountability';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  const guard = verifyPartnerSecret(req);
  if (guard) return guard;

  try {
    const body   = await req.json();
    const action = body.action; // 'send' | 'accept' | 'decline'

    const db           = serviceClient();
    const vouchService = new VouchService(db);

    // ── Send a vouch request ─────────────────────────────────────────────────
    if (action === 'send') {
      const {
        requester_id,
        target_user_id,
        target_email,
        message,
        suggested_relationship,
      } = body;

      if (!requester_id) {
        return NextResponse.json({ error: 'requester_id is required' }, { status: 400 });
      }
      if (!target_user_id && !target_email) {
        return NextResponse.json(
          { error: 'Either target_user_id or target_email is required' },
          { status: 400 },
        );
      }

      const result = await vouchService.requestVouch(
        requester_id,
        target_user_id,
        target_email,
        message,
        suggested_relationship,
      );

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, request: result.request });
    }

    // ── Accept a vouch request ───────────────────────────────────────────────
    if (action === 'accept') {
      const {
        request_id,
        user_id,            // The person accepting (becomes the voucher)
        vouch_type,
        relationship,
        relationship_details,
        known_years,
        message,
      } = body;

      if (!request_id || !user_id) {
        return NextResponse.json(
          { error: 'request_id and user_id are required' },
          { status: 400 },
        );
      }

      // Eligibility gate
      const eligibility = await checkVouchingEligibility(db, user_id);
      if (!eligibility.eligible) {
        return NextResponse.json(
          { error: eligibility.reason, code: eligibility.code, vouching_blocked: true },
          { status: 403 },
        );
      }

      const result = await vouchService.acceptVouchRequest(request_id, user_id, {
        vouch_type:           vouch_type          ?? 'character',
        relationship:         relationship         ?? 'friend',
        relationship_details: relationship_details ?? undefined,
        known_years:          known_years          ?? undefined,
        message:              message              ?? undefined,
      });

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, vouch: result.vouch });
    }

    // ── Decline a vouch request ──────────────────────────────────────────────
    if (action === 'decline') {
      const { request_id, user_id, reason } = body;

      if (!request_id || !user_id) {
        return NextResponse.json(
          { error: 'request_id and user_id are required' },
          { status: 400 },
        );
      }

      const result = await vouchService.declineVouchRequest(request_id, user_id, reason);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: `Unknown action. Use: send, accept, decline` },
      { status: 400 },
    );
  } catch (err: any) {
    console.error('[Partner /vouch-requests]', err);
    return NextResponse.json({ error: 'Request failed' }, { status: 500 });
  }
}
