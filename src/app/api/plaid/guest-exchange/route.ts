import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { exchangePublicToken, getAccounts, createProcessorToken } from '@/lib/plaid';
import { createCustomer, createFundingSourceWithPlaid } from '@/lib/dwolla';

// POST: Exchange Plaid public token for a guest user
// Stores Dwolla info directly (doesn't create user record due to FK constraint)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { public_token, account_id, institution, name, email, loan_request_id } = body;

    if (!public_token || !account_id) {
      return NextResponse.json(
        { error: 'Missing public_token or account_id' },
        { status: 400 }
      );
    }

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

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

    const bankName = institution?.name || account.name || 'Bank Account';

    // 3. Create Dwolla customer (unverified - no user record needed)
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || 'Unknown';

    let dwollaCustomerUrl: string | null = null;
    let dwollaFundingSourceUrl: string | null = null;

    try {
      dwollaCustomerUrl = await createCustomer({
        firstName,
        lastName,
        email: email.toLowerCase(),
      });
      console.log('Created Dwolla customer:', dwollaCustomerUrl);
    } catch (err: any) {
      console.error('Error creating Dwolla customer:', err.message);
      // Continue - we can still store Plaid info
    }

    // 4. Create Plaid processor token for Dwolla (if Dwolla customer created)
    if (dwollaCustomerUrl) {
      try {
        const processorTokenResponse = await createProcessorToken(accessToken, account_id);
        const processorToken = processorTokenResponse.processor_token;

        dwollaFundingSourceUrl = await createFundingSourceWithPlaid(
          dwollaCustomerUrl,
          processorToken,
          `${bankName} - ${account.mask}`
        );
        console.log('Created Dwolla funding source:', dwollaFundingSourceUrl);
      } catch (err: any) {
        console.error('Error creating Dwolla funding source:', err.message);
        // Continue - Plaid-Dwolla integration may not be enabled
      }
    }

    // 5. If loan_request_id provided, update that record
    if (loan_request_id) {
      const { error: updateError } = await supabase
        .from('loan_requests')
        .update({
          borrower_name: name,
          borrower_email: email.toLowerCase(),
          borrower_dwolla_customer_url: dwollaCustomerUrl,
          borrower_dwolla_customer_id: dwollaCustomerUrl?.split('/').pop(),
          borrower_dwolla_funding_source_url: dwollaFundingSourceUrl,
          borrower_dwolla_funding_source_id: dwollaFundingSourceUrl?.split('/').pop(),
          borrower_plaid_access_token: accessToken,
          borrower_bank_name: bankName,
          borrower_bank_account_mask: account.mask,
          borrower_bank_account_type: account.subtype,
          borrower_bank_connected: true,
        })
        .eq('id', loan_request_id);

      if (updateError) {
        console.error('Error updating loan request:', updateError);
      }
    }

    // Return the Dwolla info (to be stored by frontend or used later)
    return NextResponse.json({
      success: true,
      bank_name: bankName,
      account_mask: account.mask,
      account_type: account.subtype,
      dwolla_customer_url: dwollaCustomerUrl,
      dwolla_customer_id: dwollaCustomerUrl?.split('/').pop(),
      dwolla_funding_source_url: dwollaFundingSourceUrl,
      dwolla_funding_source_id: dwollaFundingSourceUrl?.split('/').pop(),
      plaid_access_token: accessToken,
    });
  } catch (error: any) {
    console.error('Error in guest Plaid exchange:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect bank account' },
      { status: 500 }
    );
  }
}
