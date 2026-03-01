'use client';
import type { PlatformFeeSettings, FeeCalculation } from '@/lib/platformFee';

import { Button, Card, Badge } from '@/components/ui';
import { FeeBreakdown } from '@/components/FeeBreakdown';
import {
  Calendar,
  Clock,
  CreditCard,
  Upload,
  Send,
  ArrowDownLeft,
  ExternalLink,
} from 'lucide-react';
import { Loan, PaymentScheduleItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentsTabProps {
  loan: Loan;
  schedule: PaymentScheduleItem[];
  isBorrower: boolean;
  isDwollaEnabled: boolean;
  nextPayment: PaymentScheduleItem | undefined;
  processingPayment: string | null;
  feeSettings: PlatformFeeSettings;
  feeLoading: boolean;
  calculateFee: (amount: number) => FeeCalculation;
  onProcessPayment: (paymentId: string) => void;
  onOpenManualPayment: (paymentId: string) => void;
}

export function PaymentsTab({
  loan,
  schedule,
  isBorrower,
  isDwollaEnabled,
  nextPayment,
  processingPayment,
  feeSettings,
  feeLoading,
  calculateFee,
  onProcessPayment,
  onOpenManualPayment,
}: PaymentsTabProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Next payment action card (borrower only, after funds received) */}
      {loan.status === 'active' &&
        isBorrower &&
        ((loan as any).disbursement_status === 'completed' || (!isDwollaEnabled && loan.funds_sent)) &&
        nextPayment && (
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-display font-semibold text-neutral-900 dark:text-white">
                  Make a payment
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                  {isDwollaEnabled ? 'Pay early and stay ahead.' : 'Pay your lender and upload proof.'}
                </p>
              </div>
              {isDwollaEnabled ? (
                <Button
                  onClick={() => onProcessPayment(nextPayment.id)}
                  disabled={processingPayment === nextPayment.id}
                  className="w-full sm:w-auto"
                >
                  {processingPayment === nextPayment.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay {formatCurrency(nextPayment.amount, loan.currency)}
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={() => onOpenManualPayment(nextPayment.id)} className="w-full sm:w-auto">
                  <Upload className="w-4 h-4 mr-2" />
                  Mark as Paid
                </Button>
              )}
            </div>

            <div className="rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">Due date</p>
                  <p className="font-semibold text-sm sm:text-base text-neutral-900 dark:text-white">
                    {formatDate(nextPayment.due_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">Amount</p>
                  <p className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white">
                    {formatCurrency(nextPayment.amount, loan.currency)}
                  </p>
                </div>
              </div>

              {!isDwollaEnabled && (
                <PaymentMethodInfo
                  loan={loan}
                  nextPayment={nextPayment}
                  feeSettings={feeSettings}
                  calculateFee={calculateFee}
                />
              )}

              {feeSettings?.enabled && !feeLoading && isDwollaEnabled && (() => {
                const feeCalc = calculateFee(nextPayment.amount);
                return feeCalc.platformFee > 0 ? (
                  <div className="mt-3">
                    <FeeBreakdown
                      amount={feeCalc.grossAmount}
                      platformFee={feeCalc.platformFee}
                      netAmount={feeCalc.netAmount}
                      feeLabel={feeCalc.feeLabel}
                      feeDescription={feeCalc.feeDescription}
                      variant="detailed"
                    />
                  </div>
                ) : null;
              })()}
            </div>
          </Card>
        )}

      {/* Payment history */}
      {schedule.filter((s) => s.is_paid).length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">
                Payment history
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {schedule.filter((s) => s.is_paid).length} payment(s)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {schedule
              .filter((s) => s.is_paid)
              .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                      {isBorrower ? (
                        <Send className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        {isBorrower ? '-' : '+'}
                        {formatCurrency(
                          isBorrower ? p.amount : p.amount - (p.platform_fee || 0),
                          loan.currency
                        )}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {p.paid_at ? formatDate(p.paid_at) : ''}
                      </p>
                      {!isBorrower && p.platform_fee && p.platform_fee > 0 && (
                        <p className="text-xs text-orange-500 dark:text-orange-400">
                          Fee: {formatCurrency(p.platform_fee, loan.currency)}
                        </p>
                      )}
                    </div>
                  </div>

                  <Badge variant="success" className="text-xs">
                    {isBorrower ? 'Paid' : 'Received'}
                  </Badge>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Upcoming payments */}
      {schedule.filter((s) => !s.is_paid).length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">
                Upcoming payments
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {schedule.filter((s) => !s.is_paid).length} payment(s) remaining
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {schedule
              .filter((s) => !s.is_paid)
              .map((p, index) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-xl border p-4 ${
                    index === 0
                      ? 'border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        index === 0
                          ? 'bg-primary-100 dark:bg-primary-900/30'
                          : 'bg-neutral-100 dark:bg-neutral-800'
                      }`}
                    >
                      <Calendar
                        className={`w-4 h-4 ${
                          index === 0
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                      />
                    </div>
                    <div>
                      <p
                        className={`font-semibold ${
                          index === 0
                            ? 'text-primary-900 dark:text-primary-100'
                            : 'text-neutral-900 dark:text-white'
                        }`}
                      >
                        {formatCurrency(p.amount, loan.currency)}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Due: {formatDate(p.due_date)}</p>
                    </div>
                  </div>

                  {index === 0 ? (
                    <Badge variant="warning" className="text-xs">
                      Next due
                    </Badge>
                  ) : (
                    <Badge
                      variant="default"
                      className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                    >
                      Upcoming
                    </Badge>
                  )}
                </div>
              ))}
          </div>

          {loan.status === 'active' &&
            !loan.funds_sent &&
            (loan as any).disbursement_status !== 'completed' && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-300">Waiting for funds</p>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      {isBorrower
                        ? "Your lender will send the loan amount shortly. You'll be notified when the funds are on the way."
                        : 'Please send the loan funds to the borrower to begin the repayment schedule.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
        </Card>
      )}
    </div>
  );
}

// ─── Internal sub-component: manual payment method info ──────────────────────

function PaymentMethodInfo({
  loan,
  nextPayment,
  feeSettings,
  calculateFee,
}: {
  loan: Loan;
  nextPayment: PaymentScheduleItem;
  feeSettings: PlatformFeeSettings;
  calculateFee: (amount: number) => FeeCalculation;
}) {
  const feeCalc = feeSettings?.enabled ? calculateFee(nextPayment.amount) : null;
  const totalToPay = feeCalc ? feeCalc.grossAmount : nextPayment.amount;
  const platformFee = feeCalc?.platformFee || 0;

  const lenderProfile = loan.business_lender as any;
  const personalLender = loan.lender as any;
  const paymentSource = loan.business_lender_id ? 'business' : 'personal';

  let cashappUsername: string | null = null;
  let venmoUsername: string | null = null;
  let zelleEmail: string | null = null;
  let zellePhone: string | null = null;
  let zelleName: string | null = null;
  let paypalEmail: string | null = null;
  let preferredMethod: string | null = null;

  if (paymentSource === 'business' && lenderProfile) {
    cashappUsername = lenderProfile.cashapp_username;
    venmoUsername = lenderProfile.venmo_username;
    zelleEmail = lenderProfile.zelle_email;
    zellePhone = lenderProfile.zelle_phone;
    zelleName = lenderProfile.zelle_name || lenderProfile.business_name;
    paypalEmail = lenderProfile.paypal_email;
    preferredMethod = lenderProfile.preferred_payment_method;
  } else if (paymentSource === 'personal' && personalLender) {
    cashappUsername = personalLender.cashapp_username;
    venmoUsername = personalLender.venmo_username;
    zelleEmail = personalLender.zelle_email;
    zellePhone = personalLender.zelle_phone;
    zelleName = personalLender.full_name;
    paypalEmail = personalLender.paypal_email;
    preferredMethod = personalLender.preferred_payment_method;
  }

  const cleanCashapp = cashappUsername?.replace(/^\$/, '').trim();
  const cleanVenmo = venmoUsername?.replace(/^@/, '').trim();
  const loanNote = `Loan Payment - ${loan.purpose || 'Feyza'}`;
  const encodedNote = encodeURIComponent(loanNote);
  const amount = Number(totalToPay || 0);
  const formattedAmount = Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
  const zelleDisplay = zelleEmail || zellePhone;
  const zelleDetails = zelleEmail && zellePhone ? `${zelleEmail} or ${zellePhone}` : zelleDisplay;
  const hasAnyMethod = !!cleanCashapp || !!cleanVenmo || !!zelleDisplay || !!paypalEmail;

  const paymentMethods = [
    {
      key: 'cashapp',
      name: 'Cash App',
      available: !!cleanCashapp,
      username: cleanCashapp,
      displayName: `$${cleanCashapp}`,
      url: cleanCashapp ? `https://cash.app/$${cleanCashapp}/${formattedAmount}` : null,
      emoji: '💵',
      colors: {
        default: 'bg-[#00D632]/10 hover:bg-[#00D632]/20 text-[#00D632] border-[#00D632]/30',
        preferred: 'bg-[#00D632] hover:bg-[#00C12D] text-white shadow-lg shadow-green-500/30',
      },
    },
    {
      key: 'venmo',
      name: 'Venmo',
      available: !!cleanVenmo,
      username: cleanVenmo,
      displayName: `@${cleanVenmo}`,
      url: cleanVenmo
        ? `https://venmo.com/${cleanVenmo}?txn=pay&amount=${formattedAmount}&note=${encodedNote}`
        : null,
      emoji: '💙',
      colors: {
        default: 'bg-[#008CFF]/10 hover:bg-[#008CFF]/20 text-[#008CFF] border-[#008CFF]/30',
        preferred: 'bg-[#008CFF] hover:bg-[#0070CC] text-white shadow-lg shadow-blue-500/30',
      },
    },
    {
      key: 'zelle',
      name: 'Zelle',
      available: !!zelleDisplay,
      username: zelleDisplay,
      displayName: zelleDetails,
      recipientName: zelleName,
      url: null,
      emoji: '🏦',
      colors: {
        default: 'bg-[#6D1ED4]/10 hover:bg-[#6D1ED4]/20 text-[#6D1ED4] border-[#6D1ED4]/30',
        preferred: 'bg-[#6D1ED4] hover:bg-[#5A19B0] text-white shadow-lg shadow-purple-500/30',
      },
    },
    {
      key: 'paypal',
      name: 'PayPal',
      available: !!paypalEmail,
      username: paypalEmail,
      displayName: paypalEmail?.includes('@') ? paypalEmail.split('@')[0] : paypalEmail,
      url: paypalEmail
        ? `https://paypal.me/${paypalEmail.includes('@') ? paypalEmail.split('@')[0] : paypalEmail}/${formattedAmount}`
        : null,
      emoji: '🅿️',
      colors: {
        default: 'bg-[#003087]/10 hover:bg-[#003087]/20 text-[#003087] dark:text-[#0070BA] border-[#003087]/30',
        preferred: 'bg-[#003087] hover:bg-[#001F5C] text-white shadow-lg shadow-indigo-500/30',
      },
    },
  ];

  const preferredMethodObj = preferredMethod
    ? paymentMethods.find((m) => m.key === preferredMethod && m.available)
    : null;

  const availableMethods = preferredMethodObj
    ? [preferredMethodObj]
    : paymentMethods.filter((m) => m.available).slice(0, 1);

  return (
    <div className="mt-4 space-y-4">
      {platformFee > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Total to send:</strong> {formatCurrency(totalToPay, loan.currency)}{' '}
            <span className="text-xs ml-1">(includes {formatCurrency(platformFee, loan.currency)} platform fee)</span>
          </p>
        </div>
      )}

      {hasAnyMethod ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Tap to pay via:</p>

          <div className="flex flex-col gap-2">
            {availableMethods.map((method) => {
              const isPreferred = method.key === preferredMethod;
              const colorClass = isPreferred ? method.colors.preferred : method.colors.default;

              const content = (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{method.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{method.name}</span>
                        {isPreferred && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-white/25">
                            ★ Preferred
                          </span>
                        )}
                      </div>
                      <span className="text-sm truncate block opacity-70">{method.displayName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-base">{formatCurrency(totalToPay, loan.currency)}</span>
                    {method.url && <ExternalLink className="w-4 h-4 opacity-70" />}
                  </div>
                </>
              );

              if (method.url) {
                return (
                  <a
                    key={method.key}
                    href={method.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between px-4 py-4 rounded-xl font-medium transition-all active:scale-[0.98] border ${colorClass}`}
                  >
                    {content}
                  </a>
                );
              }

              // Zelle — no URL, show info card
              return (
                <div key={method.key} className={`px-4 py-4 rounded-xl border ${colorClass}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl flex-shrink-0">{method.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{method.name}</span>
                        {isPreferred && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-white/25">
                            ★ Preferred
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold block opacity-90">
                        {formatCurrency(totalToPay, loan.currency)}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm space-y-1 opacity-90">
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[60px]">Send to:</span>
                      <span className="font-mono text-xs break-all">{method.displayName}</span>
                    </div>
                    {(method as any).recipientName && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium min-w-[60px]">Name:</span>
                        <span className="font-semibold">{(method as any).recipientName}</span>
                      </div>
                    )}
                    <p className="text-xs mt-2 opacity-70">
                      Open your bank app and verify the name matches before sending
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>💡 Tip:</strong> Include{' '}
              <span className="font-mono">&quot;{loanNote}&quot;</span> as a note for easy tracking.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Contact your lender for payment details.
          </p>
        </div>
      )}

      <div className="text-center pt-3 border-t border-neutral-200 dark:border-neutral-700">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          After sending, tap <strong>&quot;Mark as Paid&quot;</strong> to upload proof.
        </p>
      </div>
    </div>
  );
}
