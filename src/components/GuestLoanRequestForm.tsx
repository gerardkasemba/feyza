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
  { value: 'emergency', label: '🚨 Emergency', desc: 'Car repair, urgent bills' },
  { value: 'medical', label: '🏥 Medical', desc: 'Healthcare, dental, prescriptions' },
  { value: 'education', label: '📚 Education', desc: 'Tuition, books, courses' },
  { value: 'business', label: '💼 Business', desc: 'Equipment, inventory, startup' },
  { value: 'personal', label: '🏠 Personal', desc: 'Rent, utilities, moving' },
  { value: 'other', label: '📝 Other', desc: 'Tell your lender the reason' },
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
    <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {/* Loan Type Toggle */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
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

      {/* Business Loan CTA */}
      {loanType === 'business' ? (
        <div className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
              Business Loans
            </h3>
            <p className="text-neutral-600 dark:text-neutral-300">
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

          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-4">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-primary-600 dark:text-primary-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      ) : (
        <>
          {/* Header for Personal Loan */}
          <div className="bg-gradient-to-r from-primary-500 to-accent-500 dark:from-primary-600 dark:to-accent-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-6 h-6" />
              <h3 className="text-xl font-bold">Request a Loan</h3>
            </div>
            <p className="text-white/80 dark:text-white/90 text-sm">No account needed • Takes 1 minute</p>
          </div>

          {/* Progress Steps */}
          <div className="flex border-b border-neutral-100 dark:border-neutral-800">
            {[
              { num: 1, label: 'Amount' },
              { num: 2, label: 'Purpose' },
              { num: 3, label: 'Plan' },
              { num: 4, label: 'Receive' },
              { num: 5, label: 'Submit' },
            ].map((s) => (
              <div 
                key={s.num}
                className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
                  step === s.num 
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400' 
                    : step > s.num 
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'text-neutral-400 dark:text-neutral-500'
                }`}
              >
                {step > s.num ? <CheckCircle className="w-3 h-3 inline mr-1" /> : null}
                {s.label}
              </div>
            ))}
          </div>

          <div className="p-6">
            {/* Step 1: Amount */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    How much do you need?
                  </label>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                    💡 Choose your currency first, then enter the amount
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-neutral-50 dark:bg-neutral-800 font-medium text-neutral-900 dark:text-white"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.value} value={c.value} className="bg-white dark:bg-neutral-800">
                          {c.symbol} {c.value}
                        </option>
                      ))}
                    </select>
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value);
                          setError('');
                        }}
                        placeholder="5,000"
                        min="1"
                        className="w-full pl-12 pr-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                    Your lender will send this amount via PayPal, Cash App, or Venmo
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
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
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    What's this loan for?
                  </label>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                    This helps your lender understand your situation
                  </p>
                </div>
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
                          ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800'
                      }`}
                    >
                      <span className="text-lg text-neutral-900 dark:text-white">{p.label}</span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{p.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Show text field when "other" is selected */}
                {purpose === 'other' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Please describe what it's for
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g., Wedding expenses, vacation, home improvement..."
                      className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    />
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
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
                      if (purpose === 'other' && !description.trim()) {
                        setError('Please describe what the loan is for');
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
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    How would you like to repay?
                  </label>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    Suggest a plan that works for you. Your lender can accept or propose changes.
                  </p>
                </div>

                {/* Reassurance box */}
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-4">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    🤝 <strong>Don't worry!</strong> This is just your proposal. You and your lender will agree on the final terms together.
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
                          ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            selectedPresetIndex === index ? 'bg-primary-100 dark:bg-primary-800' : 'bg-neutral-100 dark:bg-neutral-700'
                          }`}>
                            <Calendar className={`w-5 h-5 ${
                              selectedPresetIndex === index ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white">{preset.label}</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                              {preset.frequency === 'weekly' ? 'Weekly' : preset.frequency === 'biweekly' ? 'Bi-weekly' : 'Monthly'} payments
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-neutral-900 dark:text-white">
                            {selectedCurrency?.symbol}{preset.paymentAmount.toLocaleString()}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">per payment</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedPreset && (
                  <div className="bg-primary-50 dark:bg-primary-900/30 rounded-xl p-4 mt-4">
                    <div className="flex items-center gap-2 text-primary-700 dark:text-primary-400 text-sm">
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
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
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
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Where should your lender send the money?</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    This makes it easy for your lender to pay you directly
                  </p>
                </div>

                {/* Why we ask this */}
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4">
                  <p className="text-sm text-amber-800 dark:text-amber-400">
                    💡 <strong>Why now?</strong> When your lender accepts, they'll see exactly where to send the funds — no back-and-forth needed!
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
                          ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{method.icon}</span>
                        <span className="font-medium text-neutral-900 dark:text-white">{method.label}</span>
                        {paymentMethod === method.value && (
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 ml-auto" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {paymentMethod && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Your {selectedPaymentMethod?.label} {paymentMethod === 'paypal' ? 'Email' : 'Username'}
                    </label>
                    <input
                      type={paymentMethod === 'paypal' ? 'email' : 'text'}
                      value={paymentUsername}
                      onChange={(e) => setPaymentUsername(e.target.value)}
                      placeholder={selectedPaymentMethod?.placeholder}
                      className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    />
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                      ✓ Double-check this is correct — your lender will send money here
                    </p>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
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
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    We'll send you updates about your loan request
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Brief Description (Optional)
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-3 w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell potential lenders a bit more about why you need this loan..."
                      rows={3}
                      className="w-full pl-12 pr-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white resize-none"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 mt-4">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Request Summary</p>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">Amount</span>
                    <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                      {selectedCurrency?.symbol}{parseFloat(amount || '0').toLocaleString()} {currency}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">Purpose</span>
                    <span className="text-neutral-700 dark:text-neutral-300">
                      {PURPOSES.find(p => p.value === purpose)?.label || '-'}
                    </span>
                  </div>
                  {selectedPreset && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">Repayment</span>
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {selectedCurrency?.symbol}{selectedPreset.paymentAmount.toLocaleString()} × {selectedPreset.installments} ({selectedPreset.frequency})
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-1">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">Receive via</span>
                    <span className="text-neutral-700 dark:text-neutral-300">
                      {selectedPaymentMethod?.icon} {selectedPaymentMethod?.label}: {paymentUsername}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
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
          <div className="bg-neutral-50 dark:bg-neutral-800 px-6 py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
            🔒 Your information is secure and never shared without your consent
          </div>
        </>
      )}
    </div>
  );
}