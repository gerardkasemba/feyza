import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Find and update the loan
    const { error: updateError } = await supabase
      .from('loans')
      .update({
        status: 'declined',
      })
      .eq('invite_token', token);

    if (updateError) {
      console.error('Error declining loan:', updateError);
      return NextResponse.json({ error: 'Failed to decline loan' }, { status: 500 });
    }

    // TODO: Send notification email to borrower about declined request

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error declining invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
