'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Types
export interface PaymentProvider {
  id: string;
  slug: string;
  name: string;
  description: string;
  provider_type: 'automated' | 'manual' | 'mobile_money' | 'cash';
  is_enabled: boolean;
  is_available_for_disbursement: boolean;
  is_available_for_repayment: boolean;
  supported_countries: string[];
  supported_currencies: string[];
  account_identifier_label: string | null;
  account_identifier_placeholder: string | null;
  icon_name: string;
  brand_color: string;
  instructions: string;
  fee_type: string;
  fee_percentage: number;
  fee_fixed: number;
  min_amount: number | null;
  max_amount: number | null;
  estimated_transfer_days_min: number;
  estimated_transfer_days_max: number;
  display_order: number;
}

export interface UserPaymentMethod {
  id: string;
  user_id: string;
  payment_provider_id: string;
  account_identifier: string;
  account_name: string | null;
  is_verified: boolean;
  is_default: boolean;
  is_active: boolean;
  payment_provider?: PaymentProvider;
}

interface PaymentContextType {
  // Loading state
  loading: boolean;
  error: string | null;
  
  // All enabled providers (admin-controlled)
  allProviders: PaymentProvider[];
  
  // Providers available for user's country
  availableProviders: PaymentProvider[];
  
  // User's connected payment methods
  userMethods: UserPaymentMethod[];
  
  // Bank connection status (ACH/Dwolla)
  bankConnected: boolean;
  bankName: string | null;
  bankAccountMask: string | null;
  
  // Computed states
  hasAnyPaymentMethod: boolean;  // Bank OR manual methods
  hasAutomatedPayments: boolean; // Has automated providers enabled
  hasManualPayments: boolean;    // Has manual providers enabled
  
  // Specific provider checks
  isDwollaEnabled: boolean;
  isCashAppEnabled: boolean;
  isVenmoEnabled: boolean;
  isZelleEnabled: boolean;
  isPayPalEnabled: boolean;
  
  // Helper functions
  getProviderBySlug: (slug: string) => PaymentProvider | undefined;
  isProviderEnabled: (slug: string) => boolean;
  getEnabledProviderSlugs: () => string[];
  
  // Refresh data
  refreshProviders: () => Promise<void>;
  refreshUserMethods: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const PaymentContext = createContext<PaymentContextType | null>(null);

export function usePaymentContext() {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePaymentContext must be used within a PaymentProvider');
  }
  return context;
}

// Convenience hook for checking if user needs to set up payments
export function usePaymentSetupRequired() {
  const { hasAnyPaymentMethod, loading } = usePaymentContext();
  return { needsSetup: !loading && !hasAnyPaymentMethod, loading };
}

interface PaymentProviderComponentProps {
  children: ReactNode;
  userId: string | null;
  userCountry?: string;
  bankConnected?: boolean;
  bankName?: string | null;
  bankAccountMask?: string | null;
}

export function PaymentProvider({
  children,
  userId,
  userCountry = 'US',
  bankConnected = false,
  bankName = null,
  bankAccountMask = null,
}: PaymentProviderComponentProps) {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allProviders, setAllProviders] = useState<PaymentProvider[]>([]);
  const [userMethods, setUserMethods] = useState<UserPaymentMethod[]>([]);
  const [channels, setChannels] = useState<RealtimeChannel[]>([]);

  // Fetch all enabled providers from admin configuration
  const refreshProviders = useCallback(async () => {
    try {
      const { data, error: provError } = await supabase
        .from('payment_providers')
        .select('*')
        .eq('is_enabled', true)
        .order('display_order', { ascending: true });

      if (provError) throw provError;
      setAllProviders(data || []);
    } catch (err: any) {
      console.error('[PaymentContext] Error fetching providers:', err);
      setError(err.message);
    }
  }, []);

  // Fetch user's connected payment methods
  const refreshUserMethods = useCallback(async () => {
    if (!userId) {
      setUserMethods([]);
      return;
    }

    try {
      const { data, error: methodsError } = await supabase
        .from('user_payment_methods')
        .select('*, payment_provider:payment_provider_id(*)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (methodsError) throw methodsError;
      
      // Filter out methods where the provider is disabled
      const activeProviderIds = new Set(allProviders.map(p => p.id));
      const validMethods = (data || []).filter(m => 
        m.payment_provider && activeProviderIds.has(m.payment_provider_id)
      );
      
      setUserMethods(validMethods);
    } catch (err: any) {
      console.error('[PaymentContext] Error fetching user methods:', err);
      setError(err.message);
    }
  }, [userId, allProviders]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refreshProviders();
      await refreshUserMethods();
    } finally {
      setLoading(false);
    }
  }, [refreshProviders, refreshUserMethods]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [userId, userCountry]);

  // Refresh user methods when providers change
  useEffect(() => {
    if (allProviders.length > 0 && userId) {
      refreshUserMethods();
    }
  }, [allProviders, userId]);

  // Set up real-time subscriptions
  useEffect(() => {
    const newChannels: RealtimeChannel[] = [];

    // Subscribe to payment_providers changes (admin updates)
    const providersChannel = supabase
      .channel('payment_providers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_providers',
        },
        (payload) => {
          console.log('[PaymentContext] Provider change:', payload.eventType);
          refreshProviders();
        }
      )
      .subscribe((status) => {
        console.log('[PaymentContext] Providers channel:', status);
      });
    
    newChannels.push(providersChannel);

    // Subscribe to user_payment_methods changes (user's methods)
    if (userId) {
      const userMethodsChannel = supabase
        .channel(`user_payment_methods:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_payment_methods',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log('[PaymentContext] User method change:', payload.eventType);
            refreshUserMethods();
          }
        )
        .subscribe((status) => {
          console.log('[PaymentContext] User methods channel:', status);
        });
      
      newChannels.push(userMethodsChannel);
    }

    setChannels(newChannels);

    // Cleanup
    return () => {
      newChannels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      setChannels([]);
    };
  }, [userId, refreshProviders, refreshUserMethods]);

  // Computed: Providers available for user's country
  const availableProviders = allProviders.filter(p => {
    const countries = p.supported_countries || [];
    return countries.includes('*') || countries.includes(userCountry);
  });

  // Computed: Has any payment method (bank OR manual)
  const hasAnyPaymentMethod = bankConnected || userMethods.length > 0;

  // Computed: Has automated/manual providers enabled
  const hasAutomatedPayments = availableProviders.some(p => p.provider_type === 'automated');
  const hasManualPayments = availableProviders.some(p => p.provider_type !== 'automated');

  // Specific provider checks
  const isProviderEnabled = useCallback(
    (slug: string) => allProviders.some(p => p.slug === slug && p.is_enabled),
    [allProviders]
  );

  const isDwollaEnabled = isProviderEnabled('dwolla');
  const isCashAppEnabled = isProviderEnabled('cashapp');
  const isVenmoEnabled = isProviderEnabled('venmo');
  const isZelleEnabled = isProviderEnabled('zelle');
  const isPayPalEnabled = isProviderEnabled('paypal');

  // Helper functions
  const getProviderBySlug = useCallback(
    (slug: string) => allProviders.find(p => p.slug === slug),
    [allProviders]
  );

  const getEnabledProviderSlugs = useCallback(
    () => allProviders.map(p => p.slug),
    [allProviders]
  );

  const value: PaymentContextType = {
    loading,
    error,
    allProviders,
    availableProviders,
    userMethods,
    bankConnected,
    bankName,
    bankAccountMask,
    hasAnyPaymentMethod,
    hasAutomatedPayments,
    hasManualPayments,
    isDwollaEnabled,
    isCashAppEnabled,
    isVenmoEnabled,
    isZelleEnabled,
    isPayPalEnabled,
    getProviderBySlug,
    isProviderEnabled,
    getEnabledProviderSlugs,
    refreshProviders,
    refreshUserMethods,
    refreshAll,
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
}

// Export a hook for components that need to check payment status without full context
export function useHasPaymentSetup(
  userId: string | null,
  bankConnected: boolean = false
): { hasPayment: boolean; loading: boolean } {
  const [hasPayment, setHasPayment] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setHasPayment(bankConnected);
      setLoading(false);
      return;
    }

    const checkPaymentSetup = async () => {
      try {
        const supabase = createClient();
        
        // Check for any active user payment methods
        const { count, error } = await supabase
          .from('user_payment_methods')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_active', true);

        if (error) throw error;
        
        setHasPayment(bankConnected || (count || 0) > 0);
      } catch (err) {
        console.error('Error checking payment setup:', err);
        setHasPayment(bankConnected);
      } finally {
        setLoading(false);
      }
    };

    checkPaymentSetup();
  }, [userId, bankConnected]);

  return { hasPayment, loading };
}
