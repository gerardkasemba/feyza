'use client';

import React from 'react';
import Link from 'next/link';
import { Card, Avatar, Badge } from '@/components/ui';
import { formatCurrency, formatRelativeDate } from '@/lib/utils';
import { Loan, Payment } from '@/types';
import { ArrowUpRight, ArrowDownLeft, Check, Clock } from 'lucide-react';

type ActivityItem = {
  id: string;
  type: 'loan_created' | 'payment_made' | 'payment_confirmed' | 'loan_accepted';
  loan: Loan;
  payment?: Payment;
  timestamp: string;
};

interface RecentActivityProps {
  activities: ActivityItem[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <Card className="text-center py-12">
        <p className="text-neutral-500 dark:text-neutral-400">No recent activity</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

function ActivityCard({ activity }: { activity: ActivityItem }) {
  const { type, loan, payment, timestamp } = activity;

  const config = {
    loan_created: {
      icon: ArrowUpRight,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      title: 'Loan requested',
      description: `You requested ${formatCurrency(loan.amount, loan.currency)}`,
    },
    payment_made: {
      icon: ArrowDownLeft,
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      title: 'Payment marked',
      description: payment
        ? `${formatCurrency(payment.amount, loan.currency)} marked as paid`
        : 'Payment marked as paid',
    },
    payment_confirmed: {
      icon: Check,
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      title: 'Payment confirmed',
      description: payment
        ? `${formatCurrency(payment.amount, loan.currency)} confirmed`
        : 'Payment confirmed',
    },
    loan_accepted: {
      icon: Check,
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      title: 'Loan accepted',
      description: `${formatCurrency(loan.amount, loan.currency)} loan is now active`,
    },
  };

  const { icon: Icon, iconBg, iconColor, title, description } = config[type];

  return (
    <Link href={`/loans/${loan.id}`}>
      <Card hover className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-neutral-900 dark:text-white">{title}</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{description}</p>
        </div>
        <span className="text-xs text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
          {formatRelativeDate(timestamp)}
        </span>
      </Card>
    </Link>
  );
}