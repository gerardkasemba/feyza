'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { TrendingUp, Lock, Star, AlertCircle, ChevronUp, Info } from 'lucide-react';
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
        <div className="h-24 bg-neutral-100 rounded" />
      </Card>
    );
  }

  if (error || !eligibility) {
    return null;
  }

  const getTierColor = (tier: number) => {
    const colors: Record<number, string> = {
      1: 'text-gray-600 bg-gray-100',
      2: 'text-amber-700 bg-amber-100',
      3: 'text-slate-600 bg-slate-200',
      4: 'text-yellow-700 bg-yellow-100',
      5: 'text-purple-700 bg-purple-100',
      6: 'text-blue-700 bg-blue-100',
    };
    return colors[tier] || colors[1];
  };

  const progressToNextTier = eligibility.loansNeededToUpgrade > 0
    ? ((3 - eligibility.loansNeededToUpgrade) / 3) * 100
    : 100;

  return (
    <Card className="border-primary-200 bg-gradient-to-br from-primary-50 to-white">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTierColor(eligibility.borrowingTier)}`}>
            <Star className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-neutral-500">Your Borrowing Tier</p>
            <p className="font-semibold text-neutral-900">{eligibility.tierName}</p>
          </div>
        </div>
        {!eligibility.canBorrow && (
          <div className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Limited
          </div>
        )}
      </div>

      {/* Borrowing Limit */}
      <div className="bg-white rounded-xl p-4 mb-4 border border-neutral-100">
        {eligibility.borrowingTier === 6 ? (
          <div className="text-center">
            <p className="text-sm text-neutral-500">Borrowing Limit</p>
            <p className="text-2xl font-bold text-primary-600">Unlimited ✨</p>
            <p className="text-xs text-neutral-400 mt-1">
              {eligibility.totalOutstanding > 0 && `Outstanding: ${formatCurrency(eligibility.totalOutstanding)}`}
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-neutral-500">Available to Borrow</span>
              <span className="text-lg font-bold text-primary-600">
                {formatCurrency(eligibility.availableAmount || 0)}
              </span>
            </div>
            <div className="h-3 bg-neutral-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 transition-all"
                style={{ 
                  width: `${eligibility.maxAmount ? ((eligibility.availableAmount || 0) / eligibility.maxAmount) * 100 : 0}%` 
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-neutral-400 mt-1">
              <span>Outstanding: {formatCurrency(eligibility.totalOutstanding)}</span>
              <span>Max: {formatCurrency(eligibility.maxAmount || 0)}</span>
            </div>
          </>
        )}
      </div>

      {/* Can't Borrow Warning */}
      {!eligibility.canBorrow && eligibility.reason && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{eligibility.reason}</p>
        </div>
      )}

      {/* Tier Progress */}
      {eligibility.borrowingTier < 6 && (
        <div className="border-t border-neutral-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ChevronUp className="w-4 h-4 text-green-600" />
              <span className="text-sm text-neutral-600">Progress to next tier</span>
            </div>
            <span className="text-sm font-medium text-neutral-900">
              {3 - eligibility.loansNeededToUpgrade}/3 loans
            </span>
          </div>
          <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all"
              style={{ width: `${progressToNextTier}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Complete {eligibility.loansNeededToUpgrade} more loan{eligibility.loansNeededToUpgrade > 1 ? 's' : ''} to unlock{' '}
            <strong>{formatCurrency(eligibility.nextTierAmount || 0)}</strong> borrowing limit
          </p>
        </div>
      )}

      {/* Tier Info */}
      <div className="mt-4 pt-4 border-t border-neutral-100">
        <button 
          className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
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
    { tier: 1, name: 'Starter', amount: 150, color: 'bg-gray-100' },
    { tier: 2, name: 'Bronze', amount: 300, color: 'bg-amber-100' },
    { tier: 3, name: 'Silver', amount: 600, color: 'bg-slate-200' },
    { tier: 4, name: 'Gold', amount: 1200, color: 'bg-yellow-100' },
    { tier: 5, name: 'Platinum', amount: 2000, color: 'bg-purple-100' },
    { tier: 6, name: 'Diamond', amount: null, color: 'bg-blue-100' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-neutral-900">Borrowing Tier System</h3>
      <p className="text-sm text-neutral-600">
        New borrowers start at $150. Complete 3 loans at your current tier to unlock the next level.
      </p>
      
      <div className="space-y-2">
        {tiers.map((t) => (
          <div key={t.tier} className={`flex items-center justify-between p-3 rounded-lg ${t.color}`}>
            <div className="flex items-center gap-2">
              <span className="font-medium">{t.name}</span>
              <span className="text-xs text-neutral-500">Tier {t.tier}</span>
            </div>
            <span className="font-bold">
              {t.amount ? formatCurrency(t.amount) : 'Unlimited'}
            </span>
          </div>
        ))}
      </div>

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> If you have outstanding loans of $2,000 or more, you must pay 75% before applying for a new loan.
        </p>
      </div>
    </div>
  );
}
