'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Input, Select } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, Building2, Percent, CreditCard, FileText, 
  CheckCircle, ChevronRight, ChevronLeft, AlertCircle 
} from 'lucide-react';

export default function BusinessSetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1: Business Info, 2: Interest Settings, 3: PayPal & Terms

  // Form state
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

  // PayPal & Terms
  const [paypalEmail, setPaypalEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const businessTypes = [
    { value: '', label: 'Select business type' },
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
    const checkAuth = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      
      setUser(user);
      setContactEmail(user.email || '');
      
      // Get user profile to check for existing PayPal
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUserProfile(profile);
        if (profile.paypal_email) {
          setPaypalEmail(profile.paypal_email);
        }
      }
      
      // Check if business profile already exists
      try {
        const { data: existing } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (existing) {
          router.push('/business');
          return;
        }
      } catch (error) {
        // No existing profile, continue with setup
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const validateStep1 = () => {
    if (!businessName.trim()) {
      setError('Business name is required');
      return false;
    }
    if (!businessType) {
      setError('Please select a business type');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    // Interest settings are optional, just validate if provided
    const rate = parseFloat(defaultInterestRate);
    if (rate < 0 || rate > 100) {
      setError('Interest rate must be between 0 and 100');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!paypalEmail || !paypalEmail.includes('@')) {
      setError('Please enter a valid PayPal email address');
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
    
    if (isValid) {
      setStep(step + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep3()) return;

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // Create business profile with profile_completed = true
      const { error: insertError } = await supabase
        .from('business_profiles')
        .insert({
          user_id: user.id,
          business_name: businessName,
          business_type: businessType,
          description: description || null,
          location: location || null,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          default_interest_rate: parseFloat(defaultInterestRate) || 0,
          interest_type: interestType,
          min_loan_amount: minLoanAmount ? parseFloat(minLoanAmount) : null,
          max_loan_amount: maxLoanAmount ? parseFloat(maxLoanAmount) : null,
          paypal_email: paypalEmail,
          paypal_connected: true,
          profile_completed: true, // Mark as completed
          is_verified: false, // Still needs admin verification
        });

      if (insertError) throw insertError;

      // Update user profile with PayPal if not already set
      const userUpdates: any = { 
        user_type: 'business',
        updated_at: new Date().toISOString(),
      };
      
      // Only update PayPal if user doesn't have it yet
      if (!userProfile?.paypal_email) {
        userUpdates.paypal_email = paypalEmail;
        userUpdates.paypal_connected = true;
        userUpdates.paypal_connected_at = new Date().toISOString();
      }

      await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', user.id);

      router.push('/business');
    } catch (err: any) {
      setError(err.message || 'Failed to create business profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  const totalSteps = 3;
  const progressPercent = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <Card>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-display font-bold text-neutral-900">
              Set Up Your Business
            </h1>
            <p className="text-neutral-500 mt-2">
              Create a business profile to start accepting loan requests
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-neutral-500 mb-2">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(progressPercent)}% complete</span>
            </div>
            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className={`flex items-center gap-2 text-sm ${step >= 1 ? 'text-primary-600' : 'text-neutral-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step > 1 ? 'bg-green-500 text-white' : step === 1 ? 'bg-primary-500 text-white' : 'bg-neutral-200'}`}>
                {step > 1 ? <CheckCircle className="w-4 h-4" /> : '1'}
              </div>
              <span className="hidden sm:inline">Info</span>
            </div>
            <div className="w-8 h-0.5 bg-neutral-200" />
            <div className={`flex items-center gap-2 text-sm ${step >= 2 ? 'text-primary-600' : 'text-neutral-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step > 2 ? 'bg-green-500 text-white' : step === 2 ? 'bg-primary-500 text-white' : 'bg-neutral-200'}`}>
                {step > 2 ? <CheckCircle className="w-4 h-4" /> : '2'}
              </div>
              <span className="hidden sm:inline">Rates</span>
            </div>
            <div className="w-8 h-0.5 bg-neutral-200" />
            <div className={`flex items-center gap-2 text-sm ${step >= 3 ? 'text-primary-600' : 'text-neutral-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 3 ? 'bg-primary-500 text-white' : 'bg-neutral-200'}`}>
                3
              </div>
              <span className="hidden sm:inline">PayPal</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Business Info */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <Input
                  label="Business Name *"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g., ABC Microfinance"
                />

                <Select
                  label="Business Type *"
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
                    placeholder="business@example.com"
                  />
                  <Input
                    label="Contact Phone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="button" onClick={goToNextStep}>
                    Continue
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Interest Rate Settings */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(null); }}
                  className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>

                <div className="flex items-center gap-2 mb-4">
                  <Percent className="w-5 h-5 text-primary-600" />
                  <h3 className="font-semibold text-neutral-900">Interest Rate Settings</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Default Interest Rate (%)"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={defaultInterestRate}
                    onChange={(e) => setDefaultInterestRate(e.target.value)}
                    placeholder="e.g., 15"
                    helperText="Annual percentage rate"
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
                    label="Min Loan Amount"
                    type="number"
                    min="0"
                    value={minLoanAmount}
                    onChange={(e) => setMinLoanAmount(e.target.value)}
                    placeholder="e.g., 100"
                  />
                  <Input
                    label="Max Loan Amount"
                    type="number"
                    min="0"
                    value={maxLoanAmount}
                    onChange={(e) => setMaxLoanAmount(e.target.value)}
                    placeholder="e.g., 10000"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> These settings will be applied to all loan requests you receive. 
                    You can change them later in your business settings.
                  </p>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="button" onClick={goToNextStep}>
                    Continue
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: PayPal & Terms */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <button
                  type="button"
                  onClick={() => { setStep(2); setError(null); }}
                  className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>

                {/* PayPal Section */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-primary-600" />
                    <h3 className="font-semibold text-neutral-900">Payment Setup</h3>
                  </div>

                  {userProfile?.paypal_email ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-800">PayPal Already Connected</p>
                          <p className="text-sm text-green-700">{userProfile.paypal_email}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Input
                        label="PayPal Email Address *"
                        type="email"
                        value={paypalEmail}
                        onChange={(e) => setPaypalEmail(e.target.value)}
                        placeholder="your@paypal.com"
                        helperText="You'll receive loan repayments to this PayPal account"
                      />
                    </>
                  )}
                </div>

                {/* Terms Section */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-primary-600" />
                    <h3 className="font-semibold text-neutral-900">Terms & Conditions</h3>
                  </div>

                  <div className="bg-neutral-50 rounded-xl p-4 mb-4 max-h-48 overflow-y-auto text-sm text-neutral-600">
                    <h4 className="font-semibold text-neutral-900 mb-2">LoanTrack Business Terms</h4>
                    <p className="mb-2">By creating a business account on LoanTrack, you agree to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Provide accurate and truthful business information</li>
                      <li>Comply with all applicable lending laws and regulations in your jurisdiction</li>
                      <li>Honor the loan terms agreed upon with borrowers</li>
                      <li>Process loan disbursements in a timely manner</li>
                      <li>Maintain fair and transparent lending practices</li>
                      <li>Keep your PayPal account active for receiving and sending payments</li>
                      <li>Respond to loan requests within a reasonable timeframe</li>
                      <li>Not engage in predatory lending practices</li>
                      <li>Protect borrower information and privacy</li>
                      <li>Allow LoanTrack to verify your business information</li>
                    </ul>
                    <p className="mt-4">
                      LoanTrack reserves the right to suspend or terminate accounts that violate these terms.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-700">
                      I have read and agree to the <strong>Terms & Conditions</strong> and confirm that my business complies with all applicable lending regulations.
                    </span>
                  </label>
                </div>

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    loading={saving} 
                    className="w-full"
                    disabled={!termsAccepted || (!userProfile?.paypal_email && !paypalEmail)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Business Setup
                  </Button>
                </div>
              </div>
            )}
          </form>

          <p className="text-xs text-neutral-500 text-center mt-6">
            Your business will be reviewed before appearing to borrowers. 
            This usually takes 1-2 business days.
          </p>
        </Card>
      </div>
    </div>
  );
}
