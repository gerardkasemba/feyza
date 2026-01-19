'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '@/components/ui';
import { BorrowerRatingBadge, BorrowerRatingCard } from '@/components/borrower/BorrowerRating';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, ChevronDown, ChevronUp, User } from 'lucide-react';

interface PendingLoanCardProps {
  loan: any;
}

export function PendingLoanCard({ loan }: PendingLoanCardProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBorrowerDetails, setShowBorrowerDetails] = useState(false);
  const [borrowerProfile, setBorrowerProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Fetch borrower profile when expanded
  useEffect(() => {
    if (showBorrowerDetails && !borrowerProfile && loan.borrower?.id) {
      setLoadingProfile(true);
      fetch(`/api/borrower/${loan.borrower.id}`)
        .then(res => res.json())
        .then(data => {
          setBorrowerProfile(data);
          setLoadingProfile(false);
        })
        .catch(() => setLoadingProfile(false));
    }
  }, [showBorrowerDetails, loan.borrower?.id, borrowerProfile]);

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);

    try {
      const response = await fetch(`/api/loans/${loan.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept loan');
      }

      // Refresh the page
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to accept loan');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline this loan request?')) return;

    setIsDeclining(true);
    setError(null);

    try {
      const response = await fetch(`/api/loans/${loan.id}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to decline loan');
      }

      // Refresh the page
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to decline loan');
    } finally {
      setIsDeclining(false);
    }
  };

  const borrowerRating = loan.borrower?.borrower_rating || 'neutral';

  return (
    <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/20">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
          </div>
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">
              {loan.borrower?.full_name || 'Unknown'}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{loan.borrower?.email}</p>
          </div>
        </div>
        <Badge variant="warning">Pending</Badge>
      </div>

      {/* Borrower Rating Badge */}
      <div className="mb-3">
        <BorrowerRatingBadge rating={borrowerRating} size="sm" />
      </div>
      
      <div className="mb-4">
        <p className="text-2xl font-bold text-neutral-900 dark:text-white">
          {formatCurrency(loan.amount, loan.currency)}
        </p>
        {loan.purpose && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{loan.purpose}</p>
        )}
      </div>

      <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
        <p>{loan.total_installments} {loan.repayment_frequency} payments</p>
      </div>

      {/* Expandable Borrower Details */}
      <button
        onClick={() => setShowBorrowerDetails(!showBorrowerDetails)}
        className="w-full flex items-center justify-center gap-1 py-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 border-t border-neutral-200 dark:border-neutral-700"
      >
        {showBorrowerDetails ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Hide borrower details
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            View borrower details
          </>
        )}
      </button>

      {showBorrowerDetails && (
        <div className="pt-4 animate-fade-in">
          {loadingProfile ? (
            <div className="text-center py-4 text-neutral-500 dark:text-neutral-400">Loading...</div>
          ) : borrowerProfile ? (
            <BorrowerRatingCard
              rating={borrowerProfile.rating?.overall || 'neutral'}
              paymentStats={borrowerProfile.paymentHistory ? {
                total: borrowerProfile.paymentHistory.totalPayments,
                onTime: borrowerProfile.paymentHistory.onTime,
                early: borrowerProfile.paymentHistory.early,
                late: borrowerProfile.paymentHistory.late,
                missed: borrowerProfile.paymentHistory.missed,
              } : undefined}
              loansCompleted={borrowerProfile.loanHistory?.totalCompleted || 0}
              memberMonths={borrowerProfile.borrower?.monthsAsMember || 0}
              isVerified={borrowerProfile.borrower?.isVerified}
            />
          ) : (
            <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm text-neutral-600 dark:text-neutral-400">
              No additional information available
            </div>
          )}
          
          {borrowerProfile?.recommendation && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${
              borrowerRating === 'great' || borrowerRating === 'good' 
                ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                : borrowerRating === 'poor' || borrowerRating === 'bad' || borrowerRating === 'worst'
                ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}>
              <strong>Recommendation:</strong> {borrowerProfile.recommendation}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="my-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <Button 
          variant="outline" 
          className="flex-1" 
          onClick={handleDecline}
          loading={isDeclining}
          disabled={isAccepting}
        >
          Decline
        </Button>
        <Button 
          className="flex-1" 
          onClick={handleAccept}
          loading={isAccepting}
          disabled={isDeclining}
        >
          Accept
        </Button>
      </div>
    </Card>
  );
}