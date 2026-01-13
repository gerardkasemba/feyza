'use client';

import React, { useState } from 'react';
import { Button, Card } from '@/components/ui';
import { FileText, Check, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface LoanAgreementProps {
  loanDetails: {
    amount: number;
    currency: string;
    totalAmount: number;
    totalInstallments: number;
    repaymentAmount: number;
    interestRate: number;
    startDate: string;
    purpose?: string;
  };
  borrowerName: string;
  onSign: () => void;
  isSigning?: boolean;
  role: 'borrower' | 'lender';
  alreadySigned?: boolean;
}

export function LoanAgreement({
  loanDetails,
  borrowerName,
  onSign,
  isSigning = false,
  role,
  alreadySigned = false,
}: LoanAgreementProps) {
  const [expanded, setExpanded] = useState(false);
  const [agreed, setAgreed] = useState(false);

  if (alreadySigned) {
    return (
      <Card className="bg-green-50 border-green-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-green-900">Agreement Signed</p>
            <p className="text-sm text-green-700">
              You have signed this loan agreement.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-neutral-900">
            Loan Agreement
          </h3>
          <p className="text-sm text-neutral-500">
            Please review and sign the agreement to proceed
          </p>
        </div>
      </div>

      {/* Agreement Summary */}
      <div className="bg-neutral-50 rounded-xl p-4 mb-4">
        <h4 className="font-medium text-neutral-900 mb-3">Key Terms</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-neutral-500">Principal Amount:</span>
            <p className="font-medium">{formatCurrency(loanDetails.amount, loanDetails.currency)}</p>
          </div>
          <div>
            <span className="text-neutral-500">Total to Repay:</span>
            <p className="font-medium">{formatCurrency(loanDetails.totalAmount, loanDetails.currency)}</p>
          </div>
          <div>
            <span className="text-neutral-500">Interest Rate:</span>
            <p className="font-medium">{loanDetails.interestRate}% APR</p>
          </div>
          <div>
            <span className="text-neutral-500">Installments:</span>
            <p className="font-medium">{loanDetails.totalInstallments} payments of {formatCurrency(loanDetails.repaymentAmount, loanDetails.currency)}</p>
          </div>
          <div>
            <span className="text-neutral-500">Start Date:</span>
            <p className="font-medium">{new Date(loanDetails.startDate).toLocaleDateString()}</p>
          </div>
          {loanDetails.purpose && (
            <div>
              <span className="text-neutral-500">Purpose:</span>
              <p className="font-medium">{loanDetails.purpose}</p>
            </div>
          )}
        </div>
      </div>

      {/* Full Terms (Expandable) */}
      <div className="border border-neutral-200 rounded-xl mb-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <span className="font-medium text-neutral-900">Full Terms & Conditions</span>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-neutral-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-neutral-400" />
          )}
        </button>
        
        {expanded && (
          <div className="px-4 pb-4 text-sm text-neutral-600 space-y-3 max-h-64 overflow-y-auto">
            <p><strong>1. Loan Agreement</strong></p>
            <p>
              This agreement is entered into between the Borrower ({borrowerName}) and the Lender 
              for a loan in the principal amount of {formatCurrency(loanDetails.amount, loanDetails.currency)}.
            </p>

            <p><strong>2. Repayment Terms</strong></p>
            <p>
              The Borrower agrees to repay the total amount of {formatCurrency(loanDetails.totalAmount, loanDetails.currency)} 
              in {loanDetails.totalInstallments} installments of {formatCurrency(loanDetails.repaymentAmount, loanDetails.currency)} each, 
              beginning on {new Date(loanDetails.startDate).toLocaleDateString()}.
            </p>

            <p><strong>3. Interest Rate</strong></p>
            <p>
              The annual interest rate for this loan is {loanDetails.interestRate}%. 
              The total interest over the loan term is {formatCurrency(loanDetails.totalAmount - loanDetails.amount, loanDetails.currency)}.
            </p>

            <p><strong>4. Late Payments</strong></p>
            <p>
              If a payment is not received by the due date, the Borrower agrees to communicate 
              with the Lender to arrange alternative payment arrangements. Both parties agree 
              to act in good faith to resolve any payment issues.
            </p>

            <p><strong>5. Early Repayment</strong></p>
            <p>
              The Borrower may repay the loan in full or make additional payments at any time 
              without penalty.
            </p>

            <p><strong>6. Communication</strong></p>
            <p>
              Both parties agree to communicate through the Feyza platform and respond 
              to messages within a reasonable timeframe.
            </p>

            <p><strong>7. Dispute Resolution</strong></p>
            <p>
              In the event of a dispute, both parties agree to attempt to resolve the matter 
              amicably before seeking external mediation or legal action.
            </p>

            <p><strong>8. Digital Signatures</strong></p>
            <p>
              Both parties acknowledge that digital signatures on this platform are legally 
              binding and equivalent to handwritten signatures.
            </p>
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-4">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-yellow-900">Important</p>
          <p className="text-yellow-700">
            By signing this agreement, you acknowledge that you have read, understood, and 
            agree to be bound by all terms and conditions. This is a legally binding agreement.
          </p>
        </div>
      </div>

      {/* Agreement Checkbox */}
      <label className="flex items-start gap-3 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 w-4 h-4 text-primary-600 rounded border-neutral-300 focus:ring-primary-500"
        />
        <span className="text-sm text-neutral-700">
          I have read and agree to the terms and conditions of this loan agreement. 
          I understand that this is a legally binding commitment.
        </span>
      </label>

      {/* Sign Button */}
      <Button
        onClick={onSign}
        disabled={!agreed || isSigning}
        loading={isSigning}
        className="w-full"
      >
        <FileText className="w-4 h-4 mr-2" />
        Sign Agreement as {role === 'borrower' ? 'Borrower' : 'Lender'}
      </Button>
    </Card>
  );
}
