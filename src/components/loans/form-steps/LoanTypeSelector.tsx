'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoanType {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  display_order: number;
}

interface LoanTypeSelectorProps {
  loanTypes: LoanType[];
  selectedLoanTypeId: string | null;
  loading?: boolean;
  onSelect: (id: string | null) => void;
}

/**
 * Grid of loan type buttons used in Step 2 (business lender flow).
 * Renders nothing when loanTypes is empty.
 */
export function LoanTypeSelector({ loanTypes, selectedLoanTypeId, loading, onSelect }: LoanTypeSelectorProps) {
  if (loanTypes.length === 0) return null;

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-neutral-900 dark:text-white">Loan type (optional)</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Helps matching. You can skip this.
          </p>
        </div>
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : null}
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {loanTypes.map((loanType) => (
          <button
            key={loanType.id}
            type="button"
            onClick={() => {
              const next = selectedLoanTypeId === loanType.id ? null : loanType.id;
              onSelect(next);
            }}
            className={[
              'p-3 rounded-xl border-2 text-left transition-all',
              selectedLoanTypeId === loanType.id
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600',
            ].join(' ')}
          >
            <p className="font-medium text-sm text-neutral-900 dark:text-white">{loanType.name}</p>
            {loanType.description ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">{loanType.description}</p>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
