/**
 * Payment Deep Link Utilities
 * Generates deep links for various payment apps
 */

export interface PaymentDeepLinkParams {
  providerSlug: string;
  identifier: string;
  amount: number;
  note?: string;
  currency?: string;
}

/**
 * Generate a deep link URL for a payment provider
 * Returns null if the provider doesn't support deep links
 */
export function getPaymentDeepLink({
  providerSlug,
  identifier,
  amount,
  note = 'Payment via Feyza',
  currency = 'USD',
}: PaymentDeepLinkParams): string | null {
  const encodedNote = encodeURIComponent(note);
  const cleanIdentifier = identifier.trim();

  switch (providerSlug.toLowerCase()) {
    case 'cashapp':
    case 'cash_app':
    case 'cash-app':
      // CashApp: https://cash.app/$username/amount
      // Remove $ if already present
      const cashAppUser = cleanIdentifier.startsWith('$') 
        ? cleanIdentifier 
        : `$${cleanIdentifier}`;
      return `https://cash.app/${cashAppUser}/${amount}`;

    case 'venmo':
      // Venmo: https://venmo.com/username?txn=pay&amount=X&note=Y
      // Remove @ if present
      const venmoUser = cleanIdentifier.replace('@', '');
      return `https://venmo.com/${venmoUser}?txn=pay&amount=${amount}&note=${encodedNote}`;

    case 'paypal':
    case 'paypal_me':
      // PayPal.me: https://www.paypal.com/paypalme/username/amount
      // For email, extract username part
      const paypalUser = cleanIdentifier.includes('@') 
        ? cleanIdentifier.split('@')[0] 
        : cleanIdentifier;
      return `https://www.paypal.com/paypalme/${paypalUser}/${amount}`;

    case 'zelle':
      // Zelle doesn't have a universal deep link (bank-dependent)
      // Return null - UI should show the identifier for manual entry
      return null;

    case 'mpesa':
    case 'm-pesa':
      // M-Pesa doesn't have web deep links
      // Return null - UI should show phone number for USSD/app entry
      return null;

    case 'bank_transfer':
    case 'ach':
    case 'wire':
      // Bank transfers don't have deep links
      return null;

    default:
      return null;
  }
}

/**
 * Check if a payment provider supports "Open App" functionality
 */
export function supportsDeepLink(providerSlug: string): boolean {
  const supportedProviders = ['cashapp', 'cash_app', 'cash-app', 'venmo', 'paypal', 'paypal_me'];
  return supportedProviders.includes(providerSlug.toLowerCase());
}

/**
 * Get the display name for opening an app
 */
export function getOpenAppLabel(providerSlug: string): string {
  switch (providerSlug.toLowerCase()) {
    case 'cashapp':
    case 'cash_app':
    case 'cash-app':
      return 'Open Cash App';
    case 'venmo':
      return 'Open Venmo';
    case 'paypal':
    case 'paypal_me':
      return 'Open PayPal';
    default:
      return 'Open App';
  }
}

/**
 * Get instructions for manual payment methods
 */
export function getManualPaymentInstructions(
  providerSlug: string, 
  identifier: string,
  recipientName?: string
): string {
  switch (providerSlug.toLowerCase()) {
    case 'zelle':
      if (recipientName) {
        return `Send payment via Zelle to: ${identifier} (Name: ${recipientName}). Open your banking app and look for Zelle in the menu.`;
      }
      return `Send payment via Zelle to: ${identifier}. Open your banking app and look for Zelle in the menu.`;
    case 'mpesa':
    case 'm-pesa':
      return `Send payment via M-Pesa to: ${identifier}. Dial *334# or use the M-Pesa app.`;
    case 'bank_transfer':
    case 'ach':
      return `Transfer funds to the connected bank account. The transfer will be processed automatically.`;
    default:
      return `Send payment using the account details shown.`;
  }
}

/**
 * Get brand color for a provider
 */
export function getProviderBrandColor(providerSlug: string): string {
  switch (providerSlug.toLowerCase()) {
    case 'cashapp':
    case 'cash_app':
    case 'cash-app':
      return '#00D632';
    case 'venmo':
      return '#3D95CE';
    case 'paypal':
    case 'paypal_me':
      return '#0070BA';
    case 'zelle':
      return '#6D1ED4';
    case 'mpesa':
    case 'm-pesa':
      return '#4CAF50';
    default:
      return '#6B7280';
  }
}

/**
 * Get icon character/emoji for a provider (for simple displays)
 */
export function getProviderIcon(providerSlug: string): string {
  switch (providerSlug.toLowerCase()) {
    case 'cashapp':
    case 'cash_app':
    case 'cash-app':
      return '$';
    case 'venmo':
      return 'V';
    case 'paypal':
    case 'paypal_me':
      return 'P';
    case 'zelle':
      return 'Z';
    case 'mpesa':
    case 'm-pesa':
      return 'M';
    default:
      return '💳';
  }
}
