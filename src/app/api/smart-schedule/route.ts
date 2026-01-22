import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  calculateSmartSchedule,
  type FinancialProfile,
  type PayFrequency,
  type ComfortLevel,
} from '@/lib/smartSchedule';

// POST - Calculate smart repayment schedule
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { loan_amount, interest_rate = 0 } = body;
    
    if (!loan_amount || loan_amount <= 0) {
      return NextResponse.json({ error: 'Valid loan amount is required' }, { status: 400 });
    }
    
    // Fetch user's financial profile
    const { data: dbProfile, error } = await supabase
      .from('user_financial_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching financial profile:', error);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
    
    // If no profile, return a message asking them to set one up
    if (!dbProfile) {
      return NextResponse.json({
        hasProfile: false,
        message: 'Set up your income profile to get personalized repayment suggestions.',
        // Provide default suggestions anyway
        defaultSuggestions: {
          comfortable: {
            amount: Math.round(loan_amount / 6),
            frequency: 'biweekly',
            numberOfPayments: 6,
            weeksToPayoff: 12,
            description: 'Default suggestion - set up your profile for personalized amounts',
          },
          balanced: {
            amount: Math.round(loan_amount / 4),
            frequency: 'biweekly',
            numberOfPayments: 4,
            weeksToPayoff: 8,
            description: 'Default suggestion - set up your profile for personalized amounts',
          },
          aggressive: {
            amount: Math.round(loan_amount / 3),
            frequency: 'biweekly',
            numberOfPayments: 3,
            weeksToPayoff: 6,
            description: 'Default suggestion - set up your profile for personalized amounts',
          },
        },
      });
    }
    
    // Convert DB profile to FinancialProfile type
    const profile: FinancialProfile = {
      payFrequency: dbProfile.pay_frequency as PayFrequency,
      payAmount: parseFloat(dbProfile.pay_amount) || 0,
      payDayOfWeek: dbProfile.pay_day_of_week,
      payDayOfMonth: dbProfile.pay_day_of_month,
      secondPayDayOfMonth: dbProfile.second_pay_day_of_month,
      rentMortgage: parseFloat(dbProfile.rent_mortgage) || 0,
      utilities: parseFloat(dbProfile.utilities) || 0,
      transportation: parseFloat(dbProfile.transportation) || 0,
      insurance: parseFloat(dbProfile.insurance) || 0,
      groceries: parseFloat(dbProfile.groceries) || 0,
      phone: parseFloat(dbProfile.phone) || 0,
      subscriptions: parseFloat(dbProfile.subscriptions) || 0,
      childcare: parseFloat(dbProfile.childcare) || 0,
      otherBills: parseFloat(dbProfile.other_bills) || 0,
      existingDebtPayments: parseFloat(dbProfile.existing_debt_payments) || 0,
      comfortLevel: (dbProfile.comfort_level || 'balanced') as ComfortLevel,
      preferredPaymentBufferDays: dbProfile.preferred_payment_buffer_days || 2,
    };
    
    // Calculate smart schedule
    const result = calculateSmartSchedule(profile, loan_amount, interest_rate);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in POST /api/smart-schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
