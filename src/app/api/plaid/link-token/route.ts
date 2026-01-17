import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createLinkToken } from '@/lib/plaid';

// POST: Create a Plaid link token for a user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { isUpdate, accessToken } = body;

    // Create link token
    const linkTokenData = await createLinkToken(user.id, isUpdate, accessToken);

    return NextResponse.json({
      link_token: linkTokenData.link_token,
      expiration: linkTokenData.expiration,
    });
  } catch (error: any) {
    console.error('Error creating Plaid link token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create link token' },
      { status: 500 }
    );
  }
}
