'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
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
} from 'lucide-react';
import { FaHandHoldingUsd } from 'react-icons/fa';

export default function FundLoanPage() {
  const params = useParams();
  const router = useRouter();
  const loanId = params.id as string;

  const [loan, setLoan] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  const handleFundLoan = async () => {
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
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/loans/${loanId}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to fund loan');
    } finally {
      setIsFunding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500 dark:text-primary-400" />
      </div>
    );
  }

  if (!loan) {
    return null;
  }

  const borrower = loan.borrower;
  const borrowerBankConnected = loan.borrower_bank_connected || 
    loan.borrower_dwolla_funding_source_url ||
    borrower?.dwolla_funding_source_url;
  const borrowerBankName = loan.borrower_bank_name || borrower?.bank_name;
  const borrowerBankMask = loan.borrower_bank_account_mask || borrower?.bank_account_mask;

  const lenderBankConnected = user?.dwolla_funding_source_url;
  const lenderBankName = user?.bank_name;
  const lenderBankMask = user?.bank_account_mask;

  const canFund = borrowerBankConnected && lenderBankConnected && agreementAccepted;

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
        <Navbar user={user} />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md text-center p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Funds Sent!</h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              The transfer of {formatCurrency(loan.amount, loan.currency)} to {borrower?.full_name || 'the borrower'} has been initiated.
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              The borrower will receive the funds in 1-3 business days via ACH transfer.
            </p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-4">Redirecting...</p>
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
            className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to loan details
          </Link>

          <Card className="mb-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                <Banknote className="w-6 h-6 text-primary-600 dark:text-primary-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Fund This Loan</h1>
                <p className="text-neutral-500 dark:text-neutral-400">Review and sign the agreement, then send funds</p>
              </div>
            </div>

            {/* Loan Summary */}
            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Loan Summary
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">Borrower</span>
                  <p className="font-medium text-neutral-900 dark:text-white">{borrower?.full_name || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">Amount</span>
                  <p className="font-bold text-lg text-primary-600 dark:text-primary-500">{formatCurrency(loan.amount, loan.currency)}</p>
                </div>
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">Interest Rate</span>
                  <p className="font-medium text-neutral-900 dark:text-white">{loan.interest_rate || 0}% ({loan.interest_type || 'simple'})</p>
                </div>
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">Total Repayment</span>
                  <p className="font-medium text-neutral-900 dark:text-white">{formatCurrency(loan.total_amount || loan.amount, loan.currency)}</p>
                </div>
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">Installments</span>
                  <p className="font-medium text-neutral-900 dark:text-white">{loan.total_installments} × {formatCurrency(loan.repayment_amount || 0, loan.currency)}</p>
                </div>
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">First Payment</span>
                  <p className="font-medium text-neutral-900 dark:text-white">{loan.start_date ? formatDate(loan.start_date) : 'TBD'}</p>
                </div>
                {loan.purpose && (
                  <div className="col-span-2">
                    <span className="text-neutral-500 dark:text-neutral-400">Purpose</span>
                    <p className="font-medium text-neutral-900 dark:text-white">{loan.purpose}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Accounts */}
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4" />
                Transfer Details
              </h3>

              {/* Your Bank */}
              <div className={`p-4 rounded-xl border ${lenderBankConnected ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${lenderBankConnected ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                      <CreditCard className={`w-5 h-5 ${lenderBankConnected ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">From: Your Bank</p>
                      {lenderBankConnected ? (
                        <p className="font-medium text-neutral-900 dark:text-white">{lenderBankName || 'Bank Account'} {lenderBankMask && `(••••${lenderBankMask})`}</p>
                      ) : (
                        <p className="font-medium text-red-700 dark:text-red-400">Not Connected</p>
                      )}
                    </div>
                  </div>
                  {lenderBankConnected ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500" />
                  ) : (
                    <Link href="/settings" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                      Connect →
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex justify-center">
                <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-neutral-400 dark:text-neutral-500 rotate-[-90deg]" />
                </div>
              </div>

              {/* Borrower's Bank */}
              <div className={`p-4 rounded-xl border ${borrowerBankConnected ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${borrowerBankConnected ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                      <User className={`w-5 h-5 ${borrowerBankConnected ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">To: {borrower?.full_name || 'Borrower'}'s Bank</p>
                      {borrowerBankConnected ? (
                        <p className="font-medium text-neutral-900 dark:text-white">{borrowerBankName || 'Bank Account'} {borrowerBankMask && `(••••${borrowerBankMask})`}</p>
                      ) : (
                        <p className="font-medium text-red-700 dark:text-red-400">Not Connected</p>
                      )}
                    </div>
                  </div>
                  {borrowerBankConnected && (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500" />
                  )}
                </div>
              </div>

              {!borrowerBankConnected && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    The borrower hasn't connected their bank account yet. Please ask them to connect their bank in Settings before you can fund this loan.
                  </p>
                </div>
              )}
            </div>

            {/* Loan Agreement */}
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Loan Agreement
              </h3>
              
              <div className="text-sm text-neutral-600 dark:text-neutral-300 space-y-2 max-h-48 overflow-y-auto mb-4 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                <p><strong className="text-neutral-900 dark:text-white">1. Loan Agreement</strong></p>
                <p>
                  I agree to lend {formatCurrency(loan.amount, loan.currency)} to {borrower?.full_name || 'the borrower'} and 
                  will receive a total repayment of {formatCurrency(loan.total_amount || loan.amount, loan.currency)}.
                </p>
                <p><strong className="text-neutral-900 dark:text-white">2. Disbursement</strong></p>
                <p>
                  I authorize the transfer of {formatCurrency(loan.amount, loan.currency)} from my connected bank account
                  to the borrower's bank account via ACH. This transfer typically takes 1-3 business days.
                </p>
                <p><strong className="text-neutral-900 dark:text-white">3. Repayment Terms</strong></p>
                <p>
                  The borrower will make {loan.total_installments} payments of {formatCurrency(loan.repayment_amount || 0, loan.currency)} each,
                  starting on {loan.start_date ? formatDate(loan.start_date) : 'the agreed date'}.
                </p>
                <p><strong className="text-neutral-900 dark:text-white">4. Auto-Pay</strong></p>
                <p>
                  Repayments will be automatically collected from the borrower's bank account on each due date
                  and deposited to my bank account.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreementAccepted}
                  onChange={(e) => setAgreementAccepted(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-neutral-300 dark:border-neutral-600 text-primary-600 dark:text-primary-500 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  I have read and agree to the loan agreement terms. I authorize the transfer of funds from my bank account.
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
                  Processing Transfer...
                </>
              ) : (
                <>
                  <Banknote className="w-4 h-4 mr-2" />
                  Sign Agreement & Send {formatCurrency(loan.amount, loan.currency)}
                </>
              )}
            </Button>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-3 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              Funds will be transferred via ACH (1-3 business days)
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}