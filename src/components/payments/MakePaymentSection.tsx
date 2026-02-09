'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { PaymentMethodSelector, PaymentProofUpload } from '@/components/payments';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Banknote,
  CreditCard,
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Loader2,
  X,
  Zap,
  Building2,
} from 'lucide-react';

interface PaymentScheduleItem {
  id: string;
  due_date: string;
  amount: number;
  principal_amount?: number;
  interest_amount?: number;
  is_paid: boolean;
}

interface PaymentMethod {
  id: string;
  slug: string;
  name: string;
  type: string;
  isAutomated: boolean;
  requiresProof: boolean;
  brandColor: string;
  instructions: string;
  accountIdentifierLabel?: string | null;
}

interface MakePaymentSectionProps {
  loanId: string;
  currency: string;
  schedule: PaymentScheduleItem[];
  userCountry: string;
  borrowerBankConnected?: boolean;
  lenderPaymentIdentifiers?: {
    cashapp?: string;
    venmo?: string;
    zelle?: string;
    mpesa?: string;
    paypal?: string;
  };
  onPaymentComplete?: () => void;
  // Auto-pay props (for Dwolla when enabled)
  autoPayEnabled?: boolean;
  onProcessAutoPay?: (scheduleId: string) => Promise<void>;
}

type PaymentStep = 'select-payment' | 'select-method' | 'upload-proof' | 'awaiting-confirmation' | 'completed';

export default function MakePaymentSection({
  loanId,
  currency,
  schedule,
  userCountry,
  borrowerBankConnected,
  lenderPaymentIdentifiers,
  onPaymentComplete,
  autoPayEnabled,
  onProcessAutoPay,
}: MakePaymentSectionProps) {
  const [step, setStep] = useState<PaymentStep>('select-payment');
  const [selectedPayment, setSelectedPayment] = useState<PaymentScheduleItem | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dwollaEnabled, setDwollaEnabled] = useState(false);

  // Check if Dwolla is enabled
  useEffect(() => {
    checkDwollaStatus();
  }, [userCountry]);

  const checkDwollaStatus = async () => {
    try {
      const res = await fetch(`/api/payment-methods?country=${userCountry}&type=disbursement`);
      const data = await res.json();
      const dwolla = (data.providers || []).find((p: any) => p.slug === 'dwolla');
      setDwollaEnabled(!!dwolla);
    } catch (err) {
      console.error('Failed to check Dwolla status:', err);
    }
  };

  // Get next unpaid payment
  const nextPayment = schedule.find(s => !s.is_paid);
  const unpaidPayments = schedule.filter(s => !s.is_paid);

  if (!nextPayment) {
    return (
      <Card className="p-6">
        <div className="text-center py-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="font-semibold text-neutral-900 dark:text-white">All Payments Complete!</h3>
          <p className="text-sm text-neutral-500 mt-1">This loan has been fully repaid.</p>
        </div>
      </Card>
    );
  }

  const dueDate = new Date(nextPayment.due_date);
  const today = new Date();
  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntilDue < 0;
  const isDueToday = daysUntilDue === 0;

  // Handle auto-pay (Dwolla)
  const handleAutoPay = async () => {
    if (!onProcessAutoPay || !selectedPayment) return;
    
    setIsProcessing(true);
    setError(null);
    try {
      await onProcessAutoPay(selectedPayment.id);
      setStep('completed');
      onPaymentComplete?.();
    } catch (err: any) {
      setError(err.message || 'Auto-pay failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle manual payment method selection
  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    
    if (method.isAutomated && borrowerBankConnected && autoPayEnabled) {
      // Use auto-pay
      handleAutoPay();
    } else {
      // Go to proof upload
      setStep('upload-proof');
    }
  };

  // Handle payment proof submission success
  const handleProofSuccess = (transaction: any) => {
    if (transaction.awaiting_confirmation) {
      setStep('awaiting-confirmation');
    } else {
      setStep('completed');
      onPaymentComplete?.();
    }
  };

  // Get lender's payment identifier for selected method
  const getLenderIdentifier = () => {
    if (!selectedMethod || !lenderPaymentIdentifiers) return undefined;
    return lenderPaymentIdentifiers[selectedMethod.slug as keyof typeof lenderPaymentIdentifiers];
  };

  // Reset flow
  const resetFlow = () => {
    setStep('select-payment');
    setSelectedPayment(null);
    setSelectedMethod(null);
    setError(null);
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-green-100 dark:border-green-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <Banknote className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="font-semibold text-neutral-900 dark:text-white">Make a Payment</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {unpaidPayments.length} payment{unpaidPayments.length !== 1 ? 's' : ''} remaining
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}

        {/* Step 1: Select Payment */}
        {step === 'select-payment' && (
          <div className="space-y-3">
            {/* Next Due Payment (highlighted) */}
            <button
              onClick={() => { setSelectedPayment(nextPayment); setStep('select-method'); }}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                isOverdue 
                  ? 'border-red-300 bg-red-50 hover:border-red-400' 
                  : isDueToday 
                  ? 'border-amber-300 bg-amber-50 hover:border-amber-400' 
                  : 'border-primary-200 bg-primary-50 hover:border-primary-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isOverdue ? 'destructive' : isDueToday ? 'warning' : 'primary'} size="sm">
                      {isOverdue ? `Overdue ${Math.abs(daysUntilDue)}d` : isDueToday ? 'Due Today' : `Due in ${daysUntilDue}d`}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-neutral-900 mt-2">
                    {formatCurrency(nextPayment.amount, currency)}
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">
                    Due {formatDate(nextPayment.due_date)}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-400" />
              </div>
            </button>

            {/* Other unpaid payments */}
            {unpaidPayments.length > 1 && (
              <div className="pt-2">
                <p className="text-sm text-neutral-500 mb-2">Or pay a future installment:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {unpaidPayments.slice(1).map(payment => (
                    <button
                      key={payment.id}
                      onClick={() => { setSelectedPayment(payment); setStep('select-method'); }}
                      className="w-full p-3 rounded-lg border border-neutral-200 hover:border-neutral-300 text-left flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-neutral-900">{formatCurrency(payment.amount, currency)}</p>
                        <p className="text-xs text-neutral-500">{formatDate(payment.due_date)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Payment Method */}
        {step === 'select-method' && selectedPayment && (
          <div>
            <button
              onClick={() => setStep('select-payment')}
              className="text-sm text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-1"
            >
              ← Back
            </button>

            <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <p className="text-sm text-neutral-500">Paying</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {formatCurrency(selectedPayment.amount, currency)}
              </p>
            </div>

            {/* Show auto-pay option if Dwolla enabled and bank connected */}
            {dwollaEnabled && borrowerBankConnected && autoPayEnabled && (
              <div className="mb-4">
                <button
                  onClick={handleAutoPay}
                  disabled={isProcessing}
                  className="w-full p-4 rounded-xl border-2 border-primary-500 bg-primary-50 hover:bg-primary-100 text-left flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-900">Auto-Pay from Bank</span>
                      <Badge variant="primary" size="sm">Recommended</Badge>
                    </div>
                    <p className="text-sm text-neutral-500">Instant transfer from your connected bank</p>
                  </div>
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-primary-600" />
                  )}
                </button>
                
                <div className="flex items-center gap-4 my-4">
                  <div className="flex-1 h-px bg-neutral-200" />
                  <span className="text-sm text-neutral-400">or pay manually</span>
                  <div className="flex-1 h-px bg-neutral-200" />
                </div>
              </div>
            )}

            <PaymentMethodSelector
              country={userCountry}
              transactionType="repayment"
              amount={selectedPayment.amount}
              currency={currency}
              onSelect={handleMethodSelect}
              selectedMethodId={selectedMethod?.id}
              showInstructions
            />
          </div>
        )}

        {/* Step 3: Upload Proof */}
        {step === 'upload-proof' && selectedPayment && selectedMethod && (
          <div>
            <button
              onClick={() => setStep('select-method')}
              className="text-sm text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-1"
            >
              ← Change method
            </button>

            <PaymentProofUpload
              loanId={loanId}
              paymentScheduleId={selectedPayment.id}
              paymentProviderId={selectedMethod.id}
              providerName={selectedMethod.name}
              amount={selectedPayment.amount}
              currency={currency}
              transactionType="repayment"
              receiverIdentifier={getLenderIdentifier()}
              onSuccess={handleProofSuccess}
              onCancel={() => setStep('select-method')}
            />
          </div>
        )}

        {/* Step 4: Awaiting Confirmation */}
        {step === 'awaiting-confirmation' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Awaiting Confirmation
            </h3>
            <p className="text-neutral-500 mb-4">
              Your payment proof has been submitted. The lender will confirm receipt shortly.
            </p>
            <Button variant="outline" onClick={resetFlow}>
              Make Another Payment
            </Button>
          </div>
        )}

        {/* Step 5: Completed */}
        {step === 'completed' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Payment Complete!
            </h3>
            <p className="text-neutral-500 mb-4">
              Your payment has been processed successfully.
            </p>
            <Button variant="outline" onClick={resetFlow}>
              View Remaining Payments
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
