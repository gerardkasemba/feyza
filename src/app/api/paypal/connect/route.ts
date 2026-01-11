import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

// Get PayPal access token
async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

// POST: Save PayPal connection after user authorization
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paypalEmail, paypalPayerId } = body;

    if (!paypalEmail) {
      return NextResponse.json({ error: 'PayPal email is required' }, { status: 400 });
    }

    // Update user with PayPal info
    const { error } = await supabase
      .from('users')
      .update({
        paypal_email: paypalEmail,
        paypal_payer_id: paypalPayerId || null,
        paypal_connected: true,
        paypal_connected_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error saving PayPal connection:', error);
      return NextResponse.json({ error: 'Failed to save PayPal connection' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PayPal connect error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Disconnect PayPal
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Remove PayPal connection
    const { error } = await supabase
      .from('users')
      .update({
        paypal_email: null,
        paypal_payer_id: null,
        paypal_connected: false,
        paypal_connected_at: null,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error disconnecting PayPal:', error);
      return NextResponse.json({ error: 'Failed to disconnect PayPal' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PayPal disconnect error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
