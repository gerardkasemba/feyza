import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('user-payment-methods');

// GET: Fetch user's connected payment methods
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if fetching for specific user (for viewing borrower/lender methods)
    const targetUserId = searchParams.get('userId') || user.id;

    // Fetch user's payment methods with provider details
    const { data: methods, error } = await supabase
      .from('user_payment_methods')
      .select('*, payment_provider:payment_provider_id(*)')
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .order('is_default', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      methods: methods || [],
      userId: targetUserId,
    });
  } catch (error: unknown) {
    log.error('Error fetching user payment methods:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

// POST: Add a new payment method
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentProviderId, accountIdentifier, accountName, setAsDefault } = body;

    if (!paymentProviderId || !accountIdentifier) {
      return NextResponse.json(
        { error: 'Payment provider ID and account identifier are required' },
        { status: 400 }
      );
    }

    // Verify the payment provider exists and is enabled
    const { data: provider, error: providerError } = await supabase
      .from('payment_providers')
      .select('*')
      .eq('id', paymentProviderId)
      .eq('is_enabled', true)
      .single();

    if (providerError || !provider) {
      return NextResponse.json(
        { error: 'Invalid or disabled payment provider' },
        { status: 400 }
      );
    }

    // Check if user already has this provider connected
    const { data: existing } = await supabase
      .from('user_payment_methods')
      .select('id')
      .eq('user_id', user.id)
      .eq('payment_provider_id', paymentProviderId)
      .eq('is_active', true)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'You already have this payment method connected. Update it instead.' },
        { status: 400 }
      );
    }

    // If setting as default, unset any existing defaults
    if (setAsDefault) {
      await supabase
        .from('user_payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    // Check if this is the first method (auto-set as default)
    const { count: methodCount } = await supabase
      .from('user_payment_methods')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);

    const isFirstMethod = (methodCount || 0) === 0;

    // Insert new payment method
    const { data: newMethod, error: insertError } = await supabase
      .from('user_payment_methods')
      .insert({
        user_id: user.id,
        payment_provider_id: paymentProviderId,
        account_identifier: accountIdentifier.trim(),
        account_name: accountName?.trim() || null,
        is_default: setAsDefault || isFirstMethod,
        is_active: true,
        is_verified: false,
      })
      .select('*, payment_provider:payment_provider_id(*)')
      .single();

    if (insertError) throw insertError;

    // Also update legacy fields for backward compatibility
    const legacyUpdate: Record<string, string | null> = {};
    if (provider.slug === 'cashapp') {
      legacyUpdate.cashapp_username = accountIdentifier.trim();
    } else if (provider.slug === 'venmo') {
      legacyUpdate.venmo_username = accountIdentifier.trim();
    } else if (provider.slug === 'paypal') {
      legacyUpdate.paypal_email = accountIdentifier.trim();
    }

    if (Object.keys(legacyUpdate).length > 0) {
      await supabase.from('users').update(legacyUpdate).eq('id', user.id);
    }

    return NextResponse.json({
      success: true,
      method: newMethod,
    });
  } catch (error: unknown) {
    log.error('Error adding payment method:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to add payment method' },
      { status: 500 }
    );
  }
}

// PATCH: Update a payment method
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { methodId, accountIdentifier, accountName, setAsDefault } = body;

    if (!methodId) {
      return NextResponse.json({ error: 'Method ID is required' }, { status: 400 });
    }

    // Verify the method belongs to the user
    const { data: existingMethod, error: fetchError } = await supabase
      .from('user_payment_methods')
      .select('*, payment_provider:payment_provider_id(*)')
      .eq('id', methodId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingMethod) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    // If setting as default, unset others
    if (setAsDefault) {
      await supabase
        .from('user_payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    // Update the method
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (accountIdentifier !== undefined) {
      updateData.account_identifier = accountIdentifier.trim();
    }
    if (accountName !== undefined) {
      updateData.account_name = accountName?.trim() || null;
    }
    if (setAsDefault !== undefined) {
      updateData.is_default = setAsDefault;
    }

    const { data: updatedMethod, error: updateError } = await supabase
      .from('user_payment_methods')
      .update(updateData)
      .eq('id', methodId)
      .select('*, payment_provider:payment_provider_id(*)')
      .single();

    if (updateError) throw updateError;

    // Update legacy fields
    const provider = existingMethod.payment_provider as any;
    if (accountIdentifier && provider) {
      const legacyUpdate: Record<string, string> = {};
      if (provider.slug === 'cashapp') {
        legacyUpdate.cashapp_username = accountIdentifier.trim();
      } else if (provider.slug === 'venmo') {
        legacyUpdate.venmo_username = accountIdentifier.trim();
      } else if (provider.slug === 'paypal') {
        legacyUpdate.paypal_email = accountIdentifier.trim();
      }
      if (Object.keys(legacyUpdate).length > 0) {
        await supabase.from('users').update(legacyUpdate).eq('id', user.id);
      }
    }

    return NextResponse.json({
      success: true,
      method: updatedMethod,
    });
  } catch (error: unknown) {
    log.error('Error updating payment method:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update payment method' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a payment method (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const methodId = searchParams.get('methodId');

    if (!methodId) {
      return NextResponse.json({ error: 'Method ID is required' }, { status: 400 });
    }

    // Verify the method belongs to the user
    const { data: existingMethod, error: fetchError } = await supabase
      .from('user_payment_methods')
      .select('*, payment_provider:payment_provider_id(*)')
      .eq('id', methodId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingMethod) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    // Soft delete the method
    const { error: deleteError } = await supabase
      .from('user_payment_methods')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', methodId);

    if (deleteError) throw deleteError;

    // Clear legacy fields
    const provider = existingMethod.payment_provider as any;
    if (provider) {
      const legacyClear: Record<string, null> = {};
      if (provider.slug === 'cashapp') {
        legacyClear.cashapp_username = null;
      } else if (provider.slug === 'venmo') {
        legacyClear.venmo_username = null;
      } else if (provider.slug === 'paypal') {
        legacyClear.paypal_email = null;
      }
      if (Object.keys(legacyClear).length > 0) {
        await supabase.from('users').update(legacyClear).eq('id', user.id);
      }
    }

    // If the deleted method was default, set another as default
    if (existingMethod.is_default) {
      const { data: otherMethods } = await supabase
        .from('user_payment_methods')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (otherMethods && otherMethods.length > 0) {
        await supabase
          .from('user_payment_methods')
          .update({ is_default: true })
          .eq('id', otherMethods[0].id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment method removed',
    });
  } catch (error: unknown) {
    log.error('Error deleting payment method:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to delete payment method' },
      { status: 500 }
    );
  }
}
