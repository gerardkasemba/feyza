'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, Button, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import {
  Building,
  Building2,
  Smartphone,
  CreditCard,
  Banknote,
  Zap,
  CheckCircle,
  AlertCircle,
  Plus,
  Loader2,
  Settings,
} from 'lucide-react';

interface PaymentProvider {
  id: string;
  slug: string;
  name: string;
  provider_type: string;
  is_enabled: boolean;
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

interface SmartPaymentSectionProps {
  userId: string;
  userCountry: string;
  bankConnected: boolean;
  bankName?: string;
  bankAccountMask?: string;
  onConnectBank?: () => void;
  connectingBank?: boolean;
  plaidReady?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Building2,
  CreditCard,
  Smartphone,
  Banknote,
  Zap,
  Building,
};

/**
 * Smart Payment Section for Loan Request Form
 * - Only shows bank connection if Dwolla is enabled
 * - Only shows manual methods that are enabled by admin
 * - Real-time updates when admin changes settings
 */
export default function SmartPaymentSection({
  userId,
  userCountry,
  bankConnected,
  bankName,
  bankAccountMask,
  onConnectBank,
  connectingBank = false,
  plaidReady = false,
}: SmartPaymentSectionProps) {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [enabledProviders, setEnabledProviders] = useState<PaymentProvider[]>([]);
  const [userMethods, setUserMethods] = useState<UserPaymentMethod[]>([]);
  
  // Computed states
  const isDwollaEnabled = enabledProviders.some(p => p.slug === 'dwolla');
  const manualProviders = enabledProviders.filter(p => 
    p.provider_type !== 'automated' && p.account_identifier_label
  );
  const hasAnyPaymentMethod = (bankConnected && isDwollaEnabled) || userMethods.length > 0;

  useEffect(() => {
    fetchData();
    
    // Real-time subscription
    const channel = supabase
      .channel(`smart_payment_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_providers' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_payment_methods', filter: `user_id=eq.${userId}` }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userCountry]);

  const fetchData = async () => {
    try {
      // Fetch enabled providers for user's country
      const { data: providers } = await supabase
        .from('payment_providers')
        .select('*')
        .eq('is_enabled', true)
        .order('display_order', { ascending: true });

      // Filter by country
      const countryProviders = (providers || []).filter(p => {
        const countries = p.supported_countries || [];
        return countries.includes('*') || countries.includes(userCountry);
      });
      setEnabledProviders(countryProviders);

      // Fetch user's payment methods (only for enabled providers)
      const enabledIds = new Set(countryProviders.map(p => p.id));
      const { data: methods } = await supabase
        .from('user_payment_methods')
        .select('*, payment_provider:payment_provider_id(*)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      // Filter to only show methods with enabled providers
      const validMethods = (methods || []).filter(m => 
        m.payment_provider && enabledIds.has(m.payment_provider_id)
      );
      setUserMethods(validMethods);
    } catch (err) {
      console.error('Error fetching payment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => ICON_MAP[iconName] || CreditCard;

  if (loading) {
    return (
      <Card className="mb-6">
        <div className="flex items-center gap-3 py-4">
          <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          <span className="text-neutral-500">Loading payment options...</span>
        </div>
      </Card>
    );
  }

  // No payment providers enabled at all
  if (enabledProviders.length === 0) {
    return (
      <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">Payment Methods Unavailable</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              No payment methods are currently available for your region. Please contact support.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      {/* Bank Connection Section - Only show if Dwolla is enabled */}
      {isDwollaEnabled && (
        <Card>
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Bank Account (ACH)
            <Badge variant="primary" size="sm">Recommended</Badge>
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Connect your bank to receive loan funds directly via ACH transfer (1-3 business days).
          </p>

          {bankConnected ? (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <Building className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900 dark:text-white">{bankName || 'Bank Account'}</span>
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Account ••••{bankAccountMask}
                    </p>
                  </div>
                </div>
                <Badge variant="success">Connected</Badge>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-start gap-3 mb-4">
                <Building className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-300">Bank not connected yet</p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Connect your bank for the fastest, most secure way to receive funds.
                  </p>
                </div>
              </div>
              {onConnectBank && (
                <Button
                  onClick={onConnectBank}
                  disabled={connectingBank || !plaidReady}
                  className="w-full"
                >
                  {connectingBank ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Building className="w-4 h-4 mr-2" />
                      Connect Bank Account
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Manual Payment Methods Section */}
      {manualProviders.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-green-600 dark:text-green-400" />
              Payment Methods
            </h3>
            <Link 
              href="/settings?tab=payments"
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
            >
              <Settings className="w-4 h-4" />
              Manage
            </Link>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Add your payment accounts so lenders know where to send your funds.
          </p>

          {userMethods.length > 0 ? (
            <div className="space-y-2">
              {userMethods.map(method => {
                const provider = method.payment_provider as PaymentProvider;
                if (!provider) return null;
                const Icon = getIcon(provider.icon_name);
                
                return (
                  <div
                    key={method.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${provider.brand_color}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: provider.brand_color }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {provider.name}
                          </p>
                          {method.is_default && <Badge variant="primary" size="sm">Default</Badge>}
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {method.account_identifier}
                        </p>
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                );
              })}
              
              {/* Show available providers to add */}
              {manualProviders.filter(p => !userMethods.some(m => m.payment_provider_id === p.id)).length > 0 && (
                <Link href="/settings?tab=payments">
                  <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors cursor-pointer">
                    <Plus className="w-5 h-5 text-neutral-400" />
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      Add more payment methods
                    </span>
                  </div>
                </Link>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800 dark:text-amber-300">
                    No Payment Methods Added
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    Add at least one payment method so lenders can send you funds.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {manualProviders.slice(0, 4).map(provider => {
                      const Icon = getIcon(provider.icon_name);
                      return (
                        <span 
                          key={provider.id}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                        >
                          <Icon className="w-3 h-3" style={{ color: provider.brand_color }} />
                          {provider.name}
                        </span>
                      );
                    })}
                  </div>
                  <Link href="/settings?tab=payments" className="mt-3 inline-block">
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Payment Method
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Overall Status Banner */}
      {!hasAnyPaymentMethod && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">
                Payment Method Required
              </p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                You need at least one payment method to receive loan funds. 
                {isDwollaEnabled && ' Connect your bank or '}
                Add a payment method in settings to continue.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
