import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('loan-types');

export interface LoanType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  display_order: number;
  min_amount?: number;
  max_amount?: number;
  min_interest_rate?: number;
  max_interest_rate?: number;
  max_term_months?: number;
}

// Default loan types when table doesn't exist
const DEFAULT_LOAN_TYPES: LoanType[] = [
  { id: 'default-1', name: 'Personal Loan', slug: 'personal-loan', description: 'Loans between friends and family members', icon: 'users', is_active: true, display_order: 1, min_amount: 50, max_amount: 5000, min_interest_rate: 0, max_interest_rate: 15, max_term_months: 24 },
  { id: 'default-2', name: 'Business Micro-Loan', slug: 'business-micro-loan', description: 'Small loans from verified business lenders with competitive rates', icon: 'building', is_active: true, display_order: 2, min_amount: 100, max_amount: 2000, min_interest_rate: 5, max_interest_rate: 25, max_term_months: 12 },
  { id: 'default-3', name: 'Emergency Loan', slug: 'emergency-loan', description: 'Quick loans for urgent financial needs', icon: 'zap', is_active: true, display_order: 3, min_amount: 25, max_amount: 500, min_interest_rate: 0, max_interest_rate: 10, max_term_months: 3 },
  { id: 'default-4', name: 'Education Loan', slug: 'education-loan', description: 'Loans for educational expenses and tuition', icon: 'book', is_active: true, display_order: 4, min_amount: 100, max_amount: 3000, min_interest_rate: 0, max_interest_rate: 12, max_term_months: 18 },
  { id: 'default-5', name: 'Medical Loan', slug: 'medical-loan', description: 'Loans for medical and healthcare expenses', icon: 'heart', is_active: true, display_order: 5, min_amount: 50, max_amount: 2500, min_interest_rate: 0, max_interest_rate: 10, max_term_months: 12 },
];

// GET /api/loan-types - Get all active loan types
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('include_inactive') === 'true';
    const businessId = searchParams.get('business_id');

    // If business_id is provided, get loan types for that business
    if (businessId) {
      try {
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
          log.info('business_loan_types table may not exist, returning defaults');
          return NextResponse.json({ loanTypes: DEFAULT_LOAN_TYPES });
        }

        if (!businessLoanTypes || businessLoanTypes.length === 0) {
          // Return default loan types if business has none configured
          return NextResponse.json({ loanTypes: DEFAULT_LOAN_TYPES });
        }

        // Flatten the response
        const loanTypes = businessLoanTypes?.map(blt => ({
          id: (blt.loan_type as any)?.id,
          name: (blt.loan_type as any)?.name,
          slug: (blt.loan_type as any)?.slug,
          description: (blt.loan_type as any)?.description,
          icon: (blt.loan_type as any)?.icon,
          display_order: (blt.loan_type as any)?.display_order,
          min_amount: blt.min_amount,
          max_amount: blt.max_amount,
          interest_rate: blt.interest_rate,
        })).filter(lt => lt.id).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

        return NextResponse.json({ loanTypes: loanTypes.length > 0 ? loanTypes : DEFAULT_LOAN_TYPES });
      } catch (err) {
        log.info('Error fetching business loan types, returning defaults');
        return NextResponse.json({ loanTypes: DEFAULT_LOAN_TYPES });
      }
    }

    // Get all loan types from database
    try {
      let query = supabase
        .from('loan_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data: loanTypes, error } = await query;

      if (error) {
        log.info('loan_types table may not exist, returning defaults:', (error as Error).message);
        return NextResponse.json({ loanTypes: DEFAULT_LOAN_TYPES });
      }

      // Return database loan types or defaults if empty
      return NextResponse.json({ 
        loanTypes: (loanTypes && loanTypes.length > 0) ? loanTypes : DEFAULT_LOAN_TYPES 
      });
    } catch (err) {
      log.info('Error fetching loan types, returning defaults');
      return NextResponse.json({ loanTypes: DEFAULT_LOAN_TYPES });
    }
  } catch (error) {
    log.error('Error in loan types API:', error);
    // Always return something useful, even on error
    return NextResponse.json({ loanTypes: DEFAULT_LOAN_TYPES });
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
      log.error('Error creating loan type:', error);
      return NextResponse.json({ error: 'Failed to create loan type' }, { status: 500 });
    }

    return NextResponse.json({ loanType: newLoanType });
  } catch (error) {
    log.error('Error in loan types API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
