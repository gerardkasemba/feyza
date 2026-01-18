// Dwolla client library for ACH transfers
// dwolla-v2 exports { Client } so we need to access .Client

let dwollaClient: any = null;

async function getDwolla(): Promise<any> {
  if (!dwollaClient) {
    try {
      // dwolla-v2 exports { Client: ... } so we need to access .Client
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const dwollaV2 = require('dwolla-v2');
      const Client = dwollaV2.Client;
      
      if (!Client) {
        throw new Error('Dwolla Client not found in module');
      }
      
      dwollaClient = new Client({
        key: process.env.DWOLLA_APP_KEY,
        secret: process.env.DWOLLA_APP_SECRET,
        environment: process.env.DWOLLA_ENV || 'sandbox',
      });
    } catch (err: any) {
      console.error('Failed to initialize Dwolla client:', err.message);
      throw new Error(`Dwolla client initialization failed: ${err.message}`);
    }
  }
  return dwollaClient;
}

// Get the Dwolla API root
export async function getRoot() {
  const dwolla = await getDwolla();
  const response = await dwolla.get('/');
  return response.body;
}

// Create a Dwolla customer (for users)
// Using unverified customer type - only requires name and email
// Unverified customers can send up to $5,000/week and receive unlimited
export async function createCustomer(data: {
  firstName: string;
  lastName: string;
  email: string;
}): Promise<string | null> {
  const dwolla = await getDwolla();
  
  try {
    // Don't pass 'type' - defaults to unverified customer
    // Unverified customers only need firstName, lastName, email
    const response = await dwolla.post('customers', {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
    });
    
    return response.headers.get('location');
  } catch (err: any) {
    // Handle duplicate email - return existing customer URL
    if (err.body?._embedded?.errors?.[0]?.code === 'Duplicate') {
      const existingCustomerUrl = err.body._embedded.errors[0]._links?.about?.href;
      if (existingCustomerUrl) {
        console.log('Dwolla customer already exists, using existing:', existingCustomerUrl);
        return existingCustomerUrl;
      }
    }
    throw err;
  }
}

// Create a receive-only customer (for guests)
export async function createReceiveOnlyCustomer(data: {
  firstName: string;
  lastName: string;
  email: string;
  businessName?: string;
}): Promise<string | null> {
  const dwolla = await getDwolla();
  const response = await dwolla.post('customers', {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    type: 'receive-only',
    businessName: data.businessName,
  });
  
  return response.headers.get('location');
}

// Get customer by URL
export async function getCustomer(customerUrl: string) {
  const dwolla = await getDwolla();
  const response = await dwolla.get(customerUrl);
  return response.body;
}

// Get customer by ID
export async function getCustomerById(customerId: string) {
  const dwolla = await getDwolla();
  const response = await dwolla.get(`customers/${customerId}`);
  return response.body;
}

// List customer's funding sources (bank accounts)
export async function listFundingSources(customerUrl: string) {
  const dwolla = await getDwolla();
  const response = await dwolla.get(`${customerUrl}/funding-sources`);
  return response.body._embedded['funding-sources'];
}

// Create funding source using Plaid processor token
export async function createFundingSourceWithPlaid(
  customerUrl: string,
  plaidToken: string,
  name: string
): Promise<string | null> {
  const dwolla = await getDwolla();
  
  try {
    const response = await dwolla.post(`${customerUrl}/funding-sources`, {
      plaidToken,
      name,
    });
    
    return response.headers.get('location');
  } catch (err: any) {
    // Handle duplicate bank account - return existing funding source URL
    if (err.body?.code === 'DuplicateResource') {
      const existingFundingSourceUrl = err.body._links?.about?.href;
      if (existingFundingSourceUrl) {
        console.log('Funding source already exists, using existing:', existingFundingSourceUrl);
        return existingFundingSourceUrl;
      }
    }
    throw err;
  }
}

// Create funding source manually (for testing/fallback)
export async function createFundingSourceManually(
  customerUrl: string,
  data: {
    routingNumber: string;
    accountNumber: string;
    bankAccountType: 'checking' | 'savings';
    name: string;
  }
): Promise<string | null> {
  const dwolla = await getDwolla();
  const response = await dwolla.post(`${customerUrl}/funding-sources`, {
    routingNumber: data.routingNumber,
    accountNumber: data.accountNumber,
    bankAccountType: data.bankAccountType,
    name: data.name,
  });
  
  return response.headers.get('location');
}

// Get funding source details
export async function getFundingSource(fundingSourceUrl: string) {
  const dwolla = await getDwolla();
  const response = await dwolla.get(fundingSourceUrl);
  return response.body;
}

// Remove funding source
export async function removeFundingSource(fundingSourceUrl: string) {
  const dwolla = await getDwolla();
  const response = await dwolla.post(fundingSourceUrl, {
    removed: true,
  });
  return response.body;
}

// Initiate a transfer (payment)
export async function createTransfer(data: {
  sourceFundingSourceUrl: string;
  destinationFundingSourceUrl: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
}): Promise<string | null> {
  const dwolla = await getDwolla();
  
  console.log('Creating Dwolla transfer:', {
    source: data.sourceFundingSourceUrl,
    destination: data.destinationFundingSourceUrl,
    amount: data.amount,
  });
  
  try {
    const response = await dwolla.post('transfers', {
      _links: {
        source: { href: data.sourceFundingSourceUrl },
        destination: { href: data.destinationFundingSourceUrl },
      },
      amount: {
        currency: data.currency || 'USD',
        value: data.amount.toFixed(2),
      },
      metadata: data.metadata,
    });
    
    const transferUrl = response.headers.get('location');
    console.log('Transfer created successfully:', transferUrl);
    return transferUrl;
  } catch (err: any) {
    console.error('Dwolla transfer error:', JSON.stringify(err.body || err.message, null, 2));
    throw err;
  }
}

// Get transfer status
export async function getTransfer(transferUrl: string) {
  const dwolla = await getDwolla();
  const response = await dwolla.get(transferUrl);
  return response.body;
}

// Get transfer by ID
export async function getTransferById(transferId: string) {
  const dwolla = await getDwolla();
  const response = await dwolla.get(`transfers/${transferId}`);
  return response.body;
}

// List transfers for a customer
export async function listTransfers(customerUrl: string) {
  const dwolla = await getDwolla();
  const response = await dwolla.get(`${customerUrl}/transfers`);
  return response.body._embedded?.transfers || [];
}

// Get Dwolla balance (master account)
export async function getMasterAccountBalance() {
  const dwolla = await getDwolla();
  const root = await getRoot();
  const accountUrl = root._links.account.href;
  const response = await dwolla.get(`${accountUrl}/funding-sources`);
  const sources = response.body._embedded['funding-sources'];
  const balance = sources.find((s: any) => s.type === 'balance');
  return balance;
}

// Get Master Account funding source URL (balance)
export async function getMasterAccountBalanceUrl(): Promise<string | null> {
  try {
    const balance = await getMasterAccountBalance();
    return balance?._links?.self?.href || null;
  } catch (err: any) {
    console.error('Error getting master account balance:', err);
    return null;
  }
}

// Facilitated transfer - routes through Master Account for unverified-to-unverified transfers
// This is required because Dwolla doesn't allow direct transfers between two unverified customers
export async function createFacilitatedTransfer(data: {
  sourceFundingSourceUrl: string;
  destinationFundingSourceUrl: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
}): Promise<{ transferUrl: string | null; transferIds: string[] }> {
  const dwolla = await getDwolla();
  const transferIds: string[] = [];
  
  console.log('Creating facilitated transfer through Master Account:', {
    source: data.sourceFundingSourceUrl,
    destination: data.destinationFundingSourceUrl,
    amount: data.amount,
  });
  
  try {
    // Get the Master Account Balance as intermediary
    const masterBalanceUrl = await getMasterAccountBalanceUrl();
    if (!masterBalanceUrl) {
      throw new Error('Could not get Master Account Balance URL');
    }
    
    console.log('Master Account Balance URL:', masterBalanceUrl);
    
    // Step 1: Transfer FROM source TO Master Account Balance
    console.log('Step 1: Transferring from source to Master Account Balance...');
    const step1Response = await dwolla.post('transfers', {
      _links: {
        source: { href: data.sourceFundingSourceUrl },
        destination: { href: masterBalanceUrl },
      },
      amount: {
        currency: data.currency || 'USD',
        value: data.amount.toFixed(2),
      },
      metadata: {
        ...data.metadata,
        step: 'source_to_balance',
      },
    });
    
    const step1TransferUrl = step1Response.headers.get('location');
    const step1TransferId = step1TransferUrl?.split('/').pop();
    if (step1TransferId) transferIds.push(step1TransferId);
    console.log('Step 1 complete. Transfer URL:', step1TransferUrl);
    
    // Step 2: Transfer FROM Master Account Balance TO destination
    console.log('Step 2: Transferring from Master Account Balance to destination...');
    const step2Response = await dwolla.post('transfers', {
      _links: {
        source: { href: masterBalanceUrl },
        destination: { href: data.destinationFundingSourceUrl },
      },
      amount: {
        currency: data.currency || 'USD',
        value: data.amount.toFixed(2),
      },
      metadata: {
        ...data.metadata,
        step: 'balance_to_destination',
      },
    });
    
    const step2TransferUrl = step2Response.headers.get('location');
    const step2TransferId = step2TransferUrl?.split('/').pop();
    if (step2TransferId) transferIds.push(step2TransferId);
    console.log('Step 2 complete. Transfer URL:', step2TransferUrl);
    
    return {
      transferUrl: step2TransferUrl,
      transferIds,
    };
  } catch (err: any) {
    console.error('Facilitated transfer error:', JSON.stringify(err.body || err.message, null, 2));
    throw err;
  }
}

// Webhook signature verification
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  webhookSecret: string
): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');
  return signature === expectedSignature;
}

// Create webhook subscription
export async function createWebhookSubscription(webhookUrl: string): Promise<string | null> {
  const dwolla = await getDwolla();
  
  try {
    const response = await dwolla.post('webhook-subscriptions', {
      url: webhookUrl,
      secret: process.env.DWOLLA_WEBHOOK_SECRET,
    });
    
    return response.headers.get('location');
  } catch (err: any) {
    // Check if subscription already exists
    if (err.body?.code === 'MaxNumberOfResources') {
      console.log('Webhook subscription already exists');
      const subs = await listWebhookSubscriptions();
      return subs.find((s: any) => s.url === webhookUrl)?._links?.self?.href || null;
    }
    console.error('Error creating webhook subscription:', err);
    throw err;
  }
}

// List webhook subscriptions
export async function listWebhookSubscriptions() {
  const dwolla = await getDwolla();
  const response = await dwolla.get('webhook-subscriptions');
  return response.body._embedded?.['webhook-subscriptions'] || [];
}

// Delete webhook subscription
export async function deleteWebhookSubscription(subscriptionUrl: string) {
  const dwolla = await getDwolla();
  await dwolla.delete(subscriptionUrl);
}
