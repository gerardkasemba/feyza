'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('useLoanDetail');

/**
 * useLoanDetail
 * ─────────────
 * Centralises all state, data-fetching, real-time subscriptions and action
 * handlers for the loan detail page. The page itself becomes a thin layout
 * component that calls this hook and distributes props to tab components.
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getLoanProgress } from '@/lib/utils';
import { Loan, PaymentScheduleItem } from '@/types';
import { usePlatformFee } from '@/components/FeeBreakdown';
import { useToast } from '@/components/ui/Alert';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TabKey =
  | 'overview'
  | 'timeline'
  | 'payments'
  | 'terms'
  | 'agreement'
  | 'reminders'
  | 'borrower-profile';

export interface TransferStatus {
  status: 'not_started' | 'pending' | 'processing' | 'completed' | 'failed';
  statusMessage: string;
  timeline: { minDays: number; maxDays: number; estimatedDate: string } | null;
  transfer: { created_at: string; status: string } | null;
}

export interface PaymentConfirmDialog {
  isOpen: boolean;
  paymentId: string | null;
  isBorrower: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useLoanDetail(loanId: string) {
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = createClient();

  // ── Core state ──────────────────────────────────────────────────────────
  const [tab, setTab] = useState<TabKey>('overview');
  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<PaymentScheduleItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Notification state ──────────────────────────────────────────────────
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [minimizedNotifications, setMinimizedNotifications] = useState<Set<string>>(new Set());

  // ── Transfer status state ───────────────────────────────────────────────
  const [transferStatus, setTransferStatus] = useState<TransferStatus | null>(null);
  const [transferStatusLoading, setTransferStatusLoading] = useState(false);
  const isFetchingTransferStatus = useRef(false);
  const lastFetchTime = useRef(0);

  // ── Funds modal state ───────────────────────────────────────────────────
  const [showFundsModal, setShowFundsModal] = useState(false);
  const [fundsSending, setFundsSending] = useState(false);
  const [fundsReference, setFundsReference] = useState('');
  const [fundsPaymentMethod, setFundsPaymentMethod] = useState<'paypal' | 'cashapp' | 'venmo'>('paypal');
  const [fundsProofFile, setFundsProofFile] = useState<File | null>(null);
  const [fundsProofPreview, setFundsProofPreview] = useState<string | null>(null);

  // ── Reminder state ──────────────────────────────────────────────────────
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [showReminderModal, setShowReminderModal] = useState(false);

  // ── Payment processing state ────────────────────────────────────────────
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [isDwollaEnabled, setIsDwollaEnabled] = useState(false);

  // ── Manual payment modal state ──────────────────────────────────────────
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false);
  const [manualPaymentId, setManualPaymentId] = useState<string | null>(null);
  const [manualPaymentMethod, setManualPaymentMethod] = useState<string>('');
  const [manualPaymentReference, setManualPaymentReference] = useState('');
  const [manualPaymentProofFile, setManualPaymentProofFile] = useState<File | null>(null);
  const [manualPaymentProofPreview, setManualPaymentProofPreview] = useState<string | null>(null);
  const [submittingManualPayment, setSubmittingManualPayment] = useState(false);

  // ── Dialog state ────────────────────────────────────────────────────────
  const [paymentConfirmDialog, setPaymentConfirmDialog] = useState<PaymentConfirmDialog>({
    isOpen: false,
    paymentId: null,
    isBorrower: false,
  });
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // ── Platform fee ────────────────────────────────────────────────────────
  const { settings: feeSettings, loading: feeLoading, calculateFee } = usePlatformFee();

  // ── Terms / agreement state ─────────────────────────────────────────────
  const [termsExpanded, setTermsExpanded] = useState(false);

  // ── Borrower rating state ───────────────────────────────────────────────
  const [borrowerRatingData, setBorrowerRatingData] = useState<any>(null);
  const [loadingBorrowerRating, setLoadingBorrowerRating] = useState(false);

  // ── Vouch state ─────────────────────────────────────────────────────────
  const [hasVouchedForBorrower, setHasVouchedForBorrower] = useState(false);
  const [vouchingForBorrower, setVouchingForBorrower] = useState(false);
  const [showVouchModal, setShowVouchModal] = useState(false);
  const [vouchMessage, setVouchMessage] = useState('');

  // ── Derived values ───────────────────────────────────────────────────────
  const isBorrower = loan?.borrower_id === user?.id;
  const isLender =
    loan?.lender_id === user?.id ||
    (loan?.business_lender && (loan.business_lender as any).user_id === user?.id);

  const progressTotal =
    loan?.total_amount && loan.total_amount > 0 ? loan.total_amount : loan?.amount || 0;
  const progress = getLoanProgress(loan?.amount_paid || 0, progressTotal);

  const otherParty = isBorrower ? loan?.lender : loan?.borrower;
  const isPersonalLoan = loan?.lender_type === 'personal';

  let otherPartyName = 'Loading...';
  if (otherParty) {
    if ('business_name' in (otherParty as any)) otherPartyName = (otherParty as any).business_name;
    else if (isPersonalLoan && (otherParty as any).username)
      otherPartyName = `~${(otherParty as any).username}`;
    else otherPartyName = (otherParty as any).full_name;
  } else if (loan && isBorrower && isPersonalLoan && (loan as any).invite_username) {
    otherPartyName = `~${(loan as any).invite_username}`;
  } else if (loan && isBorrower) {
    otherPartyName = (loan as any).invite_email || 'Pending acceptance';
  } else if (loan) {
    otherPartyName = (loan as any).borrower_name || 'Borrower';
  }

  const paidCount = schedule.filter((s) => s.is_paid).length;
  const unpaidCount = schedule.filter((s) => !s.is_paid).length;

  const hasTermsTab = !!(
    loan?.business_lender_id && (loan.business_lender as any)?.lending_terms
  );
  const hasAgreementTab = !!(
    isLender && ((loan as any)?.borrower_signed || (loan as any)?.lender_signed)
  );
  const hasRemindersTab = !!(loan?.status === 'active' && isLender && loan?.funds_sent);

  const nextPayment = useMemo(() => schedule.find((s) => !s.is_paid), [schedule]);

  // Guard: if current tab becomes invalid, fall back to overview
  useEffect(() => {
    if (tab === 'terms' && !hasTermsTab) setTab('overview');
    if (tab === 'agreement' && !hasAgreementTab) setTab('overview');
    if (tab === 'reminders' && !hasRemindersTab) setTab('overview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTermsTab, hasAgreementTab, hasRemindersTab]);

  // ── Notification helpers ─────────────────────────────────────────────────
  const dismissNotification = (type: string) => {
    const next = new Set(dismissedNotifications);
    next.add(type);
    setDismissedNotifications(next);
    localStorage.setItem(
      `loan-notifications-${loanId}`,
      JSON.stringify(Array.from(next))
    );
  };

  const toggleNotification = (type: string) => {
    const next = new Set(minimizedNotifications);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setMinimizedNotifications(next);
    localStorage.setItem(
      `loan-minimized-${loanId}`,
      JSON.stringify(Array.from(next))
    );
  };

  // ── Refetchers ───────────────────────────────────────────────────────────
  const refetchLoan = useCallback(async () => {
    if (!loanId) return;
    const { data } = await supabase
      .from('loans')
      .select(
        `
        *,
        borrower:users!borrower_id(
          *,
          payment_methods:user_payment_methods(
            id, account_identifier, account_name, is_active, is_default,
            payment_provider:payment_providers(id, name, slug)
          )
        ),
        lender:users!lender_id(*),
        business_lender:business_profiles!business_lender_id(*)
      `
      )
      .eq('id', loanId)
      .single();
    if (data) setLoan(data as Loan);
  }, [loanId, supabase]);

  const refetchSchedule = useCallback(async () => {
    if (!loanId) return;
    const { data } = await supabase
      .from('payment_schedule')
      .select('*')
      .eq('loan_id', loanId)
      .order('due_date', { ascending: true });
    if (data) setSchedule(data);
  }, [loanId, supabase]);

  // ── Borrower rating fetch ────────────────────────────────────────────────
  const fetchBorrowerRating = useCallback(
    async (borrowerId: string) => {
      if (!isLender || !borrowerId) return;
      setLoadingBorrowerRating(true);
      try {
        const res = await fetch(`/api/borrower/${borrowerId}`);
        if (res.ok) setBorrowerRatingData(await res.json());
      } catch (err) {
        log.error('Failed to fetch borrower rating:', err);
      } finally {
        setLoadingBorrowerRating(false);
      }
    },
    [isLender]
  );

  // ── Transfer status ──────────────────────────────────────────────────────
  const fetchTransferStatus = useCallback(async () => {
    if (!loanId) return;

    if (isFetchingTransferStatus.current) return;

    const now = Date.now();
    if (now - lastFetchTime.current < 10_000) return;

    if (!isDwollaEnabled) {
      if (loan?.funds_sent) {
        setTransferStatus({
          status: 'completed',
          statusMessage: (loan as any).funds_sent_method
            ? `Payment sent via ${
                (loan as any).funds_sent_method.charAt(0).toUpperCase() +
                (loan as any).funds_sent_method.slice(1)
              }`
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

    isFetchingTransferStatus.current = true;
    lastFetchTime.current = now;

    try {
      const res = await fetch(`/api/dwolla/sync-status?loan_id=${loanId}`);
      if (!res.ok) return;
      const data = await res.json();

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
        timeline = {
          minDays: Math.max(
            0,
            Math.ceil((minArrival.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24))
          ),
          maxDays: Math.max(
            0,
            Math.ceil((maxArrival.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24))
          ),
          estimatedDate: maxArrival.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      }

      const transferStatusVal = disbursement?.status || data.loan?.disbursement_status;
      let status: TransferStatus['status'] = 'not_started';
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

      if (data.loan && loan) {
        setLoan((prev) => prev ? ({
          ...prev,
          disbursement_status: data.loan.disbursement_status,
          funds_sent: data.loan.funds_sent,
        }) : null);
      }
    } catch (err) {
      log.error('Error fetching transfer status:', err);
    } finally {
      isFetchingTransferStatus.current = false;
    }
  }, [loanId, loan?.funds_sent, (loan as any)?.funds_sent_method, isDwollaEnabled]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleSendReminder = async (paymentId?: string) => {
    if (!loan) return;
    setSendingReminder(true);
    try {
      const res = await fetch(`/api/loans/${loan.id}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loan_id: loan.id, payment_id: paymentId, message: reminderMessage }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send reminder');
      }
      showToast({ type: 'success', title: 'Reminder Sent', message: 'Payment reminder sent to borrower' });
      setShowReminderModal(false);
      setReminderMessage('');
      await refetchSchedule();
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to Send', message: (err as Error).message || 'Failed to send reminder.' });
    } finally {
      setSendingReminder(false);
    }
  };

  const handleAcceptLoan = async () => {
    if (!loan) return;
    try {
      const res = await fetch(`/api/loans/${loan.id}/accept`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.redirectUrl) {
        router.push(data.redirectUrl);
      } else if (res.ok) {
        setLoan((prev) => (prev ? ({ ...prev, status: 'active' } as any) : null));
        showToast({ type: 'success', title: 'Loan Accepted', message: 'The loan has been accepted' });
        router.refresh();
      } else {
        showToast({ type: 'error', title: 'Failed', message: data.error || 'Failed to accept loan' });
      }
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Failed to accept loan. Please try again.' });
    }
  };

  const handleDeclineLoan = () => { if (loan) setShowDeclineDialog(true); };

  const executeDeclineLoan = async () => {
    if (!loan) return;
    setShowDeclineDialog(false);
    try {
      const res = await fetch(`/api/loans/${loan.id}/decline`, { method: 'POST' });
      if (res.ok) {
        setLoan((prev) => (prev ? ({ ...prev, status: 'declined' } as any) : null));
        showToast({ type: 'info', title: 'Loan Declined', message: 'The loan request has been declined' });
        setTimeout(() => router.push('/dashboard'), 500);
      } else {
        const data = await res.json();
        showToast({ type: 'error', title: 'Failed', message: data.error || 'Failed to decline loan' });
      }
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Failed to decline loan. Please try again.' });
    }
  };

  const handleCancelLoan = () => { if (loan) setShowCancelDialog(true); };

  const executeCancelLoan = async () => {
    if (!loan) return;
    setShowCancelDialog(false);
    try {
      const res = await fetch(`/api/loans/${loan.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by borrower' }),
      });
      if (res.ok) {
        showToast({ type: 'info', title: 'Request Cancelled', message: 'Your loan request has been cancelled' });
        router.push('/dashboard');
      } else {
        const data = await res.json();
        showToast({ type: 'error', title: 'Failed', message: data.error || 'Failed to cancel loan request' });
      }
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Failed to cancel loan request' });
    }
  };

  const handleProcessPayment = (paymentId: string) => {
    if (!loan || !user) return;
    setPaymentConfirmDialog({ isOpen: true, paymentId, isBorrower: loan.borrower_id === user.id });
  };

  const executeProcessPayment = async () => {
    const { paymentId, isBorrower: isBorrowerForPayment } = paymentConfirmDialog;
    if (!loan || !paymentId) return;
    setPaymentConfirmDialog({ isOpen: false, paymentId: null, isBorrower: false });
    setProcessingPayment(paymentId);
    try {
      const res = await fetch('/api/cron/auto-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId }),
      });
      const data = await res.json();
      if (res.ok) {
        const msg = isBorrowerForPayment
          ? 'Payment submitted! The transfer will complete in 1-3 business days.'
          : 'Payment processed successfully!';
        showToast({ type: 'success', title: 'Payment Successful', message: msg });
        await Promise.all([refetchSchedule(), refetchLoan()]);
      } else {
        showToast({ type: 'error', title: 'Payment Failed', message: data.error || 'Failed to process payment' });
      }
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Error', message: (err as Error).message || 'Failed to process payment' });
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleOpenManualPayment = (paymentId: string) => {
    setManualPaymentId(paymentId);
    setManualPaymentMethod('');
    setManualPaymentReference('');
    setManualPaymentProofFile(null);
    setManualPaymentProofPreview(null);
    setShowManualPaymentModal(true);
  };

  const handleManualPaymentProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setManualPaymentProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setManualPaymentProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitManualPayment = async () => {
    if (!loan || !manualPaymentId || !manualPaymentMethod || !manualPaymentProofFile) {
      showToast({ type: 'warning', title: 'Required Fields', message: 'Please select payment method and upload proof' });
      return;
    }
    setSubmittingManualPayment(true);
    try {
      const fileExt = manualPaymentProofFile.name.split('.').pop();
      const filePath = `payment-proofs/${user?.id}_${manualPaymentId}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('loan-documents').upload(filePath, manualPaymentProofFile);

      let proofUrl: string | null = null;
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('loan-documents').getPublicUrl(filePath);
        proofUrl = publicUrl;
      }

      const payment = schedule.find((p: any) => p.id === manualPaymentId);
      const feeCalc = feeSettings?.enabled && payment ? calculateFee(payment.amount) : null;

      const res = await fetch('/api/payments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: loan.id,
          paymentId: manualPaymentId,
          paymentMethod: manualPaymentMethod,
          transactionReference: manualPaymentReference || null,
          proofUrl,
          platformFee: feeCalc?.platformFee || 0,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to process payment');

      if (result.success) {
        setLoan((prev) =>
          prev
            ? {
                ...prev,
                amount_paid: result.newAmountPaid,
                amount_remaining: result.newAmountRemaining,
                status: result.isComplete ? ('completed' as any) : prev.status,
              }
            : prev
        );
      }
      showToast({ type: 'success', title: 'Payment Submitted', message: 'Your payment has been recorded.' });
      setShowManualPaymentModal(false);
      setManualPaymentId(null);
      setManualPaymentMethod('');
      setManualPaymentReference('');
      setManualPaymentProofFile(null);
      setManualPaymentProofPreview(null);
      await Promise.all([refetchLoan(), refetchSchedule()]);
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Error', message: (err as Error).message || 'Failed to submit payment' });
    } finally {
      setSubmittingManualPayment(false);
    }
  };

  const handleSendFunds = async () => {
    if (!loan) return;
    if (!fundsProofFile) {
      showToast({ type: 'warning', title: 'Proof Required', message: 'Please upload a screenshot proof of payment' });
      return;
    }
    setFundsSending(true);
    try {
      const fileExt = fundsProofFile.name.split('.').pop();
      const filePath = `payment-proofs/${loan.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('loan-documents').upload(filePath, fundsProofFile);

      let proofUrl: string | null = null;
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('loan-documents').getPublicUrl(filePath);
        proofUrl = publicUrl;
      }

      const res = await fetch(`/api/loans/${loan.id}/funds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: fundsPaymentMethod, reference: fundsReference, proof_url: proofUrl }),
      });

      if (res.ok) {
        const result = await res.json();
        setLoan({
          ...(loan as any),
          funds_sent: true,
          funds_sent_at: new Date().toISOString(),
          funds_sent_method: fundsPaymentMethod,
          status: result.status || 'active',
        } as any);
        setShowFundsModal(false);
        setFundsReference('');
        setFundsProofFile(null);
        setFundsProofPreview(null);
        showToast({ type: 'success', title: 'Funds Sent', message: 'Payment confirmation recorded successfully' });
      } else {
        const err = await res.json();
        showToast({ type: 'error', title: 'Failed', message: err.error || 'Failed to confirm funds sent' });
      }
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Failed to confirm funds sent' });
    } finally {
      setFundsSending(false);
    }
  };

  const handleVouchForBorrower = async () => {
    if (!loan?.borrower_id || !user?.id) return;
    setVouchingForBorrower(true);
    try {
      const res = await fetch('/api/vouches', {
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
      if (res.ok) {
        setHasVouchedForBorrower(true);
        setShowVouchModal(false);
        setVouchMessage('');
        showToast({
          type: 'success',
          title: 'Vouch Created!',
          message: `You've vouched for ${(loan.borrower as any)?.full_name || 'this borrower'}.`,
        });
      } else {
        const data = await res.json();
        showToast({ type: 'error', title: 'Error', message: data.error || 'Failed to create vouch' });
      }
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Failed to create vouch' });
    } finally {
      setVouchingForBorrower(false);
    }
  };

  // ── Effects ──────────────────────────────────────────────────────────────

  // Restore minimized/dismissed banners from localStorage
  useEffect(() => {
    if (!loanId) return;
    const stored = localStorage.getItem(`loan-notifications-${loanId}`);
    if (stored) setDismissedNotifications(new Set(JSON.parse(stored)));
    const storedMin = localStorage.getItem(`loan-minimized-${loanId}`);
    if (storedMin) {
      try { setMinimizedNotifications(new Set(JSON.parse(storedMin))); } catch { /* ignore */ }
    }
  }, [loanId]);

  // Initial data load
  useEffect(() => {
    const fetchData = async () => {
      const supa = createClient();
      const { data: { user: authUser } } = await supa.auth.getUser();
      if (!authUser) { router.push('/auth/signin'); return; }

      const { data: profile } = await supa.from('users').select('*').eq('id', authUser.id).single();
      setUser(profile || {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || 'User',
        user_type: authUser.user_metadata?.user_type || 'individual',
      });

      const { data: loanData, error } = await supa
        .from('loans')
        .select(`
          *,
          borrower:users!borrower_id(
            *,
            payment_methods:user_payment_methods(
              id, account_identifier, account_name, is_active, is_default,
              payment_provider:payment_providers(id, name, slug)
            )
          ),
          lender:users!lender_id(*),
          business_lender:business_profiles!business_lender_id(*)
        `)
        .eq('id', loanId)
        .single();

      if (error || !loanData) { router.push('/dashboard'); return; }

      // Access check
      let hasAccess = loanData.borrower_id === authUser.id || loanData.lender_id === authUser.id;
      if (!hasAccess && loanData.business_lender_id) {
        const { data: bp } = await supa
          .from('business_profiles')
          .select('id')
          .eq('id', loanData.business_lender_id)
          .eq('user_id', authUser.id)
          .single();
        if (bp) hasAccess = true;
      }
      if (!hasAccess) { router.push('/dashboard'); return; }

      const lenderInfo = loanData.lender || loanData.business_lender;
      setLoan({ ...(loanData as any), lender: lenderInfo });

      const { data: scheduleData } = await supa
        .from('payment_schedule')
        .select('*')
        .eq('loan_id', loanId)
        .order('due_date', { ascending: true });
      setSchedule(scheduleData || []);
      setIsLoading(false);
    };
    fetchData();
  }, [loanId, router]);

  // Fetch borrower rating when current user is lender
  useEffect(() => {
    if (isLender && loan?.borrower_id) fetchBorrowerRating(loan.borrower_id);
  }, [isLender, loan?.borrower_id, fetchBorrowerRating]);

  // Check if lender has already vouched for this borrower
  useEffect(() => {
    if (!isLender || !loan?.borrower_id || !user?.id || loan.status !== 'completed') return;
    fetch('/api/vouches?type=given')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setHasVouchedForBorrower(
            (data.vouches || []).some((v: any) => v.vouchee_id === loan.borrower_id)
          );
        }
      })
      .catch((err) => log.error('Error checking existing vouch:', err));
  }, [isLender, loan?.borrower_id, loan?.status, user?.id]);

  // Check if Dwolla (ACH) is enabled by admin
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/payment-methods?country=US&type=repayment');
        if (res.ok) {
          const data = await res.json();
          setIsDwollaEnabled((data.providers || []).some((p: any) => p.slug === 'dwolla' && p.isAutomated));
        } else {
          setIsDwollaEnabled(false);
        }
      } catch {
        setIsDwollaEnabled(false);
      }
    };
    check();
    const channel = supabase
      .channel('loan_detail_payment_providers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_providers' }, check)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  // Real-time subscriptions for loan, schedule, and transfers
  useEffect(() => {
    if (!loanId) return;
    const channels: unknown[] = [];

    const loanChannel = supabase
      .channel(`loan-detail-${loanId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'loans', filter: `id=eq.${loanId}` },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (newData.status !== oldData?.status) {
            if (newData.status === 'active') showToast({ type: 'success', title: 'Loan Active!', message: 'The loan is now active' });
            else if (newData.status === 'completed') showToast({ type: 'success', title: '🎉 Loan Completed!', message: 'Congratulations! The loan has been fully repaid' });
            else if (newData.status === 'declined') showToast({ type: 'warning', title: 'Loan Declined', message: 'The loan request was declined' });
          }
          if (newData.disbursement_status !== oldData?.disbursement_status) {
            if (newData.disbursement_status === 'completed') showToast({ type: 'success', title: 'Funds Transferred!', message: 'Funds have been successfully deposited' });
            else if (newData.disbursement_status === 'processing') showToast({ type: 'info', title: 'Transfer Processing', message: 'Funds are being transferred to your bank' });
          }
          refetchLoan();
        }
      ).subscribe();
    channels.push(loanChannel);

    const scheduleChannel = supabase
      .channel(`loan-schedule-${loanId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_schedule', filter: `loan_id=eq.${loanId}` },
        (payload) => {
          const newData = payload.new as any;
          if (payload.eventType === 'UPDATE' && newData?.is_paid && newData?.status === 'confirmed') {
            showToast({ type: 'success', title: 'Payment Confirmed!', message: 'The payment has been confirmed' });
          }
          refetchSchedule();
          refetchLoan();
        }
      ).subscribe();
    channels.push(scheduleChannel);

    const transferChannel = supabase
      .channel(`loan-transfers-${loanId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers', filter: `loan_id=eq.${loanId}` },
        (payload) => {
          const newData = payload.new as any;
          if (newData?.status === 'completed') showToast({ type: 'success', title: 'Transfer Complete!', message: 'Funds have been successfully transferred' });
          else if (newData?.status === 'failed') showToast({ type: 'error', title: 'Transfer Failed', message: 'The transfer failed. Please check details.' });
          if (!isFetchingTransferStatus.current) {
            setTransferStatusLoading(true);
            isFetchingTransferStatus.current = true;
            fetch(`/api/dwolla/sync-status?loan_id=${loanId}`)
              .then((res) => res.json())
              .then((data) => setTransferStatus(data))
              .finally(() => { setTransferStatusLoading(false); isFetchingTransferStatus.current = false; });
          }
        }
      ).subscribe();
    channels.push(transferChannel);

    return () => { channels.forEach((ch: any) => supabase.removeChannel(ch)); };
  }, [loanId, supabase, refetchLoan, refetchSchedule, showToast]);

  // Transfer status polling
  useEffect(() => {
    if (!loan) return;
    if (!isDwollaEnabled) {
      if (loan.funds_sent) {
        setTransferStatus({
          status: 'completed',
          statusMessage: (loan as any).funds_sent_method
            ? `Payment sent via ${(loan as any).funds_sent_method.charAt(0).toUpperCase() + (loan as any).funds_sent_method.slice(1)}`
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
    const shouldPoll = loan.status === 'active' && isDwollaEnabled && disbursementStatus === 'processing' && !loan.funds_sent;
    if (shouldPoll || disbursementStatus === 'processing') fetchTransferStatus();
    if (shouldPoll) {
      const interval = setInterval(fetchTransferStatus, 60_000);
      return () => clearInterval(interval);
    }
  }, [loan?.id, loan?.status, (loan as any)?.disbursement_status, isDwollaEnabled, loan?.funds_sent]);

  // ─── Return everything the page and tab components need ─────────────────
  return {
    // Core data
    loan, setLoan,
    schedule, setSchedule,
    user,
    isLoading,

    // Tab navigation
    tab, setTab,

    // Derived flags
    isBorrower, isLender,
    isPersonalLoan,
    progress, progressTotal,
    otherParty, otherPartyName,
    paidCount, unpaidCount,
    hasTermsTab, hasAgreementTab, hasRemindersTab,
    nextPayment,

    // Transfer status
    transferStatus, transferStatusLoading,
    fetchTransferStatus,

    // Notification helpers
    dismissedNotifications, minimizedNotifications,
    dismissNotification, toggleNotification,

    // Platform fee
    feeSettings, feeLoading, calculateFee,

    // Terms / agreement
    termsExpanded, setTermsExpanded,

    // Borrower rating
    borrowerRatingData, loadingBorrowerRating,

    // Vouch
    hasVouchedForBorrower,
    vouchingForBorrower,
    showVouchModal, setShowVouchModal,
    vouchMessage, setVouchMessage,
    handleVouchForBorrower,

    // Funds modal
    showFundsModal, setShowFundsModal,
    fundsSending,
    fundsReference, setFundsReference,
    fundsPaymentMethod, setFundsPaymentMethod,
    fundsProofFile, setFundsProofFile,
    fundsProofPreview, setFundsProofPreview,
    handleSendFunds,

    // Reminder modal
    showReminderModal, setShowReminderModal,
    sendingReminder,
    reminderMessage, setReminderMessage,
    handleSendReminder,

    // Payment processing
    processingPayment,
    isDwollaEnabled,
    paymentConfirmDialog, setPaymentConfirmDialog,
    handleProcessPayment,
    executeProcessPayment,

    // Manual payment modal
    showManualPaymentModal, setShowManualPaymentModal,
    manualPaymentId,
    manualPaymentMethod, setManualPaymentMethod,
    manualPaymentReference, setManualPaymentReference,
    manualPaymentProofFile,
    manualPaymentProofPreview,
    submittingManualPayment,
    handleOpenManualPayment,
    handleManualPaymentProofChange,
    handleSubmitManualPayment,

    // Loan actions
    showDeclineDialog, setShowDeclineDialog,
    showCancelDialog, setShowCancelDialog,
    handleAcceptLoan,
    handleDeclineLoan, executeDeclineLoan,
    handleCancelLoan, executeCancelLoan,

    // Refetchers
    refetchLoan, refetchSchedule,
  };
}
