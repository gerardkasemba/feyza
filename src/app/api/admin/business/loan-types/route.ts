import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('admin-business-loan-types');

// GET /api/business/loan-types - Get loan types for the current user's business
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
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get all loan types with business selection status
    const { data: allLoanTypes } = await supabase
      .from('loan_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    const { data: selectedTypes } = await supabase
      .from('business_loan_types')
      .select('loan_type_id, min_amount, max_amount, interest_rate, is_active')
      .eq('business_id', business.id);

    // Map selected types by id for easy lookup
    const selectedMap = new Map(
      selectedTypes?.map(st => [st.loan_type_id, st]) || []
    );

    // Combine data
    const loanTypes = allLoanTypes?.map(lt => ({
      ...lt,
      isSelected: selectedMap.has(lt.id) && selectedMap.get(lt.id)?.is_active,
      businessSettings: selectedMap.get(lt.id) || null,
    }));

    return NextResponse.json({ 
      businessId: business.id,
      loanTypes 
    });
  } catch (error) {
    log.error('Error fetching business loan types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/business/loan-types - Update loan types for the current user's business
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
    const { loanTypeIds, loanTypeSettings } = body;

    // loanTypeIds: string[] - array of loan type IDs to enable
    // loanTypeSettings: { [loanTypeId]: { min_amount?, max_amount?, interest_rate? } } - optional per-type settings

    if (!Array.isArray(loanTypeIds)) {
      return NextResponse.json({ error: 'loanTypeIds must be an array' }, { status: 400 });
    }

    // First, deactivate all existing loan types for this business
    await supabase
      .from('business_loan_types')
      .update({ is_active: false })
      .eq('business_id', business.id);

    // Then, upsert the selected loan types
    if (loanTypeIds.length > 0) {
      const upsertData = loanTypeIds.map(loanTypeId => ({
        business_id: business.id,
        loan_type_id: loanTypeId,
        is_active: true,
        min_amount: loanTypeSettings?.[loanTypeId]?.min_amount || null,
        max_amount: loanTypeSettings?.[loanTypeId]?.max_amount || null,
        interest_rate: loanTypeSettings?.[loanTypeId]?.interest_rate || null,
      }));

      const { error: upsertError } = await supabase
        .from('business_loan_types')
        .upsert(upsertData, {
          onConflict: 'business_id,loan_type_id',
        });

      if (upsertError) {
        log.error('Error upserting business loan types:', upsertError);
        return NextResponse.json({ error: 'Failed to update loan types' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Updated ${loanTypeIds.length} loan type(s)` 
    });
  } catch (error) {
    log.error('Error updating business loan types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
