// POST /api/partner/trust/report
//
// Capital Circle calls this to report trust-relevant events back to Feyza,
// so they feed into users' trust scores.
//
// Supported event_types:
//   - capital_circle_contribution_on_time
//   - capital_circle_contribution_late
//   - capital_circle_contribution_missed
//   - capital_circle_cycle_completed
//   - capital_circle_circle_completed
//
// Protected by X-Partner-Secret header.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPartnerSecret } from '../../_auth';

const ALLOWED_EVENT_TYPES = new Set([
  'capital_circle_contribution_on_time',
  'capital_circle_contribution_late',
  'capital_circle_contribution_missed',
  'capital_circle_cycle_completed',
  'capital_circle_circle_completed',
]);

// Score impact per event type
const SCORE_IMPACTS: Record<string, number> = {
  capital_circle_contribution_on_time:  3,
  capital_circle_contribution_late:    -4,
  capital_circle_contribution_missed:  -10,
  capital_circle_cycle_completed:       5,
  capital_circle_circle_completed:      12,
};

const EVENT_TITLES: Record<string, string> = {
  capital_circle_contribution_on_time:  'Capital Circle: On-Time Contribution',
  capital_circle_contribution_late:     'Capital Circle: Late Contribution',
  capital_circle_contribution_missed:   'Capital Circle: Missed Contribution',
  capital_circle_cycle_completed:       'Capital Circle: Cycle Completed',
  capital_circle_circle_completed:      'Capital Circle: Circle Completed 🏆',
};

export async function POST(req: NextRequest) {
  const guard = verifyPartnerSecret(req);
  if (guard) return guard;

  try {
    const body = await req.json();
    const { user_id, event_type, metadata } = body;

    if (!user_id || !event_type) {
      return NextResponse.json(
        { error: 'user_id and event_type are required' },
        { status: 400 },
      );
    }

    if (!ALLOWED_EVENT_TYPES.has(event_type)) {
      return NextResponse.json(
        { error: `Unknown event_type. Allowed: ${[...ALLOWED_EVENT_TYPES].join(', ')}` },
        { status: 400 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const score_impact = SCORE_IMPACTS[event_type] ?? 0;
    const title = EVENT_TITLES[event_type] ?? event_type;

    // Insert trust score event
    const { error: eventError } = await supabase.from('trust_score_events').insert({
      user_id,
      event_type,
      score_impact,
      title,
      description: metadata?.description ?? null,
      metadata: {
        source: 'capital-circle',
        ...(metadata ?? {}),
      },
    });

    if (eventError) {
      console.error('[Partner /trust/report] Event insert error:', eventError);
      return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
    }

    // Trigger trust score recalculation via RPC (fire-and-forget)
    supabase.rpc('recalculate_trust_score', { p_user_id: user_id }).then(({ error }) => {
      if (error) {
        // RPC may not exist — fall back to direct score adjustment
        const adjustment = score_impact;
        supabase
          .from('trust_scores')
          .update({
            score: supabase.rpc('greatest', { a: 0, b: supabase.rpc('least', { a: 100, b: adjustment }) }),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user_id)
          .then(() => {});
      }
    });

    return NextResponse.json({
      success:      true,
      event_type,
      score_impact,
      user_id,
    });
  } catch (err: any) {
    console.error('[Partner /trust/report]', err);
    return NextResponse.json({ error: 'Failed to report event' }, { status: 500 });
  }
}
