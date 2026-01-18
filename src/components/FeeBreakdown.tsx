'use client';

import React from 'react';
import { Info } from 'lucide-react';

interface FeeBreakdownProps {
  amount: number;
  platformFee: number;
  netAmount: number;
  feeLabel?: string;
  feeDescription?: string;
  showTooltip?: boolean;
  variant?: 'compact' | 'detailed';
  className?: string;
}

export function FeeBreakdown({
  amount,
  platformFee,
  netAmount,
  feeLabel = 'Feyza Service Fee',
  feeDescription = 'Platform processing fee',
  showTooltip = true,
  variant = 'compact',
  className = '',
}: FeeBreakdownProps) {
  if (platformFee === 0) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (variant === 'compact') {
    return (
      <div className={`text-sm text-neutral-600 ${className}`}>
        <div className="flex items-center gap-1">
          <span>{feeLabel}:</span>
          <span className="font-medium">{formatCurrency(platformFee)}</span>
          {showTooltip && (
            <div className="relative group">
              <Info className="w-3.5 h-3.5 text-neutral-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                {feeDescription}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 ${className}`}>
      <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
        Payment Breakdown
      </h4>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">Payment Amount</span>
          <span className="font-medium text-neutral-900 dark:text-white">
            {formatCurrency(amount)}
          </span>
        </div>
        
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-1">
            <span className="text-neutral-600 dark:text-neutral-400">{feeLabel}</span>
            {showTooltip && (
              <div className="relative group">
                <Info className="w-3.5 h-3.5 text-neutral-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                  {feeDescription}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900"></div>
                </div>
              </div>
            )}
          </div>
          <span className="font-medium text-orange-600 dark:text-orange-400">
            -{formatCurrency(platformFee)}
          </span>
        </div>
        
        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2 mt-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-700 dark:text-neutral-300 font-medium">
              Lender Receives
            </span>
            <span className="font-bold text-green-600 dark:text-green-400">
              {formatCurrency(netAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to fetch and calculate platform fee
export function usePlatformFee() {
  const [settings, setSettings] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/admin/platform-fee');
        const data = await res.json();
        setSettings(data.settings);
      } catch (error) {
        console.error('Failed to fetch platform fee settings:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const calculateFee = React.useCallback((amount: number) => {
    if (!settings || !settings.enabled) {
      return {
        grossAmount: amount,
        platformFee: 0,
        netAmount: amount,
        feeLabel: 'No Fee',
        feeDescription: 'No platform fee',
      };
    }

    let fee: number;
    
    if (settings.type === 'fixed') {
      fee = settings.fixed_amount;
    } else {
      fee = amount * (settings.percentage / 100);
      if (settings.min_fee && fee < settings.min_fee) {
        fee = settings.min_fee;
      }
      if (settings.max_fee && fee > settings.max_fee) {
        fee = settings.max_fee;
      }
    }

    fee = Math.round(fee * 100) / 100;

    return {
      grossAmount: amount,
      platformFee: fee,
      netAmount: Math.round((amount - fee) * 100) / 100,
      feeLabel: settings.fee_label || 'Feyza Service Fee',
      feeDescription: settings.fee_description || 'Platform processing fee',
    };
  }, [settings]);

  return {
    settings,
    loading,
    calculateFee,
  };
}

export default FeeBreakdown;
