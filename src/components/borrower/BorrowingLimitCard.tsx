'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { TrendingUp, Lock, Star, AlertCircle, ChevronUp, Info } from 'lucide-react';
import { FaBuilding, FaUsers } from 'react-icons/fa';
import { formatCurrency } from '@/lib/utils';

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
  stats: {
    totalLoansCompleted: number;
    totalPaymentsMade: number;
    paymentsOnTime: number;
    paymentsEarly: number;
    paymentsLate: number;
    paymentsMissed: number;
  };
}

interface BorrowingLimitCardProps {
  onLimitCheck?: (canBorrow: boolean, maxAmount: number | null) => void;
}

export function BorrowingLimitCard({ onLimitCheck }: BorrowingLimitCardProps) {
  const [eligibility, setEligibility] = useState<BorrowingEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEligibility = async () => {
      try {
        const response = await fetch('/api/borrower/eligibility');
        if (!response.ok) throw new Error('Failed to fetch eligibility');
        
        const data = await response.json();
        setEligibility(data);
        
        if (onLimitCheck) {
          onLimitCheck(data.canBorrow, data.availableAmount);
        }
      } catch (err) {
        setError('Failed to load borrowing limits');
      } finally {
        setLoading(false);
      }
    };

    fetchEligibility();
  }, [onLimitCheck]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-24 bg-neutral-100 dark:bg-neutral-800 rounded" />
      </Card>
    );
  }

  if (error || !eligibility) {
    return null;
  }

  const getTierColor = (tier: number) => {
    const colors: Record<number, string> = {
      1: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800/50',
      2: 'text-amber-700 bg-amber-100 dark:text-amber-500 dark:bg-amber-900/30',
      3: 'text-slate-600 bg-slate-200 dark:text-slate-400 dark:bg-slate-800/50',
      4: 'text-yellow-700 bg-yellow-100 dark:text-yellow-500 dark:bg-yellow-900/30',
      5: 'text-purple-700 bg-purple-100 dark:text-purple-500 dark:bg-purple-900/30',
      6: 'text-blue-700 bg-blue-100 dark:text-blue-500 dark:bg-blue-900/30',
    };
    return colors[tier] || colors[1];
  };

  const progressToNextTier = eligibility.loansNeededToUpgrade > 0
    ? ((3 - eligibility.loansNeededToUpgrade) / 3) * 100
    : 100;

  return (
    <Card className="border-primary-200 dark:border-primary-800 bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-neutral-800">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTierColor(eligibility.borrowingTier)}`}>
            <Star className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Your Borrowing Tier</p>
            <p className="font-semibold text-neutral-900 dark:text-white">{eligibility.tierName}</p>
          </div>
        </div>
        {!eligibility.canBorrow && (
          <div className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Limited
          </div>
        )}
      </div>

      {/* Borrowing Limit */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 mb-4 border border-neutral-100 dark:border-neutral-700">
        {eligibility.borrowingTier === 6 ? (
          <div className="text-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Borrowing Limit</p>
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">Unlimited ✨</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              {eligibility.totalOutstanding > 0 && `Outstanding: ${formatCurrency(eligibility.totalOutstanding)}`}
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">Available to Borrow</span>
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {formatCurrency(eligibility.availableAmount || 0)}
              </span>
            </div>
            <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 dark:bg-primary-600 transition-all"
                style={{ 
                  width: `${eligibility.maxAmount ? ((eligibility.availableAmount || 0) / eligibility.maxAmount) * 100 : 0}%` 
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              <span>Outstanding: {formatCurrency(eligibility.totalOutstanding)}</span>
              <span>Max: {formatCurrency(eligibility.maxAmount || 0)}</span>
            </div>
          </>
        )}
      </div>

      {/* Can't Borrow Warning */}
      {!eligibility.canBorrow && eligibility.reason && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg mb-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{eligibility.reason}</p>
        </div>
      )}

      {/* Tier Progress */}
      {eligibility.borrowingTier < 6 && (
        <div className="border-t border-neutral-100 dark:border-neutral-700 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ChevronUp className="w-4 h-4 text-green-600 dark:text-green-500" />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Progress to next tier</span>
            </div>
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {3 - eligibility.loansNeededToUpgrade}/3 loans
            </span>
          </div>
          <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 dark:bg-green-600 transition-all"
              style={{ width: `${progressToNextTier}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            Complete {eligibility.loansNeededToUpgrade} more loan{eligibility.loansNeededToUpgrade > 1 ? 's' : ''} to unlock{' '}
            <strong className="text-neutral-900 dark:text-white">{formatCurrency(eligibility.nextTierAmount || 0)}</strong> borrowing limit
          </p>
        </div>
      )}

      {/* Tier Info */}
      <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700">
        <button 
          className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
          onClick={() => {/* Show tier info modal */}}
        >
          <Info className="w-3 h-3" />
          How borrowing tiers work
        </button>
      </div>
    </Card>
  );
}

// Tier explanation component
export function TierExplanation() {
  const tiers = [
    { tier: 1, name: 'Starter', amount: 150, color: 'bg-gray-100 dark:bg-gray-800/50' },
    { tier: 2, name: 'Bronze', amount: 300, color: 'bg-amber-100 dark:bg-amber-900/30' },
    { tier: 3, name: 'Silver', amount: 600, color: 'bg-slate-200 dark:bg-slate-800/50' },
    { tier: 4, name: 'Gold', amount: 1200, color: 'bg-yellow-100 dark:bg-yellow-900/30' },
    { tier: 5, name: 'Platinum', amount: 2000, color: 'bg-purple-100 dark:bg-purple-900/30' },
    { tier: 6, name: 'Diamond', amount: null, color: 'bg-blue-100 dark:bg-blue-900/30' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-neutral-900 dark:text-white">Borrowing Tier System</h3>
      
      {/* Business Lenders Section */}
      <div className="p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <FaBuilding className="text-teal-700 dark:text-teal-400" />
          <h4 className="font-medium text-teal-800 dark:text-teal-300">Business Lenders</h4>
        </div>
        <p className="text-sm text-teal-700 dark:text-teal-400">
          When borrowing from business lenders, <strong className="text-teal-800 dark:text-teal-300">there are no fixed tier limits</strong>. 
          Each business sets their own maximum loan amount for first-time borrowers. 
          You'll be matched with lenders who support your requested amount.
        </p>
      </div>

      {/* Personal Lenders Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FaUsers className="text-neutral-700 dark:text-neutral-300" />
          <h4 className="font-medium text-neutral-700 dark:text-neutral-300">Personal Lending (Friends & Family)</h4>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          For personal loans, tiers help build trust. Complete 3 loans at your current tier to unlock the next level.
        </p>
        
        {tiers.map((t) => (
          <div key={t.tier} className={`flex items-center justify-between p-3 rounded-lg ${t.color}`}>
            <div className="flex items-center gap-2">
              <span className="font-medium text-neutral-900 dark:text-neutral-200">{t.name}</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Tier {t.tier}</span>
            </div>
            <span className="font-bold text-neutral-900 dark:text-neutral-200">
              {t.amount ? formatCurrency(t.amount) : 'Unlimited'}
            </span>
          </div>
        ))}
      </div>

      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-300">
          <strong>Note:</strong> If you have outstanding loans of $2,000 or more, you must pay 75% before applying for a new loan.
        </p>
      </div>
    </div>
  );
}