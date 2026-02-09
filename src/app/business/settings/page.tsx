'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Input, Select } from '@/components/ui';
import { PlaidLinkButton, ConnectedBank } from '@/components/payments/PlaidLink';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, Building2, Percent, CreditCard, Bell, Shield, 
  CheckCircle, AlertCircle, Save, Trash2, Upload, Image as ImageIcon,
  Eye, EyeOff, Pause, Play, Globe, MapPin, Users, DollarSign,
  Link2, Copy, ExternalLink, Landmark, Loader2, Building, Wallet, Zap
} from 'lucide-react';

const US_STATES = [
  { value: '', label: 'Select state' },
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' }, { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' }, { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' }, { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' }, { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' }, { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' }, { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' }, { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

const BUSINESS_TYPES = [
  { value: 'microfinance', label: 'Microfinance Institution' },
  { value: 'credit_union', label: 'Credit Union' },
  { value: 'community_lender', label: 'CDFI' },
  { value: 'fintech', label: 'FinTech / Online Lender' },
  { value: 'peer_lending', label: 'Peer-to-Peer Platform' },
  { value: 'payday_lender', label: 'Licensed Lender' },
  { value: 'investment_club', label: 'Investment Club' },
  { value: 'other', label: 'Other' },
];

const ENTITY_TYPES = [
  { value: 'sole_proprietor', label: 'Sole Proprietorship' },
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'non_profit', label: 'Non-Profit' },
  { value: 'other', label: 'Other' },
];

const EMPLOYEE_RANGES = [
  { value: '1', label: 'Just me (1)' },
  { value: '2-5', label: '2-5 employees' },
  { value: '6-10', label: '6-10 employees' },
  { value: '11-25', label: '11-25 employees' },
  { value: '26-50', label: '26-50 employees' },
  { value: '51-100', label: '51-100 employees' },
  { value: '100+', label: '100+ employees' },
];

const REVENUE_RANGES = [
  { value: 'under_50k', label: 'Under $50,000' },
  { value: '50k_100k', label: '$50,000 - $100,000' },
  { value: '100k_250k', label: '$100,000 - $250,000' },
  { value: '250k_500k', label: '$250,000 - $500,000' },
  { value: '500k_1m', label: '$500,000 - $1M' },
  { value: '1m_5m', label: '$1M - $5M' },
  { value: '5m_plus', label: '$5M+' },
];

// Force dynamic rendering due to useSearchParams
export const dynamic = 'force-dynamic';

function BusinessSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync activeTab with URL param
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'lending', 'payments', 'visibility', 'account'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Profile form state
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessEntityType, setBusinessEntityType] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [state, setState] = useState('');
  const [einTaxId, setEinTaxId] = useState('');
  const [yearsInBusiness, setYearsInBusiness] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [numberOfEmployees, setNumberOfEmployees] = useState('');
  const [annualRevenueRange, setAnnualRevenueRange] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  
  // Logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Lending settings
  const [defaultInterestRate, setDefaultInterestRate] = useState('0');
  const [interestType, setInterestType] = useState('simple');
  const [minLoanAmount, setMinLoanAmount] = useState('');
  const [maxLoanAmount, setMaxLoanAmount] = useState('');
  const [firstTimeBorrowerAmount, setFirstTimeBorrowerAmount] = useState('50');
  const [capitalPool, setCapitalPool] = useState('10000'); // Available capital for auto-matching
  const [autoMatchEnabled, setAutoMatchEnabled] = useState(false);

  // Payment methods (for manual payments when Dwolla is disabled)
  const [paypalEmail, setPaypalEmail] = useState('');
  const [cashappUsername, setCashappUsername] = useState('');
  const [venmoUsername, setVenmoUsername] = useState('');
  const [zelleEmail, setZelleEmail] = useState('');
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState('');
  const [savingPaymentMethods, setSavingPaymentMethods] = useState(false);

  // Public profile
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(false);
  const [copied, setCopied] = useState(false);

  // Account actions
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [suspendingAccount, setSuspendingAccount] = useState(false);

  // Bank connection
  const [disconnectingBank, setDisconnectingBank] = useState(false);

  // Payment providers (controlled by admin)
  const [isDwollaEnabled, setIsDwollaEnabled] = useState(false);
  const [loadingPaymentProviders, setLoadingPaymentProviders] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
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

      setUser(profile || { id: authUser.id, email: authUser.email });

      const { data: businessData } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (!businessData) {
        router.push('/business/setup');
        return;
      }

      setBusiness(businessData);
      
      // Fetch lender preferences for auto-matching settings
      const { data: lenderPrefs } = await supabase
        .from('lender_preferences')
        .select('capital_pool, is_active')
        .eq('business_id', businessData.id)
        .single();
      
      if (lenderPrefs) {
        setCapitalPool(lenderPrefs.capital_pool?.toString() || '10000');
        setAutoMatchEnabled(lenderPrefs.is_active || false);
      }
      
      // Populate form
      setBusinessName(businessData.business_name || '');
      setBusinessType(businessData.business_type || '');
      setBusinessEntityType(businessData.business_entity_type || '');
      setTagline(businessData.tagline || '');
      setDescription(businessData.description || '');
      setState(businessData.state || '');
      setEinTaxId(businessData.ein_tax_id || '');
      setYearsInBusiness(businessData.years_in_business?.toString() || '');
      setWebsiteUrl(businessData.website_url || '');
      setNumberOfEmployees(businessData.number_of_employees || '');
      setAnnualRevenueRange(businessData.annual_revenue_range || '');
      setContactEmail(businessData.contact_email || '');
      setContactPhone(businessData.contact_phone || '');
      setDefaultInterestRate(businessData.default_interest_rate?.toString() || '0');
      setInterestType(businessData.interest_type || 'simple');
      setMinLoanAmount(businessData.min_loan_amount?.toString() || '');
      setMaxLoanAmount(businessData.max_loan_amount?.toString() || '');
      setFirstTimeBorrowerAmount(businessData.first_time_borrower_amount?.toString() || '50');
      setPublicProfileEnabled(businessData.public_profile_enabled || false);
      // Payment methods
      setPaypalEmail(businessData.paypal_email || '');
      setCashappUsername(businessData.cashapp_username || '');
      setVenmoUsername(businessData.venmo_username || '');
      setZelleEmail(businessData.zelle_email || '');
      setPreferredPaymentMethod(businessData.preferred_payment_method || '');
      if (businessData.logo_url) {
        setLogoPreview(businessData.logo_url);
      }

      setLoading(false);
    };

    fetchData();
  }, [router]);

  // Check if Dwolla (ACH bank transfers) is enabled by admin
  useEffect(() => {
    const checkPaymentProviders = async () => {
      try {
        const supabase = createClient();
        const { data: providers } = await supabase
          .from('payment_providers')
          .select('slug')
          .eq('is_enabled', true);
        
        const dwollaEnabled = (providers || []).some(p => p.slug === 'dwolla');
        setIsDwollaEnabled(dwollaEnabled);
      } catch (err) {
        console.error('Failed to check payment providers:', err);
      } finally {
        setLoadingPaymentProviders(false);
      }
    };

    checkPaymentProviders();

    // Subscribe to real-time changes
    const supabase = createClient();
    const channel = supabase
      .channel('business_settings_payment_providers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_providers' },
        () => {
          checkPaymentProviders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Save payment methods
  const handleSavePaymentMethods = async () => {
    setSavingPaymentMethods(true);
    setMessage(null);
    
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('business_profiles')
        .update({
          paypal_email: paypalEmail || null,
          cashapp_username: cashappUsername || null,
          venmo_username: venmoUsername || null,
          zelle_email: zelleEmail || null,
          preferred_payment_method: preferredPaymentMethod || null,
        })
        .eq('id', business.id);
      
      if (error) throw error;
      setMessage({ type: 'success', text: 'Payment methods saved successfully!' });
    } catch (err: any) {
      console.error('Error saving payment methods:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save payment methods' });
    } finally {
      setSavingPaymentMethods(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Logo must be less than 2MB' });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return business?.logo_url || null;
    
    setUploadingLogo(true);
    const supabase = createClient();
    
    const fileExt = logoFile.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;
    
    console.log('Uploading logo to:', filePath);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('business-assets')
      .upload(filePath, logoFile, { upsert: true });
    
    setUploadingLogo(false);
    
    if (uploadError) {
      console.error('Logo upload error:', uploadError);
      console.error('Error details:', JSON.stringify(uploadError, null, 2));
      setMessage({ type: 'error', text: 'Logo upload failed: ' + uploadError.message });
      return business?.logo_url || null;
    }
    
    console.log('Upload successful:', uploadData);
    
    const { data: urlData } = supabase.storage
      .from('business-assets')
      .getPublicUrl(filePath);
    
    console.log('Logo URL:', urlData.publicUrl);
    return urlData.publicUrl;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const logoUrl = await uploadLogo();
      
      const { error } = await supabase
        .from('business_profiles')
        .update({
          business_name: businessName,
          business_type: businessType,
          business_entity_type: businessEntityType || null,
          tagline: tagline || null,
          description: description || null,
          state: state || null,
          location: state ? `United States - ${US_STATES.find(s => s.value === state)?.label || state}` : null,
          ein_tax_id: einTaxId || null,
          years_in_business: yearsInBusiness ? parseInt(yearsInBusiness) : null,
          website_url: websiteUrl || null,
          number_of_employees: numberOfEmployees || null,
          annual_revenue_range: annualRevenueRange || null,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', business.id);

      if (error) throw error;
      
      setBusiness({ ...business, logo_url: logoUrl });
      setLogoFile(null);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLending = async (e: React.FormEvent) => {
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
          first_time_borrower_amount: firstTimeBorrowerAmount ? parseFloat(firstTimeBorrowerAmount) : 50,
          updated_at: new Date().toISOString(),
        })
        .eq('id', business.id);

      if (error) throw error;

      // Also update lender_preferences with capital pool and auto-match settings
      await supabase
        .from('lender_preferences')
        .update({
          interest_rate: parseFloat(defaultInterestRate) || 0,
          interest_type: interestType,
          min_amount: minLoanAmount ? parseFloat(minLoanAmount) : null,
          max_amount: maxLoanAmount ? parseFloat(maxLoanAmount) : null,
          first_time_borrower_limit: firstTimeBorrowerAmount ? parseFloat(firstTimeBorrowerAmount) : 50,
          capital_pool: capitalPool ? parseFloat(capitalPool) : 10000,
          is_active: autoMatchEnabled,
        })
        .eq('business_id', business.id);

      setMessage({ type: 'success', text: 'Lending settings updated!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublicProfile = async () => {
    const supabase = createClient();
    const newValue = !publicProfileEnabled;
    
    const { error } = await supabase
      .from('business_profiles')
      .update({ public_profile_enabled: newValue })
      .eq('id', business.id);
    
    if (!error) {
      setPublicProfileEnabled(newValue);
      setMessage({ type: 'success', text: newValue ? 'Public profile enabled!' : 'Public profile disabled' });
    }
  };

  const handleSuspendAccount = async () => {
    setSuspendingAccount(true);
    const supabase = createClient();
    
    const { error } = await supabase
      .from('lender_preferences')
      .update({ is_active: false })
      .eq('business_id', business.id);
    
    if (!error) {
      setShowSuspendModal(false);
      setMessage({ type: 'success', text: 'Account suspended. You will no longer receive loan requests.' });
    } else {
      setMessage({ type: 'error', text: 'Failed to suspend account' });
    }
    setSuspendingAccount(false);
  };

  const handleReactivateAccount = async () => {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('lender_preferences')
      .update({ is_active: true })
      .eq('business_id', business.id);
    
    if (!error) {
      setMessage({ type: 'success', text: 'Account reactivated! You will now receive loan requests.' });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== business.business_name) {
      setMessage({ type: 'error', text: 'Please type your business name exactly to confirm deletion' });
      return;
    }

    setDeletingAccount(true);
    
    try {
      const supabase = createClient();
      
      // Verify password by attempting to sign in
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });
      
      if (authError) {
        setMessage({ type: 'error', text: 'Incorrect password. Please try again.' });
        setDeletingAccount(false);
        return;
      }

      // Delete lender preferences
      await supabase
        .from('lender_preferences')
        .delete()
        .eq('business_id', business.id);

      // Delete business profile
      const { error: deleteError } = await supabase
        .from('business_profiles')
        .delete()
        .eq('id', business.id);

      if (deleteError) throw deleteError;

      // Update user type back to individual
      await supabase
        .from('users')
        .update({ user_type: 'individual' })
        .eq('id', user.id);

      router.push('/dashboard?deleted=business');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete account' });
    } finally {
      setDeletingAccount(false);
    }
  };

  const copyProfileLink = () => {
    const link = `${window.location.origin}/lend/${business.slug}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Bank connection handlers
  const handleBankConnected = (data: any) => {
    // Update local user state
    setUser({
      ...user,
      bank_connected: true,
      bank_name: data.bank_name,
      bank_account_mask: data.account_mask,
      bank_account_type: data.account_type,
    });
    setMessage({ type: 'success', text: 'Bank account connected successfully!' });
  };

  const handleDisconnectBank = async () => {
    if (!confirm('Are you sure you want to disconnect your bank account?')) return;

    setDisconnectingBank(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('users')
        .update({
          plaid_access_token: null,
          plaid_item_id: null,
          plaid_account_id: null,
          dwolla_funding_source_url: null,
          dwolla_funding_source_id: null,
          bank_name: null,
          bank_account_mask: null,
          bank_account_type: null,
          bank_connected: false,
          bank_connected_at: null,
        })
        .eq('id', user.id);

      if (!error) {
        setUser({
          ...user,
          bank_connected: false,
          bank_name: null,
          bank_account_mask: null,
        });
        setMessage({ type: 'success', text: 'Bank account disconnected' });
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect bank account' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to disconnect bank account' });
    } finally {
      setDisconnectingBank(false);
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
    { id: 'profile', label: 'Business Profile', icon: Building2 },
    { id: 'lending', label: 'Lending Settings', icon: Percent },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'visibility', label: 'Public Profile', icon: Globe },
    { id: 'account', label: 'Account', icon: Shield },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <Navbar user={user} />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/business" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Business Dashboard
          </Link>

          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Business Settings</h1>

          {message && (
            <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
              message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              )}
              <span className={message.type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>{message.text}</span>
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
            <div className="flex-1 min-w-0">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfile}>
                  <Card>
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Business Profile</h2>
                    
                    {/* Logo */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Business Logo</label>
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-24 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-600 flex items-center justify-center overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-10 h-10 text-neutral-400" />
                          )}
                        </div>
                        <div>
                          <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" id="logo-upload" />
                          <label htmlFor="logo-upload" className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 text-sm font-medium">
                            <Upload className="w-4 h-4" />
                            {logoPreview ? 'Change Logo' : 'Upload Logo'}
                          </label>
                          {logoFile && <p className="text-xs text-green-600 mt-1">New logo selected</p>}
                          <p className="text-xs text-neutral-500 mt-1">PNG, JPG up to 2MB</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <Input label="Business Name *" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                      <Input label="Tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Short description" />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <Select label="Business Type" value={businessType} onChange={(e) => setBusinessType(e.target.value)} options={BUSINESS_TYPES} />
                      <Select label="Entity Type" value={businessEntityType} onChange={(e) => setBusinessEntityType(e.target.value)} options={ENTITY_TYPES} />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Description</label>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="Tell borrowers about your services..." />
                    </div>

                    <h3 className="font-medium text-neutral-900 dark:text-white mb-4 mt-6">Business Details</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <Select label="State" value={state} onChange={(e) => setState(e.target.value)} options={US_STATES} />
                      <Input label="EIN / Tax ID" value={einTaxId} onChange={(e) => setEinTaxId(e.target.value)} placeholder="XX-XXXXXXX" />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <Input label="Years in Business" type="number" min="0" value={yearsInBusiness} onChange={(e) => setYearsInBusiness(e.target.value)} />
                      <Input label="Website" type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://" />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <Select label="Employees" value={numberOfEmployees} onChange={(e) => setNumberOfEmployees(e.target.value)} options={[{ value: '', label: 'Select' }, ...EMPLOYEE_RANGES]} />
                      <Select label="Annual Revenue" value={annualRevenueRange} onChange={(e) => setAnnualRevenueRange(e.target.value)} options={[{ value: '', label: 'Select' }, ...REVENUE_RANGES]} />
                    </div>

                    <h3 className="font-medium text-neutral-900 dark:text-white mb-4 mt-6">Contact Information</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <Input label="Contact Email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                      <Input label="Contact Phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" loading={saving || uploadingLogo}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </Card>
                </form>
              )}

              {/* Lending Tab */}
              {activeTab === 'lending' && (
                <form onSubmit={handleSaveLending}>
                  <Card>
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Lending Settings</h2>
                    
                    {/* Auto-Match Settings */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                            <Zap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white">Auto-Match Borrowers</h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Automatically receive matching loan requests</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAutoMatchEnabled(!autoMatchEnabled)}
                          className={`relative w-14 h-8 rounded-full transition-colors ${autoMatchEnabled ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${autoMatchEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      
                      {autoMatchEnabled && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                            Available Capital Pool ($)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            value={capitalPool}
                            onChange={(e) => setCapitalPool(e.target.value)}
                            helperText="Maximum total amount you're willing to have out in active loans. The matching system will only send you loans up to this limit."
                          />
                        </div>
                      )}
                      
                      {!autoMatchEnabled && (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                          Enable auto-matching to automatically receive loan requests that match your criteria. You can also receive direct applications via your public profile link.
                        </p>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <Input label="Default Interest Rate (%)" type="number" step="0.01" min="0" max="100" value={defaultInterestRate} onChange={(e) => setDefaultInterestRate(e.target.value)} helperText="Annual percentage rate" />
                      <Select label="Interest Type" value={interestType} onChange={(e) => setInterestType(e.target.value)} options={[{ value: 'simple', label: 'Simple Interest' }, { value: 'compound', label: 'Compound Interest' }]} />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <Input label="Minimum Loan ($)" type="number" min="1" value={minLoanAmount} onChange={(e) => setMinLoanAmount(e.target.value)} />
                      <Input label="Maximum Loan ($)" type="number" min="1" value={maxLoanAmount} onChange={(e) => setMaxLoanAmount(e.target.value)} />
                    </div>

                    {/* Graduated Trust System */}
                    <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6 mt-6">
                      <h3 className="font-semibold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary-500" />
                        First-Time Borrower Limits
                      </h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                        New borrowers must complete 3 loans at this amount before they can borrow larger amounts from you.
                      </p>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <Input 
                          label="First-Time Borrower Amount ($)" 
                          type="number" 
                          min="1" 
                          value={firstTimeBorrowerAmount} 
                          onChange={(e) => setFirstTimeBorrowerAmount(e.target.value)}
                          helperText="Maximum amount for new borrowers"
                        />
                        <div className="flex items-end pb-6">
                          <div className="text-sm text-neutral-600 dark:text-neutral-400">
                            <p className="font-medium">After 3 successful loans:</p>
                            <p>Unlocks up to ${maxLoanAmount || '5000'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                        <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2">How it works:</h4>
                        <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                          <li>• New borrowers can only borrow up to ${firstTimeBorrowerAmount || '50'}</li>
                          <li>• After completing 3 loans at this amount, they "graduate"</li>
                          <li>• Graduated borrowers can borrow up to your maximum (${maxLoanAmount || '5000'})</li>
                          <li>• If a borrower defaults, their trust resets</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" loading={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Settings
                      </Button>
                    </div>
                  </Card>
                </form>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className="space-y-6">
                  {loadingPaymentProviders ? (
                    <Card className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    </Card>
                  ) : isDwollaEnabled ? (
                    <>
                      {/* Bank Connection Card - Only when Dwolla is enabled */}
                      <Card>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                            <Building className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Bank Account</h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Connect your bank to send and receive payments</p>
                          </div>
                        </div>

                        {user?.bank_connected ? (
                          <ConnectedBank
                            bankName={user.bank_name}
                            accountMask={user.bank_account_mask}
                            accountType={user.bank_account_type}
                            onDisconnect={handleDisconnectBank}
                          />
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                              <Building className="w-8 h-8 text-neutral-400" />
                            </div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">No Bank Connected</h3>
                            <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
                              Connect your bank account to receive loan funds and make repayments securely.
                            </p>
                            <PlaidLinkButton
                              onSuccess={handleBankConnected}
                              onError={(err) => setMessage({ type: 'error', text: err })}
                              buttonText="Connect Bank Account"
                            />
                          </div>
                        )}
                      </Card>

                      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-3">
                          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-800 dark:text-blue-300">Secure & Protected</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                              We use Plaid to securely connect to your bank. We never store your bank login credentials. 
                              All transfers are processed through Dwolla, a licensed money transmitter.
                            </p>
                          </div>
                        </div>
                      </Card>
                    </>
                  ) : (
                    <>
                      {/* Manual Payment Methods - When Dwolla is disabled */}
                      <Card>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Payment Methods</h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                              Payments are handled manually via Cash App, Venmo, Zelle, or PayPal
                            </p>
                          </div>
                        </div>

                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
                          <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-green-800 dark:text-green-300">No Bank Connection Required</h4>
                              <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                                Add your payment usernames below so borrowers know where to send payments.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Payment Method Inputs */}
                        <div className="space-y-4 mb-6">
                          <h3 className="font-medium text-neutral-900 dark:text-white">Your Payment Methods</h3>
                          
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                PayPal Email
                              </label>
                              <Input 
                                type="email"
                                placeholder="your@email.com"
                                value={paypalEmail}
                                onChange={(e) => setPaypalEmail(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                Cash App Username
                              </label>
                              <Input 
                                placeholder="$YourCashtag"
                                value={cashappUsername}
                                onChange={(e) => setCashappUsername(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                Venmo Username
                              </label>
                              <Input 
                                placeholder="@YourVenmo"
                                value={venmoUsername}
                                onChange={(e) => setVenmoUsername(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                Zelle Email/Phone
                              </label>
                              <Input 
                                placeholder="email@example.com or phone"
                                value={zelleEmail}
                                onChange={(e) => setZelleEmail(e.target.value)}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                              Preferred Payment Method
                            </label>
                            <Select 
                              value={preferredPaymentMethod}
                              onChange={(e) => setPreferredPaymentMethod(e.target.value)}
                              options={[
                                { value: '', label: 'Select preferred method' },
                                { value: 'paypal', label: 'PayPal' },
                                { value: 'cashapp', label: 'Cash App' },
                                { value: 'venmo', label: 'Venmo' },
                                { value: 'zelle', label: 'Zelle' },
                              ]}
                            />
                          </div>

                          <div className="flex justify-end">
                            <Button onClick={handleSavePaymentMethods} loading={savingPaymentMethods}>
                              <Save className="w-4 h-4 mr-2" />
                              Save Payment Methods
                            </Button>
                          </div>
                        </div>

                        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6">
                          <h3 className="font-medium text-neutral-900 dark:text-white mb-4">How Manual Payments Work:</h3>
                          <div className="grid gap-3">
                            <div className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">1</span>
                              </div>
                              <div>
                                <p className="font-medium text-neutral-900 dark:text-white">Borrower sends payment</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">When a payment is due, the borrower sends money to your preferred method</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">2</span>
                              </div>
                              <div>
                                <p className="font-medium text-neutral-900 dark:text-white">You confirm receipt</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Once received, you mark the payment as completed in the loan details</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">3</span>
                              </div>
                              <div>
                                <p className="font-medium text-neutral-900 dark:text-white">Loan updates automatically</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">The system tracks all payments and updates the borrower's trust score</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </>
                  )}
                </div>
              )}

              {/* Public Profile Tab */}
              {activeTab === 'visibility' && (
                <Card>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Public Profile</h2>
                  
                  <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl mb-6">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">Enable Public Profile</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Allow borrowers to find you via a shareable link</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleTogglePublicProfile}
                      className={`relative w-14 h-8 rounded-full transition-colors ${publicProfileEnabled ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${publicProfileEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {business.slug && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Your Profile Link</label>
                      <div className="flex items-center gap-2 p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                        <Link2 className="w-4 h-4 text-neutral-400" />
                        <code className="text-sm text-neutral-600 dark:text-neutral-300 flex-1 truncate">
                          {typeof window !== 'undefined' ? `${window.location.origin}/lend/${business.slug}` : `/lend/${business.slug}`}
                        </code>
                        <Button variant="outline" size="sm" onClick={copyProfileLink}>
                          {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <a href={`/lend/${business.slug}`} target="_blank" rel="noopener noreferrer">
                          <Button size="sm"><ExternalLink className="w-4 h-4" /></Button>
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      <strong>Tip:</strong> Share your profile link on social media, your website, or with potential borrowers to receive direct loan requests.
                    </p>
                  </div>
                </Card>
              )}

              {/* Account Tab */}
              {activeTab === 'account' && (
                <div className="space-y-6">
                  {/* Suspend Account */}
                  <Card>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Pause className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-neutral-900 dark:text-white">Suspend Account</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                          Temporarily stop receiving new loan requests. Your existing loans will continue as normal.
                        </p>
                        <Button variant="outline" onClick={() => setShowSuspendModal(true)}>
                          <Pause className="w-4 h-4 mr-2" />
                          Suspend Lending
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Delete Account */}
                  <Card className="border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-red-800 dark:text-red-300">Delete Business Account</h3>
                        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                          Permanently delete your business profile. This action cannot be undone. You will revert to a personal account.
                        </p>
                        <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20" onClick={() => setShowDeleteModal(true)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Business Account
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Suspend Account?</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Your business will stop receiving new loan requests. Existing loans will continue normally. You can reactivate anytime.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowSuspendModal(false)}>Cancel</Button>
              <Button className="bg-yellow-500 hover:bg-yellow-600" loading={suspendingAccount} onClick={handleSuspendAccount}>
                <Pause className="w-4 h-4 mr-2" />
                Suspend
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-4">Delete Business Account</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              This will permanently delete your business profile. This cannot be undone.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Enter your password
                </label>
                <Input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Your account password" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Type <strong className="text-red-600">{business.business_name}</strong> to confirm
                </label>
                <Input value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder={business.business_name} />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button variant="outline" onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteConfirmation(''); }}>
                Cancel
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-700" 
                loading={deletingAccount} 
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== business.business_name || !deletePassword}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Forever
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Footer />
    </div>
  );
}

// Wrapper component with Suspense for useSearchParams
export default function BusinessSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    }>
      <BusinessSettingsContent />
    </Suspense>
  );
}
