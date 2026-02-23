import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/users/search?q=<term>
 *
 * Search platform users by username, email, or phone number.
 * Used by the vouch/requests Send Request tab.
 * Only returns users who are not the current user.
 * Returns minimal public profile data only.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const q = request.nextUrl.searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const term = q.toLowerCase();

    // Search across username, email, phone_number with ilike
    // We use OR conditions — Supabase doesn't support multi-column OR in one .ilike()
    // so we use .or() with the filter string syntax
    const { data: results, error } = await supabase
      .from('users')
      .select('id, full_name, username, email, phone_number, trust_tier, vouch_count, verification_status')
      .neq('id', user.id)                 // exclude self
      .or(
        `username.ilike.%${term}%,email.ilike.%${term}%,phone_number.ilike.%${term}%,full_name.ilike.%${term}%`
      )
      .limit(8);

    if (error) throw error;

    // Strip sensitive data — only return what the UI needs
    const users = (results ?? []).map((u) => ({
      id: u.id,
      full_name: u.full_name,
      username: u.username,
      // Mask email: show first 2 chars + domain for privacy
      email_hint: u.email
        ? `${u.email.slice(0, 2)}***@${u.email.split('@')[1]}`
        : null,
      // Mask phone: show last 4 digits only
      phone_hint: u.phone_number
        ? `***-${u.phone_number.slice(-4)}`
        : null,
      trust_tier: u.trust_tier,
      vouch_count: u.vouch_count ?? 0,
      is_verified: u.verification_status === 'verified',
    }));

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('[GET /api/users/search]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
