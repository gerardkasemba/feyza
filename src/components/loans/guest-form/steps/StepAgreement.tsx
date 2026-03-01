'use client';

import React from 'react';
import { ChevronLeft, FileText, AlertTriangle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import type { GuestLoanFormHook } from '../useGuestLoanForm';

type Props = Pick<
  GuestLoanFormHook,
  | 'isLoggedIn'
  | 'lenderType'
  | 'isDwollaEnabled'
  | 'step'
  | 'setStep'
  | 'setStepError'
  | 'setSubmitError'
  | 'agreementAccepted'
  | 'setAgreementAccepted'
  | 'showFullTerms'
  | 'setShowFullTerms'
  | 'amount'
  | 'totalInstallments'
  | 'interestRate'
  | 'totalInterest'
  | 'totalAmount'
  | 'repaymentAmount'
  | 'startDate'
  | 'isSubmitting'
>;

export function StepAgreement({
  isLoggedIn,
  lenderType,
  isDwollaEnabled,
  step,
  setStep,
  setStepError,
  setSubmitError,
  agreementAccepted,
  setAgreementAccepted,
  showFullTerms,
  setShowFullTerms,
  amount,
  totalInstallments,
  interestRate,
  totalInterest,
  totalAmount,
  repaymentAmount,
  startDate,
  isSubmitting,
}: Props) {
  const handleBack = () => {
    if (isLoggedIn && step === 5) {
      setStep(isDwollaEnabled ? 4 : 3);
    } else {
      setStep(step - 1);
    }
    setStepError(null);
    setSubmitError(null);
  };

  return (
    <div className="pt-4 space-y-5 animate-fade-in">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 -ml-1 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight mb-1">Review & Sign Agreement</h2>
        <p className="text-neutral-500">Review and accept the loan terms</p>
      </div>

      <Card className="bg-primary-50 border-primary-200">
        <h4 className="font-semibold text-primary-900 mb-3">Loan Summary</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-primary-700">Principal:</span>
          <span className="text-right font-medium text-primary-900">{formatCurrency(amount)}</span>

          {interestRate > 0 && (
            <>
              <span className="text-primary-700">Interest Rate:</span>
              <span className="text-right font-medium text-primary-900">{formatPercentage(interestRate)}</span>
              <span className="text-primary-700">Total Interest:</span>
              <span className="text-right font-medium text-orange-600">{formatCurrency(totalInterest)}</span>
            </>
          )}

          <span className="text-primary-700">Total to Repay:</span>
          <span className="text-right font-bold text-primary-900">{formatCurrency(totalAmount)}</span>

          <span className="text-primary-700">Installments:</span>
          <span className="text-right font-medium text-primary-900">
            {totalInstallments} × {formatCurrency(repaymentAmount)}
          </span>

          <span className="text-primary-700">Start Date:</span>
          <span className="text-right font-medium text-primary-900">
            {startDate ? new Date(startDate).toLocaleDateString() : '—'}
          </span>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" /> Loan Agreement Terms
          </h4>
          <button
            type="button"
            onClick={() => setShowFullTerms(!showFullTerms)}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {showFullTerms ? 'Hide' : 'Show'} full terms
          </button>
        </div>

        {showFullTerms && (
          <div className="text-sm text-neutral-600 space-y-3 max-h-64 overflow-y-auto mb-4 p-4 bg-neutral-50 rounded-lg">
            <p><strong>1. Loan Agreement</strong></p>
            <p>I agree to borrow {formatCurrency(amount)} and repay a total of {formatCurrency(totalAmount)} according to the payment schedule.</p>
            <p><strong>2. Repayment Terms</strong></p>
            <p>I will make {totalInstallments} payments of {formatCurrency(repaymentAmount)} each.</p>
            <p><strong>3. Late Payments</strong></p>
            <p>I understand that late payments may affect my relationship with the lender.</p>
            <p><strong>4. Digital Signatures</strong></p>
            <p>I acknowledge that my digital signature on this platform is legally binding.</p>
          </div>
        )}

        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            By signing, you agree to repay this loan according to the terms above. This is a legally binding agreement.
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreementAccepted}
            onChange={(e) => { setAgreementAccepted(e.target.checked); setStepError(null); }}
            className="mt-1 w-4 h-4 text-primary-600 rounded border-neutral-300 focus:ring-primary-500"
          />
          <span className="text-sm text-neutral-700">
            I have read, understood, and agree to the loan agreement terms. I commit to repaying this loan as agreed.
          </span>
        </label>
      </Card>

      <div className="pt-2 pb-1">
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={!agreementAccepted}
          className="w-full rounded-2xl py-3.5 text-base font-semibold"
        >
          <FileText className="w-4 h-4 mr-2" /> Sign & Submit Request
        </Button>
      </div>
    </div>
  );
}
