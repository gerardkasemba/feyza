// GET  /api/partner/payment-methods?user_id=<uuid>  — get payment methods + auto-pay status
// POST /api/partner/payment-methods                  — toggle auto-pay or set preferred method
//
// Payment methods (bank/PayPal) are connected on Feyza.
// Capital Circle reads the status and lets users toggle auto-pay.
// Protected by X-Partner-Secret.

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { verifyPartnerSecret }       from '../_auth';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── GET — fetch payment methods ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const guard = verifyPartnerSecret(req);
  if (guard) return guard;

  const user_id = req.nextUrl.searchParams.get('user_id');
  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  try {
    const db = serviceClient();

    // Get user's bank + PayPal connection status
    const { data: user, error: userError } = await db
      .from('users')
      .select(`
        bank_connected, bank_name, bank_account_mask, bank_account_type,
        dwolla_customer_id, dwolla_funding_source_id,
        paypal_connected, paypal_email,
        preferred_payment_method,
        auto_payments_count, manual_payments_count
      `)
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user_payment_methods (CashApp, Venmo, Zelle etc)
    const { data: methods } = await db
      .from('user_payment_methods')
      .select(`
        id, account_identifier, account_name, account_metadata,
        is_verified, is_default, is_active, created_at,
        payment_provider:payment_provider_id(id, name, slug, provider_type, icon_name, brand_color)
      `)
      .eq('user_id', user_id)
      .eq('is_active', true)
      .order('is_default', { ascending: false });

    return NextResponse.json({
      // Bank (Plaid/Dwolla)
      bank: {
        connected:     user.bank_connected      ?? false,
        name:          user.bank_name            ?? null,
        mask:          user.bank_account_mask    ?? null,
        type:          user.bank_account_type    ?? null,
        has_dwolla:    !!user.dwolla_funding_source_id,
        // Link to connect bank on Feyza
        connect_url:   'https://feyza.app/settings',
      },
      // PayPal
      paypal: {
        connected:   user.paypal_connected ?? false,
        email:       user.paypal_email     ?? null,
        connect_url: 'https://feyza.app/settings',
      },
      // Other payment methods (CashApp, Venmo, Zelle)
      methods: methods ?? [],
      // Stats
      preferred_method:    user.preferred_payment_method ?? null,
      auto_payments_count: user.auto_payments_count      ?? 0,
      manual_payments_count: user.manual_payments_count  ?? 0,
    });
  } catch (err: any) {
    console.error('[Partner /payment-methods GET]', err);
    return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 });
  }
}

// ── POST — update payment preferences ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const guard = verifyPartnerSecret(req);
  if (guard) return guard;

  try {
    const { user_id, preferred_payment_method } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const db = serviceClient();

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (preferred_payment_method !== undefined) {
      updates.preferred_payment_method = preferred_payment_method;
    }

    const { error } = await db
      .from('users')
      .update(updates)
      .eq('id', user_id);

    if (error) {
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Partner /payment-methods POST]', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
