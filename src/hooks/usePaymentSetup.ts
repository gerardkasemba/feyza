'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PaymentProvider {
  id: string;
  slug: string;
  name: string;
  provider_type: 'automated' | 'manual' | 'mobile_money' | 'cash';
  is_enabled: boolean;
  supported_countries: string[];
  account_identifier_label: string | null;
  icon_name: string;
  brand_color: string;
}

interface UserPaymentMethod {
  id: string;
  payment_provider_id: string;
  account_identifier: string;
  is_default: boolean;
  payment_provider?: PaymentProvider;
}

interface PaymentSetupStatus {
  // Loading state
  loading: boolean;
  error: string | null;
  
  // Enabled providers for user's country
  enabledProviders: PaymentProvider[];
  manualProviders: PaymentProvider[];
  
  // User's connected methods (filtered by enabled providers)
  userMethods: UserPaymentMethod[];
  
  // Specific provider availability
  isDwollaEnabled: boolean;
  isCashAppEnabled: boolean;
  isVenmoEnabled: boolean;
  isZelleEnabled: boolean;
  isPayPalEnabled: boolean;
  
  // Bank connection (only counts if Dwolla is enabled)
  effectiveBankConnected: boolean;
  
  // Overall payment status
  hasAnyPaymentMethod: boolean;
  needsPaymentSetup: boolean;
  
  // Actions
  refresh: () => Promise<void>;
}

/**
 * Comprehensive hook for checking payment setup status
 * - Respects admin-configured enabled providers
 * - Real-time updates when admin changes settings
 * - Filters user methods to only show enabled providers
 */
export function usePaymentSetup(
  userId: string | null,
  userCountry: string = 'US',
  bankConnected: boolean = false
): PaymentSetupStatus {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enabledProviders, setEnabledProviders] = useState<PaymentProvider[]>([]);
  const [userMethods, setUserMethods] = useState<UserPaymentMethod[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch enabled providers
      const { data: providers, error: provError } = await supabase
        .from('payment_providers')
        .select('*')
        .eq('is_enabled', true)
        .order('display_order', { ascending: true });

      if (provError) throw provError;

      // Filter by country
      const countryProviders = (providers || []).filter(p => {
        const countries = p.supported_countries || [];
        return countries.includes('*') || countries.includes(userCountry);
      });
      
      setEnabledProviders(countryProviders);

      // If no userId, we're done
      if (!userId) {
        setUserMethods([]);
        return;
      }

      // Fetch user's payment methods
      const { data: methods, error: methodsError } = await supabase
        .from('user_payment_methods')
        .select('*, payment_provider:payment_provider_id(*)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (methodsError) throw methodsError;

      // Filter to only show methods where provider is still enabled
      const enabledProviderIds = new Set(countryProviders.map(p => p.id));
      const validMethods = (methods || []).filter(m => 
        m.payment_provider && enabledProviderIds.has(m.payment_provider_id)
      );
      
      setUserMethods(validMethods);
    } catch (err: any) {
      console.error('[usePaymentSetup] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, userCountry, supabase]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Real-time subscriptions
  useEffect(() => {
    // Subscribe to payment provider changes
    const newChannel = supabase
      .channel(`payment_setup_${userId || 'anon'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_providers',
        },
        () => {
          console.log('[usePaymentSetup] Provider changed, refreshing...');
          fetchData();
        }
      );

    // Subscribe to user payment method changes if logged in
    if (userId) {
      newChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_payment_methods',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log('[usePaymentSetup] User method changed, refreshing...');
          fetchData();
        }
      );
    }

    newChannel.subscribe();
    setChannel(newChannel);

    return () => {
      if (newChannel) {
        supabase.removeChannel(newChannel);
      }
    };
  }, [userId, fetchData, supabase]);

  // Computed values
  const isProviderEnabled = (slug: string) => 
    enabledProviders.some(p => p.slug === slug);

  const isDwollaEnabled = isProviderEnabled('dwolla');
  const isCashAppEnabled = isProviderEnabled('cashapp');
  const isVenmoEnabled = isProviderEnabled('venmo');
  const isZelleEnabled = isProviderEnabled('zelle');
  const isPayPalEnabled = isProviderEnabled('paypal');

  // Manual providers (that need account identifiers)
  const manualProviders = enabledProviders.filter(p => 
    p.provider_type !== 'automated' && p.account_identifier_label
  );

  // Bank is only "effective" if Dwolla is enabled
  const effectiveBankConnected = bankConnected && isDwollaEnabled;

  // Has any payment method if bank is connected (with Dwolla enabled) OR has manual methods
  const hasAnyPaymentMethod = effectiveBankConnected || userMethods.length > 0;
  const needsPaymentSetup = !loading && !hasAnyPaymentMethod;

  return {
    loading,
    error,
    enabledProviders,
    manualProviders,
    userMethods,
    isDwollaEnabled,
    isCashAppEnabled,
    isVenmoEnabled,
    isZelleEnabled,
    isPayPalEnabled,
    effectiveBankConnected,
    hasAnyPaymentMethod,
    needsPaymentSetup,
    refresh: fetchData,
  };
}

/**
 * Simple hook to check if user needs payment setup
 * Returns true if user has NO payment methods connected
 */
export function useNeedsPaymentSetup(
  userId: string | null,
  bankConnected: boolean = false
): { needsSetup: boolean; loading: boolean } {
  const { needsPaymentSetup, loading } = usePaymentSetup(userId, 'US', bankConnected);
  return { needsSetup: needsPaymentSetup, loading };
}

/**
 * Hook to get enabled provider slugs
 * Useful for conditional rendering
 */
export function useEnabledProviderSlugs(userCountry: string = 'US'): string[] {
  const { enabledProviders, loading } = usePaymentSetup(null, userCountry);
  if (loading) return [];
  return enabledProviders.map(p => p.slug);
}
