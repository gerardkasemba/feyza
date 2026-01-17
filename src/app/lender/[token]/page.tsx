'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Badge, Breadcrumbs } from '@/components/ui';
import { Navbar, Footer } from '@/components/layout';
import { 
  DollarSign, Calendar, User, CheckCircle, Clock, AlertCircle, 
  TrendingUp, Building, ArrowRight, ArrowUpRight, ArrowDownLeft,
  Shield, Percent, PieChart, Download
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface LoanData {
  id: string;
  amount: number;
  currency: string;
  purpose?: string;
  status: string;
  interest_rate: number;
  interest_type: string;
  total_interest: number;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
  repayment_frequency: string;
  total_installments: number;
  repayment_amount: number;
  start_date: string;
  created_at: string;
  borrower_name?: string;
  borrower_invite_email?: string;
  borrower_bank_connected?: boolean;
  lender_name?: string;
  lender_email?: string;
  lender_bank_name?: string;
  lender_bank_account_mask?: string;
  lender_bank_connected?: boolean;
  disbursement_status?: string;
  disbursed_at?: string;
  auto_pay_enabled?: boolean;
  schedule: Array<{
    id: string;
    due_date: string;
    amount: number;
    principal_amount?: number;
    interest_amount?: number;
    is_paid: boolean;
    paid_at?: string;
  }>;
  transfers?: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    created_at: string;
  }>;
}

export default function GuestLenderDashboard() {
  const params = useParams();
  const token = params.token as string;
  
  const [loan, setLoan] = useState<LoanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchLoanData();
    }
  }, [token]);

  const fetchLoanData = async () => {
    try {
      const response = await fetch(`/api/guest-lender/${token}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Invalid or expired access link');
        } else {
          setError('Failed to load loan');
        }
        return;
      }
      
      const data = await response.json();
      setLoan(data.loan);
    } catch (err) {
      console.error('Error fetching loan data:', err);
      setError('Failed to load loan');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading your loan...</p>
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
            <h1 className="text-xl font-bold text-neutral-900 mb-2">Access Error</h1>
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

  const borrowerName = loan.borrower_name || loan.borrower_invite_email?.split('@')[0] || 'Borrower';
  const progress = loan.total_amount > 0 ? (loan.amount_paid / loan.total_amount) * 100 : 0;
  const paidPayments = loan.schedule?.filter(s => s.is_paid).length || 0;
  const totalPayments = loan.schedule?.length || loan.total_installments;
  const nextPayment = loan.schedule?.find(s => !s.is_paid);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Navbar />

      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs 
            items={[
              { label: 'Lender Dashboard' },
              { label: `Loan to ${borrowerName}` }
            ]}
          />

          {/* Loan Header */}
          <Card className="mb-6 bg-gradient-to-br from-green-600 to-emerald-700 text-white">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-green-100 text-sm mb-1">You Lent</p>
                <p className="text-4xl font-bold">{formatCurrency(loan.amount, loan.currency)}</p>
                <p className="text-green-100 mt-2">to {borrowerName}</p>
              </div>
              <Badge 
                variant={loan.status === 'active' ? 'success' : loan.status === 'completed' ? 'default' : 'warning'}
                className="bg-white/20 text-white border-0"
              >
                {loan.status}
              </Badge>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm text-green-100 mb-2">
                <span>Repaid: {formatCurrency(loan.amount_paid, loan.currency)}</span>
                <span>Remaining: {formatCurrency(loan.amount_remaining, loan.currency)}</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-green-100 text-sm mt-2">
                {paidPayments} of {totalPayments} payments received
              </p>
            </div>
          </Card>

          {/* Disbursement Status */}
          {loan.disbursement_status && (
            <Card className={`mb-6 ${loan.disbursement_status === 'processing' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-3">
                {loan.disbursement_status === 'processing' ? (
                  <Clock className="w-5 h-5 text-blue-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                <div>
                  <h3 className="font-semibold text-neutral-900">
                    {loan.disbursement_status === 'processing' ? 'Funds Being Transferred' : 'Funds Sent'}
                  </h3>
                  <p className="text-sm text-neutral-600">
                    {loan.disbursement_status === 'processing' 
                      ? `${formatCurrency(loan.amount, loan.currency)} is being transferred to ${borrowerName}. ACH transfers take 1-3 business days.`
                      : `${formatCurrency(loan.amount, loan.currency)} was sent on ${loan.disbursed_at ? formatDate(loan.disbursed_at) : 'N/A'}`
                    }
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Loan Details Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
              <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <Percent className="w-5 h-5 text-primary-600" />
                Loan Terms
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Principal</span>
                  <span className="font-medium">{formatCurrency(loan.amount, loan.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Interest Rate</span>
                  <span className="font-medium">{loan.interest_rate}% ({loan.interest_type})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Total Interest</span>
                  <span className="font-medium">{formatCurrency(loan.total_interest, loan.currency)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-neutral-900 font-medium">Total to Receive</span>
                  <span className="font-bold text-green-600">{formatCurrency(loan.total_amount, loan.currency)}</span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-600" />
                Repayment Schedule
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Frequency</span>
                  <span className="font-medium capitalize">{loan.repayment_frequency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Payment Amount</span>
                  <span className="font-medium">{formatCurrency(loan.repayment_amount, loan.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Total Payments</span>
                  <span className="font-medium">{loan.total_installments}</span>
                </div>
                {nextPayment && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-neutral-900 font-medium">Next Payment</span>
                    <span className="font-bold text-primary-600">{formatDate(nextPayment.due_date)}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Auto-Pay Status */}
          <Card className="mb-6 bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">Auto-Pay Enabled</h3>
                <p className="text-sm text-green-700">
                  Payments will be automatically deposited to your bank account on each due date.
                </p>
              </div>
            </div>
            {loan.lender_bank_name && (
              <div className="mt-4 pt-4 border-t border-green-200 flex items-center gap-3">
                <Building className="w-5 h-5 text-green-600" />
                <span className="text-green-800">
                  <strong>{loan.lender_bank_name}</strong> ••••{loan.lender_bank_account_mask}
                </span>
              </div>
            )}
          </Card>

          {/* Payment Schedule */}
          <Card className="mb-6">
            <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary-600" />
              Payment Schedule
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-3 text-sm font-medium text-neutral-500">#</th>
                    <th className="text-left py-3 text-sm font-medium text-neutral-500">Due Date</th>
                    <th className="text-right py-3 text-sm font-medium text-neutral-500">Amount</th>
                    <th className="text-right py-3 text-sm font-medium text-neutral-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loan.schedule?.map((payment, index) => (
                    <tr key={payment.id} className="border-b border-neutral-100">
                      <td className="py-3 text-sm text-neutral-600">{index + 1}</td>
                      <td className="py-3 text-sm">{formatDate(payment.due_date)}</td>
                      <td className="py-3 text-sm text-right font-medium">
                        {formatCurrency(payment.amount, loan.currency)}
                      </td>
                      <td className="py-3 text-right">
                        {payment.is_paid ? (
                          <Badge variant="success" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Received
                          </Badge>
                        ) : new Date(payment.due_date) < new Date() ? (
                          <Badge variant="danger" className="text-xs">
                            Overdue
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Scheduled
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Transfers History */}
          {loan.transfers && loan.transfers.length > 0 && (
            <Card className="mb-6">
              <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                Transfer History
              </h3>
              
              <div className="space-y-3">
                {loan.transfers.map((transfer) => (
                  <div key={transfer.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {transfer.type === 'disbursement' ? (
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <ArrowUpRight className="w-5 h-5 text-red-600" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <ArrowDownLeft className="w-5 h-5 text-green-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-neutral-900">
                          {transfer.type === 'disbursement' ? 'Loan Disbursement' : 'Payment Received'}
                        </p>
                        <p className="text-sm text-neutral-500">{formatDate(transfer.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${transfer.type === 'disbursement' ? 'text-red-600' : 'text-green-600'}`}>
                        {transfer.type === 'disbursement' ? '-' : '+'}{formatCurrency(transfer.amount, loan.currency)}
                      </p>
                      <Badge variant={transfer.status === 'processed' ? 'success' : 'default'} className="text-xs">
                        {transfer.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Borrower Info */}
          <Card>
            <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600" />
              Borrower Information
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900">{borrowerName}</p>
                {loan.borrower_invite_email && (
                  <p className="text-sm text-neutral-500">{loan.borrower_invite_email}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {loan.borrower_bank_connected ? (
                    <Badge variant="success" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Bank Connected
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-xs">
                      Bank Not Connected
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <div className="mt-8 text-center">
            <p className="text-sm text-neutral-500 mb-2">Need help with your loan?</p>
            <Link href="/support" className="text-primary-600 hover:underline text-sm">
              Contact Support
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
