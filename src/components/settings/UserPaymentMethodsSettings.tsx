'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import {
  CreditCard,
  Smartphone,
  Banknote,
  Building2,
  Zap,
  Check,
  X,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  Globe,
  CheckCircle,
} from 'lucide-react';

interface PaymentProvider {
  id: string;
  slug: string;
  name: string;
  description: string;
  provider_type: 'automated' | 'manual' | 'mobile_money' | 'cash';
  is_enabled: boolean;
  account_identifier_label: string | null;
  account_identifier_placeholder: string | null;
  account_identifier_validation: string | null;
  instructions: string;
  icon_name: string;
  brand_color: string;
  requires_bank_connection: boolean;
}

interface UserPaymentMethod {
  id: string;
  payment_provider_id: string;
  account_identifier: string;
  account_name: string;
  is_verified: boolean;
  is_default: boolean;
  is_active: boolean;
  payment_provider?: PaymentProvider;
}

interface UserPaymentMethodsSettingsProps {
  userId: string;
  userCountry: string;
  onUpdate?: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Building2,
  CreditCard,
  Smartphone,
  Banknote,
  Zap,
};

export default function UserPaymentMethodsSettings({
  userId,
  userCountry,
  onUpdate,
}: UserPaymentMethodsSettingsProps) {
  const supabase = createClient();
  
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [userMethods, setUserMethods] = useState<UserPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Edit mode state
  const [editingMethod, setEditingMethod] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Add new method state - ONLY one at a time
  const [showAddNew, setShowAddNew] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [newIdentifier, setNewIdentifier] = useState('');

  // Store user's current preferred payment method from users table
  const [userPreferredMethod, setUserPreferredMethod] = useState<string | null>(null);

  useEffect(() => {
    fetchData();

    // Subscribe to real-time changes in payment_providers
    // This ensures UI updates when admin enables/disables providers
    const channel = supabase
      .channel(`user_payment_settings_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_providers' },
        () => {
          console.log('[UserPaymentMethodsSettings] Provider changed, refreshing...');
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_payment_methods', filter: `user_id=eq.${userId}` },
        () => {
          console.log('[UserPaymentMethodsSettings] User method changed, refreshing...');
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userCountry]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First, attempt to migrate any legacy payment methods
      try {
        await fetch('/api/user-payment-methods/migrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (migrationErr) {
        // Migration errors are non-fatal, continue loading
        console.warn('Payment method migration skipped:', migrationErr);
      }

      // Fetch user's preferred payment method from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('preferred_payment_method')
        .eq('id', userId)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.warn('Error fetching user preferred method:', userError);
      } else {
        setUserPreferredMethod(userData?.preferred_payment_method || null);
      }

      // Fetch available providers for user's country (ONLY enabled ones)
      const { data: allProviders, error: provError } = await supabase
        .from('payment_providers')
        .select('*')
        .eq('is_enabled', true)
        .order('display_order', { ascending: true });

      if (provError) throw provError;

      // Filter by country
      const countryProviders = (allProviders || []).filter(p => {
        const countries = p.supported_countries || [];
        return countries.includes('*') || countries.includes(userCountry);
      });

      // Only show manual/mobile_money providers that need account identifiers
      // Exclude automated providers like Dwolla/Stripe
      const relevantProviders = countryProviders.filter(p => 
        p.provider_type !== 'automated' && p.account_identifier_label
      );

      setProviders(relevantProviders);

      // Get the set of enabled provider IDs for filtering user methods
      const enabledProviderIds = new Set(countryProviders.map(p => p.id));

      // Fetch user's connected methods - ONLY ONE ACTIVE METHOD ALLOWED
      const { data: methods, error: methodsError } = await supabase
        .from('user_payment_methods')
        .select('*, payment_provider:payment_provider_id(*)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1); // Only get the first active method

      if (methodsError) throw methodsError;

      // Filter user methods to only show those with ENABLED providers
      let filteredMethods = (methods || []).filter(m => 
        m.payment_provider && enabledProviderIds.has(m.payment_provider_id)
      );

      // Sync legacy preferred_payment_method with new system
      // If user has a legacy preferred method but no corresponding is_default in new system
      // We need to ensure consistency
      if (userPreferredMethod && filteredMethods.length > 0) {
        // Find if legacy preferred method exists in new system
        const legacyPreferredMethod = filteredMethods.find(m => 
          (m.payment_provider as PaymentProvider)?.slug === userPreferredMethod
        );
        
        // If legacy preferred exists but isn't marked as default, update it
        if (legacyPreferredMethod && !legacyPreferredMethod.is_default) {
          await supabase
            .from('user_payment_methods')
            .update({ is_default: true })
            .eq('id', legacyPreferredMethod.id);
        }
      }

      setUserMethods(filteredMethods);
    } catch (err: any) {
      console.error('Error fetching payment methods:', err);
      setError(err?.message || 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    return ICON_MAP[iconName] || CreditCard;
  };

  const saveMethod = async (providerId: string, identifier: string, existingMethodId?: string) => {
    if (!identifier.trim()) {
      setError('Please enter a valid identifier');
      return;
    }

    setSaving(providerId);
    setError(null);

    try {
      const trimmedIdentifier = identifier.trim();

      if (existingMethodId) {
        // Update existing method by ID
        const { error } = await supabase
          .from('user_payment_methods')
          .update({ 
            account_identifier: trimmedIdentifier,
            payment_provider_id: providerId,
            is_active: true,
            is_default: true, // Always default since only one allowed
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingMethodId);

        if (error) throw error;
      } else {
        // Check if user already has an active method
        const { data: existingActiveMethods } = await supabase
          .from('user_payment_methods')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (existingActiveMethods && existingActiveMethods.length > 0) {
          // Deactivate all existing methods
          await supabase
            .from('user_payment_methods')
            .update({ 
              is_active: false,
              is_default: false,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('is_active', true);
        }

        // Check if user already has this EXACT provider + identifier combination (any status)
        const { data: existingMethod, error: checkError } = await supabase
          .from('user_payment_methods')
          .select('id')
          .eq('user_id', userId)
          .eq('payment_provider_id', providerId)
          .eq('account_identifier', trimmedIdentifier)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingMethod) {
          // Reactivate and update existing method
          const { error } = await supabase
            .from('user_payment_methods')
            .update({
              is_active: true,
              is_default: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingMethod.id);

          if (error) throw error;
        } else {
          // Create new method - this will be the only active method
          const { error } = await supabase
            .from('user_payment_methods')
            .insert({
              user_id: userId,
              payment_provider_id: providerId,
              account_identifier: trimmedIdentifier,
              is_active: true,
              is_default: true, // Always default since only one allowed
            });

          if (error) {
            // Handle unique constraint violation specifically
            if (error.code === '23505') {
              throw new Error('This payment method already exists for your account');
            }
            throw error;
          }
        }
      }

      // Also update legacy fields in users table for backward compatibility
      const provider = providers.find(p => p.id === providerId);
      if (provider) {
        const legacyUpdate: Record<string, string | null> = {};
        if (provider.slug === 'cashapp') {
          legacyUpdate.cashapp_username = trimmedIdentifier;
        } else if (provider.slug === 'venmo') {
          legacyUpdate.venmo_username = trimmedIdentifier;
        } else if (provider.slug === 'paypal') {
          legacyUpdate.paypal_email = trimmedIdentifier;
        }

        // Always update preferred_payment_method when adding/updating method
        if (['paypal', 'cashapp', 'venmo'].includes(provider.slug)) {
          legacyUpdate.preferred_payment_method = provider.slug;
        }

        if (Object.keys(legacyUpdate).length > 0) {
          await supabase.from('users').update(legacyUpdate).eq('id', userId);
        }
      }

      await fetchData();
      setEditingMethod(null);
      setShowAddNew(false);
      setSelectedProvider(null);
      setNewIdentifier('');
      onUpdate?.();
    } catch (err: any) {
      console.error('Error saving payment method:', err);
      setError(err?.message || 'Failed to save payment method');
    } finally {
      setSaving(null);
    }
  };

  const removeMethod = async (methodId: string) => {
    if (!confirm('Remove this payment method? You will need to add a new one to receive payments.')) return;

    setSaving(methodId);
    try {
      const method = userMethods.find(m => m.id === methodId);
      
      const { error } = await supabase
        .from('user_payment_methods')
        .update({ 
          is_active: false,
          is_default: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', methodId);

      if (error) throw error;

      // Also clear legacy fields
      if (method?.payment_provider) {
        const provider = method.payment_provider as PaymentProvider;
        const legacyUpdate: Record<string, null> = {};
        if (provider.slug === 'cashapp') {
          legacyUpdate.cashapp_username = null;
        } else if (provider.slug === 'venmo') {
          legacyUpdate.venmo_username = null;
        } else if (provider.slug === 'paypal') {
          legacyUpdate.paypal_email = null;
        }

        // Clear preferred_payment_method when removing method
        legacyUpdate.preferred_payment_method = null;

        if (Object.keys(legacyUpdate).length > 0) {
          await supabase.from('users').update(legacyUpdate).eq('id', userId);
        }
      }

      await fetchData();
      onUpdate?.();
    } catch (err: any) {
      console.error('Error removing payment method:', err);
      setError(err?.message || 'Failed to remove payment method');
    } finally {
      setSaving(null);
    }
  };

  // Get providers that user hasn't connected yet
  const unconnectedProviders = providers.filter(
    p => !userMethods.some(m => m.payment_provider_id === p.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Payment Method
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Add your payment account to receive and send funds
          </p>
        </div>
        {userMethods.length === 0 && unconnectedProviders.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddNew(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Payment Method
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Connected Method */}
      {userMethods.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Your Payment Method
          </p>
          {userMethods.map(method => {
            const provider = method.payment_provider as PaymentProvider;
            if (!provider) return null;
            
            const Icon = getIcon(provider.icon_name);
            const isEditing = editingMethod === method.id;
            const isSaving = saving === method.payment_provider_id;

            return (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 rounded-xl border border-primary-500 bg-primary-50 dark:bg-primary-900/10"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${provider.brand_color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: provider.brand_color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {provider.name}
                      </span>
                      <Badge variant="primary" size="sm" className="bg-primary-500 text-white">
                        Active
                      </Badge>
                      {method.is_verified && (
                        <Badge variant="outline" size="sm" className="text-green-600 border-green-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    
                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder={provider.account_identifier_placeholder || ''}
                          className="text-sm h-8"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => saveMethod(provider.id, editValue, method.id)}
                          disabled={isSaving}
                        >
                          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingMethod(null)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {method.account_identifier}
                        </p>
                        <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                          This is your payment method for sending and receiving funds
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingMethod(method.id);
                        setEditValue(method.account_identifier);
                      }}
                      className="text-neutral-600 hover:text-neutral-900"
                    >
                      <Edit2 className="w-4 h-4" />
                      Change
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMethod(method.id)}
                      disabled={!!saving}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Method Section - Only shown when no method exists */}
      {(!userMethods.length || showAddNew) && unconnectedProviders.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Add Payment Method
          </p>
          
          {!selectedProvider ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {unconnectedProviders.map(provider => {
                const Icon = getIcon(provider.icon_name);
                return (
                  <button
                    key={provider.id}
                    onClick={() => {
                      setSelectedProvider(provider);
                      setNewIdentifier('');
                    }}
                    className="p-4 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-primary-500 dark:hover:border-primary-500 transition-all text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${provider.brand_color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: provider.brand_color }} />
                    </div>
                    <p className="font-medium text-neutral-900 dark:text-white text-sm">
                      {provider.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {provider.account_identifier_label}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${selectedProvider.brand_color}20` }}
                >
                  {React.createElement(getIcon(selectedProvider.icon_name), {
                    className: 'w-5 h-5',
                    style: { color: selectedProvider.brand_color },
                  })}
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    Add {selectedProvider.name}
                  </p>
                  <p className="text-sm text-neutral-500">
                    Enter your {selectedProvider.account_identifier_label}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Input
                  value={newIdentifier}
                  onChange={(e) => setNewIdentifier(e.target.value)}
                  placeholder={selectedProvider.account_identifier_placeholder || ''}
                  autoFocus
                />

                {selectedProvider.instructions && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {selectedProvider.instructions.split('\n')[0]}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedProvider(null);
                      setShowAddNew(false);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => saveMethod(selectedProvider.id, newIdentifier)}
                    disabled={!newIdentifier.trim() || saving === selectedProvider.id}
                    className="flex-1"
                  >
                    {saving === selectedProvider.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Add Payment Method
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Change Method Button - Only shown when user has a method */}
      {userMethods.length > 0 && !showAddNew && (
        <div className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => {
              setShowAddNew(true);
              setSelectedProvider(null);
            }}
            className="w-full"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Change Payment Method
          </Button>
          <p className="text-xs text-neutral-500 text-center mt-2">
            You can only have one payment method at a time
          </p>
        </div>
      )}

      {/* No providers available for country */}
      {providers.length === 0 && (
        <div className="text-center py-8">
          <Globe className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-500 dark:text-neutral-400">
            No payment methods available for your region ({userCountry})
          </p>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
            Please update your country in profile settings
          </p>
        </div>
      )}

      {/* Info */}
      {userMethods.length > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            💡 This payment method will be used for all transactions. Make sure it's correct and verified.
          </p>
        </div>
      )}

      {/* No methods info */}
      {userMethods.length === 0 && !showAddNew && unconnectedProviders.length > 0 && (
        <div className="text-center py-8 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl">
          <CreditCard className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-500 dark:text-neutral-400">
            No payment method added yet
          </p>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1 mb-4">
            Add a payment method to receive and send funds
          </p>
          <Button
            onClick={() => setShowAddNew(true)}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Payment Method
          </Button>
        </div>
      )}
    </div>
  );
}