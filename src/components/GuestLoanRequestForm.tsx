'use client';

import React, { useState, useMemo } from 'react';
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
  Calendar,
  Clock,
  CreditCard
} from 'lucide-react';

const PURPOSES = [
  { value: 'emergency', label: '🚨 Emergency', desc: 'Unexpected expenses' },
  { value: 'medical', label: '🏥 Medical', desc: 'Healthcare costs' },
  { value: 'education', label: '📚 Education', desc: 'School or training' },
  { value: 'business', label: '💼 Business', desc: 'Start or grow business' },
  { value: 'personal', label: '🏠 Personal', desc: 'Bills, rent, etc.' },
  { value: 'other', label: '📝 Other', desc: 'Something else' },
];

const CURRENCIES = [
  { value: 'USD', symbol: '$', label: 'US Dollar' },
  { value: 'EUR', symbol: '€', label: 'Euro' },
  { value: 'GBP', symbol: '£', label: 'British Pound' },
  { value: 'NGN', symbol: '₦', label: 'Nigerian Naira' },
  { value: 'GHS', symbol: '₵', label: 'Ghanaian Cedi' },
  { value: 'KES', symbol: 'KSh', label: 'Kenyan Shilling' },
];

const PAYMENT_METHODS = [
  { value: 'paypal', label: 'PayPal', icon: '💳', placeholder: 'your@email.com' },
  { value: 'cashapp', label: 'Cash App', icon: '💵', placeholder: '$yourusername' },
  { value: 'venmo', label: 'Venmo', icon: '💸', placeholder: '@yourusername' },
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
  
  // Payment method - how borrower wants to receive funds
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentUsername, setPaymentUsername] = useState('');
  
  // Repayment schedule
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  
  // Get smart presets based on amount
  const repaymentPresets = useMemo(() => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return [];
    return getRepaymentPresets(numAmount);
  }, [amount]);
  
  const selectedPreset = selectedPresetIndex !== null ? repaymentPresets[selectedPresetIndex] : null;
  const selectedCurrency = CURRENCIES.find(c => c.value === currency);
  const selectedPaymentMethod = PAYMENT_METHODS.find(m => m.value === paymentMethod);

  const handleSubmit = async () => {
    if (!amount || !purpose || !fullName || !email || selectedPresetIndex === null || !paymentMethod || !paymentUsername) {
      setError('Please fill in all required fields');
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
          // Include proposed repayment schedule
          proposed_frequency: selectedPreset?.frequency,
          proposed_installments: selectedPreset?.installments,
          proposed_payment_amount: selectedPreset?.paymentAmount,
          // Include payment method for receiving funds
          payment_method: paymentMethod,
          payment_username: paymentUsername,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      // Redirect to success/next steps page
      router.push(`/loan-request/success?email=${encodeURIComponent(email)}&id=${data.request_id}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl border-neutral-200 overflow-hidden">
      {/* Loan Type Toggle */}
      <div className="flex  border-neutral-200">
        <button
          onClick={() => setLoanType('personal')}
          className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 font-medium transition-all ${
            loanType === 'personal'
              ? 'bg-primary-500 text-white '
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
              ? 'bg-primary-500 text-white'
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
          <div className="bg-primary-500 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-6 h-6" />
              <h3 className="text-xl font-bold">Request a Loan</h3>
            </div>
            <p className="text-white/80 text-sm">No account needed • Takes 1 minute</p>
          </div>

          {/* Progress Steps */}
          <div className="flex border-b border-neutral-100">
            {[1, 2, 3, 4, 5].map((s) => (
              <div 
                key={s}
                className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
                  step === s 
                    ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-500' 
                    : step > s 
                      ? 'bg-green-50 text-green-600'
                      : 'text-neutral-400'
                }`}
              >
                {step > s ? <CheckCircle className="w-3 h-3 inline mr-1" /> : null}
                {s === 1 ? 'Amount' : s === 2 ? 'Purpose' : s === 3 ? 'Schedule' : s === 4 ? 'Loan Payment' : s === 5 ? 'Details' : s}
              </div>
            ))}
          </div>

          <div className="p-6">
            {/* Step 1: Amount */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    How much do you need?
                  </label>
              <div className="flex gap-2">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="px-4 py-3 border border-neutral-200 rounded-xl bg-neutral-50 font-medium"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.symbol} {c.value}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError('');
                    }}
                    placeholder="5,000"
                    min="1"
                    className="w-full pl-12 pr-4 py-3 border border-neutral-200 rounded-xl text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button 
              className="w-full" 
              onClick={() => {
                const numAmount = parseFloat(amount);
                if (!amount || isNaN(numAmount) || numAmount <= 0) {
                  setError('Please enter a valid amount');
                  return;
                }
                setStep(2);
              }}
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
                  onClick={() => {
                    setPurpose(p.value);
                    setError('');
                  }}
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
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2 mt-6">
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
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                How would you like to repay?
              </label>
              <p className="text-sm text-neutral-500 mb-4">
                Choose a repayment schedule. Your lender can adjust this.
              </p>
            </div>

            <div className="space-y-3">
              {repaymentPresets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedPresetIndex(index);
                    setError('');
                  }}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedPresetIndex === index
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedPresetIndex === index ? 'bg-primary-100' : 'bg-neutral-100'
                      }`}>
                        <Calendar className={`w-5 h-5 ${
                          selectedPresetIndex === index ? 'text-primary-600' : 'text-neutral-500'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">{preset.label}</p>
                        <p className="text-sm text-neutral-500">
                          {preset.frequency === 'weekly' ? 'Weekly' : preset.frequency === 'biweekly' ? 'Bi-weekly' : 'Monthly'} payments
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-neutral-900">
                        {selectedCurrency?.symbol}{preset.paymentAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-neutral-500">per payment</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {selectedPreset && (
              <div className="bg-primary-50 rounded-xl p-4 mt-4">
                <div className="flex items-center gap-2 text-primary-700 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>
                    You'll pay {selectedCurrency?.symbol}{selectedPreset.paymentAmount.toLocaleString()}{' '}
                    {selectedPreset.frequency} for {selectedPreset.installments}{' '}
                    {selectedPreset.installments === 1 ? 'payment' : 'payments'}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2 mt-6">
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
                  setError('');
                  setStep(4);
                }}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: How You Want to Receive Funds */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-neutral-900">How do you want to receive the loan?</h3>
              <p className="text-sm text-neutral-500 mt-1">
                Your lender will send funds to this account
              </p>
            </div>

            <div className="space-y-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  onClick={() => {
                    setPaymentMethod(method.value);
                    setPaymentUsername('');
                    setError('');
                  }}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    paymentMethod === method.value
                      ? 'border-green-500 bg-green-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{method.icon}</span>
                    <span className="font-medium text-neutral-900">{method.label}</span>
                    {paymentMethod === method.value && (
                      <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {paymentMethod && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Your {selectedPaymentMethod?.label} {paymentMethod === 'paypal' ? 'Email' : 'Username'}
                </label>
                <input
                  type={paymentMethod === 'paypal' ? 'email' : 'text'}
                  value={paymentUsername}
                  onChange={(e) => setPaymentUsername(e.target.value)}
                  placeholder={selectedPaymentMethod?.placeholder}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-neutral-500 mt-2">
                  💡 Make sure this is correct! Your lender will send the loan to this account.
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                Back
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => {
                  if (!paymentMethod || !paymentUsername) {
                    setError('Please select a payment method and enter your details');
                    return;
                  }
                  setError('');
                  setStep(5);
                }}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Your Details & Submit */}
        {step === 5 && (
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
              <p className="text-xs text-neutral-500 mt-1">
                We'll send you updates about your loan request
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Brief Description (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-4 top-3 w-5 h-5 text-neutral-400" />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell potential lenders a bit more about why you need this loan..."
                  rows={3}
                  className="w-full pl-12 pr-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-neutral-50 rounded-xl p-4 mt-4">
              <p className="text-sm text-neutral-500 mb-2">Request Summary</p>
              <div className="flex justify-between items-center">
                <span className="font-medium">Amount</span>
                <span className="text-xl font-bold text-primary-600">
                  {selectedCurrency?.symbol}{parseFloat(amount || '0').toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="font-medium">Purpose</span>
                <span className="text-neutral-700">
                  {PURPOSES.find(p => p.value === purpose)?.label || '-'}
                </span>
              </div>
              {selectedPreset && (
                <div className="flex justify-between items-center mt-1">
                  <span className="font-medium">Repayment</span>
                  <span className="text-neutral-700">
                    {selectedCurrency?.symbol}{selectedPreset.paymentAmount.toLocaleString()} × {selectedPreset.installments} ({selectedPreset.frequency})
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center mt-1">
                <span className="font-medium">Receive via</span>
                <span className="text-neutral-700">
                  {selectedPaymentMethod?.icon} {selectedPaymentMethod?.label}: {paymentUsername}
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
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
                disabled={loading || !fullName || !email}
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
