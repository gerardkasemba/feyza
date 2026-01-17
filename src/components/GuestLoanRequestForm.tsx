'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { getRepaymentPresets } from '@/lib/smartSchedule';
import { 
  DollarSign, 
  ArrowRight, 
  CheckCircle, 
  Loader2,
  Mail,
  User,
  FileText,
  Sparkles,
  Users,
  Building2,
  Building,
  Calendar,
  Clock,
  Shield,
  AlertCircle
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

  // Handle Plaid connection - memoized to prevent re-renders
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
              // Store all Dwolla info for submission
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
          // Pass Dwolla info for storage on loan_request
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
    <div className="bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden">
      {/* Loan Type Toggle */}
      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => setLoanType('personal')}
          className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 font-medium transition-all ${
            loanType === 'personal'
              ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-500'
              : 'text-neutral-500 hover:bg-neutral-50'
          }`}
        >
          <Users className="w-5 h-5" />
          Personal Loan
        </button>
        <button
          onClick={() => setLoanType('business')}
          className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 font-medium transition-all ${
            loanType === 'business'
              ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-500'
              : 'text-neutral-500 hover:bg-neutral-50'
          }`}
        >
          <Building2 className="w-5 h-5" />
          Business Loan
        </button>
      </div>

      {/* Business Loan CTA */}
      {loanType === 'business' ? (
        <div className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">
              Business Loans
            </h3>
            <p className="text-neutral-600">
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
              <div key={feature} className="flex items-center gap-3 text-neutral-700">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <Link href="/auth/signup?type=business">
            <Button className="w-full" size="lg">
              Create Free Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>

          <p className="text-center text-sm text-neutral-500 mt-4">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-primary-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      ) : (
        <>
          {/* Header for Personal Loan */}
          <div className="bg-gradient-to-r from-primary-500 to-accent-500 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-6 h-6" />
              <h3 className="text-xl font-bold">Request a Loan</h3>
            </div>
            <p className="text-primary-100">
              Borrow from someone you trust — no credit check, no fees.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="px-6 pt-6">
            <div className="flex items-center justify-between mb-6">
              {['Amount', 'Purpose', 'Schedule', 'Bank', 'Submit'].map((label, i) => (
                <div key={label} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i + 1 === step 
                      ? 'bg-primary-500 text-white' 
                      : i + 1 < step 
                      ? 'bg-green-500 text-white'
                      : 'bg-neutral-200 text-neutral-500'
                  }`}>
                    {i + 1 < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs mt-1 ${i + 1 === step ? 'text-primary-600 font-medium' : 'text-neutral-400'}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Form Steps */}
          <div className="p-6 pt-2">
            {/* Step 1: Amount */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    How much do you need?
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-4 py-4 text-2xl font-bold border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Quick amounts */}
                <div className="flex flex-wrap gap-2">
                  {[100, 250, 500, 1000, 2500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(String(amt))}
                      className={`px-4 py-2 rounded-lg border transition-all ${
                        amount === String(amt)
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      ${amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
                )}

                <Button 
                  className="w-full mt-4" 
                  onClick={() => {
                    if (!amount || parseFloat(amount) <= 0) {
                      setError('Please enter a valid amount');
                      return;
                    }
                    setError('');
                    setStep(2);
                  }}
                  disabled={!amount}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Purpose */}
            {step === 2 && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  What's this loan for?
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                  {PURPOSES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPurpose(p.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        purpose === p.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <span className="text-lg">{p.label}</span>
                      <p className="text-xs text-neutral-500 mt-1">{p.desc}</p>
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
                )}

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
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
                      setStep(3);
                    }}
                    disabled={!purpose}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Repayment Schedule */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-primary-600" />
                  <label className="text-sm font-medium text-neutral-700">
                    Propose a repayment schedule
                  </label>
                </div>
                <p className="text-xs text-neutral-500 mb-4">
                  Your lender can adjust this later
                </p>
                
                {repaymentPresets.length > 0 ? (
                  <div className="space-y-3">
                    {repaymentPresets.map((preset, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedPresetIndex(index)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          selectedPresetIndex === index
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-semibold text-neutral-900">
                              {preset.installments} {preset.frequency} payments
                            </span>
                            <p className="text-sm text-neutral-500 mt-1">
                              {selectedCurrency?.symbol}{preset.paymentAmount.toLocaleString()} each
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-neutral-400" />
                            <span className="text-sm text-neutral-500">{preset.label}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-500">Enter an amount to see repayment options</p>
                )}

                {/* Start Date Picker */}
                <div className="mt-6 pt-4 border-t border-neutral-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-primary-600" />
                    <label className="text-sm font-medium text-neutral-700">
                      When can you start paying?
                    </label>
                  </div>
                  <p className="text-xs text-neutral-500 mb-3">
                    Select your preferred first payment date
                  </p>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {startDate && (
                    <p className="text-xs text-green-600 mt-2">
                      ✓ First payment: {new Date(startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
                )}

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
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
                      setStep(4);
                    }}
                    disabled={selectedPresetIndex === null || !startDate}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Bank Connection */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="w-5 h-5 text-primary-600" />
                  <label className="text-sm font-medium text-neutral-700">
                    Connect your bank to receive funds
                  </label>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <p className="text-sm text-amber-800">
                    💡 <strong>Why connect your bank?</strong> When your lender accepts, they can send funds directly to your account — secure and fast!
                  </p>
                </div>

                {/* Name & Email inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Your Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-12 pr-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Your Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-12 pr-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Connection Status */}
                {bankConnected && bankInfo ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                          <Building className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-neutral-900">{bankInfo.bank_name}</span>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                          <p className="text-sm text-neutral-500">
                            ••••{bankInfo.account_mask}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
                      <Building className="w-8 h-8 text-neutral-400" />
                    </div>
                    <Button
                      onClick={handleConnectBank}
                      disabled={!plaidLoaded || plaidLoading || plaidConnecting || !fullName || !email}
                      className="w-full max-w-xs"
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
                      <p className="text-neutral-500 text-sm mt-2">Enter your name and email first</p>
                    )}
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800">Secure & Protected</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        We use Plaid to securely connect to your bank. We never see your login credentials.
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
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
                      setStep(5);
                    }}
                    disabled={!bankConnected}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Review & Submit */}
            {step === 5 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-neutral-900">Review Your Request</h3>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Brief Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell potential lenders a bit more about why you need this loan..."
                    rows={3}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>

                {/* Summary */}
                <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-neutral-500 mb-2">Request Summary</p>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Amount</span>
                    <span className="text-xl font-bold text-primary-600">
                      {selectedCurrency?.symbol}{parseFloat(amount || '0').toLocaleString()} {currency}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Purpose</span>
                    <span className="text-neutral-700">
                      {PURPOSES.find(p => p.value === purpose)?.label || '-'}
                    </span>
                  </div>
                  {selectedPreset && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Repayment</span>
                      <span className="text-neutral-700">
                        {selectedCurrency?.symbol}{selectedPreset.paymentAmount.toLocaleString()} × {selectedPreset.installments} ({selectedPreset.frequency})
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Receive via</span>
                    <span className="text-neutral-700 flex items-center gap-1">
                      <Building className="w-4 h-4" />
                      {bankInfo?.bank_name} ••••{bankInfo?.account_mask}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Borrower</span>
                    <span className="text-neutral-700">{fullName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Email</span>
                    <span className="text-neutral-700">{email}</span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleSubmit}
                    disabled={loading}
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

          {/* Footer */}
          <div className="bg-neutral-50 px-6 py-4 text-center text-sm text-neutral-500">
            🔒 Your information is secure and never shared without your consent
          </div>
        </>
      )}
    </div>
  );
}
