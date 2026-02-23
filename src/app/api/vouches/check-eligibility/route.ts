import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { canUserVouch } from '@/lib/fraud-prevention/basic-eligibility';

/**
 * POST /api/vouches/check-eligibility
 * Called by the VouchButton component before showing the vouch modal.
 * Body: { voucherId: string }  — the user who wants to vouch
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ canVouch: false, reason: 'Not authenticated.' }, { status: 401 });
    }

    const eligibility = await canUserVouch(user.id);
    return NextResponse.json(eligibility);
  } catch (error: any) {
    console.error('[POST /api/vouches/check-eligibility]', error);
    return NextResponse.json({ canVouch: false, reason: 'Server error.' }, { status: 500 });
  }
}
