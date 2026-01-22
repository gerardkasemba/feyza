import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface LoanType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  display_order: number;
}

// GET /api/loan-types - Get all active loan types
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('include_inactive') === 'true';
    const businessId = searchParams.get('business_id');

    // If business_id is provided, get loan types for that business
    if (businessId) {
      const { data: businessLoanTypes, error } = await supabase
        .from('business_loan_types')
        .select(`
          id,
          min_amount,
          max_amount,
          interest_rate,
          is_active,
          loan_type:loan_types(id, name, slug, description, icon, display_order)
        `)
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching business loan types:', error);
        return NextResponse.json({ error: 'Failed to fetch loan types' }, { status: 500 });
      }

      // Flatten the response
      const loanTypes = businessLoanTypes?.map(blt => ({
        id: (blt.loan_type as any)?.id,
        name: (blt.loan_type as any)?.name,
        slug: (blt.loan_type as any)?.slug,
        description: (blt.loan_type as any)?.description,
        icon: (blt.loan_type as any)?.icon,
        display_order: (blt.loan_type as any)?.display_order,
        // Business-specific overrides
        min_amount: blt.min_amount,
        max_amount: blt.max_amount,
        interest_rate: blt.interest_rate,
      })).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

      return NextResponse.json({ loanTypes });
    }

    // Get all loan types
    let query = supabase
      .from('loan_types')
      .select('*')
      .order('display_order', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: loanTypes, error } = await query;

    if (error) {
      console.error('Error fetching loan types:', error);
      return NextResponse.json({ error: 'Failed to fetch loan types' }, { status: 500 });
    }

    return NextResponse.json({ loanTypes });
  } catch (error) {
    console.error('Error in loan types API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/loan-types - Admin: Create a new loan type
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, icon } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    // Get max display_order
    const { data: maxOrder } = await supabase
      .from('loan_types')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const displayOrder = (maxOrder?.display_order || 0) + 1;

    const { data: newLoanType, error } = await supabase
      .from('loan_types')
      .insert({
        name,
        slug,
        description: description || null,
        icon: icon || null,
        display_order: displayOrder,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A loan type with this name already exists' }, { status: 400 });
      }
      console.error('Error creating loan type:', error);
      return NextResponse.json({ error: 'Failed to create loan type' }, { status: 500 });
    }

    return NextResponse.json({ loanType: newLoanType });
  } catch (error) {
    console.error('Error in loan types API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
