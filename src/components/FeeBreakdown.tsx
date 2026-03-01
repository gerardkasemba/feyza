'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('FeeBreakdown');

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
      <div className={`text-sm text-neutral-600 dark:text-neutral-400 ${className}`}>
        <div className="flex items-center gap-1">
          <span>{feeLabel}:</span>
          <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(platformFee)}</span>
          {showTooltip && (
            <div className="relative group">
              <Info className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-900 dark:bg-neutral-800 text-white dark:text-neutral-100 text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg dark:shadow-neutral-900/50">
                {feeDescription}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-800"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700 ${className}`}>
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
                <Info className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-900 dark:bg-neutral-800 text-white dark:text-neutral-100 text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg dark:shadow-neutral-900/50">
                  {feeDescription}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-800"></div>
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

  const fetchSettings = React.useCallback(async () => {
    try {
      // Add timestamp to bust any browser caching
      const res = await fetch(`/api/admin/platform-fee?_t=${Date.now()}`);
      const data = await res.json();
      setSettings(data.settings);
    } catch (error) {
      log.error('Failed to fetch platform fee settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const calculateFee = React.useCallback((amount: number) => {
    if (!settings || !settings.enabled) {
      return {
        grossAmount: amount,
        platformFee: 0,
        netAmount: amount,
        feeLabel: 'No Fee',
        feeDescription: 'No platform fee',
        feeType: (settings?.type || 'percentage') as 'fixed' | 'percentage' | 'combined',
        feeEnabled: false,
      };
    }

    let fee: number;
    
    if (settings.type === 'fixed') {
      fee = settings.fixed_amount || 0;
    } else if (settings.type === 'combined') {
      // Combined: percentage + fixed
      fee = (amount * ((settings.percentage || 0) / 100)) + (settings.fixed_amount || 0);
      if (settings.min_fee && fee < settings.min_fee) {
        fee = settings.min_fee;
      }
      if (settings.max_fee && fee > settings.max_fee) {
        fee = settings.max_fee;
      }
    } else {
      // Percentage mode
      fee = amount * ((settings.percentage || 0) / 100);
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
      feeType: settings.type as 'fixed' | 'percentage' | 'combined',
      feeEnabled: true,
    };
  }, [settings]);

  return {
    settings,
    loading,
    calculateFee,
    refetch: fetchSettings, // Allow manual refetch
  };
}

export default FeeBreakdown;