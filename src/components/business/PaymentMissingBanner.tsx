'use client';

import React from 'react';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import { AlertCircle, CreditCard, Settings } from 'lucide-react';

interface PaymentMissingBannerProps {
  businessProfile: import("@/types").BusinessProfile;
  isDwollaEnabled: boolean;
}

/**
 * PaymentMissingBanner
 * 
 * Shows a warning banner if the business hasn't configured any payment methods.
 * This prevents accepting loans without a way to receive repayments.
 * 
 * Checks for:
 * - Dwolla enabled: bank_connected
 * - Manual payment: paypal_email, cashapp_username, venmo_username, zelle_email, or zelle_phone
 */
export function PaymentMissingBanner({ businessProfile, isDwollaEnabled }: PaymentMissingBannerProps) {
  // Check if any payment method is configured
  const hasPaymentMethod = React.useMemo(() => {
    if (isDwollaEnabled) {
      // If Dwolla is enabled, check for bank connection
      return businessProfile.bank_connected;
    } else {
      // If manual payment, check for any payment method
      return !!(
        businessProfile.paypal_email ||
        businessProfile.cashapp_username ||
        businessProfile.venmo_username ||
        businessProfile.zelle_email ||
        businessProfile.zelle_phone
      );
    }
  }, [businessProfile, isDwollaEnabled]);

  // Don't show banner if payment method is configured
  if (hasPaymentMethod) {
    return null;
  }

  return (
    <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 mb-5">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-1">
            Payment Method Required
          </h3>
          <p className="text-red-800 dark:text-red-300 mb-4">
            {isDwollaEnabled ? (
              <>
                You need to connect your business bank account before you can accept loans. 
                This allows you to receive loan repayments automatically.
              </>
            ) : (
              <>
                You need to configure at least one payment method (PayPal, Cash App, Venmo, or Zelle) 
                before you can accept loans. This tells borrowers where to send repayments.
              </>
            )}
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Link href="/business/settings?tab=payments">
              <Button variant="primary" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                {isDwollaEnabled ? 'Connect Bank Account' : 'Configure Payment Methods'}
              </Button>
            </Link>
            
            {/* <Link href="/business/settings?tab=payments">
              <Button variant="outline" size="sm" className="gap-2">
                <CreditCard className="w-4 h-4" />
                Go to Payment Settings
              </Button>
            </Link> */}
          </div>
        </div>
      </div>
    </Card>
  );
}
