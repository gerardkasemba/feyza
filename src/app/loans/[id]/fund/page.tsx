'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('fund_page');

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout';
import { Card, Button, Badge, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Building,
  FileText,
  Banknote,
  Clock,
  Shield,
  User,
  Calendar,
  CreditCard,
  Loader2,
  Upload,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  X,
} from 'lucide-react';

export default function FundLoanPage() {
  const params = useParams();
  const router = useRouter();
  const loanId = params.id as string;

  const [loan, setLoan] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Payment provider state
  const [isDwollaEnabled, setIsDwollaEnabled] = useState(false);
  
  // Manual payment state
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [confirmManualSent, setConfirmManualSent] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Borrower's preferred payment method (from API so lender can see it despite RLS)
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<{
    slug: string;
    name: string;
    account_identifier: string;
    account_name?: string; // Zelle: recipient's full name
  } | null>(null);
  const [loadingPreferredMethod, setLoadingPreferredMethod] = useState(false);
  // Fund-details from API (borrower name + email when loan.borrower is hidden by RLS)
  const [fundDetails, setFundDetails] = useState<{
    borrowerName: string;
    borrowerEmail: string | null;
  } | null>(null);

  // Check payment providers
  useEffect(() => {
    const checkProviders = async () => {
      try {
        // Use the public payment-providers API with cache-busting
        const response = await fetch('/api/payment-providers', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });
        if (response.ok) {
          const data = await response.json();
          // Check if Dwolla (ACH auto-pay) is enabled
          const dwollaEnabled = data.dwollaEnabled === true || data.autoPayEnabled === true;
          log.debug('[Fund Page] Payment providers check:', { dwollaEnabled, data });
          setIsDwollaEnabled(dwollaEnabled);
        } else {
          log.warn('[Fund Page] Payment providers API returned non-OK status:', response.status);
          setIsDwollaEnabled(false);
        }
      } catch (err) {
        log.error('[Fund Page] Error checking providers:', err);
        // Default to manual payment if we can't check
        setIsDwollaEnabled(false);
      } finally {
        setLoadingProviders(false);
      }
    };
    checkProviders();
  }, []);

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

      setUser(profile);

      // Fetch loan with borrower info
      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select(`
          *,
          borrower:users!borrower_id(*),
          business_lender:business_profiles!business_lender_id(*)
        `)
        .eq('id', loanId)
        .single();

      if (loanError || !loanData) {
        router.push('/dashboard');
        return;
      }

      // Verify user is authorized (is the lender or business owner)
      let isAuthorized = loanData.lender_id === authUser.id;
      
      if (!isAuthorized && loanData.business_lender_id) {
        const { data: business } = await supabase
          .from('business_profiles')
          .select('user_id')
          .eq('id', loanData.business_lender_id)
          .single();
        
        isAuthorized = business?.user_id === authUser.id;
      }

      if (!isAuthorized) {
        router.push('/dashboard');
        return;
      }

      setLoan(loanData);
      setIsLoading(false);
    };

    fetchData();
  }, [loanId, router]);

  // Fetch borrower name + preferred payment method from API (works even when RLS hides loan.borrower)
  useEffect(() => {
    const fetchFundDetails = async () => {
      if (!loanId || !loan?.id) return;

      setLoadingPreferredMethod(true);
      setFundDetails(null);
      setPreferredPaymentMethod(null);
      try {
        const res = await fetch(`/api/loans/${loanId}/fund-details`);
        if (!res.ok) return;
        const data = await res.json();
        setFundDetails({
          borrowerName: data.borrowerName || 'the borrower',
          borrowerEmail: data.borrowerEmail ?? null,
        });
        if (data.preferredPaymentMethod) {
          setPreferredPaymentMethod(data.preferredPaymentMethod);
          setSelectedApp(data.preferredPaymentMethod.slug);
        }
      } catch (err) {
        log.error('Error fetching fund details:', err);
      } finally {
        setLoadingPreferredMethod(false);
      }
    };

    fetchFundDetails();
  }, [loanId, loan?.id]);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      log.error('Failed to copy:', err);
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  // Handle ACH funding
  const handleFundLoanACH = async () => {
    if (!agreementAccepted) {
      setError('Please accept the loan agreement to proceed');
      return;
    }

    setIsFunding(true);
    setError(null);

    try {
      const response = await fetch(`/api/loans/${loanId}/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fund loan');
      }

      setSuccess(true);
      setTimeout(() => router.push(`/loans/${loanId}`), 2000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fund loan');
    } finally {
      setIsFunding(false);
    }
  };

  // Handle manual funding
  const handleFundLoanManual = async () => {
    if (!agreementAccepted) {
      setError('Please accept the loan agreement to proceed');
      return;
    }
    if (!confirmManualSent) {
      setError('Please confirm you have sent the funds');
      return;
    }
    if (!receiptFile) {
      setError('Please upload a receipt or screenshot of your payment');
      return;
    }

    setIsFunding(true);
    setError(null);

    try {
      // Upload receipt first
      let receiptUrl = null;
      if (receiptFile) {
        const supabase = createClient();
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${loanId}-funding-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('payment-receipts')
          .upload(fileName, receiptFile);
        
        if (uploadError) {
          log.error('Upload error:', uploadError);
        } else if (uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('payment-receipts')
            .getPublicUrl(fileName);
          receiptUrl = publicUrl;
        }
      }

      // Call the fund API with manual payment info
      const response = await fetch(`/api/loans/${loanId}/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agreementAccepted: true,
          manualPayment: true,
          paymentMethod: selectedApp || 'other',
          transactionRef: transactionRef,
          receiptUrl: receiptUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fund loan');
      }

      setSuccess(true);
      setTimeout(() => router.push(`/loans/${loanId}`), 2000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fund loan');
    } finally {
      setIsFunding(false);
    }
  };


  if (isLoading || loadingProviders || loadingPreferredMethod) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!loan) return null;

  const borrower = loan.borrower;
  const borrowerDisplayName =
    fundDetails?.borrowerName ??
    loan.borrower_name ??
    borrower?.full_name ??
    'the borrower';
  const borrowerDisplayEmail = fundDetails?.borrowerEmail ?? borrower?.email ?? null;
  const hasPreferredPaymentMethod = !!preferredPaymentMethod;

  // Helper: get icon and display prefix for a payment provider slug
  const getProviderDisplay = (slug: string) => {
    const map: Record<string, { prefix: string; icon: string; color: string; getLink?: (amount: number, id: string) => string }> = {
      cashapp: { prefix: '$', icon: '$', color: '#00D632', getLink: (a, u) => `https://cash.app/${u}/${a}` },
      venmo:   { prefix: '@', icon: 'V', color: '#008CFF', getLink: (a, u) => `https://venmo.com/${u}?txn=pay&amount=${a}` },
      zelle:   { prefix: '',  icon: 'Z', color: '#6D1ED4' },
      paypal:  { prefix: '',  icon: 'P', color: '#003087', getLink: (a, u) => `https://paypal.me/${u}/${a}` },
    };
    return map[slug] ?? { prefix: '', icon: '?', color: '#888888' };
  };

  const borrowerBankConnected = loan.borrower_bank_connected || loan.borrower_dwolla_funding_source_url || borrower?.dwolla_funding_source_url;
  const lenderBankConnected = user?.dwolla_funding_source_url;

  const canFundACH = borrowerBankConnected && lenderBankConnected && agreementAccepted;
  const canFundManual = agreementAccepted && confirmManualSent && receiptFile;

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
        <Navbar user={user} />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md text-center p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              {isDwollaEnabled ? 'Funds Sent!' : 'Loan Funded!'}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              {isDwollaEnabled 
                ? `Transfer of ${formatCurrency(loan.amount, loan.currency)} initiated.`
                : `You've confirmed sending ${formatCurrency(loan.amount, loan.currency)}.`
              }
            </p>
            <p className="text-sm text-neutral-400 mt-4">Redirecting...</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <Navbar user={user} />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href={`/loans/${loanId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to loan details
          </Link>

          <Card className="mb-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                <Banknote className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Fund This Loan</h1>
                <p className="text-neutral-500">Send {formatCurrency(loan.amount, loan.currency)} to {borrowerDisplayName}</p>
              </div>
            </div>

            {/* Loan Summary */}
            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Loan Summary
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-neutral-500">Borrower</span>
                  <p className="font-medium text-neutral-900 dark:text-white">{borrowerDisplayName}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Amount</span>
                  <p className="font-bold text-lg text-primary-600">{formatCurrency(loan.amount, loan.currency)}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Total Repayment</span>
                  <p className="font-medium text-neutral-900 dark:text-white">{formatCurrency(loan.total_amount || loan.amount, loan.currency)}</p>
                </div>
                <div>
                  <span className="text-neutral-500">First Payment</span>
                  <p className="font-medium text-neutral-900 dark:text-white">{loan.start_date ? formatDate(loan.start_date) : 'TBD'}</p>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            {isDwollaEnabled ? (
              /* ACH Transfer Flow */
              <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Bank Transfer (ACH)
                </h3>

                {/* Lender Bank */}
                <div className={`p-4 rounded-xl border ${lenderBankConnected ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${lenderBankConnected ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                        <CreditCard className={`w-5 h-5 ${lenderBankConnected ? 'text-green-600' : 'text-red-600'}`} />
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500">From: Your Bank</p>
                        {lenderBankConnected ? (
                          <p className="font-medium text-neutral-900 dark:text-white">{user?.bank_name || 'Connected'}</p>
                        ) : (
                          <p className="font-medium text-red-700 dark:text-red-400">Not Connected</p>
                        )}
                      </div>
                    </div>
                    {lenderBankConnected ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Link href="/settings?tab=bank" className="text-sm text-primary-600 hover:underline">Connect →</Link>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                    <ArrowLeft className="w-4 h-4 text-neutral-400 rotate-[-90deg]" />
                  </div>
                </div>

                {/* Borrower Bank */}
                <div className={`p-4 rounded-xl border ${borrowerBankConnected ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${borrowerBankConnected ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                        <User className={`w-5 h-5 ${borrowerBankConnected ? 'text-green-600' : 'text-red-600'}`} />
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500">To: {borrower?.full_name}'s Bank</p>
                        {borrowerBankConnected ? (
                          <p className="font-medium text-neutral-900 dark:text-white">{borrower?.bank_name || 'Connected'}</p>
                        ) : (
                          <p className="font-medium text-red-700 dark:text-red-400">Not Connected</p>
                        )}
                      </div>
                    </div>
                    {borrowerBankConnected && <CheckCircle className="w-5 h-5 text-green-600" />}
                  </div>
                </div>

                {!borrowerBankConnected && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      The borrower hasn't connected their bank yet. Please ask them to connect in Settings.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Manual Payment Flow */
              <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Send via Payment App
                </h3>

                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Send {formatCurrency(loan.amount, loan.currency)} to {borrowerDisplayName}'s preferred payment method:
                </p>

                {hasPreferredPaymentMethod ? (() => {
                  const { slug, name, account_identifier, account_name } = preferredPaymentMethod!;
                  const display = getProviderDisplay(slug);
                  const cleanIdentifier = account_identifier
                    .replace(/^\$/, '')
                    .replace(/^@/, '');
                  const displayIdentifier = `${display.prefix}${cleanIdentifier}`;
                  const paymentLink = display.getLink?.(loan.amount, cleanIdentifier);

                  // Zelle: pull full contact info from borrower profile (legacy fields)
                  const zelleEmail = slug === 'zelle' ? (borrower?.zelle_email || null) : null;
                  const zellePhone = slug === 'zelle' ? (borrower?.zelle_phone || null) : null;
                  const zelleName = slug === 'zelle' ? (account_name || borrowerDisplayName || null) : null;

                  return (
                    <>
                      {/* Single preferred payment method card */}
                      <div className="p-4 rounded-xl border-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                            style={{ backgroundColor: display.color }}
                          >
                            {display.icon}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-neutral-900 dark:text-white">{name}</p>
                            {slug !== 'zelle' && (
                              <p className="text-sm text-neutral-500">{displayIdentifier}</p>
                            )}
                          </div>
                          <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                            Preferred
                          </span>
                        </div>

                        {/* Zelle: show full contact details */}
                        {slug === 'zelle' && (
                          <div className="mt-3 p-3 bg-[#6D1ED4]/10 dark:bg-[#6D1ED4]/20 rounded-lg border border-[#6D1ED4]/30 space-y-2">
                            {zelleName && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-[#6D1ED4] uppercase tracking-wide">Name</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-neutral-900 dark:text-white">{zelleName}</span>
                                  <button onClick={() => copyToClipboard(zelleName, 'zelle-name')} className="p-1 hover:bg-[#6D1ED4]/20 rounded">
                                    {copied === 'zelle-name' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-[#6D1ED4]" />}
                                  </button>
                                </div>
                              </div>
                            )}
                            {zelleEmail && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-[#6D1ED4] uppercase tracking-wide">Email</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm text-neutral-800 dark:text-neutral-200">{zelleEmail}</span>
                                  <button onClick={() => copyToClipboard(zelleEmail, 'zelle-email')} className="p-1 hover:bg-[#6D1ED4]/20 rounded">
                                    {copied === 'zelle-email' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-[#6D1ED4]" />}
                                  </button>
                                </div>
                              </div>
                            )}
                            {zellePhone && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-[#6D1ED4] uppercase tracking-wide">Phone</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm text-neutral-800 dark:text-neutral-200">{zellePhone}</span>
                                  <button onClick={() => copyToClipboard(zellePhone, 'zelle-phone')} className="p-1 hover:bg-[#6D1ED4]/20 rounded">
                                    {copied === 'zelle-phone' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-[#6D1ED4]" />}
                                  </button>
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-[#6D1ED4]/70 pt-1 border-t border-[#6D1ED4]/20">
                              Open your bank app → verify name matches → send via Zelle
                            </p>
                          </div>
                        )}

                        {/* Amount to send */}
                        <div className="mt-3 p-3 bg-white dark:bg-neutral-800 rounded-lg border border-primary-200 dark:border-primary-700">
                          <p className="text-xs text-neutral-500 mb-0.5">Amount to Send</p>
                          <p className="text-2xl font-bold text-primary-600">
                            {formatCurrency(loan.amount, loan.currency)}
                          </p>
                        </div>

                        {/* Copy identifier (non-Zelle) + open app */}
                        {slug !== 'zelle' && (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(displayIdentifier, 'identifier')}
                              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                            >
                              {copied === 'identifier'
                                ? <><Check className="w-4 h-4 text-green-500" /> Copied!</>
                                : <><Copy className="w-4 h-4 text-neutral-400" /> Copy {name} ID</>
                              }
                            </button>

                            {paymentLink && (
                              <button
                                type="button"
                                onClick={() => window.open(paymentLink, '_blank')}
                                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm text-white transition"
                                style={{ backgroundColor: display.color }}
                              >
                                <ExternalLink className="w-4 h-4" />
                                Open {name}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Transaction Reference */}
                      <Input
                        label="Transaction ID / Confirmation Number (optional)"
                        placeholder={`e.g., ${name} confirmation number`}
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        className="bg-white dark:bg-neutral-800"
                      />

                      {/* Receipt Upload */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Payment Receipt / Screenshot <span className="text-red-500">*</span>
                        </label>
                        
                        {receiptFile ? (
                          <div className="relative border-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                              {receiptPreview ? (
                                <img src={receiptPreview} alt="Receipt" className="w-16 h-16 object-cover rounded-lg" />
                              ) : (
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                  <FileText className="w-8 h-8 text-green-600" />
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-green-800 dark:text-green-300">{receiptFile.name}</p>
                                <p className="text-sm text-green-600 dark:text-green-400">
                                  {(receiptFile.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={removeReceipt}
                                className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"
                              >
                                <X className="w-5 h-5 text-green-600" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 transition-colors bg-neutral-50 dark:bg-neutral-800/50">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 mb-2 text-neutral-400" />
                              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                <span className="font-semibold text-primary-600">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-neutral-400">PNG, JPG, PDF up to 10MB</p>
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*,.pdf"
                              onChange={handleReceiptUpload}
                            />
                          </label>
                        )}
                      </div>

                      {/* Confirmation Checkbox */}
                      <label className="flex items-start gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confirmManualSent}
                          onChange={(e) => setConfirmManualSent(e.target.checked)}
                          className="w-5 h-5 mt-0.5 rounded border-neutral-300 dark:border-neutral-600 text-primary-600"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          I confirm that I have sent {formatCurrency(loan.amount, loan.currency)} to {borrowerDisplayName} via {name} ({displayIdentifier})
                        </span>
                      </label>
                    </>
                  );
                })() : (
                  /* No preferred payment method */
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-300">
                          No preferred payment method set
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                          {borrowerDisplayName} hasn't set a preferred payment method yet.
                          Please contact them to get their Cash App, Venmo, or Zelle details.
                        </p>
                        {borrowerDisplayEmail && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-sm text-amber-700 dark:text-amber-400">Email:</span>
                            <span className="font-medium text-amber-800 dark:text-amber-300">{borrowerDisplayEmail}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(borrowerDisplayEmail, 'email')}
                              className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded"
                            >
                              {copied === 'email' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-amber-600" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Loan Agreement */}
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Loan Agreement
              </h3>
              
              <div className="text-sm text-neutral-600 dark:text-neutral-300 space-y-2 max-h-48 overflow-y-auto mb-4 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                <p><strong className="text-neutral-900 dark:text-white">1. Loan Terms</strong></p>
                <p>
                  I agree to lend {formatCurrency(loan.amount, loan.currency)} to {borrower?.full_name || 'the borrower'} and 
                  will receive a total repayment of {formatCurrency(loan.total_amount || loan.amount, loan.currency)}.
                </p>
                
                <p><strong className="text-neutral-900 dark:text-white">2. Repayment Schedule</strong></p>
                <p>
                  The borrower will make {loan.total_installments} payments of {formatCurrency(loan.repayment_amount || 0, loan.currency)} each,
                  starting on {loan.start_date ? formatDate(loan.start_date) : 'the agreed date'}.
                </p>
                
                <p><strong className="text-neutral-900 dark:text-white">3. Interest Rate</strong></p>
                <p>
                  Interest Rate: {loan.interest_rate ? `${loan.interest_rate}% (${loan.interest_type || 'simple'})` : '0%'}
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreementAccepted}
                  onChange={(e) => setAgreementAccepted(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-neutral-300 dark:border-neutral-600 text-primary-600"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  I have read and agree to the loan agreement terms.
                </span>
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                <p className="text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              </div>
            )}

            {/* Fund Button */}
            <Button
              onClick={isDwollaEnabled ? handleFundLoanACH : handleFundLoanManual}
              disabled={isDwollaEnabled ? !canFundACH : !canFundManual || isFunding}
              className="w-full"
              size="lg"
            >
              {isFunding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Banknote className="w-4 h-4 mr-2" />
                  {isDwollaEnabled 
                    ? `Sign & Send ${formatCurrency(loan.amount, loan.currency)}`
                    : `Confirm Funding of ${formatCurrency(loan.amount, loan.currency)}`
                  }
                </>
              )}
            </Button>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-3 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              {isDwollaEnabled 
                ? 'Funds will be transferred via ACH (1-3 business days)'
                : 'The borrower will be notified once you confirm'
              }
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}