'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { clientLogger } from '@/lib/client-logger';

const log = clientLogger('ConnectedPaymentDisplay');
import Link from 'next/link';
import {
  CreditCard,
  Smartphone,
  Banknote,
  Building2,
  Building,
  Zap,
  CheckCircle,
  AlertCircle,
  Plus,
  Loader2,
  Settings,
  ExternalLink,
} from 'lucide-react';

interface PaymentProvider {
  id: string;
  slug: string;
  name: string;
  provider_type: string;
  account_identifier_label: string | null;
  icon_name: string;
  brand_color: string;
}

interface UserPaymentMethod {
  id: string;
  payment_provider_id: string;
  account_identifier: string;
  is_default: boolean;
  is_verified: boolean;
  payment_provider?: PaymentProvider;
}

interface ConnectedPaymentDisplayProps {
  userId?: string;
  userCountry: string;
  bankConnected?: boolean;
  bankName?: string;
  bankAccountMask?: string;
  showTitle?: boolean;
  showAddPrompt?: boolean;
  compact?: boolean;
  onNeedsSetup?: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Building2,
  CreditCard,
  Smartphone,
  Banknote,
  Zap,
};

export default function ConnectedPaymentDisplay({
  userId,
  userCountry,
  bankConnected,
  bankName,
  bankAccountMask,
  showTitle = true,
  showAddPrompt = true,
  compact = false,
  onNeedsSetup,
}: ConnectedPaymentDisplayProps) {
  const supabase = createClient();
  
  const [userMethods, setUserMethods] = useState<UserPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDwollaEnabled, setIsDwollaEnabled] = useState(false);

  useEffect(() => {
    fetchMethods();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel(`connected_display_${userId || 'anon'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_providers' },
        () => {
          log.debug('Provider changed, refreshing');
          fetchMethods();
        }
      );
    
    if (userId) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_payment_methods', filter: `user_id=eq.${userId}` },
        () => {
          log.debug('User method changed, refreshing');
          fetchMethods();
        }
      );
    }
    
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userCountry]);

  const fetchMethods = async () => {
    setLoading(true);
    try {
      // First fetch enabled providers to filter properly
      const { data: providers } = await supabase
        .from('payment_providers')
        .select('id, slug')
        .eq('is_enabled', true);

      const enabledProviderIds = new Set((providers || []).map(p => p.id));
      const dwollaEnabled = (providers || []).some(p => p.slug === 'dwolla');
      setIsDwollaEnabled(dwollaEnabled);

      if (!userId) {
        setUserMethods([]);
        setLoading(false);
        return;
      }

      // Then fetch user methods
      const { data: methods } = await supabase
        .from('user_payment_methods')
        .select('*, payment_provider:payment_provider_id(*)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      // Filter to only include methods where provider is ENABLED
      const filteredMethods = (methods || []).filter(m => 
        m.payment_provider && enabledProviderIds.has(m.payment_provider_id)
      );

      setUserMethods(filteredMethods);
    } catch (err) {
      log.error('Error fetching payment methods', err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => ICON_MAP[iconName] || CreditCard;

  // Bank is only "connected" if Dwolla is enabled by admin
  const effectiveBankConnected = bankConnected && isDwollaEnabled;
  const hasPaymentMethod = effectiveBankConnected || userMethods.length > 0;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
        <span className="text-sm text-neutral-500">Loading payment methods...</span>
      </div>
    );
  }

  // Compact mode for inline display
  if (compact) {
    return (
      <div className="space-y-2">
        {showTitle && (
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Your receiving accounts:
          </p>
        )}
        
        {/* Bank Account - Only show if Dwolla is enabled */}
        {effectiveBankConnected && (
          <div className="flex items-center gap-2 text-sm">
            <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-neutral-600 dark:text-neutral-400">Bank:</span>
            <span className="font-medium text-neutral-900 dark:text-white">
              {bankName || 'Bank Account'} {bankAccountMask && `(••••${bankAccountMask})`}
            </span>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
        )}

        {/* Manual Payment Methods */}
        {userMethods.map(method => {
          const provider = method.payment_provider as PaymentProvider;
          if (!provider) return null;
          const Icon = getIcon(provider.icon_name);
          
          return (
            <div key={method.id} className="flex items-center gap-2 text-sm">
              <Icon className="w-4 h-4" style={{ color: provider.brand_color }} />
              <span className="text-neutral-600 dark:text-neutral-400">{provider.name}:</span>
              <span className="font-medium text-neutral-900 dark:text-white">
                {method.account_identifier}
              </span>
              {method.is_default && <Badge variant="primary" size="sm">Default</Badge>}
            </div>
          );
        })}

        {!hasPaymentMethod && (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-4 h-4" />
            <span>No payment methods connected</span>
            <Link href="/settings?tab=payments" className="underline hover:no-underline">
              Add in Settings
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Full display mode
  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-neutral-500" />
            <h4 className="font-medium text-neutral-900 dark:text-white">
              Your Payment Methods
            </h4>
          </div>
          <Link 
            href="/settings?tab=payments"
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            <Settings className="w-4 h-4" />
            Manage
          </Link>
        </div>
      )}

      {hasPaymentMethod ? (
        <div className="space-y-2">
          {/* Bank Account - Only show if Dwolla is enabled */}
          {effectiveBankConnected && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-800 flex items-center justify-center">
                  <Building className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">
                    {bankName || 'Bank Account'} 
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {bankAccountMask && `••••${bankAccountMask}`} • ACH Transfer
                  </p>
                </div>
              </div>
              <Badge variant="success" size="sm">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            </div>
          )}

          {/* Manual Payment Methods */}
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
        </div>
      ) : (
        <div className="p-4 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-800 dark:text-amber-300">
                No Payment Methods Connected
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Add a payment method so lenders know where to send your funds. 
                This can be Cash App, Venmo, Zelle, PayPal, or a bank account.
              </p>
              <div className="mt-3 flex gap-2">
                <Link href="/settings?tab=payments">
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Payment Method
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddPrompt && hasPaymentMethod && userMethods.length < 3 && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          💡 Tip: Adding multiple payment options gives lenders flexibility on how to send you funds.
        </p>
      )}
    </div>
  );
}
