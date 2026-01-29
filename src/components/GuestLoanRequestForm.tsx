'use client';

import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Calendar as CalendarPicker, Alert } from '@/components/ui';
import { getRepaymentPresets } from '@/lib/smartSchedule';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle,
  DollarSign,
  Loader2,
  Mail,
  User,
  Calendar as CalendarIcon,
  Clock,
  Building,
  Shield,
  AlertCircle,
  Lock,
  Info,
  Users,
  Briefcase,
} from 'lucide-react';

const PURPOSES = [
  { value: 'emergency', label: 'Emergency', emoji: '🚨' },
  { value: 'medical', label: 'Medical', emoji: '🏥' },
  { value: 'education', label: 'Education', emoji: '📚' },
  { value: 'business', label: 'Business', emoji: '💼' },
  { value: 'personal', label: 'Personal', emoji: '🏠' },
  { value: 'other', label: 'Other', emoji: '📝' },
] as const;

const CURRENCIES = [{ value: 'USD', symbol: '$', label: 'US Dollar' }] as const;

type LoanType = 'personal' | 'business';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function GuestLoanRequestForm() {
  const router = useRouter();

  const [loanType, setLoanType] = useState<LoanType>('personal');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data (simplified)
  const [amount, setAmount] = useState('');
  const [currency] = useState<'USD'>('USD');
  const [purpose, setPurpose] = useState<(typeof PURPOSES)[number]['value'] | ''>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');

  // Bank connection
  const [bankConnected, setBankConnected] = useState(false);
  const [bankInfo, setBankInfo] = useState<any>(null);
  const [plaidLoaded, setPlaidLoaded] = useState(false);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [plaidConnecting, setPlaidConnecting] = useState(false);

  // "App-like" behavior on mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load Plaid script once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!(window as any).Plaid) {
      const script = document.createElement('script');
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
      script.async = true;
      script.onload = () => setPlaidLoaded(true);
      document.body.appendChild(script);
    } else {
      setPlaidLoaded(true);
    }
  }, []);

  const selectedCurrency = CURRENCIES.find((c) => c.value === currency);

  const repaymentPresets = useMemo(() => {
    const numAmount = parseFloat(amount);
    if (Number.isNaN(numAmount) || numAmount <= 0) return [];
    return getRepaymentPresets(numAmount);
  }, [amount]);

  const selectedPreset =
    selectedPresetIndex !== null ? repaymentPresets[selectedPresetIndex] : null;

  const progress = useMemo(() => {
    const pct = (step / 3) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [step]);

  const canGoNextStep1 = useMemo(() => {
    const n = parseFloat(amount);
    return !!amount && !Number.isNaN(n) && n > 0 && !!purpose;
  }, [amount, purpose]);

  const canGoNextStep2 = useMemo(() => {
    return selectedPresetIndex !== null && !!startDate;
  }, [selectedPresetIndex, startDate]);

  const canSubmit = useMemo(() => {
    return (
      canGoNextStep1 &&
      canGoNextStep2 &&
      !!fullName &&
      !!email &&
      bankConnected &&
      !!startDate &&
      selectedPresetIndex !== null
    );
  }, [canGoNextStep1, canGoNextStep2, fullName, email, bankConnected, startDate, selectedPresetIndex]);

  const go = useCallback(
    (next: 1 | 2 | 3) => {
      setError('');
      setStep(next);
      if (isMobile) window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [isMobile]
  );

  const handleConnectBank = useCallback(async () => {
    if (!fullName || !email) {
      setError('Enter your name and email first.');
      return;
    }
    if (!plaidLoaded || !(window as any).Plaid) {
      setError('Bank connection is still loading. Try again in a moment.');
      return;
    }

    setPlaidLoading(true);
    setError('');

    try {
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

      const handler = (window as any).Plaid.create({
        token: tokenData.link_token,
        onSuccess: async (publicToken: string, metadata: any) => {
          setPlaidConnecting(true);
          try {
            const accountId = metadata.accounts?.[0]?.id;
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
            setError(err?.message || 'Failed to connect bank.');
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
      setError(err?.message || 'Failed to initialize bank connection.');
      setPlaidLoading(false);
    }
  }, [email, fullName, plaidLoaded]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedPreset || !startDate) {
      setError('Please complete all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    const formattedStartDate = startDate.toISOString().split('T')[0];

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

          proposed_frequency: selectedPreset.frequency,
          proposed_installments: selectedPreset.installments,
          proposed_payment_amount: selectedPreset.paymentAmount,
          proposed_start_date: formattedStartDate,

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
      if (!response.ok) throw new Error(data.error || 'Failed to submit request.');

      router.push(
        `/loan-request/success?email=${encodeURIComponent(email)}&id=${data.request_id}&token=${data.borrower_token}`
      );
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [amount, bankInfo, canSubmit, currency, description, email, fullName, purpose, router, selectedPreset, startDate]);

  // ====== BUSINESS CTA (kept, simpler) ======
  if (loanType === ('business' as LoanType)) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-2xl lg:rounded-3xl dark:border-neutral-800">
        <div className="px-4 py-4 sm:px-6 sm:py-5   flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="font-semibold text-neutral-900 dark:text-white">Business Loans</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLoanType('personal')}
              className="text-sm text-neutral-600 dark:text-neutral-300 hover:underline"
              type="button"
            >
              Personal instead
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Business Lending Requires Account</p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                  For business loans, lenders require verified accounts to ensure security and compliance.
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300">
            Get access to verified business lenders, larger amounts, and business-friendly terms.
          </p>

          <div className="mt-5 space-y-3">
            {[
              'Verified business lenders',
              'Higher limits',
              'Professional agreements',
              'Business credit building',
            ].map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                {t}
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Link href="/auth/signup?type=business">
              <Button className="w-full" size="lg">
                Create Free Account <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>

            <p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-primary-600 dark:text-primary-400 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ====== APP-LIKE SHELL (mobile) + CARD (desktop) ======
  return (
    <div
      className={cx(
        '',
        isMobile ? '' : ''
      )}
    >
      {/* Top App Bar (mobile) / Header (desktop) */}
      <div
        className={cx(
          'sticky top-0 z-10 bg-white/95 dark:bg-neutral-900/95 backdrop-blur  dark:border-neutral-800',
          isMobile ? 'px-0 py-3' : 'px-0 py-5'
        )}
      >
        <div className="flex items-center gap-3">
          
          {step > 1 && (
            <button
              type="button"
              onClick={() => go((step - 1) as 1 | 2 | 3)}
              className="p-2 -ml-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                  Step {step} of 3
                </p>
              </div>

              {/* Loan type toggle (compact) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLoanType('personal')}
                  className={cx(
                    'text-xs sm:text-sm px-3 py-1.5 rounded-full border transition',
                    loanType === ('personal' as LoanType)
                      ? 'border-primary-500/60 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-400/60'
                      : 'border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  )}
                >
                  Personal
                </button>
                <button
                  type="button"
                  onClick={() => setLoanType('business')}
                  className={cx(
                    'text-xs sm:text-sm px-3 py-1.5 rounded-full border transition',
                    loanType === ('business' as LoanType)
                      ? 'border-primary-500/60 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-400/60'
                      : 'border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  )}
                >
                  Business
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full">
              <div
                className="h-full bg-primary-500 dark:bg-primary-400 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={cx(isMobile ? 'px-0 pt-4 pb-28' : 'px-0 pt-6 pb-6')}>
        {/* First-time user info banner - only show on step 1 */}
        {step === 1 && (
          <div className="mb-5 mx-0">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
                    First time here? Here's how it works:
                  </h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-blue-800 dark:text-blue-400">Personal Loans</p>
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                          Request from friends & family. No account needed! Share your link with people you know.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-blue-800 dark:text-blue-400">Business Loans</p>
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                          Need a business lender? You'll need to create a free account for verification and security.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Amount + Purpose (combined) */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/30 p-4 mx-0">
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                How much do you need?
              </p>

              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setSelectedPresetIndex(null);
                  }}
                  placeholder="0.00"
                  className="w-full pl-12 pr-4 py-4 text-3xl font-bold rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
                {[100, 250, 500, 1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setAmount(String(amt));
                      setSelectedPresetIndex(null);
                    }}
                    className={cx(
                      'py-2 rounded-xl border text-xs sm:text-sm transition active:scale-[0.99]',
                      amount === String(amt)
                        ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-400'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800'
                    )}
                  >
                    {selectedCurrency?.symbol}
                    {amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="mx-4">
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                What's it for?
              </p>

              <div className="flex flex-wrap gap-2">
                {PURPOSES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPurpose(p.value)}
                    className={cx(
                      'px-3 py-2 rounded-full border text-sm transition active:scale-[0.99]',
                      purpose === p.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-400'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800'
                    )}
                  >
                    <span className="mr-1">{p.emoji}</span>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mx-4 p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm flex gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Schedule + Start date */}
        {step === 2 && (
          <div className="space-y-5 mx-0">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CalendarIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  Pick a repayment plan
                </p>
              </div>

              {repaymentPresets.length > 0 ? (
                <div className="space-y-2">
                  {repaymentPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedPresetIndex(idx)}
                      className={cx(
                        'w-full p-4 rounded-2xl border text-left transition active:scale-[0.99]',
                        selectedPresetIndex === idx
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 dark:border-primary-400'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-white">
                            {preset.installments} {preset.frequency} payments
                          </p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
                            {selectedCurrency?.symbol}
                            {preset.paymentAmount.toLocaleString()} each
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                          <Clock className="w-4 h-4" />
                          {preset.label}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 p-4 text-sm text-neutral-600 dark:text-neutral-300">
                  Enter an amount to see repayment options.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  When do you start paying?
                </p>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                Choose your first payment date (at least 7 days from now).
              </p>
              <CalendarPicker
                selectedDate={startDate}
                onDateSelect={setStartDate}
                minDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
                placeholder="Select start date"
              />
            </div>

            {error && <Alert type="error" message={error} />}
          </div>
        )}

        {/* STEP 3: Identity + Bank + Review + Submit */}
        {step === 3 && (
          <div className="space-y-5 mx-0">
            <div className="grid gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                  />
                </div>
              </div>
            </div>

            {/* Bank card */}
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 ">
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Bank connection
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      Required to receive funds if a lender accepts.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <Shield className="w-4 h-4" />
                    Secure
                  </div>
                </div>
              </div>

              <div className="p-4">
                {bankConnected && bankInfo ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center justify-center">
                        <Building className="w-5 h-5 text-green-700 dark:text-green-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-neutral-900 dark:text-white">
                            {bankInfo.bank_name}
                          </p>
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          ••••{bankInfo.account_mask} • {bankInfo.account_type}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setBankConnected(false);
                        setBankInfo(null);
                      }}
                      className="text-xs text-neutral-600 dark:text-neutral-300 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      onClick={handleConnectBank}
                      disabled={!plaidLoaded || plaidLoading || plaidConnecting || !fullName || !email}
                      className="w-full"
                      size="lg"
                    >
                      {plaidLoading || plaidConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {plaidConnecting ? 'Connecting…' : 'Loading…'}
                        </>
                      ) : (
                        <>
                          <Building className="w-4 h-4 mr-2" />
                          Connect bank
                        </>
                      )}
                    </Button>

                    {!fullName || !email ? (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Add name + email to connect.
                      </p>
                    ) : null}
                  </div>
                )}

                <div className="mt-4 flex items-start gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <Lock className="w-4 h-4 mt-0.5" />
                  We use Plaid to connect securely. We never see your bank login.
                </div>
              </div>
            </div>

            {/* Optional description */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Note (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Anything lenders should know (short and clear)…"
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 resize-none"
              />
            </div>

            {/* Compact review */}
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 p-4">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
                Summary
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Amount</p>
                  <p className="font-semibold text-primary-700 dark:text-primary-300">
                    {selectedCurrency?.symbol}
                    {parseFloat(amount || '0').toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Purpose</p>
                  <p className="font-medium text-neutral-800 dark:text-neutral-200">
                    {PURPOSES.find((p) => p.value === purpose)?.label || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Payment</p>
                  <p className="font-medium text-neutral-800 dark:text-neutral-200">
                    {selectedPreset
                      ? `${selectedCurrency?.symbol}${selectedPreset.paymentAmount.toLocaleString()}`
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Term</p>
                  <p className="font-medium text-neutral-800 dark:text-neutral-200">
                    {selectedPreset ? `${selectedPreset.installments} ${selectedPreset.frequency}` : '-'}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm flex gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom fixed actions (mobile "app" feel) / normal actions (desktop) */}
      <div
        className={cx(
          'border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur',
          isMobile ? 'fixed left-0 right-0 bottom-0 px-4 py-3' : 'px-6 py-4'
        )}
      >
        <div className={cx('flex items-center gap-2', isMobile ? '' : 'justify-between')}>
          {/* Left action */}
          {step !== 1 ? (
            <Button
              variant="outline"
              size="lg"
              className={cx(isMobile ? 'w-1/3' : 'w-auto')}
              onClick={() => go((step - 1) as 1 | 2 | 3)}
              type="button"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          ) : (
            <div className={cx(isMobile ? 'w-1/3' : '')} />
          )}

          {/* Right / primary action */}
          {step === 1 && (
            <Button
              size="lg"
              className={cx(isMobile ? 'flex-1' : 'w-auto')}
              disabled={!canGoNextStep1}
              onClick={() => {
                const n = parseFloat(amount);
                if (!amount || Number.isNaN(n) || n <= 0) {
                  setError('Enter a valid amount.');
                  return;
                }
                if (!purpose) {
                  setError('Select a purpose.');
                  return;
                }
                go(2);
              }}
              type="button"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {step === 2 && (
            <Button
              size="lg"
              className={cx(isMobile ? 'flex-1' : 'w-auto')}
              disabled={!canGoNextStep2}
              onClick={() => {
                if (selectedPresetIndex === null) {
                  setError('Select a repayment plan.');
                  return;
                }
                if (!startDate) {
                  setError('Select a start date.');
                  return;
                }
                go(3);
              }}
              type="button"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {step === 3 && (
            <Button
              size="lg"
              className={cx(isMobile ? 'flex-1' : 'w-auto')}
              disabled={!canSubmit || loading}
              onClick={handleSubmit}
              type="button"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  Submit <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>

        {!isMobile && (
          <div className="mt-3 px-4 text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-center gap-2 text-center">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span className="leading-snug">
              Your information is secure and never shared without your consent.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}