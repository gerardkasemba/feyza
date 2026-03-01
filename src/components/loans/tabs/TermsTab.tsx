'use client';

import { Card, Button } from '@/components/ui';
import { Loan } from '@/types';
import { FileText, ChevronUp, ChevronDown } from 'lucide-react';

interface TermsTabProps {
  loan: Loan;
  termsExpanded: boolean;
  onToggleExpanded: () => void;
}

export function TermsTab({ loan, termsExpanded, onToggleExpanded }: TermsTabProps) {
  const businessLender = loan.business_lender as any;

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">
            Lender terms
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpanded}
          className="text-blue-600 dark:text-blue-400"
        >
          {termsExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Show more
            </>
          )}
        </Button>
      </div>

      <div
        className={[
          'rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 transition-all',
          termsExpanded ? 'max-h-[520px] overflow-y-auto' : 'max-h-32 overflow-hidden',
        ].join(' ')}
      >
        <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">
          {businessLender?.lending_terms}
        </p>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
        By accepting this loan, you agree to terms set by {businessLender?.business_name}
      </p>
    </Card>
  );
}
