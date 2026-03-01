'use client';

import { Card } from '@/components/ui';
import { CheckCircle, Clock, Download } from 'lucide-react';
import { Loan } from '@/types';
import { formatDate } from '@/lib/utils';

interface AgreementTabProps {
  loan: Loan;
}

export function AgreementTab({ loan }: AgreementTabProps) {
  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">Loan agreement</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Signed contract for this loan</p>
        </div>

        <a
          href={`/api/contracts?loanId=${loan.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 dark:bg-primary-600 text-white rounded-lg hover:bg-primary-600 dark:hover:bg-primary-500 transition-colors"
        >
          <Download className="w-4 h-4" />
          View Contract
        </a>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div
          className={[
            'rounded-xl border p-4',
            (loan as any).borrower_signed
              ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
              : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900',
          ].join(' ')}
        >
          <div className="flex items-start gap-2">
            {(loan as any).borrower_signed ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <Clock className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
            )}
            <div>
              <p className="font-semibold text-neutral-900 dark:text-white">
                Borrower: {(loan.borrower as any)?.full_name || 'Borrower'}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {(loan as any).borrower_signed_at
                  ? `Signed on ${formatDate((loan as any).borrower_signed_at)}`
                  : 'Not signed yet'}
              </p>
            </div>
          </div>
        </div>

        <div
          className={[
            'rounded-xl border p-4',
            (loan as any).lender_signed
              ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
              : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900',
          ].join(' ')}
        >
          <div className="flex items-start gap-2">
            {(loan as any).lender_signed ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <Clock className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
            )}
            <div>
              <p className="font-semibold text-neutral-900 dark:text-white">
                Lender:{' '}
                {(loan.lender as any)?.full_name ||
                  (loan.business_lender as any)?.business_name ||
                  'Lender'}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {(loan as any).lender_signed_at
                  ? `Signed on ${formatDate((loan as any).lender_signed_at)}`
                  : 'Not signed yet'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-4">
        💡 You can print or save the contract as PDF from your browser.
      </p>
    </Card>
  );
}
