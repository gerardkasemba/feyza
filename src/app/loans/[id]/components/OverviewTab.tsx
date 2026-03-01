'use client';
import type { BorrowerRatingData } from '@/types/borrowerRating';
import type { PlatformFeeSettings, FeeCalculation } from '@/lib/platformFee';

import { Button, Card, Badge } from '@/components/ui';
import { BorrowerRatingCard } from '@/components/borrower/BorrowerRating';
import { TrustScoreCard } from '@/components/trust-score';
import { FeeBreakdown, usePlatformFee } from '@/components/FeeBreakdown';
import {
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  Banknote,
  CreditCard,
  Upload,
  Download,
  Bell,
  FileText,
  Lock,
  User,
  CheckCircle,
  Award,
} from 'lucide-react';
import { Loan, PaymentScheduleItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { downloadICalFile } from '@/lib/calendar';

interface OverviewTabProps {
  loan: Loan;
  schedule: PaymentScheduleItem[];
  isBorrower: boolean;
  isLender: boolean;
  statusColor: 'default' | 'success' | 'warning' | 'danger' | 'info';
  StatusIcon: React.ElementType;
  statusLabel: string;
  progress: number;
  paidCount: number;
  nextPayment: PaymentScheduleItem | undefined;
  borrowerRatingData: BorrowerRatingData;
  loadingBorrowerRating: boolean;
  isDwollaEnabled: boolean;
  otherPartyName: string;
  hasVouchedForBorrower?: boolean;
  onProcessPayment: (paymentId: string) => void;
  onOpenManualPayment: (paymentId: string) => void;
  onOpenFundsModal: () => void;
  onOpenReminderModal: () => void;
  onOpenVouchModal: () => void;
}

export function OverviewTab({
  loan,
  schedule,
  isBorrower,
  isLender,
  statusColor,
  StatusIcon,
  statusLabel,
  progress,
  paidCount,
  nextPayment,
  borrowerRatingData,
  loadingBorrowerRating,
  isDwollaEnabled,
  otherPartyName,
  hasVouchedForBorrower,
  onProcessPayment,
  onOpenManualPayment,
  onOpenFundsModal,
  onOpenReminderModal,
  onOpenVouchModal,
}: OverviewTabProps) {
  const borrowerFirstName = (loan.borrower as any)?.full_name?.split(' ')[0] || 'Borrower';

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* LEFT: Loan details */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
            <FileText className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
          </div>
          <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">Loan details</h2>
        </div>

        {/* Borrower Rating Section for Lender */}
        {isLender && loan?.borrower_id && (
          <div className="space-y-4 mb-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-neutral-900 dark:text-white">Borrower Trust Score</h3>
              </div>
              <TrustScoreCard userId={loan.borrower_id} showDetails={true} showVouches={true} />
            </div>

            <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-neutral-900 dark:text-white">Payment History</h3>
                {loadingBorrowerRating && <div className="text-xs text-neutral-500">Loading...</div>}
              </div>

              {borrowerRatingData ? (
                <BorrowerRatingCard
                  rating={borrowerRatingData.rating?.overall || 'neutral'}
                  paymentStats={
                    borrowerRatingData.paymentHistory
                      ? {
                          total: borrowerRatingData.paymentHistory.totalPayments || 0,
                          onTime: borrowerRatingData.paymentHistory.onTime || 0,
                          early: borrowerRatingData.paymentHistory.early || 0,
                          late: borrowerRatingData.paymentHistory.late || 0,
                          missed: borrowerRatingData.paymentHistory.missed || 0,
                        }
                      : undefined
                  }
                  loansCompleted={borrowerRatingData.loanHistory?.totalCompleted || 0}
                  memberMonths={borrowerRatingData.borrower?.monthsAsMember || 0}
                  isVerified={borrowerRatingData.borrower?.isVerified}
                />
              ) : (
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  No rating information available
                </div>
              )}

              {borrowerRatingData?.recommendation && (
                <div
                  className={`mt-3 p-3 rounded-lg text-sm ${
                    borrowerRatingData.rating?.overall === 'great' ||
                    borrowerRatingData.rating?.overall === 'good'
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                      : borrowerRatingData.rating?.overall === 'poor' ||
                        borrowerRatingData.rating?.overall === 'bad' ||
                        borrowerRatingData.rating?.overall === 'worst'
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                      : 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <strong>Recommendation:</strong> {borrowerRatingData.recommendation}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Borrower's own status section */}
        {isBorrower && (
          <div className="space-y-4">
            <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-neutral-900 dark:text-white">Your Status</h3>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Loan Status:</span>
                  <Badge variant={statusColor}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusLabel}
                  </Badge>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Progress:</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {Math.round(progress)}% ({paidCount}/{schedule.length} payments)
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Next Payment:</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {nextPayment ? formatCurrency(nextPayment.amount, loan.currency) : 'None'}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Due Date:</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {nextPayment ? formatDate(nextPayment.due_date || "") : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-3">Your Trust Score</h3>
              <TrustScoreCard showDetails={true} showVouches={true} className="mb-4" />
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
            <div>
              <p className="text-neutral-500 dark:text-neutral-400">Repayment schedule</p>
              <p className="text-neutral-900 dark:text-white">
                {formatCurrency(loan.repayment_amount, loan.currency)} / {loan.repayment_frequency}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
            <div>
              <p className="text-neutral-500 dark:text-neutral-400">Start date</p>
              <p className="text-neutral-900 dark:text-white">{formatDate(loan.start_date || "")}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
            <div>
              <p className="text-neutral-500 dark:text-neutral-400">Purpose</p>
              <p className="text-neutral-900 dark:text-white">{loan.purpose || '—'}</p>
            </div>
          </div>

          {loan.pickup_person_name ? (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
              <div>
                <p className="text-neutral-500 dark:text-neutral-400">Pickup person</p>
                <p className="text-neutral-900 dark:text-white">
                  {loan.pickup_person_name}
                  {loan.pickup_person_location && ` (${loan.pickup_person_location})`}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {loan.interest_rate > 0 && (loan.status === 'active' || loan.status === 'completed') && (
          <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4">
                <p className="text-neutral-500 dark:text-neutral-400">Interest rate</p>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {loan.interest_rate}% APR ({loan.interest_type})
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4">
                <p className="text-neutral-500 dark:text-neutral-400">Total interest</p>
                <p className="font-semibold text-orange-600 dark:text-orange-400">
                  {formatCurrency(loan.total_interest, loan.currency)}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4">
                <p className="text-neutral-500 dark:text-neutral-400">Total to repay</p>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {formatCurrency(loan.total_amount, loan.currency)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* RIGHT: Quick actions */}
      <div className="space-y-6">
        <Card className="lg:sticky lg:top-6 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <Lock className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            </div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">Quick actions</h3>
          </div>

          <div className="space-y-2">
            {schedule.length > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const unpaidPayments = schedule
                    .filter((p) => !p.is_paid)
                    .map((p) => ({
                      id: p.id,
                      title: `💰 Feyza Payment Due - ${formatCurrency(p.amount, loan.currency)}`,
                      amount: p.amount,
                      currency: loan.currency,
                      dueDate: p.due_date,
                      lenderName: otherPartyName,
                      description: `Loan repayment for ${loan.purpose || 'personal loan'}`,
                    }));
                  downloadICalFile(unpaidPayments, loan.purpose);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Add to calendar
              </Button>
            )}

            {loan.status === 'active' &&
              isBorrower &&
              ((loan as any).disbursement_status === 'completed' || (!isDwollaEnabled && loan.funds_sent)) &&
              nextPayment && (
                <Button
                  className="w-full"
                  onClick={() =>
                    isDwollaEnabled
                      ? onProcessPayment(nextPayment.id)
                      : onOpenManualPayment(nextPayment.id)
                  }
                >
                  {isDwollaEnabled ? (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay next installment
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Mark payment as paid
                    </>
                  )}
                </Button>
              )}

            {loan.status === 'active' && isLender && !loan.funds_sent && (
              <Button className="w-full" onClick={onOpenFundsModal}>
                <Banknote className="w-4 h-4 mr-2" />
                Confirm funds sent
              </Button>
            )}

            {isLender && loan.status === 'active' && loan.funds_sent && (
              <Button variant="outline" className="w-full" onClick={onOpenReminderModal}>
                <Bell className="w-4 h-4 mr-2" />
                Send reminder
              </Button>
            )}
          </div>

          <div className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-center gap-2 text-center">
            <Lock className="w-4 h-4" />
            Your information is secure and never shared without your consent.
          </div>
        </Card>

        {/* Vouch prompt for completed loans (lender only) */}
        {isLender && loan.status === 'completed' && (
          <Card className="h-fit bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-neutral-900 border-purple-200 dark:border-purple-800">
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
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 p-3 bg-purple-100/50 dark:bg-purple-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">You've vouched for this borrower!</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
                  This loan was repaid successfully. Vouch for {borrowerFirstName} to boost their trust score.
                </p>
                <Button
                  onClick={onOpenVouchModal}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Award className="w-4 h-4 mr-2" />
                  Vouch for {borrowerFirstName}
                </Button>
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
