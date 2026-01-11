'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Input, Select, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, calculateTotalInterest, calculateLoanTermMonths } from '@/lib/utils';
import { Loan } from '@/types';
import {
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  User,
  CreditCard,
  Percent,
  FileText,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Building2,
  Wallet,
  DollarSign,
  ExternalLink,
  Loader2,
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
  
  // Multi-step flow: 1=Review, 2=Interest, 3=Agreement, 4=Payment
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  
  // Lender inputs
  const [paypalEmail, setPaypalEmail] = useState('');
  const [interestRate, setInterestRate] = useState(0);
  const [interestType, setInterestType] = useState<'simple' | 'compound'>('simple');
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [lenderName, setLenderName] = useState('');
  
  // Payment state
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

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

      if (loanData.status === 'declined' || loanData.status === 'cancelled') {
        setError('This loan request is no longer available.');
        setIsLoading(false);
        return;
      }

      // Check if borrower has signed
      if (!loanData.borrower_signed) {
        setError('The borrower has not yet signed the agreement. Please wait for them to complete their part.');
        setIsLoading(false);
        return;
      }

      setLoan(loanData);
      setBorrower(loanData.borrower);
      setIsLoading(false);
    };

    fetchLoan();
  }, [token]);

  // Calculate totals based on lender's interest rate
  const termMonths = loan ? calculateLoanTermMonths(loan.total_installments, loan.repayment_frequency) : 0;
  const totalInterest = calculateTotalInterest(loan?.amount || 0, interestRate, termMonths, interestType);
  const totalAmount = (loan?.amount || 0) + totalInterest;
  const repaymentAmount = loan ? totalAmount / loan.total_installments : 0;

  const validateStep2 = () => {
    // Interest rate is optional
    return true;
  };

  const validateStep3 = () => {
    if (!lenderName.trim()) {
      setStepError('Please enter your full name');
      return false;
    }
    if (!paypalEmail || !paypalEmail.includes('@')) {
      setStepError('Please enter a valid PayPal email');
      return false;
    }
    if (!agreementAccepted) {
      setStepError('Please accept the agreement to proceed');
      return false;
    }
    return true;
  };

  const goToNextStep = (nextStep: number) => {
    setStepError(null);
    
    let isValid = true;
    if (step === 2) isValid = validateStep2();
    if (step === 3) isValid = validateStep3();

    if (isValid) {
      setStep(nextStep);
    }
  };

  // Create PayPal payment URL
  const getPayPalPaymentUrl = () => {
    const borrowerPayPal = borrower?.paypal_email;
    if (!borrowerPayPal || !loan) return null;
    
    // PayPal.me link for direct payment
    // Format: https://www.paypal.com/paypalme/USERNAME/AMOUNT
    // Or use PayPal send money link
    const amount = loan.amount;
    const currency = loan.currency || 'USD';
    
    // PayPal send money URL
    return `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(borrowerPayPal)}&amount=${amount}&currency_code=${currency}&item_name=${encodeURIComponent(`Loan to ${borrower?.full_name}`)}`;
  };

  const handlePaymentComplete = async () => {
    setPaymentProcessing(true);
    setStepError(null);

    try {
      const response = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token,
          paypalEmail,
          lenderName,
          interestRate,
          interestType,
          paymentCompleted: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to complete');
      }

      setPaymentComplete(true);
      setAccepted(true);
    } catch (err: any) {
      setStepError(err.message || 'Failed to complete. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!loan) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/invite/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Failed to decline loan');
      }

      setDeclined(true);
    } catch (err) {
      setError('Failed to decline the loan. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
        <Card className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-display font-bold text-neutral-900 mb-2">
            Unable to Process
          </h1>
          <p className="text-neutral-500 mb-6">{error}</p>
          <Link href="/">
            <Button variant="outline">Go to Homepage</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
        <Card className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-display font-bold text-neutral-900 mb-2">
            Loan Funded! 🎉
          </h1>
          <p className="text-neutral-500 mb-4">
            You've successfully sent {formatCurrency(loan?.amount || 0, loan?.currency)} to {borrower?.full_name}.
          </p>
          {interestRate > 0 && (
            <p className="text-neutral-500 mb-4">
              With {interestRate}% APR interest, they will repay {formatCurrency(totalAmount, loan?.currency)}.
            </p>
          )}
          <div className="bg-primary-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-primary-800">
              <strong>Next:</strong> {borrower?.full_name} will make {loan?.total_installments} payments of {formatCurrency(repaymentAmount, loan?.currency)} ({loan?.repayment_frequency}) to your PayPal.
            </p>
          </div>
          <div className="space-y-3">
            <Link href="/lender/access">
              <Button className="w-full">Access Your Dashboard</Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="outline" className="w-full">Create Full Account</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
        <Card className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-neutral-100 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-neutral-500" />
          </div>
          <h1 className="text-2xl font-display font-bold text-neutral-900 mb-2">
            Loan Declined
          </h1>
          <p className="text-neutral-500 mb-6">
            You've declined the loan request. {borrower?.full_name} will be notified.
          </p>
          <Link href="/">
            <Button variant="outline">Go to Homepage</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const paypalUrl = getPayPalPaymentUrl();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4 py-12">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">L</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-neutral-900">
            Loan Request
          </h1>
          <p className="text-neutral-500 mt-1">from LoanTrack</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s === step
                  ? 'bg-primary-500 text-white'
                  : s < step
                  ? 'bg-green-500 text-white'
                  : 'bg-neutral-200 text-neutral-500'
              }`}
            >
              {s < step ? <CheckCircle className="w-5 h-5" /> : s}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-8 text-xs text-neutral-500 mb-6">
          <span>Review</span>
          <span>Interest</span>
          <span>Agreement</span>
          <span>Payment</span>
        </div>

        {/* Error Display */}
        {stepError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{stepError}</p>
          </div>
        )}

        <Card className="animate-fade-in">
          {/* Step 1: Review Loan Request */}
          {step === 1 && (
            <>
              {/* Borrower Info */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-neutral-100">
                <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center">
                  <User className="w-7 h-7 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Request from</p>
                  <p className="text-lg font-semibold text-neutral-900">{borrower?.full_name}</p>
                  <p className="text-sm text-neutral-500">{borrower?.email}</p>
                </div>
              </div>

              {/* Loan Amount */}
              <div className="text-center py-6 bg-primary-50 rounded-2xl mb-6">
                <p className="text-sm text-neutral-500 mb-2">Requesting to borrow</p>
                <p className="text-4xl font-bold text-primary-600">
                  {formatCurrency(loan?.amount || 0, loan?.currency || 'USD')}
                </p>
              </div>

              {/* Loan Details */}
              <div className="space-y-4 mb-6">
                {loan?.purpose && (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-neutral-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-neutral-500">Purpose</p>
                      <p className="text-neutral-900">{loan.purpose}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-neutral-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-neutral-500">Repayment Plan</p>
                    <p className="text-neutral-900">
                      {loan?.total_installments} {loan?.repayment_frequency} payments
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-neutral-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-neutral-500">First Payment Date</p>
                    <p className="text-neutral-900">{formatDate(loan?.start_date || '')}</p>
                  </div>
                </div>

                {loan?.pickup_person_name && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-neutral-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-neutral-500">Recipient (in Africa)</p>
                      <p className="text-neutral-900">{loan.pickup_person_name}</p>
                      {loan.pickup_person_location && (
                        <p className="text-sm text-neutral-500">{loan.pickup_person_location}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDecline}
                  loading={isSubmitting}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep(2)}
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Set Interest Rate */}
          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-6"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Percent className="w-8 h-8 text-orange-600" />
                </div>
                <h2 className="text-xl font-bold text-neutral-900 mb-2">Set Interest Rate</h2>
                <p className="text-neutral-500">
                  As the lender, you decide the interest rate (optional)
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Interest Rate (% APR)"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={interestRate}
                    onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <Select
                    label="Interest Type"
                    value={interestType}
                    onChange={(e) => setInterestType(e.target.value as 'simple' | 'compound')}
                    options={[
                      { value: 'simple', label: 'Simple' },
                      { value: 'compound', label: 'Compound' },
                    ]}
                  />
                </div>

                {/* Preview */}
                <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
                  <h4 className="font-semibold text-neutral-900">Repayment Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-neutral-500">You send now:</span>
                    <span className="text-right font-bold text-primary-600">{formatCurrency(loan?.amount || 0, loan?.currency)}</span>
                    {interestRate > 0 && (
                      <>
                        <span className="text-neutral-500">Interest earned:</span>
                        <span className="text-right text-green-600">+{formatCurrency(totalInterest, loan?.currency)}</span>
                      </>
                    )}
                    <span className="text-neutral-500 font-medium">Total you'll receive:</span>
                    <span className="text-right font-bold">{formatCurrency(totalAmount, loan?.currency)}</span>
                    <span className="text-neutral-500">Per payment:</span>
                    <span className="text-right">{formatCurrency(repaymentAmount, loan?.currency)} × {loan?.total_installments}</span>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm text-green-800">
                    <strong>Tip:</strong> 0% interest is common for loans between friends and family.
                  </p>
                </div>
              </div>

              <Button className="w-full" onClick={() => goToNextStep(3)}>
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}

          {/* Step 3: Sign Agreement */}
          {step === 3 && (
            <>
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-6"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-neutral-900 mb-2">Sign Agreement</h2>
                <p className="text-neutral-500">
                  Review terms and provide your details
                </p>
              </div>

              {/* Agreement Summary */}
              <div className="bg-neutral-50 rounded-xl p-4 mb-4 space-y-3">
                <h4 className="font-semibold text-neutral-900">Loan Terms</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Borrower:</strong> {borrower?.full_name}</p>
                  <p><strong>You send:</strong> {formatCurrency(loan?.amount || 0, loan?.currency)}</p>
                  {interestRate > 0 && (
                    <p><strong>Interest Rate:</strong> {interestRate}% APR ({interestType})</p>
                  )}
                  <p><strong>You receive back:</strong> {formatCurrency(totalAmount, loan?.currency)}</p>
                  <p><strong>In:</strong> {loan?.total_installments} {loan?.repayment_frequency} payments</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <Input
                  label="Your Full Legal Name"
                  value={lenderName}
                  onChange={(e) => setLenderName(e.target.value)}
                  placeholder="Enter your full name"
                />

                <Input
                  label="Your PayPal Email (to receive repayments)"
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="your@paypal.com"
                  icon={<CreditCard className="w-4 h-4" />}
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
                    I understand they will repay {formatCurrency(totalAmount, loan?.currency)} to my PayPal ({paypalEmail || '[your email]'}).
                  </span>
                </label>
              </div>

              <Button 
                className="w-full" 
                onClick={() => goToNextStep(4)}
                disabled={!agreementAccepted || !lenderName || !paypalEmail}
              >
                Continue to Payment
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}

          {/* Step 4: Make Payment */}
          {step === 4 && (
            <>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-6"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-neutral-900 mb-2">Send Payment</h2>
                <p className="text-neutral-500">
                  Send {formatCurrency(loan?.amount || 0, loan?.currency)} to {borrower?.full_name}
                </p>
              </div>

              {/* Payment Details */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="text-center">
                  <p className="text-sm text-green-700 mb-2">Send to borrower's PayPal:</p>
                  <p className="text-lg font-bold text-green-800">{borrower?.paypal_email}</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {formatCurrency(loan?.amount || 0, loan?.currency)}
                  </p>
                </div>
              </div>

              {/* PayPal Button */}
              {paypalUrl && borrower?.paypal_email ? (
                <div className="space-y-4">
                  <a
                    href={paypalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-[#0070ba] hover:bg-[#005ea6] text-white font-bold py-4 px-6 rounded-xl transition-colors"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                    </svg>
                    Pay with PayPal
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <div className="text-center">
                    <p className="text-sm text-neutral-500 mb-4">
                      After completing payment in PayPal, click below:
                    </p>
                    <Button 
                      className="w-full" 
                      onClick={handlePaymentComplete}
                      loading={paymentProcessing}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      I've Completed the Payment
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">PayPal not set up</p>
                      <p className="text-sm text-yellow-700">
                        The borrower hasn't connected their PayPal account yet. Please contact them to set up PayPal before proceeding.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-neutral-50 rounded-xl">
                <h4 className="font-medium text-neutral-900 mb-2">What happens next?</h4>
                <ul className="text-sm text-neutral-600 space-y-1">
                  <li>• {borrower?.full_name} receives {formatCurrency(loan?.amount || 0, loan?.currency)} in their PayPal</li>
                  <li>• They will repay you {formatCurrency(repaymentAmount, loan?.currency)} {loan?.repayment_frequency}</li>
                  <li>• You'll receive payments to: {paypalEmail}</li>
                  <li>• Both of you can track progress on LoanTrack</li>
                </ul>
              </div>
            </>
          )}
        </Card>

        <p className="text-center text-sm text-neutral-500 mt-8">
          Questions? Reply to the invite email or contact support.
        </p>
      </div>
    </div>
  );
}
