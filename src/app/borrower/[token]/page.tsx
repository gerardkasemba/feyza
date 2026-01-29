'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  Button,
  Progress,
  Badge,
  UpdateNotification,
  ConfirmDialog,
} from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Alert';
import { downloadICalFile } from '@/lib/calendar';
import { FeeBreakdown, usePlatformFee } from '@/components/FeeBreakdown';
import { createClient } from '@/lib/supabase/client';
import { Footer, Navbar } from '@/components/layout';
import { useGuestSession } from '@/hooks/useGuestSession';

import {
  ArrowLeft,
  ArrowDownLeft,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  User,
  Building,
  Send,
  Shield,
  Download,
  Banknote,
  Loader2,
  PartyPopper,
  BellRing,
  Timer,
  AlertTriangle,
  CheckCheck,
  Share2,
  Copy,
  MessageCircle,
  Mail,
  RefreshCw,
  X,
  LogOut,
  ExternalLink,
  LayoutDashboard,
  ListChecks,
  Activity,
  HelpCircle,
} from 'lucide-react';
import { FaRegCalendarCheck, FaRegCalendarTimes, FaRegLightbulb } from 'react-icons/fa';
import { GiReceiveMoney } from 'react-icons/gi';

interface LoanData {
  id: string;
  amount: number;
  amount_paid: number;
  amount_remaining: number;
  currency: string;
  interest_rate: number;
  interest_type: string;
  total_interest: number;
  total_amount: number;
  repayment_amount: number;
  status: string;
  purpose?: string;
  start_date: string;
  repayment_frequency: string;
  total_installments: number;
  funds_sent: boolean;
  lender: { full_name: string; email?: string } | null;
  business_lender: { business_name: string } | null;

  lender_name?: string;
  lender_bank_connected?: boolean;
  lender_bank_name?: string;

  disbursement_status?: string;
  disbursed_at?: string;
  auto_pay_enabled?: boolean;
  borrower_bank_connected?: boolean;
  borrower_bank_name?: string;
  borrower_bank_account_mask?: string;

  schedule: Array<{
    id: string;
    due_date: string;
    amount: number;
    principal_amount?: number;
    interest_amount?: number;
    is_paid: boolean;
    status?: string;
    payment_id?: string;
    paid_at?: string;
  }>;

  transfers?: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    dwolla_transfer_id?: string;
    created_at: string;
    completed_at?: string;
    error_message?: string;
    platform_fee?: number;
    net_amount?: number;
    gross_amount?: number;
    fee_type?: string;
  }>;
}

interface LoanRequestData {
  id: string;
  amount: number;
  currency: string;
  purpose: string;
  description?: string;
  borrower_name: string;
  status: string;
  created_at: string;
  proposed_frequency?: string;
  proposed_installments?: number;
  accepted_by_name?: string;
  accepted_at?: string;
}

type LoanTab = 'overview' | 'payments' | 'activity' | 'help';
type RequestTab = 'status' | 'share' | 'next' | 'details';

function Shell({
  title,
  subtitle,
  backHref = '/',
  backLabel = 'Back to Feyza',
  live = false,
  onNotMe,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  live?: boolean;
  onNotMe?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Navbar />
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link
              href={backHref}
              className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">{backLabel}</span>
            </Link>
            {onNotMe && (
              <button
                onClick={onNotMe}
                className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Not me
              </button>
            )}
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{title}</h1>
              {subtitle ? <p className="text-neutral-600 dark:text-neutral-400">{subtitle}</p> : null}
            </div>

            {live ? (
              <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 mt-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>

      <Footer />
    </div>
  );
}

function MobileTabsBar({
  value,
  onValueChange,
  items,
}: {
  value: string;
  onValueChange: (v: string) => void;
  items: Array<{ value: string; label: string; icon: React.ReactNode }>;
}) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-neutral-950/90 border-t border-neutral-200 dark:border-neutral-800 backdrop-blur">
      <div className="max-w-7xl mx-auto px-2">
        <div className="grid grid-cols-4 gap-1 py-2">
          {items.map((it) => {
            const active = value === it.value;
            return (
              <button
                key={it.value}
                onClick={() => onValueChange(it.value)}
                className={[
                  'flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium',
                  active
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900',
                ].join(' ')}
              >
                <span className={active ? 'text-primary-600 dark:text-primary-400' : ''}>{it.icon}</span>
                <span className="leading-none">{it.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Create supabase client outside component to prevent recreation
const supabaseClient = createClient();

export default function GuestBorrowerPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { showToast } = useToast();

  // Guest session management
  const { session, updateSession, clearSession, getOtherSessions, isLoaded: sessionLoaded } = useGuestSession(token, 'borrower');

  // ============ ALL STATE HOOKS ============
  const [loan, setLoan] = useState<LoanData | null>(null);
  const [loanRequest, setLoanRequest] = useState<LoanRequestData | null>(null);
  const [dataType, setDataType] = useState<'loan' | 'request' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [copied, setCopied] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  const [paymentConfirmDialog, setPaymentConfirmDialog] = useState<{
    isOpen: boolean;
    paymentId: string | null;
  }>({ isOpen: false, paymentId: null });

  const [showNotMeDialog, setShowNotMeDialog] = useState(false);

  const [loanTab, setLoanTab] = useState<LoanTab>('overview');
  const [requestTab, setRequestTab] = useState<RequestTab>('status');

  // ============ ALL REFS ============
  const lastRefreshRef = useRef<number>(Date.now());
  const subscriptionsSetupRef = useRef(false);

  // ============ ALL CUSTOM HOOKS ============
  const { settings: feeSettings, loading: feeLoading, calculateFee } = usePlatformFee();

  // Get other borrower sessions for "Your other loans" section
  const otherBorrowerSessions = useMemo(() => getOtherSessions('borrower'), [getOtherSessions]);

  // Handle "Not me" action
  const handleNotMe = useCallback(() => {
    clearSession();
    router.push('/');
  }, [clearSession, router]);

  // ============ ALL CALLBACKS ============
  const fetchLoan = useCallback(async () => {
    try {
      const response = await fetch(`/api/guest-borrower/${token}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to load loan');

      if (data.type === 'loan' && data.loan) {
        setLoan(data.loan);
        setLoanRequest(null);
        setDataType('loan');
        return data.loan;
      }

      if (data.type === 'request' && data.loanRequest) {
        setLoanRequest(data.loanRequest);
        setLoan(null);
        setDataType('request');
        return data.loanRequest;
      }

      throw new Error('Invalid response from server');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const refreshData = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current > 2000) {
      lastRefreshRef.current = now;
      fetchLoan();
    }
  }, [fetchLoan]);

  const handleCopy = useCallback((shareUrl: string) => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handlePayNow = useCallback((paymentId: string) => {
    if (!loan) return;
    setPaymentConfirmDialog({ isOpen: true, paymentId });
  }, [loan]);

  const executePayment = useCallback(async () => {
    const { paymentId } = paymentConfirmDialog;
    if (!loan || !paymentId) return;

    setPaymentConfirmDialog({ isOpen: false, paymentId: null });
    setProcessingPayment(paymentId);

    try {
      const response = await fetch('/api/cron/auto-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast({ type: 'success', title: 'Payment Submitted', message: 'The transfer will complete in 1-3 business days.' });
        await fetchLoan();
      } else {
        showToast({ type: 'error', title: 'Payment Failed', message: data.error || 'Failed to process payment' });
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to process payment';
      showToast({ type: 'error', title: 'Error', message: errorMessage });
    } finally {
      setProcessingPayment(null);
    }
  }, [paymentConfirmDialog, loan, showToast, fetchLoan]);

  // ============ ALL EFFECTS ============
  
  // Update session when loan data changes
  useEffect(() => {
    if (loan && sessionLoaded) {
      updateSession({
        name: loan.lender?.full_name || loan.business_lender?.business_name || loan.lender_name,
        loanId: loan.id,
      });
    } else if (loanRequest && sessionLoaded) {
      updateSession({
        name: loanRequest.borrower_name,
        loanId: loanRequest.id,
      });
    }
  }, [loan?.id, loanRequest?.id, sessionLoaded]);
  useEffect(() => {
    if (token) fetchLoan();
  }, [token, fetchLoan]);

  // Polling fallback
  useEffect(() => {
    if (!loan?.id) return;

    const hasPendingTransfers = loan.transfers?.some(
      (t) => t.status === 'pending' || t.status === 'processing'
    );

    const shouldPoll =
      loan.status === 'pending' ||
      loan.status === 'pending_signature' ||
      loan.status === 'pending_funds' ||
      loan.disbursement_status === 'pending' ||
      loan.disbursement_status === 'processing' ||
      hasPendingTransfers;

    if (!shouldPoll) return;

    const pollInterval = hasPendingTransfers ? 10000 : 30000;
    const interval = setInterval(() => fetchLoan(), pollInterval);
    return () => clearInterval(interval);
  }, [loan?.id, loan?.status, loan?.disbursement_status, loan?.transfers, fetchLoan]);

  // Real-time subscriptions - only setup once per loan
  useEffect(() => {
    if (!loan?.id || subscriptionsSetupRef.current) return;

    subscriptionsSetupRef.current = true;
    const channels: ReturnType<typeof supabaseClient.channel>[] = [];

    const showUpdate = (message: string, toastType?: 'success' | 'info' | 'warning') => {
      setUpdateMessage(message);
      setShowUpdateNotification(true);
      setTimeout(() => setShowUpdateNotification(false), 5000);

      if (toastType) {
        showToast({
          type: toastType,
          title:
            toastType === 'success' ? 'Great news!' : toastType === 'warning' ? 'Attention' : 'Update',
          message: message.replace(/^[^\w]+/, ''),
          duration: 6000,
        });
      }
    };

    const currentLoanId = loan.id;
    const currentStatus = loan.status;
    const currentDisbursementStatus = loan.disbursement_status;

    const loanChannel = supabaseClient
      .channel(`borrower-loan-${currentLoanId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans', filter: `id=eq.${currentLoanId}` }, (payload) => {
        const newData = payload.new as Record<string, unknown>;

        if (newData?.status !== currentStatus) {
          if (newData?.status === 'active') showUpdate('🎉 Your loan is now active!', 'success');
          if (newData?.status === 'completed') showUpdate('✅ Congratulations! Your loan is fully paid off!', 'success');
        }

        if (newData?.disbursement_status === 'completed' && currentDisbursementStatus !== 'completed') {
          showUpdate('💰 Funds have been deposited to your bank account!', 'success');
        }

        refreshData();
      })
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));
    channels.push(loanChannel);

    const scheduleChannel = supabaseClient
      .channel(`borrower-schedule-${currentLoanId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_schedule', filter: `loan_id=eq.${currentLoanId}` },
        (payload) => {
          const newData = payload.new as Record<string, unknown>;
          if (payload.eventType === 'UPDATE' && newData?.is_paid && newData?.status === 'confirmed') {
            showUpdate('✅ Payment confirmed by lender!', 'success');
          }
          refreshData();
        }
      )
      .subscribe();
    channels.push(scheduleChannel);

    const transferChannel = supabaseClient
      .channel(`borrower-transfers-${currentLoanId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers', filter: `loan_id=eq.${currentLoanId}` }, (payload) => {
        const newData = payload.new as Record<string, unknown>;

        if (newData?.status === 'completed') {
          if (newData?.type === 'disbursement') showUpdate('💰 Loan funds are being transferred to your bank!', 'success');
          if (newData?.type === 'repayment') showUpdate('✅ Your payment has been processed!', 'success');
        } else if (newData?.status === 'failed') {
          showUpdate('⚠️ Transfer failed. Please check your bank details.', 'warning');
        }

        refreshData();
      })
      .subscribe();
    channels.push(transferChannel);

    return () => {
      subscriptionsSetupRef.current = false;
      channels.forEach((ch) => supabaseClient.removeChannel(ch));
    };
  }, [loan?.id]); // Only depend on loan.id

  // ============ ALL MEMOIZED VALUES ============
  const lenderName = useMemo(() => {
    if (!loan) return 'Your Lender';
    return loan.lender?.full_name || loan.business_lender?.business_name || loan.lender_name || 'Your Lender';
  }, [loan]);

  const progress = useMemo(() => {
    if (!loan?.total_amount) return 0;
    return ((loan.amount_paid || 0) / loan.total_amount) * 100;
  }, [loan?.total_amount, loan?.amount_paid]);

  const nextPayment = useMemo(() => {
    return loan?.schedule?.find((p) => !p.is_paid) || null;
  }, [loan?.schedule]);

  const unpaidCount = useMemo(() => {
    return loan?.schedule?.filter((s) => !s.is_paid).length || 0;
  }, [loan?.schedule]);

  const shouldShowMakePayment = useMemo(() => {
    return (
      loan?.status === 'active' &&
      loan?.disbursement_status === 'completed' &&
      loan?.borrower_bank_connected &&
      loan?.schedule?.some((s) => !s.is_paid)
    );
  }, [loan?.status, loan?.disbursement_status, loan?.borrower_bank_connected, loan?.schedule]);

  const statusCards = useMemo(() => {
    if (!loan) return null;

    return (
      <>
        {loan.status === 'pending' && !loan.lender && !loan.business_lender && !loan.lender_name ? (
          <Card className="bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-500" />
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-300">Waiting for a Lender</h3>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Your loan request is pending. Share your request link with friends or family who might be able to help!
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        {loan.status === 'pending' && (loan.lender || loan.business_lender || loan.lender_name) ? (
          <Card className="bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-500" />
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-300">Lender Setting Up Terms</h3>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {lenderName} is reviewing your request and setting up the loan terms.
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        {loan.status === 'active' && loan.disbursement_status === 'processing' ? (
          <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <Send className="w-6 h-6 text-blue-600 dark:text-blue-500" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <GiReceiveMoney className="w-5 h-5" />
                  Funds on the Way!
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  {formatCurrency(loan.amount, loan.currency)} is being transferred to your bank. Expected arrival: 1-3 business days.
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Fee Information Banner */}
        {loan.status === 'active' && feeSettings?.enabled && !feeLoading && (
          <Card className="bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-neutral-500 dark:text-neutral-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-neutral-800 dark:text-neutral-200">Platform Fee Information</h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  A platform fee of {feeSettings.type === 'fixed' 
                    ? formatCurrency(feeSettings.fixed_amount, loan.currency)
                    : feeSettings.type === 'combined'
                    ? `${feeSettings.percentage}% + ${formatCurrency(feeSettings.fixed_amount, loan.currency)}`
                    : `${feeSettings.percentage}%`} is applied to each payment. 
                  The lender receives the net amount after fees.
                  {feeSettings.min_fee > 0 && ` Minimum fee: ${formatCurrency(feeSettings.min_fee, loan.currency)}.`}
                </p>
              </div>
            </div>
          </Card>
        )}

        {loan.status === 'completed' ? (
          <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <PartyPopper className="w-6 h-6 text-green-600 dark:text-green-500" />
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-300">Loan Paid Off!</h3>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Congratulations! You've successfully repaid this loan in full.
                </p>
              </div>
            </div>
          </Card>
        ) : null}
      </>
    );
  }, [loan, lenderName]);

  const mobileLoanItems = useMemo(() => [
    { value: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { value: 'payments', label: 'Payments', icon: <ListChecks className="w-5 h-5" /> },
    { value: 'activity', label: 'Activity', icon: <Activity className="w-5 h-5" /> },
    { value: 'help', label: 'Help', icon: <HelpCircle className="w-5 h-5" /> },
  ], []);

  const mobileRequestItems = useMemo(() => [
    { value: 'status', label: 'Status', icon: <LayoutDashboard className="w-5 h-5" /> },
    { value: 'share', label: 'Share', icon: <Share2 className="w-5 h-5" /> },
    { value: 'next', label: 'Next', icon: <ListChecks className="w-5 h-5" /> },
    { value: 'details', label: 'Details', icon: <HelpCircle className="w-5 h-5" /> },
  ], []);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !loanRequest) return '';
    return `${window.location.origin}/loan-request/${loanRequest.id}`;
  }, [loanRequest]);

  // ============ EARLY RETURNS (after all hooks) ============

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500" />
      </div>
    );
  }

  // Error (no data)
  if (error && !loan && !loanRequest) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
            {error === 'Invalid or expired access link' ? 'Link Not Found' : 'Access Error'}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            {error === 'Invalid or expired access link'
              ? "We couldn't find a loan associated with this link. Please check your email for the correct link or request a new one."
              : error || 'There was an issue accessing your loan.'}
          </p>
          <div className="space-y-3">
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Link href="/guest-borrower/access">
              <Button variant="outline" className="w-full">
                Request New Access Link
              </Button>
            </Link>
            <Link href="/" className="block">
              <Button variant="ghost" className="w-full text-neutral-500">
                Go to Homepage
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // ========= REQUEST VIEW (TABBED + MOBILE APP NAV) =========
  if (dataType === 'request' && loanRequest) {
    return (
      <>
        <Shell title="Your Loan Request" subtitle="Track your request status" live={isConnected} onNotMe={() => setShowNotMeDialog(true)}>
          {/* Desktop Tabs */}
          <div className="hidden md:block mb-6">
            <div className="flex border-b border-neutral-200 dark:border-neutral-700">
              {mobileRequestItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setRequestTab(item.value as RequestTab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    requestTab === item.value
                      ? 'border-primary-600 text-primary-600 dark:border-primary-500 dark:text-primary-500'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* STATUS */}
            {requestTab === 'status' && (
              <>
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center">
                      <Clock className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-amber-900 dark:text-amber-200">
                        {loanRequest.status === 'pending'
                          ? 'Waiting for a Lender'
                          : loanRequest.status === 'accepted'
                          ? 'Request Accepted!'
                          : loanRequest.status}
                      </h2>
                      <p className="text-amber-700 dark:text-amber-300">
                        {loanRequest.status === 'pending'
                          ? 'Share your request link with someone who can help'
                          : loanRequest.status === 'accepted'
                          ? `${loanRequest.accepted_by_name} is setting up your loan terms`
                          : 'Your request status has been updated'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/60 dark:bg-neutral-800/60 rounded-xl p-4 text-center">
                      <p className="text-sm text-amber-700 dark:text-amber-300">Amount Requested</p>
                      <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                        {formatCurrency(loanRequest.amount, loanRequest.currency)}
                      </p>
                    </div>
                    <div className="bg-white/60 dark:bg-neutral-800/60 rounded-xl p-4 text-center">
                      <p className="text-sm text-amber-700 dark:text-amber-300">Purpose</p>
                      <p className="text-lg font-semibold text-amber-900 dark:text-amber-100 capitalize">
                        {loanRequest.purpose}
                      </p>
                    </div>
                  </div>

                  {loanRequest.proposed_frequency && (
                    <div className="text-sm text-amber-700 dark:text-amber-300">
                      <span className="font-medium">Proposed:</span> {loanRequest.proposed_installments}{' '}
                      {loanRequest.proposed_frequency} payment{loanRequest.proposed_installments !== 1 ? 's' : ''}
                    </div>
                  )}
                </Card>

                {loanRequest.status === 'pending' ? (
                  <Card>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white">Quick Share</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Share your link so someone can accept it.
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => setRequestTab('share')}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Open Share
                      </Button>
                    </div>
                  </Card>
                ) : null}
              </>
            )}

            {/* SHARE */}
            {requestTab === 'share' && (
              <>
                {loanRequest.status !== 'pending' ? (
                  <Card className="bg-neutral-100 dark:bg-neutral-800/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-blue-700 dark:text-blue-300" />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white">Share no longer needed</p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Your request has been accepted. The lender is finalizing the terms.
                        </p>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card>
                    <div className="flex items-center gap-2 mb-4">
                      <Share2 className="w-5 h-5 text-primary-600" />
                      <h3 className="font-semibold text-neutral-900 dark:text-white">Share Your Request</h3>
                    </div>

                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                      Your loan won't be funded until someone accepts it. Share this link with friends or family:
                    </p>

                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-700 dark:text-neutral-300"
                      />
                      <Button size="sm" variant="outline" onClick={() => handleCopy(shareUrl)}>
                        {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `Hey! I need a small loan and was hoping you might be able to help. Here's my request: ${shareUrl}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </a>
                      <a
                        href={`mailto:?subject=Can you help me with a loan?&body=Hey,%0A%0AI need a small loan and was hoping you might be able to help.%0A%0AHere's my request: ${shareUrl}%0A%0AThanks!`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </a>
                    </div>
                  </Card>
                )}

                <div className="text-center">
                  <Button variant="outline" onClick={() => fetchLoan()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Status
                  </Button>
                </div>
              </>
            )}

            {/* NEXT */}
            {requestTab === 'next' && (
              <Card>
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">What happens next?</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        loanRequest.status === 'pending'
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                          : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                      }`}
                    >
                      {loanRequest.status !== 'pending' ? <CheckCircle className="w-4 h-4" /> : '1'}
                    </div>
                    <div>
                      <p
                        className={`font-medium ${
                          loanRequest.status !== 'pending'
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-neutral-900 dark:text-white'
                        }`}
                      >
                        Someone accepts your request
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {loanRequest.status === 'accepted'
                          ? `✓ ${loanRequest.accepted_by_name} accepted on ${formatDate(loanRequest.accepted_at!)}`
                          : "They'll review your request and decide to help"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center flex-shrink-0 text-neutral-400">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-neutral-500 dark:text-neutral-400">Lender sets the terms</p>
                      <p className="text-sm text-neutral-400 dark:text-neutral-500">Interest rate, repayment schedule, etc.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center flex-shrink-0 text-neutral-400">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-neutral-500 dark:text-neutral-400">You receive the funds</p>
                      <p className="text-sm text-neutral-400 dark:text-neutral-500">Directly to your connected bank account</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center flex-shrink-0 text-neutral-400">
                      4
                    </div>
                    <div>
                      <p className="font-medium text-neutral-500 dark:text-neutral-400">Repay over time</p>
                      <p className="text-sm text-neutral-400 dark:text-neutral-500">We'll track everything and send reminders</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* DETAILS */}
            {requestTab === 'details' && (
              <>
                <Card className="bg-neutral-100 dark:bg-neutral-800/50">
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    <p>Request submitted on {formatDate(loanRequest.created_at)}</p>
                    <p className="mt-1">Request ID: {loanRequest.id.substring(0, 8)}...</p>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">Need help?</p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Reply to the email you received, or refresh if you think the status changed.
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => fetchLoan()}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Mobile bottom nav */}
          <div className="md:hidden h-20" />
        </Shell>

        <MobileTabsBar value={requestTab} onValueChange={(v: string) => setRequestTab(v as RequestTab)} items={mobileRequestItems} />
        
        {/* Not Me Dialog */}
        <ConfirmDialog
          isOpen={showNotMeDialog}
          onClose={() => setShowNotMeDialog(false)}
          onConfirm={handleNotMe}
          title="Not Your Account?"
          message="If this isn't your loan request, we'll clear your session and take you to the homepage. You can always access your loan again using the link in your email."
          confirmText="Clear Session"
          cancelText="Cancel"
          type="warning"
        />
      </>
    );
  }

  // No loan data fallback
  if (!loan) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Loading Your Loan</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">Please wait while we fetch your loan information...</p>
          <Button onClick={() => fetchLoan()} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </Card>
      </div>
    );
  }

  // ========= LOAN VIEW (TABBED + MOBILE APP NAV) =========
  return (
    <>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <UpdateNotification
          show={showUpdateNotification}
          message={updateMessage}
          onRefresh={() => {
            setShowUpdateNotification(false);
            fetchLoan();
          }}
        />

        <Navbar />

        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Feyza</span>
              </Link>
              <button
                onClick={() => setShowNotMeDialog(true)}
                className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Not me
              </button>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Your Loan Dashboard</h1>
                <p className="text-neutral-600 dark:text-neutral-400">Loan from {lenderName}</p>
              </div>

              {isConnected ? (
                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="space-y-6">{statusCards}</div>

          {/* Desktop Tabs */}
          <div className="hidden md:block mt-6">
            <div className="flex border-b border-neutral-200 dark:border-neutral-700">
              {mobileLoanItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setLoanTab(item.value as LoanTab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    loanTab === item.value
                      ? 'border-primary-600 text-primary-600 dark:border-primary-500 dark:text-primary-500'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  {item.label}
                  {item.value === 'payments' && unpaidCount > 0 ? (
                    <span className="ml-2 text-xs opacity-70">({unpaidCount})</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="mt-6 space-y-6">
            {/* OVERVIEW */}
            {loanTab === 'overview' && (
              <>
                {/* Quick Stats (app-like) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Principal</p>
                    <p className="text-lg font-bold text-neutral-900 dark:text-white">
                      {formatCurrency(loan.amount, loan.currency)}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Total to Repay</p>
                    <p className="text-lg font-bold text-primary-600 dark:text-primary-500">
                      {formatCurrency(loan.total_amount || loan.amount, loan.currency)}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Paid</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(loan.amount_paid || 0, loan.currency)}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Remaining</p>
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                      {formatCurrency(loan.amount_remaining || loan.total_amount || loan.amount, loan.currency)}
                    </p>
                  </Card>
                </div>

                {/* Loan Summary */}
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Loan Summary</h2>
                    <Badge
                      variant={loan.status === 'active' ? 'success' : loan.status === 'completed' ? 'default' : 'warning'}
                    >
                      {loan.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Interest Rate</p>
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        {loan.interest_rate || 0}% ({loan.interest_type})
                      </p>
                    </div>
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Payment</p>
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        {formatCurrency(loan.repayment_amount || 0, loan.currency)} / {loan.repayment_frequency}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg mb-4">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-600 dark:text-primary-500" />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Lender</p>
                      <p className="font-medium text-neutral-900 dark:text-white">{lenderName}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-neutral-500 dark:text-neutral-400">Repayment Progress</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                  </div>

                  {nextPayment && loan.status === 'active' ? (
                    <div
                      className={`p-4 rounded-xl flex items-center gap-3 ${
                        loan.borrower_bank_connected
                          ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                          : new Date(nextPayment.due_date) < new Date()
                          ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
                          : 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {loan.borrower_bank_connected ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500" />
                      ) : (
                        <AlertCircle
                          className={`w-5 h-5 ${
                            new Date(nextPayment.due_date) < new Date()
                              ? 'text-red-600 dark:text-red-500'
                              : 'text-amber-600 dark:text-amber-500'
                          }`}
                        />
                      )}
                      <div className="flex-1">
                        <p
                          className={`font-medium ${
                            loan.borrower_bank_connected
                              ? 'text-green-700 dark:text-green-400'
                              : new Date(nextPayment.due_date) < new Date()
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {loan.borrower_bank_connected ? (
                            <span className="flex items-center gap-1">
                              <CheckCheck className="w-4 h-4" /> Next Payment Scheduled
                            </span>
                          ) : new Date(nextPayment.due_date) < new Date() ? (
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" /> Payment Overdue!
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <BellRing className="w-4 h-4" /> Next Payment Due
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {formatCurrency(nextPayment.amount, loan.currency)}{' '}
                          {loan.borrower_bank_connected ? 'will be auto-deducted' : 'due'} {formatDate(nextPayment.due_date)}
                        </p>
                      </div>

                      {shouldShowMakePayment ? (
                        <Button onClick={() => setLoanTab('payments')} variant="outline">
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </Card>

                {/* Auto-pay mini card */}
                {loan.borrower_bank_connected ? (
                  <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Shield className="w-6 h-6 text-green-600 dark:text-green-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-green-900 dark:text-green-300 flex items-center gap-2">
                          <CheckCheck className="w-5 h-5" />
                          Auto-Pay Enabled
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-400">
                          Payments will be automatically deducted on each due date.
                        </p>
                      </div>
                    </div>
                    {loan.borrower_bank_name ? (
                      <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800 flex items-center gap-3">
                        <Building className="w-5 h-5 text-green-600 dark:text-green-500" />
                        <span className="text-green-800 dark:text-green-300">
                          <strong>{loan.borrower_bank_name}</strong>{' '}
                          {loan.borrower_bank_account_mask && `••••${loan.borrower_bank_account_mask}`}
                        </span>
                      </div>
                    ) : null}
                  </Card>
                ) : null}
              </>
            )}

            {/* PAYMENTS */}
            {loanTab === 'payments' && (
              <>
                {/* Make a payment */}
                {shouldShowMakePayment ? (
                  <Card>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <Banknote className="w-5 h-5 text-green-600 dark:text-green-500" />
                        </div>
                        <div>
                          <h2 className="font-semibold text-neutral-900 dark:text-white">Make a Payment</h2>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Pay early to stay ahead</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={fetchLoan} className="text-sm">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Refresh
                      </Button>
                    </div>

                    {/* Next payment due */}
                    {(() => {
                      const nextPaymentItem = loan.schedule?.find((s) => !s.is_paid);
                      if (!nextPaymentItem) return null;

                      const dueDate = new Date(nextPaymentItem.due_date);
                      const today = new Date();
                      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      const isOverdue = daysUntilDue < 0;
                      const isDueToday = daysUntilDue === 0;

                      return (
                        <div
                          className={`p-4 rounded-xl border mb-4 ${
                            isOverdue
                              ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                              : isDueToday
                              ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800'
                              : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3 gap-3">
                            <div>
                              <p
                                className={`text-sm font-medium ${
                                  isOverdue
                                    ? 'text-red-700 dark:text-red-400'
                                    : isDueToday
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-neutral-600 dark:text-neutral-400'
                                }`}
                              >
                                <span className="flex items-center gap-1">
                                  {isOverdue ? (
                                    <>
                                      <AlertTriangle className="w-4 h-4" /> Overdue by {Math.abs(daysUntilDue)} days
                                    </>
                                  ) : isDueToday ? (
                                    <>
                                      <FaRegCalendarCheck className="w-4 h-4" /> Due Today
                                    </>
                                  ) : (
                                    <>
                                      <Timer className="w-4 h-4" /> Next payment in {daysUntilDue} days
                                    </>
                                  )}
                                </span>
                              </p>
                              <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                                {formatCurrency(nextPaymentItem.amount, loan.currency)}
                              </p>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                                Due {formatDate(nextPaymentItem.due_date)}
                              </p>
                            </div>

                            <Button
                              onClick={() => handlePayNow(nextPaymentItem.id)}
                              disabled={processingPayment === nextPaymentItem.id}
                              className={isOverdue ? 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600' : ''}
                            >
                              {processingPayment === nextPaymentItem.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Pay Now
                                </>
                              )}
                            </Button>
                          </div>

                          {(nextPaymentItem.principal_amount || nextPaymentItem.interest_amount) ? (
                            <div className="flex gap-4 text-sm border-t border-neutral-200 dark:border-neutral-700 pt-3 mt-3">
                              <div>
                                <span className="text-neutral-500 dark:text-neutral-400">Principal: </span>
                                <span className="font-medium text-neutral-900 dark:text-white">
                                  {formatCurrency(nextPaymentItem.principal_amount || 0, loan.currency)}
                                </span>
                              </div>
                              {nextPaymentItem.interest_amount && nextPaymentItem.interest_amount > 0 ? (
                                <div>
                                  <span className="text-neutral-500 dark:text-neutral-400">Interest: </span>
                                  <span className="font-medium text-orange-600 dark:text-orange-500">
                                    {formatCurrency(nextPaymentItem.interest_amount, loan.currency)}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {feeSettings?.enabled && !feeLoading ? (
                            (() => {
                              const feeCalc = calculateFee(nextPaymentItem.amount);
                              return feeCalc.platformFee > 0 ? (
                                <div className="mt-3">
                                  <FeeBreakdown
                                    amount={feeCalc.grossAmount}
                                    platformFee={feeCalc.platformFee}
                                    netAmount={feeCalc.netAmount}
                                    feeLabel={feeCalc.feeLabel}
                                    feeDescription={feeCalc.feeDescription}
                                    variant="detailed"
                                  />
                                </div>
                              ) : null;
                            })()
                          ) : null}
                        </div>
                      );
                    })()}
                  </Card>
                ) : null}

                {/* Payment Schedule */}
                <Card>
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-primary-600 dark:text-primary-500" />
                      Payment Schedule
                    </h3>

                    {loan.schedule && loan.schedule.length > 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const unpaidPayments = loan.schedule
                            .filter((p) => !p.is_paid)
                            .map((p) => ({
                              id: p.id,
                              title: `💰 Feyza Payment Due - ${formatCurrency(p.amount, loan.currency)}`,
                              amount: p.amount,
                              currency: loan.currency,
                              dueDate: p.due_date,
                              lenderName,
                              description: `Loan repayment for ${loan.purpose || 'personal loan'}`,
                            }));
                          downloadICalFile(unpaidPayments, loan.purpose);
                        }}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Add to Calendar
                      </Button>
                    ) : null}
                  </div>

                  {(!loan.schedule || loan.schedule.length === 0) ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-amber-600 dark:text-amber-500" />
                      </div>
                      <p className="font-medium text-neutral-900 dark:text-white mb-2 flex items-center justify-center gap-2">
                        {loan.status === 'pending' ? (
                          <>
                            <Timer className="w-5 h-5" /> Waiting for Lender
                          </>
                        ) : (
                          <>
                            <FaRegCalendarTimes className="w-5 h-5" /> Schedule Coming Soon
                          </>
                        )}
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto">
                        {loan.status === 'pending'
                          ? "Your lender is reviewing your request and setting up the loan terms. You'll see your payment schedule here once they're done."
                          : 'Your payment schedule will appear here once the loan is fully activated. Check back soon!'}
                      </p>
                      {loan.status === 'pending' ? (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg inline-block">
                          <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1">
                            <FaRegLightbulb className="w-3 h-3" />
                            Tip: You'll receive an email when your lender finalizes the terms
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {loan.schedule.map((payment, index) => {
                        const isPast = new Date(payment.due_date) < new Date();
                        const isOverdue = isPast && !payment.is_paid;

                        return (
                          <div
                            key={payment.id}
                            id={`payment-${payment.id}`}
                            className={`p-4 rounded-xl border ${
                              payment.is_paid
                                ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
                                : isOverdue
                                ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                                : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    payment.is_paid
                                      ? 'bg-green-100 dark:bg-green-900/30'
                                      : isOverdue
                                      ? 'bg-red-100 dark:bg-red-900/30'
                                      : 'bg-neutral-200 dark:bg-neutral-700'
                                  }`}
                                >
                                  {payment.is_paid ? (
                                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-500" />
                                  ) : (
                                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                                      {index + 1}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <p className="font-medium text-neutral-900 dark:text-white">
                                    {formatCurrency(payment.amount, loan.currency)}
                                  </p>
                                  <p
                                    className={`text-sm ${
                                      isOverdue
                                        ? 'text-red-600 dark:text-red-400 font-medium'
                                        : 'text-neutral-500 dark:text-neutral-400'
                                    }`}
                                  >
                                    {isOverdue ? (
                                      <span className="flex items-center gap-1">
                                        <AlertTriangle className="w-4 h-4" /> Overdue • {formatDate(payment.due_date)}
                                      </span>
                                    ) : (
                                      formatDate(payment.due_date)
                                    )}
                                  </p>
                                </div>
                              </div>

                              {payment.is_paid ? (
                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm rounded-full">
                                  ✓ Paid
                                </span>
                              ) : loan.borrower_bank_connected ? (
                                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm rounded-full">
                                  ⚡ Auto-Pay
                                </span>
                              ) : (
                                <span
                                  className={`px-3 py-1 text-sm rounded-full ${
                                    isOverdue
                                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                      : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                                  }`}
                                >
                                  {isOverdue ? 'Overdue' : 'Upcoming'}
                                </span>
                              )}
                            </div>

                            {(payment.principal_amount || payment.interest_amount) ? (
                              <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-700 flex gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                                {payment.principal_amount ? (
                                  <span>Principal: {formatCurrency(payment.principal_amount, loan.currency)}</span>
                                ) : null}
                                {payment.interest_amount ? (
                                  <span>Interest: {formatCurrency(payment.interest_amount, loan.currency)}</span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </>
            )}

            {/* ACTIVITY */}
            {loanTab === 'activity' && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                    <ArrowDownLeft className="w-5 h-5" />
                    Transfer Activity
                  </h2>
                  <Button variant="ghost" size="sm" onClick={fetchLoan} className="text-sm">
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </Button>
                </div>

                {/* Summary Card */}
                {loan.transfers && loan.transfers.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">Received from Lender</p>
                      <p className="text-lg font-bold text-green-700 dark:text-green-300">
                        {formatCurrency(
                          loan.transfers
                            .filter(t => t.type === 'disbursement' && (t.status === 'completed' || t.status === 'processed'))
                            .reduce((sum, t) => sum + t.amount, 0),
                          loan.currency
                        )}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Paid to Lender</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        {formatCurrency(
                          loan.transfers
                            .filter(t => t.type === 'repayment' && (t.status === 'completed' || t.status === 'processed'))
                            .reduce((sum, t) => sum + (t.gross_amount || t.amount), 0),
                          loan.currency
                        )}
                      </p>
                      {/* Show total fees paid */}
                      {loan.transfers
                        .filter(t => t.type === 'repayment' && (t.status === 'completed' || t.status === 'processed') && t.platform_fee && t.platform_fee > 0)
                        .reduce((sum, t) => sum + (t.platform_fee || 0), 0) > 0 && (
                        <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                          incl. {formatCurrency(
                            loan.transfers
                              .filter(t => t.type === 'repayment' && (t.status === 'completed' || t.status === 'processed'))
                              .reduce((sum, t) => sum + (t.platform_fee || 0), 0),
                            loan.currency
                          )} fees
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {loan.transfers && loan.transfers.length > 0 ? (
                  <div className="space-y-3">
                    {loan.transfers.slice(0, 15).map((transfer) => {
                      const statusColors = {
                        pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                        processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        processed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                        cancelled: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400',
                      } as const;

                      const statusIcons = {
                        pending: <Clock className="w-4 h-4" />,
                        processing: <Loader2 className="w-4 h-4 animate-spin" />,
                        completed: <CheckCircle className="w-4 h-4" />,
                        processed: <CheckCircle className="w-4 h-4" />,
                        failed: <AlertCircle className="w-4 h-4" />,
                        cancelled: <X className="w-4 h-4" />,
                      } as const;

                      const color =
                        statusColors[transfer.status as keyof typeof statusColors] || statusColors.pending;
                      const icon = statusIcons[transfer.status as keyof typeof statusIcons] || statusIcons.pending;

                      // Determine direction and description
                      const isDisbursement = transfer.type === 'disbursement';
                      const transferTitle = isDisbursement ? 'Loan Received' : 'Payment to Lender';
                      const transferSubtitle = isDisbursement 
                        ? `From ${lenderName}` 
                        : `To ${lenderName}`;

                      return (
                        <div
                          key={transfer.id}
                          className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-700"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${isDisbursement ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                              {isDisbursement ? (
                                <ArrowDownLeft className={`w-5 h-5 ${isDisbursement ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`} />
                              ) : (
                                <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900 dark:text-white">
                                {transferTitle}
                              </p>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                {transferSubtitle}
                              </p>
                              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                                {formatDate(transfer.created_at)}
                                {transfer.completed_at && (transfer.status === 'completed' || transfer.status === 'processed') ? (
                                  <span> • Completed {formatDate(transfer.completed_at)}</span>
                                ) : null}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p
                              className={`font-bold text-lg ${
                                isDisbursement
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-blue-600 dark:text-blue-400'
                              }`}
                            >
                              {isDisbursement ? '+' : '-'}
                              {formatCurrency(transfer.gross_amount || transfer.amount, loan.currency)}
                            </p>
                            {/* Show fee breakdown for repayments */}
                            {!isDisbursement && transfer.platform_fee && transfer.platform_fee > 0 && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {formatCurrency(transfer.net_amount || transfer.amount, loan.currency)} to lender
                                <span className="text-neutral-400 dark:text-neutral-500"> + {formatCurrency(transfer.platform_fee, loan.currency)} fee</span>
                              </p>
                            )}
                            <Badge
                              variant={
                                transfer.status === 'completed' || transfer.status === 'processed'
                                  ? 'success'
                                  : transfer.status === 'failed'
                                  ? 'error'
                                  : 'warning'
                              }
                              className="text-xs capitalize mt-1"
                            >
                              {transfer.status === 'processed' ? 'completed' : transfer.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ArrowDownLeft className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
                    </div>
                    <h3 className="font-medium text-neutral-900 dark:text-white mb-1">No transfers yet</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Transfer activity between you and {lenderName} will appear here.
                    </p>
                  </div>
                )}
              </Card>
            )}

            {/* HELP */}
            {loanTab === 'help' && (
              <>
                <Card>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                      <HelpCircle className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-neutral-900 dark:text-white">Need help?</p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        If something looks wrong, refresh first. If your bank transfer failed, re-check your bank connection or contact your lender.
                      </p>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button variant="outline" onClick={() => fetchLoan()}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Refresh Data
                        </Button>

                        {loan.schedule && loan.schedule.length > 0 ? (
                          <Button
                            variant="outline"
                            onClick={() => {
                              const unpaidPayments = loan.schedule
                                .filter((p) => !p.is_paid)
                                .map((p) => ({
                                  id: p.id,
                                  title: `💰 Feyza Payment Due - ${formatCurrency(p.amount, loan.currency)}`,
                                  amount: p.amount,
                                  currency: loan.currency,
                                  dueDate: p.due_date,
                                  lenderName,
                                  description: `Loan repayment for ${loan.purpose || 'personal loan'}`,
                                }));
                              downloadICalFile(unpaidPayments, loan.purpose);
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Add Calendar Reminders
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="bg-neutral-100 dark:bg-neutral-800/50">
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    <p>Powered by <Link href="/" className="text-primary-600 dark:text-primary-400 hover:underline">Feyza</Link></p>
                    <p className="mt-1">Questions? Contact your lender directly.</p>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Mobile spacer for bottom nav */}
          <div className="md:hidden h-20" />
        </div>

        {/* Confirmation Dialogs */}
        <ConfirmDialog
          isOpen={paymentConfirmDialog.isOpen}
          onClose={() => setPaymentConfirmDialog({ isOpen: false, paymentId: null })}
          onConfirm={executePayment}
          title="Confirm Payment"
          message="Pay this installment now? This will initiate an ACH transfer from your bank account to the lender."
          confirmText="Pay Now"
          cancelText="Cancel"
          type="info"
          loading={!!processingPayment}
        />
        
        <ConfirmDialog
          isOpen={showNotMeDialog}
          onClose={() => setShowNotMeDialog(false)}
          onConfirm={handleNotMe}
          title="Not Your Account?"
          message="If this isn't your loan, we'll clear your session and take you to the homepage. You can always access your loan again using the link in your email."
          confirmText="Clear Session"
          cancelText="Cancel"
          type="warning"
        />
      </div>

      {/* Mobile bottom nav (app-like) */}
      <MobileTabsBar value={loanTab} onValueChange={(v: string) => setLoanTab(v as LoanTab)} items={mobileLoanItems} />
    </>
  );
}
