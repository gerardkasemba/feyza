'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Input, Select, InterestCalculatorModal } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { PlaidLinkButton, ConnectedBank } from '@/components/payments/PlaidLink';
import { 
  ArrowLeft, Building2, Percent, Building, FileText, 
  CheckCircle, ChevronRight, ChevronLeft, AlertCircle,
  MapPin, Globe, Users, DollarSign, Calendar, Shield,
  Upload, Image as ImageIcon, X, Calculator, Wallet
} from 'lucide-react';
import { FaHospital, FaGraduationCap, FaBriefcase, FaHome, FaFileAlt, FaCar } from 'react-icons/fa';

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

const BUSINESS_ENTITY_TYPES = [
  { value: '', label: 'Select entity type' },
  { value: 'sole_proprietor', label: 'Sole Proprietorship' },
  { value: 'llc', label: 'LLC (Limited Liability Company)' },
  { value: 'corporation', label: 'Corporation (C-Corp or S-Corp)' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'non_profit', label: 'Non-Profit Organization' },
  { value: 'other', label: 'Other' },
];

const BUSINESS_TYPES = [
  { value: '', label: 'Select business type' },
  { value: 'microfinance', label: 'Microfinance Institution' },
  { value: 'credit_union', label: 'Credit Union' },
  { value: 'community_lender', label: 'Community Development Financial Institution (CDFI)' },
  { value: 'fintech', label: 'FinTech / Online Lender' },
  { value: 'peer_lending', label: 'Peer-to-Peer Lending Platform' },
  { value: 'payday_lender', label: 'Licensed Payday Lender' },
  { value: 'investment_club', label: 'Investment Club / Lending Circle' },
  { value: 'other', label: 'Other' },
];

const EMPLOYEE_RANGES = [
  { value: '', label: 'Select range' },
  { value: '1', label: 'Just me (1)' },
  { value: '2-5', label: '2-5 employees' },
  { value: '6-10', label: '6-10 employees' },
  { value: '11-25', label: '11-25 employees' },
  { value: '26-50', label: '26-50 employees' },
  { value: '51-100', label: '51-100 employees' },
  { value: '100+', label: '100+ employees' },
];

const REVENUE_RANGES = [
  { value: '', label: 'Select range' },
  { value: 'under_50k', label: 'Under $50,000' },
  { value: '50k_100k', label: '$50,000 - $100,000' },
  { value: '100k_250k', label: '$100,000 - $250,000' },
  { value: '250k_500k', label: '$250,000 - $500,000' },
  { value: '500k_1m', label: '$500,000 - $1 million' },
  { value: '1m_5m', label: '$1 million - $5 million' },
  { value: '5m_plus', label: '$5 million+' },
];

export default function BusinessSetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // Step 1: Basic Info
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessEntityType, setBusinessEntityType] = useState('');
  const [description, setDescription] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Step 2: Verification Info
  const [einTaxId, setEinTaxId] = useState('');
  const [state, setState] = useState('');
  const [yearsInBusiness, setYearsInBusiness] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [numberOfEmployees, setNumberOfEmployees] = useState('');
  const [annualRevenueRange, setAnnualRevenueRange] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  
  // Step 3: Interest rate settings

    // Step 3: Interest rate settings
  const [defaultInterestRate, setDefaultInterestRate] = useState('0');
  const [interestType, setInterestType] = useState('simple');
  const [minLoanAmount, setMinLoanAmount] = useState('50');
  const [maxLoanAmount, setMaxLoanAmount] = useState('5000');
  const [firstTimeBorrowerLimit, setFirstTimeBorrowerLimit] = useState('500');
  const [showCalculator, setShowCalculator] = useState(false);

  // Step 4: Bank Connection & Terms
  const [bankConnected, setBankConnected] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccountMask, setBankAccountMask] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(true);

  // Payment providers (controlled by admin)
  const [isDwollaEnabled, setIsDwollaEnabled] = useState(false);
  const [loadingPaymentProviders, setLoadingPaymentProviders] = useState(true);


  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      
      setUser(user);
      setContactEmail(user.email || '');
      
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUserProfile(profile);
        if (profile.bank_connected) {
          setBankConnected(true);
          setBankName(profile.bank_name || '');
          setBankAccountMask(profile.bank_account_mask || '');
        }
      }
      
      const { data: existing } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (existing && existing.profile_completed) {
        router.push('/business');
        return;
      }
      
      setLoading(false);
    };

    checkAuth();
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
  }, []);

  const validateStep1 = () => {
    if (!businessName.trim()) {
      setError('Business name is required');
      return false;
    }
    if (!businessType) {
      setError('Please select a business type');
      return false;
    }
    if (!businessEntityType) {
      setError('Please select your business entity type');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!state) {
      setError('Please select your state');
      return false;
    }
    if (!einTaxId || !einTaxId.trim()) {
      setError('EIN / Tax ID is required for business verification');
      return false;
    }
    if (!contactEmail || !contactEmail.includes('@')) {
      setError('Please enter a valid contact email');
      return false;
    }
    return true;
  };

  const validateStep3 = () => true; // tier policies handle per-tier limits

  const validateStep4 = () => {
    // Only require bank connection if Dwolla is enabled
    if (isDwollaEnabled && !bankConnected && !userProfile?.bank_connected) {
      setError('Please connect your bank account to receive payments');
      return false;
    }
    if (!termsAccepted) {
      setError('You must accept the terms and conditions');
      return false;
    }
    return true;
  };

  const goToNextStep = () => {
    setError(null);
    let isValid = false;
    if (step === 1) isValid = validateStep1();
    else if (step === 2) isValid = validateStep2();
    else if (step === 3) isValid = validateStep3();
    if (isValid) setStep(step + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep4()) return;

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // Upload logo if provided
      let logoUrl: string | null = null;
      if (logoFile) {
        setUploadingLogo(true);
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `logos/${fileName}`;
        
        console.log('Uploading logo to:', filePath);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('business-assets')
          .upload(filePath, logoFile, { upsert: true });
        
        if (uploadError) {
          console.error('Logo upload error:', uploadError);
          console.error('Error details:', JSON.stringify(uploadError, null, 2));
          // Don't fail the whole process for logo upload, but show warning
          setError('Logo upload failed: ' + uploadError.message + '. Your profile was saved without a logo.');
        } else {
          console.log('Upload successful:', uploadData);
          const { data: urlData } = supabase.storage
            .from('business-assets')
            .getPublicUrl(filePath);
          logoUrl = urlData.publicUrl;
          console.log('Logo URL:', logoUrl);
        }
        setUploadingLogo(false);
      }
      
      const { data: businessProfile, error: insertError } = await supabase
        .from('business_profiles')
        .insert({
          user_id: user.id,
          business_name: businessName,
          business_type: businessType,
          business_entity_type: businessEntityType,
          description: description || null,
          tagline: tagline || null,
          logo_url: logoUrl,
          state: state,
          location: `United States - ${US_STATES.find(s => s.value === state)?.label || state}`,
          ein_tax_id: einTaxId || null,
          years_in_business: yearsInBusiness ? parseInt(yearsInBusiness) : null,
          website_url: websiteUrl || null,
          number_of_employees: numberOfEmployees || null,
          annual_revenue_range: annualRevenueRange || null,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          profile_completed: true,
          is_verified: false,
          verification_status: 'pending',
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          public_profile_enabled: publicProfileEnabled,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create lender_preferences (business lender - only set business_id, not user_id)
      await supabase
        .from('lender_preferences')
        .upsert({
          business_id: businessProfile.id,
          // Note: don't set user_id - constraint requires either user_id OR business_id, not both
          is_active: false,
          auto_accept: false,
          preferred_currency: 'USD',
          min_borrower_rating: 'neutral',
          require_verified_borrower: false,
          min_term_weeks: 1,
          max_term_weeks: 52,
          capital_pool: 0,
          notify_on_match: true,
          notify_email: true,
        }, { onConflict: 'business_id' });

      // Update user profile
      await supabase
        .from('users')
        .update({ 
          user_type: 'business',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      router.push('/business/setup/success');
    } catch (err: any) {
      setError(err.message || 'Failed to create business profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="animate-pulse text-neutral-500 dark:text-neutral-400">Loading...</div>
      </div>
    );
  }

  const totalSteps = 4;
  const progressPercent = ((step - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-teal-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <Card>
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary-100 to-teal-100 dark:from-primary-900/30 dark:to-teal-900/30 rounded-2xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Business Lender Setup</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-2">Complete your profile to start lending on Feyza</p>
          </div>

          <div className="mb-8">
            <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-2">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(progressPercent)}% complete</span>
            </div>
            <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 dark:bg-primary-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-500" />
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Business Information</h3>
                </div>
                
                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Business Logo (optional)</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-600 flex items-center justify-center overflow-hidden bg-neutral-50 dark:bg-neutral-800">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setLogoFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setLogoPreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label
                        htmlFor="logo-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium text-neutral-700 dark:text-neutral-300"
                      >
                        <Upload className="w-4 h-4" />
                        {logoFile ? 'Change Logo' : 'Upload Logo'}
                      </label>
                      {logoFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoFile(null);
                            setLogoPreview(null);
                          }}
                          className="ml-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Remove
                        </button>
                      )}
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">PNG, JPG up to 2MB. Square image recommended.</p>
                    </div>
                  </div>
                </div>
                
                <Input label="Business Name *" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g., ABC Lending Company" />
                <div className="grid md:grid-cols-2 gap-4">
                  <Select label="Business Type *" value={businessType} onChange={(e) => setBusinessType(e.target.value)} options={BUSINESS_TYPES} />
                  <Select label="Entity Type *" value={businessEntityType} onChange={(e) => setBusinessEntityType(e.target.value)} options={BUSINESS_ENTITY_TYPES} />
                </div>
                <Input label="Tagline (optional)" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g., Fast, fair loans for everyone" helperText="A short description that appears on your public profile" />
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Business Description (optional)</label>
                  <textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    rows={3} 
                    placeholder="Tell borrowers about your lending services..." 
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-neutral-400 dark:placeholder:text-neutral-500" 
                  />
                </div>
                <div className="pt-4 flex justify-end">
                  <Button type="button" onClick={goToNextStep}>Continue<ChevronRight className="w-4 h-4 ml-1" /></Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <button 
                  type="button" 
                  onClick={() => { setStep(1); setError(null); }} 
                  className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-2"
                >
                  <ChevronLeft className="w-4 h-4" />Back
                </button>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-primary-600 dark:text-primary-500" />
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Verification Details</h3>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300"><strong>Why we need this:</strong> This information helps us verify your business and ensures compliance with lending regulations.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Select label="State *" value={state} onChange={(e) => setState(e.target.value)} options={US_STATES} />
                  <Input label="EIN / Tax ID *" value={einTaxId} onChange={(e) => setEinTaxId(e.target.value)} placeholder="XX-XXXXXXX" helperText="Your federal tax ID number (required)" />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input label="Years in Business" type="number" min="0" value={yearsInBusiness} onChange={(e) => setYearsInBusiness(e.target.value)} placeholder="e.g., 5" />
                  <Input label="Website URL" type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourcompany.com" />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Select label="Number of Employees" value={numberOfEmployees} onChange={(e) => setNumberOfEmployees(e.target.value)} options={EMPLOYEE_RANGES} />
                  <Select label="Annual Revenue" value={annualRevenueRange} onChange={(e) => setAnnualRevenueRange(e.target.value)} options={REVENUE_RANGES} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input label="Contact Email *" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="business@example.com" />
                  <Input label="Contact Phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="(555) 123-4567" />
                </div>
                <div className="pt-4 flex justify-end">
                  <Button type="button" onClick={goToNextStep}>Continue<ChevronRight className="w-4 h-4 ml-1" /></Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <button
                  type="button"
                  onClick={() => { setStep(2); setError(null); }}
                  className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-2"
                >
                  <ChevronLeft className="w-4 h-4" />Back
                </button>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-primary-600 dark:text-primary-500" />
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Lending Settings</h3>
                </div>
                <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-5">
                  <h4 className="font-semibold text-primary-900 dark:text-primary-200 mb-2">
                    ✅ Interest rates &amp; loan limits are now set by Trust Tier
                  </h4>
                  <p className="text-sm text-primary-700 dark:text-primary-300 mb-4">
                    Instead of global min/max amounts and interest rates, you set per-tier policies
                    after setup in <strong>Lender Settings \u2192 Trust Tiers</strong>.
                    Tier 1 (lowest trust) gets stricter limits; Tier 4 (highest trust) gets your best rate.
                  </p>
                  <ul className="text-sm text-primary-700 dark:text-primary-300 space-y-1.5">
                    <li>🎯 <strong>Tier 1</strong> (0–2 vouches) — e.g. $200 max, 20% rate</li>
                    <li>📈 <strong>Tier 2</strong> (3–5 vouches) — e.g. $500 max, 15% rate</li>
                    <li>✅ <strong>Tier 3</strong> (6–10 vouches) — e.g. $1 500 max, 12% rate</li>
                    <li>💪 <strong>Tier 4</strong> (11+ vouches) — e.g. $5 000 max, 8% rate</li>
                  </ul>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button type="button" onClick={goToNextStep}>Continue<ChevronRight className="w-4 h-4 ml-1" /></Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-fade-in">
                <button 
                  type="button" 
                  onClick={() => { setStep(3); setError(null); }} 
                  className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-2"
                >
                  <ChevronLeft className="w-4 h-4" />Back
                </button>
                <div className="mb-6">
                  {isDwollaEnabled ? (
                    <>
                      {/* Bank Connection - Only when Dwolla is enabled */}
                      <div className="flex items-center gap-2 mb-4">
                        <Building className="w-5 h-5 text-primary-600 dark:text-primary-500" />
                        <h3 className="font-semibold text-neutral-900 dark:text-white">Bank Account Setup</h3>
                      </div>
                      {(userProfile?.bank_connected || bankConnected) ? (
                        <ConnectedBank
                          bankName={bankName || userProfile?.bank_name || 'Bank Account'}
                          accountMask={bankAccountMask || userProfile?.bank_account_mask || '****'}
                          accountType={userProfile?.bank_account_type}
                        />
                      ) : (
                        <div className="text-center py-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                          <div className="w-12 h-12 mx-auto mb-3 bg-neutral-200 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                            <Building className="w-6 h-6 text-neutral-500 dark:text-neutral-400" />
                          </div>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                            Connect your bank account to receive loan repayments
                          </p>
                          <PlaidLinkButton
                            onSuccess={(data) => {
                              setBankConnected(true);
                              setBankName(data.bank_name);
                              setBankAccountMask(data.account_mask);
                            }}
                            buttonText="Connect Bank Account"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Manual Payment Methods - When Dwolla is disabled */}
                      <div className="flex items-center gap-2 mb-4">
                        <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                        <h3 className="font-semibold text-neutral-900 dark:text-white">Payment Setup</h3>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-green-800 dark:text-green-300">No Bank Connection Required</h4>
                            <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                              You'll receive loan repayments directly via Cash App, Venmo, Zelle, or PayPal.
                              You can manage your payment methods in settings after setup.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">Enable Public Profile</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Allow borrowers to find you via a shareable link</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setPublicProfileEnabled(!publicProfileEnabled)} 
                      className={`relative w-14 h-8 rounded-full transition-colors ${publicProfileEnabled ? 'bg-primary-500 dark:bg-primary-600' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white dark:bg-neutral-200 rounded-full shadow transition-transform ${publicProfileEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </label>
                </div>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-primary-600 dark:text-primary-500" />
                    <h3 className="font-semibold text-neutral-900 dark:text-white">Terms & Conditions</h3>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 mb-4 max-h-48 overflow-y-auto text-sm text-neutral-600 dark:text-neutral-400">
                    <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">Feyza Business Lender Agreement</h4>
                    <p className="mb-2">By creating a business lender account on Feyza, you agree to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Provide accurate and truthful business information</li>
                      <li>Comply with all applicable federal and state lending laws</li>
                      <li>Honor the loan terms agreed upon with borrowers</li>
                      <li>Process loan disbursements within 24 hours of acceptance</li>
                      <li>Maintain fair and transparent lending practices</li>
                      <li>Not engage in predatory lending or discriminatory practices</li>
                      <li>Keep your bank account connected for transactions</li>
                      <li>Protect borrower information and privacy</li>
                      <li>Allow Feyza to verify your business information</li>
                    </ul>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={termsAccepted} 
                      onChange={(e) => setTermsAccepted(e.target.checked)} 
                      className="mt-1 w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 text-primary-600 dark:text-primary-500 focus:ring-primary-500 dark:focus:ring-primary-400" 
                    />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">I have read and agree to the <strong>Terms & Conditions</strong> and confirm that my business complies with all applicable lending regulations in my state.</span>
                  </label>
                </div>
                <div className="pt-4">
                  <Button type="submit" loading={saving} className="w-full" disabled={!termsAccepted || (isDwollaEnabled && !userProfile?.bank_connected && !bankConnected)}>
                    <CheckCircle className="w-4 h-4 mr-2" />Submit for Review
                  </Button>
                </div>
              </div>
            )}
          </form>

          <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-6">
            Your application will be reviewed within 1-2 business days. You'll receive an email once approved.
          </p>
        </Card>
      </div>

      {/* Interest Rate Calculator Modal */}
      <InterestCalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        onSelectRate={(rate) => setDefaultInterestRate(String(rate))}
      />
    </div>
  );
}