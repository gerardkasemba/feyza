import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createCustomer, createFundingSourceWithPlaid } from '@/lib/dwolla';
import { v4 as uuidv4 } from 'uuid';

// POST: Create a guest lender account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { full_name, email, bank_info } = body;

    if (!full_name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json({
        user_id: existingUser.id,
        existing: true,
      });
    }

    // Create user record
    const nameParts = full_name.split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || 'Unknown';

    // Create Dwolla customer
    let dwollaCustomerUrl = null;
    try {
      dwollaCustomerUrl = await createCustomer({
        firstName,
        lastName,
        email: email.toLowerCase(),
      });
    } catch (err) {
      console.error('Error creating Dwolla customer:', err);
    }

    // Generate UUID for user
    const newUserId = uuidv4();

    // Create user in database
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: newUserId,
        email: email.toLowerCase(),
        full_name,
        user_type: 'individual',
        dwolla_customer_url: dwollaCustomerUrl,
        dwolla_customer_id: dwollaCustomerUrl?.split('/').pop(),
        // Bank info if provided
        bank_name: bank_info?.bank_name,
        bank_account_mask: bank_info?.account_mask,
        bank_account_type: bank_info?.account_type,
        dwolla_funding_source_id: bank_info?.funding_source_id,
        bank_connected: !!bank_info?.funding_source_id,
        bank_connected_at: bank_info ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user_id: newUser.id,
      dwolla_customer_id: dwollaCustomerUrl?.split('/').pop(),
    });
  } catch (error: any) {
    console.error('Error creating guest lender:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    );
  }
}
