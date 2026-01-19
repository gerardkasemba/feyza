'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Badge, Breadcrumbs } from '@/components/ui';
import { 
  DollarSign, 
  User, 
  Calendar, 
  Percent,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Calculator,
  Clock,
  ThumbsUp,
  Edit3,
  Building,
  Shield,
  Loader2,
  Sparkles,
  AlertTriangle,
  Info,
  Target
} from 'lucide-react';
import { FaLightbulb, FaExclamationTriangle } from 'react-icons/fa';
import { formatCurrency } from '@/lib/utils';

interface LoanData {
  id: string;
  amount: number;
  currency: string;
  purpose?: string;
  borrower_invite_email: string;
  borrower_name?: string;
  status: string;
  // Proposed schedule from borrower
  proposed_frequency?: string;
  proposed_installments?: number;
  proposed_payment_amount?: number;
}

export default function LenderSetupLoanPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const loanId = params.id as string;
  const token = searchParams.get('token');

  const [loan, setLoan] = useState<LoanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Whether to use borrower's proposal or custom terms
  const [useProposal, setUseProposal] = useState(true);
  
  // Form state (custom terms)
  const [interestRate, setInterestRate] = useState('0');
  const [interestType, setInterestType] = useState<'simple' | 'compound'>('simple');
  const [repaymentFrequency, setRepaymentFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [totalInstallments, setTotalInstallments] = useState('12');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Lender details
  const [lenderName, setLenderName] = useState('');
  const [lenderEmail, setLenderEmail] = useState('');

  // Bank connection state
  const [bankConnected, setBankConnected] = useState(false);
  const [bankInfo, setBankInfo] = useState<any>(null);
  
  // Plaid state
  const [plaidLoaded, setPlaidLoaded] = useState(false);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [plaidConnecting, setPlaidConnecting] = useState(false);

  // Load Plaid script
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

  useEffect(() => {
    if (loanId && token) {
      fetchLoan();
    }
  }, [loanId, token]);

  const fetchLoan = async () => {
    try {
      const response = await fetch(`/api/lender/setup-loan/${loanId}?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load loan');
      }

      setLoan(data.loan);
      
      // Pre-fill with borrower's proposal if available
      if (data.loan.proposed_frequency) {
        setRepaymentFrequency(data.loan.proposed_frequency);
      }
      if (data.loan.proposed_installments) {
        setTotalInstallments(String(data.loan.proposed_installments));
      }
      // Use borrower's proposed start date if available
      if (data.loan.proposed_start_date) {
        setStartDate(data.loan.proposed_start_date);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Plaid connection
  const handleConnectBank = useCallback(async () => {
    if (!lenderName || !lenderEmail) {
      alert('Please enter your name and email first');
      return;
    }

    if (!plaidLoaded || !(window as any).Plaid) {
      alert('Bank connection is loading. Please try again.');
      return;
    }

    setPlaidLoading(true);

    try {
      // Get link token
      const tokenResponse = await fetch('/api/plaid/guest-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: lenderName, email: lenderEmail }),
      });
      
      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        alert(tokenData.error);
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
                name: lenderName,
                email: lenderEmail,
              }),
            });
            
            const exchangeData = await exchangeResponse.json();
            
            if (exchangeData.error) {
              alert(exchangeData.error);
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
              });
            }
          } catch (err: any) {
            alert(err.message || 'Failed to connect bank');
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
      alert(err.message || 'Failed to initialize bank connection');
      setPlaidLoading(false);
    }
  }, [lenderName, lenderEmail, plaidLoaded]);

  // Calculate repayment details
  const calculateRepayment = () => {
    if (!loan) return { totalInterest: 0, totalAmount: 0, repaymentAmount: 0 };

    const principal = loan.amount;
    const rate = parseFloat(interestRate) / 100;
    const installments = parseInt(totalInstallments);

    let totalInterest = 0;
    if (interestType === 'simple') {
      totalInterest = principal * rate * (installments / 12);
    } else {
      const periodsPerYear = repaymentFrequency === 'weekly' ? 52 : repaymentFrequency === 'biweekly' ? 26 : 12;
      const periodicRate = rate / periodsPerYear;
      totalInterest = principal * Math.pow(1 + periodicRate, installments) - principal;
    }

    const totalAmount = principal + totalInterest;
    const repaymentAmount = totalAmount / installments;

    return {
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      repaymentAmount: Math.round(repaymentAmount * 100) / 100,
    };
  };

  const { totalInterest, totalAmount, repaymentAmount } = calculateRepayment();

  // Email validation helper
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Success state
  const [success, setSuccess] = useState(false);
  const [lenderToken, setLenderToken] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!bankConnected) {
      alert('Please connect your bank account first');
      return;
    }

    if (!lenderName.trim()) {
      alert('Please enter your full name');
      return;
    }

    if (!lenderEmail.trim() || !isValidEmail(lenderEmail.trim())) {
      alert('Please enter a valid email address');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/lender/setup-loan/${loanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          lender_dwolla_customer_url: bankInfo?.dwolla_customer_url,
          lender_dwolla_customer_id: bankInfo?.dwolla_customer_id,
          lender_dwolla_funding_source_url: bankInfo?.dwolla_funding_source_url,
          lender_dwolla_funding_source_id: bankInfo?.dwolla_funding_source_id,
          lender_bank_name: bankInfo?.bank_name,
          lender_bank_account_mask: bankInfo?.account_mask,
          lender_name: lenderName.trim(),
          lender_email: lenderEmail.trim().toLowerCase(),
          interest_rate: parseFloat(interestRate),
          interest_type: interestType,
          repayment_frequency: repaymentFrequency,
          total_installments: parseInt(totalInstallments),
          start_date: startDate,
          bank_connected: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save loan terms');
      }

      // Show success state
      setLenderToken(data.lender_token);
      setSuccess(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 dark:border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading loan...</p>
        </div>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Invalid Link</h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">{error || 'This link is invalid or has expired.'}</p>
            <Link href="/">
              <Button>Go to Homepage</Button>
            </Link>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Success screen after loan is funded
  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Loan Funded!</h1>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
              <span className="text-yellow-600 dark:text-yellow-500 font-medium">Success!</span>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Your loan of <strong className="text-neutral-900 dark:text-white">{formatCurrency(loan.amount, loan.currency)}</strong> has been sent to {loan.borrower_name || loan.borrower_invite_email}.
            </p>
            
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
                <Building className="w-5 h-5" />
                <span className="font-medium">ACH Transfer Initiated</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                The borrower will receive the funds in 1-3 business days.
              </p>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-3">Loan Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Amount Sent</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(loan.amount, loan.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Interest Rate</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{interestRate}% ({interestType})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Total to Receive</span>
                  <span className="font-medium text-green-600 dark:text-green-500">{formatCurrency(totalAmount, loan.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Repayment</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{totalInstallments} {repaymentFrequency} payments</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">First Payment</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{new Date(startDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <CheckCircle className="w-4 h-4 inline mr-1" />
                <strong>Auto-Pay Enabled</strong> — Repayments will be automatically deposited to your bank account on each due date.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {lenderToken && (
                <Link href={`/lender/${lenderToken}`} className="w-full">
                  <Button size="lg" className="w-full">
                    Go to Loan Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
              <Link href="/" className="w-full">
                <Button variant="outline" size="lg" className="w-full">
                  Back to Home
                </Button>
              </Link>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-6">
              A confirmation email has been sent to {lenderEmail}
            </p>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <Navbar />

      <main className="flex-1 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Breadcrumbs */}
          <Breadcrumbs 
            items={[
              { label: 'Loan Request' },
              { label: 'Set Terms' }
            ]}
          />

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Set Loan Terms</h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              You're setting up a loan for {loan.borrower_name || loan.borrower_invite_email}
            </p>
          </div>

          {/* Loan Overview */}
          <Card className="mb-6 bg-gradient-to-br from-primary-500 to-accent-500 dark:from-primary-600 dark:to-accent-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 dark:text-primary-200 text-sm">Loan Amount</p>
                <p className="text-3xl font-bold">{formatCurrency(loan.amount, loan.currency)}</p>
                <p className="text-primary-100 dark:text-primary-200 text-sm mt-1">Purpose: {loan.purpose || 'Not specified'}</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-8 h-8" />
              </div>
            </div>
          </Card>

          {/* Lender Details */}
          <Card className="mb-6">
            <h2 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600 dark:text-primary-500" />
              Your Details
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Your Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lenderName}
                  onChange={(e) => setLenderName(e.target.value)}
                  placeholder="John Doe"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white ${
                    lenderName.trim() 
                      ? 'border-green-300 dark:border-green-700 focus:ring-green-500 dark:focus:ring-green-600' 
                      : 'border-neutral-200 dark:border-neutral-700 focus:ring-primary-500 dark:focus:ring-primary-400'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Your Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={lenderEmail}
                  onChange={(e) => setLenderEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white ${
                    lenderEmail && isValidEmail(lenderEmail) 
                      ? 'border-green-300 dark:border-green-700 focus:ring-green-500 dark:focus:ring-green-600' 
                      : lenderEmail && !isValidEmail(lenderEmail)
                        ? 'border-red-300 dark:border-red-700 focus:ring-red-500 dark:focus:ring-red-600'
                        : 'border-neutral-200 dark:border-neutral-700 focus:ring-primary-500 dark:focus:ring-primary-400'
                  }`}
                />
                {lenderEmail && !isValidEmail(lenderEmail) && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">Please enter a valid email address</p>
                )}
              </div>
            </div>
          </Card>

          {/* Bank Connection */}
          <Card className="mb-6">
            <h2 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-green-600 dark:text-green-500" />
              Connect Your Bank
            </h2>
            
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-4">
              <div className="flex items-start gap-2">
                <FaLightbulb className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800 dark:text-green-400">
                  <strong>Why connect your bank?</strong> To send funds to {loan.borrower_name || 'the borrower'} and receive repayments automatically.
                </p>
              </div>
            </div>

            {bankConnected && bankInfo ? (
              <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                      <Building className="w-6 h-6 text-green-600 dark:text-green-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-900 dark:text-white">{bankInfo.bank_name}</span>
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-500" />
                      </div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        ••••{bankInfo.account_mask}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                  <Building className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
                </div>
                <Button
                  onClick={handleConnectBank}
                  disabled={!plaidLoaded || plaidLoading || plaidConnecting || !lenderName || !lenderEmail}
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
                {(!lenderName || !lenderEmail) && (
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2">Enter your name and email first</p>
                )}
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mt-4">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  We use Plaid to securely connect. We never see your login credentials.
                </p>
              </div>
            </div>
          </Card>

          {/* Borrower's Proposal */}
          {loan.proposed_frequency && loan.proposed_installments && (
            <Card className="mb-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ThumbsUp className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-neutral-900 dark:text-white">Borrower's Proposal</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {loan.borrower_name || 'The borrower'} suggested these terms
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-amber-700 dark:text-amber-400">Payment Schedule</p>
                    <p className="font-semibold text-amber-900 dark:text-amber-300">
                      {loan.proposed_installments} {loan.proposed_frequency} payments
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-amber-700 dark:text-amber-400">Each Payment</p>
                    <p className="font-semibold text-amber-900 dark:text-amber-300">
                      {formatCurrency(loan.proposed_payment_amount || 0, loan.currency)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant={useProposal ? 'primary' : 'outline'} 
                  size="sm"
                  onClick={() => {
                    setUseProposal(true);
                    if (loan.proposed_frequency) setRepaymentFrequency(loan.proposed_frequency as any);
                    if (loan.proposed_installments) setTotalInstallments(String(loan.proposed_installments));
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Accept Proposal
                </Button>
                <Button 
                  variant={!useProposal ? 'primary' : 'outline'} 
                  size="sm"
                  onClick={() => setUseProposal(false)}
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  Customize Terms
                </Button>
              </div>
            </Card>
          )}

          {/* Interest Rate */}
          <Card className="mb-6">
            <h2 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-primary-600 dark:text-primary-500" />
              Interest Rate
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Annual Interest Rate (%)
                </label>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  min="0"
                  max="100"
                  step="0.5"
                  className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Enter 0 for no interest
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Interest Type
                </label>
                <select
                  value={interestType}
                  onChange={(e) => setInterestType(e.target.value as 'simple' | 'compound')}
                  className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                >
                  <option value="simple">Simple Interest</option>
                  <option value="compound">Compound Interest</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Repayment Schedule - Only show full controls if customizing */}
          {!useProposal && (
            <Card className="mb-6">
              <h2 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-500" />
                Custom Repayment Schedule
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Payment Frequency
                  </label>
                  <select
                    value={repaymentFrequency}
                    onChange={(e) => setRepaymentFrequency(e.target.value as any)}
                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Number of Payments
                  </label>
                  <input
                    type="number"
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(e.target.value)}
                    min="1"
                    max="120"
                    className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  First Payment Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>
            </Card>
          )}

          {/* Start Date - Only shown if using proposal */}
          {useProposal && (
            <Card className="mb-6">
              <h2 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-500" />
                First Payment Date
              </h2>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                When should the borrower start making payments?
              </p>
            </Card>
          )}

          {/* Auto-Pay Info */}
          <Card className="mb-6 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-400">Auto-Pay Enabled</h3>
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  Payments will be automatically processed on each due date. The borrower's bank will be charged and funds will be sent directly to your account.
                </p>
              </div>
            </div>
          </Card>

          {/* Calculation Summary */}
          <Card className="mb-6 bg-neutral-50 dark:bg-neutral-800/50">
            <h2 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary-600 dark:text-primary-500" />
              Loan Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Principal</span>
                <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(loan.amount, loan.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Total Interest</span>
                <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(totalInterest, loan.currency)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 border-neutral-200 dark:border-neutral-700">
                <span className="font-semibold text-neutral-900 dark:text-white">Total to Repay</span>
                <span className="font-bold text-primary-600 dark:text-primary-500">{formatCurrency(totalAmount, loan.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Each Payment</span>
                <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(repaymentAmount, loan.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Payment Schedule</span>
                <span className="font-medium text-neutral-900 dark:text-white">{totalInstallments} {repaymentFrequency} payments</span>
              </div>
            </div>
          </Card>

          {/* Warning about funds being sent */}
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-2">
              <FaExclamationTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-400">
                <strong>Important:</strong> Clicking the button below will immediately transfer <strong className="text-amber-900 dark:text-amber-300">{formatCurrency(loan.amount, loan.currency)}</strong> from your bank account to the borrower.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            size="lg" 
            className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600" 
            onClick={handleSubmit}
            disabled={saving || !bankConnected || !lenderName || !lenderEmail || !isValidEmail(lenderEmail)}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending funds...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                Send {formatCurrency(loan.amount, loan.currency)} to Borrower
              </>
            )}
          </Button>

          <p className="text-sm text-center text-neutral-500 dark:text-neutral-400 mt-4">
            Funds will be sent via ACH transfer (1-3 business days)
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}