import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
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

    // PayPal
    if (profile.paypal_email && providerMap.has('paypal')) {
      migrations.push({
        user_id: user.id,
        payment_provider_id: providerMap.get('paypal')!,
        account_identifier: profile.paypal_email,
        is_default: profile.preferred_payment_method === 'paypal',
        is_active: true,
        is_verified: false,
      });
    }

    // Cash App
    if (profile.cashapp_username && providerMap.has('cashapp')) {
      migrations.push({
        user_id: user.id,
        payment_provider_id: providerMap.get('cashapp')!,
        account_identifier: profile.cashapp_username,
        is_default: profile.preferred_payment_method === 'cashapp',
        is_active: true,
        is_verified: false,
      });
    }

    // Venmo
    if (profile.venmo_username && providerMap.has('venmo')) {
      migrations.push({
        user_id: user.id,
        payment_provider_id: providerMap.get('venmo')!,
        account_identifier: profile.venmo_username,
        is_default: profile.preferred_payment_method === 'venmo',
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
      console.error('Migration insert error:', insertError);
      return NextResponse.json({ 
        error: 'Failed to migrate payment methods',
        details: insertError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      migrated: true,
      message: `Migrated ${inserted?.length || 0} payment method(s)`,
      methods: inserted,
    });
  } catch (error: any) {
    console.error('Error migrating payment methods:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to migrate payment methods' },
      { status: 500 }
    );
  }
}
