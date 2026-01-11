'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar, Footer } from '@/components/layout';
import { Button, Card, Input } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  Settings,
  DollarSign,
  Globe,
  Shield,
  Zap,
  Bell,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Info,
  Wallet,
  Clock,
  Star,
} from 'lucide-react';

const COUNTRIES = [
  { code: 'KE', name: 'Kenya' },
  { code: 'UG', name: 'Uganda' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'MW', name: 'Malawi' },
];

const RATINGS = [
  { value: 'great', label: 'Great ⭐', description: 'Only top borrowers' },
  { value: 'good', label: 'Good 👍', description: 'Reliable borrowers' },
  { value: 'neutral', label: 'Neutral 🆕', description: 'Including new borrowers' },
  { value: 'poor', label: 'Poor ⚠️', description: 'Higher risk tolerance' },
  { value: 'bad', label: 'Bad ⛔', description: 'Very high risk' },
  { value: 'worst', label: 'Any', description: 'Accept everyone' },
];

interface Preferences {
  is_active: boolean;
  auto_accept: boolean;
  min_amount: number;
  max_amount: number;
  preferred_currency: string;
  interest_rate: number;
  interest_type: string;
  countries: string[];
  min_borrower_rating: string;
  require_verified_borrower: boolean;
  min_term_weeks: number;
  max_term_weeks: number;
  capital_pool: number;
  notify_on_match: boolean;
  notify_email: boolean;
  notify_sms: boolean;
}

export default function LenderPreferencesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusinessLender, setIsBusinessLender] = useState(false);

  const [preferences, setPreferences] = useState<Preferences>({
    is_active: true,
    auto_accept: false,
    min_amount: 50,
    max_amount: 5000,
    preferred_currency: 'USD',
    interest_rate: 10,
    interest_type: 'simple',
    countries: [],
    min_borrower_rating: 'neutral',
    require_verified_borrower: false,
    min_term_weeks: 1,
    max_term_weeks: 52,
    capital_pool: 0,
    notify_on_match: true,
    notify_email: true,
    notify_sms: false,
  });

  useEffect(() => {
    fetchUserAndPreferences();
  }, []);

  const fetchUserAndPreferences = async () => {
    try {
      const supabase = createClient();
      
      // Get authenticated user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/auth/signin');
        return;
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setUser(profile || {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || 'User',
        user_type: authUser.user_metadata?.user_type || 'business',
      });

      // Fetch preferences
      const response = await fetch('/api/lender/preferences');
      if (response.ok) {
        const data = await response.json();
        setIsBusinessLender(data.isBusinessLender);
        if (data.preferences) {
          setPreferences({
            ...preferences,
            ...data.preferences,
            countries: data.preferences.countries || [],
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/lender/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleCountry = (code: string) => {
    setPreferences(prev => ({
      ...prev,
      countries: prev.countries.includes(code)
        ? prev.countries.filter(c => c !== code)
        : [...prev.countries, code],
    }));
  };

  const selectAllCountries = () => {
    setPreferences(prev => ({
      ...prev,
      countries: COUNTRIES.map(c => c.code),
    }));
  };

  const clearCountries = () => {
    setPreferences(prev => ({ ...prev, countries: [] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navbar user={user} />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar user={user} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Lender Preferences</h1>
              <p className="text-neutral-500">Configure your auto-matching settings</p>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-700">Preferences saved successfully!</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Active Status & Auto-Accept */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-500" />
                <h2 className="text-lg font-semibold text-neutral-900">Matching Settings</h2>
              </div>
            </div>

            <div className="space-y-4">
              {/* Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                <div>
                  <p className="font-medium text-neutral-900">Accept New Loans</p>
                  <p className="text-sm text-neutral-500">Receive loan requests from borrowers</p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, is_active: !p.is_active }))}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    preferences.is_active ? 'bg-green-500' : 'bg-neutral-300'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    preferences.is_active ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Auto-Accept Toggle */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                <div>
                  <p className="font-medium text-neutral-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Auto-Accept Loans
                  </p>
                  <p className="text-sm text-neutral-500">Automatically accept matching loan requests</p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, auto_accept: !p.auto_accept }))}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    preferences.auto_accept ? 'bg-yellow-500' : 'bg-neutral-300'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    preferences.auto_accept ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {preferences.auto_accept && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    When enabled, loans matching your criteria will be <strong>automatically accepted</strong>. 
                    Make sure your capital pool is funded and your preferences are correct.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Capital Pool */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Wallet className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-semibold text-neutral-900">Capital Pool</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Available Capital for Lending
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                  <input
                    type="number"
                    value={preferences.capital_pool}
                    onChange={(e) => setPreferences(p => ({ ...p, capital_pool: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-8 pr-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 text-lg font-semibold"
                    min="0"
                    step="100"
                  />
                </div>
                <p className="text-sm text-neutral-500 mt-2">
                  This is the total amount you're willing to lend. The system will only match you with loans you can fund.
                </p>
              </div>
            </div>
          </Card>

          {/* Amount Range */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-semibold text-neutral-900">Loan Amount Range</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Minimum Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                  <input
                    type="number"
                    value={preferences.min_amount}
                    onChange={(e) => setPreferences(p => ({ ...p, min_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-8 pr-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Maximum Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                  <input
                    type="number"
                    value={preferences.max_amount}
                    onChange={(e) => setPreferences(p => ({ ...p, max_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-8 pr-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Interest Rate */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-neutral-900">Interest Rate</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Annual Interest Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={preferences.interest_rate}
                    onChange={(e) => setPreferences(p => ({ ...p, interest_rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                    min="0"
                    max="100"
                    step="0.5"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Interest Type
                </label>
                <select
                  value={preferences.interest_type}
                  onChange={(e) => setPreferences(p => ({ ...p, interest_type: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                >
                  <option value="simple">Simple Interest</option>
                  <option value="compound">Compound Interest</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Countries */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-purple-500" />
                <h2 className="text-lg font-semibold text-neutral-900">Countries</h2>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllCountries}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearCountries}>
                  Clear
                </Button>
              </div>
            </div>

            <p className="text-sm text-neutral-500 mb-4">
              Select countries where you're willing to disburse funds. Leave empty to accept all countries.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  onClick={() => toggleCountry(country.code)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    preferences.countries.includes(country.code)
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                      : 'bg-neutral-50 text-neutral-600 border-2 border-transparent hover:bg-neutral-100'
                  }`}
                >
                  {country.name}
                </button>
              ))}
            </div>

            {preferences.countries.length === 0 && (
              <p className="text-sm text-yellow-600 mt-4 flex items-center gap-2">
                <Info className="w-4 h-4" />
                All countries selected (no filter applied)
              </p>
            )}
          </Card>

          {/* Borrower Requirements */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-neutral-900">Borrower Requirements</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Minimum Borrower Rating
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {RATINGS.map((rating) => (
                    <button
                      key={rating.value}
                      onClick={() => setPreferences(p => ({ ...p, min_borrower_rating: rating.value }))}
                      className={`p-3 rounded-xl text-left transition-all ${
                        preferences.min_borrower_rating === rating.value
                          ? 'bg-primary-100 border-2 border-primary-500'
                          : 'bg-neutral-50 border-2 border-transparent hover:bg-neutral-100'
                      }`}
                    >
                      <p className="font-medium text-neutral-900">{rating.label}</p>
                      <p className="text-xs text-neutral-500">{rating.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                <div>
                  <p className="font-medium text-neutral-900">Require Verified Borrower</p>
                  <p className="text-sm text-neutral-500">Only accept KYC-verified borrowers</p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, require_verified_borrower: !p.require_verified_borrower }))}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    preferences.require_verified_borrower ? 'bg-primary-500' : 'bg-neutral-300'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    preferences.require_verified_borrower ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </Card>

          {/* Loan Terms */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-neutral-900">Loan Term Range</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Minimum Term (weeks)
                </label>
                <input
                  type="number"
                  value={preferences.min_term_weeks}
                  onChange={(e) => setPreferences(p => ({ ...p, min_term_weeks: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Maximum Term (weeks)
                </label>
                <input
                  type="number"
                  value={preferences.max_term_weeks}
                  onChange={(e) => setPreferences(p => ({ ...p, max_term_weeks: parseInt(e.target.value) || 52 }))}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                  min="1"
                />
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-semibold text-neutral-900">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                <div>
                  <p className="font-medium text-neutral-900">Notify on Match</p>
                  <p className="text-sm text-neutral-500">Get notified when matched with a loan</p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, notify_on_match: !p.notify_on_match }))}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    preferences.notify_on_match ? 'bg-primary-500' : 'bg-neutral-300'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    preferences.notify_on_match ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                <div>
                  <p className="font-medium text-neutral-900">Email Notifications</p>
                  <p className="text-sm text-neutral-500">Receive notifications via email</p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, notify_email: !p.notify_email }))}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    preferences.notify_email ? 'bg-primary-500' : 'bg-neutral-300'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    preferences.notify_email ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Save Preferences
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
