import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export interface Country {
  code: string;
  name: string;
  enabled: boolean;
}

const DEFAULT_COUNTRIES: Country[] = [
  { code: 'KE', name: 'Kenya', enabled: true },
  { code: 'UG', name: 'Uganda', enabled: true },
  { code: 'TZ', name: 'Tanzania', enabled: true },
  { code: 'NG', name: 'Nigeria', enabled: true },
  { code: 'GH', name: 'Ghana', enabled: true },
  { code: 'ZA', name: 'South Africa', enabled: true },
  { code: 'RW', name: 'Rwanda', enabled: true },
  { code: 'ET', name: 'Ethiopia', enabled: true },
  { code: 'ZM', name: 'Zambia', enabled: true },
  { code: 'MW', name: 'Malawi', enabled: true },
];

// GET: Get supported countries (public)
export async function GET() {
  try {
    const supabase = await createServiceRoleClient();
    
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'supported_countries')
      .single();
    
    const countries: Country[] = data?.value || DEFAULT_COUNTRIES;
    
    // Return only enabled countries for non-admin users
    const enabledCountries = countries.filter(c => c.enabled);
    
    return NextResponse.json({ 
      countries: enabledCountries,
      allCountries: countries, // Include all for admin
    });
  } catch (error: any) {
    console.error('Error getting supported countries:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get countries' },
      { status: 500 }
    );
  }
}

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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      countries,
      message: 'Countries updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating supported countries:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update countries' },
      { status: 500 }
    );
  }
}
