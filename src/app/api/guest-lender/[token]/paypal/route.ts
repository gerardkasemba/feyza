import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { paypalEmail } = body;

    if (!paypalEmail) {
      return NextResponse.json({ error: 'PayPal email is required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Find guest lender by access token
    const { data: lender, error: lenderError } = await supabase
      .from('guest_lenders')
      .select('*')
      .eq('access_token', token)
      .single();

    if (lenderError || !lender) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    // Update PayPal info
    const { error: updateError } = await supabase
      .from('guest_lenders')
      .update({
        paypal_email: paypalEmail,
        paypal_connected: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lender.id);

    if (updateError) {
      console.error('Error updating PayPal info:', updateError);
      return NextResponse.json({ error: 'Failed to save PayPal info' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving guest lender PayPal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
