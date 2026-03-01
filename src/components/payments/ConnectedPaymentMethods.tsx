'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('ConnectedPaymentMethods');

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import {
  CreditCard,
  Smartphone,
  Banknote,
  Building2,
  Zap,
  CheckCircle,
  AlertCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface PaymentProvider {
  id: string;
  slug: string;
  name: string;
  provider_type: string;
  account_identifier_label: string | null;
  account_identifier_placeholder: string | null;
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

interface ConnectedPaymentMethodsProps {
  userId?: string;
  userCountry: string;
  // For guest users
  guestPaymentMethods?: {
    cashapp?: string;
    venmo?: string;
    zelle?: string;
    mpesa?: string;
  };
  onGuestMethodsChange?: (methods: Record<string, string>) => void;
  // Display mode
  mode?: 'display' | 'edit' | 'select';
  selectedMethodId?: string;
  onSelectMethod?: (method: UserPaymentMethod | null) => void;
  // Compact mode for inline display
  compact?: boolean;
  // Label
  label?: string;
  description?: string;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Building2,
  CreditCard,
  Smartphone,
  Banknote,
  Zap,
};

export default function ConnectedPaymentMethods({
  userId,
  userCountry,
  guestPaymentMethods,
  onGuestMethodsChange,
  mode = 'display',
  selectedMethodId,
  onSelectMethod,
  compact = false,
  label = 'Your Payment Methods',
  description = 'Where you can receive funds',
}: ConnectedPaymentMethodsProps) {
  const supabase = createClient();
  
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [userMethods, setUserMethods] = useState<UserPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);
  
  // Guest mode state
  const [guestMethods, setGuestMethods] = useState<Record<string, string>>(guestPaymentMethods || {});
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [selectedGuestProvider, setSelectedGuestProvider] = useState<PaymentProvider | null>(null);
  const [guestInput, setGuestInput] = useState('');

  useEffect(() => {
    fetchData();
  }, [userId, userCountry]);

  useEffect(() => {
    if (guestPaymentMethods) {
      setGuestMethods(guestPaymentMethods);
    }
  }, [guestPaymentMethods]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch available providers for country
      const { data: allProviders } = await supabase
        .from('payment_providers')
        .select('*')
        .eq('is_enabled', true)
        .order('display_order', { ascending: true });

      const countryProviders = (allProviders || []).filter(p => {
        const countries = p.supported_countries || [];
        return (countries.includes('*') || countries.includes(userCountry)) &&
               p.provider_type !== 'automated' &&
               p.account_identifier_label;
      });

      setProviders(countryProviders);

      // If logged in user, fetch their methods
      if (userId) {
        const { data: methods } = await supabase
          .from('user_payment_methods')
          .select('*, payment_provider:payment_provider_id(*)')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('is_default', { ascending: false });

        setUserMethods(methods || []);
      }
    } catch (err) {
      log.error('Error fetching payment methods:', err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => ICON_MAP[iconName] || CreditCard;

  const handleGuestMethodAdd = () => {
    if (!selectedGuestProvider || !guestInput.trim()) return;

    const newMethods = {
      ...guestMethods,
      [selectedGuestProvider.slug]: guestInput.trim(),
    };
    setGuestMethods(newMethods);
    onGuestMethodsChange?.(newMethods);
    setSelectedGuestProvider(null);
    setGuestInput('');
    setShowAddGuest(false);
  };

  const removeGuestMethod = (slug: string) => {
    const newMethods = { ...guestMethods };
    delete newMethods[slug];
    setGuestMethods(newMethods);
    onGuestMethodsChange?.(newMethods);
  };

  // Get connected methods (either from user or guest)
  const connectedMethods = userId 
    ? userMethods 
    : Object.entries(guestMethods).map(([slug, identifier]) => {
        const provider = providers.find(p => p.slug === slug);
        return provider ? {
          id: slug,
          payment_provider_id: provider.id,
          account_identifier: identifier,
          is_default: false,
          payment_provider: provider,
        } : null;
      }).filter(Boolean) as UserPaymentMethod[];

  const hasConnected = connectedMethods.length > 0;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
        <span className="text-sm text-neutral-500">Loading payment methods...</span>
      </div>
    );
  }

  // Compact display mode
  if (compact && mode === 'display') {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-neutral-500" />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {label}
            </span>
            {hasConnected && (
              <Badge variant="success" size="sm">{connectedMethods.length} connected</Badge>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="pl-6 space-y-2">
            {connectedMethods.map(method => {
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
                </div>
              );
            })}
            
            {!hasConnected && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                ⚠️ No payment methods connected
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full display/edit mode
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-neutral-500" />
          <h4 className="font-medium text-neutral-900 dark:text-white">{label}</h4>
        </div>
        {description && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{description}</p>
        )}
      </div>

      {/* Connected Methods */}
      {hasConnected ? (
        <div className="space-y-2">
          {connectedMethods.map(method => {
            const provider = method.payment_provider as PaymentProvider;
            if (!provider) return null;
            const Icon = getIcon(provider.icon_name);
            const isSelected = selectedMethodId === method.id;
            
            return (
              <div
                key={method.id}
                onClick={() => mode === 'select' && onSelectMethod?.(isSelected ? null : method)}
                className={`
                  flex items-center justify-between p-3 rounded-xl border transition-all
                  ${mode === 'select' ? 'cursor-pointer' : ''}
                  ${isSelected 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900'
                  }
                  ${mode === 'select' && !isSelected ? 'hover:border-neutral-300 dark:hover:border-neutral-600' : ''}
                `}
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
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {provider.name}
                      </span>
                      {method.is_default && (
                        <Badge variant="primary" size="sm">Default</Badge>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {method.account_identifier}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {mode === 'select' && isSelected && (
                    <CheckCircle className="w-5 h-5 text-primary-500" />
                  )}
                  {mode === 'edit' && !userId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeGuestMethod(provider.slug);
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">
                No payment methods connected
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                {userId 
                  ? 'Add a payment method in Settings so lenders know where to send funds.'
                  : 'Add at least one payment method so lenders know where to send your funds.'
                }
              </p>
              {userId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => window.location.href = '/settings'}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Go to Settings
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add for guests */}
      {!userId && mode === 'edit' && (
        <>
          {!showAddGuest ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddGuest(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Payment Method
            </Button>
          ) : (
            <Card className="p-4">
              {!selectedGuestProvider ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Select a payment method:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {providers
                      .filter(p => !guestMethods[p.slug])
                      .map(provider => {
                        const Icon = getIcon(provider.icon_name);
                        return (
                          <button
                            key={provider.id}
                            onClick={() => setSelectedGuestProvider(provider)}
                            className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-500 transition-all text-left"
                          >
                            <Icon className="w-5 h-5 mb-1" style={{ color: provider.brand_color }} />
                            <p className="text-sm font-medium">{provider.name}</p>
                          </button>
                        );
                      })}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddGuest(false)}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {React.createElement(getIcon(selectedGuestProvider.icon_name), {
                      className: 'w-5 h-5',
                      style: { color: selectedGuestProvider.brand_color },
                    })}
                    <span className="font-medium">{selectedGuestProvider.name}</span>
                  </div>
                  <Input
                    value={guestInput}
                    onChange={(e) => setGuestInput(e.target.value)}
                    placeholder={selectedGuestProvider.account_identifier_placeholder || ''}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedGuestProvider(null);
                        setGuestInput('');
                      }}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleGuestMethodAdd}
                      disabled={!guestInput.trim()}
                      className="flex-1"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
