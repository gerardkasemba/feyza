'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('useTransferStatus');

const FUNDS_METHOD_LABELS: Record<string, string> = {
  paypal: 'PayPal',
  cashapp: 'Cash App',
  venmo: 'Venmo',
  zelle: 'Zelle',
  manual: 'manual',
  ach: 'ACH',
};

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loan } from '@/types';

export type TransferStatus = {
  status: 'not_started' | 'pending' | 'processing' | 'completed' | 'failed';
  statusMessage: string;
  timeline: { minDays: number; maxDays: number; estimatedDate: string } | null;
  transfer: { created_at: string; status: string } | null;
} | null;

export function useTransferStatus(loanId: string, loan: Loan | null, isDwollaEnabled: boolean) {
  const supabase = createClient();
  const [transferStatus, setTransferStatus] = useState<TransferStatus>(null);
  const [transferStatusLoading, setTransferStatusLoading] = useState(false);
  const isFetching = useRef(false);
  const lastFetchTime = useRef(0);

  const fetchTransferStatus = useCallback(async () => {
    if (!loanId) return;
    if (isFetching.current) return;

    const now = Date.now();
    if (now - lastFetchTime.current < 10000) return;

    // For manual payments, derive status from funds_sent flag
    if (!isDwollaEnabled) {
      if (loan?.funds_sent) {
        setTransferStatus({
          status: 'completed',
          statusMessage: (loan as any).funds_sent_method
            ? `Payment sent via ${FUNDS_METHOD_LABELS[(loan as any).funds_sent_method] || (loan as any).funds_sent_method}`
            : 'Payment has been sent',
          timeline: null,
          transfer: null,
        });
      } else {
        setTransferStatus({
          status: 'not_started',
          statusMessage: 'Waiting for lender to send payment',
          timeline: null,
          transfer: null,
        });
      }
      return;
    }

    isFetching.current = true;
    lastFetchTime.current = now;
    setTransferStatusLoading(true);

    try {
      const response = await fetch(`/api/dwolla/sync-status?loan_id=${loanId}`);
      if (!response.ok) return;
      const data = await response.json();

      const disbursement = data.transfers?.find((t: any) => t.type === 'disbursement');

      if (!disbursement && !data.loan?.disbursement_status) {
        setTransferStatus({
          status: 'not_started',
          statusMessage: 'Waiting for lender to initiate transfer',
          timeline: null,
          transfer: null,
        });
        return;
      }

      let timeline = null;
      if (disbursement?.created_at) {
        const createdDate = new Date(disbursement.created_at);
        const minArrival = new Date(createdDate);
        minArrival.setDate(minArrival.getDate() + 1);
        const maxArrival = new Date(createdDate);
        maxArrival.setDate(maxArrival.getDate() + 3);

        const nowDate = new Date();
        const minDaysLeft = Math.max(0, Math.ceil((minArrival.getTime() - nowDate.getTime()) / 86400000));
        const maxDaysLeft = Math.max(0, Math.ceil((maxArrival.getTime() - nowDate.getTime()) / 86400000));

        timeline = {
          minDays: minDaysLeft,
          maxDays: maxDaysLeft,
          estimatedDate: maxArrival.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      }

      const transferStatusVal = disbursement?.status || data.loan?.disbursement_status;
      let status: 'not_started' | 'pending' | 'processing' | 'completed' | 'failed' = 'not_started';
      let statusMessage = '';

      if (transferStatusVal === 'processed' || transferStatusVal === 'completed') {
        status = 'completed';
        statusMessage = 'Funds have been deposited to your bank account';
      } else if (
        transferStatusVal === 'pending' ||
        transferStatusVal === 'processing' ||
        data.loan?.disbursement_status === 'processing'
      ) {
        status = 'processing';
        statusMessage = timeline
          ? `Funds are being transferred via ACH. Expected arrival: ${timeline.estimatedDate}`
          : 'Funds are being transferred via ACH (1-3 business days)';
      } else if (transferStatusVal === 'failed') {
        status = 'failed';
        statusMessage = 'Transfer failed. The lender has been notified.';
      } else if (data.loan?.funds_sent && !disbursement) {
        status = 'processing';
        statusMessage = 'Funds are being transferred via ACH (1-3 business days)';
      } else {
        status = 'not_started';
        statusMessage = 'Waiting for lender to initiate transfer';
      }

      setTransferStatus({ status, statusMessage, timeline, transfer: disbursement || null });
    } catch (error) {
      log.error('[useTransferStatus] Error:', error);
    } finally {
      isFetching.current = false;
      setTransferStatusLoading(false);
    }
  }, [loanId, loan?.funds_sent, (loan as any)?.funds_sent_method, isDwollaEnabled]);

  // Realtime transfer updates
  useEffect(() => {
    if (!loanId) return;
    const supabase2 = createClient();

    const channel = supabase2
      .channel(`loan-transfers-${loanId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transfers', filter: `loan_id=eq.${loanId}` },
        () => {
          if (!isFetching.current) {
            fetchTransferStatus();
          }
        }
      )
      .subscribe();

    return () => { supabase2.removeChannel(channel); };
  }, [loanId, fetchTransferStatus]);

  // Polling when disbursement is in progress
  useEffect(() => {
    if (!loan) return;

    if (!isDwollaEnabled) {
      if (loan.funds_sent) {
        setTransferStatus({
          status: 'completed',
          statusMessage: (loan as any).funds_sent_method
            ? `Payment sent via ${FUNDS_METHOD_LABELS[(loan as any).funds_sent_method] || (loan as any).funds_sent_method}`
            : 'Payment has been sent',
          timeline: null,
          transfer: null,
        });
      } else {
        setTransferStatus(null);
      }
      return;
    }

    const disbursementStatus = (loan as any).disbursement_status;
    const shouldPoll =
      loan.status === 'active' &&
      isDwollaEnabled &&
      disbursementStatus === 'processing' &&
      !loan.funds_sent;

    if (shouldPoll || disbursementStatus === 'processing') {
      fetchTransferStatus();
    }

    if (shouldPoll) {
      const interval = setInterval(fetchTransferStatus, 60000);
      return () => clearInterval(interval);
    }
  }, [loan?.id, loan?.status, (loan as any)?.disbursement_status, isDwollaEnabled, loan?.funds_sent]);

  return { transferStatus, transferStatusLoading, fetchTransferStatus };
}
