'use client';

import React, { useState } from 'react';
import { Button, Card } from '@/components/ui';
import { FileText, Check, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { MdEmergency, MdMedicalServices, MdSchool, MdBusinessCenter, MdHome, MdDescription } from 'react-icons/md';
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

  const getPurposeIcon = (purpose?: string) => {
    switch (purpose) {
      case 'emergency': return <MdEmergency className="w-5 h-5" />;
      case 'medical': return <MdMedicalServices className="w-5 h-5" />;
      case 'education': return <MdSchool className="w-5 h-5" />;
      case 'business': return <MdBusinessCenter className="w-5 h-5" />;
      case 'personal': return <MdHome className="w-5 h-5" />;
      default: return <MdDescription className="w-5 h-5" />;
    }
  };

  if (alreadySigned) {
    return (
      <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <Check className="w-5 h-5 text-green-600 dark:text-green-500" />
          </div>
          <div>
            <p className="font-medium text-green-900 dark:text-green-300">Agreement Signed</p>
            <p className="text-sm text-green-700 dark:text-green-400">
              You have signed this loan agreement.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-neutral-800">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary-600 dark:text-primary-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">
            Loan Agreement
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Please review and sign the agreement to proceed
          </p>
        </div>
      </div>

      {/* Agreement Summary */}
      <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-xl p-4 mb-4">
        <h4 className="font-medium text-neutral-900 dark:text-white mb-3">Key Terms</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">Principal Amount:</span>
            <p className="font-medium text-neutral-900 dark:text-white">
              {formatCurrency(loanDetails.amount, loanDetails.currency)}
            </p>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">Total to Repay:</span>
            <p className="font-medium text-neutral-900 dark:text-white">
              {formatCurrency(loanDetails.totalAmount, loanDetails.currency)}
            </p>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">Interest Rate:</span>
            <p className="font-medium text-neutral-900 dark:text-white">{loanDetails.interestRate}% APR</p>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">Installments:</span>
            <p className="font-medium text-neutral-900 dark:text-white">
              {loanDetails.totalInstallments} payments of {formatCurrency(loanDetails.repaymentAmount, loanDetails.currency)}
            </p>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">Start Date:</span>
            <p className="font-medium text-neutral-900 dark:text-white">
              {new Date(loanDetails.startDate).toLocaleDateString()}
            </p>
          </div>
          {loanDetails.purpose && (
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">Purpose:</span>
              <p className="font-medium text-neutral-900 dark:text-white flex items-center gap-1">
                {getPurposeIcon(loanDetails.purpose)}
                {loanDetails.purpose.charAt(0).toUpperCase() + loanDetails.purpose.slice(1)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Full Terms (Expandable) */}
      <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl mb-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700/50 rounded-xl transition-colors"
        >
          <span className="font-medium text-neutral-900 dark:text-white">Full Terms & Conditions</span>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
          )}
        </button>
        
        {expanded && (
          <div className="px-4 pb-4 text-sm text-neutral-600 dark:text-neutral-400 space-y-3 max-h-64 overflow-y-auto">
            <p><strong className="text-neutral-900 dark:text-white">1. Loan Agreement</strong></p>
            <p>
              This agreement is entered into between the Borrower ({borrowerName}) and the Lender 
              for a loan in the principal amount of {formatCurrency(loanDetails.amount, loanDetails.currency)}.
            </p>

            <p><strong className="text-neutral-900 dark:text-white">2. Repayment Terms</strong></p>
            <p>
              The Borrower agrees to repay the total amount of {formatCurrency(loanDetails.totalAmount, loanDetails.currency)} 
              in {loanDetails.totalInstallments} installments of {formatCurrency(loanDetails.repaymentAmount, loanDetails.currency)} each, 
              beginning on {new Date(loanDetails.startDate).toLocaleDateString()}.
            </p>

            <p><strong className="text-neutral-900 dark:text-white">3. Interest Rate</strong></p>
            <p>
              The annual interest rate for this loan is {loanDetails.interestRate}%. 
              The total interest over the loan term is {formatCurrency(loanDetails.totalAmount - loanDetails.amount, loanDetails.currency)}.
            </p>

            <p><strong className="text-neutral-900 dark:text-white">4. Late Payments</strong></p>
            <p>
              If a payment is not received by the due date, the Borrower agrees to communicate 
              with the Lender to arrange alternative payment arrangements. Both parties agree 
              to act in good faith to resolve any payment issues.
            </p>

            <p><strong className="text-neutral-900 dark:text-white">5. Early Repayment</strong></p>
            <p>
              The Borrower may repay the loan in full or make additional payments at any time 
              without penalty.
            </p>

            <p><strong className="text-neutral-900 dark:text-white">6. Communication</strong></p>
            <p>
              Both parties agree to communicate through the Feyza platform and respond 
              to messages within a reasonable timeframe.
            </p>

            <p><strong className="text-neutral-900 dark:text-white">7. Dispute Resolution</strong></p>
            <p>
              In the event of a dispute, both parties agree to attempt to resolve the matter 
              amicably before seeking external mediation or legal action.
            </p>

            <p><strong className="text-neutral-900 dark:text-white">8. Digital Signatures</strong></p>
            <p>
              Both parties acknowledge that digital signatures on this platform are legally 
              binding and equivalent to handwritten signatures.
            </p>
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl mb-4">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-yellow-900 dark:text-yellow-300">Important</p>
          <p className="text-yellow-700 dark:text-yellow-400">
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
          className="mt-1 w-4 h-4 text-primary-600 dark:text-primary-500 rounded border-neutral-300 dark:border-neutral-600 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-700"
        />
        <span className="text-sm text-neutral-700 dark:text-neutral-300">
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