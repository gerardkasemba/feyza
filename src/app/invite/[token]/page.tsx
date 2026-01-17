'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Input, Badge } from '@/components/ui';
import { PlaidLinkButton, ConnectedBank } from '@/components/payments/PlaidLink';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, calculateTotalInterest, calculateLoanTermMonths } from '@/lib/utils';
import { Loan } from '@/types';
import {
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  AlertCircle,
  User,
  Building,
  Percent,
  FileText,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Loader2,
  Shield,
} from 'lucide-react';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const [loan, setLoan] = useState<Loan | null>(null);
  const [borrower, setBorrower] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);
  
  // Multi-step flow: 1=Review, 2=Interest, 3=Bank Connection, 4=Agreement, 5=Confirm
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  
  // Lender inputs
  const [interestRate, setInterestRate] = useState(0);
  const [interestType, setInterestType] = useState<'simple' | 'compound'>('simple');
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [lenderName, setLenderName] = useState('');
  const [lenderEmail, setLenderEmail] = useState('');
  
  // Bank connection state
  const [bankConnected, setBankConnected] = useState(false);
  const [bankInfo, setBankInfo] = useState<any>(null);
  
  // Payment state
  const [disbursing, setDisbursing] = useState(false);
  const [disbursementComplete, setDisbursementComplete] = useState(false);

  useEffect(() => {
    const fetchLoan = async () => {
      const supabase = createClient();
      
      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select(`
          *,
          borrower:users!borrower_id(*)
        `)
        .eq('invite_token', token)
        .single();

      if (loanError || !loanData) {
        setError('This invite link is invalid or has expired.');
        setIsLoading(false);
        return;
      }

      if (loanData.invite_accepted) {
        setError('This loan request has already been accepted.');
        setIsLoading(false);
        return;
      }

      if (loanData.status !== 'pending') {
        setError('This loan is no longer available.');
        setIsLoading(false);
        return;
      }

      // Check if borrower has bank connected
      if (!loanData.borrower?.bank_connected) {
        setError('The borrower has not connected their bank account yet. Please ask them to connect their bank before you can proceed.');
        setIsLoading(false);
        return;
      }

      setLoan(loanData);
      setBorrower(loanData.borrower);
      setIsLoading(false);
    };

    fetchLoan();
  }, [token]);

  // Calculate loan with interest
  const termMonths = loan ? calculateLoanTermMonths(
    loan.total_installments,
    loan.repayment_frequency
  ) : 0;
  
  const totalInterest = loan ? calculateTotalInterest(
    loan.amount,
    interestRate,
    termMonths,
    interestType
  ) : 0;
  
  const totalAmount = (loan?.amount || 0) + totalInterest;
  const repaymentAmount = loan ? totalAmount / loan.total_installments : 0;

  const goToNextStep = (nextStep: number) => {
    setStepError(null);
    
    if (step === 2) {
      // Validate interest rate
      if (interestRate < 0 || interestRate > 100) {
        setStepError('Interest rate must be between 0% and 100%');
        return;
      }
    }
    
    if (step === 3) {
      // Validate bank connection
      if (!bankConnected) {
        setStepError('Please connect your bank account to receive repayments');
        return;
      }
    }
    
    if (step === 4) {
      // Validate agreement
      if (!lenderName || !lenderEmail) {
        setStepError('Please enter your name and email');
        return;
      }
      if (!agreementAccepted) {
        setStepError('Please accept the agreement');
        return;
      }
    }
    
    setStep(nextStep);
  };

  const handleBankConnected = (data: any) => {
    setBankConnected(true);
    setBankInfo(data);
    setStepError(null);
  };

  const handleAcceptAndDisburse = async () => {
    if (!loan || !bankInfo) return;
    
    setDisbursing(true);
    setStepError(null);
    
    try {
      const supabase = createClient();
      
      // First, create a guest user account for the lender
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      let lenderId = authUser?.id;
      
      // If not logged in, we need to create a guest lender record
      if (!lenderId) {
        // Create user record for guest lender
        const response = await fetch('/api/guest/create-lender', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: lenderName,
            email: lenderEmail,
            bank_info: bankInfo,
          }),
        });
        
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        lenderId = result.user_id;
      }
      
      // Accept the loan and set interest terms
      const { error: updateError } = await supabase
        .from('loans')
        .update({
          lender_id: lenderId,
          invite_accepted: true,
          invite_accepted_at: new Date().toISOString(),
          interest_rate: interestRate,
          interest_type: interestType,
          total_interest: Math.round(totalInterest * 100) / 100,
          total_amount: Math.round(totalAmount * 100) / 100,
          repayment_amount: Math.round(repaymentAmount * 100) / 100,
          amount_remaining: Math.round(totalAmount * 100) / 100,
          lender_signed: true,
          lender_signed_at: new Date().toISOString(),
        })
        .eq('id', loan.id);

      if (updateError) throw updateError;

      // Initiate Dwolla transfer (disbursement)
      const transferResponse = await fetch('/api/dwolla/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'disbursement',
          loan_id: loan.id,
          amount: loan.amount,
        }),
      });

      const transferResult = await transferResponse.json();
      
      if (transferResult.error) {
        console.error('Transfer error:', transferResult.error);
        // Don't fail completely - loan is accepted, transfer can be retried
      }

      setDisbursementComplete(true);
      setAccepted(true);
    } catch (error: any) {
      console.error('Error accepting loan:', error);
      setStepError(error.message || 'Failed to process. Please try again.');
    } finally {
      setDisbursing(false);
    }
  };

  const handleDecline = async () => {
    if (!loan) return;
    
    setIsSubmitting(true);
    
    try {
      const supabase = createClient();
      
      await supabase
        .from('loans')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
        })
        .eq('id', loan.id);

      setDeclined(true);
    } catch (error) {
      console.error('Error declining loan:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-teal-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-neutral-600">Loading loan details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Unable to Load</h1>
          <p className="text-neutral-600 mb-6">{error}</p>
          <Link href="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-neutral-600" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Request Declined</h1>
          <p className="text-neutral-600 mb-6">
            You've declined this loan request. {borrower?.full_name} will be notified.
          </p>
          <Link href="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Loan Accepted!</h1>
          <p className="text-neutral-600 mb-4">
            {formatCurrency(loan?.amount || 0, loan?.currency)} is being transferred to {borrower?.full_name}'s bank account.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left">
            <h3 className="font-semibold text-green-800 mb-2">What happens next:</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Funds will arrive in 1-3 business days</li>
              <li>• You'll receive {loan?.total_installments} repayments of {formatCurrency(repaymentAmount, loan?.currency)}</li>
              <li>• We'll email you when each payment is received</li>
            </ul>
          </div>
          <p className="text-sm text-neutral-500">
            Check your email for confirmation and repayment schedule.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-teal-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Loan Request</h1>
          <p className="text-neutral-600">
            {borrower?.full_name} is asking to borrow money from you
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s === step
                  ? 'bg-primary-600 text-white'
                  : s < step
                  ? 'bg-green-500 text-white'
                  : 'bg-neutral-200 text-neutral-500'
              }`}
            >
              {s < step ? <CheckCircle className="w-4 h-4" /> : s}
            </div>
          ))}
        </div>

        <Card className="p-6">
          {stepError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">{stepError}</span>
            </div>
          )}

          {/* Step 1: Review Request */}
          {step === 1 && (
            <>
              <h2 className="text-lg font-bold text-neutral-900 mb-4">Review Request</h2>
              
              <div className="flex items-center gap-4 mb-6 p-4 bg-neutral-50 rounded-xl">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">{borrower?.full_name}</p>
                  <p className="text-sm text-neutral-500">{borrower?.email}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between p-3 bg-neutral-50 rounded-lg">
                  <span className="text-neutral-600">Amount Requested</span>
                  <span className="font-bold text-neutral-900">{formatCurrency(loan?.amount || 0, loan?.currency)}</span>
                </div>
                <div className="flex justify-between p-3 bg-neutral-50 rounded-lg">
                  <span className="text-neutral-600">Purpose</span>
                  <span className="font-medium text-neutral-900">{loan?.purpose || 'Not specified'}</span>
                </div>
                <div className="flex justify-between p-3 bg-neutral-50 rounded-lg">
                  <span className="text-neutral-600">Repayment</span>
                  <span className="font-medium text-neutral-900">
                    {loan?.total_installments} {loan?.repayment_frequency} payments
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-neutral-50 rounded-lg">
                  <span className="text-neutral-600">Start Date</span>
                  <span className="font-medium text-neutral-900">
                    {loan?.start_date ? formatDate(new Date(loan.start_date)) : 'TBD'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleDecline} loading={isSubmitting} className="flex-1">
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
                <Button onClick={() => goToNextStep(2)} className="flex-1">
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Set Interest */}
          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <h2 className="text-lg font-bold text-neutral-900 mb-4">Set Interest Rate</h2>
              <p className="text-neutral-600 mb-6">
                Choose how much interest (if any) you want to charge on this loan.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Annual Interest Rate (%)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="0.5"
                      value={interestRate}
                      onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-16 text-center font-bold text-lg">{interestRate}%</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setInterestRate(0); setInterestType('simple'); }}
                    className={`flex-1 p-3 rounded-lg border text-center ${
                      interestRate === 0 ? 'border-primary-500 bg-primary-50' : 'border-neutral-200'
                    }`}
                  >
                    <span className="text-sm font-medium">0% (No Interest)</span>
                  </button>
                  <button
                    onClick={() => setInterestRate(5)}
                    className={`flex-1 p-3 rounded-lg border text-center ${
                      interestRate === 5 ? 'border-primary-500 bg-primary-50' : 'border-neutral-200'
                    }`}
                  >
                    <span className="text-sm font-medium">5%</span>
                  </button>
                  <button
                    onClick={() => setInterestRate(10)}
                    className={`flex-1 p-3 rounded-lg border text-center ${
                      interestRate === 10 ? 'border-primary-500 bg-primary-50' : 'border-neutral-200'
                    }`}
                  >
                    <span className="text-sm font-medium">10%</span>
                  </button>
                </div>

                {/* Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Loan Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Principal</span>
                      <span className="font-medium">{formatCurrency(loan?.amount || 0, loan?.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Interest ({interestRate}%)</span>
                      <span className="font-medium">+{formatCurrency(totalInterest, loan?.currency)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-blue-200">
                      <span className="text-blue-800 font-semibold">Total Repayment</span>
                      <span className="font-bold text-blue-900">{formatCurrency(totalAmount, loan?.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Each Payment</span>
                      <span className="font-medium">{formatCurrency(repaymentAmount, loan?.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={() => goToNextStep(3)} className="w-full">
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}

          {/* Step 3: Connect Bank */}
          {step === 3 && (
            <>
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <h2 className="text-lg font-bold text-neutral-900 mb-4">Connect Your Bank</h2>
              <p className="text-neutral-600 mb-6">
                Connect your bank account to send the loan and receive repayments.
              </p>

              {bankConnected && bankInfo ? (
                <div className="mb-6">
                  <ConnectedBank
                    bankName={bankInfo.bank_name}
                    accountMask={bankInfo.account_mask}
                    accountType={bankInfo.account_type}
                  />
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">Bank connected successfully!</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
                    <Building className="w-8 h-8 text-neutral-400" />
                  </div>
                  <p className="text-neutral-600 mb-4">
                    Securely connect your bank to send funds.
                  </p>
                  <PlaidLinkButton
                    onSuccess={handleBankConnected}
                    onError={(err) => setStepError(err)}
                    buttonText="Connect Bank Account"
                  />
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Secure & Protected</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      We use Plaid to securely connect to your bank. We never see your login credentials.
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => goToNextStep(4)} 
                className="w-full"
                disabled={!bankConnected}
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}

          {/* Step 4: Agreement */}
          {step === 4 && (
            <>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <h2 className="text-lg font-bold text-neutral-900 mb-4">Loan Agreement</h2>

              <div className="space-y-4 mb-6">
                <Input
                  label="Your Full Legal Name"
                  value={lenderName}
                  onChange={(e) => setLenderName(e.target.value)}
                  placeholder="Enter your full name"
                />

                <Input
                  label="Your Email"
                  type="email"
                  value={lenderEmail}
                  onChange={(e) => setLenderEmail(e.target.value)}
                  placeholder="your@email.com"
                />

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreementAccepted}
                    onChange={(e) => setAgreementAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-600">
                    I, <strong>{lenderName || '[Your Name]'}</strong>, agree to lend {formatCurrency(loan?.amount || 0, loan?.currency)} to {borrower?.full_name}. 
                    I understand they will repay {formatCurrency(totalAmount, loan?.currency)} to my bank account over {loan?.total_installments} {loan?.repayment_frequency} payments.
                  </span>
                </label>
              </div>

              <Button 
                className="w-full" 
                onClick={() => goToNextStep(5)}
                disabled={!agreementAccepted || !lenderName || !lenderEmail}
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}

          {/* Step 5: Confirm & Disburse */}
          {step === 5 && (
            <>
              <button
                onClick={() => setStep(4)}
                className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-neutral-900 mb-2">Confirm & Send</h2>
                <p className="text-neutral-500">
                  Review and send {formatCurrency(loan?.amount || 0, loan?.currency)} to {borrower?.full_name}
                </p>
              </div>

              {/* Summary */}
              <div className="bg-neutral-50 rounded-xl p-4 mb-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-600">You're sending</span>
                  <span className="font-bold text-lg">{formatCurrency(loan?.amount || 0, loan?.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">To</span>
                  <span className="font-medium">{borrower?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">From</span>
                  <span className="font-medium">{bankInfo?.bank_name} ••••{bankInfo?.account_mask}</span>
                </div>
                <hr />
                <div className="flex justify-between">
                  <span className="text-neutral-600">You'll receive back</span>
                  <span className="font-bold text-green-600">{formatCurrency(totalAmount, loan?.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Your profit</span>
                  <span className="font-medium text-green-600">+{formatCurrency(totalInterest, loan?.currency)}</span>
                </div>
              </div>

              <Button 
                className="w-full bg-green-600 hover:bg-green-700" 
                onClick={handleAcceptAndDisburse}
                loading={disbursing}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Accept & Send {formatCurrency(loan?.amount || 0, loan?.currency)}
              </Button>

              <p className="text-xs text-neutral-500 text-center mt-4">
                Funds typically arrive in 1-3 business days via ACH transfer.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
