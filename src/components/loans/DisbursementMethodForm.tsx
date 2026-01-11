'use client';

import React from 'react';
import { Card } from '@/components/ui';
import { CreditCard, Check, AlertCircle, DollarSign } from 'lucide-react';

type PaymentMethod = 'paypal' | 'cashapp' | 'venmo';

interface DisbursementFormData {
  disbursement_method: PaymentMethod;
}

interface DisbursementMethodFormProps {
  value: DisbursementFormData;
  onChange: (data: DisbursementFormData) => void;
  showRecipientOption?: boolean;
  preferredMethod?: PaymentMethod | null;
  paypalEmail?: string;
  cashappUsername?: string;
  venmoUsername?: string;
}

const paymentMethodInfo: Record<PaymentMethod, { name: string; color: string; icon: string; description: string }> = {
  paypal: {
    name: 'PayPal',
    color: '#0070ba',
    icon: '💳',
    description: 'Receive payment directly to your PayPal account',
  },
  cashapp: {
    name: 'Cash App',
    color: '#00d632',
    icon: '💵',
    description: 'Receive payment to your Cash App account',
  },
  venmo: {
    name: 'Venmo',
    color: '#3d95ce',
    icon: '💸',
    description: 'Receive payment to your Venmo account',
  },
};

export function DisbursementMethodForm({ 
  value, 
  onChange,
  preferredMethod,
  paypalEmail,
  cashappUsername,
  venmoUsername,
}: DisbursementMethodFormProps) {
  // Set initial method to preferred or first available
  React.useEffect(() => {
    const availableMethods: PaymentMethod[] = [];
    if (paypalEmail) availableMethods.push('paypal');
    if (cashappUsername) availableMethods.push('cashapp');
    if (venmoUsername) availableMethods.push('venmo');

    // Use preferred method if available, otherwise first configured method
    const methodToUse = preferredMethod && availableMethods.includes(preferredMethod)
      ? preferredMethod
      : availableMethods[0] || 'paypal';

    if (value.disbursement_method !== methodToUse) {
      onChange({ disbursement_method: methodToUse });
    }
  }, [preferredMethod, paypalEmail, cashappUsername, venmoUsername]);

  const getMethodUsername = (method: PaymentMethod): string | undefined => {
    switch (method) {
      case 'paypal': return paypalEmail;
      case 'cashapp': return cashappUsername;
      case 'venmo': return venmoUsername;
    }
  };

  const availableMethods: PaymentMethod[] = [];
  if (paypalEmail) availableMethods.push('paypal');
  if (cashappUsername) availableMethods.push('cashapp');
  if (venmoUsername) availableMethods.push('venmo');

  const noMethodsConfigured = availableMethods.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-3">
          Receive Payment Via
        </label>

        {noMethodsConfigured ? (
          <Card className="bg-yellow-50 border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">No payment methods configured</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Please go to <strong>Settings → Payments</strong> to set up your payment methods (PayPal, Cash App, or Venmo) before requesting a loan.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {availableMethods.map((method) => {
              const info = paymentMethodInfo[method];
              const username = getMethodUsername(method);
              const isSelected = value.disbursement_method === method;
              const isPreferred = method === preferredMethod;

              return (
                <Card
                  key={method}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? 'ring-2 ring-primary-500 border-primary-500 bg-primary-50/50'
                      : 'hover:border-neutral-300'
                  }`}
                  onClick={() => onChange({ disbursement_method: method })}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: info.color + '20' }}
                    >
                      {info.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-neutral-900">{info.name}</p>
                        {isPreferred && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                            ⭐ Preferred
                          </span>
                        )}
                        {isSelected && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-500">
                        {info.description}
                      </p>
                      {username && (
                        <p className="text-sm text-neutral-600 mt-1">
                          <span className="font-medium">Account:</span> {method === 'paypal' ? username : `$${username}`}
                        </p>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {availableMethods.length > 0 && availableMethods.length < 3 && (
          <p className="text-sm text-neutral-500 mt-3">
            💡 You can add more payment methods in <strong>Settings → Payments</strong>.
          </p>
        )}
      </div>
    </div>
  );
}
