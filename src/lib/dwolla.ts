import { logger } from '@/lib/logger';
const log = logger('dwolla');
// Dwolla client library for ACH transfers
// dwolla-v2 exports { Client } so we need to access .Client
//
// PLATFORM FEE SUPPORT
// ====================
// Feyza charges a configurable platform fee on transactions.
// Fee settings are stored in the platform_settings table and can be
// configured by admins via the admin dashboard.
// 
// The fee is deducted from the transfer amount, so the recipient
// receives (amount - fee). The fee goes to Feyza's Master Account.

import { calculatePlatformFee, type FeeCalculation } from './platformFee';

// Re-export for convenience
export type { FeeCalculation };

/** Minimal interface for the dwolla-v2 AppClient (package lacks TS types) */
interface DwollaAppClient {
  get: (path: string, params?: Record<string, unknown>) => Promise<{ body: Record<string, unknown>; headers: { get: (key: string) => string | null } }>;
  post: (path: string, body?: unknown, headers?: Record<string, string>) => Promise<{ body: Record<string, unknown>; headers: { get: (key: string) => string | null } }>;
  delete: (path: string) => Promise<{ body: Record<string, unknown> }>;
}

let dwollaClient: DwollaAppClient | null = null;

async function getDwolla(): Promise<DwollaAppClient> {
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
    } catch (err: unknown) {
      log.error('Failed to initialize Dwolla client:', (err as Error).message);
      throw new Error(`Dwolla client initialization failed: ${(err as Error).message}`);
    }
  }
  return dwollaClient!;
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
  } catch (err: unknown) {
    // Handle duplicate email - return existing customer URL
    const dwollaErr = err as any;
    if (dwollaErr.body?._embedded?.errors?.[0]?.code === 'Duplicate') {
      const existingCustomerUrl = dwollaErr.body._embedded.errors[0]._links?.about?.href;
      if (existingCustomerUrl) {
        log.info('Dwolla customer already exists, using existing:', existingCustomerUrl);
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
  return (response.body as any)._embedded['funding-sources'];
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
  } catch (err: unknown) {
    // Handle duplicate bank account - return existing funding source URL
    const dwollaErr = err as any;
    if (dwollaErr.body?.code === 'DuplicateResource') {
      const existingFundingSourceUrl = dwollaErr.body._links?.about?.href;
      if (existingFundingSourceUrl) {
        log.info('Funding source already exists, using existing:', existingFundingSourceUrl);
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
// NOTE: No platform fee is charged - the full amount goes to the destination
export async function createTransfer(data: {
  sourceFundingSourceUrl: string;
  destinationFundingSourceUrl: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
}): Promise<string | null> {
  const dwolla = await getDwolla();
  
  log.info('Creating Dwolla transfer (no platform fee):', {
    source: data.sourceFundingSourceUrl,
    destination: data.destinationFundingSourceUrl,
    amount: data.amount,
  });
  
  try {
    // Transfer body - NO fees array included, full amount goes to destination
    const transferBody: Record<string, unknown> = {
      _links: {
        source: { href: data.sourceFundingSourceUrl },
        destination: { href: data.destinationFundingSourceUrl },
      },
      amount: {
        currency: data.currency || 'USD',
        value: data.amount.toFixed(2),
      },
      metadata: data.metadata,
      // NOTE: We explicitly do NOT include a 'fees' array here
      // This ensures the full amount is transferred without any platform fee deduction
    };
    
    const response = await dwolla.post('transfers', transferBody);
    
    const transferUrl = response.headers.get('location');
    log.info('Transfer created successfully:', transferUrl);
    return transferUrl;
  } catch (err: unknown) {
    log.error('Dwolla transfer error:', JSON.stringify((err as any).body || (err as Error).message, null, 2));
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
  return (response.body as any)._embedded?.transfers || [];
}

// Get Dwolla balance (master account)
export async function getMasterAccountBalance() {
  const dwolla = await getDwolla();
  const root = await getRoot() as any;
  const accountUrl = root._links.account.href;
  const response = await dwolla.get(`${accountUrl}/funding-sources`);
  const sources = (response.body as any)._embedded['funding-sources'];
  const balance = (sources as Array<{ type: string; _links?: Record<string, { href: string }> }>).find((s) => s.type === 'balance');
  return balance;
}

// Get Master Account funding source URL (balance)
export async function getMasterAccountBalanceUrl(): Promise<string | null> {
  try {
    const balance = await getMasterAccountBalance();
    return balance?._links?.self?.href || null;
  } catch (err: unknown) {
    log.error('Error getting master account balance:', err);
    return null;
  }
}

// Facilitated transfer - routes through Master Account for unverified-to-unverified transfers
// This is required because Dwolla doesn't allow direct transfers between two unverified customers
// Platform fee is deducted and kept in Master Account
export async function createFacilitatedTransfer(data: {
  sourceFundingSourceUrl: string;
  destinationFundingSourceUrl: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
  skipFee?: boolean; // Option to skip fee for certain transfers (e.g., disbursements)
}): Promise<{ 
  transferUrl: string | null; 
  transferIds: string[];
  feeInfo: FeeCalculation;
}> {
  const dwolla = await getDwolla();
  const transferIds: string[] = [];
  
  // Calculate platform fee
  const feeInfo = data.skipFee 
    ? {
        grossAmount: data.amount,
        platformFee: 0,
        netAmount: data.amount,
        feeType: 'fixed' as const,
        feeLabel: 'No Fee',
        feeDescription: 'Fee skipped',
        feeEnabled: false,
      }
    : await calculatePlatformFee(data.amount);
  
  log.info('Creating facilitated transfer through Master Account:', {
    source: data.sourceFundingSourceUrl,
    destination: data.destinationFundingSourceUrl,
    grossAmount: feeInfo.grossAmount,
    platformFee: feeInfo.platformFee,
    netAmount: feeInfo.netAmount,
    feeEnabled: feeInfo.feeEnabled,
  });
  
  try {
    // Get the Master Account Balance as intermediary
    const masterBalanceUrl = await getMasterAccountBalanceUrl();
    if (!masterBalanceUrl) {
      throw new Error('Could not get Master Account Balance URL');
    }
    
    log.info('Master Account Balance URL:', masterBalanceUrl);
    
    // Step 1: Transfer FULL amount FROM source TO Master Account Balance
    // This pulls the gross amount (including fee) from the source
    log.info('Step 1: Transferring gross amount from source to Master Account Balance...');
    const step1Response = await dwolla.post('transfers', {
      _links: {
        source: { href: data.sourceFundingSourceUrl },
        destination: { href: masterBalanceUrl },
      },
      amount: {
        currency: data.currency || 'USD',
        value: feeInfo.grossAmount.toFixed(2),
      },
      metadata: {
        ...data.metadata,
        step: 'source_to_balance',
        gross_amount: feeInfo.grossAmount.toFixed(2),
        platform_fee: feeInfo.platformFee.toFixed(2),
      },
    });
    
    const step1TransferUrl = step1Response.headers.get('location');
    const step1TransferId = step1TransferUrl?.split('/').pop();
    if (step1TransferId) transferIds.push(step1TransferId);
    log.info('Step 1 complete. Transfer URL:', step1TransferUrl);
    
    // Step 2: Transfer NET amount FROM Master Account Balance TO destination
    // The fee remains in the Master Account
    log.info('Step 2: Transferring net amount from Master Account Balance to destination...');
    const step2Response = await dwolla.post('transfers', {
      _links: {
        source: { href: masterBalanceUrl },
        destination: { href: data.destinationFundingSourceUrl },
      },
      amount: {
        currency: data.currency || 'USD',
        value: feeInfo.netAmount.toFixed(2),
      },
      metadata: {
        ...data.metadata,
        step: 'balance_to_destination',
        net_amount: feeInfo.netAmount.toFixed(2),
        platform_fee_retained: feeInfo.platformFee.toFixed(2),
      },
    });
    
    const step2TransferUrl = step2Response.headers.get('location');
    const step2TransferId = step2TransferUrl?.split('/').pop();
    if (step2TransferId) transferIds.push(step2TransferId);
    log.info('Step 2 complete. Transfer URL:', step2TransferUrl);
    log.info(`Platform fee retained: $${feeInfo.platformFee.toFixed(2)}`);
    
    return {
      transferUrl: step2TransferUrl,
      transferIds,
      feeInfo,
    };
  } catch (err: unknown) {
    log.error('Facilitated transfer error:', JSON.stringify((err as any).body || (err as Error).message, null, 2));
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
  } catch (err: unknown) {
    // Check if subscription already exists
    if ((err as any).body?.code === 'MaxNumberOfResources') {
      log.info('Webhook subscription already exists');
      const subs = await listWebhookSubscriptions();
      return (subs as Array<{ url: string; _links?: { self?: { href: string } } }>).find((s) => s.url === webhookUrl)?._links?.self?.href || null;
    }
    log.error('Error creating webhook subscription:', err);
    throw err;
  }
}

// List webhook subscriptions
export async function listWebhookSubscriptions() {
  const dwolla = await getDwolla();
  const response = await dwolla.get('webhook-subscriptions');
  return (response.body as any)._embedded?.['webhook-subscriptions'] || [];
}

// Delete webhook subscription
export async function deleteWebhookSubscription(subscriptionUrl: string) {
  const dwolla = await getDwolla();
  await dwolla.delete(subscriptionUrl);
}
