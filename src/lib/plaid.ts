import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

// Plaid configuration
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

// Products we need for Dwolla integration
export const PLAID_PRODUCTS: Products[] = [Products.Auth];

// Supported countries
export const PLAID_COUNTRY_CODES: CountryCode[] = [CountryCode.Us];

// Create a link token for Plaid Link
export async function createLinkToken(userId: string, isUpdate = false, accessToken?: string) {
  const request: any = {
    user: { client_user_id: userId },
    client_name: 'Feyza',
    products: PLAID_PRODUCTS,
    country_codes: PLAID_COUNTRY_CODES,
    language: 'en',
  };

  // For updating existing connection
  if (isUpdate && accessToken) {
    request.access_token = accessToken;
  }

  const response = await plaidClient.linkTokenCreate(request);
  return response.data;
}

// Exchange public token for access token
export async function exchangePublicToken(publicToken: string) {
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });
  return response.data;
}

// Get auth data (bank account and routing numbers)
export async function getAuthData(accessToken: string) {
  const response = await plaidClient.authGet({
    access_token: accessToken,
  });
  return response.data;
}

// Get account info
export async function getAccounts(accessToken: string) {
  const response = await plaidClient.accountsGet({
    access_token: accessToken,
  });
  return response.data;
}

// Get institution info
export async function getInstitution(institutionId: string) {
  const response = await plaidClient.institutionsGetById({
    institution_id: institutionId,
    country_codes: PLAID_COUNTRY_CODES,
  });
  return response.data;
}

// Create Plaid processor token for Dwolla
export async function createProcessorToken(accessToken: string, accountId: string) {
  const response = await plaidClient.processorTokenCreate({
    access_token: accessToken,
    account_id: accountId,
    processor: 'dwolla' as any,
  });
  return response.data;
}

// Remove item (disconnect bank)
export async function removeItem(accessToken: string) {
  const response = await plaidClient.itemRemove({
    access_token: accessToken,
  });
  return response.data;
}
