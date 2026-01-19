'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar, Footer } from '@/components/layout';
import { Button, Card, Input } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { 
  FaStar, FaThumbsUp, FaExclamationTriangle, FaBan, FaGlobeAmericas,
  FaUserPlus, FaCheckCircle, FaInfoCircle, FaShieldAlt, FaLightbulb
} from 'react-icons/fa';
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
  UserPlus,
} from 'lucide-react';

interface Country {
  code: string;
  name: string;
  enabled: boolean;
}

const RATINGS = [
  { value: 'great', label: 'Great', icon: <FaStar className="w-4 h-4" />, description: 'Only top borrowers' },
  { value: 'good', label: 'Good', icon: <FaThumbsUp className="w-4 h-4" />, description: 'Reliable borrowers' },
  { value: 'neutral', label: 'Neutral', icon: <FaUserPlus className="w-4 h-4" />, description: 'Including new borrowers' },
  { value: 'poor', label: 'Poor', icon: <FaExclamationTriangle className="w-4 h-4" />, description: 'Higher risk tolerance' },
  { value: 'bad', label: 'Bad', icon: <FaBan className="w-4 h-4" />, description: 'Very high risk' },
  { value: 'worst', label: 'Any', icon: <FaGlobeAmericas className="w-4 h-4" />, description: 'Accept everyone' },
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
  // First-time borrower settings
  first_time_borrower_limit: number;
  allow_first_time_borrowers: boolean;
}

export default function LenderPreferencesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusinessLender, setIsBusinessLender] = useState(false);
  const [availableCountries, setAvailableCountries] = useState<Country[]>([]);

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
    // First-time borrower settings
    first_time_borrower_limit: 500,
    allow_first_time_borrowers: true,
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

      // Fetch supported countries
      try {
        const countriesRes = await fetch('/api/admin/countries');
        if (countriesRes.ok) {
          const countriesData = await countriesRes.json();
          setAvailableCountries(countriesData.countries || []);
        }
      } catch (err) {
        console.error('Failed to fetch countries:', err);
      }

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
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      countries: availableCountries.map(c => c.code),
    }));
  };

  const clearCountries = () => {
    setPreferences(prev => ({ ...prev, countries: [] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Navbar user={user} />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Navbar user={user} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Lender Preferences</h1>
              <p className="text-neutral-500 dark:text-neutral-400">Configure your auto-matching settings</p>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
            <span className="text-green-700 dark:text-green-300">Preferences saved successfully!</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Active Status & Auto-Accept */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Matching Settings</h2>
              </div>
            </div>

            <div className="space-y-4">
              {/* Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">Accept New Loans</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Receive loan requests from borrowers</p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, is_active: !p.is_active }))}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    preferences.is_active ? 'bg-green-500 dark:bg-green-600' : 'bg-neutral-300 dark:bg-neutral-600'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    preferences.is_active ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Auto-Accept Toggle */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                    Auto-Accept Loans
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Automatically accept matching loan requests</p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, auto_accept: !p.auto_accept }))}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    preferences.auto_accept ? 'bg-yellow-500 dark:bg-yellow-600' : 'bg-neutral-300 dark:bg-neutral-600'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    preferences.auto_accept ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {preferences.auto_accept && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
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
              <Wallet className="w-5 h-5 text-green-500 dark:text-green-400" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Capital Pool</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Available Capital for Lending
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">$</span>
                  <input
                    type="number"
                    value={preferences.capital_pool}
                    onChange={(e) => setPreferences(p => ({ ...p, capital_pool: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-8 pr-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-lg font-semibold text-neutral-900 dark:text-white"
                    min="0"
                    step="100"
                  />
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                  This is the total amount you're willing to lend. The system will only match you with loans you can fund.
                </p>
              </div>
            </div>
          </Card>

          {/* Amount Range */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="w-5 h-5 text-green-500 dark:text-green-400" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Loan Amount Range</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Minimum Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">$</span>
                  <input
                    type="number"
                    value={preferences.min_amount}
                    onChange={(e) => setPreferences(p => ({ ...p, min_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-8 pr-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Maximum Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">$</span>
                  <input
                    type="number"
                    value={preferences.max_amount}
                    onChange={(e) => setPreferences(p => ({ ...p, max_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-8 pr-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Interest Rate */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Interest Rate</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Annual Interest Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={preferences.interest_rate}
                    onChange={(e) => setPreferences(p => ({ ...p, interest_rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    min="0"
                    max="100"
                    step="0.5"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Interest Type
                </label>
                <select
                  value={preferences.interest_type}
                  onChange={(e) => setPreferences(p => ({ ...p, interest_type: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
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
                <Globe className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Countries</h2>
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

            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              Select countries where you're willing to disburse funds. Leave empty to accept all countries.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {availableCountries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => toggleCountry(country.code)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    preferences.countries.includes(country.code)
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-2 border-primary-500 dark:border-primary-400'
                      : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-2 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  {country.name}
                </button>
              ))}
            </div>

            {availableCountries.length === 0 && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                No countries available. Contact admin to add supported countries.
              </p>
            )}

            {availableCountries.length > 0 && preferences.countries.length === 0 && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-4 flex items-center gap-2">
                <Info className="w-4 h-4" />
                All countries selected (no filter applied)
              </p>
            )}
          </Card>

          {/* Borrower Requirements */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Borrower Requirements</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Minimum Borrower Rating
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {RATINGS.map((rating) => (
                    <button
                      key={rating.value}
                      onClick={() => setPreferences(p => ({ ...p, min_borrower_rating: rating.value }))}
                      className={`p-3 rounded-xl text-left transition-all ${
                        preferences.min_borrower_rating === rating.value
                          ? 'bg-primary-100 dark:bg-primary-900/30 border-2 border-primary-500 dark:border-primary-400'
                          : 'bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {rating.icon}
                        <p className="font-medium text-neutral-900 dark:text-white">{rating.label}</p>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{rating.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">Require Verified Borrower</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Only accept KYC-verified borrowers</p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, require_verified_borrower: !p.require_verified_borrower }))}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    preferences.require_verified_borrower ? 'bg-primary-500 dark:bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-600'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    preferences.require_verified_borrower ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </Card>

          {/* First-Time Borrower Settings */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <UserPlus className="w-5 h-5 text-green-500 dark:text-green-400" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">First-Time Borrower Settings</h2>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-2">
                <FaLightbulb className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>What is a first-time borrower?</strong> Someone who has never completed a loan on Feyza before. 
                  Set limits to manage your risk when lending to new users.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Toggle for allowing first-time borrowers */}
              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">Accept First-Time Borrowers</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Allow loan requests from users with no repayment history
                  </p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, allow_first_time_borrowers: !p.allow_first_time_borrowers }))}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    preferences.allow_first_time_borrowers ? 'bg-primary-500 dark:bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-600'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    preferences.allow_first_time_borrowers ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Conditional limit input - only show when first-time borrowers are allowed */}
              {preferences.allow_first_time_borrowers && (
                <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Maximum Loan for First-Time Borrowers
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                    <input
                      type="number"
                      value={preferences.first_time_borrower_limit}
                      onChange={(e) => setPreferences(p => ({ 
                        ...p, 
                        first_time_borrower_limit: Math.min(parseFloat(e.target.value) || 0, p.max_amount) 
                      }))}
                      className="w-full pl-12 pr-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      min="0"
                      max={preferences.max_amount}
                      step="50"
                    />
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                    First-time borrowers can request up to <strong className="text-neutral-900 dark:text-white">${preferences.first_time_borrower_limit.toLocaleString()}</strong>. 
                    Repeat borrowers with good history can request up to your regular maximum of <strong className="text-neutral-900 dark:text-white">${preferences.max_amount.toLocaleString()}</strong>.
                  </p>
                  
                  {/* Quick preset buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[100, 250, 500, 1000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setPreferences(p => ({ ...p, first_time_borrower_limit: amount }))}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          preferences.first_time_borrower_limit === amount
                            ? 'bg-green-500 text-white'
                            : 'bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-600'
                        }`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning when first-time borrowers are disabled */}
              {!preferences.allow_first_time_borrowers && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <div className="flex items-start gap-2">
                    <FaExclamationTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      <strong>Note:</strong> You won't be matched with first-time borrowers. 
                      This significantly reduces your potential matches but may lower risk.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Loan Terms */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Loan Term Range</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Minimum Term (weeks)
                </label>
                <input
                  type="number"
                  value={preferences.min_term_weeks}
                  onChange={(e) => setPreferences(p => ({ ...p, min_term_weeks: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Maximum Term (weeks)
                </label>
                <input
                  type="number"
                  value={preferences.max_term_weeks}
                  onChange={(e) => setPreferences(p => ({ ...p, max_term_weeks: parseInt(e.target.value) || 52 }))}
                  className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  min="1"
                />
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-5 h-5 text-pink-500 dark:text-pink-400" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">Notify on Match</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Get notified when matched with a loan</p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, notify_on_match: !p.notify_on_match }))}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    preferences.notify_on_match ? 'bg-primary-500 dark:bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-600'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    preferences.notify_on_match ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">Email Notifications</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Receive notifications via email</p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, notify_email: !p.notify_email }))}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    preferences.notify_email ? 'bg-primary-500 dark:bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-600'
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