import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { TrustScoreService } from '@/lib/trust-score';

// GET: Get trust score for a user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.id;

    const serviceClient = await createServiceRoleClient();
    const trustService = new TrustScoreService(serviceClient);

    const score = await trustService.getScore(userId);

    if (!score) {
      // Create score for user if doesn't exist
      await trustService.recalculate(userId);
      const newScore = await trustService.getScore(userId);
      return NextResponse.json({ score: newScore });
    }

    // Also get recent events
    const events = await trustService.getEvents(userId, 10);

    // Get vouches received
    const { data: vouches } = await serviceClient
      .from('vouches')
      .select(`
        id,
        vouch_type,
        relationship,
        vouch_strength,
        trust_score_boost,
        created_at,
        voucher:users!voucher_id(
          id,
          full_name,
          username
        )
      `)
      .eq('vouchee_id', userId)
      .eq('status', 'active')
      .order('vouch_strength', { ascending: false })
      .limit(5);

    return NextResponse.json({
      score,
      recentEvents: events,
      topVouches: vouches || [],
    });
  } catch (error: any) {
    console.error('Error fetching trust score:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Recalculate trust score
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userId = body.userId || user.id;

    // Only allow users to recalculate their own score (or admins)
    if (userId !== user.id) {
      const { data: profile } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const serviceClient = await createServiceRoleClient();
    const trustService = new TrustScoreService(serviceClient);

    const score = await trustService.recalculate(userId);

    return NextResponse.json({ score });
  } catch (error: any) {
    console.error('Error recalculating trust score:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
