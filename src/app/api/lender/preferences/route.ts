import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET: Get current user's lender preferences
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has a business profile
    const { data: business } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Get preferences - check both business_id and user_id
    let preferences = null;
    
    if (business) {
      const { data } = await supabase
        .from('lender_preferences')
        .select('*')
        .eq('business_id', business.id)
        .single();
      preferences = data;
    }
    
    // If no business preferences, check for user preferences
    if (!preferences) {
      const { data } = await supabase
        .from('lender_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      preferences = data;
    }

    return NextResponse.json({ 
      preferences: preferences || null,
      isBusinessLender: !!business,
      businessId: business?.id || null,
      userId: user.id,
    });
  } catch (error) {
    console.error('Error in GET preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create or update lender preferences
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      is_active,
      auto_accept,
      min_amount,
      max_amount,
      preferred_currency,
      interest_rate,
      interest_type,
      countries,
      states,
      min_borrower_rating,
      require_verified_borrower,
      min_term_weeks,
      max_term_weeks,
      capital_pool,
      notify_on_match,
      notify_email,
      notify_sms,
      // First-time borrower settings
      first_time_borrower_limit,
      allow_first_time_borrowers,
    } = body;

    // Validation
    if (min_amount && max_amount && min_amount > max_amount) {
      return NextResponse.json({ error: 'Min amount cannot be greater than max amount' }, { status: 400 });
    }

    if (capital_pool !== undefined && capital_pool < 0) {
      return NextResponse.json({ error: 'Capital pool cannot be negative' }, { status: 400 });
    }

    // Check if user has a business profile
    const { data: business } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Prepare preference data
    const preferencesData: any = {
      is_active: is_active ?? true,
      auto_accept: auto_accept ?? false,
      min_amount: min_amount ?? 50,
      max_amount: max_amount ?? 5000,
      preferred_currency: preferred_currency ?? 'USD',
      interest_rate: interest_rate ?? 10,
      interest_type: interest_type ?? 'simple',
      countries: countries ?? [],
      states: states ?? [],
      min_borrower_rating: min_borrower_rating ?? 'neutral',
      require_verified_borrower: require_verified_borrower ?? false,
      min_term_weeks: min_term_weeks ?? 1,
      max_term_weeks: max_term_weeks ?? 52,
      capital_pool: capital_pool ?? 0,
      notify_on_match: notify_on_match ?? true,
      notify_email: notify_email ?? true,
      notify_sms: notify_sms ?? false,
      // First-time borrower settings
      first_time_borrower_limit: first_time_borrower_limit ?? 500,
      allow_first_time_borrowers: allow_first_time_borrowers ?? true,
    };

    // Check if existing preferences exist
    let existingPrefs = null;
    
    if (business) {
      const { data } = await supabase
        .from('lender_preferences')
        .select('id')
        .eq('business_id', business.id)
        .single();
      existingPrefs = data;
    } else {
      const { data } = await supabase
        .from('lender_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();
      existingPrefs = data;
    }

    let result;

    if (existingPrefs) {
      // Update existing record
      const { data, error } = await supabase
        .from('lender_preferences')
        .update(preferencesData)
        .eq('id', existingPrefs.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating preferences:', error);
        return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
      }
      result = data;
    } else {
      // Insert new record with proper ID
      if (business) {
        preferencesData.business_id = business.id;
        preferencesData.user_id = null;
      } else {
        preferencesData.user_id = user.id;
        preferencesData.business_id = null;
      }

      const { data, error } = await supabase
        .from('lender_preferences')
        .insert(preferencesData)
        .select()
        .single();

      if (error) {
        console.error('Error inserting preferences:', error);
        return NextResponse.json({ error: 'Failed to save preferences: ' + error.message }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json({ success: true, preferences: result });
  } catch (error) {
    console.error('Error in POST preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Alias for POST — the preferences page sends PUT to update existing records
export { POST as PUT };
