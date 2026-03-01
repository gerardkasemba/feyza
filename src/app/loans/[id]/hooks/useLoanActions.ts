'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('useLoanActions');

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loan, PaymentScheduleItem, UserProfile } from '@/types';
import { useToast } from '@/components/ui/Alert';

interface UseLoanActionsParams {
  loan: Loan | null;
  user: UserProfile | null;
  schedule: PaymentScheduleItem[];
  setLoan: (updater: ((prev: Loan | null) => Loan | null) | Loan | null) => void;
  setSchedule: (data: PaymentScheduleItem[]) => void;
  refetchLoan: () => Promise<void>;
  refetchSchedule: () => Promise<void>;
}

export function useLoanActions({
  loan,
  user,
  schedule,
  setLoan,
  setSchedule,
  refetchLoan,
  refetchSchedule,
}: UseLoanActionsParams) {
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = createClient();

  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [paymentConfirmDialog, setPaymentConfirmDialog] = useState<{
    isOpen: boolean;
    paymentId: string | null;
    isBorrower: boolean;
  }>({ isOpen: false, paymentId: null, isBorrower: false });

  const handleAcceptLoan = async () => {
    if (!loan) return;

    // Block acceptance if lender has no payment method configured
    const lenderUser = user as any;
    const hasBank = lenderUser?.bank_connected;
    const hasManual = lenderUser?.paypal_email || lenderUser?.cashapp_username ||
                      lenderUser?.venmo_username || lenderUser?.zelle_email || lenderUser?.zelle_phone;
    const hasFavorite = lenderUser?.preferred_payment_method;

    if (!hasBank && !hasManual && !hasFavorite) {
      showToast({
        type: 'error',
        title: 'Payment Method Required',
        message: 'You need to connect a payment method before accepting a loan. Go to Settings → Payment Methods.',
      });
      router.push('/settings?tab=payment');
      return;
    }

    try {
      const response = await fetch(`/api/loans/${loan.id}/accept`, { method: 'POST' });
      const data = await response.json();

      if (response.ok && data.redirectUrl) {
        router.push(data.redirectUrl);
      } else if (response.ok) {
        setLoan((prev: Loan | null) => prev ? { ...prev, status: 'active' } : null);
        showToast({ type: 'success', title: 'Loan Accepted', message: 'The loan has been accepted successfully' });
        router.refresh();
      } else {
        showToast({ type: 'error', title: 'Failed', message: data.error || 'Failed to accept loan' });
      }
    } catch (error) {
      log.error('Error accepting loan:', error);
      showToast({ type: 'error', title: 'Error', message: 'Failed to accept loan. Please try again.' });
    }
  };

  const handleDeclineLoan = () => {
    if (!loan) return;
    setShowDeclineDialog(true);
  };

  const executeDeclineLoan = async () => {
    if (!loan) return;
    setShowDeclineDialog(false);
    try {
      const response = await fetch(`/api/loans/${loan.id}/decline`, { method: 'POST' });
      if (response.ok) {
        setLoan((prev: Loan | null) => prev ? { ...prev, status: 'declined' } : null);
        showToast({ type: 'info', title: 'Loan Declined', message: 'The loan request has been declined' });
        setTimeout(() => router.push('/dashboard'), 500);
      } else {
        const data = await response.json();
        showToast({ type: 'error', title: 'Failed', message: data.error || 'Failed to decline loan' });
      }
    } catch (error) {
      log.error('Error declining loan:', error);
      showToast({ type: 'error', title: 'Error', message: 'Failed to decline loan. Please try again.' });
    }
  };

  const handleCancelLoan = () => {
    if (!loan) return;
    setShowCancelDialog(true);
  };

  const executeCancelLoan = async () => {
    if (!loan) return;
    setShowCancelDialog(false);
    try {
      const response = await fetch(`/api/loans/${loan.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by borrower' }),
      });
      if (response.ok) {
        showToast({ type: 'info', title: 'Request Cancelled', message: 'Your loan request has been cancelled' });
        router.push('/dashboard');
      } else {
        const data = await response.json();
        showToast({ type: 'error', title: 'Failed', message: data.error || 'Failed to cancel loan request' });
      }
    } catch (error) {
      log.error('Error cancelling loan:', error);
      showToast({ type: 'error', title: 'Error', message: 'Failed to cancel loan request' });
    }
  };

  const handleProcessPayment = (paymentId: string) => {
    if (!loan || !user) return;
    setPaymentConfirmDialog({
      isOpen: true,
      paymentId,
      isBorrower: loan.borrower_id === user.id,
    });
  };

  const executeProcessPayment = async () => {
    const { paymentId, isBorrower } = paymentConfirmDialog;
    if (!loan || !paymentId) return;

    setPaymentConfirmDialog({ isOpen: false, paymentId: null, isBorrower: false });
    setProcessingPayment(paymentId);

    try {
      const response = await fetch('/api/cron/auto-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId }),
      });
      const data = await response.json();

      if (response.ok) {
        const msg = isBorrower
          ? 'Payment submitted! The transfer will complete in 1-3 business days.'
          : 'Payment processed successfully!';
        showToast({ type: 'success', title: 'Payment Successful', message: msg });

        const { data: scheduleData } = await supabase
          .from('payment_schedule')
          .select('*')
          .eq('loan_id', loan.id)
          .order('due_date', { ascending: true });
        setSchedule(scheduleData || []);

        const { data: loanData } = await supabase.from('loans').select('*').eq('id', loan.id).single();
        if (loanData) setLoan((prev: Loan | null) => ({ ...prev, ...loanData }));
      } else {
        showToast({ type: 'error', title: 'Payment Failed', message: data.error || 'Failed to process payment' });
      }
    } catch (error: unknown) {
      log.error('Error processing payment:', error);
      showToast({ type: 'error', title: 'Error', message: (error as Error).message || 'Failed to process payment' });
    } finally {
      setProcessingPayment(null);
    }
  };

  return {
    processingPayment,
    showDeclineDialog,
    setShowDeclineDialog,
    showCancelDialog,
    setShowCancelDialog,
    paymentConfirmDialog,
    setPaymentConfirmDialog,
    handleAcceptLoan,
    handleDeclineLoan,
    executeDeclineLoan,
    handleCancelLoan,
    executeCancelLoan,
    handleProcessPayment,
    executeProcessPayment,
  };
}
