'use client';

import { Button, Card } from '@/components/ui';
import { Bell, CheckCircle, Banknote } from 'lucide-react';
import { PaymentRetryBadge } from '@/components/payments/PaymentRetryBadge';
import { Loan, PaymentScheduleItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface RemindersTabProps {
  loan: Loan;
  schedule: PaymentScheduleItem[];
  isLender: boolean;
  processingPayment: string | null;
  onSendReminder: () => void;
  onProcessPayment: (paymentId: string) => void;
}

export function RemindersTab({
  loan,
  schedule,
  isLender,
  processingPayment,
  onSendReminder,
  onProcessPayment,
}: RemindersTabProps) {
  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">Payment reminders</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Send reminders to the borrower</p>
        </div>
        <Button variant="outline" onClick={onSendReminder}>
          <Bell className="w-4 h-4 mr-2" />
          Send reminder
        </Button>
      </div>

      <div className="space-y-2">
        {schedule
          .filter((s) => !s.is_paid)
          .slice(0, 5)
          .map((p) => {
            const dueDate = new Date(p.due_date);
            const today = new Date();
            const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const isOverdue = daysUntilDue < 0;
            const isDueToday = daysUntilDue === 0;

            const reminderSentAt = p.reminder_sent_at || (p as any).last_manual_reminder_at;
            const reminderSent24hAgo = reminderSentAt
              ? new Date().getTime() - new Date(reminderSentAt).getTime() >= 24 * 60 * 60 * 1000
              : false;

            const canProcessNow = (isOverdue || isDueToday) && reminderSent24hAgo;

            return (
              <div
                key={p.id}
                className={`rounded-xl border p-4 ${
                  isOverdue
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {formatCurrency(p.amount, loan.currency)}
                    </p>
                    <p
                      className={`text-sm ${
                        isOverdue
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {isOverdue
                        ? `⚠️ ${Math.abs(daysUntilDue)} days overdue`
                        : isDueToday
                        ? 'Due today'
                        : `Due in ${daysUntilDue} days`}{' '}
                      • {formatDate(p.due_date)}
                    </p>

                    {((p as any).retry_count > 0 ||
                      (p as any).status === 'failed' ||
                      (p as any).status === 'defaulted') && (
                      <div className="mt-2">
                        <PaymentRetryBadge
                          retryCount={(p as any).retry_count || 0}
                          nextRetryAt={(p as any).next_retry_at}
                          status={(p as any).status}
                          causedBlock={(p as any).caused_block}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {reminderSentAt ? (
                      <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Reminder sent
                        <span className="text-neutral-400 dark:text-neutral-500 ml-1">
                          {formatDate(reminderSentAt)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">No reminder sent</span>
                    )}

                    {canProcessNow && isLender && (
                      <Button
                        size="sm"
                        variant={isOverdue ? 'danger' : 'outline'}
                        onClick={() => onProcessPayment(p.id)}
                        disabled={processingPayment === p.id}
                      >
                        {processingPayment === p.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Banknote className="w-3 h-3 mr-1" />
                            Process Now
                          </>
                        )}
                      </Button>
                    )}

                    {(isOverdue || isDueToday) && isLender && !canProcessNow && reminderSentAt && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        Can process{' '}
                        {Math.ceil(
                          (24 * 60 * 60 * 1000 -
                            (new Date().getTime() - new Date(reminderSentAt).getTime())) /
                            (60 * 60 * 1000)
                        )}
                        h after reminder
                      </span>
                    )}

                    {(isOverdue || isDueToday) && isLender && !reminderSentAt && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">Send reminder first</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

        {schedule.filter((s) => !s.is_paid).length === 0 && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-6">
            No upcoming payments 🎉
          </p>
        )}
      </div>
    </Card>
  );
}
