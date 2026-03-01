'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('PaymentSetupBanner');

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { Building, CreditCard, Smartphone, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface PaymentMethod {
  id: string;
  payment_provider_id: string;
  account_identifier: string;
  is_default: boolean;
  payment_provider?: {
    name: string;
    slug: string;
    icon_name: string;
    brand_color: string;
  };
}

interface PaymentSetupBannerProps {
  userId: string;
  bankConnected: boolean;
  bankName?: string | null;
  showWhenConnected?: boolean;  // Show success message when methods are connected
  variant?: 'banner' | 'card' | 'inline';
}

/**
 * Smart banner that shows:
 * - Warning when NO payment methods are connected (neither bank nor manual)
 * - Success message when at least one payment method is connected (optional)
 * - Hidden when user has payment methods and showWhenConnected is false
 */
export default function PaymentSetupBanner({
  userId,
  bankConnected,
  bankName,
  showWhenConnected = false,
  variant = 'banner',
}: PaymentSetupBannerProps) {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [userMethods, setUserMethods] = useState<PaymentMethod[]>([]);
  const [enabledProviders, setEnabledProviders] = useState<string[]>([]);

  useEffect(() => {
    fetchPaymentStatus();
    
    // Set up real-time subscription for payment method changes
    const channel = supabase
      .channel(`payment_status_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_payment_methods',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchPaymentStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_providers',
        },
        () => {
          fetchPaymentStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, bankConnected]);

  const fetchPaymentStatus = async () => {
    try {
      // Fetch enabled payment providers
      const { data: providers } = await supabase
        .from('payment_providers')
        .select('slug')
        .eq('is_enabled', true);

      setEnabledProviders((providers || []).map(p => p.slug));

      // Fetch user's active payment methods (only for enabled providers)
      const { data: methods } = await supabase
        .from('user_payment_methods')
        .select('*, payment_provider:payment_provider_id(name, slug, icon_name, brand_color)')
        .eq('user_id', userId)
        .eq('is_active', true);

      // Filter to only include methods where the provider is still enabled
      const enabledSlugs = new Set((providers || []).map(p => p.slug));
      const validMethods = (methods || []).filter(m => 
        m.payment_provider && enabledSlugs.has(m.payment_provider.slug)
      );

      setUserMethods(validMethods);
    } catch (err) {
      log.error('Error fetching payment status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Determine if ACH/Bank is enabled (check if Dwolla is enabled)
  const isACHEnabled = enabledProviders.includes('dwolla');
  
  // User has payment methods if:
  // 1. Bank is connected AND ACH is enabled, OR
  // 2. User has manual payment methods connected
  const effectiveBankConnected = bankConnected && isACHEnabled;
  const hasAnyPaymentMethod = effectiveBankConnected || userMethods.length > 0;

  if (loading) {
    return variant === 'inline' ? null : (
      <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl animate-pulse">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          <span className="text-neutral-500">Checking payment setup...</span>
        </div>
      </div>
    );
  }

  // User has payment methods - show success or hide
  if (hasAnyPaymentMethod) {
    if (!showWhenConnected) return null;

    return variant === 'inline' ? (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <CheckCircle className="w-4 h-4" />
        <span>Payment methods connected</span>
      </div>
    ) : (
      <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <div className="flex-1">
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              ✓ Payment methods ready
            </span>
            <span className="text-sm text-green-600 dark:text-green-500 ml-2">
              {effectiveBankConnected && `${bankName || 'Bank'} (ACH)`}
              {effectiveBankConnected && userMethods.length > 0 && ', '}
              {userMethods.slice(0, 2).map(m => m.payment_provider?.name).join(', ')}
              {userMethods.length > 2 && ` +${userMethods.length - 2} more`}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // No payment methods - show warning
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
        <AlertCircle className="w-4 h-4" />
        <span>No payment methods connected</span>
        <Link href="/settings?tab=payments" className="underline hover:no-underline">
          Add now
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
            Set Up Your Payment Methods
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
            Connect a payment method so you can receive loan funds and make repayments. 
            You can use {isACHEnabled ? 'bank transfers (ACH), ' : ''}Cash App, Venmo, Zelle, or PayPal.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/settings?tab=payments">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                <Smartphone className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export convenience hook for checking payment setup status
export function usePaymentSetupStatus(userId: string | null, bankConnected: boolean = false) {
  const [status, setStatus] = useState<{
    loading: boolean;
    hasPayment: boolean;
    methodCount: number;
    hasBankConnected: boolean;
  }>({
    loading: true,
    hasPayment: false,
    methodCount: 0,
    hasBankConnected: bankConnected,
  });

  useEffect(() => {
    if (!userId) {
      setStatus(prev => ({ ...prev, loading: false, hasPayment: bankConnected }));
      return;
    }

    const supabase = createClient();
    
    const checkStatus = async () => {
      try {
        // Get enabled providers
        const { data: providers } = await supabase
          .from('payment_providers')
          .select('slug')
          .eq('is_enabled', true);

        const enabledSlugs = new Set((providers || []).map(p => p.slug));
        const isACHEnabled = enabledSlugs.has('dwolla');
        const effectiveBankConnected = bankConnected && isACHEnabled;

        // Count user's valid methods
        const { data: methods } = await supabase
          .from('user_payment_methods')
          .select('id, payment_provider:payment_provider_id(slug)')
          .eq('user_id', userId)
          .eq('is_active', true);

        const validMethods = (methods || []).filter(m => 
          m.payment_provider && enabledSlugs.has((m.payment_provider as any).slug)
        );

        setStatus({
          loading: false,
          hasPayment: effectiveBankConnected || validMethods.length > 0,
          methodCount: validMethods.length,
          hasBankConnected: effectiveBankConnected,
        });
      } catch (err) {
        log.error('Error checking payment status:', err);
        setStatus(prev => ({ ...prev, loading: false }));
      }
    };

    checkStatus();

    // Real-time updates
    const channel = supabase
      .channel(`payment_check_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_payment_methods', filter: `user_id=eq.${userId}` }, checkStatus)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_providers' }, checkStatus)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, bankConnected]);

  return status;
}
