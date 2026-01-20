'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { getRepaymentPresets } from '@/lib/smartSchedule';
import { 
  DollarSign, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle, 
  Loader2,
  Mail,
  User,
  Sparkles,
  Users,
  Building2,
  Building,
  Calendar,
  Clock,
  Shield,
  AlertCircle,
  Lock,
  HelpCircle
} from 'lucide-react';

const PURPOSES = [
  { value: 'emergency', label: '🚨 Emergency', desc: 'Car repair, urgent bills' },
  { value: 'medical', label: '🏥 Medical', desc: 'Healthcare, dental, prescriptions' },
  { value: 'education', label: '📚 Education', desc: 'Tuition, books, courses' },
  { value: 'business', label: '💼 Business', desc: 'Equipment, inventory, startup' },
  { value: 'personal', label: '🏠 Personal', desc: 'Rent, utilities, moving' },
  { value: 'other', label: '📝 Other', desc: 'Tell your lender the reason' },
];

const CURRENCIES = [
  { value: 'USD', symbol: '$', label: 'US Dollar' },
];

export default function GuestLoanRequestForm() {
  const router = useRouter();
  const [loanType, setLoanType] = useState<'personal' | 'business'>('personal');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [purpose, setPurpose] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  
  // Bank connection state
  const [bankConnected, setBankConnected] = useState(false);
  const [bankInfo, setBankInfo] = useState<any>(null);
  
  // Plaid state
  const [plaidLoaded, setPlaidLoaded] = useState(false);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [plaidConnecting, setPlaidConnecting] = useState(false);
  
  // Repayment schedule
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  
  // Mobile-specific states
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Load Plaid script once
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).Plaid) {
      const script = document.createElement('script');
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
      script.async = true;
      script.onload = () => setPlaidLoaded(true);
      document.body.appendChild(script);
    } else {
      setPlaidLoaded(true);
    }
  }, []);
  
  // Get smart presets based on amount
  const repaymentPresets = useMemo(() => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return [];
    return getRepaymentPresets(numAmount);
  }, [amount]);
  
  const selectedPreset = selectedPresetIndex !== null ? repaymentPresets[selectedPresetIndex] : null;
  const selectedCurrency = CURRENCIES.find(c => c.value === currency);

  // Handle step transitions with animation
  const handleNextStep = useCallback((nextStep: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(nextStep);
      setIsTransitioning(false);
      // Scroll to top on mobile
      if (window.innerWidth < 768) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 150);
  }, []);

  // Handle Plaid connection
  const handleConnectBank = useCallback(async () => {
    if (!fullName || !email) {
      setError('Please enter your name and email first');
      return;
    }

    if (!plaidLoaded || !(window as any).Plaid) {
      setError('Bank connection is loading. Please try again.');
      return;
    }

    setPlaidLoading(true);
    setError('');

    try {
      // Get link token
      const tokenResponse = await fetch('/api/plaid/guest-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName, email }),
      });
      
      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        setError(tokenData.error);
        setPlaidLoading(false);
        return;
      }

      // Open Plaid Link
      const handler = (window as any).Plaid.create({
        token: tokenData.link_token,
        onSuccess: async (publicToken: string, metadata: any) => {
          setPlaidConnecting(true);
          try {
            const accountId = metadata.accounts[0]?.id;
            const institution = metadata.institution;
            
            const exchangeResponse = await fetch('/api/plaid/guest-exchange', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                public_token: publicToken,
                account_id: accountId,
                institution,
                name: fullName,
                email,
              }),
            });
            
            const exchangeData = await exchangeResponse.json();
            
            if (exchangeData.error) {
              setError(exchangeData.error);
            } else {
              setBankConnected(true);
              setBankInfo({
                bank_name: exchangeData.bank_name,
                account_mask: exchangeData.account_mask,
                account_type: exchangeData.account_type,
                dwolla_customer_url: exchangeData.dwolla_customer_url,
                dwolla_customer_id: exchangeData.dwolla_customer_id,
                dwolla_funding_source_url: exchangeData.dwolla_funding_source_url,
                dwolla_funding_source_id: exchangeData.dwolla_funding_source_id,
                plaid_access_token: exchangeData.plaid_access_token,
              });
              setError('');
            }
          } catch (err: any) {
            setError(err.message || 'Failed to connect bank');
          } finally {
            setPlaidConnecting(false);
          }
        },
        onExit: () => {
          setPlaidLoading(false);
        },
      });
      
      handler.open();
      setPlaidLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize bank connection');
      setPlaidLoading(false);
    }
  }, [fullName, email, plaidLoaded]);

  const handleSubmit = useCallback(async () => {
    if (!amount || !purpose || !fullName || !email || selectedPresetIndex === null || !bankConnected || !startDate) {
      setError('Please fill in all required fields and connect your bank');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/guest-loan-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency,
          purpose,
          full_name: fullName,
          email,
          description,
          proposed_frequency: selectedPreset?.frequency,
          proposed_installments: selectedPreset?.installments,
          proposed_payment_amount: selectedPreset?.paymentAmount,
          proposed_start_date: startDate,
          bank_connected: true,
          borrower_dwolla_customer_url: bankInfo?.dwolla_customer_url,
          borrower_dwolla_customer_id: bankInfo?.dwolla_customer_id,
          borrower_dwolla_funding_source_url: bankInfo?.dwolla_funding_source_url,
          borrower_dwolla_funding_source_id: bankInfo?.dwolla_funding_source_id,
          borrower_plaid_access_token: bankInfo?.plaid_access_token,
          borrower_bank_name: bankInfo?.bank_name,
          borrower_bank_account_mask: bankInfo?.account_mask,
          borrower_bank_account_type: bankInfo?.account_type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      router.push(`/loan-request/success?email=${encodeURIComponent(email)}&id=${data.request_id}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [amount, purpose, fullName, email, description, selectedPresetIndex, selectedPreset, currency, bankConnected, bankInfo, startDate, router]);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm dark:shadow-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
      {/* Mobile Header with Back Button */}
      <div className="lg:hidden sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <div className="flex items-center">
          {step > 1 && (
            <button
              onClick={() => handleNextStep(step - 1)}
              className="p-2 -ml-2 mr-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {loanType === 'personal' ? 'Request Loan' : 'Business Loan'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-500 dark:bg-primary-400 transition-all duration-300"
                  style={{ width: `${(step / 5) * 100}%` }}
                />
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Step {step} of 5</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Loan Type Toggle */}
      <div className="hidden lg:flex border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setLoanType('personal')}
          className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 font-medium transition-all ${
            loanType === 'personal'
              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400'
              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
          }`}
        >
          <Users className="w-5 h-5" />
          Personal Loan
        </button>
        <button
          onClick={() => setLoanType('business')}
          className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 font-medium transition-all ${
            loanType === 'business'
              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400'
              : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
          }`}
        >
          <Building2 className="w-5 h-5" />
          Business Loan
        </button>
      </div>

      {/* Mobile Loan Type Toggle - 50/50 Layout */}
      <div className="lg:hidden px-4 pt-4 mb-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setLoanType('personal')}
            className={`py-3 px-4 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center ${
              loanType === 'personal'
                ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'
            }`}
          >
            <Users className="w-5 h-5 mb-2" />
            <span className="font-medium">Personal</span>
          </button>
          <button
            onClick={() => setLoanType('business')}
            className={`py-3 px-4 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center ${
              loanType === 'business'
                ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'
            }`}
          >
            <Building2 className="w-5 h-5 mb-2" />
            <span className="font-medium">Business</span>
          </button>
        </div>
      </div>

      {/* Business Loan CTA */}
      {loanType === 'business' ? (
        <div className="p-4 sm:p-6 pb-8 sm:pb-8"> {/* Added bottom padding */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-primary-600 dark:text-primary-500" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white mb-2">
              Business Loans
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base">
              Get access to verified business lenders, larger loan amounts, and professional tools.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {[
              'Access to verified business lenders',
              'Loan amounts up to $500,000',
              'Professional loan agreements',
              'Business credit building',
              'Dedicated support',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 dark:text-green-400 flex-shrink-0" />
                <span className="text-sm sm:text-base">{feature}</span>
              </div>
            ))}
          </div>

          <Link href="/auth/signup?type=business">
            <Button className="w-full" size="lg">
              Create Free Account
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            </Button>
          </Link>

          <p className="text-center text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-4">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-primary-600 dark:text-primary-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      ) : (
        <>
          {/* Header for Personal Loan */}
          <div className="bg-gradient-to-r from-primary-500 to-accent-500 dark:from-primary-600 dark:to-accent-600 p-4 sm:p-6 text-white">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
              <h3 className="text-lg sm:text-xl font-bold">Formalize Your Loan Request</h3>
            </div>
            <p className="text-primary-100 dark:text-primary-200 text-sm sm:text-base">
              Turn informal agreements into clear terms with friends, family, or businesses.
            </p>
          </div>

          {/* Desktop Progress Steps */}
          <div className="hidden sm:block px-6 pt-6">
            <div className="flex items-center justify-between mb-6">
              {['Amount', 'Purpose', 'Schedule', 'Bank', 'Submit'].map((label, i) => (
                <div key={label} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i + 1 === step 
                      ? 'bg-primary-500 dark:bg-primary-600 text-white' 
                      : i + 1 < step 
                      ? 'bg-green-500 dark:bg-green-600 text-white'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
                  }`}>
                    {i + 1 < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs mt-1 ${i + 1 === step ? 'text-primary-600 dark:text-primary-400 font-medium' : 'text-neutral-400 dark:text-neutral-500'}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Form Steps */}
          <div className={`p-4 sm:p-6 sm:pt-2 pb-8 sm:pb-6 transition-opacity duration-200 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
            {/* Step 1: Amount */}
            {step === 1 && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    How much do you need?
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-4 py-4 text-2xl sm:text-3xl font-bold border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Quick amounts - Scrollable on mobile */}
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Quick select:</p>
                  <div className="flex overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                    <div className="flex gap-2 min-w-max">
                      {[100, 250, 500, 1000, 2500].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAmount(String(amt))}
                          className={`px-4 py-3 rounded-lg border transition-all flex-shrink-0 ${
                            amount === String(amt)
                              ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                              : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          ${amt.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="pt-4">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => {
                      if (!amount || parseFloat(amount) <= 0) {
                        setError('Please enter a valid amount');
                        return;
                      }
                      setError('');
                      handleNextStep(2);
                    }}
                    disabled={!amount}
                  >
                    Continue to Purpose
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Purpose */}
            {step === 2 && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                    What's this loan for?
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    Choose the main purpose for your loan request
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PURPOSES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPurpose(p.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                        purpose === p.value
                          ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{p.label.split(' ')[0]}</span>
                        <div>
                          <span className="font-semibold text-neutral-900 dark:text-white block">
                            {p.label.split(' ').slice(1).join(' ')}
                          </span>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{p.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-2 sm:gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => handleNextStep(1)} 
                    className="flex-1"
                    size="lg"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={() => {
                      if (!purpose) {
                        setError('Please select a purpose');
                        return;
                      }
                      setError('');
                      handleNextStep(3);
                    }}
                    disabled={!purpose}
                    size="lg"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Repayment Schedule */}
            {step === 3 && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
                    Repayment Schedule
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    Choose how you'd like to pay back the loan
                  </p>
                </div>
                
                {repaymentPresets.length > 0 ? (
                  <div className="space-y-3">
                    {repaymentPresets.map((preset, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedPresetIndex(index)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                          selectedPresetIndex === index
                            ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30'
                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-500" />
                              <span className="font-semibold text-neutral-900 dark:text-white">
                                {preset.installments} {preset.frequency} payments
                              </span>
                            </div>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 ml-6">
                              {selectedCurrency?.symbol}{preset.paymentAmount.toLocaleString()} each
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                            <span className="text-sm text-neutral-500 dark:text-neutral-400">{preset.label}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Calendar className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-500 dark:text-neutral-400">Enter an amount to see repayment options</p>
                  </div>
                )}

                {/* Start Date Picker */}
                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-500" />
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      When can you start paying?
                    </label>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                    Select your preferred first payment date
                  </p>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                  {startDate && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      First payment: {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-2 sm:gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => handleNextStep(2)} 
                    className="flex-1"
                    size="lg"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={() => {
                      if (selectedPresetIndex === null) {
                        setError('Please select a repayment schedule');
                        return;
                      }
                      if (!startDate) {
                        setError('Please select when you want to start paying');
                        return;
                      }
                      setError('');
                      handleNextStep(4);
                    }}
                    disabled={selectedPresetIndex === null || !startDate}
                    size="lg"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Bank Connection */}
            {step === 4 && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
                    Connect Your Bank
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    Securely link your account to receive funds
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-1">
                        Why connect your bank?
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        When your lender accepts, they can send funds directly to your account. This is required to receive loan funds.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Name & Email inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Your Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-12 pr-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Your Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-12 pr-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Connection Status */}
                {bankConnected && bankInfo ? (
                  <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                          <Building className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-neutral-900 dark:text-white text-sm sm:text-base">{bankInfo.bank_name}</span>
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-500" />
                          </div>
                          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                            ••••{bankInfo.account_mask}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-14 h-14 mx-auto mb-4 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                      <Building className="w-7 h-7 text-neutral-400 dark:text-neutral-500" />
                    </div>
                    <Button
                      onClick={handleConnectBank}
                      disabled={!plaidLoaded || plaidLoading || plaidConnecting || !fullName || !email}
                      className="w-full max-w-xs"
                      size="lg"
                    >
                      {plaidLoading || plaidConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {plaidConnecting ? 'Connecting...' : 'Loading...'}
                        </>
                      ) : (
                        <>
                          <Building className="w-4 h-4 mr-2" />
                          Connect Bank Account
                        </>
                      )}
                    </Button>
                    {(!fullName || !email) && (
                      <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm mt-2">Enter your name and email first</p>
                    )}
                  </div>
                )}

                <div className="bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-neutral-600 dark:text-neutral-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-neutral-800 dark:text-neutral-300 text-sm">Secure & Protected</h4>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        We use Plaid to securely connect to your bank. We never see your login credentials.
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex gap-2 sm:gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => handleNextStep(3)} 
                    className="flex-1"
                    size="lg"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={() => {
                      if (!bankConnected) {
                        setError('Please connect your bank account');
                        return;
                      }
                      setError('');
                      handleNextStep(5);
                    }}
                    disabled={!bankConnected}
                    size="lg"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Review & Submit */}
            {step === 5 && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
                    Review & Submit
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    Check your details and submit your request
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Brief Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell potential lenders a bit more about why you need this loan..."
                    rows={3}
                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white resize-none"
                  />
                </div>

                {/* Summary Card */}
                <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Request Summary</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Amount</p>
                      <p className="font-semibold text-primary-600 dark:text-primary-400 text-lg">
                        {selectedCurrency?.symbol}{parseFloat(amount || '0').toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Purpose</p>
                      <p className="font-medium text-neutral-700 dark:text-neutral-300">
                        {PURPOSES.find(p => p.value === purpose)?.label.split(' ').slice(1).join(' ') || '-'}
                      </p>
                    </div>
                    {selectedPreset && (
                      <>
                        <div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">Payment</p>
                          <p className="font-medium text-neutral-700 dark:text-neutral-300">
                            {selectedCurrency?.symbol}{selectedPreset.paymentAmount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">Term</p>
                          <p className="font-medium text-neutral-700 dark:text-neutral-300">
                            {selectedPreset.installments} {selectedPreset.frequency}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Bank</p>
                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        {bankInfo?.bank_name} ••••{bankInfo?.account_mask}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Borrower</p>
                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{fullName}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Email</p>
                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{email}</p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex gap-2 sm:gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => handleNextStep(4)} 
                    className="flex-1"
                    size="lg"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleSubmit}
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Request
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer with extra bottom spacing */}
          <div className="bg-neutral-50 dark:bg-neutral-800/50 px-4 sm:px-6 py-3 text-center text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
              Your information is secure and never shared without your consent
            </div>
          </div>
        </>
      )}

      {/* Extra bottom spacing for mobile */}
      {/* <div className="lg:hidden h-8 bg-white dark:bg-neutral-900"></div> */}
    </div>
  );
}