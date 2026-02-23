'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar, Footer } from '@/components/layout';
import { Button, Card, Input } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { LenderSimplePolicyConfig } from '@/components/loans/LenderSimplePolicyConfig';
import { TrustTierExplainer } from '@/components/trust-score/TrustTierExplainer';
import {
  Settings,
  DollarSign,
  Globe,
  Shield,
  Zap,
  Bell,
  CheckCircle,
  AlertCircle,
  Wallet,
  Clock,
  CreditCard,
  MapPin,
  Save,
  Loader2,
  Star,
  Info
} from 'lucide-react';

interface Country {
  code: string;
  name: string;
  enabled: boolean;
}

interface USState {
  id?: string;
  code: string;
  name: string;
  country_code?: string;
  country_id?: string;
}

interface LoanType {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isSelected?: boolean;
}

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
  preferred_currency: string;
  countries: string[];
  states: string[];
  min_borrower_rating: string;
  require_verified_borrower: boolean;
  min_term_weeks: number;
  max_term_weeks: number;
  capital_pool: number;
  notify_on_match: boolean;
  notify_email: boolean;
  notify_sms: boolean;
}

function LenderPreferencesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'matching';

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isBusinessLender, setIsBusinessLender] = useState(false);
  const [availableCountries, setAvailableCountries] = useState<Country[]>([]);
  const [availableStates, setAvailableStates] = useState<USState[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  
  // Loan types state
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
  const [selectedLoanTypeIds, setSelectedLoanTypeIds] = useState<string[]>([]);
  const [loadingLoanTypes, setLoadingLoanTypes] = useState(false);
  const [savingLoanTypes, setSavingLoanTypes] = useState(false);

  const [preferences, setPreferences] = useState<Preferences>({
    is_active: true,
    auto_accept: false,
    min_amount: 50,
    preferred_currency: 'USD',
    countries: [],
    states: [],
    min_borrower_rating: 'neutral',
    require_verified_borrower: false,
    min_term_weeks: 1,
    max_term_weeks: 52,
    capital_pool: 0,
    notify_on_match: true,
    notify_email: true,
    notify_sms: false,
  });
  // null = preferences never saved; false = loaded but no record; true = record exists
  const [preferencesExist, setPreferencesExist] = useState<boolean | null>(null);

  useEffect(() => {
    fetchUserAndPreferences();
  }, []);

  // Fetch states for selected countries
  useEffect(() => {
    const fetchStatesForCountries = async () => {
      if (preferences.countries.length === 0) {
        setAvailableStates([]);
        return;
      }

      setLoadingStates(true);
      try {
        const allStates: USState[] = [];
        for (const countryCode of preferences.countries) {
          const statesRes = await fetch(`/api/states?country=${countryCode}`);
          if (statesRes.ok) {
            const statesData = await statesRes.json();
            if (statesData.states && statesData.states.length > 0) {
              allStates.push(...statesData.states.map((s: any) => ({
                ...s,
                country_code: countryCode,
              })));
            }
          }
        }
        setAvailableStates(allStates);
        
        const validStateCodes = allStates.map(s => s.code);
        setPreferences(prev => ({
          ...prev,
          states: prev.states.filter(s => validStateCodes.includes(s)),
        }));
      } catch (err) {
        console.error('Failed to fetch states:', err);
      }
      setLoadingStates(false);
    };
    fetchStatesForCountries();
  }, [preferences.countries]);

  const fetchUserAndPreferences = async () => {
    try {
      const supabase = createClient();
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/auth/signin');
        return;
      }

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

      try {
        const countriesRes = await fetch('/api/admin/countries');
        if (countriesRes.ok) {
          const countriesData = await countriesRes.json();
          setAvailableCountries(countriesData.countries || []);
        }
      } catch (err) {
        console.error('Failed to fetch countries:', err);
      }

      const response = await fetch('/api/lender/preferences');
      if (response.ok) {
        const data = await response.json();
        setIsBusinessLender(data.isBusinessLender);
        setPreferencesExist(!!data.preferences);
        if (data.preferences) {
          setPreferences((prev) => ({
            ...prev,
            ...data.preferences,
            countries: data.preferences.countries || [],
            states: data.preferences.states || [],
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch loan types for business lenders
  useEffect(() => {
    const fetchLoanTypes = async () => {
      if (!isBusinessLender) return;
      
      setLoadingLoanTypes(true);
      try {
        const response = await fetch('/api/business/loan-types');
        if (response.ok) {
          const data = await response.json();
          setLoanTypes(data.loanTypes || []);
          const selected = (data.loanTypes || [])
            .filter((lt: LoanType) => lt.isSelected)
            .map((lt: LoanType) => lt.id);
          setSelectedLoanTypeIds(selected);
        }
      } catch (error) {
        console.error('Failed to fetch loan types:', error);
      } finally {
        setLoadingLoanTypes(false);
      }
    };

    if (isBusinessLender) {
      fetchLoanTypes();
    }
  }, [isBusinessLender]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/lender/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLoanTypes = async () => {
    setSavingLoanTypes(true);
    try {
      const response = await fetch('/api/business/loan-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanTypeIds: selectedLoanTypeIds }),
      });

      if (!response.ok) throw new Error('Failed to save loan types');

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to save loan types');
    } finally {
      setSavingLoanTypes(false);
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

  const toggleState = (code: string) => {
    setPreferences(prev => ({
      ...prev,
      states: prev.states.includes(code)
        ? prev.states.filter(s => s !== code)
        : [...prev.states, code],
    }));
  };

  const toggleLoanType = (id: string) => {
    setSelectedLoanTypeIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const selectAllCountries = () => {
    setPreferences(prev => ({
      ...prev,
      countries: availableCountries.map(c => c.code),
    }));
  };

  const clearCountries = () => {
    setPreferences(prev => ({ ...prev, countries: [], states: [] }));
  };

  const selectAllStates = () => {
    setPreferences(prev => ({
      ...prev,
      states: availableStates.map(s => s.code),
    }));
  };

  const clearStates = () => {
    setPreferences(prev => ({ ...prev, states: [] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const tabs = [
    { id: 'matching', label: 'Matching', icon: Zap },
    { id: 'borrower-criteria', label: 'Borrower Criteria', icon: Shield },
    { id: 'geography', label: 'Geography', icon: Globe },
    ...(isBusinessLender ? [{ id: 'loan-types', label: 'Loan Types', icon: CreditCard }] : []),
    { id: 'tier-policies', label: 'Trust Tiers', icon: Star },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <Navbar user={user} />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Lending Preferences</h1>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
                preferences.is_active 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${preferences.is_active ? 'bg-green-500' : 'bg-neutral-400'}`} />
                {preferences.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 rounded-xl flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">Preferences saved successfully!</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          {/* Complete your profile banner - shown when preferences have never been saved */}
          {preferencesExist === false && (
            <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-300 dark:border-primary-700 rounded-xl flex items-start gap-4">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                <Settings className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary-900 dark:text-primary-200 mb-1">
                  👋 Complete your lender profile
                </h3>
                <p className="text-sm text-primary-700 dark:text-primary-300">
                  You haven’t saved your lending preferences yet. Set your capital pool, borrower criteria, and trust tier policies so borrowers can be matched to you.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <div className="md:w-64 flex-shrink-0">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1">
              <form onSubmit={handleSavePreferences} className="space-y-6">
                
                {/* MATCHING TAB */}
                {activeTab === 'matching' && (
                  <div className="space-y-6">
                    <Card>
                      <div className="flex items-center gap-3 mb-6">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Matching Settings</h2>
                      </div>

                      <div className="space-y-4">
                        {/* Active Toggle */}
                        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white">Accept New Loans</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Receive loan requests from borrowers</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreferences(p => ({ ...p, is_active: !p.is_active }))}
                            className={`relative w-14 h-8 rounded-full transition-colors ${
                              preferences.is_active ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'
                            }`}
                          >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                              preferences.is_active ? 'translate-x-7' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>

                        {/* Auto-Accept Toggle */}
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800">
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                              <Zap className="w-4 h-4 text-yellow-500" />
                              Auto-Accept Loans
                            </p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Automatically accept matching loan requests</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreferences(p => ({ ...p, auto_accept: !p.auto_accept }))}
                            className={`relative w-14 h-8 rounded-full transition-colors ${
                              preferences.auto_accept ? 'bg-yellow-500' : 'bg-neutral-300 dark:bg-neutral-600'
                            }`}
                          >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                              preferences.auto_accept ? 'translate-x-7' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>

                        {preferences.auto_accept && (
                          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-start gap-3">
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
                        <Wallet className="w-5 h-5 text-green-500" />
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Capital Pool</h2>
                      </div>

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
                            className="w-full pl-8 pr-4 py-3 border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 rounded-xl focus:ring-2 focus:ring-primary-500 text-lg font-semibold dark:text-white"
                            min="0"
                            step="100"
                          />
                        </div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                          This is the total amount you're willing to lend. The system will only match you with loans you can fund.
                        </p>
                      </div>
                    </Card>

                    {/* Minimum Loan Amount */}
                    <Card>
                      <div className="flex items-center gap-3 mb-4">
                        <DollarSign className="w-5 h-5 text-primary-500" />
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Minimum Loan Amount</h2>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Minimum amount you will lend
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">$</span>
                          <input
                            type="number"
                            value={preferences.min_amount}
                            onChange={(e) => setPreferences(p => ({ ...p, min_amount: parseFloat(e.target.value) || 0 }))}
                            className="w-full pl-8 pr-4 py-2.5 border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500"
                            min="0"
                          />
                        </div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                          Loan requests below this amount will not be matched to you.
                          Maximum amounts are now set per-tier in your Trust Tier policies.
                        </p>
                      </div>
                    </Card>

                    {/* Term Range */}
                    <Card>
                      <div className="flex items-center gap-3 mb-4">
                        <Clock className="w-5 h-5 text-primary-500" />
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
                            onChange={(e) => setPreferences(p => ({ ...p, min_term_weeks: parseFloat(e.target.value) || 1 }))}
                            className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500"
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
                            onChange={(e) => setPreferences(p => ({ ...p, max_term_weeks: parseFloat(e.target.value) || 1 }))}
                            className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500"
                            min="1"
                          />
                        </div>
                      </div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-3">
                        Approximately {Math.floor(preferences.min_term_weeks / 4.33)}–{Math.floor(preferences.max_term_weeks / 4.33)} months
                      </p>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button type="submit" loading={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Preferences
                      </Button>
                    </div>
                  </div>
                )}

                {/* BORROWER CRITERIA TAB */}
                {activeTab === 'borrower-criteria' && (
                  <div className="space-y-6">
                    {/* Borrower Requirements */}
                    <Card>
                      <div className="flex items-center gap-3 mb-6">
                        <Shield className="w-5 h-5 text-orange-500" />
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
                                type="button"
                                onClick={() => setPreferences(p => ({ ...p, min_borrower_rating: rating.value }))}
                                className={`p-3 rounded-xl text-left transition-all ${
                                  preferences.min_borrower_rating === rating.value
                                    ? 'bg-primary-100 dark:bg-primary-900/30 border-2 border-primary-500'
                                    : 'bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                }`}
                              >
                                <p className="font-medium text-neutral-900 dark:text-white">{rating.label}</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">{rating.description}</p>
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
                            type="button"
                            onClick={() => setPreferences(p => ({ ...p, require_verified_borrower: !p.require_verified_borrower }))}
                            className={`relative w-14 h-8 rounded-full transition-colors ${
                              preferences.require_verified_borrower ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'
                            }`}
                          >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                              preferences.require_verified_borrower ? 'translate-x-7' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button type="submit" loading={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Preferences
                      </Button>
                    </div>
                  </div>
                )}

                {/* GEOGRAPHY TAB */}
                {activeTab === 'geography' && (
                  <div className="space-y-6">
                    {/* Countries */}
                    <Card>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <Globe className="w-5 h-5 text-green-500" />
                          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Countries</h2>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={selectAllCountries}>
                            Select All
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={clearCountries}>
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
                            type="button"
                            onClick={() => toggleCountry(country.code)}
                            className={`p-3 rounded-xl text-left transition-all ${
                              preferences.countries.includes(country.code)
                                ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500'
                                : 'bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700'
                            }`}
                          >
                            <p className="font-medium text-sm text-neutral-900 dark:text-white">{country.name}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{country.code}</p>
                          </button>
                        ))}
                      </div>

                      {preferences.countries.length > 0 && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-4 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          {preferences.countries.length} countr{preferences.countries.length !== 1 ? 'ies' : 'y'} selected
                        </p>
                      )}
                    </Card>

                    {/* States */}
                    {preferences.countries.length > 0 && availableStates.length > 0 && (
                      <Card>
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <MapPin className="w-5 h-5 text-blue-500" />
                            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">States / Regions</h2>
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={selectAllStates}>
                              Select All
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={clearStates}>
                              Clear
                            </Button>
                          </div>
                        </div>

                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                          Optionally restrict lending to specific states/regions within selected countries.
                        </p>

                        {loadingStates ? (
                          <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                            Loading states...
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {availableStates.map((state) => (
                                <button
                                  key={`${state.country_code}-${state.code}`}
                                  type="button"
                                  onClick={() => toggleState(state.code)}
                                  className={`p-3 rounded-xl text-left transition-all ${
                                    preferences.states.includes(state.code)
                                      ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                                      : 'bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                  }`}
                                >
                                  <p className="font-medium text-sm text-neutral-900 dark:text-white">{state.name}</p>
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{state.code}</p>
                                </button>
                              ))}
                            </div>

                            {preferences.states.length > 0 && (
                              <p className="text-sm text-blue-600 dark:text-blue-400 mt-4 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                {preferences.states.length} state{preferences.states.length !== 1 ? 's' : ''}/region{preferences.states.length !== 1 ? 's' : ''} selected
                              </p>
                            )}
                          </>
                        )}
                      </Card>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button type="submit" loading={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Preferences
                      </Button>
                    </div>
                  </div>
                )}

                {/* LOAN TYPES TAB */}
                {activeTab === 'loan-types' && isBusinessLender && (
                  <div className="space-y-6">
                    <Card>
                      <div className="flex items-center gap-3 mb-4">
                        <CreditCard className="w-5 h-5 text-green-500" />
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Loan Types You Offer</h2>
                      </div>
                      
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>💡 Why set loan types?</strong> Borrowers can filter by loan type when searching. 
                          You'll only be matched with borrowers requesting loan types you've selected.
                          If you don't select any, you'll be matched with all loan requests.
                        </p>
                      </div>

                      {loadingLoanTypes ? (
                        <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Loading loan types...
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {loanTypes.map((loanType) => (
                              <button
                                key={loanType.id}
                                type="button"
                                onClick={() => toggleLoanType(loanType.id)}
                                className={`p-3 rounded-xl border-2 text-left transition-all ${
                                  selectedLoanTypeIds.includes(loanType.id)
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                    selectedLoanTypeIds.includes(loanType.id)
                                      ? 'bg-green-500 border-green-500'
                                      : 'border-neutral-300 dark:border-neutral-600'
                                  }`}>
                                    {selectedLoanTypeIds.includes(loanType.id) && (
                                      <CheckCircle className="w-3 h-3 text-white" />
                                    )}
                                  </div>
                                  <p className="font-medium text-sm text-neutral-900 dark:text-white">{loanType.name}</p>
                                </div>
                                {loanType.description && (
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 ml-6">{loanType.description}</p>
                                )}
                              </button>
                            ))}
                          </div>

                          {selectedLoanTypeIds.length > 0 && (
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                              <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                <strong>{selectedLoanTypeIds.length} loan type{selectedLoanTypeIds.length !== 1 ? 's' : ''} selected</strong>
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button type="button" onClick={handleSaveLoanTypes} loading={savingLoanTypes}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Loan Types
                      </Button>
                    </div>
                  </div>
                )}

                {/* TRUST TIER POLICIES TAB */}
                {activeTab === 'tier-policies' && (
                  <div className="space-y-6">
                    <TrustTierExplainer defaultExpanded={true} />
                    <Card>
                      <LenderSimplePolicyConfig />
                    </Card>
                  </div>
                )}

                {/* NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <Card>
                      <div className="flex items-center gap-3 mb-6">
                        <Bell className="w-5 h-5 text-orange-500" />
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Notification Preferences</h2>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white">Match Notifications</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Get notified when you're matched with a borrower</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreferences(p => ({ ...p, notify_on_match: !p.notify_on_match }))}
                            className={`relative w-14 h-8 rounded-full transition-colors ${
                              preferences.notify_on_match ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'
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
                            type="button"
                            onClick={() => setPreferences(p => ({ ...p, notify_email: !p.notify_email }))}
                            className={`relative w-14 h-8 rounded-full transition-colors ${
                              preferences.notify_email ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'
                            }`}
                          >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                              preferences.notify_email ? 'translate-x-7' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white">SMS Notifications</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Receive notifications via SMS</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreferences(p => ({ ...p, notify_sms: !p.notify_sms }))}
                            className={`relative w-14 h-8 rounded-full transition-colors ${
                              preferences.notify_sms ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'
                            }`}
                          >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                              preferences.notify_sms ? 'translate-x-7' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button type="submit" loading={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Preferences
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function LenderPreferencesPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    }>
      <LenderPreferencesContent />
    </React.Suspense>
  );
}