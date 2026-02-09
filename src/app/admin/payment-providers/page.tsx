'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, Button, Badge, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Smartphone,
  Banknote,
  Zap,
  Check,
  X,
  Settings,
  Globe,
  DollarSign,
  Clock,
  Shield,
  ChevronDown,
  ChevronUp,
  Save,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

interface PaymentProvider {
  id: string;
  slug: string;
  name: string;
  description: string;
  provider_type: 'automated' | 'manual' | 'mobile_money' | 'cash';
  is_enabled: boolean;
  is_available_for_disbursement: boolean;
  is_available_for_repayment: boolean;
  requires_api_credentials: boolean;
  api_credentials: Record<string, string>;
  api_environment: 'sandbox' | 'production';
  supported_countries: string[];
  supported_currencies: string[];
  fee_type: string;
  fee_percentage: number;
  fee_fixed: number;
  min_amount: number | null;
  max_amount: number | null;
  estimated_transfer_days_min: number;
  estimated_transfer_days_max: number;
  account_identifier_label: string | null;
  icon_name: string;
  brand_color: string;
  display_order: number;
  instructions: string;
}

const PROVIDER_TYPE_CONFIG = {
  automated: { label: 'Automated', color: 'primary', icon: Zap, description: 'API-based automatic transfers' },
  manual: { label: 'Manual', color: 'yellow', icon: Smartphone, description: 'User sends & uploads proof' },
  mobile_money: { label: 'Mobile Money', color: 'green', icon: Smartphone, description: 'Mobile money transfer' },
  cash: { label: 'Cash', color: 'neutral', icon: Banknote, description: 'Physical cash payment' },
};

const getIconComponent = (iconName: string) => {
  const icons: Record<string, React.ComponentType<any>> = {
    Building2, CreditCard, Smartphone, Banknote, Zap,
  };
  return icons[iconName] || CreditCard;
};

export default function PaymentProvidersPage() {
  const supabase = createClient();
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_providers')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setProviders(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleProvider = async (provider: PaymentProvider) => {
    setSaving(provider.id);
    try {
      const { error } = await supabase
        .from('payment_providers')
        .update({ is_enabled: !provider.is_enabled })
        .eq('id', provider.id);

      if (error) throw error;
      
      setProviders(prev => prev.map(p => 
        p.id === provider.id ? { ...p, is_enabled: !p.is_enabled } : p
      ));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  const updateProvider = async (providerId: string, updates: Partial<PaymentProvider>) => {
    setSaving(providerId);
    try {
      const { error } = await supabase
        .from('payment_providers')
        .update(updates)
        .eq('id', providerId);

      if (error) throw error;
      
      setProviders(prev => prev.map(p => 
        p.id === providerId ? { ...p, ...updates } : p
      ));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  const updateCredentials = async (providerId: string, credentials: Record<string, string>) => {
    setSaving(providerId);
    try {
      const { error } = await supabase
        .from('payment_providers')
        .update({ api_credentials: credentials })
        .eq('id', providerId);

      if (error) throw error;
      
      setProviders(prev => prev.map(p => 
        p.id === providerId ? { ...p, api_credentials: credentials } : p
      ));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  // Group providers by type
  const groupedProviders = providers.reduce((acc, provider) => {
    const type = provider.provider_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(provider);
    return acc;
  }, {} as Record<string, PaymentProvider[]>);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Payment Providers</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              Configure payment methods available on the platform
            </p>
          </div>
          <Button variant="outline" onClick={fetchProviders}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{providers.filter(p => p.is_enabled).length}</p>
              <p className="text-sm text-neutral-500">Enabled</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
              <X className="w-5 h-5 text-neutral-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{providers.filter(p => !p.is_enabled).length}</p>
              <p className="text-sm text-neutral-500">Disabled</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{providers.filter(p => p.provider_type === 'automated').length}</p>
              <p className="text-sm text-neutral-500">Automated</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{providers.filter(p => p.provider_type !== 'automated').length}</p>
              <p className="text-sm text-neutral-500">Manual/Mobile</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Provider Groups */}
      {Object.entries(PROVIDER_TYPE_CONFIG).map(([type, config]) => {
        const typeProviders = groupedProviders[type] || [];
        if (typeProviders.length === 0) return null;

        const TypeIcon = config.icon;

        return (
          <div key={type} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${config.color}-100`}>
                <TypeIcon className={`w-4 h-4 text-${config.color}-600`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{config.label}</h2>
                <p className="text-sm text-neutral-500">{config.description}</p>
              </div>
            </div>

            <div className="space-y-3">
              {typeProviders.map(provider => {
                const isExpanded = expandedProvider === provider.id;
                const isSaving = saving === provider.id;

                return (
                  <Card key={provider.id} className="overflow-hidden">
                    {/* Provider Header */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${provider.brand_color}20` }}
                        >
                          {React.createElement(getIconComponent(provider.icon_name), {
                            className: 'w-6 h-6',
                            style: { color: provider.brand_color }
                          })}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-neutral-900 dark:text-white">{provider.name}</h3>
                            <Badge variant={provider.is_enabled ? 'success' : 'secondary'} size="sm">
                              {provider.is_enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                            {provider.requires_api_credentials && !Object.keys(provider.api_credentials || {}).length && (
                              <Badge variant="warning" size="sm">Needs Config</Badge>
                            )}
                          </div>
                          <p className="text-sm text-neutral-500">{provider.description}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {provider.supported_countries.includes('*') ? 'Global' : provider.supported_countries.join(', ')}
                            </span>
                            {provider.estimated_transfer_days_max > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {provider.estimated_transfer_days_min}-{provider.estimated_transfer_days_max} days
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Enable/Disable Toggle */}
                        <button
                          onClick={() => toggleProvider(provider)}
                          disabled={isSaving}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            provider.is_enabled ? 'bg-green-500' : 'bg-neutral-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              provider.is_enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>

                        {/* Expand Button */}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Settings */}
                    {isExpanded && (
                      <div className="border-t border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-800/50">
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Availability */}
                          <div>
                            <h4 className="font-medium text-neutral-900 dark:text-white mb-3">Availability</h4>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={provider.is_available_for_disbursement}
                                  onChange={(e) => updateProvider(provider.id, { is_available_for_disbursement: e.target.checked })}
                                  className="rounded border-neutral-300"
                                />
                                <span className="text-sm">Available for disbursement (Lender → Borrower)</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={provider.is_available_for_repayment}
                                  onChange={(e) => updateProvider(provider.id, { is_available_for_repayment: e.target.checked })}
                                  className="rounded border-neutral-300"
                                />
                                <span className="text-sm">Available for repayment (Borrower → Lender)</span>
                              </label>
                            </div>
                          </div>

                          {/* Limits */}
                          <div>
                            <h4 className="font-medium text-neutral-900 dark:text-white mb-3">Limits</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-neutral-500 mb-1">Min Amount</label>
                                <Input
                                  type="number"
                                  value={provider.min_amount || ''}
                                  onChange={(e) => updateProvider(provider.id, { min_amount: e.target.value ? parseFloat(e.target.value) : null })}
                                  placeholder="No min"
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-neutral-500 mb-1">Max Amount</label>
                                <Input
                                  type="number"
                                  value={provider.max_amount || ''}
                                  onChange={(e) => updateProvider(provider.id, { max_amount: e.target.value ? parseFloat(e.target.value) : null })}
                                  placeholder="No max"
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          </div>

                          {/* API Credentials (for automated providers) */}
                          {provider.requires_api_credentials && (
                            <div className="md:col-span-2">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                                  <Shield className="w-4 h-4" /> API Credentials
                                </h4>
                                <div className="flex items-center gap-2">
                                  <select
                                    value={provider.api_environment}
                                    onChange={(e) => updateProvider(provider.id, { api_environment: e.target.value as 'sandbox' | 'production' })}
                                    className="text-sm border border-neutral-200 rounded-lg px-2 py-1"
                                  >
                                    <option value="sandbox">Sandbox</option>
                                    <option value="production">Production</option>
                                  </select>
                                  <button
                                    onClick={() => setShowCredentials(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                                    className="text-neutral-500 hover:text-neutral-700"
                                  >
                                    {showCredentials[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>

                              {provider.slug === 'dwolla' && (
                                <div className="grid md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs text-neutral-500 mb-1">App Key</label>
                                    <Input
                                      type={showCredentials[provider.id] ? 'text' : 'password'}
                                      value={provider.api_credentials?.app_key || ''}
                                      onChange={(e) => updateCredentials(provider.id, { ...provider.api_credentials, app_key: e.target.value })}
                                      placeholder="Enter Dwolla App Key"
                                      className="text-sm font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-neutral-500 mb-1">App Secret</label>
                                    <Input
                                      type={showCredentials[provider.id] ? 'text' : 'password'}
                                      value={provider.api_credentials?.app_secret || ''}
                                      onChange={(e) => updateCredentials(provider.id, { ...provider.api_credentials, app_secret: e.target.value })}
                                      placeholder="Enter Dwolla App Secret"
                                      className="text-sm font-mono"
                                    />
                                  </div>
                                </div>
                              )}

                              {provider.slug === 'stripe' && (
                                <div className="grid md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs text-neutral-500 mb-1">Publishable Key</label>
                                    <Input
                                      type={showCredentials[provider.id] ? 'text' : 'password'}
                                      value={provider.api_credentials?.publishable_key || ''}
                                      onChange={(e) => updateCredentials(provider.id, { ...provider.api_credentials, publishable_key: e.target.value })}
                                      placeholder="pk_..."
                                      className="text-sm font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-neutral-500 mb-1">Secret Key</label>
                                    <Input
                                      type={showCredentials[provider.id] ? 'text' : 'password'}
                                      value={provider.api_credentials?.secret_key || ''}
                                      onChange={(e) => updateCredentials(provider.id, { ...provider.api_credentials, secret_key: e.target.value })}
                                      placeholder="sk_..."
                                      className="text-sm font-mono"
                                    />
                                  </div>
                                </div>
                              )}

                              <p className="text-xs text-neutral-500 mt-2">
                                ⚠️ Credentials are stored securely. Never share them publicly.
                              </p>
                            </div>
                          )}

                          {/* Fees */}
                          <div>
                            <h4 className="font-medium text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                              <DollarSign className="w-4 h-4" /> Fees
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-neutral-500 mb-1">Fee %</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={provider.fee_percentage * 100 || ''}
                                  onChange={(e) => updateProvider(provider.id, { fee_percentage: parseFloat(e.target.value) / 100 || 0 })}
                                  placeholder="0"
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-neutral-500 mb-1">Fixed Fee</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={provider.fee_fixed || ''}
                                  onChange={(e) => updateProvider(provider.id, { fee_fixed: parseFloat(e.target.value) || 0 })}
                                  placeholder="0.00"
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Display Order */}
                          <div>
                            <h4 className="font-medium text-neutral-900 dark:text-white mb-3">Display Order</h4>
                            <Input
                              type="number"
                              value={provider.display_order}
                              onChange={(e) => updateProvider(provider.id, { display_order: parseInt(e.target.value) || 100 })}
                              className="text-sm w-24"
                            />
                            <p className="text-xs text-neutral-500 mt-1">Lower = appears first</p>
                          </div>
                        </div>

                        {isSaving && (
                          <div className="mt-4 flex items-center gap-2 text-sm text-primary-600">
                            <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Info Card */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">How Payment Providers Work</h3>
        <div className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
          <p><strong>Automated:</strong> Requires API credentials and handles transfers automatically (Dwolla, Stripe). Enable when you have proper licensing.</p>
          <p><strong>Manual:</strong> Users send payments via external apps (CashApp, Venmo) and upload proof. No API needed.</p>
          <p><strong>Mobile Money:</strong> Regional mobile money services. Can work with or without API integration.</p>
          <p><strong>Cash:</strong> Physical cash payments with photo proof. Always manual.</p>
        </div>
      </Card>
    </div>
  );
}
