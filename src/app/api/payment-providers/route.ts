import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET: Public endpoint to check payment provider status
// Used by fund page and other components to determine payment flow
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();

    // Get payment providers
    const { data: providers, error } = await supabase
      .from('payment_providers')
      .select('slug, name, is_enabled, is_available_for_disbursement, is_available_for_repayment, provider_type, supported_countries')
      .order('display_order');

    if (error) {
      console.error('[Payment Providers] Error fetching providers:', error);
      // Return safe defaults if table doesn't exist or error
      return NextResponse.json({
        providers: [],
        dwollaEnabled: false,
        autoPayEnabled: false,
        manualPaymentEnabled: true,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        }
      });
    }

    // Check Dwolla specifically
    const dwolla = providers?.find(p => p.slug === 'dwolla');
    const dwollaEnabled = dwolla?.is_enabled === true && 
                          dwolla?.is_available_for_disbursement === true;

    // Check if any automated provider is enabled for disbursement
    const autoPayEnabled = providers?.some(p => 
      p.is_enabled && 
      p.provider_type === 'automated' && 
      p.is_available_for_disbursement
    ) || false;

    // Manual payment is always available as fallback
    const manualPaymentEnabled = !autoPayEnabled || providers?.some(p =>
      p.is_enabled &&
      p.provider_type === 'manual'
    ) || true;

    console.log('[Payment Providers] Status:', { 
      dwollaEnabled, 
      autoPayEnabled, 
      dwolla: dwolla ? { is_enabled: dwolla.is_enabled, is_available_for_disbursement: dwolla.is_available_for_disbursement } : null 
    });

    return NextResponse.json({
      providers: providers || [],
      dwollaEnabled,
      autoPayEnabled,
      manualPaymentEnabled,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      }
    });
  } catch (error: any) {
    console.error('[Payment Providers] Error:', error);
    // Return safe defaults on error
    return NextResponse.json({
      providers: [],
      dwollaEnabled: false,
      autoPayEnabled: false,
      manualPaymentEnabled: true,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      }
    });
  }
}
