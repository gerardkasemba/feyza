'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, getPaymentStatus } from '@/lib/utils';
import { PaymentScheduleItem } from '@/types';
import { Check, Clock, AlertCircle, Circle } from 'lucide-react';

interface LoanTimelineProps {
  schedule: PaymentScheduleItem[];
  currency: string;
  onMarkPaid?: (scheduleItem: PaymentScheduleItem) => void;
  showBreakdown?: boolean;
}

export function LoanTimeline({ schedule, currency, onMarkPaid, showBreakdown = true }: LoanTimelineProps) {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-neutral-200" />

      <div className="space-y-4">
        {schedule.map((item, index) => {
          const status = getPaymentStatus(item.due_date, item.is_paid);
          const isLast = index === schedule.length - 1;
          const hasInterest = item.interest_amount && item.interest_amount > 0;

          const statusConfig = {
            paid: {
              icon: Check,
              bgColor: 'bg-green-500',
              textColor: 'text-green-700',
              label: 'Paid',
            },
            upcoming: {
              icon: Circle,
              bgColor: 'bg-neutral-200',
              textColor: 'text-neutral-500',
              label: 'Upcoming',
            },
            due: {
              icon: Clock,
              bgColor: 'bg-yellow-500',
              textColor: 'text-yellow-700',
              label: 'Due soon',
            },
            overdue: {
              icon: AlertCircle,
              bgColor: 'bg-red-500',
              textColor: 'text-red-700',
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
                <Icon className={cn('w-3.5 h-3.5', status === 'paid' ? 'text-white' : 'text-white')} />
              </div>

              {/* Content */}
              <div
                className={cn(
                  'flex-1 bg-white rounded-xl border p-4 transition-all',
                  status === 'overdue' ? 'border-red-200 bg-red-50' : 'border-neutral-200',
                  !item.is_paid && onMarkPaid && 'hover:border-primary-300 cursor-pointer'
                )}
                onClick={() => !item.is_paid && onMarkPaid && onMarkPaid(item)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('text-sm font-medium', config.textColor)}>
                    {config.label}
                  </span>
                  <span className="text-sm text-neutral-500">{formatDate(item.due_date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-neutral-900">
                      {formatCurrency(item.amount, currency)}
                    </span>
                    {/* Show breakdown if there's interest */}
                    {showBreakdown && hasInterest && (
                      <div className="flex gap-3 mt-1 text-xs text-neutral-500">
                        <span>Principal: {formatCurrency(item.principal_amount, currency)}</span>
                        <span className="text-orange-600">Interest: {formatCurrency(item.interest_amount, currency)}</span>
                      </div>
                    )}
                  </div>
                  {!item.is_paid && onMarkPaid && (
                    <span className="text-xs text-primary-600 font-medium">
                      Click to mark as paid
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
