'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  CreditCard,
  Loader2,
  Wallet,
  Copy,
  Check,
  ExternalLink,
  Upload,
  X,
  Smartphone,
  DollarSign,
} from 'lucide-react';

// Payment app configurations
const PAYMENT_APPS = {
  cashapp: {
    id: 'cashapp',
    name: 'Cash App',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgLight: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon: '$',
    usernameField: 'cashapp_username',
    usernamePrefix: '$',
    getLink: (amount: number, username: string) => 
      `https://cash.app/$${username.replace(/^\$/, '')}/${amount}`,
    deepLink: (amount: number, username: string) => 
      `cashapp://cash.app/pay/$${username.replace(/^\$/, '')}?amount=${amount}`,
  },
  venmo: {
    id: 'venmo',
    name: 'Venmo',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgLight: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'V',
    usernameField: 'venmo_username',
    usernamePrefix: '@',
    getLink: (amount: number, username: string) => 
      `https://venmo.com/${username.replace(/^@/, '')}?txn=pay&amount=${amount}`,
    deepLink: (amount: number, username: string) => 
      `venmo://paycharge?txn=pay&recipients=${username.replace(/^@/, '')}&amount=${amount}`,
  },
  zelle: {
    id: 'zelle',
    name: 'Zelle',
    color: 'bg-purple-500',
    textColor: 'text-purple-700',
    bgLight: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    icon: 'Z',
    usernameField: 'zelle_email',
    usernamePrefix: '',
    getLink: () => 'https://www.zellepay.com/',
    deepLink: () => null,
  },
  paypal: {
    id: 'paypal',
    name: 'PayPal',
    color: 'bg-indigo-500',
    textColor: 'text-indigo-700',
    bgLight: 'bg-indigo-50 dark:bg-indigo-900/20',
    border: 'border-indigo-200 dark:border-indigo-800',
    icon: 'P',
    usernameField: 'paypal_email',
    usernamePrefix: '',
    getLink: (amount: number, email: string) => 
      `https://www.paypal.com/paypalme/${email}/${amount}`,
    deepLink: () => null,
  },
};

type PaymentAppKey = keyof typeof PAYMENT_APPS;

export default function FundLoanPage() {
  const params = useParams();
  const router = useRouter();
  const loanId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loan, setLoan] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [isDwollaEnabled, setIsDwollaEnabled] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(true);
  
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [confirmManualSent, setConfirmManualSent] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Get borrower's available payment methods
  const getBorrowerPaymentMethods = () => {
    if (!loan?.borrower) return [];
    
    const methods: { app: typeof PAYMENT_APPS[PaymentAppKey]; username: string }[] = [];
    const borrower = loan.borrower;
    
    // Check each payment method
    if (borrower.cashapp_username) {
      methods.push({ app: PAYMENT_APPS.cashapp, username: borrower.cashapp_username });
    }
    if (borrower.venmo_username) {
      methods.push({ app: PAYMENT_APPS.venmo, username: borrower.venmo_username });
    }
    if (borrower.zelle_email) {
      methods.push({ app: PAYMENT_APPS.zelle, username: borrower.zelle_email });
    }
    if (borrower.paypal_email) {
      methods.push({ app: PAYMENT_APPS.paypal, username: borrower.paypal_email });
    }
    
    // Sort by preferred method first
    if (borrower.preferred_payment_method && PAYMENT_APPS[borrower.preferred_payment_method as PaymentAppKey]) {
      methods.sort((a, b) => {
        if (a.app.id === borrower.preferred_payment_method) return -1;
        if (b.app.id === borrower.preferred_payment_method) return 1;
        return 0;
      });
    }
    
    return methods;
  };

  useEffect(() => {
    const fetchData = async () => {
      console.log('[Fund Page] Starting fetchData for loan:', loanId);
      const supabase = createClient();

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      console.log('[Fund Page] Auth check:', { userId: authUser?.id, error: authError?.message });
      
      if (!authUser) {
        console.log('[Fund Page] ❌ No auth user, redirecting to signin');
        router.push('/auth/signin');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      console.log('[Fund Page] Profile fetch:', { profileId: profile?.id, error: profileError?.message });
      setUser(profile);

      // Fetch loan with borrower info including payment methods
      let loanData: any = null;
      let loanError: any = null;

      // Try full query first
      const { data: fullLoanData, error: fullLoanError } = await supabase
        .from('loans')
        .select(`
          *,
          borrower:users!borrower_id(
            id, email, full_name, phone,
            dwolla_funding_source_url, bank_name, bank_account_mask,
            cashapp_username, venmo_username, zelle_email, paypal_email,
            preferred_payment_method
          ),
          business_lender:business_profiles!business_lender_id(id, business_name, contact_email, user_id)
        `)
        .eq('id', loanId)
        .single();

      if (fullLoanError) {
        console.log('[Fund Page] Full query failed:', fullLoanError.message);
        console.log('[Fund Page] Trying simplified query without JOINs...');
        
        // Fallback: simple query without JOINs
        const { data: simpleLoanData, error: simpleLoanError } = await supabase
          .from('loans')
          .select('*')
          .eq('id', loanId)
          .single();
        
        if (simpleLoanError) {
          console.log('[Fund Page] Simple query also failed:', simpleLoanError.message);
          loanError = simpleLoanError;
        } else {
          console.log('[Fund Page] Simple query succeeded, fetching related data separately...');
          loanData = simpleLoanData;
          
          // Fetch borrower separately
          if (simpleLoanData.borrower_id) {
            const { data: borrowerData } = await supabase
              .from('users')
              .select('id, email, full_name, phone, dwolla_funding_source_url, bank_name, bank_account_mask, cashapp_username, venmo_username, zelle_email, paypal_email, preferred_payment_method')
              .eq('id', simpleLoanData.borrower_id)
              .single();
            loanData.borrower = borrowerData;
          }
          
          // Fetch business_lender separately  
          if (simpleLoanData.business_lender_id) {
            const { data: businessData } = await supabase
              .from('business_profiles')
              .select('id, business_name, contact_email, user_id')
              .eq('id', simpleLoanData.business_lender_id)
              .single();
            loanData.business_lender = businessData;
          }
        }
      } else {
        loanData = fullLoanData;
      }

      console.log('[Fund Page] Loan fetch result:', { 
        loanId, 
        found: !!loanData, 
        error: loanError?.message,
        errorCode: loanError?.code,
        lender_id: loanData?.lender_id,
        business_lender_id: loanData?.business_lender_id,
        business_lender_user_id: loanData?.business_lender?.user_id,
        status: loanData?.status
      });

      if (loanError || !loanData) {
        console.log('[Fund Page] ❌ Loan not found or error, checking via debug API...');
        console.log('[Fund Page] Error details:', loanError);
        
        // Call debug API to check if it's an RLS issue
        try {
          const debugRes = await fetch(`/api/debug/fund-access?loan_id=${loanId}`);
          const debugData = await debugRes.json();
          console.log('[Fund Page] Debug API result:', debugData);
          
          if (debugData.loan?.found && !debugData.rls_test?.canReadWithUserSession) {
            console.log('[Fund Page] ⚠️ RLS ISSUE: Loan exists but user cannot read it');
            console.log('[Fund Page] Authorization info:', debugData.authorization);
          }
        } catch (e) {
          console.log('[Fund Page] Debug API error:', e);
        }
        
        router.push('/dashboard');
        return;
      }

      // Check if loan is already funded
      if (loanData.status === 'active' || loanData.funds_sent === true || loanData.disbursement_status === 'completed') {
        console.log('[Fund Page] ⚠️ Loan already funded, redirecting to loan page');
        console.log('[Fund Page] Loan status:', {
          status: loanData.status,
          funds_sent: loanData.funds_sent,
          disbursement_status: loanData.disbursement_status
        });
        router.push(`/loans/${loanId}`);
        return;
      }

      // Check if loan is not in a fundable state
      if (loanData.status !== 'pending' && loanData.status !== 'approved') {
        console.log('[Fund Page] ⚠️ Loan not in fundable state:', loanData.status);
        router.push(`/loans/${loanId}`);
        return;
      }

      // Also fetch from user_payment_methods table for more payment options
      if (loanData.borrower_id) {
        const { data: paymentMethods } = await supabase
          .from('user_payment_methods')
          .select(`
            id,
            account_identifier,
            account_name,
            is_verified,
            is_default,
            payment_provider:payment_providers(id, name, slug, icon_url)
          `)
          .eq('user_id', loanData.borrower_id)
          .eq('is_active', true);

        // Merge payment methods into borrower object
        if (paymentMethods && paymentMethods.length > 0 && loanData.borrower) {
          // Map provider slugs to our field names
          for (const pm of paymentMethods) {
            const slug = (pm.payment_provider as any)?.slug;
            if (slug === 'cashapp' && !loanData.borrower.cashapp_username) {
              loanData.borrower.cashapp_username = pm.account_identifier;
            } else if (slug === 'venmo' && !loanData.borrower.venmo_username) {
              loanData.borrower.venmo_username = pm.account_identifier;
            } else if (slug === 'zelle' && !loanData.borrower.zelle_email) {
              loanData.borrower.zelle_email = pm.account_identifier;
            } else if (slug === 'paypal' && !loanData.borrower.paypal_email) {
              loanData.borrower.paypal_email = pm.account_identifier;
            }
            // Set preferred if marked as default
            if (pm.is_default && !loanData.borrower.preferred_payment_method) {
              loanData.borrower.preferred_payment_method = slug;
            }
          }
        }
      }

      // Check authorization
      // For business loans, lender_id might be NULL - only business_lender_id is set
      console.log('[Fund Page] Authorization check:', {
        authUserId: authUser.id,
        lender_id: loanData.lender_id,
        business_lender_id: loanData.business_lender_id,
        business_lender_user_id: loanData.business_lender?.user_id,
        isDirectLender: loanData.lender_id === authUser.id,
      });

      let isAuthorized = false;
      
      // Check if user is direct lender
      if (loanData.lender_id && loanData.lender_id === authUser.id) {
        isAuthorized = true;
        console.log('[Fund Page] ✅ User is direct lender');
      }
      
      // Check if user owns the business lender
      if (!isAuthorized && loanData.business_lender_id) {
        // First check if business_lender object has user_id
        if (loanData.business_lender?.user_id === authUser.id) {
          isAuthorized = true;
          console.log('[Fund Page] ✅ User owns business lender (from joined data)');
        } else {
          // Fallback: query business_profiles directly
          const { data: business, error: bizError } = await supabase
            .from('business_profiles')
            .select('user_id')
            .eq('id', loanData.business_lender_id)
            .single();
          
          console.log('[Fund Page] Business lender query:', {
            business_user_id: business?.user_id,
            matches: business?.user_id === authUser.id,
            error: bizError?.message
          });
          
          if (business?.user_id === authUser.id) {
            isAuthorized = true;
            console.log('[Fund Page] ✅ User owns business lender (from direct query)');
          }
        }
      }

      if (!isAuthorized) {
        console.log('[Fund Page] ❌ User not authorized (not the lender), redirecting to dashboard');
        router.push('/dashboard');
        return;
      }

      console.log('[Fund Page] ✅ Authorization passed, loading loan');
      setLoan(loanData);
      setIsLoading(false);
      
      try {
        const ppRes = await fetch('/api/payment-methods?country=US&type=disbursement&debug=true');
        if (ppRes.ok) {
          const ppData = await ppRes.json();
          console.log('[Fund Page] Payment methods response:', ppData);
          console.log('[Fund Page] Available providers:', ppData.providers?.map((p: any) => p.slug));
          const dwollaEnabled = (ppData.providers || []).some((p: any) => p.slug === 'dwolla');
          console.log('[Fund Page] Dwolla enabled:', dwollaEnabled);
          setIsDwollaEnabled(dwollaEnabled);
        } else {
          console.error('[Fund Page] Failed to fetch payment methods:', ppRes.status);
        }
      } catch (e) {
        console.error('Failed to fetch payment providers:', e);
      }
      setLoadingProviders(false);
    };

    fetchData();
  }, [loanId, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setError('Please upload an image or PDF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setReceiptFile(file);
      setError(null);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setReceiptPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setReceiptPreview(null);
      }
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFundLoan = async () => {
    if (!agreementAccepted) {
      setError('Please accept the loan agreement to proceed');
      return;
    }

    if (!isDwollaEnabled) {
      if (!confirmManualSent) {
        setError('Please confirm that you have sent the funds');
        return;
      }
      if (!receiptFile) {
        setError('Please upload a screenshot or receipt of your payment');
        return;
      }
    }

    setIsFunding(true);
    setError(null);

    try {
      let receiptUrl = null;
      if (receiptFile) {
        setUploadingReceipt(true);
        const formData = new FormData();
        formData.append('file', receiptFile);
        formData.append('loanId', loanId);
        formData.append('type', 'disbursement_receipt');
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          receiptUrl = uploadData.url;
        }
        setUploadingReceipt(false);
      }

      const response = await fetch(`/api/loans/${loanId}/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agreementAccepted: true,
          ...(!isDwollaEnabled && {
            manualPayment: true,
            paymentMethod: selectedApp || 'other',
            transactionRef: transactionRef || null,
            receiptUrl,
          }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fund loan');
      }

      setSuccess(true);
      setTimeout(() => router.push(`/loans/${loanId}`), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to fund loan');
    } finally {
      setIsFunding(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const openPaymentApp = (app: typeof PAYMENT_APPS[PaymentAppKey], username: string) => {
    const amount = loan?.amount || 0;
    
    const deepLink = app.deepLink(amount, username);
    if (deepLink) {
      window.location.href = deepLink;
      setTimeout(() => {
        window.open(app.getLink(amount, username), '_blank');
      }, 500);
    } else {
      window.open(app.getLink(amount, username), '_blank');
    }
    
    setSelectedApp(app.id);
  };

  if (isLoading || loadingProviders) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!loan) return null;

  const borrower = loan.borrower;
  const borrowerPaymentMethods = getBorrowerPaymentMethods();
  const hasPaymentMethods = borrowerPaymentMethods.length > 0;

  const borrowerBankConnected = loan.borrower_bank_connected || loan.borrower_dwolla_funding_source_url || borrower?.dwolla_funding_source_url;
  const lenderBankConnected = user?.dwolla_funding_source_url;

  const canFundACH = borrowerBankConnected && lenderBankConnected && agreementAccepted;
  const canFundManual = agreementAccepted && confirmManualSent && receiptFile;
  const canFund = isDwollaEnabled ? canFundACH : canFundManual;

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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <p className="text-neutral-500">Send {formatCurrency(loan.amount, loan.currency)} to {borrower?.full_name}</p>
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
                  <p className="font-medium text-neutral-900 dark:text-white">{borrower?.full_name || 'Unknown'}</p>
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

            {/* Payment Section */}
            {isDwollaEnabled ? (
              /* ACH Flow */
              <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Building className="w-4 h-4" /> Bank Transfer
                </h3>
                <div className={`p-4 rounded-xl border ${lenderBankConnected ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">
                    Your Bank: {lenderBankConnected ? `${user?.bank_name} (••••${user?.bank_account_mask})` : 'Not Connected'}
                  </p>
                </div>
                <div className={`p-4 rounded-xl border ${borrowerBankConnected ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">
                    Borrower Bank: {borrowerBankConnected ? `${borrower?.bank_name} (••••${borrower?.bank_account_mask})` : 'Not Connected'}
                  </p>
                </div>
              </div>
            ) : (
              /* Manual Payment Flow - Show only borrower's configured methods */
              <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> Send Payment to {borrower?.full_name}
                </h3>

                {hasPaymentMethods ? (
                  <>
                    {/* Payment Method Buttons - Only show what borrower has configured */}
                    <div className={`grid gap-3 ${borrowerPaymentMethods.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {borrowerPaymentMethods.map(({ app, username }) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => openPaymentApp(app, username)}
                          className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                            selectedApp === app.id
                              ? `${app.border} ${app.bgLight} ring-2 ring-offset-2`
                              : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 bg-white dark:bg-neutral-800'
                          }`}
                        >
                          <div className={`w-12 h-12 ${app.color} rounded-xl flex items-center justify-center text-white font-bold text-xl`}>
                            {app.icon}
                          </div>
                          <div className="text-left flex-1">
                            <p className="font-semibold text-neutral-900 dark:text-white">{app.name}</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                              {app.usernamePrefix}{username}
                            </p>
                          </div>
                          <ExternalLink className="w-5 h-5 text-neutral-400" />
                        </button>
                      ))}
                    </div>

                    {/* Amount to send */}
                    <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl text-center">
                      <p className="text-sm text-primary-700 dark:text-primary-300 mb-1">Send exactly</p>
                      <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                        {formatCurrency(loan.amount, loan.currency)}
                      </p>
                    </div>

                    {/* Copy username button for selected app */}
                    {selectedApp && (
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                        <div>
                          <p className="text-xs text-neutral-500">
                            {PAYMENT_APPS[selectedApp as PaymentAppKey]?.name} Username
                          </p>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {PAYMENT_APPS[selectedApp as PaymentAppKey]?.usernamePrefix}
                            {borrowerPaymentMethods.find(m => m.app.id === selectedApp)?.username}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const method = borrowerPaymentMethods.find(m => m.app.id === selectedApp);
                            if (method) copyToClipboard(method.username, 'username');
                          }}
                          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"
                        >
                          {copied === 'username' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-neutral-400" />}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  /* No payment methods configured */
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-300">
                          No payment methods set up
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                          {borrower?.full_name} hasn't added their Cash App, Venmo, Zelle, or PayPal info yet. 
                          Please contact them to get their payment details.
                        </p>
                        {borrower?.email && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-sm text-amber-700 dark:text-amber-400">Email:</span>
                            <span className="font-medium text-amber-800 dark:text-amber-300">{borrower.email}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(borrower.email, 'email')}
                              className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded"
                            >
                              {copied === 'email' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-amber-600" />}
                            </button>
                          </div>
                        )}
                        {borrower?.phone && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm text-amber-700 dark:text-amber-400">Phone:</span>
                            <span className="font-medium text-amber-800 dark:text-amber-300">{borrower.phone}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(borrower.phone, 'phone')}
                              className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded"
                            >
                              {copied === 'phone' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-amber-600" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Transaction Reference */}
                <Input
                  label="Transaction ID / Confirmation Number (optional)"
                  placeholder="e.g., Cash App confirmation number"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="bg-white dark:bg-neutral-800"
                />

                {/* Receipt Upload - REQUIRED */}
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
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 transition-colors"
                    >
                      <Upload className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Click to upload payment screenshot
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">PNG, JPG, or PDF up to 10MB</p>
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Confirmation Checkbox */}
                <label className="flex items-start gap-3 cursor-pointer p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <input
                    type="checkbox"
                    checked={confirmManualSent}
                    onChange={(e) => setConfirmManualSent(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 bg-white dark:bg-neutral-800"
                  />
                  <span className="text-sm text-amber-800 dark:text-amber-300">
                    <strong>I confirm that I have sent {formatCurrency(loan.amount, loan.currency)}</strong> to {borrower?.full_name}
                    {selectedApp && borrowerPaymentMethods.find(m => m.app.id === selectedApp) && (
                      <> via {PAYMENT_APPS[selectedApp as PaymentAppKey]?.name}</>
                    )}.
                  </span>
                </label>
              </div>
            )}

            {/* Loan Agreement */}
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Loan Agreement
              </h3>
              
              <div className="text-sm text-neutral-600 dark:text-neutral-300 space-y-2 max-h-40 overflow-y-auto mb-4 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                <p>I agree to lend {formatCurrency(loan.amount, loan.currency)} to {borrower?.full_name}.</p>
                <p>Total repayment: {formatCurrency(loan.total_amount || loan.amount, loan.currency)}</p>
                <p>Payments: {loan.total_installments} × {formatCurrency(loan.repayment_amount || 0, loan.currency)}</p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreementAccepted}
                  onChange={(e) => setAgreementAccepted(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 bg-white dark:bg-neutral-800"
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
              onClick={handleFundLoan}
              disabled={!canFund || isFunding}
              className="w-full"
              size="lg"
            >
              {isFunding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploadingReceipt ? 'Uploading receipt...' : 'Processing...'}
                </>
              ) : isDwollaEnabled ? (
                <>
                  <Banknote className="w-4 h-4 mr-2" />
                  Send {formatCurrency(loan.amount, loan.currency)} via Bank Transfer
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Payment Sent
                </>
              )}
            </Button>

            {!isDwollaEnabled && !receiptFile && (
              <p className="text-xs text-amber-600 text-center mt-2">
                ⚠️ Receipt upload is required to confirm payment
              </p>
            )}

            <p className="text-xs text-neutral-500 text-center mt-3 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              {isDwollaEnabled 
                ? 'Funds arrive in 1-3 business days'
                : 'Borrower will confirm receipt of your payment'
              }
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
