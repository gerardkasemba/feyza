import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET: Fetch available payment methods for a country
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const country = searchParams.get('country') || 'US';
    const transactionType = searchParams.get('type'); // 'disbursement' or 'repayment'
    const providerType = searchParams.get('provider_type'); // 'automated', 'manual', 'mobile_money', 'cash'

    // Build query
    let query = supabase
      .from('payment_providers')
      .select('*')
      .eq('is_enabled', true)
      .order('display_order', { ascending: true });

    // Filter by transaction type
    if (transactionType === 'disbursement') {
      query = query.eq('is_available_for_disbursement', true);
    } else if (transactionType === 'repayment') {
      query = query.eq('is_available_for_repayment', true);
    }

    // Filter by provider type
    if (providerType) {
      query = query.eq('provider_type', providerType);
    }

    const { data: providers, error } = await query;

    if (error) throw error;

    // Filter by country support
    const filteredProviders = (providers || []).filter(provider => {
      const countries = provider.supported_countries || [];
      return countries.includes('*') || countries.includes(country);
    });

    // Format response
    const formatted = filteredProviders.map(p => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      type: p.provider_type,
      isAutomated: p.provider_type === 'automated',
      requiresProof: p.provider_type !== 'automated',
      accountIdentifierLabel: p.account_identifier_label,
      accountIdentifierPlaceholder: p.account_identifier_placeholder,
      instructions: p.instructions,
      iconName: p.icon_name,
      brandColor: p.brand_color,
      supportedCurrencies: p.supported_currencies,
      estimatedDays: p.estimated_transfer_days_max > 0 
        ? `${p.estimated_transfer_days_min}-${p.estimated_transfer_days_max} days`
        : 'Instant',
      fees: {
        type: p.fee_type,
        percentage: p.fee_percentage,
        fixed: p.fee_fixed,
      },
      limits: {
        min: p.min_amount,
        max: p.max_amount,
      },
    }));

    return NextResponse.json({
      providers: formatted,
      country,
      transactionType,
    });
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}
