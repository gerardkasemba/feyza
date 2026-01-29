'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Globe,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Save,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

interface Country {
  id: string;
  code: string;
  name: string;
  currency: string;
  currency_symbol: string;
  is_active: boolean;
  dwolla_supported: boolean;
  paypal_supported: boolean;
  min_loan_amount: number;
  max_loan_amount: number;
  created_at: string;
}

const defaultCountries: Omit<Country, 'id' | 'created_at'>[] = [
  { code: 'US', name: 'United States', currency: 'USD', currency_symbol: '$', is_active: true, dwolla_supported: true, paypal_supported: true, min_loan_amount: 50, max_loan_amount: 5000 },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', currency_symbol: '£', is_active: true, dwolla_supported: false, paypal_supported: true, min_loan_amount: 50, max_loan_amount: 4000 },
  { code: 'CA', name: 'Canada', currency: 'CAD', currency_symbol: 'C$', is_active: true, dwolla_supported: false, paypal_supported: true, min_loan_amount: 50, max_loan_amount: 5000 },
  { code: 'AU', name: 'Australia', currency: 'AUD', currency_symbol: 'A$', is_active: false, dwolla_supported: false, paypal_supported: true, min_loan_amount: 50, max_loan_amount: 5000 },
  { code: 'EU', name: 'European Union', currency: 'EUR', currency_symbol: '€', is_active: false, dwolla_supported: false, paypal_supported: true, min_loan_amount: 50, max_loan_amount: 4000 },
];

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    currency: '',
    currency_symbol: '',
    is_active: true,
    dwolla_supported: false,
    paypal_supported: true,
    min_loan_amount: 50,
    max_loan_amount: 5000,
  });
  const supabase = createClient();

  const fetchCountries = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('countries')
      .select('*')
      .order('name', { ascending: true });

    if (data && data.length > 0) {
      setCountries(data);
    } else {
      // Use defaults
      setCountries(defaultCountries.map((c, i) => ({
        ...c,
        id: `default-${i}`,
        created_at: new Date().toISOString(),
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      currency: '',
      currency_symbol: '',
      is_active: true,
      dwolla_supported: false,
      paypal_supported: true,
      min_loan_amount: 50,
      max_loan_amount: 5000,
    });
  };

  const handleEdit = (country: Country) => {
    setFormData({
      code: country.code,
      name: country.name,
      currency: country.currency,
      currency_symbol: country.currency_symbol,
      is_active: country.is_active,
      dwolla_supported: country.dwolla_supported,
      paypal_supported: country.paypal_supported,
      min_loan_amount: country.min_loan_amount,
      max_loan_amount: country.max_loan_amount,
    });
    setEditingId(country.id);
    setShowAddForm(false);
  };

  const handleSave = async () => {
    try {
      if (editingId && !editingId.startsWith('default-')) {
        await supabase.from('countries').update(formData).eq('id', editingId);
      } else {
        await supabase.from('countries').insert(formData);
      }
      await fetchCountries();
      setEditingId(null);
      setShowAddForm(false);
      resetForm();
    } catch (err) {
      console.error('Error saving country:', err);
      alert('Failed to save. The countries table may not exist.');
    }
  };

  const toggleActive = async (country: Country) => {
    if (country.id.startsWith('default-')) {
      alert('Cannot modify default countries. Create the countries table first.');
      return;
    }
    await supabase.from('countries').update({ is_active: !country.is_active }).eq('id', country.id);
    await fetchCountries();
  };

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-48" />
          <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <Globe className="w-7 h-7 text-emerald-500" />
            Countries
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Configure supported countries and currencies
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddForm(true); setEditingId(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Country
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          type="text"
          placeholder="Search countries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-neutral-900 dark:text-white placeholder-neutral-400"
        />
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingId) && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            {editingId ? 'Edit Country' : 'Add Country'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="US"
                maxLength={3}
                className="w-full px-4 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="United States"
                className="w-full px-4 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Currency</label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                placeholder="USD"
                maxLength={3}
                className="w-full px-4 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Symbol</label>
              <input
                type="text"
                value={formData.currency_symbol}
                onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                placeholder="$"
                maxLength={3}
                className="w-full px-4 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Min Amount</label>
              <input
                type="number"
                value={formData.min_loan_amount}
                onChange={(e) => setFormData({ ...formData, min_loan_amount: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Max Amount</label>
              <input
                type="number"
                value={formData.max_loan_amount}
                onChange={(e) => setFormData({ ...formData, max_loan_amount: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-6 md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-emerald-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.dwolla_supported}
                  onChange={(e) => setFormData({ ...formData, dwolla_supported: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-emerald-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Dwolla</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.paypal_supported}
                  onChange={(e) => setFormData({ ...formData, paypal_supported: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-emerald-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">PayPal</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => { setShowAddForm(false); setEditingId(null); resetForm(); }}
              className="px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.code || !formData.name}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      )}

      {/* Countries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCountries.map((country) => (
          <div
            key={country.id}
            className={`bg-white dark:bg-neutral-800 rounded-xl border ${
              country.is_active
                ? 'border-neutral-200 dark:border-neutral-700'
                : 'border-neutral-200 dark:border-neutral-700 opacity-60'
            } p-5`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center text-lg font-bold text-blue-600 dark:text-blue-400">
                  {country.code}
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">{country.name}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{country.currency_symbol} {country.currency}</p>
                </div>
              </div>
              <button
                onClick={() => toggleActive(country)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {country.is_active ? (
                  <ToggleRight className="w-6 h-6 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-6 h-6" />
                )}
              </button>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Loan Range</span>
                <span className="text-neutral-900 dark:text-white">
                  {country.currency_symbol}{country.min_loan_amount} - {country.currency_symbol}{country.max_loan_amount}
                </span>
              </div>
              <div className="flex gap-2">
                {country.dwolla_supported && (
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs rounded-full">
                    Dwolla
                  </span>
                )}
                {country.paypal_supported && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                    PayPal
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => handleEdit(country)}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">Payment Provider Support</p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              Dwolla only supports USD transactions in the United States. PayPal can be used for other countries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
