'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Badge, Avatar, ConfirmDialog } from '@/components/ui';
import { useToast } from '@/components/ui/Alert';
import { LoanTimeline } from '@/components/loans';
import { PaymentRetryBadge } from '@/components/payments/PaymentRetryBadge';
import { BorrowerRatingCard } from '@/components/borrower/BorrowerRating';
import { TrustScoreCard } from '@/components/trust-score';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getLoanProgress } from '@/lib/utils';
import { downloadICalFile } from '@/lib/calendar';
import { Loan, PaymentScheduleItem } from '@/types';
import { FeeBreakdown, usePlatformFee } from '@/components/FeeBreakdown';
import {
  ArrowLeft,
  ArrowDownLeft,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Banknote,
  Building,
  CreditCard,
  Upload,
  ExternalLink,
  Bell,
  FileText,
  Download,
  X,
  ChevronUp,
  ChevronDown,
  Share2,
  RefreshCw,
  Lock,
  User,
  Info,
  Award,
  UserPlus,
} from 'lucide-react';

// Import react-icons for emoji replacements (keep for emoji)
import { FaAmbulance, FaHospital, FaGraduationCap, FaBriefcase, FaHome, FaFileAlt } from 'react-icons/fa';
import { MdEmergency, MdMedicalServices, MdSchool, MdBusinessCenter, MdHouse, MdDescription } from 'react-icons/md';

/* -------------------------------------------
   Tabs
-------------------------------------------- */
type TabKey = 'overview' | 'timeline' | 'payments' | 'terms' | 'agreement' | 'reminders' | 'borrower-profile';

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  badge?: string | number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative inline-flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-2 sm:py-2 text-xs sm:text-sm font-medium transition-all',
        'border active:scale-95',
        'min-w-[70px] sm:min-w-0 justify-center sm:justify-start',
        active
          ? 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white shadow-sm'
          : 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60',
      ].join(' ')}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
      {badge !== undefined && (
        <span className={`ml-0.5 sm:ml-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium ${
          active 
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

/* -------------------------------------------
   Helper: status color config
-------------------------------------------- */
const statusConfig: Record<
  string,
  { color: 'default' | 'success' | 'warning' | 'danger' | 'info'; icon: any; label: string }
> = {
  pending: { color: 'warning', icon: Clock, label: 'Pending' },
  pending_funds: { color: 'warning', icon: Clock, label: 'Awaiting Funds' },
  pending_disbursement: { color: 'info', icon: Clock, label: 'Disbursing' },
  active: { color: 'success', icon: CheckCircle, label: 'Active' },
  completed: { color: 'info', icon: CheckCircle, label: 'Completed' },
  declined: { color: 'danger', icon: XCircle, label: 'Declined' },
  cancelled: { color: 'default', icon: XCircle, label: 'Cancelled' },
};

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [tab, setTab] = useState<TabKey>('overview');

  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<PaymentScheduleItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dismissed notifications state (keep for backward compatibility)
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  // Collapsible notifications state
  const [minimizedNotifications, setMinimizedNotifications] = useState<Set<string>>(new Set());

  // Live transfer status
  const [transferStatus, setTransferStatus] = useState<{
    status: 'not_started' | 'pending' | 'processing' | 'completed' | 'failed';
    statusMessage: string;
    timeline: { minDays: number; maxDays: number; estimatedDate: string } | null;
    transfer: { created_at: string; status: string } | null;
  } | null>(null);
  const [transferStatusLoading, setTransferStatusLoading] = useState(false);

  // Funds sending state
  const [showFundsModal, setShowFundsModal] = useState(false);
  const [fundsSending, setFundsSending] = useState(false);
  const [fundsReference, setFundsReference] = useState('');
  const [fundsPaymentMethod, setFundsPaymentMethod] = useState<'paypal' | 'cashapp' | 'venmo'>('paypal');
  const [fundsProofFile, setFundsProofFile] = useState<File | null>(null);
  const [fundsProofPreview, setFundsProofPreview] = useState<string | null>(null);

  // Reminder state
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [showReminderModal, setShowReminderModal] = useState(false);

  // Manual payment processing state
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  
  // Payment provider state (controlled by admin)
  const [isDwollaEnabled, setIsDwollaEnabled] = useState(false);
  
  // Manual payment modal for borrower (when ACH is not available)
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false);
  const [manualPaymentId, setManualPaymentId] = useState<string | null>(null);
  const [manualPaymentMethod, setManualPaymentMethod] = useState<string>('');
  const [manualPaymentReference, setManualPaymentReference] = useState('');
  const [manualPaymentProofFile, setManualPaymentProofFile] = useState<File | null>(null);
  const [manualPaymentProofPreview, setManualPaymentProofPreview] = useState<string | null>(null);
  const [submittingManualPayment, setSubmittingManualPayment] = useState(false);

  // Payment confirmation dialog state
  const [paymentConfirmDialog, setPaymentConfirmDialog] = useState<{
    isOpen: boolean;
    paymentId: string | null;
    isBorrower: boolean;
  }>({ isOpen: false, paymentId: null, isBorrower: false });

  // Decline loan confirmation dialog
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);

  // Cancel loan confirmation dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  // Ref to prevent duplicate polling fetches
  const isFetchingTransferStatus = React.useRef(false);
  const lastFetchTime = React.useRef(0);

  // Platform fee hook
  const { settings: feeSettings, loading: feeLoading, calculateFee } = usePlatformFee();

  // Terms section state
  const [termsExpanded, setTermsExpanded] = useState(false);

  // Borrower rating state
  const [borrowerRatingData, setBorrowerRatingData] = useState<any>(null);
  const [loadingBorrowerRating, setLoadingBorrowerRating] = useState(false);

  // Lender vouch for borrower state
  const [hasVouchedForBorrower, setHasVouchedForBorrower] = useState(false);
  const [vouchingForBorrower, setVouchingForBorrower] = useState(false);
  const [showVouchModal, setShowVouchModal] = useState(false);
  const [vouchMessage, setVouchMessage] = useState('');

  const loanId = params.id as string;
  const supabase = createClient();

  /* -------------------------------------------
     Derived values - MUST be called before any conditional returns
  -------------------------------------------- */
  const isBorrower = loan?.borrower_id === user?.id;
  const isLender = loan?.lender_id === user?.id || (loan?.business_lender && (loan.business_lender as any).user_id === user?.id);

  // Use total_amount (principal + interest) as the progress denominator.
  // loan.amount is principal-only; repayments track against total_amount.
  const progressTotal = (loan?.total_amount && loan.total_amount > 0) ? loan.total_amount : (loan?.amount || 0);
  const progress = getLoanProgress(loan?.amount_paid || 0, progressTotal);

  const otherParty = isBorrower ? loan?.lender : loan?.borrower;
  const isPersonalLoan = loan?.lender_type === 'personal';

  let otherPartyName: string = 'Loading...';
  if (otherParty) {
    if ('business_name' in (otherParty as any)) otherPartyName = (otherParty as any).business_name;
    else if (isPersonalLoan && (otherParty as any).username) otherPartyName = `~${(otherParty as any).username}`;
    else otherPartyName = (otherParty as any).full_name;
  } else if (loan && isBorrower && isPersonalLoan && (loan as any).invite_username) {
    otherPartyName = `~${(loan as any).invite_username}`;
  } else if (loan && isBorrower) {
    otherPartyName = (loan as any).invite_email || 'Pending acceptance';
  } else if (loan) {
    otherPartyName = (loan as any).borrower_name || 'Borrower';
  }

  const { color: statusColor, icon: StatusIcon, label: statusLabel } = statusConfig[loan?.status || 'pending'] || statusConfig.pending;

  const paidCount = schedule.filter((s) => s.is_paid).length;
  const unpaidCount = schedule.filter((s) => !s.is_paid).length;

  const hasTermsTab = !!(loan?.business_lender_id && (loan.business_lender as any)?.lending_terms);
  const hasAgreementTab = !!(isLender && ((loan as any)?.borrower_signed || (loan as any)?.lender_signed));
  const hasRemindersTab = !!(loan?.status === 'active' && isLender && loan?.funds_sent);

  // This useEffect must be called before any conditional returns
  useEffect(() => {
    if (tab === 'terms' && !hasTermsTab) setTab('overview');
    if (tab === 'agreement' && !hasAgreementTab) setTab('overview');
    if (tab === 'reminders' && !hasRemindersTab) setTab('overview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTermsTab, hasAgreementTab, hasRemindersTab]);

  const nextPayment = useMemo(() => schedule.find((s) => !s.is_paid), [schedule]);

  /* -------------------------------------------
     Fetch borrower rating function
  -------------------------------------------- */
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
      console.error('Failed to fetch borrower rating:', error);
    } finally {
      setLoadingBorrowerRating(false);
    }
  }, [isLender]);

  /* -------------------------------------------
     Storage for minimized banners
  -------------------------------------------- */
  useEffect(() => {
    if (loanId) {
      const storedDismissed = localStorage.getItem(`loan-notifications-${loanId}`);
      if (storedDismissed) {
        setDismissedNotifications(new Set(JSON.parse(storedDismissed)));
      }

      const storedMinimized = localStorage.getItem(`loan-minimized-${loanId}`);
      if (storedMinimized) {
        try {
          setMinimizedNotifications(new Set(JSON.parse(storedMinimized)));
        } catch (e) {
          console.error('Error parsing minimized notifications:', e);
        }
      }
    }
  }, [loanId]);

  // Keep old dismissNotification for backwards compatibility
  const dismissNotification = (type: string) => {
    const newDismissed = new Set(dismissedNotifications);
    newDismissed.add(type);
    setDismissedNotifications(newDismissed);
    localStorage.setItem(`loan-notifications-${loanId}`, JSON.stringify(Array.from(newDismissed)));
  };

  const toggleNotification = (type: string) => {
    const next = new Set(minimizedNotifications);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setMinimizedNotifications(next);
    localStorage.setItem(`loan-minimized-${loanId}`, JSON.stringify(Array.from(next)));
  };

  /* -------------------------------------------
     Refetchers
  -------------------------------------------- */
  const refetchLoan = useCallback(async () => {
    if (!loanId) return;

    const { data: loanData } = await supabase
      .from('loans')
      .select(
        `
        *,
        borrower:users!borrower_id(
          *,
          payment_methods:user_payment_methods(
            id,
            account_identifier,
            account_name,
            is_active,
            is_default,
            payment_provider:payment_providers(id, name, slug)
          )
        ),
        lender:users!lender_id(*),
        business_lender:business_profiles!business_lender_id(*),
        guest_lender:guest_lenders!guest_lender_id(*)
      `
      )
      .eq('id', loanId)
      .single();

    if (loanData) {
      setLoan(loanData as Loan);
    }
  }, [loanId, supabase]);

  const refetchSchedule = useCallback(async () => {
    if (!loanId) return;

    const { data: scheduleData } = await supabase
      .from('payment_schedule')
      .select('*')
      .eq('loan_id', loanId)
      .order('due_date', { ascending: true });

    if (scheduleData) {
      setSchedule(scheduleData);
    }
  }, [loanId, supabase]);

  /* -------------------------------------------
     Initial load
  -------------------------------------------- */
  useEffect(() => {
    const fetchData = async () => {
      const supa = createClient();

      const {
        data: { user: authUser },
      } = await supa.auth.getUser();

      if (!authUser) {
        router.push('/auth/signin');
        return;
      }

      const { data: profile } = await supa.from('users').select('*').eq('id', authUser.id).single();

      setUser(
        profile || {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || 'User',
          user_type: authUser.user_metadata?.user_type || 'individual',
        }
      );

      const { data: loanData, error } = await supa
        .from('loans')
        .select(
          `
          *,
          borrower:users!borrower_id(
            *,
            payment_methods:user_payment_methods(
              id,
              account_identifier,
              account_name,
              is_active,
              is_default,
              payment_provider:payment_providers(id, name, slug)
            )
          ),
          lender:users!lender_id(*),
          business_lender:business_profiles!business_lender_id(*),
          guest_lender:guest_lenders!guest_lender_id(*)
        `
        )
        .eq('id', loanId)
        .single();

      if (error || !loanData) {
        router.push('/dashboard');
        return;
      }

      // Access check
      let hasAccess = false;
      if (loanData.borrower_id === authUser.id) hasAccess = true;
      else if (loanData.lender_id === authUser.id) hasAccess = true;
      else if (loanData.business_lender_id) {
        const { data: businessProfile } = await supa
          .from('business_profiles')
          .select('id')
          .eq('id', loanData.business_lender_id)
          .eq('user_id', authUser.id)
          .single();
        if (businessProfile) hasAccess = true;
      }

      if (!hasAccess) {
        router.push('/dashboard');
        return;
      }

      const lenderInfo = loanData.lender || loanData.business_lender || loanData.guest_lender;

      setLoan({
        ...(loanData as any),
        lender: lenderInfo,
      });

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

  /* -------------------------------------------
     Fetch borrower rating when user is lender
  -------------------------------------------- */
  useEffect(() => {
    if (isLender && loan?.borrower_id) {
      fetchBorrowerRating(loan.borrower_id);
    }
  }, [isLender, loan?.borrower_id, fetchBorrowerRating]);

  /* -------------------------------------------
     Check if lender has already vouched for borrower
  -------------------------------------------- */
  useEffect(() => {
    const checkExistingVouch = async () => {
      if (!isLender || !loan?.borrower_id || !user?.id) return;
      
      try {
        // Get vouches given by this user
        const response = await fetch(`/api/vouches?type=given`);
        if (response.ok) {
          const data = await response.json();
          const hasVouched = (data.vouches || []).some(
            (v: any) => v.vouchee_id === loan.borrower_id
          );
          setHasVouchedForBorrower(hasVouched);
        }
      } catch (err) {
        console.error('Error checking existing vouch:', err);
      }
    };

    if (loan?.status === 'completed') {
      checkExistingVouch();
    }
  }, [isLender, loan?.borrower_id, loan?.status, user?.id]);

  /* -------------------------------------------
     Check if Dwolla (ACH) is enabled by admin
  -------------------------------------------- */
  useEffect(() => {
    const checkPaymentProviders = async () => {
      try {
        // Use the API endpoint which properly checks:
        // - is_enabled = true
        // - is_available_for_repayment = true (for type=repayment)
        // - supported_countries includes user's country
        const response = await fetch('/api/payment-methods?country=US&type=repayment');
        if (response.ok) {
          const data = await response.json();
          const dwollaEnabled = (data.providers || []).some((p: any) => p.slug === 'dwolla' && p.isAutomated);
          console.log('[LoanDetail] Dwolla enabled for repayment:', dwollaEnabled, 'Providers:', data.providers?.map((p: any) => p.slug));
          setIsDwollaEnabled(dwollaEnabled);
        } else {
          console.error('[LoanDetail] Failed to fetch payment providers:', response.status);
          setIsDwollaEnabled(false);
        }
      } catch (err) {
        console.error('[LoanDetail] Failed to check payment providers:', err);
        setIsDwollaEnabled(false);
      }
    };

    checkPaymentProviders();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('loan_detail_payment_providers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_providers' },
        () => {
          checkPaymentProviders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  /* -------------------------------------------
     Real-time updates (full functionality kept)
  -------------------------------------------- */
  useEffect(() => {
    if (!loanId) return;

    const channels: any[] = [];

    // Loan updates subscription
    const loanChannel = supabase
      .channel(`loan-detail-${loanId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'loans', filter: `id=eq.${loanId}` },
        (payload) => {
          console.log('[LoanDetail] Loan updated in real-time', payload.new);
          const newData = payload.new as any;
          const oldData = payload.old as any;

          // Show toast for important status changes
          if (newData.status !== oldData?.status) {
            if (newData.status === 'active') {
              showToast({ type: 'success', title: 'Loan Active!', message: 'The loan is now active' });
            } else if (newData.status === 'completed') {
              showToast({ type: 'success', title: '🎉 Loan Completed!', message: 'Congratulations! The loan has been fully repaid' });
            } else if (newData.status === 'declined') {
              showToast({ type: 'warning', title: 'Loan Declined', message: 'The loan request was declined' });
            }
          }

          // Show toast for disbursement status changes
          if (newData.disbursement_status !== oldData?.disbursement_status) {
            if (newData.disbursement_status === 'completed') {
              showToast({ type: 'success', title: 'Funds Transferred!', message: 'Funds have been successfully deposited' });
            } else if (newData.disbursement_status === 'processing') {
              showToast({ type: 'info', title: 'Transfer Processing', message: 'Funds are being transferred to your bank' });
            }
          }

          refetchLoan();
        }
      )
      .subscribe();
    channels.push(loanChannel);

    // Payment schedule subscription
    const scheduleChannel = supabase
      .channel(`loan-schedule-${loanId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_schedule', filter: `loan_id=eq.${loanId}` },
        (payload) => {
          console.log('[LoanDetail] Payment schedule change:', payload.eventType);
          const newData = payload.new as any;

          // Show toast for payment confirmations
          if (payload.eventType === 'UPDATE' && newData?.is_paid && newData?.status === 'confirmed') {
            showToast({ type: 'success', title: 'Payment Confirmed!', message: 'The payment has been confirmed' });
          }

          refetchSchedule();
          refetchLoan();
        }
      )
      .subscribe();
    channels.push(scheduleChannel);

    // Transfer subscription
    const transferChannel = supabase
      .channel(`loan-transfers-${loanId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transfers', filter: `loan_id=eq.${loanId}` },
        (payload) => {
          console.log('[LoanDetail] Transfer change:', payload.eventType);
          const newData = payload.new as any;

          // Show toast for transfer status changes
          if (newData?.status === 'completed') {
            showToast({ type: 'success', title: 'Transfer Complete!', message: 'Funds have been successfully transferred' });
          } else if (newData?.status === 'failed') {
            showToast({ type: 'error', title: 'Transfer Failed', message: 'The transfer failed. Please check details.' });
          }

          // Only fetch sync-status if not already fetching
          if (!isFetchingTransferStatus.current) {
            setTransferStatusLoading(true);
            isFetchingTransferStatus.current = true;
            fetch(`/api/dwolla/sync-status?loanId=${loanId}`)
              .then((res) => res.json())
              .then((data) => setTransferStatus(data))
              .finally(() => {
                setTransferStatusLoading(false);
                isFetchingTransferStatus.current = false;
              });
          }
        }
      )
      .subscribe();
    channels.push(transferChannel);

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [loanId, supabase, refetchLoan, refetchSchedule, showToast]);

  /* -------------------------------------------
     Transfer status (your full mapping kept)
  -------------------------------------------- */
  const fetchTransferStatus = useCallback(async () => {
    if (!loanId) return;
    
    // Prevent duplicate fetches
    if (isFetchingTransferStatus.current) {
      console.log('[Transfer Status] Skipping - fetch already in progress');
      return;
    }
    
    // Throttle: minimum 10 seconds between fetches
    const now = Date.now();
    if (now - lastFetchTime.current < 10000) {
      console.log('[Transfer Status] Skipping - throttled');
      return;
    }

    // If Dwolla is not enabled, handle manual payment status differently
    if (!isDwollaEnabled) {
      // For manual payments, just check if funds_sent flag is set
      if (loan?.funds_sent) {
        setTransferStatus({
          status: 'completed',
          statusMessage: loan?.funds_sent_method 
            ? `Payment sent via ${loan.funds_sent_method.charAt(0).toUpperCase() + loan.funds_sent_method.slice(1)}`
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
      const response = await fetch(`/api/dwolla/sync-status?loan_id=${loanId}`);
      if (!response.ok) return;
      const data = await response.json();

      // Find the disbursement transfer
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

      // Calculate estimated arrival
      let timeline = null;
      if (disbursement?.created_at) {
        const createdDate = new Date(disbursement.created_at);
        const minArrival = new Date(createdDate);
        minArrival.setDate(minArrival.getDate() + 1);
        const maxArrival = new Date(createdDate);
        maxArrival.setDate(maxArrival.getDate() + 3);

        // Calculate days remaining
        const now = new Date();
        const minDaysLeft = Math.max(0, Math.ceil((minArrival.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const maxDaysLeft = Math.max(0, Math.ceil((maxArrival.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

        timeline = {
          minDays: minDaysLeft,
          maxDays: maxDaysLeft,
          estimatedDate: maxArrival.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      }

      // Map status - ONLY show completed when Dwolla transfer is actually processed
      const transferStatusVal = disbursement?.status || data.loan?.disbursement_status;
      let status: 'not_started' | 'pending' | 'processing' | 'completed' | 'failed' = 'not_started';
      let statusMessage = '';

      // Only mark as completed when transfer status is explicitly 'processed' from Dwolla
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
        // Funds sent but no transfer record yet - still processing
        status = 'processing';
        statusMessage = 'Funds are being transferred via ACH (1-3 business days)';
      } else {
        status = 'not_started';
        statusMessage = 'Waiting for lender to initiate transfer';
      }

      setTransferStatus({
        status,
        statusMessage,
        timeline,
        transfer: disbursement || null,
      });

      // Also update the loan state if status changed
      if (data.loan && loan) {
        setLoan((prev: any) => ({
          ...prev,
          disbursement_status: data.loan.disbursement_status,
          funds_sent: data.loan.funds_sent,
        }));
      }
    } catch (error) {
      console.error('Error fetching transfer status:', error);
    } finally {
      isFetchingTransferStatus.current = false;
    }
  }, [loanId, loan?.funds_sent, loan?.funds_sent_method, isDwollaEnabled]);

  // Poll for transfer status when funds are being transferred
  useEffect(() => {
    if (!loan) return;

    // Don't poll for ACH transfer status if Dwolla is not enabled
    // (manual payments don't need polling)
    if (!isDwollaEnabled) {
      // For manual payments, just set status based on funds_sent
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
        // Don't show any transfer banner for manual payments that haven't been sent yet
        setTransferStatus(null);
      }
      return;
    }

    // Only poll if disbursement is in progress (Dwolla only)
    // Don't poll if already completed or not yet started
    const disbursementStatus = (loan as any).disbursement_status;
    const shouldPoll =
      loan.status === 'active' &&
      isDwollaEnabled &&
      disbursementStatus === 'processing' &&
      !loan.funds_sent;

    // Only do initial fetch if we should be polling
    if (shouldPoll || disbursementStatus === 'processing') {
      fetchTransferStatus();
    }

    // Set up polling every 60 seconds (reduced from 30) if disbursement is in progress
    if (shouldPoll) {
      console.log('[Transfer Status] Starting polling for loan', loan.id);
      const interval = setInterval(fetchTransferStatus, 60000); // 60 seconds
      return () => {
        console.log('[Transfer Status] Stopping polling for loan', loan.id);
        clearInterval(interval);
      };
    }
  }, [loan?.id, loan?.status, (loan as any)?.disbursement_status, isDwollaEnabled, loan?.funds_sent]);

  /* -------------------------------------------
     Actions (full functionality kept)
  -------------------------------------------- */
  const handleSendReminder = async (paymentId?: string) => {
    if (!loan) return;

    setSendingReminder(true);
    try {
      const response = await fetch(`/api/loans/${loan.id}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_id: loan.id,
          payment_id: paymentId,
          message: reminderMessage,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send reminder');
      }

      showToast({ type: 'success', title: 'Reminder Sent', message: 'Payment reminder sent to borrower' });
      setShowReminderModal(false);
      setReminderMessage('');

      // Refresh schedule to show updated reminder timestamp
      const supabase = createClient();
      const { data: scheduleData } = await supabase
        .from('payment_schedule')
        .select('*')
        .eq('loan_id', loan.id)
        .order('due_date', { ascending: true });
      setSchedule(scheduleData || []);
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      showToast({ type: 'error', title: 'Failed to Send', message: error.message || 'Failed to send reminder. Please try again.' });
    } finally {
      setSendingReminder(false);
    }
  };

  const handleAcceptLoan = async () => {
    if (!loan) return;

    try {
      const response = await fetch(`/api/loans/${loan.id}/accept`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.redirectUrl) {
        router.push(data.redirectUrl);
      } else if (response.ok) {
        // Update loan state directly
        setLoan((prev) => (prev ? ({ ...prev, status: 'active' as any } as any) : null));
        showToast({ type: 'success', title: 'Loan Accepted', message: 'The loan has been accepted successfully' });
        // Refetch full data
        router.refresh();
      } else {
        showToast({ type: 'error', title: 'Failed', message: data.error || 'Failed to accept loan' });
      }
    } catch (error) {
      console.error('Error accepting loan:', error);
      showToast({ type: 'error', title: 'Error', message: 'Failed to accept loan. Please try again.' });
    }
  };

  // Open decline confirmation dialog
  const handleDeclineLoan = () => {
    if (!loan) return;
    setShowDeclineDialog(true);
  };

  // Execute decline loan (called when dialog is confirmed)
  const executeDeclineLoan = async () => {
    if (!loan) return;
    setShowDeclineDialog(false);

    try {
      const response = await fetch(`/api/loans/${loan.id}/decline`, {
        method: 'POST',
      });

      if (response.ok) {
        // Update loan state directly
        setLoan((prev) => (prev ? ({ ...prev, status: 'declined' as any } as any) : null));
        showToast({ type: 'info', title: 'Loan Declined', message: 'The loan request has been declined' });
        // Navigate to dashboard after short delay to show updated state
        setTimeout(() => router.push('/dashboard'), 500);
      } else {
        const data = await response.json();
        showToast({ type: 'error', title: 'Failed', message: data.error || 'Failed to decline loan' });
      }
    } catch (error) {
      console.error('Error declining loan:', error);
      showToast({ type: 'error', title: 'Error', message: 'Failed to decline loan. Please try again.' });
    }
  };

  // Open cancel confirmation dialog
  const handleCancelLoan = () => {
    if (!loan) return;
    setShowCancelDialog(true);
  };

  // Execute cancel loan (called when dialog is confirmed)
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
      console.error('Error cancelling loan:', error);
      showToast({ type: 'error', title: 'Error', message: 'Failed to cancel loan request' });
    }
  };

  // Open confirmation dialog for payment processing
  const handleProcessPayment = (paymentId: string) => {
    if (!loan || !user) return;

    const isBorrowerForPayment = loan.borrower_id === user.id;
    setPaymentConfirmDialog({
      isOpen: true,
      paymentId,
      isBorrower: isBorrowerForPayment,
    });
  };

  // Execute the actual payment processing (called when dialog is confirmed)
  const executeProcessPayment = async () => {
    const { paymentId, isBorrower } = paymentConfirmDialog;
    if (!loan || !paymentId) return;

    // Close dialog first
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
        const successMessage = isBorrower
          ? 'Payment submitted! The transfer will complete in 1-3 business days.'
          : `Payment processed successfully!`;
        showToast({ type: 'success', title: 'Payment Successful', message: successMessage });
        // Refresh data - refetch schedule and loan
        const supabase = createClient();
        const { data: scheduleData } = await supabase
          .from('payment_schedule')
          .select('*')
          .eq('loan_id', loan.id)
          .order('due_date', { ascending: true });
        setSchedule(scheduleData || []);

        // Refetch loan data
        const { data: loanData } = await supabase
          .from('loans')
          .select('*')
          .eq('id', loan.id)
          .single();
        if (loanData) {
          setLoan((prev) => ({ ...prev, ...loanData }));
        }
      } else {
        showToast({ type: 'error', title: 'Payment Failed', message: data.error || 'Failed to process payment' });
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      showToast({ type: 'error', title: 'Error', message: error.message || 'Failed to process payment' });
    } finally {
      setProcessingPayment(null);
    }
  };

  // Open manual payment modal for borrower (when Dwolla is not enabled)
  const handleOpenManualPayment = (paymentId: string) => {
    setManualPaymentId(paymentId);
    setManualPaymentMethod('');
    setManualPaymentReference('');
    setManualPaymentProofFile(null);
    setManualPaymentProofPreview(null);
    setShowManualPaymentModal(true);
  };

  // Handle file selection for manual payment proof
  const handleManualPaymentProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setManualPaymentProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setManualPaymentProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit manual payment with proof
  const handleSubmitManualPayment = async () => {
    if (!loan || !manualPaymentId || !manualPaymentMethod || !manualPaymentProofFile) {
      showToast({ type: 'warning', title: 'Required Fields', message: 'Please select payment method and upload proof' });
      return;
    }

    setSubmittingManualPayment(true);
    try {
      // Upload proof image to Supabase Storage
      const fileExt = manualPaymentProofFile.name.split('.').pop();
      const fileName = `${user?.id}_${manualPaymentId}_${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('loan-documents').upload(filePath, manualPaymentProofFile);

      let proofUrl = null;
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('loan-documents').getPublicUrl(filePath);
        proofUrl = publicUrl;
      }

      // Calculate platform fee if enabled
      const payment = schedule.find(p => p.id === manualPaymentId);
      const feeCalc = feeSettings?.enabled && payment ? calculateFee(payment.amount) : null;
      const platformFee = feeCalc?.platformFee || 0;

      // Call API to process manual payment (uses service role to bypass RLS)
      const response = await fetch('/api/payments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: loan.id,
          paymentId: manualPaymentId,
          paymentMethod: manualPaymentMethod,
          transactionReference: manualPaymentReference || null,
          proofUrl,
          platformFee,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process payment');
      }

      // Update local state with new amounts from API response
      if (result.success) {
        setLoan(prev => prev ? {
          ...prev,
          amount_paid: result.newAmountPaid,
          amount_remaining: result.newAmountRemaining,
          status: result.isComplete ? 'completed' : prev.status,
        } : prev);
      }

      showToast({ type: 'success', title: 'Payment Submitted', message: 'Your payment has been recorded. The lender will be notified.' });
      
      // Close modal and refresh data
      setShowManualPaymentModal(false);
      setManualPaymentId(null);
      setManualPaymentMethod('');
      setManualPaymentReference('');
      setManualPaymentProofFile(null);
      setManualPaymentProofPreview(null);
      
      refetchLoan();
      refetchSchedule();
    } catch (error: any) {
      console.error('Error submitting manual payment:', error);
      showToast({ type: 'error', title: 'Error', message: error.message || 'Failed to submit payment' });
    } finally {
      setSubmittingManualPayment(false);
    }
  };

  const handleSendFunds = async () => {
    if (!loan) return;

    // Require proof of payment
    if (!fundsProofFile) {
      showToast({ type: 'warning', title: 'Proof Required', message: 'Please upload a screenshot proof of payment' });
      return;
    }

    setFundsSending(true);
    try {
      const supabase = createClient();

      // Upload proof image to Supabase Storage
      const fileExt = fundsProofFile.name.split('.').pop();
      const fileName = `${loan.id}_${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('loan-documents').upload(filePath, fundsProofFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // Continue anyway - the API will work without the proof URL
      }

      // Get public URL for the proof
      let proofUrl = null;
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('loan-documents').getPublicUrl(filePath);
        proofUrl = publicUrl;
      }

      const response = await fetch(`/api/loans/${loan.id}/funds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: fundsPaymentMethod,
          reference: fundsReference,
          proof_url: proofUrl,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update loan state
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
        const error = await response.json();
        showToast({ type: 'error', title: 'Failed', message: error.error || 'Failed to confirm funds sent' });
      }
    } catch (error) {
      console.error('Error sending funds:', error);
      showToast({ type: 'error', title: 'Error', message: 'Failed to confirm funds sent' });
    } finally {
      setFundsSending(false);
    }
  };

  /* -------------------------------------------
     Vouch for borrower (lender only, on completed loans)
  -------------------------------------------- */
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
          relationship: 'lender', // Special relationship type with higher weight
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
          message: `You've vouched for ${(loan.borrower as any)?.full_name || 'this borrower'}. This helps build their trust score.` 
        });
      } else {
        const data = await response.json();
        showToast({ type: 'error', title: 'Error', message: data.error || 'Failed to create vouch' });
      }
    } catch (error) {
      console.error('Error creating vouch:', error);
      showToast({ type: 'error', title: 'Error', message: 'Failed to create vouch' });
    } finally {
      setVouchingForBorrower(false);
    }
  };

  /* -------------------------------------------
     Early return - must be after all hooks
  -------------------------------------------- */
  if (isLoading || !loan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="animate-pulse text-neutral-500 dark:text-neutral-400">Loading...</div>
      </div>
    );
  }

  /* -------------------------------------------
     Small UI sections (professional + compact)
  -------------------------------------------- */
  const TransferBanner = () => {
    if (!transferStatus || transferStatus.status === 'not_started') return null;

    const base =
      transferStatus.status === 'completed'
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        : transferStatus.status === 'failed'
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';

    // Adjust title based on whether Dwolla (ACH) is enabled
    const title =
      transferStatus.status === 'completed'
        ? isBorrower
          ? 'Funds received'
          : 'Funds sent'
        : transferStatus.status === 'failed'
        ? 'Transfer failed'
        : isDwollaEnabled 
          ? 'Transfer in progress'
          : 'Payment pending';

    const icon =
      transferStatus.status === 'completed'
        ? CheckCircle
        : transferStatus.status === 'failed'
        ? XCircle
        : Clock;

    const Icon = icon;

    const minimizedKey = 'funds-status';
    const minimized = minimizedNotifications.has(minimizedKey);

    return (
      <div className={`rounded-2xl border ${base} mb-6`}>
        {minimized ? (
          <button
            onClick={() => toggleNotification(minimizedKey)}
            className="w-full p-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition"
          >
            <div className="flex items-center gap-2">
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm">{title}</span>
              <span className="text-sm opacity-80">• {formatCurrency(loan.amount, loan.currency)}</span>
            </div>
            <ChevronDown className="w-4 h-4 opacity-70" />
          </button>
        ) : (
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white/60 dark:bg-white/10">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">{title}</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">{transferStatus.statusMessage}</p>

                  {transferStatus.timeline && transferStatus.status === 'processing' && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                      Expected arrival: {transferStatus.timeline.estimatedDate} (
                      {transferStatus.timeline.minDays}-{transferStatus.timeline.maxDays} days)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={fetchTransferStatus}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <button
                  onClick={() => toggleNotification(minimizedKey)}
                  className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
                  title="Minimize"
                >
                  <ChevronUp className="w-4 h-4 opacity-70" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* -------------------------------------------
     Page
  -------------------------------------------- */
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <Navbar user={user} />

      <main className="flex-1 pb-safe">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Top bar - compact on mobile */}
          <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>

            <div className="flex items-center gap-2">
              {/* Reconcile balance if loan is active but all payments are paid */}
              {loan.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2 sm:px-3 text-amber-600 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/20"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/loans/reconcile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ loan_id: loan.id }),
                      });
                      const data = await res.json();
                      if (data.reconciled) {
                        showToast({ type: 'success', title: 'Balance corrected', message: `Updated to ${data.now.status}` });
                      }
                      await refetchLoan();
                      await refetchSchedule();
                    } catch (e) {
                      showToast({ type: 'error', title: 'Recalculation failed', message: 'Please try again' });
                    }
                  }}
                  title="Recalculate balance from payment history"
                >
                  <RefreshCw className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Recalculate</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="px-2 sm:px-3"
                onClick={async () => {
                  await refetchLoan();
                  await refetchSchedule();
                  await fetchTransferStatus();
                }}
              >
                <RefreshCw className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              {loan.lender_type === 'personal' && (loan as any).borrower_token && (
                <Button
                  size="sm"
                  className="px-2 sm:px-3"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/loan-request/${loan.id}`;
                    navigator.clipboard.writeText(shareUrl);
                    showToast({ type: 'success', title: 'Link Copied!', message: 'Share this link with someone who can help' });
                  }}
                >
                  <Share2 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
              )}
            </div>
          </div>

          {/* Header card - compact on mobile */}
          <Card className="mb-4 sm:mb-6 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Avatar name={otherPartyName} size="lg" className="w-12 h-12 sm:w-14 sm:h-14" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white truncate">
                        {otherPartyName}
                      </h1>
                      <Badge variant={statusColor} size="md">
                        <StatusIcon className="w-4 h-4 mr-1" />
                        {statusLabel}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {isBorrower ? 'Lender' : 'Borrower'} • {loan.lender_type === 'business' ? 'Business' : 'Personal'}
                      </p>
                      
                      {/* Add View Profile button for lenders */}
                      {isLender && loan?.borrower_id && (
                        <button
                          onClick={() => setTab('borrower-profile')}
                          className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                        >
                          View Profile
                        </button>
                      )}
                    </div>
                    
                    {loan.created_at && (
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                        Requested {formatDate(loan.created_at)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stat cards - responsive grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full lg:w-auto">
                  <div className="rounded-xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400">Principal</p>
                    <p className="text-sm sm:text-lg font-bold text-neutral-900 dark:text-white truncate">
                      {formatCurrency(loan.amount, loan.currency)}
                    </p>
                  </div>
                  <div className="rounded-xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400">Paid</p>
                    <p className="text-sm sm:text-lg font-bold text-primary-600 dark:text-primary-400 truncate">
                      {formatCurrency(loan.amount_paid, loan.currency)}
                    </p>
                  </div>
                  <div className="rounded-xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400">Remaining</p>
                    <p className="text-sm sm:text-lg font-bold text-neutral-800 dark:text-neutral-200 truncate">
                      {formatCurrency(loan.amount_remaining, loan.currency)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Fee Information for Active Loans */}
              {loan.status === 'active' && feeSettings?.enabled && !feeLoading && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-200">Platform Fee Information</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        {isBorrower 
                          ? `A platform fee is applied to each payment. The lender receives the net amount after fees.`
                          : `A platform fee of ${feeSettings.type === 'fixed' 
                              ? formatCurrency(feeSettings.fixed_amount, loan.currency)
                              : feeSettings.type === 'combined'
                              ? `${feeSettings.percentage}% + ${formatCurrency(feeSettings.fixed_amount, loan.currency)}`
                              : `${feeSettings.percentage}%`} is deducted from each payment you receive.`
                        }
                        {feeSettings.min_fee > 0 && ` Minimum fee: ${formatCurrency(feeSettings.min_fee, loan.currency)}.`}
                        {feeSettings.max_fee > 0 && ` Maximum fee: ${formatCurrency(feeSettings.max_fee, loan.currency)}.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* No Match Found Banner - for both business and personal loans */}
              {loan.match_status === 'no_match' && !loan.lender_id && !loan.business_lender_id && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-orange-800 dark:text-orange-300">No Matching Lenders Found</h3>
                      <p className="text-orange-700 dark:text-orange-400 text-sm mt-1">
                        {loan.lender_type === 'business'
                          ? `We couldn't find a business lender for your ${formatCurrency(loan.amount, loan.currency)} request at this time.`
                          : `We couldn't automatically match your ${formatCurrency(loan.amount, loan.currency)} loan request.`}
                      </p>
                      <div className="mt-3 p-3 bg-white dark:bg-neutral-800 rounded-lg border border-orange-100 dark:border-orange-900">
                        <p className="text-sm text-neutral-700 dark:text-neutral-300 font-medium mb-2">What you can do:</p>
                        <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                          {loan.lender_type === 'business' ? (
                            <>
                              <li>• Try a smaller amount to build your borrowing history</li>
                              <li>• Request from a friend or family member instead</li>
                              <li>• Check back later as new lenders join regularly</li>
                            </>
                          ) : (
                            <>
                              <li>• Share your loan request link with friends or family who might help</li>
                              <li>• Try requesting from a specific person via their email or username</li>
                              <li>• Switch to business lending to find available lenders</li>
                            </>
                          )}
                        </ul>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-4">
                        {loan.lender_type === 'personal' && loan.borrower_token && (
                          <Button
                            size="sm"
                            onClick={() => {
                              const shareUrl = `${window.location.origin}/loan-request/${loan.id}`;
                              navigator.clipboard.writeText(shareUrl);
                              showToast({ type: 'success', title: 'Link Copied!', message: 'Share this link with someone who can help' });
                            }}
                          >
                            <Share2 className="w-4 h-4 mr-2" />
                            Copy Share Link
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={loan.lender_type === 'personal' ? 'outline' : 'default'}
                          onClick={() => router.push('/loans/new')}
                        >
                          Try Different Amount
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Retry matching
                            fetch('/api/matching', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ loan_id: loan.id }),
                            }).then(() => window.location.reload());
                          }}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Retry Matching
                        </Button>
                        {isBorrower && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30"
                            onClick={handleCancelLoan}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancel Request
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transfer banner */}
              <TransferBanner />

              {/* Pending action banner (compact) */}
              {loan.status === 'pending' && loan.match_status !== 'no_match' && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                        <Clock className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                      </div>
                      <div>
                        <p className="font-semibold text-amber-900 dark:text-amber-200">
                          {isBorrower ? 'Awaiting lender response' : 'Loan request pending your review'}
                        </p>
                        <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
                          {isBorrower
                            ? loan.lender_type === 'personal'
                              ? `Your loan request has been sent to ${(loan as any).invite_username ? `~${(loan as any).invite_username}` : (loan as any).invite_email || 'the lender'}. They will receive an email to accept or decline.`
                              : "Your loan request is being reviewed by the lender. You'll be notified once they respond."
                            : `${(loan.borrower as any)?.full_name || 'A borrower'} has requested a loan of ${formatCurrency(loan.amount, loan.currency)}.`}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {isLender ? (
                        <>
                          <Button variant="outline" onClick={handleDeclineLoan}>
                            <XCircle className="w-4 h-4 mr-2" />
                            Decline
                          </Button>
                          <Button onClick={handleAcceptLoan}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30"
                          onClick={handleCancelLoan}
                        >
                          Cancel Request
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-Pay Status */}
              {loan.status === 'active' && (loan as any).auto_pay_enabled && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <h3 className="font-semibold text-green-900 dark:text-green-300">✅ Auto-Pay Enabled</h3>
                        <p className="text-sm text-green-700 dark:text-green-400">
                          {isBorrower
                            ? 'Payments will be automatically deducted from your bank on each due date.'
                            : 'Payments will be automatically deposited to your bank on each due date.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Lender Payment Section - Show when lender hasn't sent payment yet */}
              {loan.status === 'active' && !loan.funds_sent && isLender && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Banknote className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">Action Required: Fund This Loan</h3>
                  </div>

                  <p className="text-yellow-700 dark:text-yellow-400 text-sm mb-4">
                    Send <strong>{formatCurrency(loan.amount, loan.currency)}</strong> to{' '}
                    <strong>{(loan.borrower as any)?.full_name || 'the borrower'}</strong>
                  </p>

                  {/* Check if borrower has bank connected for ACH */}
                  {(() => {
                    const borrowerBankConnected =
                      (loan as any).borrower_bank_connected ||
                      (loan as any).borrower_dwolla_funding_source_url ||
                      (loan.borrower as any)?.dwolla_funding_source_url;
                    const borrowerBankName = (loan as any).borrower_bank_name || (loan.borrower as any)?.bank_name;
                    const borrowerBankMask = (loan as any).borrower_bank_account_mask || (loan.borrower as any)?.bank_account_mask;

                    if (isDwollaEnabled && borrowerBankConnected) {
                      return (
                        <div className="mb-4">
                          <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-green-500 dark:bg-green-600 rounded-lg flex items-center justify-center">
                                <Building className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-green-800 dark:text-green-300">Borrower's Bank Connected ✓</p>
                                <p className="text-sm text-green-700 dark:text-green-400">
                                  {borrowerBankName ? `${borrowerBankName}` : 'Bank account'}
                                  {borrowerBankMask && ` (••••${borrowerBankMask})`}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-green-700 dark:text-green-400 mb-3">
                              Funds will be transferred directly via ACH (1-3 business days).
                            </p>
                            <Button
                              onClick={() => router.push(`/loans/${loan.id}/fund`)}
                              className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                            >
                              <Banknote className="w-4 h-4 mr-2" />
                              Fund This Loan
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    // Fallback to manual payment methods if no bank connected
                      const borrower = loan.borrower as any;

                      // Check for payment methods in new table OR legacy fields
                      const paymentMethods = borrower?.payment_methods || [];
                      const hasNewMethod = paymentMethods.some((m: any) => m.is_active && ['paypal', 'cashapp', 'venmo', 'zelle'].includes(m.payment_provider?.slug));
                      const hasLegacyMethod = borrower?.paypal_email || borrower?.cashapp_username || borrower?.venmo_username || borrower?.zelle_email || borrower?.zelle_phone;

                      if (hasNewMethod || hasLegacyMethod) {
                        // Prefer default method from new table, fall back to preferred_payment_method or first available
                        let methodToShow: string | null = null;  // <-- Changed from undefined to null
                        let methodData: any = null;

                        if (hasNewMethod) {
                          const defaultMethod = paymentMethods.find((m: any) => m.is_default && m.is_active);
                          const firstActive = paymentMethods.find((m: any) => m.is_active);
                          const selectedMethod = defaultMethod || firstActive;

                          if (selectedMethod?.payment_provider?.slug) {
                            methodToShow = selectedMethod.payment_provider.slug;
                            methodData = selectedMethod;
                          }
                        }

                        if (!methodToShow) {
                          // Fall back to legacy fields
                          const preferred = borrower?.preferred_payment_method;
                          methodToShow = preferred || null;
                          if (!methodToShow) {
                            if (borrower?.paypal_email) methodToShow = 'paypal';
                            else if (borrower?.cashapp_username) methodToShow = 'cashapp';
                            else if (borrower?.venmo_username) methodToShow = 'venmo';
                            else if (borrower?.zelle_email || borrower?.zelle_phone) methodToShow = 'zelle';
                          }
                        }

                        // Define method configs with proper typing
                        const methodConfigs: Record<string, {
                          bg: string;
                          icon: React.ReactNode;
                          name: string;
                          value: string | undefined;
                          accountName?: string;
                          getLink: (amount: number) => string;
                        }> = {
                          paypal: {
                            bg: 'bg-[#0070ba] dark:bg-[#003087]',
                            icon: <CreditCard className="w-6 h-6 text-white" />,
                            name: 'PayPal',
                            value: methodData?.account_identifier || borrower?.paypal_email,
                            getLink: (amount) => {
                              const handle = borrower?.paypal_email?.includes('@')
                                ? borrower?.paypal_email?.split('@')[0]
                                : borrower?.paypal_email;
                              return `https://paypal.me/${handle}/${amount.toFixed(2)}`;
                            },
                          },
                          cashapp: {
                            bg: 'bg-[#00D632] dark:bg-[#00A826]',
                            icon: <span className="text-white font-bold text-2xl">$</span>,
                            name: 'Cash App',
                            value: methodData?.account_identifier || borrower?.cashapp_username,
                            getLink: (amount) => {
                              const cashtag = borrower?.cashapp_username?.replace(/^\$/, '').trim();
                              return `https://cash.app/$${cashtag}/${amount.toFixed(2)}`;
                            },
                          },
                          venmo: {
                            bg: 'bg-[#3D95CE] dark:bg-[#2a6a9a]',
                            icon: <span className="text-white font-bold text-2xl">V</span>,
                            name: 'Venmo',
                            value: methodData?.account_identifier || borrower?.venmo_username,
                            getLink: (amount) => {
                              const username = borrower?.venmo_username?.replace(/^@/, '').trim();
                              const note = encodeURIComponent(`Loan Disbursement - ${loan.purpose || 'Feyza'}`);
                              return `https://venmo.com/${username}?txn=pay&amount=${amount.toFixed(2)}&note=${note}`;
                            },
                          },
                          zelle: {
                            bg: 'bg-[#6D1ED4]',
                            icon: <span className="text-white font-bold text-2xl">Z</span>,
                            name: 'Zelle',
                            value: methodData?.account_identifier || borrower?.zelle_email || borrower?.zelle_phone,
                            accountName: methodData?.account_name,
                            getLink: (_amount) => '', // Zelle has no web link
                          },
                        };

                        // Only proceed if we have a valid method
                        if (methodToShow && methodConfigs[methodToShow]) {
                          const config = methodConfigs[methodToShow];
                          if (config && config.value) {
                            return (
                              <>
                                <div className="mb-4">
                                  <div className={`${config.bg} rounded-xl p-4 text-white`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                                          {config.icon}
                                        </div>
                                        <div>
                                          <p className="text-white/80 text-sm">Send via {config.name}</p>
                                          <p className="font-bold text-xl">{config.value}</p>
                                        </div>
                                      </div>
                                      {config.getLink(loan.amount) ? (
                                        <a
                                          href={config.getLink(loan.amount)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-6 py-3 bg-white text-neutral-900 rounded-lg font-semibold hover:bg-neutral-100 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors flex items-center gap-2"
                                        >
                                          Open {config.name} <ExternalLink className="w-4 h-4" />
                                        </a>
                                      ) : (
                                        <div className="text-white/80 text-xs text-right">
                                          {methodToShow === 'zelle' && config.accountName && (
                                            <div className="font-semibold mb-1">{config.accountName}</div>
                                          )}
                                          {methodToShow === 'zelle' && (borrower?.zelle_email || methodData?.account_identifier?.includes?.('@')) && (
                                            <div className="mb-0.5">📧 {borrower?.zelle_email || methodData?.account_identifier}</div>
                                          )}
                                          {methodToShow === 'zelle' && borrower?.zelle_phone && (
                                            <div className="mb-1">📱 {borrower.zelle_phone}</div>
                                          )}
                                          <div className="text-[10px] opacity-70">Open your bank app</div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  onClick={() => setShowFundsModal(true)}
                                  className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  I've Sent the Payment - Upload Proof
                                </Button>
                              </>
                            );
                          }
                        }
                      }

                    // No payment method available
                    return (
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                        <p className="text-orange-700 dark:text-orange-400 text-sm">
                          ⚠️ Borrower needs to connect their bank account to receive funds. They can do this in Settings.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Borrower Waiting Section - Show when borrower is waiting for payment */}
              {loan.status === 'active' && !loan.funds_sent && isBorrower && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-blue-800 dark:text-blue-300">Waiting for Lender to Send Funds</h3>
                  </div>
                  <p className="text-blue-700 dark:text-blue-400 text-sm mb-3">
                    Your loan has been approved! The lender will send <strong>{formatCurrency(loan.amount, loan.currency)}</strong> to you via
                    ACH transfer. You'll be notified once the transfer is initiated.
                  </p>

                  {/* Show borrower's bank info */}
                  <div className="bg-white/60 dark:bg-white/10 rounded-lg p-3 text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-300 mb-2">Your receiving account:</p>
                    {(() => {
                      const bankConnected =
                        (loan as any).borrower_bank_connected ||
                        (loan as any).borrower_dwolla_funding_source_url ||
                        (loan.borrower as any)?.dwolla_funding_source_url;
                      const bankName = (loan as any).borrower_bank_name || (loan.borrower as any)?.bank_name;
                      const bankMask = (loan as any).borrower_bank_account_mask || (loan.borrower as any)?.bank_account_mask;

                      if (bankConnected) {
                        return (
                          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                            <Building className="w-4 h-4" />
                            <span>
                              {bankName || 'Bank Account'} {bankMask && `(••••${bankMask})`}
                            </span>
                            <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                          </div>
                        );
                      }

                      return (
                        <p className="text-amber-600 dark:text-amber-400">
                          ⚠️ No bank account connected. <Link href="/settings" className="underline">Connect your bank →</Link>
                        </p>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Tabs - mobile-first sticky navigation */}
          <div className="sticky top-0 sm:top-[64px] z-30 -mx-3 sm:mx-0 mb-4 sm:mb-6">
            <div className="sm:rounded-2xl border-b sm:border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-lg shadow-sm px-2 sm:px-3 py-1.5 sm:py-2">
              <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                <TabButton 
                  active={tab === 'overview'} 
                  onClick={() => setTab('overview')} 
                  icon={FileText} 
                  label="Overview"
                />
                
                <TabButton
                  active={tab === 'timeline'}
                  onClick={() => setTab('timeline')}
                  icon={Calendar}
                  label="Timeline"
                  badge={schedule.length > 0 ? schedule.length : undefined}
                />
                
                <TabButton
                  active={tab === 'payments'}
                  onClick={() => setTab('payments')}
                  icon={CreditCard}
                  label="Payments"
                  badge={unpaidCount > 0 ? unpaidCount : undefined}
                />
                
                {hasTermsTab && (
                  <TabButton 
                    active={tab === 'terms'} 
                    onClick={() => setTab('terms')} 
                    icon={FileText} 
                    label="Terms"
                  />
                )}
                
                {hasAgreementTab && (
                  <TabButton 
                    active={tab === 'agreement'} 
                    onClick={() => setTab('agreement')} 
                    icon={FileText} 
                    label="Agreement"
                  />
                )}
                
                {hasRemindersTab && (
                  <TabButton 
                    active={tab === 'reminders'} 
                    onClick={() => setTab('reminders')} 
                    icon={Bell} 
                    label="Reminders"
                  />
                )}
                
                {isLender && (
                  <TabButton
                    active={tab === 'borrower-profile'}
                    onClick={() => setTab('borrower-profile')}
                    icon={User}
                    label="Profile"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Tab content */}
          {tab === 'overview' && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* LEFT: Loan details */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <FileText className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                  </div>
                  <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">Loan details</h2>
                </div>

                {/* Borrower Rating Section for Lender */}
                {isLender && loan?.borrower_id && (
                  <div className="space-y-4 mb-4">
                    {/* Trust Score Card */}
                    <div className="">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-neutral-900 dark:text-white">Borrower Trust Score</h3>
                      </div>
                      <TrustScoreCard userId={loan.borrower_id} showDetails={true} showVouches={true} />
                    </div>

                    {/* Legacy Borrower Rating (Payment History) */}
                    <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-neutral-900 dark:text-white">Payment History</h3>
                        {loadingBorrowerRating && <div className="text-xs text-neutral-500">Loading...</div>}
                      </div>

                    {borrowerRatingData ? (
                      <BorrowerRatingCard
                        rating={borrowerRatingData.rating?.overall || 'neutral'}
                        paymentStats={
                          borrowerRatingData.paymentHistory
                            ? {
                                total: borrowerRatingData.paymentHistory.totalPayments,
                                onTime: borrowerRatingData.paymentHistory.onTime,
                                early: borrowerRatingData.paymentHistory.early,
                                late: borrowerRatingData.paymentHistory.late,
                                missed: borrowerRatingData.paymentHistory.missed,
                              }
                            : undefined
                        }
                        loansCompleted={borrowerRatingData.loanHistory?.totalCompleted || 0}
                        memberMonths={borrowerRatingData.borrower?.monthsAsMember || 0}
                        isVerified={borrowerRatingData.borrower?.isVerified}
                      />
                    ) : (
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">No rating information available</div>
                    )}

                    {borrowerRatingData?.recommendation && (
                      <div
                        className={`mt-3 p-3 rounded-lg text-sm ${
                          borrowerRatingData.rating?.overall === 'great' || borrowerRatingData.rating?.overall === 'good'
                            ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                            : borrowerRatingData.rating?.overall === 'poor' ||
                              borrowerRatingData.rating?.overall === 'bad' ||
                              borrowerRatingData.rating?.overall === 'worst'
                            ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                            : 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        <strong>Recommendation:</strong> {borrowerRatingData.recommendation}
                      </div>
                    )}
                    </div>
                  </div>
                )}

                {/* Borrower Status Section for Borrower */}
                {isBorrower && (
                  <div className="space-y-4">
                    <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="font-semibold text-neutral-900 dark:text-white">Your Status</h3>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600 dark:text-neutral-400">Loan Status:</span>
                          <Badge variant={statusColor}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusLabel}
                          </Badge>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600 dark:text-neutral-400">Progress:</span>
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {Math.round(progress)}% ({paidCount}/{schedule.length} payments)
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600 dark:text-neutral-400">Next Payment:</span>
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {nextPayment ? formatCurrency(nextPayment.amount, loan.currency) : 'None'}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600 dark:text-neutral-400">Due Date:</span>
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {nextPayment ? formatDate(nextPayment.due_date) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Borrower's Own Trust Score */}
                    <div className="">
                      <h3 className="font-semibold text-neutral-900 dark:text-white mb-3">Your Trust Score</h3>
                      <TrustScoreCard showDetails={true} showVouches={true} className='mb-4'/>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                    <div>
                      <p className="text-neutral-500 dark:text-neutral-400">Repayment schedule</p>
                      <p className="text-neutral-900 dark:text-white">
                        {formatCurrency(loan.repayment_amount, loan.currency)} / {loan.repayment_frequency}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                    <div>
                      <p className="text-neutral-500 dark:text-neutral-400">Start date</p>
                      <p className="text-neutral-900 dark:text-white">{formatDate(loan.start_date)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                    <div>
                      <p className="text-neutral-500 dark:text-neutral-400">Purpose</p>
                      <p className="text-neutral-900 dark:text-white">{loan.purpose || '—'}</p>
                    </div>
                  </div>

                  {loan.pickup_person_name ? (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                      <div>
                        <p className="text-neutral-500 dark:text-neutral-400">Pickup person</p>
                        <p className="text-neutral-900 dark:text-white">
                          {loan.pickup_person_name}
                          {loan.pickup_person_location && ` (${loan.pickup_person_location})`}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {loan.interest_rate > 0 && (
                  <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="grid md:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4">
                        <p className="text-neutral-500 dark:text-neutral-400">Interest rate</p>
                        <p className="font-semibold text-neutral-900 dark:text-white">
                          {loan.interest_rate}% APR ({loan.interest_type})
                        </p>
                      </div>

                      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4">
                        <p className="text-neutral-500 dark:text-neutral-400">Total interest</p>
                        <p className="font-semibold text-orange-600 dark:text-orange-400">
                          {formatCurrency(loan.total_interest, loan.currency)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4">
                        <p className="text-neutral-500 dark:text-neutral-400">Total to repay</p>
                        <p className="font-semibold text-neutral-900 dark:text-white">
                          {formatCurrency(loan.total_amount, loan.currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* RIGHT: Quick actions */}
              <Card className="lg:sticky lg:top-6 h-fit">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <Lock className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                  </div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Quick actions</h3>
                </div>

                <div className="space-y-2">
                  {schedule.length > 0 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const unpaidPayments = schedule
                          .filter((p) => !p.is_paid)
                          .map((p) => ({
                            id: p.id,
                            title: `💰 Feyza Payment Due - ${formatCurrency(p.amount, loan.currency)}`,
                            amount: p.amount,
                            currency: loan.currency,
                            dueDate: p.due_date,
                            lenderName: otherPartyName,
                            description: `Loan repayment for ${loan.purpose || 'personal loan'}`,
                          }));
                        downloadICalFile(unpaidPayments, loan.purpose);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Add to calendar
                    </Button>
                  )}

                  {loan.status === 'active' && isBorrower && 
                   ((loan as any).disbursement_status === 'completed' || (!isDwollaEnabled && loan.funds_sent)) && 
                   nextPayment && (
                    <Button className="w-full" onClick={() => isDwollaEnabled ? handleProcessPayment(nextPayment.id) : handleOpenManualPayment(nextPayment.id)}>
                      {isDwollaEnabled ? (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay next installment
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Mark payment as paid
                        </>
                      )}
                    </Button>
                  )}

                  {loan.status === 'active' && isLender && !loan.funds_sent && (
                    <Button className="w-full" onClick={() => setShowFundsModal(true)}>
                      <Banknote className="w-4 h-4 mr-2" />
                      Confirm funds sent
                    </Button>
                  )}

                  {isLender && loan.status === 'active' && loan.funds_sent && (
                    <Button variant="outline" className="w-full" onClick={() => setShowReminderModal(true)}>
                      <Bell className="w-4 h-4 mr-2" />
                      Send reminder
                    </Button>
                  )}
                </div>

                <div className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-center gap-2 text-center">
                  <Lock className="w-4 h-4" />
                  Your information is secure and never shared without your consent.
                </div>
              </Card>
              
              {/* Vouch Prompt for Completed Loans (Lender Only) */}
              {isLender && loan.status === 'completed' && (
                <Card className="lg:sticky lg:top-6 h-fit mt-4 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-neutral-900 border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-800/50">
                      <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white">Build Trust Together</h3>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Your vouch as a lender carries significant weight
                      </p>
                    </div>
                  </div>
                  
                  {hasVouchedForBorrower ? (
                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 p-3 bg-purple-100/50 dark:bg-purple-900/30 rounded-lg">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">You've vouched for this borrower!</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
                        This loan was repaid successfully. Vouch for {(loan.borrower as any)?.full_name?.split(' ')[0] || 'this borrower'} to boost their trust score.
                      </p>
                      <Button
                        onClick={() => setShowVouchModal(true)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Award className="w-4 h-4 mr-2" />
                        Vouch for {(loan.borrower as any)?.full_name?.split(' ')[0] || 'Borrower'}
                      </Button>
                    </>
                  )}
                </Card>
              )}
            </div>
          )}

          {tab === 'timeline' && (
            <Card className="mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">Repayment timeline</h2>
                {schedule.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const unpaidPayments = schedule
                        .filter((p) => !p.is_paid)
                        .map((p) => ({
                          id: p.id,
                          title: `💰 Feyza Payment Due - ${formatCurrency(p.amount, loan.currency)}`,
                          amount: p.amount,
                          currency: loan.currency,
                          dueDate: p.due_date,
                          lenderName: otherPartyName,
                          description: `Loan repayment for ${loan.purpose || 'personal loan'}`,
                        }));
                      downloadICalFile(unpaidPayments, loan.purpose);
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Add to Calendar
                  </Button>
                )}
              </div>

              <LoanTimeline schedule={schedule} currency={loan.currency} />
            </Card>
          )}

          {tab === 'payments' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Next payment (borrower) - show when funds have been sent (either via ACH or manually) */}
              {loan.status === 'active' && isBorrower && 
               ((loan as any).disbursement_status === 'completed' || (!isDwollaEnabled && loan.funds_sent)) && 
               nextPayment && (
                <Card className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-display font-semibold text-neutral-900 dark:text-white">Make a payment</h2>
                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                        {isDwollaEnabled ? 'Pay early and stay ahead.' : 'Pay your lender and upload proof.'}
                      </p>
                    </div>
                    {isDwollaEnabled ? (
                      // Automatic payment via Dwolla/ACH
                      <Button 
                        onClick={() => handleProcessPayment(nextPayment.id)} 
                        disabled={processingPayment === nextPayment.id}
                        className="w-full sm:w-auto"
                      >
                        {processingPayment === nextPayment.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay {formatCurrency(nextPayment.amount, loan.currency)}
                          </>
                        )}
                      </Button>
                    ) : (
                      // Manual payment with proof upload
                      <Button onClick={() => handleOpenManualPayment(nextPayment.id)} className="w-full sm:w-auto">
                        <Upload className="w-4 h-4 mr-2" />
                        Mark as Paid
                      </Button>
                    )}
                  </div>

                  <div className="rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">Due date</p>
                        <p className="font-semibold text-sm sm:text-base text-neutral-900 dark:text-white">{formatDate(nextPayment.due_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">Amount</p>
                        <p className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white">{formatCurrency(nextPayment.amount, loan.currency)}</p>
                      </div>
                    </div>

                    {!isDwollaEnabled && (() => {
                      // Calculate total with platform fee if enabled
                      const feeCalc = feeSettings?.enabled ? calculateFee(nextPayment.amount) : null;
                      const totalToPay = feeCalc ? feeCalc.grossAmount : nextPayment.amount;
                      const platformFee = feeCalc?.platformFee || 0;
                      
                      // Get lender payment info
                      // CRITICAL: For business loans, ONLY use business payment methods (no fallback to personal)
                      const lenderProfile = loan.business_lender as any;
                      const personalLender = loan.lender as any;
                      
                      // Determine payment source
                      const paymentSource = loan.business_lender_id ? 'business' : 'personal';
                      
                      // Get payment methods from correct source (NO FALLBACK!)
                      let cashappUsername: string | null = null;
                      let venmoUsername: string | null = null;
                      let zelleEmail: string | null = null;
                      let zellePhone: string | null = null;
                      let zelleName: string | null = null;
                      let paypalEmail: string | null = null;
                      let preferredMethod: string | null = null;
                      
                      if (paymentSource === 'business' && lenderProfile) {
                        // Business loan - use ONLY business payment methods
                        cashappUsername = lenderProfile.cashapp_username;
                        venmoUsername = lenderProfile.venmo_username;
                        zelleEmail = lenderProfile.zelle_email;
                        zellePhone = lenderProfile.zelle_phone;
                        zelleName = lenderProfile.zelle_name || lenderProfile.business_name;
                        paypalEmail = lenderProfile.paypal_email;
                        preferredMethod = lenderProfile.preferred_payment_method;
                      } else if (paymentSource === 'personal' && personalLender) {
                        // Personal loan - use personal payment methods
                        cashappUsername = personalLender.cashapp_username;
                        venmoUsername = personalLender.venmo_username;
                        zelleEmail = personalLender.zelle_email;
                        zellePhone = personalLender.zelle_phone;
                        zelleName = personalLender.full_name;
                        paypalEmail = personalLender.paypal_email;
                        preferredMethod = personalLender.preferred_payment_method;
                      }
                      
                      // Clean usernames - remove $ or @ prefix if present
                      const cleanCashapp = cashappUsername?.replace(/^\$/, '').trim();
                      const cleanVenmo = venmoUsername?.replace(/^@/, '').trim();
                      
                      // Build payment note with loan info
                      const loanNote = `Loan Payment - ${loan.purpose || 'Feyza'}`;
                      const encodedNote = encodeURIComponent(loanNote);
                      
                      const amount = Number(totalToPay || 0);
                      const formattedAmount = Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
                      
                      // Zelle display - show email OR phone, plus name
                      const zelleDisplay = zelleEmail || zellePhone;
                      const zelleDetails = zelleEmail && zellePhone 
                        ? `${zelleEmail} or ${zellePhone}` 
                        : zelleDisplay;
                      
                      const hasAnyMethod = !!cleanCashapp || !!cleanVenmo || !!zelleDisplay || !!paypalEmail;
                      
                      // Payment methods config with proper deep links
                      const paymentMethods = [
                        {
                          key: 'cashapp',
                          name: 'Cash App',
                          available: !!cleanCashapp,
                          username: cleanCashapp,
                          displayName: `$${cleanCashapp}`,
                          // Cash App URL format: https://cash.app/$cashtag/amount
                          url: cleanCashapp ? `https://cash.app/$${cleanCashapp}/${formattedAmount}` : null,
                          emoji: '💵',
                          colors: {
                            default: 'bg-[#00D632]/10 hover:bg-[#00D632]/20 text-[#00D632] dark:text-[#00D632] border-[#00D632]/30',
                            preferred: 'bg-[#00D632] hover:bg-[#00C12D] text-white shadow-lg shadow-green-500/30',
                          },
                        },
                        {
                          key: 'venmo',
                          name: 'Venmo',
                          available: !!cleanVenmo,
                          username: cleanVenmo,
                          displayName: `@${cleanVenmo}`,
                          // Venmo URL with note: https://venmo.com/username?txn=pay&amount=X&note=Y
                          url: cleanVenmo ? `https://venmo.com/${cleanVenmo}?txn=pay&amount=${formattedAmount}&note=${encodedNote}` : null,
                          emoji: '💙',
                          colors: {
                            default: 'bg-[#008CFF]/10 hover:bg-[#008CFF]/20 text-[#008CFF] dark:text-[#008CFF] border-[#008CFF]/30',
                            preferred: 'bg-[#008CFF] hover:bg-[#0070CC] text-white shadow-lg shadow-blue-500/30',
                          },
                        },
                        {
                          key: 'zelle',
                          name: 'Zelle',
                          available: !!zelleDisplay,
                          username: zelleDisplay,
                          displayName: zelleDetails,
                          recipientName: zelleName,
                          url: null, // Zelle doesn't have web links
                          emoji: '🏦',
                          colors: {
                            default: 'bg-[#6D1ED4]/10 hover:bg-[#6D1ED4]/20 text-[#6D1ED4] dark:text-[#6D1ED4] border-[#6D1ED4]/30',
                            preferred: 'bg-[#6D1ED4] hover:bg-[#5A19B0] text-white shadow-lg shadow-purple-500/30',
                          },
                        },
                        {
                          key: 'paypal',
                          name: 'PayPal',
                          available: !!paypalEmail,
                          username: paypalEmail,
                          displayName: paypalEmail?.includes('@') ? paypalEmail.split('@')[0] : paypalEmail,
                          url: paypalEmail ? `https://paypal.me/${paypalEmail.includes('@') ? paypalEmail.split('@')[0] : paypalEmail}/${formattedAmount}` : null,
                          emoji: '🅿️',
                          colors: {
                            default: 'bg-[#003087]/10 hover:bg-[#003087]/20 text-[#003087] dark:text-[#0070BA] border-[#003087]/30',
                            preferred: 'bg-[#003087] hover:bg-[#001F5C] text-white shadow-lg shadow-indigo-500/30',
                          },
                        },
                      ];
                      
                      // Filter to show ONLY the preferred method (or first available if no preference set)
                      const preferredMethodObj = preferredMethod 
                        ? paymentMethods.find(m => m.key === preferredMethod && m.available)
                        : null;
                      
                      const availableMethods = preferredMethodObj 
                        ? [preferredMethodObj]  // Show only preferred method
                        : paymentMethods.filter(m => m.available).slice(0, 1);  // Show first available if no preference
                      
                      return (
                        <div className="mt-4 space-y-4">
                          {/* Platform fee notice */}
                          {platformFee > 0 && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                              <p className="text-sm text-amber-800 dark:text-amber-300">
                                <strong>Total to send:</strong> {formatCurrency(totalToPay, loan.currency)} 
                                <span className="text-xs ml-1">(includes {formatCurrency(platformFee, loan.currency)} platform fee)</span>
                              </p>
                            </div>
                          )}

                          {/* Direct payment buttons */}
                          {hasAnyMethod ? (
                            <div className="space-y-3">
                              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Tap to pay via:
                              </p>
                              
                              <div className="flex flex-col gap-2">
                                {availableMethods.map((method) => {
                                  const isPreferred = method.key === preferredMethod;
                                  const colorClass = isPreferred ? method.colors.preferred : method.colors.default;
                                  
                                  const content = (
                                    <>
                                      <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-2xl flex-shrink-0">{method.emoji}</span>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold">{method.name}</span>
                                            {isPreferred && (
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isPreferred ? 'bg-white/25' : 'bg-current/10'}`}>
                                                ★ Preferred
                                              </span>
                                            )}
                                          </div>
                                          <span className={`text-sm truncate block ${isPreferred ? 'opacity-90' : 'opacity-70'}`}>
                                            {method.displayName}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="font-bold text-base">{formatCurrency(totalToPay, loan.currency)}</span>
                                        {method.url && <ExternalLink className="w-4 h-4 opacity-70" />}
                                      </div>
                                    </>
                                  );
                                  
                                  if (method.url) {
                                    return (
                                      <a
                                        key={method.key}
                                        href={method.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center justify-between px-4 py-4 rounded-xl font-medium transition-all active:scale-[0.98] border ${colorClass}`}
                                      >
                                        {content}
                                      </a>
                                    );
                                  }
                                  
                                  // Zelle - no link, show info card with name verification
                                  return (
                                    <div
                                      key={method.key}
                                      className={`px-4 py-4 rounded-xl border ${colorClass}`}
                                    >
                                      <div className="flex items-center gap-3 mb-3">
                                        <span className="text-2xl flex-shrink-0">{method.emoji}</span>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold">{method.name}</span>
                                            {isPreferred && (
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isPreferred ? 'bg-white/25' : 'bg-current/10'}`}>
                                                ★ Preferred
                                              </span>
                                            )}
                                          </div>
                                          <span className={`text-sm font-bold block ${isPreferred ? 'opacity-90' : 'opacity-70'}`}>
                                            {formatCurrency(totalToPay, loan.currency)}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* Zelle recipient details */}
                                      <div className={`text-sm space-y-1 ${isPreferred ? 'opacity-90' : 'opacity-75'}`}>
                                        <div className="flex items-start gap-2">
                                          <span className="font-medium min-w-[60px]">Send to:</span>
                                          <span className="font-mono text-xs break-all">{method.displayName}</span>
                                        </div>
                                        {method.recipientName && (
                                          <div className="flex items-start gap-2">
                                            <span className="font-medium min-w-[60px]">Name:</span>
                                            <span className="font-semibold">{method.recipientName}</span>
                                          </div>
                                        )}
                                        <p className={`text-xs mt-2 ${isPreferred ? 'opacity-70' : 'opacity-60'}`}>
                                          Open your bank app and verify the name matches before sending
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Payment note reminder */}
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                  <strong>💡 Tip:</strong> Include "<span className="font-mono">{loanNote}</span>" as a note for easy tracking.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl text-center">
                              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                Contact your lender for payment details.
                              </p>
                            </div>
                          )}

                          <div className="text-center pt-3 border-t border-neutral-200 dark:border-neutral-700">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              After sending, tap <strong>"Mark as Paid"</strong> to upload proof.
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {feeSettings?.enabled &&
                      !feeLoading && isDwollaEnabled &&
                      (() => {
                        const feeCalc = calculateFee(nextPayment.amount);
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
                      })()}
                  </div>
                </Card>
              )}

              {/* Payment history */}
              {schedule.filter((s) => s.is_paid).length > 0 && (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">Payment history</h2>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {schedule.filter((s) => s.is_paid).length} payment(s)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {schedule
                      .filter((s) => s.is_paid)
                      .map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                              {isBorrower ? (
                                <Send className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                              ) : (
                                <ArrowDownLeft className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-neutral-900 dark:text-white">
                                {isBorrower ? '-' : '+'}
                                {formatCurrency(isBorrower ? p.amount : p.amount - (p.platform_fee || 0), loan.currency)}
                              </p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">{p.paid_at ? formatDate(p.paid_at) : ''}</p>
                              {/* Show fee for lender */}
                              {!isBorrower && p.platform_fee && p.platform_fee > 0 && (
                                <p className="text-xs text-orange-500 dark:text-orange-400">
                                  Fee: {formatCurrency(p.platform_fee, loan.currency)}
                                </p>
                              )}
                            </div>
                          </div>

                          <Badge variant="success" className="text-xs">
                            {isBorrower ? 'Paid' : 'Received'}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </Card>
              )}

              {/* Upcoming payments - always show if there are unpaid payments */}
              {schedule.filter((s) => !s.is_paid).length > 0 && (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">Upcoming payments</h2>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {schedule.filter((s) => !s.is_paid).length} payment(s) remaining
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {schedule
                      .filter((s) => !s.is_paid)
                      .map((p, index) => (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between rounded-xl border p-4 ${
                            index === 0 
                              ? 'border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20' 
                              : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              index === 0 
                                ? 'bg-primary-100 dark:bg-primary-900/30' 
                                : 'bg-neutral-100 dark:bg-neutral-800'
                            }`}>
                              <Calendar className={`w-4 h-4 ${
                                index === 0 
                                  ? 'text-primary-600 dark:text-primary-400' 
                                  : 'text-neutral-500 dark:text-neutral-400'
                              }`} />
                            </div>
                            <div>
                              <p className={`font-semibold ${
                                index === 0 
                                  ? 'text-primary-900 dark:text-primary-100' 
                                  : 'text-neutral-900 dark:text-white'
                              }`}>
                                {formatCurrency(p.amount, loan.currency)}
                              </p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Due: {formatDate(p.due_date)}
                              </p>
                            </div>
                          </div>

                          {index === 0 ? (
                            <Badge variant="warning" className="text-xs">Next due</Badge>
                          ) : (
                            <Badge variant="default" className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                              Upcoming
                            </Badge>
                          )}
                        </div>
                      ))}
                  </div>

                  {/* Show waiting message if funds not yet sent */}
                  {loan.status === 'active' && !loan.funds_sent && (loan as any).disbursement_status !== 'completed' && (
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-300">Waiting for funds</p>
                          <p className="text-sm text-amber-700 dark:text-amber-400">
                            {isBorrower 
                              ? 'Your lender will send the loan amount shortly. You\'ll be notified when the funds are on the way.'
                              : 'Please send the loan funds to the borrower to begin the repayment schedule.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {tab === 'terms' && hasTermsTab && (
            <Card className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">Lender terms</h2>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTermsExpanded(!termsExpanded)}
                  className="text-blue-600 dark:text-blue-400"
                >
                  {termsExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      Show more
                    </>
                  )}
                </Button>
              </div>

              <div
                className={[
                  'rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 transition-all',
                  termsExpanded ? 'max-h-[520px] overflow-y-auto' : 'max-h-32 overflow-hidden',
                ].join(' ')}
              >
                <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">
                  {(loan.business_lender as any)?.lending_terms}
                </p>
              </div>

              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
                By accepting this loan, you agree to terms set by {(loan.business_lender as any)?.business_name}
              </p>
            </Card>
          )}

          {tab === 'agreement' && hasAgreementTab && (
            <Card className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">Loan agreement</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Signed contract for this loan</p>
                </div>

                <a
                  href={`/api/contracts?loanId=${loan.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 dark:bg-primary-600 text-white rounded-lg hover:bg-primary-600 dark:hover:bg-primary-500 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  View Contract
                </a>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div
                  className={[
                    'rounded-xl border p-4',
                    (loan as any).borrower_signed
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-2">
                    {(loan as any).borrower_signed ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                    )}
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        Borrower: {(loan.borrower as any)?.full_name || 'Borrower'}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {(loan as any).borrower_signed_at ? `Signed on ${formatDate((loan as any).borrower_signed_at)}` : 'Not signed yet'}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={[
                    'rounded-xl border p-4',
                    (loan as any).lender_signed
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-2">
                    {(loan as any).lender_signed ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                    )}
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        Lender: {(loan.lender as any)?.full_name || (loan.business_lender as any)?.business_name || 'Lender'}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {(loan as any).lender_signed_at ? `Signed on ${formatDate((loan as any).lender_signed_at)}` : 'Not signed yet'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-4">
                💡 You can print or save the contract as PDF from your browser.
              </p>
            </Card>
          )}

          {tab === 'reminders' && hasRemindersTab && (
            <Card className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">Payment reminders</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Send reminders to the borrower</p>
                </div>
                <Button variant="outline" onClick={() => setShowReminderModal(true)}>
                  <Bell className="w-4 h-4 mr-2" />
                  Send reminder
                </Button>
              </div>

              <div className="space-y-2">
                {schedule.filter((s) => !s.is_paid).slice(0, 5).map((p) => {
                  const dueDate = new Date(p.due_date);
                  const today = new Date();
                  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = daysUntilDue < 0;
                  const isDueToday = daysUntilDue === 0;

                  // Check if reminder was sent at least 24 hours ago
                  const reminderSentAt = p.reminder_sent_at || (p as any).last_manual_reminder_at;
                  const reminderSent24hAgo = reminderSentAt
                    ? new Date().getTime() - new Date(reminderSentAt).getTime() >= 24 * 60 * 60 * 1000
                    : false;

                  // Only show Process Now if: overdue/due today AND reminder was sent 24+ hours ago
                  const canProcessNow = (isOverdue || isDueToday) && reminderSent24hAgo;

                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border p-4 ${
                        isOverdue
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-white">{formatCurrency(p.amount, loan.currency)}</p>
                          <p className={`text-sm ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-neutral-500 dark:text-neutral-400'}`}>
                            {isOverdue ? `⚠️ ${Math.abs(daysUntilDue)} days overdue` : daysUntilDue === 0 ? 'Due today' : `Due in ${daysUntilDue} days`}{' '}
                            • {formatDate(p.due_date)}
                          </p>

                          {/* Show retry status for failed payments */}
                          {((p as any).retry_count > 0 || (p as any).status === 'failed' || (p as any).status === 'defaulted') && (
                            <div className="mt-2">
                              <PaymentRetryBadge
                                retryCount={(p as any).retry_count || 0}
                                nextRetryAt={(p as any).next_retry_at}
                                status={(p as any).status}
                                causedBlock={(p as any).caused_block}
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {reminderSentAt ? (
                            <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Reminder sent
                              <span className="text-neutral-400 dark:text-neutral-500 ml-1">{formatDate(reminderSentAt)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400 dark:text-neutral-500">No reminder sent</span>
                          )}

                          {/* Process Payment Now button - only show 24hr after reminder was sent */}
                          {canProcessNow && isLender && (
                            <Button
                              size="sm"
                              variant={isOverdue ? 'danger' : 'outline'}
                              onClick={() => handleProcessPayment(p.id)}
                              disabled={processingPayment === p.id}
                            >
                              {processingPayment === p.id ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Banknote className="w-3 h-3 mr-1" />
                                  Process Now
                                </>
                              )}
                            </Button>
                          )}

                          {/* Show why Process Now is hidden */}
                          {(isOverdue || isDueToday) && isLender && !canProcessNow && reminderSentAt && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                              Can process{' '}
                              {Math.ceil((24 * 60 * 60 * 1000 - (new Date().getTime() - new Date(reminderSentAt).getTime())) / (60 * 60 * 1000))}h after
                              reminder
                            </span>
                          )}

                          {(isOverdue || isDueToday) && isLender && !reminderSentAt && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">Send reminder first</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {schedule.filter((s) => !s.is_paid).length === 0 && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-6">No upcoming payments 🎉</p>
                )}
              </div>
            </Card>
          )}

          {/* Borrower Profile Tab */}
          {tab === 'borrower-profile' && isLender && (
            <Card className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <User className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                </div>
                <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">Borrower Profile</h2>
              </div>

              {loadingBorrowerRating ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-2 text-sm text-neutral-500">Loading borrower information...</p>
                </div>
              ) : borrowerRatingData ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                      <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">Basic Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-600 dark:text-neutral-400">Name:</span>
                          <span className="font-medium">{(loan.borrower as any)?.full_name || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600 dark:text-neutral-400">Email:</span>
                          <span className="font-medium">{(loan.borrower as any)?.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600 dark:text-neutral-400">Member Since:</span>
                          <span className="font-medium">{borrowerRatingData.borrower?.monthsAsMember || 0} months</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600 dark:text-neutral-400">Verified:</span>
                          <span
                            className={`font-medium ${
                              borrowerRatingData.borrower?.isVerified
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-neutral-500'
                            }`}
                          >
                            {borrowerRatingData.borrower?.isVerified ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                      <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">Loan History</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-600 dark:text-neutral-400">Completed Loans:</span>
                          <span className="font-medium">{borrowerRatingData.loanHistory?.totalCompleted || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600 dark:text-neutral-400">Active Loans:</span>
                          <span className="font-medium">{borrowerRatingData.loanHistory?.activeLoans || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600 dark:text-neutral-400">Total Borrowed:</span>
                          <span className="font-medium">
                            {formatCurrency(borrowerRatingData.loanHistory?.totalBorrowed || 0, loan.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Borrower Rating Card */}
                  <BorrowerRatingCard
                    rating={borrowerRatingData.rating?.overall || 'neutral'}
                    paymentStats={borrowerRatingData.paymentHistory}
                    loansCompleted={borrowerRatingData.loanHistory?.totalCompleted || 0}
                    memberMonths={borrowerRatingData.borrower?.monthsAsMember || 0}
                    isVerified={borrowerRatingData.borrower?.isVerified}
                  />

                  {borrowerRatingData.recommendation && (
                    <div
                      className={`p-4 rounded-xl ${
                        borrowerRatingData.rating?.overall === 'great' || borrowerRatingData.rating?.overall === 'good'
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          : borrowerRatingData.rating?.overall === 'poor' ||
                            borrowerRatingData.rating?.overall === 'bad' ||
                            borrowerRatingData.rating?.overall === 'worst'
                          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                          : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">Recommendation</h3>
                      <p className="text-sm">{borrowerRatingData.recommendation}</p>
                    </div>
                  )}

                  {/* Vouch for Borrower - only on completed loans */}
                  {loan.status === 'completed' && (
                    <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-800/50">
                          <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-neutral-900 dark:text-white">Build Trust Together</h3>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400">
                            Your vouch as a lender carries significant weight
                          </p>
                        </div>
                      </div>
                      
                      {hasVouchedForBorrower ? (
                        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">You've vouched for this borrower</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
                            This loan was repaid successfully. Vouch for {(loan.borrower as any)?.full_name?.split(' ')[0] || 'this borrower'} to boost their trust score and help them access better loan terms in the future.
                          </p>
                          <Button
                            onClick={() => setShowVouchModal(true)}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <Award className="w-4 h-4 mr-2" />
                            Vouch for {(loan.borrower as any)?.full_name?.split(' ')[0] || 'Borrower'}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">No borrower information available</div>
              )}
              
              {/* Vouch for Borrower - always show on completed loans regardless of borrowerRatingData */}
              {loan.status === 'completed' && !borrowerRatingData && (
                <div className="mt-4 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-800/50">
                      <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white">Build Trust Together</h3>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Your vouch as a lender carries significant weight
                      </p>
                    </div>
                  </div>
                  
                  {hasVouchedForBorrower ? (
                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">You've vouched for this borrower</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
                        This loan was repaid successfully. Vouch for {(loan.borrower as any)?.full_name?.split(' ')[0] || 'this borrower'} to boost their trust score and help them access better loan terms in the future.
                      </p>
                      <Button
                        onClick={() => setShowVouchModal(true)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Award className="w-4 h-4 mr-2" />
                        Vouch for {(loan.borrower as any)?.full_name?.split(' ')[0] || 'Borrower'}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      </main>

      <Footer />

      {/* Funds modal */}
      {showFundsModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 my-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Confirm Payment Sent</h2>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 mb-4">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Amount sent:</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {formatCurrency(loan.amount, loan.currency)}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                To: {(loan.borrower as any)?.full_name || 'Borrower'}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Payment Method Used *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(loan.borrower as any)?.paypal_email && (
                    <button
                      type="button"
                      onClick={() => setFundsPaymentMethod('paypal')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        fundsPaymentMethod === 'paypal'
                          ? 'border-[#0070ba] dark:border-[#0070ba] bg-[#0070ba]/10 dark:bg-[#0070ba]/20'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                      }`}
                    >
                      <div className="w-8 h-8 bg-[#0070ba] dark:bg-[#003087] rounded mx-auto mb-1 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium text-neutral-900 dark:text-white">PayPal</span>
                    </button>
                  )}
                  {(loan.borrower as any)?.cashapp_username && (
                    <button
                      type="button"
                      onClick={() => setFundsPaymentMethod('cashapp')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        fundsPaymentMethod === 'cashapp'
                          ? 'border-[#00D632] dark:border-[#00D632] bg-[#00D632]/10 dark:bg-[#00D632]/20'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                      }`}
                    >
                      <div className="w-8 h-8 bg-[#00D632] dark:bg-[#00A826] rounded mx-auto mb-1 flex items-center justify-center">
                        <span className="text-white font-bold">$</span>
                      </div>
                      <span className="text-xs font-medium text-neutral-900 dark:text-white">Cash App</span>
                    </button>
                  )}
                  {(loan.borrower as any)?.venmo_username && (
                    <button
                      type="button"
                      onClick={() => setFundsPaymentMethod('venmo')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        fundsPaymentMethod === 'venmo'
                          ? 'border-[#3D95CE] dark:border-[#3D95CE] bg-[#3D95CE]/10 dark:bg-[#3D95CE]/20'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                      }`}
                    >
                      <div className="w-8 h-8 bg-[#3D95CE] dark:bg-[#2a6a9a] rounded mx-auto mb-1 flex items-center justify-center">
                        <span className="text-white font-bold">V</span>
                      </div>
                      <span className="text-xs font-medium text-neutral-900 dark:text-white">Venmo</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Transaction ID */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Transaction ID / Reference (optional)
                </label>
                <input
                  type="text"
                  value={fundsReference}
                  onChange={(e) => setFundsReference(e.target.value)}
                  placeholder="e.g., 5TY12345ABC678901"
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              {/* Proof of Payment Upload */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Screenshot Proof of Payment *
                </label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                  Upload a screenshot showing the completed payment
                </p>

                {fundsProofPreview ? (
                  <div className="relative">
                    <img
                      src={fundsProofPreview}
                      alt="Payment proof"
                      className="w-full h-48 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFundsProofFile(null);
                        setFundsProofPreview(null);
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-colors">
                    <div className="flex flex-col items-center">
                      <Upload className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mb-2" />
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">Click to upload screenshot</span>
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">PNG, JPG up to 5MB</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFundsProofFile(file);
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            setFundsProofPreview(e.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>⚠️ Important:</strong> Screenshot proof is required. The borrower will be able to see this proof to confirm receipt.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowFundsModal(false);
                  setFundsProofFile(null);
                  setFundsProofPreview(null);
                  setFundsReference('');
                }}
                className="flex-1"
                disabled={fundsSending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendFunds}
                className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                disabled={fundsSending || !fundsProofFile}
              >
                {fundsSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Bell className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Send Payment Reminder</h2>
            </div>

            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Send a reminder email to <strong>{(loan?.borrower as any)?.full_name || 'the borrower'}</strong> about their upcoming
              payment.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Add a personal message (optional)
              </label>
              <textarea
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                placeholder="e.g., Just a friendly reminder about your upcoming payment..."
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white resize-none"
                rows={3}
              />
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>Note:</strong> The borrower will receive an email with the payment details and your message.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowReminderModal(false);
                  setReminderMessage('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
                onClick={() => handleSendReminder()}
                disabled={sendingReminder}
              >
                {sendingReminder ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Reminder
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        isOpen={paymentConfirmDialog.isOpen}
        onClose={() => setPaymentConfirmDialog({ isOpen: false, paymentId: null, isBorrower: false })}
        onConfirm={executeProcessPayment}
        title={paymentConfirmDialog.isBorrower ? 'Confirm Early Payment' : 'Process Payment'}
        message={
          paymentConfirmDialog.isBorrower
            ? 'Pay this installment now? This will initiate an ACH transfer from your bank account to the lender.'
            : "Process this payment now? This will initiate an ACH transfer from the borrower's bank account."
        }
        confirmText={paymentConfirmDialog.isBorrower ? 'Pay Now' : 'Process Payment'}
        cancelText="Cancel"
        type="info"
        loading={!!processingPayment}
      />

      <ConfirmDialog
        isOpen={showDeclineDialog}
        onClose={() => setShowDeclineDialog(false)}
        onConfirm={executeDeclineLoan}
        title="Decline Loan Request"
        message="Are you sure you want to decline this loan request? This action cannot be undone."
        confirmText="Decline"
        cancelText="Keep Request"
        type="danger"
      />

      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={executeCancelLoan}
        title="Cancel Loan Request"
        message="Are you sure you want to cancel this loan request? This action cannot be undone."
        confirmText="Cancel Request"
        cancelText="Keep Request"
        type="warning"
      />

      {/* Manual Payment Modal - For borrowers when ACH is not available */}
      {showManualPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Mark Payment as Made</h3>
                <button
                  onClick={() => setShowManualPaymentModal(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Payment amount with fee breakdown */}
                {(() => {
                  const feeCalc = feeSettings?.enabled && nextPayment ? calculateFee(nextPayment.amount) : null;
                  const totalToPay = feeCalc ? feeCalc.grossAmount : (nextPayment?.amount || 0);
                  const platformFee = feeCalc?.platformFee || 0;
                  
                  return (
                    <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm text-primary-700 dark:text-primary-300">Loan Payment</p>
                        <p className="font-semibold text-primary-900 dark:text-primary-100">
                          {nextPayment && formatCurrency(nextPayment.amount, loan?.currency)}
                        </p>
                      </div>
                      {platformFee > 0 && (
                        <div className="flex justify-between items-start mb-2 text-sm">
                          <p className="text-primary-600 dark:text-primary-400">Platform Fee</p>
                          <p className="text-primary-800 dark:text-primary-200">
                            +{formatCurrency(platformFee, loan?.currency)}
                          </p>
                        </div>
                      )}
                      <div className="border-t border-primary-200 dark:border-primary-700 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-primary-800 dark:text-primary-200">Total to Send</p>
                          <p className="text-2xl font-bold text-primary-900 dark:text-primary-100">
                            {formatCurrency(totalToPay, loan?.currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Payment method selection */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Payment Method Used *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Cash App', 'Venmo', 'Zelle', 'PayPal'].map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setManualPaymentMethod(method.toLowerCase().replace(' ', ''))}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          manualPaymentMethod === method.toLowerCase().replace(' ', '')
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                        }`}
                      >
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">{method}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transaction reference */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Transaction ID / Reference (optional)
                  </label>
                  <input
                    type="text"
                    value={manualPaymentReference}
                    onChange={(e) => setManualPaymentReference(e.target.value)}
                    placeholder="e.g., #ABC123"
                    className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>

                {/* Proof upload */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Payment Screenshot *
                  </label>
                  {manualPaymentProofPreview ? (
                    <div className="relative">
                      <img
                        src={manualPaymentProofPreview}
                        alt="Payment proof"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setManualPaymentProofFile(null);
                          setManualPaymentProofPreview(null);
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                      <span className="text-sm text-neutral-500">Click to upload proof</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleManualPaymentProofChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowManualPaymentModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitManualPayment}
                  disabled={!manualPaymentMethod || !manualPaymentProofFile || submittingManualPayment}
                  className="flex-1"
                >
                  {submittingManualPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Payment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vouch for borrower modal */}
      {showVouchModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 my-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                Vouch for {(loan.borrower as any)?.full_name?.split(' ')[0] || 'Borrower'}
              </h2>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                As a lender, your vouch carries extra weight. You're confirming this borrower successfully repaid their loan.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-purple-200 dark:bg-purple-700 flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-700 dark:text-purple-200" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {(loan.borrower as any)?.full_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Relationship: Lender (highest trust weight)
                    </p>
                  </div>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  Loan amount: {formatCurrency(loan.amount, loan.currency)} • Successfully repaid
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Add a message (optional)
                </label>
                <textarea
                  value={vouchMessage}
                  onChange={(e) => setVouchMessage(e.target.value)}
                  placeholder="Share your experience lending to this borrower..."
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowVouchModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleVouchForBorrower}
                disabled={vouchingForBorrower}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {vouchingForBorrower ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4 mr-2" />
                    Create Vouch
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}