'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Input, Select } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, Building2, Percent, CreditCard, Bell, Shield, 
  CheckCircle, AlertCircle, Save, Trash2 
} from 'lucide-react';

export default function BusinessSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state - Business Info
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  
  // Interest rate settings
  const [defaultInterestRate, setDefaultInterestRate] = useState('0');
  const [interestType, setInterestType] = useState('simple');
  const [minLoanAmount, setMinLoanAmount] = useState('');
  const [maxLoanAmount, setMaxLoanAmount] = useState('');

  // Payment methods
  const [paypalEmail, setPaypalEmail] = useState('');
  const [cashappUsername, setCashappUsername] = useState('');
  const [venmoUsername, setVenmoUsername] = useState('');
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<'paypal' | 'cashapp' | 'venmo' | ''>('');
  const [savingPayPal, setSavingPayPal] = useState(false);
  const [savingPaymentMethods, setSavingPaymentMethods] = useState(false);

  const businessTypes = [
    { value: 'microfinance', label: 'Microfinance' },
    { value: 'cooperative', label: 'Cooperative/Savings Group' },
    { value: 'money_lender', label: 'Licensed Money Lender' },
    { value: 'retail', label: 'Retail/Shop' },
    { value: 'service', label: 'Service Provider' },
    { value: 'other', label: 'Other' },
  ];

  const interestTypeOptions = [
    { value: 'simple', label: 'Simple Interest' },
    { value: 'compound', label: 'Compound Interest' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/auth/signin');
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setUser(profile || {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || 'User',
      });

      // Get business profile
      const { data: businessData, error: bizError } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (bizError || !businessData) {
        router.push('/business/setup');
        return;
      }

      setBusiness(businessData);
      
      // Populate form fields
      setBusinessName(businessData.business_name || '');
      setBusinessType(businessData.business_type || '');
      setDescription(businessData.description || '');
      setLocation(businessData.location || '');
      setContactEmail(businessData.contact_email || '');
      setContactPhone(businessData.contact_phone || '');
      setDefaultInterestRate(String(businessData.default_interest_rate || 0));
      setInterestType(businessData.interest_type || 'simple');
      setMinLoanAmount(businessData.min_loan_amount ? String(businessData.min_loan_amount) : '');
      setMaxLoanAmount(businessData.max_loan_amount ? String(businessData.max_loan_amount) : '');
      setPaypalEmail(businessData.paypal_email || '');
      setCashappUsername(businessData.cashapp_username || '');
      setVenmoUsername(businessData.venmo_username || '');
      setPreferredPaymentMethod(businessData.preferred_payment_method || '');

      setLoading(false);
    };

    fetchData();
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('business_profiles')
        .update({
          business_name: businessName,
          business_type: businessType,
          description: description || null,
          location: location || null,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', business.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Business profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInterestSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('business_profiles')
        .update({
          default_interest_rate: parseFloat(defaultInterestRate) || 0,
          interest_type: interestType,
          min_loan_amount: minLoanAmount ? parseFloat(minLoanAmount) : null,
          max_loan_amount: maxLoanAmount ? parseFloat(maxLoanAmount) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', business.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Interest settings updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayPal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paypalEmail || !paypalEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid PayPal email' });
      return;
    }

    setSavingPayPal(true);
    setMessage(null);

    try {
      const supabase = createClient();
      
      // Update business profile
      const { error: bizError } = await supabase
        .from('business_profiles')
        .update({
          paypal_email: paypalEmail,
          paypal_connected: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', business.id);

      if (bizError) throw bizError;

      // Also update user's PayPal if not set
      if (!user?.paypal_email) {
        await supabase
          .from('users')
          .update({
            paypal_email: paypalEmail,
            paypal_connected: true,
            paypal_connected_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }

      setBusiness({ ...business, paypal_email: paypalEmail, paypal_connected: true });
      setMessage({ type: 'success', text: 'PayPal settings updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update PayPal' });
    } finally {
      setSavingPayPal(false);
    }
  };

  const handleSavePaymentMethods = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPaymentMethods(true);
    setMessage(null);

    // Format usernames
    let formattedCashapp = cashappUsername.trim();
    if (formattedCashapp && !formattedCashapp.startsWith('$')) {
      formattedCashapp = '$' + formattedCashapp;
    }

    let formattedVenmo = venmoUsername.trim();
    if (formattedVenmo && !formattedVenmo.startsWith('@')) {
      formattedVenmo = '@' + formattedVenmo;
    }

    // Validate preferred method has the corresponding account set up
    if (preferredPaymentMethod === 'paypal' && !business?.paypal_email && !paypalEmail) {
      setMessage({ type: 'error', text: 'Please set up PayPal first before selecting it as preferred' });
      setSavingPaymentMethods(false);
      return;
    }
    if (preferredPaymentMethod === 'cashapp' && !formattedCashapp) {
      setMessage({ type: 'error', text: 'Please enter your Cash App username first' });
      setSavingPaymentMethods(false);
      return;
    }
    if (preferredPaymentMethod === 'venmo' && !formattedVenmo) {
      setMessage({ type: 'error', text: 'Please enter your Venmo username first' });
      setSavingPaymentMethods(false);
      return;
    }

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('business_profiles')
        .update({
          cashapp_username: formattedCashapp || null,
          venmo_username: formattedVenmo || null,
          preferred_payment_method: preferredPaymentMethod || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', business.id);

      if (error) throw error;

      setCashappUsername(formattedCashapp);
      setVenmoUsername(formattedVenmo);
      setBusiness({ 
        ...business, 
        cashapp_username: formattedCashapp, 
        venmo_username: formattedVenmo,
        preferred_payment_method: preferredPaymentMethod 
      });
      setMessage({ type: 'success', text: 'Payment methods saved!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save payment methods' });
    } finally {
      setSavingPaymentMethods(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Business Info', icon: Building2 },
    { id: 'rates', label: 'Interest Rates', icon: Percent },
    { id: 'payments', label: 'Payments', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Navbar user={user} />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/business"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to business dashboard
          </Link>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-900">Business Settings</h1>
              <p className="text-neutral-500">{business?.business_name}</p>
            </div>
            {business?.is_verified ? (
              <span className="ml-auto px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Verified
              </span>
            ) : (
              <span className="ml-auto px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                Pending Verification
              </span>
            )}
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              {message.text}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar Tabs */}
            <div className="md:w-48 flex-shrink-0">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-neutral-600 hover:bg-neutral-100'
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
              {/* Business Profile Tab */}
              {activeTab === 'profile' && (
                <Card>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary-100 rounded-xl">
                      <Building2 className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-neutral-900">Business Information</h2>
                      <p className="text-sm text-neutral-500">Update your business details</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <Input
                      label="Business Name"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g., ABC Microfinance"
                    />

                    <Select
                      label="Business Type"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      options={businessTypes}
                    />

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell borrowers about your business..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-neutral-400"
                      />
                    </div>

                    <Input
                      label="Location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Lagos, Nigeria"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Contact Email"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                      />
                      <Input
                        label="Contact Phone"
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" loading={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Interest Rates Tab */}
              {activeTab === 'rates' && (
                <Card>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <Percent className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-neutral-900">Interest Rate Settings</h2>
                      <p className="text-sm text-neutral-500">Configure your default lending rates</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveInterestSettings} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Default Interest Rate (%)"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={defaultInterestRate}
                        onChange={(e) => setDefaultInterestRate(e.target.value)}
                        helperText="Annual percentage rate (APR)"
                      />
                      <Select
                        label="Interest Type"
                        value={interestType}
                        onChange={(e) => setInterestType(e.target.value)}
                        options={interestTypeOptions}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Minimum Loan Amount"
                        type="number"
                        min="0"
                        value={minLoanAmount}
                        onChange={(e) => setMinLoanAmount(e.target.value)}
                        placeholder="e.g., 100"
                      />
                      <Input
                        label="Maximum Loan Amount"
                        type="number"
                        min="0"
                        value={maxLoanAmount}
                        onChange={(e) => setMaxLoanAmount(e.target.value)}
                        placeholder="e.g., 10000"
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> These rates will be applied to all new loan requests. 
                        Existing loans will keep their original terms.
                      </p>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" loading={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className="space-y-6">
                  <Card>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-neutral-900">PayPal Settings</h2>
                        <p className="text-sm text-neutral-500">Manage your payment account</p>
                      </div>
                    </div>

                    {business?.paypal_connected ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                          <div className="flex-1">
                            <p className="font-medium text-green-800">PayPal Connected</p>
                            <p className="text-sm text-green-700">{business.paypal_email}</p>
                          </div>
                        </div>

                        <form onSubmit={handleSavePayPal} className="space-y-4">
                          <Input
                            label="Update PayPal Email"
                            type="email"
                            value={paypalEmail}
                            onChange={(e) => setPaypalEmail(e.target.value)}
                            placeholder="your@paypal.com"
                          />
                          <div className="flex justify-end">
                            <Button type="submit" loading={savingPayPal}>
                              Update PayPal
                            </Button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <form onSubmit={handleSavePayPal} className="space-y-4">
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-yellow-800">PayPal Required</p>
                              <p className="text-sm text-yellow-700">
                                Connect PayPal to receive loan repayments from borrowers.
                              </p>
                            </div>
                          </div>
                        </div>

                        <Input
                          label="PayPal Email Address"
                          type="email"
                          value={paypalEmail}
                          onChange={(e) => setPaypalEmail(e.target.value)}
                          placeholder="your@paypal.com"
                        />

                        <div className="flex justify-end">
                          <Button type="submit" loading={savingPayPal}>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Connect PayPal
                          </Button>
                        </div>
                      </form>
                    )}
                  </Card>

                  {/* Cash App & Venmo + Preferred Method */}
                  <Card>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <CreditCard className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-neutral-900">Payment Methods</h2>
                        <p className="text-sm text-neutral-500">Set up how borrowers can pay you</p>
                      </div>
                    </div>

                    <form onSubmit={handleSavePaymentMethods} className="space-y-6">
                      {/* Payment Method Inputs */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Cash App Username
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-medium">$</span>
                            <input
                              type="text"
                              value={cashappUsername.replace('$', '')}
                              onChange={(e) => setCashappUsername(e.target.value.replace('$', ''))}
                              placeholder="yourbusiness"
                              className="w-full pl-8 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Venmo Username
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 font-medium">@</span>
                            <input
                              type="text"
                              value={venmoUsername.replace('@', '')}
                              onChange={(e) => setVenmoUsername(e.target.value.replace('@', ''))}
                              placeholder="yourbusiness"
                              className="w-full pl-8 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Preferred Payment Method Selector */}
                      <div className="border-t border-neutral-200 pt-6">
                        <label className="block text-sm font-medium text-neutral-700 mb-3">
                          Preferred Payment Method ⭐
                        </label>
                        <p className="text-sm text-neutral-500 mb-4">
                          This is what borrowers will see when making repayments
                        </p>
                        
                        <div className="grid grid-cols-3 gap-3">
                          {/* PayPal Option */}
                          <button
                            type="button"
                            onClick={() => setPreferredPaymentMethod('paypal')}
                            disabled={!business?.paypal_email && !paypalEmail}
                            className={`p-4 rounded-xl border-2 text-center transition-all ${
                              preferredPaymentMethod === 'paypal'
                                ? 'border-[#0070ba] bg-[#0070ba]/10 ring-2 ring-[#0070ba]/30'
                                : !business?.paypal_email && !paypalEmail
                                ? 'border-neutral-200 bg-neutral-50 opacity-50 cursor-not-allowed'
                                : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                          >
                            <div className="w-10 h-10 bg-[#0070ba] rounded-lg mx-auto mb-2 flex items-center justify-center">
                              <CreditCard className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-sm font-medium block">PayPal</span>
                            {(business?.paypal_email || paypalEmail) ? (
                              <span className="text-xs text-neutral-500 block mt-1 truncate">{business?.paypal_email || paypalEmail}</span>
                            ) : (
                              <span className="text-xs text-red-500 block mt-1">Not set up</span>
                            )}
                            {preferredPaymentMethod === 'paypal' && (
                              <span className="inline-block mt-2 text-xs bg-[#0070ba] text-white px-2 py-0.5 rounded-full">⭐ Preferred</span>
                            )}
                          </button>

                          {/* Cash App Option */}
                          <button
                            type="button"
                            onClick={() => setPreferredPaymentMethod('cashapp')}
                            disabled={!cashappUsername && !business?.cashapp_username}
                            className={`p-4 rounded-xl border-2 text-center transition-all ${
                              preferredPaymentMethod === 'cashapp'
                                ? 'border-[#00D632] bg-[#00D632]/10 ring-2 ring-[#00D632]/30'
                                : !cashappUsername && !business?.cashapp_username
                                ? 'border-neutral-200 bg-neutral-50 opacity-50 cursor-not-allowed'
                                : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                          >
                            <div className="w-10 h-10 bg-[#00D632] rounded-lg mx-auto mb-2 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">$</span>
                            </div>
                            <span className="text-sm font-medium block">Cash App</span>
                            {(cashappUsername || business?.cashapp_username) ? (
                              <span className="text-xs text-neutral-500 block mt-1 truncate">{(cashappUsername || business?.cashapp_username || '').replace(/^\$?/, '$')}</span>
                            ) : (
                              <span className="text-xs text-red-500 block mt-1">Not set up</span>
                            )}
                            {preferredPaymentMethod === 'cashapp' && (
                              <span className="inline-block mt-2 text-xs bg-[#00D632] text-white px-2 py-0.5 rounded-full">⭐ Preferred</span>
                            )}
                          </button>

                          {/* Venmo Option */}
                          <button
                            type="button"
                            onClick={() => setPreferredPaymentMethod('venmo')}
                            disabled={!venmoUsername && !business?.venmo_username}
                            className={`p-4 rounded-xl border-2 text-center transition-all ${
                              preferredPaymentMethod === 'venmo'
                                ? 'border-[#3D95CE] bg-[#3D95CE]/10 ring-2 ring-[#3D95CE]/30'
                                : !venmoUsername && !business?.venmo_username
                                ? 'border-neutral-200 bg-neutral-50 opacity-50 cursor-not-allowed'
                                : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                          >
                            <div className="w-10 h-10 bg-[#3D95CE] rounded-lg mx-auto mb-2 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">V</span>
                            </div>
                            <span className="text-sm font-medium block">Venmo</span>
                            {(venmoUsername || business?.venmo_username) ? (
                              <span className="text-xs text-neutral-500 block mt-1 truncate">{(venmoUsername || business?.venmo_username || '').replace(/^@?/, '@')}</span>
                            ) : (
                              <span className="text-xs text-red-500 block mt-1">Not set up</span>
                            )}
                            {preferredPaymentMethod === 'venmo' && (
                              <span className="inline-block mt-2 text-xs bg-[#3D95CE] text-white px-2 py-0.5 rounded-full">⭐ Preferred</span>
                            )}
                          </button>
                        </div>

                        {!preferredPaymentMethod && (business?.paypal_email || paypalEmail || cashappUsername || venmoUsername) && (
                          <p className="text-sm text-amber-600 mt-3">
                            ⚠️ Please select a preferred payment method so borrowers know how to pay you
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" loading={savingPaymentMethods}>
                          Save Payment Methods
                        </Button>
                      </div>
                    </form>
                  </Card>

                  <Card>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-neutral-100 rounded-xl">
                        <Bell className="w-5 h-5 text-neutral-600" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-neutral-900">Payment Notifications</h2>
                        <p className="text-sm text-neutral-500">Get notified about loan activities</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl cursor-pointer">
                        <span className="text-neutral-700">Email for new loan requests</span>
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        />
                      </label>
                      <label className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl cursor-pointer">
                        <span className="text-neutral-700">Email for payment received</span>
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        />
                      </label>
                      <label className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl cursor-pointer">
                        <span className="text-neutral-700">Email for overdue payments</span>
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        />
                      </label>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
