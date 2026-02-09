'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '@/components/ui';
import { 
  Globe,
  Save, 
  AlertCircle, 
  CheckCircle,
  RefreshCw,
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Settings,
  Smartphone,
  Banknote,
  Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Country {
  code: string;
  name: string;
  enabled: boolean;
}

interface PaymentProvider {
  id: string;
  slug: string;
  name: string;
  provider_type: string;
  is_enabled: boolean;
  supported_countries: string[];
  icon_name: string;
  brand_color: string;
}

interface CountryPaymentMethod {
  id?: string;
  country_code: string;
  payment_provider_id: string;
  is_enabled: boolean;
  is_default_for_disbursement: boolean;
  is_default_for_repayment: boolean;
}

export default function AdminCountriesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [countries, setCountries] = useState<Country[]>([]);
  const [newCountry, setNewCountry] = useState({ code: '', name: '' });
  
  // Payment methods state
  const [paymentProviders, setPaymentProviders] = useState<PaymentProvider[]>([]);
  const [countryPaymentMethods, setCountryPaymentMethods] = useState<Record<string, CountryPaymentMethod[]>>({});
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [savingPaymentMethods, setSavingPaymentMethods] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function checkAdminAndFetch() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);

      try {
        // Fetch countries
        const res = await fetch('/api/admin/countries');
        const data = await res.json();
        if (data.allCountries) {
          setCountries(data.allCountries);
        }

        // Fetch payment providers
        const { data: providers } = await supabase
          .from('payment_providers')
          .select('*')
          .order('display_order', { ascending: true });
        
        if (providers) {
          setPaymentProviders(providers);
        }

        // Fetch country payment methods
        const { data: cpm } = await supabase
          .from('country_payment_methods')
          .select('*');
        
        if (cpm) {
          const grouped: Record<string, CountryPaymentMethod[]> = {};
          cpm.forEach(m => {
            if (!grouped[m.country_code]) grouped[m.country_code] = [];
            grouped[m.country_code].push(m);
          });
          setCountryPaymentMethods(grouped);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }

      setLoading(false);
    }

    checkAdminAndFetch();
  }, [router, supabase]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/countries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countries }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Countries saved successfully!' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setSaving(false);
  };

  const toggleCountry = (code: string) => {
    setCountries(prev => prev.map(c => 
      c.code === code ? { ...c, enabled: !c.enabled } : c
    ));
  };

  const addCountry = () => {
    if (!newCountry.code || !newCountry.name) {
      setMessage({ type: 'error', text: 'Please enter both country code and name' });
      return;
    }
    
    if (countries.some(c => c.code === newCountry.code.toUpperCase())) {
      setMessage({ type: 'error', text: 'Country code already exists' });
      return;
    }
    
    setCountries(prev => [...prev, {
      code: newCountry.code.toUpperCase(),
      name: newCountry.name,
      enabled: true,
    }]);
    setNewCountry({ code: '', name: '' });
    setMessage(null);
  };

  const removeCountry = (code: string) => {
    setCountries(prev => prev.filter(c => c.code !== code));
  };

  const enableAll = () => {
    setCountries(prev => prev.map(c => ({ ...c, enabled: true })));
  };

  const disableAll = () => {
    setCountries(prev => prev.map(c => ({ ...c, enabled: false })));
  };

  // Get payment methods that support a country (globally or specifically)
  const getAvailableProvidersForCountry = (countryCode: string) => {
    return paymentProviders.filter(p => {
      if (!p.is_enabled) return false;
      const supported = p.supported_countries || [];
      return supported.includes('*') || supported.includes(countryCode);
    });
  };

  // Check if a payment method is enabled for a country
  const isPaymentMethodEnabledForCountry = (countryCode: string, providerId: string): boolean => {
    const methods = countryPaymentMethods[countryCode] || [];
    const method = methods.find(m => m.payment_provider_id === providerId);
    
    // If we have a specific entry, return its is_enabled value
    if (method) {
      return method.is_enabled;
    }
    
    // If no specific entry, check global provider settings
    const provider = paymentProviders.find(p => p.id === providerId);
    
    // If provider doesn't exist or is disabled, return false
    if (!provider || !provider.is_enabled) {
      return false;
    }
    
    // Check if provider supports this country
    const supported = provider.supported_countries || [];
    return supported.includes('*') || supported.includes(countryCode);
  };

  // Toggle payment method for a country
  const togglePaymentMethodForCountry = async (countryCode: string, providerId: string, currentlyEnabled: boolean) => {
    setSavingPaymentMethods(countryCode);
    
    try {
      const methods = countryPaymentMethods[countryCode] || [];
      const existingMethod = methods.find(m => m.payment_provider_id === providerId);

      if (existingMethod) {
        // Update existing
        const { error } = await supabase
          .from('country_payment_methods')
          .update({ is_enabled: !currentlyEnabled })
          .eq('id', existingMethod.id);
        
        if (error) throw error;
        
        setCountryPaymentMethods(prev => ({
          ...prev,
          [countryCode]: prev[countryCode].map(m => 
            m.id === existingMethod.id ? { ...m, is_enabled: !currentlyEnabled } : m
          )
        }));
      } else {
        // Create new entry
        const { data, error } = await supabase
          .from('country_payment_methods')
          .insert({
            country_code: countryCode,
            payment_provider_id: providerId,
            is_enabled: !currentlyEnabled,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setCountryPaymentMethods(prev => ({
          ...prev,
          [countryCode]: [...(prev[countryCode] || []), data]
        }));
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Failed to update payment method: ${error.message}` });
    } finally {
      setSavingPaymentMethods(null);
    }
  };

  // Get provider type icon
  const getProviderIcon = (providerType: string) => {
    switch (providerType) {
      case 'automated': return Zap;
      case 'mobile_money': return Smartphone;
      case 'cash': return Banknote;
      default: return CreditCard;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const enabledCount = countries.filter(c => c.enabled).length;

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Globe className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                  Supported Countries
                </h1>
                <p className="text-sm text-neutral-500">
                  Manage lending regions & payment methods
                </p>
              </div>
            </div>
            
            <Badge variant="info">
              {enabledCount} of {countries.length} active
            </Badge>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          {/* Quick Actions */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-neutral-900 dark:text-white">Quick Actions</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={enableAll}>
                  Enable All
                </Button>
                <Button variant="outline" size="sm" onClick={disableAll}>
                  Disable All
                </Button>
              </div>
            </div>
          </Card>

          {/* Add New Country */}
          <Card className="p-4">
            <h3 className="font-medium text-neutral-900 dark:text-white mb-3">Add New Country</h3>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Code (e.g. US)"
                value={newCountry.code}
                onChange={(e) => setNewCountry(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                maxLength={3}
                className="w-20 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm uppercase"
              />
              <input
                type="text"
                placeholder="Country name"
                value={newCountry.name}
                onChange={(e) => setNewCountry(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm"
              />
              <Button size="sm" onClick={addCountry}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          {/* Countries List with Payment Methods */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-neutral-900 dark:text-white">Countries & Payment Methods</h3>
              <Link href="/admin/payment-providers">
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4 mr-1" />
                  Manage Providers
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {countries.map((country) => {
                const isExpanded = expandedCountry === country.code;
                const availableProviders = getAvailableProvidersForCountry(country.code);
                const enabledProviders = availableProviders.filter(p => isPaymentMethodEnabledForCountry(country.code, p.id));
                
                return (
                  <div key={country.code} className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                    {/* Country Header */}
                    <div
                      className={`flex items-center justify-between p-3 transition-colors ${
                        country.enabled
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : 'bg-neutral-50 dark:bg-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-10 text-sm font-mono font-medium text-neutral-500">
                          {country.code}
                        </span>
                        <span className={`font-medium ${
                          country.enabled 
                            ? 'text-neutral-900 dark:text-white' 
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}>
                          {country.name}
                        </span>
                        {country.enabled && (
                          <Badge variant="secondary" size="sm">
                            {enabledProviders.length} payment methods
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Expand for payment methods */}
                        {country.enabled && availableProviders.length > 0 && (
                          <button
                            onClick={() => setExpandedCountry(isExpanded ? null : country.code)}
                            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                            title="Configure payment methods"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                        
                        {/* Enable/Disable toggle */}
                        <button
                          onClick={() => toggleCountry(country.code)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            country.enabled 
                              ? 'bg-green-500' 
                              : 'bg-neutral-300 dark:bg-neutral-600'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            country.enabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`} />
                        </button>
                        
                        {/* Delete */}
                        <button
                          onClick={() => removeCountry(country.code)}
                          className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Payment Methods (Expanded) */}
                    {isExpanded && country.enabled && (
                      <div className="p-3 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                          Select which payment methods are available in {country.name}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {availableProviders.map(provider => {
                            const isEnabled = isPaymentMethodEnabledForCountry(country.code, provider.id);
                            const Icon = getProviderIcon(provider.provider_type);
                            const isSaving = savingPaymentMethods === country.code;
                            
                            return (
                              <button
                                key={provider.id}
                                onClick={() => {
                                  const isEnabled = isPaymentMethodEnabledForCountry(country.code, provider.id);
                                  togglePaymentMethodForCountry(country.code, provider.id, isEnabled);
                                }}
                                disabled={isSaving}
                                className={`p-3 rounded-lg border-2 text-left transition-all ${
                                  isEnabled
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                                } ${isSaving ? 'opacity-50' : ''}`}
                              >
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `${provider.brand_color}20` }}
                                  >
                                    <Icon className="w-4 h-4" style={{ color: provider.brand_color }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${
                                      isEnabled ? 'text-green-700 dark:text-green-400' : 'text-neutral-700 dark:text-neutral-300'
                                    }`}>
                                      {provider.name}
                                    </p>
                                    <p className="text-xs text-neutral-500 capitalize">{provider.provider_type.replace('_', ' ')}</p>
                                  </div>
                                  {isEnabled && (
                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        
                        {availableProviders.length === 0 && (
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">
                            No payment providers support this country yet.{' '}
                            <Link href="/admin/payment-providers" className="text-primary-600 hover:underline">
                              Configure providers
                            </Link>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {countries.length === 0 && (
                <div className="text-center py-8 text-neutral-500">
                  No countries added yet. Add your first country above.
                </div>
              )}
            </div>
          </Card>

          {/* Info Box */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex gap-3 text-sm">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">How it works</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
                  <li>Enabled countries appear in lender preferences</li>
                  <li>Click the arrow to expand and configure payment methods per country</li>
                  <li>Payment methods are shown to users based on their country</li>
                  <li>Manage global provider settings in <Link href="/admin/payment-providers" className="underline">Payment Methods</Link></li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Countries
              </>
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}
