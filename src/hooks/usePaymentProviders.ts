'use client';

import { useState, useEffect, useCallback } from 'react';

interface PaymentProvider {
  id: string;
  slug: string;
  name: string;
  type: 'automated' | 'manual' | 'mobile_money' | 'cash';
  isAutomated: boolean;
  requiresProof: boolean;
  accountIdentifierLabel: string | null;
  brandColor: string;
  instructions: string;
}

interface UsePaymentProvidersOptions {
  country?: string;
  transactionType?: 'disbursement' | 'repayment';
  providerType?: 'automated' | 'manual' | 'mobile_money' | 'cash';
}

interface UsePaymentProvidersReturn {
  providers: PaymentProvider[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  
  // Convenience flags
  hasAutomatedProviders: boolean;
  hasManualProviders: boolean;
  isDwollaEnabled: boolean;
  isStripeEnabled: boolean;
  
  // Helper functions
  getProviderBySlug: (slug: string) => PaymentProvider | undefined;
  isProviderEnabled: (slug: string) => boolean;
}

export function usePaymentProviders(options: UsePaymentProvidersOptions = {}): UsePaymentProvidersReturn {
  const { country = 'US', transactionType, providerType } = options;
  
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({ country });
      if (transactionType) params.append('type', transactionType);
      if (providerType) params.append('provider_type', providerType);
      
      const res = await fetch(`/api/payment-methods?${params}`);
      if (!res.ok) throw new Error('Failed to fetch payment providers');
      
      const data = await res.json();
      setProviders(data.providers || []);
    } catch (err: any) {
      setError(err.message);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [country, transactionType, providerType]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Convenience flags
  const hasAutomatedProviders = providers.some(p => p.isAutomated);
  const hasManualProviders = providers.some(p => !p.isAutomated);
  const isDwollaEnabled = providers.some(p => p.slug === 'dwolla');
  const isStripeEnabled = providers.some(p => p.slug === 'stripe');

  // Helper functions
  const getProviderBySlug = useCallback(
    (slug: string) => providers.find(p => p.slug === slug),
    [providers]
  );

  const isProviderEnabled = useCallback(
    (slug: string) => providers.some(p => p.slug === slug),
    [providers]
  );

  return {
    providers,
    loading,
    error,
    refetch: fetchProviders,
    hasAutomatedProviders,
    hasManualProviders,
    isDwollaEnabled,
    isStripeEnabled,
    getProviderBySlug,
    isProviderEnabled,
  };
}

// Standalone function to check if bank connection is required
// (i.e., Dwolla is enabled and is the primary payment method)
export async function isBankConnectionRequired(country: string = 'US'): Promise<boolean> {
  try {
    const res = await fetch(`/api/payment-methods?country=${country}&type=disbursement`);
    if (!res.ok) return false;
    
    const data = await res.json();
    const providers = data.providers || [];
    
    // Bank connection is required if:
    // 1. Dwolla is enabled AND
    // 2. It's the only automated provider (or we want to prioritize it)
    const dwolla = providers.find((p: any) => p.slug === 'dwolla');
    return !!dwolla;
  } catch {
    return false;
  }
}

// Check if any automated payment is available
export async function hasAutomatedPayments(country: string = 'US'): Promise<boolean> {
  try {
    const res = await fetch(`/api/payment-methods?country=${country}&provider_type=automated`);
    if (!res.ok) return false;
    
    const data = await res.json();
    return (data.providers || []).length > 0;
  } catch {
    return false;
  }
}
