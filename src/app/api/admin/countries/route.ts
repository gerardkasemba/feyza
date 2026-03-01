import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('admin-countries');

export interface Country {
  code: string;
  name: string;
  enabled: boolean;
  currency?: string;
  currency_symbol?: string;
}

// GET: Get supported countries from database
export async function GET() {
  try {
    const supabase = await createServiceRoleClient();
    
    // First try to get from countries table
    const { data: countriesFromTable, error: tableError } = await supabase
      .from('countries')
      .select('code, name, currency, currency_symbol, is_active')
      .order('name');
    
    if (!tableError && countriesFromTable && countriesFromTable.length > 0) {
      // Map database format to API format
      const countries: Country[] = countriesFromTable.map(c => ({
        code: c.code,
        name: c.name,
        enabled: c.is_active,
        currency: c.currency,
        currency_symbol: c.currency_symbol,
      }));
      
      const enabledCountries = countries.filter(c => c.enabled);
      
      return NextResponse.json({ 
        countries: enabledCountries,
        allCountries: countries,
      });
    }
    
    // Fall back to platform_settings if countries table doesn't exist
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'supported_countries')
      .single();
    
    const countries: Country[] = data?.value || DEFAULT_COUNTRIES;
    const enabledCountries = countries.filter(c => c.enabled);
    
    return NextResponse.json({ 
      countries: enabledCountries,
      allCountries: countries,
    });
  } catch (error: unknown) {
    log.error('Error getting supported countries:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to get countries' },
      { status: 500 }
    );
  }
}

const DEFAULT_COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', enabled: true, currency: 'USD', currency_symbol: '$' },
  { code: 'GB', name: 'United Kingdom', enabled: true, currency: 'GBP', currency_symbol: '£' },
  { code: 'CA', name: 'Canada', enabled: true, currency: 'CAD', currency_symbol: 'C$' },
  { code: 'AU', name: 'Australia', enabled: false, currency: 'AUD', currency_symbol: 'A$' },
  { code: 'DE', name: 'Germany', enabled: false, currency: 'EUR', currency_symbol: '€' },
  { code: 'KE', name: 'Kenya', enabled: true, currency: 'KES', currency_symbol: 'KSh' },
  { code: 'NG', name: 'Nigeria', enabled: true, currency: 'NGN', currency_symbol: '₦' },
  { code: 'GH', name: 'Ghana', enabled: true, currency: 'GHS', currency_symbol: 'GH₵' },
  { code: 'ZA', name: 'South Africa', enabled: true, currency: 'ZAR', currency_symbol: 'R' },
];

// POST: Update supported countries (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin
    const serviceSupabase = await createServiceRoleClient();
    const { data: profile } = await serviceSupabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { countries } = body;
    
    if (!Array.isArray(countries)) {
      return NextResponse.json({ error: 'Countries must be an array' }, { status: 400 });
    }
    
    // Validate countries
    for (const country of countries) {
      if (!country.code || !country.name) {
        return NextResponse.json({ error: 'Each country must have code and name' }, { status: 400 });
      }
    }
    
    // Check if record exists
    const { data: existing } = await serviceSupabase
      .from('platform_settings')
      .select('id')
      .eq('key', 'supported_countries')
      .single();
    
    let error;
    
    if (existing?.id) {
      // Update existing
      const result = await serviceSupabase
        .from('platform_settings')
        .update({
          value: countries,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('key', 'supported_countries');
      
      error = result.error;
    } else {
      // Insert new
      const result = await serviceSupabase
        .from('platform_settings')
        .insert({
          key: 'supported_countries',
          value: countries,
          description: 'Supported countries for lending',
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        });
      
      error = result.error;
    }
    
    if (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      countries,
      message: 'Countries updated successfully',
    });
  } catch (error: unknown) {
    log.error('Error updating supported countries:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update countries' },
      { status: 500 }
    );
  }
}
