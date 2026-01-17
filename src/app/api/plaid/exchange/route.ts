import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { exchangePublicToken, getAccounts, createProcessorToken, getInstitution } from '@/lib/plaid';
import { 
  createCustomer, 
  createFundingSourceWithPlaid, 
  getCustomer,
  listFundingSources 
} from '@/lib/dwolla';

// POST: Exchange Plaid public token and create Dwolla funding source
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { public_token, account_id, institution } = body;

    if (!public_token || !account_id) {
      return NextResponse.json(
        { error: 'Missing public_token or account_id' },
        { status: 400 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // 1. Exchange public token for access token
    const exchangeResponse = await exchangePublicToken(public_token);
    const accessToken = exchangeResponse.access_token;
    const itemId = exchangeResponse.item_id;

    // 2. Get account details
    const accountsResponse = await getAccounts(accessToken);
    const account = accountsResponse.accounts.find(a => a.account_id === account_id);
    
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // 3. Create Dwolla customer if not exists
    let dwollaCustomerUrl = profile.dwolla_customer_url;
    
    if (!dwollaCustomerUrl) {
      // Parse full name into first/last
      const nameParts = (profile.full_name || 'User Unknown').split(' ');
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || 'Unknown';

      dwollaCustomerUrl = await createCustomer({
        firstName,
        lastName,
        email: profile.email,
      });

      // Save Dwolla customer URL to user profile
      await supabase
        .from('users')
        .update({ 
          dwolla_customer_url: dwollaCustomerUrl,
          dwolla_customer_id: dwollaCustomerUrl?.split('/').pop(),
        })
        .eq('id', user.id);
    }

    // 4. Create Plaid processor token for Dwolla
    const processorTokenResponse = await createProcessorToken(accessToken, account_id);
    const processorToken = processorTokenResponse.processor_token;

    // 5. Create funding source in Dwolla using processor token
    const bankName = institution?.name || account.name || 'Bank Account';
    const fundingSourceUrl = await createFundingSourceWithPlaid(
      dwollaCustomerUrl!,
      processorToken,
      `${bankName} - ${account.mask}`
    );

    // 6. Save bank account info to database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        plaid_access_token: accessToken,
        plaid_item_id: itemId,
        plaid_account_id: account_id,
        dwolla_funding_source_url: fundingSourceUrl,
        dwolla_funding_source_id: fundingSourceUrl?.split('/').pop(),
        bank_name: bankName,
        bank_account_mask: account.mask,
        bank_account_type: account.subtype,
        bank_connected: true,
        bank_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error saving bank info:', updateError);
      // Don't fail - bank is connected in Dwolla
    }

    return NextResponse.json({
      success: true,
      bank_name: bankName,
      account_mask: account.mask,
      account_type: account.subtype,
      funding_source_id: fundingSourceUrl?.split('/').pop(),
    });
  } catch (error: any) {
    console.error('Error exchanging Plaid token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect bank account' },
      { status: 500 }
    );
  }
}
