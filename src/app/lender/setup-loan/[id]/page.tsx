'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import { 
  DollarSign, 
  User, 
  Calendar, 
  Percent,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Calculator,
  CreditCard,
  Clock,
  ThumbsUp,
  Edit3
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface LoanData {
  id: string;
  amount: number;
  currency: string;
  purpose?: string;
  borrower_invite_email: string;
  borrower_name?: string;
  status: string;
  // Borrower's preferred receive payment method
  borrower_payment_method?: string;
  borrower_payment_username?: string;
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

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'cashapp' | 'venmo' | ''>('');
  const [paymentUsername, setPaymentUsername] = useState('');

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async () => {
    if (!paymentMethod || !paymentUsername) {
      alert('Please enter your payment method details');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/lender/setup-loan/${loanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          interest_rate: parseFloat(interestRate),
          interest_type: interestType,
          repayment_frequency: repaymentFrequency,
          total_installments: parseInt(totalInstallments),
          start_date: startDate,
          payment_method: paymentMethod,
          payment_username: paymentUsername,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save loan terms');
      }

      // Redirect to lender view
      router.push(`/lender/${data.lender_token}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading loan...</p>
        </div>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 mb-2">Invalid Link</h1>
            <p className="text-neutral-600 mb-6">{error || 'This link is invalid or has expired.'}</p>
            <Link href="/">
              <Button>Go to Homepage</Button>
            </Link>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Navbar />

      <main className="flex-1 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Badge variant="success" className="mb-4">
              <CheckCircle className="w-4 h-4 mr-2" />
              You're setting up a loan
            </Badge>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              Review & Set Loan Terms
            </h1>
            <p className="text-neutral-600">
              The borrower has proposed terms. You can accept or adjust them.
            </p>
          </div>

          {/* Loan Summary */}
          <Card className="mb-6 bg-primary-50 border-primary-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-primary-600">Loan Amount</p>
                <p className="text-2xl font-bold text-primary-700">
                  {formatCurrency(loan.amount, loan.currency)}
                </p>
              </div>
            </div>
          </Card>

          {/* Borrower's Payment Method - How to Send Funds */}
          {loan.borrower_payment_method && loan.borrower_payment_username && (
            <Card className="mb-6 bg-green-50 border-green-200">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">Where to Send the Loan</h3>
                  <p className="text-sm text-neutral-600">
                    The borrower wants to receive funds via:
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-white rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium capitalize">
                      {loan.borrower_payment_method === 'cashapp' ? 'Cash App' : loan.borrower_payment_method}
                    </p>
                    <p className="text-lg font-mono font-bold text-neutral-900">
                      {loan.borrower_payment_method === 'paypal' ? loan.borrower_payment_username : 
                       loan.borrower_payment_method === 'cashapp' ? `$${loan.borrower_payment_username}` :
                       `@${loan.borrower_payment_username}`}
                    </p>
                  </div>
                  {loan.borrower_payment_method === 'paypal' && (
                    <a 
                      href={`https://paypal.me/${loan.borrower_payment_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      Send via PayPal
                    </a>
                  )}
                  {loan.borrower_payment_method === 'cashapp' && (
                    <a 
                      href={`https://cash.app/$${loan.borrower_payment_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                    >
                      Send via Cash App
                    </a>
                  )}
                  {loan.borrower_payment_method === 'venmo' && (
                    <a 
                      href={`https://venmo.com/${loan.borrower_payment_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                    >
                      Send via Venmo
                    </a>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Borrower hasn't set payment method */}
          {(!loan.borrower_payment_method || !loan.borrower_payment_username) && (
            <Card className="mb-6 bg-amber-50 border-amber-200">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Borrower Hasn't Set Payment Method</h3>
                  <p className="text-sm text-neutral-600">
                    The borrower hasn't specified how they want to receive the funds yet. They'll be notified to set this up.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Borrower's Proposal */}
          {loan.proposed_frequency && loan.proposed_installments && (
            <Card className="mb-6 border-2 border-accent-200 bg-accent-50">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-neutral-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-accent-600" />
                    Borrower's Proposed Schedule
                  </h2>
                  <p className="text-sm text-neutral-600 mt-1">
                    {loan.borrower_name || 'The borrower'} suggested these terms
                  </p>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 mb-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-neutral-500">Frequency</p>
                    <p className="font-bold text-neutral-900 capitalize">
                      {loan.proposed_frequency}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Payments</p>
                    <p className="font-bold text-neutral-900">
                      {loan.proposed_installments}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Each Payment</p>
                    <p className="font-bold text-primary-600">
                      {formatCurrency(loan.proposed_payment_amount || (loan.amount / loan.proposed_installments), loan.currency)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  className={`flex-1 ${useProposal ? '' : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'}`}
                  variant={useProposal ? 'primary' : 'outline'}
                  onClick={() => {
                    setUseProposal(true);
                    setRepaymentFrequency(loan.proposed_frequency as any);
                    setTotalInstallments(String(loan.proposed_installments));
                  }}
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Accept Proposal
                </Button>
                <Button 
                  variant={useProposal ? 'outline' : 'primary'}
                  className="flex-1"
                  onClick={() => setUseProposal(false)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Customize Terms
                </Button>
              </div>
            </Card>
          )}

          {/* Interest Settings - Always shown */}
          <Card className="mb-6">
            <h2 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-primary-600" />
              Interest Settings
              {useProposal && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full ml-2">Optional for friends/family</span>}
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Interest Rate (Annual %)
                </label>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  min="0"
                  max="100"
                  step="0.5"
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-neutral-500 mt-1">0% for family/friends loans</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Interest Type
                </label>
                <select
                  value={interestType}
                  onChange={(e) => setInterestType(e.target.value as 'simple' | 'compound')}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              <h2 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-600" />
                Custom Repayment Schedule
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Payment Frequency
                  </label>
                  <select
                    value={repaymentFrequency}
                    onChange={(e) => setRepaymentFrequency(e.target.value as any)}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Number of Payments
                  </label>
                  <input
                    type="number"
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(e.target.value)}
                    min="1"
                    max="120"
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  First Payment Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </Card>
          )}

          {/* Start Date - Only shown if using proposal (custom has its own) */}
          {useProposal && (
            <Card className="mb-6">
              <h2 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-600" />
                First Payment Date
              </h2>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-neutral-500 mt-2">
                When should the borrower start making payments?
              </p>
            </Card>
          )}

          {/* Payment Method */}
          <Card className="mb-6">
            <h2 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-600" />
              Your Payment Method
            </h2>
            <p className="text-sm text-neutral-600 mb-4">
              How will you receive payments from the borrower?
            </p>

            <div className="space-y-3 mb-4">
              {[
                { value: 'paypal', label: 'PayPal', color: 'bg-blue-500' },
                { value: 'cashapp', label: 'Cash App', color: 'bg-green-500' },
                { value: 'venmo', label: 'Venmo', color: 'bg-blue-600' },
              ].map((method) => (
                <label
                  key={method.value}
                  className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer border-2 transition-all ${
                    paymentMethod === method.value 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={method.value}
                    checked={paymentMethod === method.value}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-4 h-4 text-primary-600"
                  />
                  <div className={`w-2 h-2 rounded-full ${method.color}`} />
                  <span className="font-medium">{method.label}</span>
                </label>
              ))}
            </div>

            {paymentMethod && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Your {paymentMethod === 'paypal' ? 'PayPal Email' : `${paymentMethod === 'cashapp' ? 'Cash App' : 'Venmo'} Username`}
                </label>
                <input
                  type={paymentMethod === 'paypal' ? 'email' : 'text'}
                  value={paymentUsername}
                  onChange={(e) => setPaymentUsername(e.target.value)}
                  placeholder={paymentMethod === 'paypal' ? 'you@example.com' : '$username'}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}
          </Card>

          {/* Calculation Summary */}
          <Card className="mb-6 bg-neutral-50">
            <h2 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary-600" />
              Loan Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-neutral-600">Principal</span>
                <span className="font-medium">{formatCurrency(loan.amount, loan.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Total Interest</span>
                <span className="font-medium">{formatCurrency(totalInterest, loan.currency)}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold">Total to Repay</span>
                <span className="font-bold text-primary-600">{formatCurrency(totalAmount, loan.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Each Payment</span>
                <span className="font-medium">{formatCurrency(repaymentAmount, loan.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Payment Schedule</span>
                <span className="font-medium">{totalInstallments} {repaymentFrequency} payments</span>
              </div>
            </div>
          </Card>

          {/* Submit Button */}
          <Button 
            size="lg" 
            className="w-full" 
            onClick={handleSubmit}
            disabled={saving || !paymentMethod || !paymentUsername}
          >
            {saving ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Setting up loan...
              </>
            ) : (
              <>
                Confirm & Create Loan
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          <p className="text-sm text-center text-neutral-500 mt-4">
            The borrower will be notified and asked to review these terms
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
