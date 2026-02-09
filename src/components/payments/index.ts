// Plaid/Dwolla payment components (automated - requires licensing)
export { PlaidLinkButton, ConnectedBank, BankConnectionRequired } from './PlaidLink';

// Payment provider system (manual + automated)
export { default as PaymentMethodSelector } from './PaymentMethodSelector';
export { default as PaymentProofUpload } from './PaymentProofUpload';
export { default as PaymentActionCard } from './PaymentActionCard';
export { default as ConnectedPaymentMethods } from './ConnectedPaymentMethods';
export { default as ConnectedPaymentDisplay } from './ConnectedPaymentDisplay';
export { default as BorrowerPaymentMethods } from './BorrowerPaymentMethods';

// Smart payment components (admin-controlled)
export { default as PaymentSetupBanner, usePaymentSetupStatus } from './PaymentSetupBanner';
export { default as SmartPaymentSection } from './SmartPaymentSection';

// Settings
export { default as UserPaymentMethodsSettings } from '../settings/UserPaymentMethodsSettings';

// Legacy exports
export { default as MakePaymentSection } from './MakePaymentSection';

// Legacy PayPal exports (deprecated - will be removed)
// export { PayPalPayment } from './PayPalPayment';
// export { PayPalConnect } from './PayPalConnect';
// export { PayPalRequirementModal } from './PayPalRequirementModal';
