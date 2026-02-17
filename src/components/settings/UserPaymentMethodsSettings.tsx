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
  ExternalLink,
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
  supported_countries?: string[];
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
  
  // Add new method state
  const [showAddNew, setShowAddNew] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [newIdentifier, setNewIdentifier] = useState('');

  useEffect(() => {
    fetchData();

    // Subscribe to real-time changes in payment_providers
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
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        (payload) => {
          // Check if payment-related fields were updated
          const updatedFields = payload.new as any;
          if (
            updatedFields.cashapp_username !== undefined ||
            updatedFields.venmo_username !== undefined ||
            updatedFields.zelle_email !== undefined ||
            updatedFields.zelle_phone !== undefined ||
            updatedFields.paypal_email !== undefined
          ) {
            console.log('[UserPaymentMethodsSettings] User payment fields updated, refreshing...');
            fetchData();
          }
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

      // Fetch user's connected methods
      const { data: methods, error: methodsError } = await supabase
        .from('user_payment_methods')
        .select('*, payment_provider:payment_provider_id(*)')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (methodsError) throw methodsError;

      // Filter user methods to only show those with ENABLED providers
      const filteredMethods = (methods || []).filter(m => 
        m.payment_provider && enabledProviderIds.has(m.payment_provider_id)
      );

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
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingMethodId);

        if (error) throw error;
      } else {
        // Check if user already has a method for this provider (active or inactive)
        const { data: existingMethod } = await supabase
          .from('user_payment_methods')
          .select('id')
          .eq('user_id', userId)
          .eq('payment_provider_id', providerId)
          .maybeSingle();

        if (existingMethod) {
          // Reactivate and update existing method
          const { error } = await supabase
            .from('user_payment_methods')
            .update({
              account_identifier: trimmedIdentifier,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingMethod.id);

          if (error) throw error;
        } else {
          // Create new method
          const { error } = await supabase
            .from('user_payment_methods')
            .insert({
              user_id: userId,
              payment_provider_id: providerId,
              account_identifier: trimmedIdentifier,
              is_active: true,
              is_default: userMethods.length === 0, // First method is default
            });

          if (error) throw error;
        }
      }

      // Also update legacy fields in users table for backward compatibility
      const provider = providers.find(p => p.id === providerId);
      if (provider) {
        const legacyUpdate: Record<string, string | null> = {};
        
        // Map provider slugs to legacy fields
        if (provider.slug === 'cashapp') {
          legacyUpdate.cashapp_username = trimmedIdentifier;
        } else if (provider.slug === 'venmo') {
          legacyUpdate.venmo_username = trimmedIdentifier;
        } else if (provider.slug === 'paypal') {
          legacyUpdate.paypal_email = trimmedIdentifier;
        } else if (provider.slug === 'zelle') {
          // For Zelle, we need to determine if it's email or phone
          if (trimmedIdentifier.includes('@')) {
            legacyUpdate.zelle_email = trimmedIdentifier;
          } else if (trimmedIdentifier.replace(/\D/g, '').length >= 10) {
            // It's a phone number
            legacyUpdate.zelle_phone = trimmedIdentifier;
          } else {
            // Default to email
            legacyUpdate.zelle_email = trimmedIdentifier;
          }
        }

        if (Object.keys(legacyUpdate).length > 0) {
          console.log('[UserPaymentMethodsSettings] Updating legacy fields:', legacyUpdate);
          const { error: legacyError } = await supabase
            .from('users')
            .update(legacyUpdate)
            .eq('id', userId);

          if (legacyError) {
            console.error('[UserPaymentMethodsSettings] Error updating legacy fields:', legacyError);
            // Don't throw - this is non-critical
          } else {
            console.log('[UserPaymentMethodsSettings] Legacy fields updated successfully');
          }
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
    if (!confirm('Remove this payment method?')) return;

    setSaving(methodId);
    try {
      const method = userMethods.find(m => m.id === methodId);
      
      const { error } = await supabase
        .from('user_payment_methods')
        .update({ is_active: false })
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
        } else if (provider.slug === 'zelle') {
          legacyUpdate.zelle_email = null;
          legacyUpdate.zelle_phone = null; // Clear both for Zelle
        }

        if (Object.keys(legacyUpdate).length > 0) {
          console.log('[UserPaymentMethodsSettings] Clearing legacy fields:', legacyUpdate);
          const { error: legacyError } = await supabase
            .from('users')
            .update(legacyUpdate)
            .eq('id', userId);

          if (legacyError) {
            console.error('[UserPaymentMethodsSettings] Error clearing legacy fields:', legacyError);
          }
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

  const setDefault = async (methodId: string) => {
    setSaving(methodId);
    try {
      // Unset all defaults first
      await supabase
        .from('user_payment_methods')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Set this one as default
      const { error } = await supabase
        .from('user_payment_methods')
        .update({ is_default: true })
        .eq('id', methodId);

      if (error) throw error;

      // Update legacy preferred_payment_method
      const method = userMethods.find(m => m.id === methodId);
      if (method?.payment_provider) {
        const provider = method.payment_provider as PaymentProvider;
        if (['cashapp', 'venmo', 'paypal'].includes(provider.slug)) {
          const { error: legacyError } = await supabase
            .from('users')
            .update({ preferred_payment_method: provider.slug })
            .eq('id', userId);

          if (legacyError) {
            console.error('[UserPaymentMethodsSettings] Error updating preferred method:', legacyError);
          }
        }
      }

      await fetchData();
      onUpdate?.();
    } catch (err: any) {
      console.error('Error setting default:', err);
      setError(err?.message || 'Failed to set default payment method');
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
            Payment Methods
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Add your payment accounts to receive and send funds
          </p>
        </div>
        {userMethods.length > 0 && unconnectedProviders.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddNew(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Method
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

      {/* Connected Methods */}
      {userMethods.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Connected Accounts
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
                className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
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
                      {method.is_default && (
                        <Badge variant="primary" size="sm">Default</Badge>
                      )}
                      {method.is_verified && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
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
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {method.account_identifier}
                      </p>
                    )}
                  </div>
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-2">
                    {!method.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefault(method.id)}
                        disabled={!!saving}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingMethod(method.id);
                        setEditValue(method.account_identifier);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMethod(method.id)}
                      disabled={!!saving}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Method Section */}
      {(showAddNew || userMethods.length === 0) && unconnectedProviders.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {userMethods.length === 0 ? 'Add a Payment Method' : 'Add Another Method'}
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
                      setShowAddNew(userMethods.length > 0 ? false : true);
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
                    Add
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {showAddNew && userMethods.length > 0 && !selectedProvider && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddNew(false)}
              className="w-full"
            >
              Cancel
            </Button>
          )}
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
            💡 Your payment methods are shown to lenders/borrowers so they know where to send funds.
            The default method is shown first.
          </p>
        </div>
      )}
    </div>
  );
}