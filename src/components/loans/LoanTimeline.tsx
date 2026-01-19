'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, getPaymentStatus } from '@/lib/utils';
import { PaymentScheduleItem } from '@/types';
import { Check, Clock, AlertCircle, Circle } from 'lucide-react';
import { GiTakeMyMoney, GiReceiveMoney } from 'react-icons/gi';
import { MdEmergency, MdMedicalServices, MdSchool, MdBusinessCenter, MdHome, MdDescription } from 'react-icons/md';

interface LoanTimelineProps {
  schedule: PaymentScheduleItem[];
  currency: string;
  showBreakdown?: boolean;
}

export function LoanTimeline({ schedule, currency, showBreakdown = true }: LoanTimelineProps) {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-neutral-200 dark:bg-neutral-700" />

      <div className="space-y-4">
        {schedule.map((item, index) => {
          const status = getPaymentStatus(item.due_date, item.is_paid);
          const isLast = index === schedule.length - 1;
          const hasInterest = item.interest_amount && item.interest_amount > 0;

          const statusConfig = {
            paid: {
              icon: Check,
              bgColor: 'bg-green-500 dark:bg-green-600',
              textColor: 'text-green-700 dark:text-green-400',
              label: 'Paid',
            },
            upcoming: {
              icon: Circle,
              bgColor: 'bg-neutral-200 dark:bg-neutral-600',
              textColor: 'text-neutral-500 dark:text-neutral-400',
              label: 'Upcoming',
            },
            due: {
              icon: Clock,
              bgColor: 'bg-yellow-500 dark:bg-yellow-600',
              textColor: 'text-yellow-700 dark:text-yellow-400',
              label: 'Due soon',
            },
            overdue: {
              icon: AlertCircle,
              bgColor: 'bg-red-500 dark:bg-red-600',
              textColor: 'text-red-700 dark:text-red-400',
              label: 'Overdue',
            },
          };

          const config = statusConfig[status];
          const Icon = config.icon;

          return (
            <div key={item.id} className="relative flex items-start gap-4 pl-2">
              {/* Timeline dot */}
              <div
                className={cn(
                  'relative z-10 w-6 h-6 rounded-full flex items-center justify-center',
                  config.bgColor
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', status === 'paid' ? 'text-white dark:text-white' : 'text-white dark:text-white')} />
              </div>

              {/* Content */}
              <div
                className={cn(
                  'flex-1 bg-white dark:bg-neutral-800 rounded-xl border p-4',
                  status === 'overdue' 
                    ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30' 
                    : 'border-neutral-200 dark:border-neutral-700'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('text-sm font-medium', config.textColor)}>
                    {config.label}
                  </span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {formatDate(item.due_date)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-neutral-900 dark:text-white">
                      {formatCurrency(item.amount, currency)}
                    </span>
                    {/* Show breakdown if there's interest */}
                    {showBreakdown && hasInterest && (
                      <div className="flex gap-3 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <span>
                          Principal: {formatCurrency(item.principal_amount, currency)}
                        </span>
                        <span className="text-orange-600 dark:text-orange-400">
                          Interest: {formatCurrency(item.interest_amount, currency)}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Auto-pay indicator for unpaid items */}
                  {!item.is_paid && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Auto-pay
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}