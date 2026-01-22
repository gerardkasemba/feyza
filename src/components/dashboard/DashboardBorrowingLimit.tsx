'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { Star, Lock, TrendingUp, ChevronRight, Loader2 } from 'lucide-react';

interface BorrowingEligibility {
  canBorrow: boolean;
  reason: string;
  borrowingTier: number;
  tierName: string;
  maxAmount: number | null;
  availableAmount: number | null;
  totalOutstanding: number;
  loansAtCurrentTier: number;
  loansNeededToUpgrade: number;
  nextTierAmount: number | null;
  borrowerRating: string;
}

export function DashboardBorrowingLimit() {
  const [eligibility, setEligibility] = useState<BorrowingEligibility | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEligibility = async () => {
      try {
        const response = await fetch('/api/borrower/eligibility');
        if (response.ok) {
          const data = await response.json();
          setEligibility(data);
        }
      } catch (err) {
        console.error('Failed to fetch eligibility:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEligibility();
  }, []);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-neutral-800 border-primary-100 dark:border-primary-900">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      </Card>
    );
  }

  if (!eligibility) return null;

  const getTierColor = (tier: number) => {
    const colors: Record<number, { bg: string; text: string; darkBg: string; darkText: string }> = {
      1: { bg: 'bg-gray-100', text: 'text-gray-600', darkBg: 'dark:bg-gray-800', darkText: 'dark:text-gray-400' },
      2: { bg: 'bg-amber-100', text: 'text-amber-700', darkBg: 'dark:bg-amber-900/30', darkText: 'dark:text-amber-400' },
      3: { bg: 'bg-slate-200', text: 'text-slate-700', darkBg: 'dark:bg-slate-800', darkText: 'dark:text-slate-400' },
      4: { bg: 'bg-yellow-100', text: 'text-yellow-700', darkBg: 'dark:bg-yellow-900/30', darkText: 'dark:text-yellow-400' },
      5: { bg: 'bg-purple-100', text: 'text-purple-700', darkBg: 'dark:bg-purple-900/30', darkText: 'dark:text-purple-400' },
      6: { bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-400' },
    };
    return colors[tier] || colors[1];
  };

  const tierColor = getTierColor(eligibility.borrowingTier);
  const progressPercent = eligibility.loansNeededToUpgrade > 0
    ? ((3 - eligibility.loansNeededToUpgrade) / 3) * 100
    : 100;

  return (
    <Card className="bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-neutral-800 border-primary-100 dark:border-primary-900">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tierColor.bg} ${tierColor.darkBg}`}>
            <Star className={`w-5 h-5 ${tierColor.text} ${tierColor.darkText}`} />
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Your Borrowing Tier</p>
            <p className="font-semibold text-neutral-900 dark:text-white">{eligibility.tierName}</p>
          </div>
        </div>
        {!eligibility.canBorrow && (
          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Limited
          </span>
        )}
      </div>

      {/* Limit Info */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-neutral-900/50 rounded-xl border border-neutral-100 dark:border-neutral-700 mb-3">
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Available to Borrow</p>
          <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
            {eligibility.borrowingTier === 6 
              ? 'Unlimited' 
              : formatCurrency(eligibility.availableAmount || 0)}
          </p>
        </div>
        {eligibility.borrowingTier < 6 && (
          <div className="text-right">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Tier Limit</p>
            <p className="font-medium text-neutral-700 dark:text-neutral-300">{formatCurrency(eligibility.maxAmount || 0)}</p>
          </div>
        )}
      </div>

      {/* Progress to next tier */}
      {eligibility.borrowingTier < 6 && eligibility.loansNeededToUpgrade > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
              Next tier: {formatCurrency(eligibility.nextTierAmount || 0)}
            </span>
            <span className="text-neutral-600 dark:text-neutral-300">{3 - eligibility.loansNeededToUpgrade}/3 loans</span>
          </div>
          <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <Link href="/loans/new">
        <Button size="sm" className="w-full">
          Request a Loan
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </Link>
    </Card>
  );
}
