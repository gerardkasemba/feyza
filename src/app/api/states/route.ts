import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('states');

export interface State {
  id: string;
  code: string;
  name: string;
  country_id: string;
  country_code?: string;
  is_active: boolean;
}

// GET: Get states by country
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('country');
    const countryId = searchParams.get('country_id');
    
    const supabase = await createServiceRoleClient();
    
    // Build query
    let query = supabase
      .from('states')
      .select(`
        id,
        code,
        name,
        country_id,
        is_active,
        countries (
          code,
          name
        )
      `)
      .eq('is_active', true)
      .order('name');
    
    // Filter by country code or ID
    if (countryCode) {
      // First get country ID from code
      const { data: country } = await supabase
        .from('countries')
        .select('id')
        .eq('code', countryCode)
        .single();
      
      if (country) {
        query = query.eq('country_id', country.id);
      } else {
        return NextResponse.json({ states: [], country: countryCode });
      }
    } else if (countryId) {
      query = query.eq('country_id', countryId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      log.error('Error fetching states:', error);
      return NextResponse.json({ 
        states: [],
        error: (error as Error).message,
      });
    }
    
    // Map the data
    const states = (data || []).map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      country_id: s.country_id,
      country_code: (s.countries as any)?.[0]?.code ?? (s.countries as any)?.code,
      is_active: s.is_active,
    }));
    
    return NextResponse.json({ 
      states,
      country: countryCode || countryId,
    });
  } catch (error: unknown) {
    log.error('Error getting states:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to get states', states: [] },
      { status: 500 }
    );
  }
}

