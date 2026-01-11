'use client';

import React, { useState } from 'react';
import { Button, Card, Modal } from '@/components/ui';
import { Loan } from '@/types';
import { FileText, Check, Clock, Download, ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface LoanContractProps {
  loan: Loan;
  userRole: 'borrower' | 'lender';
  onSign: () => Promise<void>;
}

export function LoanContract({ loan, userRole, onSign }: LoanContractProps) {
  const [showContract, setShowContract] = useState(false);
  const [signing, setSigning] = useState(false);

  const borrowerSigned = loan.borrower_signed;
  const lenderSigned = loan.lender_signed;
  const bothSigned = borrowerSigned && lenderSigned;
  const userSigned = userRole === 'borrower' ? borrowerSigned : lenderSigned;

  const handleSign = async () => {
    setSigning(true);
    try {
      await onSign();
      setShowContract(false);
    } finally {
      setSigning(false);
    }
  };

  const handleViewContract = () => {
    window.open(`/api/contracts?loanId=${loan.id}`, '_blank');
  };

  return (
    <>
      <Card>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-neutral-900 mb-1">Loan Agreement</h3>
            <p className="text-sm text-neutral-500 mb-3">
              {bothSigned 
                ? 'Contract signed by both parties' 
                : 'Both parties must sign the contract to activate the loan'}
            </p>

            {/* Signature Status */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                {borrowerSigned ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Clock className="w-4 h-4 text-yellow-500" />
                )}
                <span className={borrowerSigned ? 'text-green-700' : 'text-yellow-700'}>
                  Borrower: {borrowerSigned ? `Signed on ${formatDate(loan.borrower_signed_at!)}` : 'Pending signature'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {lenderSigned ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Clock className="w-4 h-4 text-yellow-500" />
                )}
                <span className={lenderSigned ? 'text-green-700' : 'text-yellow-700'}>
                  Lender: {lenderSigned ? `Signed on ${formatDate(loan.lender_signed_at!)}` : 'Pending signature'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleViewContract}>
                <ExternalLink className="w-4 h-4 mr-1" />
                View Contract
              </Button>
              
              {!userSigned && loan.status === 'pending' && (
                <Button size="sm" onClick={() => setShowContract(true)}>
                  <FileText className="w-4 h-4 mr-1" />
                  Sign Contract
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Sign Contract Modal */}
      <Modal
        isOpen={showContract}
        onClose={() => setShowContract(false)}
        title="Sign Loan Agreement"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-neutral-50 rounded-xl p-4 max-h-96 overflow-y-auto">
            <h4 className="font-semibold mb-2">Key Terms</h4>
            <ul className="text-sm space-y-2 text-neutral-600">
              <li>• <strong>Principal Amount:</strong> {loan.currency} {loan.amount.toLocaleString()}</li>
              {loan.interest_rate > 0 && (
                <>
                  <li>• <strong>Interest Rate:</strong> {loan.interest_rate}% APR ({loan.interest_type})</li>
                  <li>• <strong>Total Interest:</strong> {loan.currency} {loan.total_interest.toLocaleString()}</li>
                </>
              )}
              <li>• <strong>Total to Repay:</strong> {loan.currency} {loan.total_amount.toLocaleString()}</li>
              <li>• <strong>Installments:</strong> {loan.total_installments} payments of {loan.currency} {loan.repayment_amount.toLocaleString()}</li>
              <li>• <strong>Frequency:</strong> {loan.repayment_frequency}</li>
              <li>• <strong>Start Date:</strong> {formatDate(loan.start_date)}</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm text-yellow-800">
              <strong>By signing this agreement:</strong>
            </p>
            <ul className="text-sm text-yellow-700 mt-2 space-y-1">
              {userRole === 'borrower' ? (
                <>
                  <li>• You agree to repay the loan according to the schedule</li>
                  <li>• You authorize automatic payments if enabled</li>
                  <li>• You confirm all information provided is accurate</li>
                </>
              ) : (
                <>
                  <li>• You agree to disburse the loan amount to the borrower</li>
                  <li>• You accept the repayment terms specified</li>
                  <li>• You will receive payments according to the schedule</li>
                </>
              )}
            </ul>
          </div>

          <div className="flex items-center gap-2 p-4 bg-neutral-100 rounded-xl">
            <input type="checkbox" id="agree" className="w-4 h-4" required />
            <label htmlFor="agree" className="text-sm text-neutral-700">
              I have read and agree to the terms of this loan agreement
            </label>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowContract(false)}>
              Cancel
            </Button>
            <Button onClick={handleSign} loading={signing}>
              <Check className="w-4 h-4 mr-1" />
              Sign as {userRole === 'borrower' ? 'Borrower' : 'Lender'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
