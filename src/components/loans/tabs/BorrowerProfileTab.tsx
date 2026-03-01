'use client';

import { Card, Button } from '@/components/ui';
import type { BorrowerRatingData } from '@/types/borrowerRating';
import { BorrowerRatingCard } from '@/components/borrower/BorrowerRating';
import { Loan } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { User, Award, CheckCircle } from 'lucide-react';

interface BorrowerProfileTabProps {
  loan: Loan;
  borrowerRatingData: BorrowerRatingData | null;
  loadingBorrowerRating: boolean;
  hasVouchedForBorrower: boolean;
  onOpenVouchModal: () => void;
}

/** Reusable vouch prompt shown in two places in this tab */
function VouchPrompt({
  loan,
  hasVouchedForBorrower,
  onOpenVouchModal,
}: {
  loan: Loan;
  hasVouchedForBorrower: boolean;
  onOpenVouchModal: () => void;
}) {
  const firstName = (loan.borrower as any)?.full_name?.split(' ')[0] || 'this borrower';
  return (
    <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-800/50">
          <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="font-semibold text-neutral-900 dark:text-white">Build Trust Together</h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Your vouch as a lender carries significant weight
          </p>
        </div>
      </div>

      {hasVouchedForBorrower ? (
        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">You've vouched for this borrower</span>
        </div>
      ) : (
        <>
          <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
            This loan was repaid successfully. Vouch for {firstName} to boost their trust score and
            help them access better loan terms in the future.
          </p>
          <Button
            onClick={onOpenVouchModal}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Award className="w-4 h-4 mr-2" />
            Vouch for {firstName}
          </Button>
        </>
      )}
    </div>
  );
}

export function BorrowerProfileTab({
  loan,
  borrowerRatingData,
  loadingBorrowerRating,
  hasVouchedForBorrower,
  onOpenVouchModal,
}: BorrowerProfileTabProps) {
  const borrower = loan.borrower as any;
  const isCompleted = loan.status === 'completed';

  const getRatingColor = (rating: string) => {
    if (rating === 'great' || rating === 'good') return 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800';
    if (rating === 'poor' || rating === 'bad' || rating === 'worst') return 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800';
    return 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800';
  };

  return (
    <Card className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
          <User className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
        </div>
        <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">
          Borrower Profile
        </h2>
      </div>

      {loadingBorrowerRating ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-2 text-sm text-neutral-500">Loading borrower information...</p>
        </div>
      ) : borrowerRatingData ? (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Basic info */}
            <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl">
              <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">Basic Information</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Name', value: borrower?.full_name || (loan as { borrower_name?: string })?.borrower_name || 'Borrower' },
                  { label: 'Email', value: borrower?.email },
                  { label: 'Member Since', value: `${borrowerRatingData.borrower?.monthsAsMember || 0} months` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">{label}:</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Verified:</span>
                  <span className={`font-medium ${borrowerRatingData.borrower?.isVerified ? 'text-green-600 dark:text-green-400' : 'text-neutral-500'}`}>
                    {borrowerRatingData.borrower?.isVerified ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Loan history */}
            <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl">
              <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">Loan History</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Completed Loans', value: borrowerRatingData.loanHistory?.totalCompleted || 0 },
                  { label: 'Active Loans', value: borrowerRatingData.loanHistory?.activeLoans || 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">{label}:</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Total Borrowed:</span>
                  <span className="font-medium">
                    {formatCurrency(borrowerRatingData.loanHistory?.totalBorrowed || 0, loan.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <BorrowerRatingCard
            rating={borrowerRatingData.rating?.overall || 'neutral'}
            paymentStats={borrowerRatingData.paymentHistory as any}
            loansCompleted={borrowerRatingData.loanHistory?.totalCompleted || 0}
            memberMonths={borrowerRatingData.borrower?.monthsAsMember || 0}
            isVerified={borrowerRatingData.borrower?.isVerified}
          />

          {borrowerRatingData.recommendation && (
            <div className={`p-4 rounded-xl ${getRatingColor(borrowerRatingData.rating?.overall || "")}`}>
              <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">Recommendation</h3>
              <p className="text-sm">{borrowerRatingData.recommendation}</p>
            </div>
          )}

          {isCompleted && (
            <VouchPrompt
              loan={loan}
              hasVouchedForBorrower={hasVouchedForBorrower}
              onOpenVouchModal={onOpenVouchModal}
            />
          )}
        </div>
      ) : (
        <>
          <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
            No borrower information available
          </div>
          {isCompleted && (
            <div className="mt-4">
              <VouchPrompt
                loan={loan}
                hasVouchedForBorrower={hasVouchedForBorrower}
                onOpenVouchModal={onOpenVouchModal}
              />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
