'use client';

import React, { useMemo } from 'react';
import {
  Star,
  ThumbsUp,
  HelpCircle,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Clock,
  TrendingUp,
  Info,
  Award
} from 'lucide-react';

/**
 * App-style, mobile-friendly borrower rating UI
 * - No react-icons dependency
 * - Consistent sizing + chip + card variants
 * - Cleaner colors and spacing
 */

type BorrowerRating = 'great' | 'good' | 'neutral' | 'poor' | 'bad' | 'worst';

interface BorrowerRatingBadgeProps {
  rating: BorrowerRating | string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

interface BorrowerRatingCardProps {
  rating: BorrowerRating | string;
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

type RatingUI = {
  key: BorrowerRating;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  chip: string; // tailwind classes
  cardBorder: string;
  cardBg: string;
  iconWrap: string;
};

const RATING_UI: Record<BorrowerRating, RatingUI> = {
  great: {
    key: 'great',
    label: 'Great Borrower',
    description: 'Pays early most of the time. Highly reliable.',
    icon: Star,
    chip:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/40',
    cardBorder: 'border-emerald-200 dark:border-emerald-900/40',
    cardBg: 'bg-white dark:bg-neutral-950',
    iconWrap: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  },
  good: {
    key: 'good',
    label: 'Good Borrower',
    description: 'Pays on time consistently. Trustworthy.',
    icon: ThumbsUp,
    chip:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/40',
    cardBorder: 'border-blue-200 dark:border-blue-900/40',
    cardBg: 'bg-white dark:bg-neutral-950',
    iconWrap: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  },
  neutral: {
    key: 'neutral',
    label: 'New Borrower',
    description: 'Limited history so far.',
    icon: HelpCircle,
    chip:
      'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800',
    cardBorder: 'border-neutral-200 dark:border-neutral-800',
    cardBg: 'bg-white dark:bg-neutral-950',
    iconWrap: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300',
  },
  poor: {
    key: 'poor',
    label: 'Needs Attention',
    description: 'Mixed payment history. Some late payments.',
    icon: AlertTriangle,
    chip:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-900/40',
    cardBorder: 'border-amber-200 dark:border-amber-900/40',
    cardBg: 'bg-white dark:bg-neutral-950',
    iconWrap: 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200',
  },
  bad: {
    key: 'bad',
    label: 'High Risk',
    description: 'Frequently late on payments.',
    icon: AlertTriangle,
    chip:
      'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-200 dark:border-orange-900/40',
    cardBorder: 'border-orange-200 dark:border-orange-900/40',
    cardBg: 'bg-white dark:bg-neutral-950',
    iconWrap: 'bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200',
  },
  worst: {
    key: 'worst',
    label: 'Avoid Lending',
    description: 'Rarely pays. Very high risk.',
    icon: XCircle,
    chip:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-900/40',
    cardBorder: 'border-red-200 dark:border-red-900/40',
    cardBg: 'bg-white dark:bg-neutral-950',
    iconWrap: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200',
  },
};

function normalizeRating(rating: string): BorrowerRating {
  const r = (rating || '').toLowerCase().trim();
  if (r in RATING_UI) return r as BorrowerRating;
  return 'neutral';
}

function clampPct(n: number) {
  return Math.max(0, Math.min(100, n));
}

function progressTone(pct: number) {
  if (pct >= 80) return 'bg-emerald-500 dark:bg-emerald-600';
  if (pct >= 50) return 'bg-amber-500 dark:bg-amber-600';
  return 'bg-red-500 dark:bg-red-600';
}

function pctToneText(pct: number) {
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

// ============================================
// BADGE (chip)
// ============================================

export function BorrowerRatingBadge({
  rating,
  size = 'md',
  showLabel = true,
}: BorrowerRatingBadgeProps) {
  const ui = RATING_UI[normalizeRating(rating)];
  const Icon = ui.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-1 rounded-full',
    md: 'text-xs px-2.5 py-1.5 rounded-full',
    lg: 'text-sm px-3 py-2 rounded-full',
  };

  const iconClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5',
  };

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 border font-semibold',
        ui.chip,
        sizeClasses[size],
      ].join(' ')}
    >
      <Icon className={iconClasses[size]} />
      {showLabel ? <span>{ui.label}</span> : null}
    </span>
  );
}

// ============================================
// CARD (app-style)
// ============================================

export function BorrowerRatingCard({
  rating,
  paymentStats,
  loansCompleted = 0,
  memberMonths = 0,
  isVerified = false,
}: BorrowerRatingCardProps) {
  const ui = RATING_UI[normalizeRating(rating)];
  const Icon = ui.icon;

  const onTimePercentage = useMemo(() => {
    if (!paymentStats || paymentStats.total <= 0) return 0;
    const good = (paymentStats.onTime || 0) + (paymentStats.early || 0);
    return clampPct(Math.round((good / paymentStats.total) * 100));
  }, [paymentStats]);

  const breakdown = paymentStats && paymentStats.total > 0;

  return (
    <div
      className={[
        'rounded-2xl border p-4 sm:p-5',
        'shadow-sm',
        ui.cardBorder,
        ui.cardBg,
      ].join(' ')}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={[
              'w-11 h-11 rounded-2xl grid place-items-center border',
              'border-neutral-200 dark:border-neutral-800',
              ui.iconWrap,
            ].join(' ')}
          >
            <Icon className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
                {ui.label}
              </h4>

              {isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified
                </span>
              ) : null}
            </div>

            <p className="mt-0.5 text-[12px] text-neutral-600 dark:text-neutral-400">
              {ui.description}
            </p>
          </div>
        </div>

        {/* Compact chip for quick scanning */}
        <BorrowerRatingBadge rating={ui.key} size="sm" showLabel={false} />
      </div>

      {/* Payment performance */}
      {breakdown ? (
        <div className="mt-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
              <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                On-time rate
              </span>
            </div>
            <span className={['text-sm font-bold', pctToneText(onTimePercentage)].join(' ')}>
              {onTimePercentage}%
            </span>
          </div>

          <div className="mt-2 h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
            <div
              className={['h-full rounded-full', progressTone(onTimePercentage)].join(' ')}
              style={{ width: `${onTimePercentage}%` }}
            />
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <StatMini label="Early" value={paymentStats!.early} tone="text-blue-600 dark:text-blue-400" />
            <StatMini label="On time" value={paymentStats!.onTime} tone="text-emerald-600 dark:text-emerald-400" />
            <StatMini label="Late" value={paymentStats!.late} tone="text-amber-600 dark:text-amber-400" />
            <StatMini label="Missed" value={paymentStats!.missed} tone="text-red-600 dark:text-red-400" />
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-3">
          <div className="flex items-start gap-2 text-[12px] text-neutral-600 dark:text-neutral-400">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            No payment history available yet.
          </div>
        </div>
      )}

      {/* Footer stats */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <FooterPill
          icon={Award}
          label="Loans completed"
          value={String(loansCompleted)}
        />
        <FooterPill
          icon={Clock}
          label="Member"
          value={`${memberMonths}+ months`}
        />
      </div>
    </div>
  );
}

// ============================================
// SMALL SUBCOMPONENTS
// ============================================

function StatMini({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-2">
      <div className={['text-base font-bold leading-none', tone].join(' ')}>
        {value || 0}
      </div>
      <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{label}</div>
    </div>
  );
}

function FooterPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] text-neutral-600 dark:text-neutral-400">
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </div>
        <div className="text-sm font-bold text-neutral-900 dark:text-white">{value}</div>
      </div>
    </div>
  );
}
