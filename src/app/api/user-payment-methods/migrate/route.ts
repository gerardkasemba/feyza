import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('user-payment-methods-migrate');

/**
 * POST: Migrate legacy payment methods (paypal_email, cashapp_username, venmo_username)
 * from users table to user_payment_methods table
 * 
 * This endpoint should be called once per user when they visit the settings page.
 * It checks if migration is needed and performs it if so.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user profile with legacy fields
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('paypal_email, cashapp_username, venmo_username, preferred_payment_method')
      .eq('id', user.id)
      .single();

    if (profileError) {
      log.error('Migrate: profile fetch failed', { code: profileError.code, message: profileError.message });
      return NextResponse.json({ error: 'Failed to fetch profile', code: profileError.code }, { status: 500 });
    }
    if (!profile) {
      log.error('Migrate: no profile row for user');
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user already has methods in the new table
    const { count: existingCount } = await supabase
      .from('user_payment_methods')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);

    // If user already has methods, skip migration
    if (existingCount && existingCount > 0) {
      return NextResponse.json({
        success: true,
        migrated: false,
        message: 'User already has payment methods in new system',
        existingCount,
      });
    }

    // Fetch payment providers
    const { data: providers, error: providersError } = await supabase
      .from('payment_providers')
      .select('id, slug')
      .eq('is_enabled', true);

    if (providersError || !providers) {
      log.error('Migrate: providers fetch failed', { error: providersError?.message });
      return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
    }

    const providerMap = new Map(providers.map(p => [p.slug, p.id]));

    // Prepare migrations
    const migrations: Array<{
      user_id: string;
      payment_provider_id: string;
      account_identifier: string;
      is_default: boolean;
      is_active: boolean;
      is_verified: boolean;
    }> = [];

    // PayPal (guard against null profile from type narrowing)
    const paypalEmail = profile?.paypal_email;
    const cashappUsername = profile?.cashapp_username;
    const venmoUsername = profile?.venmo_username;
    const preferredMethod = profile?.preferred_payment_method;

    if (paypalEmail && providerMap.has('paypal')) {
      migrations.push({
        user_id: user.id,
        payment_provider_id: providerMap.get('paypal')!,
        account_identifier: paypalEmail,
        is_default: preferredMethod === 'paypal',
        is_active: true,
        is_verified: false,
      });
    }

    if (cashappUsername && providerMap.has('cashapp')) {
      migrations.push({
        user_id: user.id,
        payment_provider_id: providerMap.get('cashapp')!,
        account_identifier: cashappUsername,
        is_default: preferredMethod === 'cashapp',
        is_active: true,
        is_verified: false,
      });
    }

    if (venmoUsername && providerMap.has('venmo')) {
      migrations.push({
        user_id: user.id,
        payment_provider_id: providerMap.get('venmo')!,
        account_identifier: venmoUsername,
        is_default: preferredMethod === 'venmo',
        is_active: true,
        is_verified: false,
      });
    }

    // If nothing to migrate, return early
    if (migrations.length === 0) {
      return NextResponse.json({
        success: true,
        migrated: false,
        message: 'No legacy payment methods to migrate',
      });
    }

    // Ensure at least one is default
    if (!migrations.some(m => m.is_default)) {
      migrations[0].is_default = true;
    }

    // Insert migrated methods
    const { data: inserted, error: insertError } = await supabase
      .from('user_payment_methods')
      .insert(migrations)
      .select('*, payment_provider:payment_provider_id(name, slug)');

    if (insertError) {
      log.error('Migrate: insert failed', { code: insertError.code, message: insertError.message, details: insertError.details });
      return NextResponse.json({
        error: 'Failed to migrate payment methods',
        code: insertError.code,
        details: insertError.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      migrated: true,
      message: `Migrated ${inserted?.length || 0} payment method(s)`,
      methods: inserted,
    });
  } catch (error: unknown) {
    const err = error as Error & { cause?: { code?: string } };
    log.error('Migrate: unexpected error', {
      message: err.message,
      cause: err.cause,
      stack: err.stack,
    });

    // Connection/timeout to upstream (e.g. Supabase) — return 503 so client can retry
    const isConnectError =
      err.message?.includes('fetch failed') ||
      err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      err.cause?.code === 'ETIMEDOUT' ||
      err.cause?.code === 'ECONNREFUSED';

    if (isConnectError) {
      return NextResponse.json(
        {
          error: 'Service temporarily unreachable. Please try again in a moment.',
          code: 'SERVICE_UNAVAILABLE',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: err.message || 'Failed to migrate payment methods' },
      { status: 500 }
    );
  }
}
