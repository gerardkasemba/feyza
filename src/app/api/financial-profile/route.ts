import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET - Fetch user's financial profile
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile, error } = await supabase
      .from('user_financial_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json(null); // Table not created yet
      }
      console.error('Error fetching financial profile:', error);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
    
    // Calculate disposable income if profile exists
    if (profile) {
      const disposableIncome = Math.max(0, (profile.monthly_income || 0) - (profile.monthly_expenses || 0));
      return NextResponse.json({
        ...profile,
        disposable_income: disposableIncome,
      });
    }
    
    return NextResponse.json(null);
  } catch (error) {
    console.error('Error in GET /api/financial-profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create or update financial profile
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.pay_frequency || body.pay_amount === undefined) {
      return NextResponse.json({ error: 'Pay frequency and amount are required' }, { status: 400 });
    }
    
    // Check if profile exists first
    const { data: existing } = await supabase
      .from('user_financial_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    // Prepare profile data (exclude generated columns monthly_income and monthly_expenses)
    const profileData: Record<string, any> = {
      pay_frequency: body.pay_frequency,
      pay_amount: parseFloat(body.pay_amount) || 0,
      pay_day_of_week: body.pay_day_of_week !== undefined && body.pay_day_of_week !== '' ? parseInt(body.pay_day_of_week) : null,
      pay_day_of_month: body.pay_day_of_month !== undefined && body.pay_day_of_month !== '' ? parseInt(body.pay_day_of_month) : null,
      second_pay_day_of_month: body.second_pay_day_of_month !== undefined && body.second_pay_day_of_month !== '' ? parseInt(body.second_pay_day_of_month) : null,
      rent_mortgage: parseFloat(body.rent_mortgage) || 0,
      utilities: parseFloat(body.utilities) || 0,
      transportation: parseFloat(body.transportation) || 0,
      insurance: parseFloat(body.insurance) || 0,
      groceries: parseFloat(body.groceries) || 0,
      phone: parseFloat(body.phone) || 0,
      subscriptions: parseFloat(body.subscriptions) || 0,
      childcare: parseFloat(body.childcare) || 0,
      other_bills: parseFloat(body.other_bills) || 0,
      existing_debt_payments: parseFloat(body.existing_debt_payments) || 0,
      comfort_level: body.comfort_level || 'balanced',
      preferred_payment_buffer_days: parseInt(body.preferred_payment_buffer_days) || 2,
      is_complete: true,
    };
    
    let data, error;
    
    if (existing) {
      // Update existing profile
      const result = await supabase
        .from('user_financial_profiles')
        .update(profileData)
        .eq('user_id', user.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Insert new profile
      profileData.user_id = user.id;
      const result = await supabase
        .from('user_financial_profiles')
        .insert(profileData)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }
    
    if (error) {
      console.error('Error saving financial profile:', error);
      // Check for table not existing
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Income profiles feature not yet enabled. Please run database migrations.' 
        }, { status: 503 });
      }
      return NextResponse.json({ error: error.message || 'Failed to save profile' }, { status: 500 });
    }
    
    // Calculate disposable income
    const disposableIncome = Math.max(0, (data.monthly_income || 0) - (data.monthly_expenses || 0));
    
    return NextResponse.json({
      ...data,
      disposable_income: disposableIncome,
    });
  } catch (error: any) {
    console.error('Error in POST /api/financial-profile:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove financial profile
export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { error } = await supabase
      .from('user_financial_profiles')
      .delete()
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting financial profile:', error);
      return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/financial-profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
