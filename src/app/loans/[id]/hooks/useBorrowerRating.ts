'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('useBorrowerRating');

import { useEffect, useState, useCallback } from 'react';
import { Loan } from '@/types';
import { useToast } from '@/components/ui/Alert';

export function useBorrowerRating(loan: Loan | null, user: Record<string, unknown> | null, isLender: boolean) {
  const { showToast } = useToast();

  const [borrowerRatingData, setBorrowerRatingData] = useState<any>(null);
  const [loadingBorrowerRating, setLoadingBorrowerRating] = useState(false);
  const [hasVouchedForBorrower, setHasVouchedForBorrower] = useState(false);
  const [vouchingForBorrower, setVouchingForBorrower] = useState(false);
  const [showVouchModal, setShowVouchModal] = useState(false);
  const [vouchMessage, setVouchMessage] = useState('');

  const fetchBorrowerRating = useCallback(async (borrowerId: string) => {
    if (!isLender || !borrowerId) return;
    setLoadingBorrowerRating(true);
    try {
      const response = await fetch(`/api/borrower/${borrowerId}`);
      if (response.ok) {
        const data = await response.json();
        setBorrowerRatingData(data);
      }
    } catch (error) {
      log.error('Failed to fetch borrower rating:', error);
    } finally {
      setLoadingBorrowerRating(false);
    }
  }, [isLender]);

  useEffect(() => {
    if (isLender && loan?.borrower_id) {
      fetchBorrowerRating(loan.borrower_id);
    }
  }, [isLender, loan?.borrower_id, fetchBorrowerRating]);

  useEffect(() => {
    const checkExistingVouch = async () => {
      if (!isLender || !loan?.borrower_id || !user?.id) return;
      try {
        const response = await fetch(`/api/vouches?type=given`);
        if (response.ok) {
          const data = await response.json();
          const hasVouched = (data.vouches || []).some((v: any) => v.vouchee_id === loan.borrower_id);
          setHasVouchedForBorrower(hasVouched);
        }
      } catch (err) {
        log.error('Error checking existing vouch:', err);
      }
    };

    if (loan?.status === 'completed') {
      checkExistingVouch();
    }
  }, [isLender, loan?.borrower_id, loan?.status, user?.id]);

  const handleVouchForBorrower = async () => {
    if (!loan?.borrower_id || !user?.id) return;

    setVouchingForBorrower(true);
    try {
      const response = await fetch('/api/vouches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vouch',
          voucheeId: loan.borrower_id,
          vouch_type: 'character',
          relationship: 'lender',
          known_years: 1,
          message: vouchMessage || `I lent to this borrower and they successfully repaid the loan.`,
        }),
      });

      if (response.ok) {
        setHasVouchedForBorrower(true);
        setShowVouchModal(false);
        setVouchMessage('');
        showToast({
          type: 'success',
          title: 'Vouch Created!',
          message: `You've vouched for ${(loan.borrower as any)?.full_name || 'this borrower'}. This helps build their trust score.`,
        });
      } else {
        const data = await response.json();
        showToast({ type: 'error', title: 'Error', message: data.error || 'Failed to create vouch' });
      }
    } catch (error) {
      log.error('Error creating vouch:', error);
      showToast({ type: 'error', title: 'Error', message: 'Failed to create vouch' });
    } finally {
      setVouchingForBorrower(false);
    }
  };

  return {
    borrowerRatingData,
    loadingBorrowerRating,
    hasVouchedForBorrower,
    vouchingForBorrower,
    showVouchModal,
    setShowVouchModal,
    vouchMessage,
    setVouchMessage,
    handleVouchForBorrower,
  };
}
