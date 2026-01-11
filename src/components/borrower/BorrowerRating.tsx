'use client';

import React from 'react';
import { Star, ThumbsUp, AlertTriangle, XCircle, HelpCircle, Award } from 'lucide-react';

interface BorrowerRatingBadgeProps {
  rating: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const ratingConfig: Record<string, {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: any;
  emoji: string;
}> = {
  great: {
    label: 'Great Borrower',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    icon: Star,
    emoji: '⭐',
  },
  good: {
    label: 'Good Borrower',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    icon: ThumbsUp,
    emoji: '👍',
  },
  neutral: {
    label: 'New Borrower',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    icon: HelpCircle,
    emoji: '🆕',
  },
  poor: {
    label: 'Poor Borrower',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    icon: AlertTriangle,
    emoji: '⚠️',
  },
  bad: {
    label: 'Bad Borrower',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    icon: AlertTriangle,
    emoji: '⛔',
  },
  worst: {
    label: 'High Risk',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    icon: XCircle,
    emoji: '🚨',
  },
};

export function BorrowerRatingBadge({ rating, size = 'md', showLabel = true }: BorrowerRatingBadgeProps) {
  const config = ratingConfig[rating] || ratingConfig.neutral;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeClasses[size]}`}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

interface BorrowerRatingCardProps {
  rating: string;
  paymentStats?: {
    total: number;
    onTime: number;
    early: number;
    late: number;
    missed: number;
  };
  loansCompleted?: number;
  memberMonths?: number;
  isVerified?: boolean;
}

export function BorrowerRatingCard({
  rating,
  paymentStats,
  loansCompleted = 0,
  memberMonths = 0,
  isVerified = false,
}: BorrowerRatingCardProps) {
  const config = ratingConfig[rating] || ratingConfig.neutral;
  const Icon = config.icon;

  const descriptions: Record<string, string> = {
    great: 'Pays early most of the time. Highly reliable.',
    good: 'Pays on time consistently. Trustworthy.',
    neutral: 'No payment history yet or limited data.',
    poor: 'Mixed payment history. Some missed payments.',
    bad: 'Frequently late on payments. High risk.',
    worst: 'Rarely or never pays. Avoid lending.',
  };

  const onTimePercentage = paymentStats && paymentStats.total > 0
    ? Math.round(((paymentStats.onTime + paymentStats.early) / paymentStats.total) * 100)
    : 0;

  return (
    <div className={`rounded-xl border-2 ${config.borderColor} ${config.bgColor} p-4`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${config.bgColor} border ${config.borderColor}`}>
          <span className="text-2xl">{config.emoji}</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className={`font-semibold ${config.textColor}`}>{config.label}</h4>
            {isVerified && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                ✓ Verified
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500">{descriptions[rating] || descriptions.neutral}</p>
        </div>
      </div>

      {paymentStats && paymentStats.total > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">On-Time Rate</span>
            <span className={`font-semibold ${onTimePercentage >= 80 ? 'text-green-600' : onTimePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {onTimePercentage}%
            </span>
          </div>
          <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${onTimePercentage >= 80 ? 'bg-green-500' : onTimePercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${onTimePercentage}%` }}
            />
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs text-center pt-2">
            <div>
              <p className="font-semibold text-green-600">{paymentStats.early}</p>
              <p className="text-neutral-500">Early</p>
            </div>
            <div>
              <p className="font-semibold text-blue-600">{paymentStats.onTime}</p>
              <p className="text-neutral-500">On Time</p>
            </div>
            <div>
              <p className="font-semibold text-yellow-600">{paymentStats.late}</p>
              <p className="text-neutral-500">Late</p>
            </div>
            <div>
              <p className="font-semibold text-red-600">{paymentStats.missed}</p>
              <p className="text-neutral-500">Missed</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-neutral-200 flex justify-between text-sm">
        <span className="text-neutral-500">Loans Completed: <strong>{loansCompleted}</strong></span>
        <span className="text-neutral-500">Member: <strong>{memberMonths}+ months</strong></span>
      </div>
    </div>
  );
}
