import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('business-terms');

// GET /api/business/terms - Get lending terms for current user's business
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's business
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('id, lending_terms, lending_terms_updated_at')
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      lending_terms: business.lending_terms,
      updated_at: business.lending_terms_updated_at
    });
  } catch (error) {
    log.error('Error fetching lending terms:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/business/terms - Update lending terms for current user's business
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's business
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const body = await request.json();
    const { lending_terms } = body;

    // Update the business profile
    const { error: updateError } = await supabase
      .from('business_profiles')
      .update({
        lending_terms: lending_terms || null,
        lending_terms_updated_at: lending_terms ? new Date().toISOString() : null,
      })
      .eq('id', business.id);

    if (updateError) {
      log.error('Error updating lending terms:', updateError);
      return NextResponse.json({ error: 'Failed to update terms' }, { status: 500 });
    }

    // Also update lender_preferences if it exists
    await supabase
      .from('lender_preferences')
      .update({
        lending_terms: lending_terms || null,
        lending_terms_updated_at: lending_terms ? new Date().toISOString() : null,
      })
      .eq('business_id', business.id);

    return NextResponse.json({ 
      success: true, 
      message: lending_terms ? 'Lending terms updated' : 'Lending terms removed'
    });
  } catch (error) {
    log.error('Error updating lending terms:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
