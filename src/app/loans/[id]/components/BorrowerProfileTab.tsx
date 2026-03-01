'use client';
import type { PlatformFeeSettings, FeeCalculation } from '@/lib/platformFee';
import type { BorrowerRatingData } from '@/types/borrowerRating';

import { Button, Card } from '@/components/ui';
import { CheckCircle, User, Award } from 'lucide-react';
import { BorrowerRatingCard } from '@/components/borrower/BorrowerRating';
import { Loan } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface BorrowerProfileTabProps {
  loan: Loan;
  borrowerRatingData: BorrowerRatingData | null;
  loadingBorrowerRating: boolean;
  hasVouchedForBorrower: boolean;
  onOpenVouchModal: () => void;
  formatCurrency: (amount: number, currency?: string) => string;
}

export function BorrowerProfileTab({
  loan,
  borrowerRatingData,
  loadingBorrowerRating,
  hasVouchedForBorrower,
  onOpenVouchModal,
}: BorrowerProfileTabProps) {
  const borrowerFirstName = (loan.borrower as any)?.full_name?.split(' ')[0] || 'Borrower';

  const VouchPrompt = () => (
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
            This loan was repaid successfully. Vouch for {borrowerFirstName} to boost their trust score and help
            them access better loan terms in the future.
          </p>
          <Button onClick={onOpenVouchModal} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
            <Award className="w-4 h-4 mr-2" />
            Vouch for {borrowerFirstName}
          </Button>
        </>
      )}
    </div>
  );

  return (
    <Card className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
          <User className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
        </div>
        <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">Borrower Profile</h2>
      </div>

      {loadingBorrowerRating ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-2 text-sm text-neutral-500">Loading borrower information...</p>
        </div>
      ) : borrowerRatingData || (loan.borrower as any)?.id ? (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl">
              <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">Basic Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Name:</span>
                  <span className="font-medium">
                    {(loan.borrower as any)?.full_name ?? borrowerRatingData?.borrower?.full_name ?? (loan as any)?.borrower_name ?? 'Borrower'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Email:</span>
                  <span className="font-medium">{(loan.borrower as any)?.email ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Member Since:</span>
                  <span className="font-medium">{borrowerRatingData?.borrower?.monthsAsMember ?? 0} months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Verified:</span>
                  <span
                    className={`font-medium ${
                      borrowerRatingData?.borrower?.isVerified
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-neutral-500'
                    }`}
                  >
                    {borrowerRatingData?.borrower?.isVerified ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl">
              <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">Loan History</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Completed Loans:</span>
                  <span className="font-medium">{borrowerRatingData?.loanHistory?.totalCompleted ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Active Loans:</span>
                  <span className="font-medium">{borrowerRatingData?.loanHistory?.activeLoans ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Total Borrowed:</span>
                  <span className="font-medium">
                    {formatCurrency(borrowerRatingData?.loanHistory?.totalBorrowed ?? 0, loan.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {borrowerRatingData && (
          <BorrowerRatingCard
            rating={borrowerRatingData.rating?.overall || 'neutral'}
            paymentStats={borrowerRatingData.paymentHistory as any}
            loansCompleted={borrowerRatingData.loanHistory?.totalCompleted || 0}
            memberMonths={borrowerRatingData.borrower?.monthsAsMember || 0}
            isVerified={borrowerRatingData.borrower?.isVerified}
          />
          )}

          {borrowerRatingData?.recommendation && (
            <div
              className={`p-4 rounded-xl ${
                borrowerRatingData.rating?.overall === 'great' || borrowerRatingData.rating?.overall === 'good'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : borrowerRatingData.rating?.overall === 'poor' ||
                    borrowerRatingData.rating?.overall === 'bad' ||
                    borrowerRatingData.rating?.overall === 'worst'
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
              }`}
            >
              <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">Recommendation</h3>
              <p className="text-sm">{borrowerRatingData.recommendation}</p>
            </div>
          )}

          {loan.status === 'completed' && <VouchPrompt />}
        </div>
      ) : (
        <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
          No borrower information available
        </div>
      )}

      {/* Fallback vouch prompt when no rating data but loan is complete */}
      {loan.status === 'completed' && !borrowerRatingData && <VouchPrompt />}
    </Card>
  );
}
