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
  Banknote,
  Loader2,
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
  } | null;
  business_lender: {
    business_name: string;
  } | null;
  // Guest lender info (stored on loan)
  lender_name?: string;
  lender_bank_connected?: boolean;
  lender_bank_name?: string;
  // Disbursement & ACH
  disbursement_status?: string;
  disbursed_at?: string;
  auto_pay_enabled?: boolean;
  borrower_bank_connected?: boolean;
  borrower_bank_name?: string;
  borrower_bank_account_mask?: string;
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
}

export default function GuestBorrowerPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loan, setLoan] = useState<LoanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle payment for guest borrower
  const handlePayNow = async (paymentId: string) => {
    if (!loan) return;
    
    if (!confirm('Pay this installment now? This will initiate an ACH transfer from your bank account.')) {
      return;
    }
    
    setProcessingPayment(paymentId);
    try {
      const response = await fetch('/api/cron/auto-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Payment submitted! The transfer will complete in 1-3 business days.');
        // Refresh loan data
        await fetchLoan();
      } else {
        alert(data.error || 'Failed to process payment');
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      alert(error.message || 'Failed to process payment');
    } finally {
      setProcessingPayment(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Access Error</h1>
          <p className="text-neutral-600 mb-4">{error || 'Invalid or expired access link'}</p>
          <Link href="/">
            <Button variant="outline">Go to Homepage</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const lenderName = loan.lender?.full_name || loan.business_lender?.business_name || loan.lender_name || 'Your Lender';
  const progress = loan.total_amount ? ((loan.amount_paid || 0) / loan.total_amount) * 100 : 0;
  const nextPayment = loan.schedule?.find(p => !p.is_paid);
  const paidPayments = loan.schedule?.filter(p => p.is_paid).length || 0;
  const totalPayments = loan.schedule?.length || 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-4">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Feyza</span>
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900">Your Loan Dashboard</h1>
          <p className="text-neutral-600">Loan from {lenderName}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Status Banner */}
        {loan.status === 'pending' && (
          <Card className="mb-6 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-amber-600" />
              <div>
                <h3 className="font-semibold text-amber-900">Waiting for Lender</h3>
                <p className="text-sm text-amber-700">
                  Your lender is reviewing your request and setting up the loan terms.
                </p>
              </div>
            </div>
          </Card>
        )}

        {loan.status === 'active' && loan.disbursement_status === 'processing' && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <Send className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">💸 Funds on the Way!</h3>
                <p className="text-sm text-blue-700">
                  {formatCurrency(loan.amount, loan.currency)} is being transferred to your bank. Expected arrival: 1-3 business days.
                </p>
              </div>
            </div>
          </Card>
        )}

        {loan.status === 'completed' && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">🎉 Loan Paid Off!</h3>
                <p className="text-sm text-green-700">
                  Congratulations! You've successfully repaid this loan in full.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Loan Summary Card */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Loan Summary</h2>
            <Badge variant={loan.status === 'active' ? 'success' : loan.status === 'completed' ? 'default' : 'warning'}>
              {loan.status}
            </Badge>
          </div>

          {/* Loan Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-neutral-50 rounded-lg">
              <p className="text-xs text-neutral-500 mb-1">Principal</p>
              <p className="font-semibold text-neutral-900">{formatCurrency(loan.amount, loan.currency)}</p>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg">
              <p className="text-xs text-neutral-500 mb-1">Total to Repay</p>
              <p className="font-semibold text-primary-600">{formatCurrency(loan.total_amount || loan.amount, loan.currency)}</p>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg">
              <p className="text-xs text-neutral-500 mb-1">Interest Rate</p>
              <p className="font-semibold text-neutral-900">{loan.interest_rate || 0}% ({loan.interest_type})</p>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg">
              <p className="text-xs text-neutral-500 mb-1">Payment</p>
              <p className="font-semibold text-neutral-900">{formatCurrency(loan.repayment_amount || 0, loan.currency)} / {loan.repayment_frequency}</p>
            </div>
          </div>

          {/* Lender Info */}
          {lenderName && (
            <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg mb-4">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Lender</p>
                <p className="font-medium text-neutral-900">{lenderName}</p>
              </div>
            </div>
          )}

          {/* Payment Progress */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-green-50 rounded-xl">
              <p className="text-sm text-green-600 mb-1">Paid</p>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(loan.amount_paid || 0, loan.currency)}
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl">
              <p className="text-sm text-amber-600 mb-1">Remaining</p>
              <p className="text-xl font-bold text-amber-700">
                {formatCurrency(loan.amount_remaining || loan.total_amount || loan.amount, loan.currency)}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-neutral-500">Repayment Progress</span>
              <span className="font-medium text-neutral-900">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Next Payment Alert */}
          {nextPayment && loan.status === 'active' && (
            <div className={`p-4 rounded-xl flex items-center gap-3 ${
              loan.borrower_bank_connected
                ? 'bg-green-50 border border-green-200'
                : new Date(nextPayment.due_date) < new Date() 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-amber-50 border border-amber-200'
            }`}>
              {loan.borrower_bank_connected ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className={`w-5 h-5 ${
                  new Date(nextPayment.due_date) < new Date() ? 'text-red-600' : 'text-amber-600'
                }`} />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  loan.borrower_bank_connected
                    ? 'text-green-700'
                    : new Date(nextPayment.due_date) < new Date() ? 'text-red-700' : 'text-amber-700'
                }`}>
                  {loan.borrower_bank_connected 
                    ? '✅ Next Payment Scheduled'
                    : new Date(nextPayment.due_date) < new Date() ? 'Payment Overdue!' : 'Next Payment Due'
                  }
                </p>
                <p className="text-sm text-neutral-600">
                  {formatCurrency(nextPayment.amount, loan.currency)} {loan.borrower_bank_connected ? 'will be auto-deducted' : 'due'} {formatDate(nextPayment.due_date)}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Auto-Pay Status Card */}
        {loan.borrower_bank_connected && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-900">✅ Auto-Pay Enabled</h3>
                <p className="text-sm text-green-700">
                  Payments will be automatically deducted from your bank account on each due date. No action needed!
                </p>
              </div>
            </div>
            {loan.borrower_bank_name && (
              <div className="mt-4 pt-4 border-t border-green-200 flex items-center gap-3">
                <Building className="w-5 h-5 text-green-600" />
                <span className="text-green-800">
                  <strong>{loan.borrower_bank_name}</strong> {loan.borrower_bank_account_mask && `••••${loan.borrower_bank_account_mask}`}
                </span>
              </div>
            )}
          </Card>
        )}

        {/* Make a Payment Card - For borrowers with bank connected */}
        {loan.status === 'active' && loan.disbursement_status === 'completed' && loan.borrower_bank_connected && loan.schedule?.some(s => !s.is_paid) && (
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Banknote className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-neutral-900">Make a Payment</h2>
                  <p className="text-sm text-neutral-500">Pay early to reduce interest & stay ahead</p>
                </div>
              </div>
            </div>

            {/* Next Payment Due */}
            {(() => {
              const nextPaymentItem = loan.schedule?.find(s => !s.is_paid);
              if (!nextPaymentItem) return null;
              
              const dueDate = new Date(nextPaymentItem.due_date);
              const today = new Date();
              const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysUntilDue < 0;
              const isDueToday = daysUntilDue === 0;
              
              return (
                <div className={`p-4 rounded-xl border mb-4 ${
                  isOverdue ? 'bg-red-50 border-red-200' : 
                  isDueToday ? 'bg-amber-50 border-amber-200' : 
                  'bg-neutral-50 border-neutral-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className={`text-sm font-medium ${
                        isOverdue ? 'text-red-700' : 
                        isDueToday ? 'text-amber-700' : 
                        'text-neutral-600'
                      }`}>
                        {isOverdue 
                          ? `⚠️ Overdue by ${Math.abs(daysUntilDue)} days`
                          : isDueToday 
                          ? '📅 Due Today'
                          : `Next payment in ${daysUntilDue} days`
                        }
                      </p>
                      <p className="text-2xl font-bold text-neutral-900 mt-1">
                        {formatCurrency(nextPaymentItem.amount, loan.currency)}
                      </p>
                      <p className="text-sm text-neutral-500 mt-1">
                        Due {formatDate(nextPaymentItem.due_date)}
                      </p>
                    </div>
                    <Button
                      onClick={() => handlePayNow(nextPaymentItem.id)}
                      disabled={processingPayment === nextPaymentItem.id}
                      className={isOverdue ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      {processingPayment === nextPaymentItem.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay Now
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Payment breakdown */}
                  {(nextPaymentItem.principal_amount || nextPaymentItem.interest_amount) && (
                    <div className="flex gap-4 text-sm border-t pt-3 mt-3">
                      <div>
                        <span className="text-neutral-500">Principal: </span>
                        <span className="font-medium">{formatCurrency(nextPaymentItem.principal_amount || 0, loan.currency)}</span>
                      </div>
                      {nextPaymentItem.interest_amount && nextPaymentItem.interest_amount > 0 && (
                        <div>
                          <span className="text-neutral-500">Interest: </span>
                          <span className="font-medium text-orange-600">{formatCurrency(nextPaymentItem.interest_amount, loan.currency)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* All upcoming payments */}
            {loan.schedule?.filter(s => !s.is_paid).length > 1 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-neutral-700 mb-3">
                  All Upcoming Payments ({loan.schedule.filter(s => !s.is_paid).length} remaining)
                </p>
                <div className="space-y-2">
                  {loan.schedule.filter(s => !s.is_paid).slice(1, 4).map((payment) => {
                    const dueDate = new Date(payment.due_date);
                    const today = new Date();
                    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div 
                        key={payment.id}
                        className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-sm">
                            <p className="font-medium text-neutral-900">{formatCurrency(payment.amount, loan.currency)}</p>
                            <p className="text-neutral-500">{formatDate(payment.due_date)}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePayNow(payment.id)}
                          disabled={processingPayment === payment.id}
                        >
                          {processingPayment === payment.id ? 'Processing...' : 'Pay Early'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
                
                {loan.schedule.filter(s => !s.is_paid).length > 4 && (
                  <p className="text-sm text-neutral-500 mt-3 text-center">
                    +{loan.schedule.filter(s => !s.is_paid).length - 4} more payments
                  </p>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Payment Schedule */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
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
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
              <p className="font-medium text-neutral-900 mb-2">
                {loan.status === 'pending' 
                  ? '⏳ Waiting for Lender'
                  : '📋 Schedule Coming Soon'}
              </p>
              <p className="text-sm text-neutral-600 max-w-sm mx-auto">
                {loan.status === 'pending' 
                  ? 'Your lender is reviewing your request and setting up the loan terms. You\'ll see your payment schedule here once they\'re done.'
                  : 'Your payment schedule will appear here once the loan is fully activated. Check back soon!'}
              </p>
              {loan.status === 'pending' && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg inline-block">
                  <p className="text-xs text-blue-700">
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
                      ? 'bg-green-50 border-green-200'
                      : isOverdue
                        ? 'bg-red-50 border-red-200'
                        : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        payment.is_paid
                          ? 'bg-green-100'
                          : isOverdue
                            ? 'bg-red-100'
                            : 'bg-neutral-200'
                      }`}>
                        {payment.is_paid ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <span className="text-sm font-medium text-neutral-600">{index + 1}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">
                          {formatCurrency(payment.amount, loan.currency)}
                        </p>
                        <p className={`text-sm ${
                          isOverdue ? 'text-red-600 font-medium' : 'text-neutral-500'
                        }`}>
                          {isOverdue ? '⚠️ Overdue • ' : ''}{formatDate(payment.due_date)}
                        </p>
                      </div>
                    </div>

                    {payment.is_paid ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                        ✓ Paid
                      </span>
                    ) : loan.borrower_bank_connected ? (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                        ⚡ Auto-Pay
                      </span>
                    ) : (
                      <span className={`px-3 py-1 text-sm rounded-full ${
                        isOverdue 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {isOverdue ? 'Overdue' : 'Upcoming'}
                      </span>
                    )}
                  </div>

                  {/* Show principal/interest breakdown if available */}
                  {(payment.principal_amount || payment.interest_amount) && (
                    <div className="mt-2 pt-2 border-t border-neutral-100 flex gap-4 text-xs text-neutral-500">
                      {payment.principal_amount && (
                        <span>Principal: {formatCurrency(payment.principal_amount, loan.currency)}</span>
                      )}
                      {payment.interest_amount && (
                        <span>Interest: {formatCurrency(payment.interest_amount, loan.currency)}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          )}
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-neutral-500">
          <p>Powered by <Link href="/" className="text-primary-600 hover:underline">Feyza</Link></p>
          <p className="mt-1">Questions? Contact your lender directly.</p>
        </div>
      </div>
    </div>
  );
}