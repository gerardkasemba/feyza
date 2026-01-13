'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Progress, Badge, Breadcrumbs } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { downloadICalFile } from '@/lib/calendar';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  User,
  Building,
  DollarSign,
  Percent,
  PieChart,
  Send,
  Shield,
  ExternalLink,
  Download,
} from 'lucide-react';

interface LoanData {
  id: string;
  amount: number;
  amount_paid: number;
  amount_remaining: number;
  currency: string;
  interest_rate: number;
  interest_type: string;
  total_interest: number;
  total_amount: number;
  repayment_amount: number;
  status: string;
  purpose?: string;
  start_date: string;
  repayment_frequency: string;
  total_installments: number;
  funds_sent: boolean;
  lender: {
    full_name: string;
    email?: string;
    paypal_email?: string;
    cashapp_username?: string;
    venmo_username?: string;
    preferred_payment_method?: string;
  } | null;
  business_lender: {
    business_name: string;
    paypal_email?: string;
    cashapp_username?: string;
    venmo_username?: string;
    preferred_payment_method?: string;
  } | null;
  // Lender payment info (for guest lenders - stored on loan)
  lender_paypal_email?: string;
  lender_cashapp_username?: string;
  lender_venmo_username?: string;
  lender_preferred_payment_method?: string;
  schedule: Array<{
    id: string;
    due_date: string;
    amount: number;
    principal_amount?: number;
    interest_amount?: number;
    is_paid: boolean;
    status?: string;
    payment_id?: string;
  }>;
  // Borrower's receive payment method
  borrower_payment_method?: string;
  borrower_payment_username?: string;
}

type PaymentMethod = 'paypal' | 'cashapp' | 'venmo';

export default function GuestBorrowerPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loan, setLoan] = useState<LoanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Payment method setup
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | ''>('');
  const [paymentUsername, setPaymentUsername] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  
  // Payment recording
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  useEffect(() => {
    if (token) {
      fetchLoan();
    }
  }, [token]);

  const fetchLoan = async () => {
    try {
      const response = await fetch(`/api/guest-borrower/${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load loan');
      }

      setLoan(data.loan);
      setSelectedMethod(data.loan.borrower_payment_method || '');
      setPaymentUsername(data.loan.borrower_payment_username || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePaymentMethod = async () => {
    if (!selectedMethod || !paymentUsername) return;

    setSavingPayment(true);
    try {
      const response = await fetch(`/api/guest-borrower/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_payment_method',
          payment_method: selectedMethod,
          payment_username: paymentUsername,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save payment method');
      }

      await fetchLoan();
      alert('Payment method saved successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingPayment(false);
    }
  };

  const handleRecordPayment = async (scheduleId: string) => {
    setRecordingPayment(true);
    try {
      const response = await fetch(`/api/guest-borrower/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_payment',
          schedule_id: scheduleId,
          note: paymentNote,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to record payment');
      }

      await fetchLoan();
      setSelectedPayment(null);
      setPaymentNote('');
      alert('Payment recorded! Your lender will be notified.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRecordingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-300">Loading your loan...</p>
        </div>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Access Expired or Invalid</h1>
          <p className="text-neutral-600 dark:text-neutral-300 mb-6">
            {error || 'This link may have expired or is invalid.'}
          </p>
          <Link href="/borrower/access">
            <Button>Request New Access Link</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const lenderName = loan.lender?.full_name || loan.business_lender?.business_name || 'Your Lender';
  const progress = loan.total_amount > 0 ? ((loan.amount_paid || 0) / loan.total_amount) * 100 : 0;
  const nextPayment = loan.schedule?.find(s => !s.is_paid);
  
  // Get lender's payment info - check both registered lender AND guest lender fields
  const lenderPaymentInfo = loan.lender || loan.business_lender;
  const lenderPaypalEmail = lenderPaymentInfo?.paypal_email || loan.lender_paypal_email;
  const lenderCashapp = lenderPaymentInfo?.cashapp_username || loan.lender_cashapp_username;
  const lenderVenmo = lenderPaymentInfo?.venmo_username || loan.lender_venmo_username;
  const hasLenderPaymentInfo = lenderPaypalEmail || lenderCashapp || lenderVenmo;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-neutral-900 dark:text-white">Feyza</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Guest Borrower</p>
            </div>
          </div>
          <Badge variant={loan.status === 'active' ? 'success' : 'warning'}>
            {loan.status}
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs 
          items={[
            { label: 'My Loans', href: '/borrower/access' },
            { label: `Loan from ${lenderName}` }
          ]}
        />

        {/* Loan Overview */}
        <Card className="mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
              {loan.business_lender ? (
                <Building className="w-7 h-7 text-primary-600 dark:text-primary-400" />
              ) : (
                <User className="w-7 h-7 text-primary-600 dark:text-primary-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Loan from</p>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{lenderName}</h2>
            </div>
          </div>

          {/* Main Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Principal</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {formatCurrency(loan.amount, loan.currency)}
              </p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
              <p className="text-sm text-orange-600 dark:text-orange-400 mb-1">Interest ({loan.interest_rate}%)</p>
              <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                {formatCurrency(loan.total_interest || 0, loan.currency)}
              </p>
            </div>
            <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
              <p className="text-sm text-primary-600 dark:text-primary-400 mb-1">Total to Repay</p>
              <p className="text-xl font-bold text-primary-700 dark:text-primary-300">
                {formatCurrency(loan.total_amount || loan.amount, loan.currency)}
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Each Payment</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {formatCurrency(loan.repayment_amount || (loan.total_amount / loan.total_installments), loan.currency)}
              </p>
            </div>
          </div>

          {/* Loan Details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl mb-6">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Interest Type</p>
              <p className="font-medium text-neutral-900 dark:text-white capitalize">{loan.interest_type || 'Simple'}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Frequency</p>
              <p className="font-medium text-neutral-900 dark:text-white capitalize">{loan.repayment_frequency}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Total Payments</p>
              <p className="font-medium text-neutral-900 dark:text-white">{loan.total_installments}</p>
            </div>
          </div>

          {/* Payment Progress */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl">
              <p className="text-sm text-green-600 dark:text-green-400 mb-1">Paid</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(loan.amount_paid || 0, loan.currency)}
              </p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-1">Remaining</p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                {formatCurrency(loan.amount_remaining || loan.total_amount || loan.amount, loan.currency)}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-neutral-500 dark:text-neutral-400">Repayment Progress</span>
              <span className="font-medium text-neutral-900 dark:text-white">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Next Payment Alert */}
          {nextPayment && loan.status === 'active' && (
            <div className={`p-4 rounded-xl flex items-center gap-3 ${
              new Date(nextPayment.due_date) < new Date() 
                ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800' 
                : 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800'
            }`}>
              <AlertCircle className={`w-5 h-5 ${
                new Date(nextPayment.due_date) < new Date() ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
              }`} />
              <div className="flex-1">
                <p className={`font-medium ${
                  new Date(nextPayment.due_date) < new Date() ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
                }`}>
                  {new Date(nextPayment.due_date) < new Date() ? 'Payment Overdue!' : 'Next Payment Due'}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  {formatCurrency(nextPayment.amount, loan.currency)} due {formatDate(nextPayment.due_date)}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Setup Receive Payment Method - Show if not set (for receiving loan funds) */}
        {!loan.borrower_payment_method && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
                <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">Set Up How to Receive Your Loan</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  Tell your lender how you'd like to receive the loan funds
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {['paypal', 'cashapp', 'venmo'].map((method) => (
                <label
                  key={method}
                  className={`flex items-center gap-3 p-4 bg-white dark:bg-neutral-800 rounded-xl cursor-pointer border-2 transition-all ${
                    selectedMethod === method ? 'border-primary-500 dark:border-primary-400' : 'border-transparent'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={method}
                    checked={selectedMethod === method}
                    onChange={(e) => setSelectedMethod(e.target.value as PaymentMethod)}
                    className="w-4 h-4 text-primary-600 dark:text-primary-400"
                  />
                  <span className="font-medium capitalize text-neutral-900 dark:text-white">
                    {method === 'cashapp' ? 'Cash App' : method}
                  </span>
                </label>
              ))}
            </div>

            {selectedMethod && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Your {selectedMethod === 'paypal' ? 'PayPal Email' : `${selectedMethod === 'cashapp' ? 'Cash App' : 'Venmo'} Username`}
                </label>
                <input
                  type={selectedMethod === 'paypal' ? 'email' : 'text'}
                  value={paymentUsername}
                  onChange={(e) => setPaymentUsername(e.target.value)}
                  placeholder={selectedMethod === 'paypal' ? 'you@example.com' : '$username'}
                  className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>
            )}

            <Button
              onClick={handleSavePaymentMethod}
              disabled={!selectedMethod || !paymentUsername || savingPayment}
              className="w-full"
            >
              {savingPayment ? 'Saving...' : 'Save Payment Method'}
            </Button>
          </Card>
        )}

        {/* Show saved receive payment method */}
        {loan.borrower_payment_method && (
          <Card className="mb-6 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-800/50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Your Receive Method</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    <span className="capitalize">{loan.borrower_payment_method === 'cashapp' ? 'Cash App' : loan.borrower_payment_method}</span>: {loan.borrower_payment_username}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedMethod(loan.borrower_payment_method as PaymentMethod);
                  setPaymentUsername(loan.borrower_payment_username || '');
                }}
              >
                Change
              </Button>
            </div>
            
            {/* Update form if changing */}
            {selectedMethod && selectedMethod !== loan.borrower_payment_method && (
              <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                <div className="space-y-3 mb-4">
                  {['paypal', 'cashapp', 'venmo'].map((method) => (
                    <label
                      key={method}
                      className={`flex items-center gap-3 p-3 bg-white dark:bg-neutral-800 rounded-lg cursor-pointer border-2 transition-all ${
                        selectedMethod === method ? 'border-primary-500 dark:border-primary-400' : 'border-transparent'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value={method}
                        checked={selectedMethod === method}
                        onChange={(e) => setSelectedMethod(e.target.value as PaymentMethod)}
                        className="w-4 h-4 text-primary-600 dark:text-primary-400"
                      />
                      <span className="font-medium capitalize text-neutral-900 dark:text-white">
                        {method === 'cashapp' ? 'Cash App' : method}
                      </span>
                    </label>
                  ))}
                </div>
                <input
                  type={selectedMethod === 'paypal' ? 'email' : 'text'}
                  value={paymentUsername}
                  onChange={(e) => setPaymentUsername(e.target.value)}
                  placeholder={selectedMethod === 'paypal' ? 'you@example.com' : '$username'}
                  className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white mb-3"
                />
                <Button
                  onClick={handleSavePaymentMethod}
                  disabled={!selectedMethod || !paymentUsername || savingPayment}
                  className="w-full"
                  size="sm"
                >
                  {savingPayment ? 'Saving...' : 'Update Payment Method'}
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* How to Pay Your Lender - Show when loan is active and has lender payment info */}
        {loan.status === 'active' && hasLenderPaymentInfo && (
          <Card className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-800/50 rounded-lg">
                <Send className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">How to Repay Your Lender</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Send payments to {lenderName} using one of these methods</p>
              </div>
            </div>

            <div className="space-y-3">
              {lenderPaypalEmail && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">PayPal</p>
                    <p className="text-neutral-900 dark:text-white font-mono">{lenderPaypalEmail}</p>
                  </div>
                  <a 
                    href={`https://paypal.me/${lenderPaypalEmail}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    Open PayPal
                  </a>
                </div>
              )}
              {lenderCashapp && (
                <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">Cash App</p>
                    <p className="text-neutral-900 dark:text-white font-mono">${lenderCashapp}</p>
                  </div>
                  <a 
                    href={`https://cash.app/$${lenderCashapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-green-600 dark:bg-green-500 text-white rounded-lg text-sm hover:bg-green-700 dark:hover:bg-green-600"
                  >
                    Open Cash App
                  </a>
                </div>
              )}
              {lenderVenmo && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">Venmo</p>
                    <p className="text-neutral-900 dark:text-white font-mono">@{lenderVenmo}</p>
                  </div>
                  <a 
                    href={`https://venmo.com/${lenderVenmo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-purple-600 dark:bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-700 dark:hover:bg-purple-600"
                  >
                    Open Venmo
                  </a>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                💡 <strong>Tip:</strong> After sending a payment, click "I Made This Payment" below to notify your lender.
              </p>
            </div>
          </Card>
        )}

        {/* No lender payment info yet */}
        {loan.status === 'active' && !hasLenderPaymentInfo && (
          <Card className="mb-6 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">Waiting for Lender Payment Details</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  Your lender hasn't set up their payment method yet. You'll be notified when they do.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Payment Schedule */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Payment Schedule
            </h3>
            {loan.schedule && loan.schedule.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const unpaidPayments = loan.schedule
                    .filter(p => !p.is_paid)
                    .map(p => ({
                      id: p.id,
                      title: `💰 Feyza Payment Due - ${formatCurrency(p.amount, loan.currency)}`,
                      amount: p.amount,
                      currency: loan.currency,
                      dueDate: p.due_date,
                      lenderName: lenderName,
                      description: `Loan repayment for ${loan.purpose || 'personal loan'}`,
                    }));
                  downloadICalFile(unpaidPayments, loan.purpose);
                }}
              >
                <Download className="w-4 h-4 mr-1" />
                Add to Calendar
              </Button>
            )}
          </div>

          {(!loan.schedule || loan.schedule.length === 0) ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="font-medium text-neutral-900 dark:text-white mb-2">
                {loan.status === 'pending' 
                  ? '⏳ Waiting for Lender'
                  : '📋 Schedule Coming Soon'}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-sm mx-auto">
                {loan.status === 'pending' 
                  ? 'Your lender is reviewing your request and setting up the loan terms. You\'ll see your payment schedule here once they\'re done.'
                  : 'Your payment schedule will appear here once the loan is fully activated. Check back soon!'}
              </p>
              {loan.status === 'pending' && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg inline-block">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    💡 Tip: You'll receive an email when your lender finalizes the terms
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {loan.schedule.map((payment, index) => {
              const isPast = new Date(payment.due_date) < new Date();
              const isOverdue = isPast && !payment.is_paid;

              return (
                <div
                  key={payment.id}
                  id={`payment-${payment.id}`}
                  className={`p-4 rounded-xl border ${
                    payment.is_paid
                      ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
                      : isOverdue
                        ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                        : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        payment.is_paid
                          ? 'bg-green-100 dark:bg-green-800'
                          : isOverdue
                            ? 'bg-red-100 dark:bg-red-800'
                            : 'bg-neutral-200 dark:bg-neutral-700'
                      }`}>
                        {payment.is_paid ? (
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{index + 1}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {formatCurrency(payment.amount, loan.currency)}
                        </p>
                        <p className={`text-sm ${
                          isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-neutral-500 dark:text-neutral-400'
                        }`}>
                          {isOverdue ? '⚠️ Overdue • ' : ''}{formatDate(payment.due_date)}
                        </p>
                      </div>
                    </div>

                    {payment.is_paid ? (
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 text-sm rounded-full">
                        ✓ Paid
                      </span>
                    ) : loan.status === 'active' && hasLenderPaymentInfo ? (
                      <Button
                        size="sm"
                        variant={selectedPayment === payment.id ? 'primary' : 'outline'}
                        onClick={() => setSelectedPayment(
                          selectedPayment === payment.id ? null : payment.id
                        )}
                      >
                        I Made This Payment
                      </Button>
                    ) : (
                      <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-sm rounded-full">
                        Pending
                      </span>
                    )}
                  </div>

                  {/* Payment confirmation form */}
                  {selectedPayment === payment.id && (
                    <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                      <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
                        Confirm that you've sent this payment to your lender:
                      </p>
                      <textarea
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        placeholder="Add a note (optional) - e.g., PayPal confirmation #..."
                        className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm mb-3 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPayment(null);
                            setPaymentNote('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRecordPayment(payment.id)}
                          disabled={recordingPayment}
                        >
                          {recordingPayment ? 'Recording...' : 'Confirm Payment'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          )}
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
          <p className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            Your data is secure and private
          </p>
          <p className="mt-2">
            <Link href="/borrower/access" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
              Access another loan
            </Link>
            {' • '}
            <Link href="/" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
              Learn more about Feyza
            </Link>
          </p>
        </div>

        {/* Add padding at bottom for sticky bar */}
        <div className="h-24" />
      </main>

      {/* Sticky Payment Reminder Bar */}
      {loan.status === 'active' && hasLenderPaymentInfo && loan.schedule && (
        (() => {
          const nextUnpaid = loan.schedule.find(p => !p.is_paid);
          if (!nextUnpaid) return null;
          const isOverdue = new Date(nextUnpaid.due_date) < new Date();
          
          return (
            <div className={`fixed bottom-0 left-0 right-0 ${
              isOverdue 
                ? 'bg-red-600 dark:bg-red-700' 
                : 'bg-primary-600 dark:bg-primary-700'
            } text-white py-4 px-4 shadow-lg z-50`}>
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${
                    isOverdue 
                      ? 'bg-red-500 dark:bg-red-600' 
                      : 'bg-primary-500 dark:bg-primary-600'
                  } rounded-full flex items-center justify-center`}>
                    {isOverdue ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <DollarSign className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {isOverdue ? '⚠️ Payment Overdue' : 'Next Payment Due'}
                    </p>
                    <p className="text-white/80 dark:text-white/90 text-sm">
                      {formatCurrency(nextUnpaid.amount, loan.currency)} • {formatDate(nextUnpaid.due_date)}
                    </p>
                  </div>
                </div>
                <Button 
                  className="bg-white text-primary-600 dark:bg-white/90 dark:text-primary-700 hover:bg-white/90 font-medium whitespace-nowrap"
                  onClick={() => {
                    setSelectedPayment(nextUnpaid.id);
                    // Scroll to the payment item
                    document.getElementById(`payment-${nextUnpaid.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                >
                  Record Payment
                </Button>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}