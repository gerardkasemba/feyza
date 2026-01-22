'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Badge, Progress, Avatar } from '@/components/ui';
import { LoanTimeline } from '@/components/loans';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getLoanProgress } from '@/lib/utils';
import { downloadICalFile } from '@/lib/calendar';
import { Loan, PaymentScheduleItem, LoanStatus } from '@/types';
import { FeeBreakdown, usePlatformFee } from '@/components/FeeBreakdown';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Banknote,
  UserCheck,
  Building,
  CreditCard,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Bell,
  MessageSquare,
  FileText,
  Download,
  X,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

// Import react-icons for emoji replacements
import { FaAmbulance, FaHospital, FaGraduationCap, FaBriefcase, FaHome, FaFileAlt } from 'react-icons/fa';
import { MdEmergency, MdMedicalServices, MdSchool, MdBusinessCenter, MdHouse, MdDescription } from 'react-icons/md';

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<PaymentScheduleItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dismissed notifications state
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  // Track minimized (collapsed) notifications - they still show but in compact form
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

  // Platform fee hook
  const { settings: feeSettings, loading: feeLoading, calculateFee } = usePlatformFee();

  // Terms section state
  const [termsExpanded, setTermsExpanded] = useState(false);

  const loanId = params.id as string;

  // Load dismissed notifications from localStorage
  useEffect(() => {
    if (loanId) {
      const stored = localStorage.getItem(`loan-notifications-${loanId}`);
      if (stored) {
        setDismissedNotifications(new Set(JSON.parse(stored)));
      }
    }
  }, [loanId]);

  // Toggle notification between expanded and minimized
  const toggleNotification = (type: string) => {
    const newMinimized = new Set(minimizedNotifications);
    if (newMinimized.has(type)) {
      newMinimized.delete(type);
    } else {
      newMinimized.add(type);
    }
    setMinimizedNotifications(newMinimized);
    localStorage.setItem(`loan-minimized-${loanId}`, JSON.stringify(Array.from(newMinimized)));
  };

  // Keep old dismissNotification for backwards compatibility
  const dismissNotification = (type: string) => {
    toggleNotification(type);
  };

  // Load minimized state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`loan-minimized-${loanId}`);
    if (stored) {
      try {
        setMinimizedNotifications(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error('Error parsing minimized notifications:', e);
      }
    }
  }, [loanId]);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/auth/signin');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setUser(profile || {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || 'User',
        user_type: authUser.user_metadata?.user_type || 'individual',
      });

      // Fetch loan with relations
      const { data: loanData, error } = await supabase
        .from('loans')
        .select(`
          *,
          borrower:users!borrower_id(*),
          lender:users!lender_id(*),
          business_lender:business_profiles!business_lender_id(*),
          guest_lender:guest_lenders!guest_lender_id(*)
        `)
        .eq('id', loanId)
        .single();

      if (error || !loanData) {
        router.push('/dashboard');
        return;
      }

      // Check if user has access to this loan
      // User can see loan if they are: borrower, lender, or owner of business_lender
      let hasAccess = false;
      
      if (loanData.borrower_id === authUser.id) {
        hasAccess = true;
      } else if (loanData.lender_id === authUser.id) {
        hasAccess = true;
      } else if (loanData.business_lender_id) {
        // Check if user owns this business
        const { data: businessProfile } = await supabase
          .from('business_profiles')
          .select('id')
          .eq('id', loanData.business_lender_id)
          .eq('user_id', authUser.id)
          .single();
        
        if (businessProfile) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        console.log('User does not have access to this loan');
        router.push('/dashboard');
        return;
      }

      // Determine lender info (user, business, or guest)
      const lenderInfo = loanData.lender || loanData.business_lender || loanData.guest_lender;
      
      setLoan({
        ...loanData,
        lender: lenderInfo,
      });

      // Fetch payment schedule
      const { data: scheduleData } = await supabase
        .from('payment_schedule')
        .select('*')
        .eq('loan_id', loanId)
        .order('due_date', { ascending: true });

      setSchedule(scheduleData || []);
      setIsLoading(false);
    };

    fetchData();
  }, [loanId, router]);

  // Fetch live transfer status
  const fetchTransferStatus = async () => {
    if (!loanId) return;
    
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
      } else if (transferStatusVal === 'pending' || transferStatusVal === 'processing' || data.loan?.disbursement_status === 'processing') {
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
    }
  };

  // Poll for transfer status when funds are being transferred
  useEffect(() => {
    if (!loan) return;
    
    // Only poll if disbursement is in progress
    const shouldPoll = loan.status === 'active' && 
      ((loan as any).disbursement_status === 'processing' || 
       ((loan as any).disbursement_status !== 'completed' && !loan.funds_sent));
    
    // Initial fetch
    fetchTransferStatus();
    
    // Set up polling every 30 seconds if disbursement is in progress
    if (shouldPoll) {
      const interval = setInterval(fetchTransferStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [loan?.id, loan?.status, (loan as any)?.disbursement_status]);

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

      alert('Reminder sent successfully!');
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
      alert(error.message || 'Failed to send reminder. Please try again.');
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
        setLoan(prev => prev ? { ...prev, status: 'active' as any } : null);
        // Refetch full data
        router.refresh();
      } else {
        alert(data.error || 'Failed to accept loan');
      }
    } catch (error) {
      console.error('Error accepting loan:', error);
      alert('Failed to accept loan. Please try again.');
    }
  };

  const handleDeclineLoan = async () => {
    if (!loan) return;
    
    if (!confirm('Are you sure you want to decline this loan request?')) return;
    
    try {
      const response = await fetch(`/api/loans/${loan.id}/decline`, {
        method: 'POST',
      });

      if (response.ok) {
        // Update loan state directly
        setLoan(prev => prev ? { ...prev, status: 'declined' as any } : null);
        // Navigate to dashboard after short delay to show updated state
        setTimeout(() => router.push('/dashboard'), 500);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to decline loan');
      }
    } catch (error) {
      console.error('Error declining loan:', error);
      alert('Failed to decline loan. Please try again.');
    }
  };

  const handleCancelLoan = async () => {
    if (!loan) return;
    
    if (!confirm('Are you sure you want to cancel this loan request?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/loans/${loan.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by borrower' }),
      });

      if (response.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error cancelling loan:', error);
    }
  };

  // Manually process a payment (works for both borrowers paying early and lenders processing overdue)
  const handleProcessPayment = async (paymentId: string) => {
    if (!loan || !user) return;
    
    const isBorrowerForPayment = loan.borrower_id === user.id;
    const confirmMessage = isBorrowerForPayment
      ? 'Pay this installment now? This will initiate an ACH transfer from your bank account to the lender.'
      : 'Process this payment now? This will initiate an ACH transfer from the borrower\'s bank account.';
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setProcessingPayment(paymentId);
    try {
      const response = await fetch('/api/cron/auto-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const successMessage = isBorrowerForPayment
          ? 'Payment submitted! The transfer will complete in 1-3 business days.'
          : `Payment processed successfully! Transfer ID: ${data.transfer_id}`;
        alert(successMessage);
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
          setLoan(prev => ({ ...prev, ...loanData }));
        }
      } else {
        alert(data.error || 'Failed to process payment');
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      alert(error.message || 'Failed to process payment');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleSendFunds = async () => {
    if (!loan) return;
    
    // Require proof of payment
    if (!fundsProofFile) {
      alert('Please upload a screenshot proof of payment');
      return;
    }
    
    setFundsSending(true);
    try {
      const supabase = createClient();
      
      // Upload proof image to Supabase Storage
      const fileExt = fundsProofFile.name.split('.').pop();
      const fileName = `${loan.id}_${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('loan-documents')
        .upload(filePath, fundsProofFile);
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        // Continue anyway - the API will work without the proof URL
      }
      
      // Get public URL for the proof
      let proofUrl = null;
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('loan-documents')
          .getPublicUrl(filePath);
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
          ...loan,
          funds_sent: true,
          funds_sent_at: new Date().toISOString(),
          funds_sent_method: fundsPaymentMethod,
          status: result.status || 'active',
        } as any);
        setShowFundsModal(false);
        setFundsReference('');
        setFundsProofFile(null);
        setFundsProofPreview(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to confirm funds sent');
      }
    } catch (error) {
      console.error('Error sending funds:', error);
      alert('Failed to confirm funds sent');
    } finally {
      setFundsSending(false);
    }
  };

  if (isLoading || !loan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="animate-pulse text-neutral-500 dark:text-neutral-400">Loading...</div>
      </div>
    );
  }

  const isBorrower = loan.borrower_id === user?.id;
  // Check if user is lender (either direct or via business)
  const isLender = loan.lender_id === user?.id || 
    (loan.business_lender && (loan.business_lender as any).user_id === user?.id);
  const progress = getLoanProgress(loan.amount_paid, loan.amount);
  
  const otherParty = isBorrower ? loan.lender : loan.borrower;
  const isPersonalLoan = loan.lender_type === 'personal';
  
  // Prefer username display over email for personal loans only
  let otherPartyName: string;
  if (otherParty) {
    if ('business_name' in otherParty) {
      otherPartyName = otherParty.business_name;
    } else if (isPersonalLoan && (otherParty as any).username) {
      // Only show username for personal loans
      otherPartyName = `~${(otherParty as any).username}`;
    } else {
      otherPartyName = (otherParty as any).full_name;
    }
  } else if (isBorrower && isPersonalLoan && loan.invite_username) {
    otherPartyName = `~${loan.invite_username}`;
  } else if (isBorrower) {
    otherPartyName = loan.invite_email || 'Pending acceptance';
  } else {
    otherPartyName = loan.borrower_name || 'Borrower';
  }

  // Extended status config with pending_funds and pending_disbursement
  const statusConfig: Record<string, { color: 'default' | 'success' | 'warning' | 'danger' | 'info'; icon: any; label: string }> = {
    pending: { color: 'warning', icon: Clock, label: 'Pending' },
    pending_funds: { color: 'warning', icon: Clock, label: 'Awaiting Funds' },
    pending_disbursement: { color: 'info', icon: Clock, label: 'Disbursing' },
    active: { color: 'success', icon: CheckCircle, label: 'Active' },
    completed: { color: 'info', icon: CheckCircle, label: 'Completed' },
    declined: { color: 'danger', icon: XCircle, label: 'Declined' },
    cancelled: { color: 'default', icon: XCircle, label: 'Cancelled' },
  };

  const { color: statusColor, icon: StatusIcon, label: statusLabel } = statusConfig[loan.status] || statusConfig.pending;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <Navbar user={user} />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>

          {/* Loan Header */}
          <Card className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <Avatar name={otherPartyName} size="lg" />
                <div>
                  <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
                    {otherPartyName}
                  </h1>
                  <p className="text-neutral-500 dark:text-neutral-400">
                    {isBorrower ? 'Lender' : 'Borrower'} • {loan.lender_type === 'business' ? 'Business' : 'Personal'}
                  </p>
                </div>
              </div>
              <Badge variant={statusColor} size="md">
                <StatusIcon className="w-4 h-4 mr-1" />
                {statusLabel}
              </Badge>
            </div>

            {/* No Match Found Banner */}
            {loan.match_status === 'no_match' && loan.lender_type === 'business' && !loan.lender_id && !loan.business_lender_id && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-orange-800 dark:text-orange-300">No Matching Lenders Found</h3>
                    <p className="text-orange-700 dark:text-orange-400 text-sm mt-1">
                      We couldn't find a business lender for your {formatCurrency(loan.amount, loan.currency)} request at this time.
                    </p>
                    <div className="mt-3 p-3 bg-white dark:bg-neutral-800 rounded-lg border border-orange-100 dark:border-orange-900">
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 font-medium mb-2">What you can do:</p>
                      <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                        <li>• Try a smaller amount to build your borrowing history</li>
                        <li>• Request from a friend or family member instead</li>
                        <li>• Check back later as new lenders join regularly</li>
                      </ul>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <Button
                        size="sm"
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
                        Retry Matching
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Loan Status - Awaiting Lender Response */}
            {loan.status === 'pending' && loan.match_status !== 'no_match' && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                      {isBorrower ? 'Awaiting Lender Response' : 'Loan Request Pending Your Review'}
                    </h3>
                    <p className="text-amber-700 dark:text-amber-400 text-sm mt-1">
                      {isBorrower 
                        ? loan.lender_type === 'personal' 
                          ? `Your loan request has been sent to ${loan.invite_username ? `~${loan.invite_username}` : loan.invite_email || 'the lender'}. They will receive an email to accept or decline.`
                          : 'Your loan request is being reviewed by the lender. You\'ll be notified once they respond.'
                        : `${(loan.borrower as any)?.full_name || 'A borrower'} has requested a loan of ${formatCurrency(loan.amount, loan.currency)}.`
                      }
                    </p>
                    
                    {/* Loan request age indicator */}
                    {loan.created_at && (
                      <p className="text-amber-600 dark:text-amber-500 text-xs mt-2">
                        Requested {formatDate(loan.created_at)}
                      </p>
                    )}
                    
                    {isBorrower ? (
                      <div className="flex gap-3 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!confirm('Are you sure you want to cancel this loan request?')) return;
                            try {
                              const res = await fetch(`/api/loans/${loan.id}/cancel`, { 
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ reason: 'Cancelled by borrower' }),
                              });
                              if (res.ok) {
                                window.location.reload();
                              } else {
                                const data = await res.json();
                                alert(data.error || 'Failed to cancel');
                              }
                            } catch (e) {
                              console.error(e);
                              alert('Failed to cancel loan request');
                            }
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancel Request
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-3 mt-4">
                        <Button
                          size="sm"
                          onClick={handleAcceptLoan}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept & Fund Loan
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDeclineLoan}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Live Transfer Status - Shows real-time Dwolla transfer progress */}
            {isBorrower && transferStatus && transferStatus.status !== 'not_started' && (
              <div className={`rounded-xl mb-6 border ${
                transferStatus.status === 'completed' 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                  : transferStatus.status === 'failed'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}>
                {/* Minimized/Collapsed View */}
                {minimizedNotifications.has('funds-status') ? (
                  <button
                    onClick={() => toggleNotification('funds-status')}
                    className="w-full p-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {transferStatus.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : transferStatus.status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      ) : (
                        <Banknote className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      )}
                      <span className={`font-medium text-sm ${
                        transferStatus.status === 'completed' ? 'text-green-800 dark:text-green-300' : 
                        transferStatus.status === 'failed' ? 'text-red-800 dark:text-red-300' : 'text-blue-800 dark:text-blue-300'
                      }`}>
                        {transferStatus.status === 'completed' ? 'Funds Received' :
                         transferStatus.status === 'failed' ? 'Transfer Failed' :
                         'Funds on the Way'}
                      </span>
                      <span className={`text-sm ${
                        transferStatus.status === 'completed' ? 'text-green-600 dark:text-green-400' : 
                        transferStatus.status === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        • {formatCurrency(loan.amount, loan.currency)}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 ${
                      transferStatus.status === 'completed' ? 'text-green-500 dark:text-green-400' : 
                      transferStatus.status === 'failed' ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'
                    }`} />
                  </button>
                ) : (
                  /* Expanded View */
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {transferStatus.status === 'completed' ? (
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                          </div>
                        ) : transferStatus.status === 'failed' ? (
                          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                          </div>
                        ) : (
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                            <Banknote className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                        )}
                        <div>
                          <h3 className={`font-semibold ${
                            transferStatus.status === 'completed' ? 'text-green-900 dark:text-green-300' : 
                            transferStatus.status === 'failed' ? 'text-red-900 dark:text-red-300' : 'text-blue-900 dark:text-blue-300'
                          }`}>
                            {transferStatus.status === 'completed' ? '✅ Funds Received!' :
                             transferStatus.status === 'failed' ? '❌ Transfer Failed' :
                             '💵 Funds on the Way!'}
                          </h3>
                          <p className={`text-sm ${
                            transferStatus.status === 'completed' ? 'text-green-700 dark:text-green-400' : 
                            transferStatus.status === 'failed' ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'
                          }`}>
                            {transferStatus.statusMessage}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleNotification('funds-status')}
                        className={`p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 ${
                          transferStatus.status === 'completed' ? 'text-green-400 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300' : 
                          transferStatus.status === 'failed' ? 'text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300' : 
                          'text-blue-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300'
                        }`}
                        title="Minimize"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Transfer Progress Timeline */}
                    {transferStatus.status === 'processing' && (
                      <div className="mt-4">
                        {/* Progress Steps */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-green-500 dark:bg-green-600 flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                            <div className="text-sm">
                              <p className="font-medium text-green-700 dark:text-green-400">Transfer Initiated</p>
                              {transferStatus.transfer?.created_at && (
                                <p className="text-green-600 dark:text-green-500 text-xs">
                                  {new Date(transferStatus.transfer.created_at).toLocaleDateString('en-US', { 
                                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1 mx-4">
                            <div className="h-1 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ width: '50%' }} />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-right">
                              <p className="font-medium text-blue-700 dark:text-blue-400">Expected Arrival</p>
                              {transferStatus.timeline && (
                                <p className="text-blue-600 dark:text-blue-500 text-xs">
                                  {transferStatus.timeline.maxDays === 0 
                                    ? 'Today' 
                                    : transferStatus.timeline.maxDays === 1
                                    ? 'Tomorrow'
                                    : `In ${transferStatus.timeline.minDays}-${transferStatus.timeline.maxDays} days`
                                  }
                                </p>
                              )}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                        </div>

                        {/* Live Status Indicator */}
                        <div className="flex items-center gap-2 mt-3 p-2 bg-white/50 dark:bg-white/10 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" />
                          <span className="text-xs text-blue-700 dark:text-blue-400">Live status • Updates automatically</span>
                          <button 
                            onClick={fetchTransferStatus}
                            className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                          >
                            Refresh
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Amount Display */}
                    <div className={`mt-4 p-3 rounded-lg ${
                      transferStatus.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' : 
                      transferStatus.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${
                          transferStatus.status === 'completed' ? 'text-green-700 dark:text-green-400' : 
                          transferStatus.status === 'failed' ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'
                        }`}>
                          Amount
                        </span>
                        <span className={`font-bold text-lg ${
                          transferStatus.status === 'completed' ? 'text-green-900 dark:text-green-300' : 
                          transferStatus.status === 'failed' ? 'text-red-900 dark:text-red-300' : 'text-blue-900 dark:text-blue-300'
                        }`}>
                          {formatCurrency(loan.amount, loan.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lender View - Live Transfer Status */}
            {isLender && transferStatus && transferStatus.status !== 'not_started' && (
              <div className={`rounded-xl mb-6 border ${
                transferStatus.status === 'completed' 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                  : transferStatus.status === 'failed'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}>
                {/* Minimized/Collapsed View */}
                {minimizedNotifications.has('funds-status') ? (
                  <button
                    onClick={() => toggleNotification('funds-status')}
                    className="w-full p-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {transferStatus.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : transferStatus.status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      ) : (
                        <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      )}
                      <span className={`font-medium text-sm ${
                        transferStatus.status === 'completed' ? 'text-green-800 dark:text-green-300' : 
                        transferStatus.status === 'failed' ? 'text-red-800 dark:text-red-300' : 'text-blue-800 dark:text-blue-300'
                      }`}>
                        {transferStatus.status === 'completed' ? 'Funds Delivered' :
                         transferStatus.status === 'failed' ? 'Transfer Failed' :
                         'Funds Being Sent'}
                      </span>
                      <span className={`text-sm ${
                        transferStatus.status === 'completed' ? 'text-green-600 dark:text-green-400' : 
                        transferStatus.status === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        • {formatCurrency(loan.amount, loan.currency)}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 ${
                      transferStatus.status === 'completed' ? 'text-green-500 dark:text-green-400' : 
                      transferStatus.status === 'failed' ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'
                    }`} />
                  </button>
                ) : (
                  /* Expanded View */
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {transferStatus.status === 'completed' ? (
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                          </div>
                        ) : transferStatus.status === 'failed' ? (
                          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                          </div>
                        ) : (
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                            <Send className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                        )}
                        <div>
                          <h3 className={`font-semibold ${
                            transferStatus.status === 'completed' ? 'text-green-900 dark:text-green-300' : 
                            transferStatus.status === 'failed' ? 'text-red-900 dark:text-red-300' : 'text-blue-900 dark:text-blue-300'
                          }`}>
                            {transferStatus.status === 'completed' ? '✅ Funds Delivered!' :
                             transferStatus.status === 'failed' ? '❌ Transfer Failed' :
                             '💸 Funds Being Sent'}
                          </h3>
                          <p className={`text-sm ${
                            transferStatus.status === 'completed' ? 'text-green-700 dark:text-green-400' : 
                            transferStatus.status === 'failed' ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'
                          }`}>
                            {transferStatus.status === 'completed' 
                              ? `${formatCurrency(loan.amount, loan.currency)} has been delivered to ${(loan.borrower as any)?.full_name || 'the borrower'}`
                              : transferStatus.status === 'failed'
                              ? 'The transfer could not be completed. Please try again.'
                              : `${formatCurrency(loan.amount, loan.currency)} is being transferred to ${(loan.borrower as any)?.full_name || 'the borrower'}`
                            }
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleNotification('funds-status')}
                        className={`p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 ${
                          transferStatus.status === 'completed' ? 'text-green-400 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300' : 
                          transferStatus.status === 'failed' ? 'text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300' : 
                          'text-blue-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300'
                        }`}
                        title="Minimize"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Transfer Progress Timeline for Lender */}
                    {transferStatus.status === 'processing' && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-green-500 dark:bg-green-600 flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                            <div className="text-sm">
                              <p className="font-medium text-green-700 dark:text-green-400">Transfer Initiated</p>
                              {transferStatus.transfer?.created_at && (
                                <p className="text-green-600 dark:text-green-500 text-xs">
                                  {new Date(transferStatus.transfer.created_at).toLocaleDateString('en-US', { 
                                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1 mx-4">
                            <div className="h-1 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ width: '50%' }} />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-right">
                              <p className="font-medium text-blue-700 dark:text-blue-400">Delivery Expected</p>
                              {transferStatus.timeline && (
                                <p className="text-blue-600 dark:text-blue-500 text-xs">
                                  {transferStatus.timeline.maxDays === 0 
                                    ? 'Today' 
                                    : transferStatus.timeline.maxDays === 1
                                    ? 'Tomorrow'
                                    : `In ${transferStatus.timeline.minDays}-${transferStatus.timeline.maxDays} days`
                                  }
                                </p>
                              )}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                        </div>

                        {/* Live Status Indicator */}
                        <div className="flex items-center gap-2 mt-3 p-2 bg-white/50 dark:bg-white/10 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" />
                          <span className="text-xs text-blue-700 dark:text-blue-400">Live status • Updates automatically</span>
                          <button 
                            onClick={fetchTransferStatus}
                            className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                          >
                            Refresh
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Amount Display */}
                    <div className={`mt-4 p-3 rounded-lg ${
                      transferStatus.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' : 
                      transferStatus.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${
                          transferStatus.status === 'completed' ? 'text-green-700 dark:text-green-400' : 
                          transferStatus.status === 'failed' ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'
                        }`}>
                          Amount Sent
                        </span>
                        <span className={`font-bold text-lg ${
                          transferStatus.status === 'completed' ? 'text-green-900 dark:text-green-300' : 
                          transferStatus.status === 'failed' ? 'text-red-900 dark:text-red-300' : 'text-blue-900 dark:text-blue-300'
                        }`}>
                          {formatCurrency(loan.amount, loan.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Auto-Pay Status */}
            {loan.status === 'active' && (loan as any).auto_pay_enabled && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl mb-6">
                {minimizedNotifications.has('auto-pay') ? (
                  <button
                    onClick={() => toggleNotification('auto-pay')}
                    className="w-full p-3 flex items-center justify-between hover:bg-green-100/50 dark:hover:bg-green-900/30 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-sm text-green-800 dark:text-green-300">Auto-Pay Enabled</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-green-500 dark:text-green-400" />
                  </button>
                ) : (
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <div>
                          <h3 className="font-semibold text-green-900 dark:text-green-300">✅ Auto-Pay Enabled</h3>
                          <p className="text-sm text-green-700 dark:text-green-400">
                            {isBorrower 
                              ? 'Payments will be automatically deducted from your bank on each due date.'
                              : 'Payments will be automatically deposited to your bank on each due date.'
                            }
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleNotification('auto-pay')}
                        className="p-1 rounded-full text-green-400 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300 hover:bg-black/5 dark:hover:bg-white/5"
                        title="Minimize"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lender Payment Section - Show when lender hasn't sent payment yet */}
            {loan.status === 'active' && !loan.funds_sent && isLender && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Banknote className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">Action Required: Fund This Loan</h3>
                </div>
                
                <p className="text-yellow-700 dark:text-yellow-400 text-sm mb-4">
                  Send <strong>{formatCurrency(loan.amount, loan.currency)}</strong> to <strong>{(loan.borrower as any)?.full_name || 'the borrower'}</strong>
                </p>
                
                {/* Check if borrower has bank connected for ACH */}
                {(() => {
                  const borrowerBankConnected = (loan as any).borrower_bank_connected || 
                    (loan as any).borrower_dwolla_funding_source_url ||
                    (loan.borrower as any)?.dwolla_funding_source_url;
                  const borrowerBankName = (loan as any).borrower_bank_name || (loan.borrower as any)?.bank_name;
                  const borrowerBankMask = (loan as any).borrower_bank_account_mask || (loan.borrower as any)?.bank_account_mask;
                  
                  if (borrowerBankConnected) {
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
                  
                  // Fallback to legacy payment methods if no bank connected
                  const borrower = loan.borrower as any;
                  const hasLegacyMethod = borrower?.paypal_email || borrower?.cashapp_username || borrower?.venmo_username;
                  
                  if (hasLegacyMethod) {
                    const preferred = borrower?.preferred_payment_method;
                    let methodToShow = preferred;
                    if (!methodToShow) {
                      if (borrower?.paypal_email) methodToShow = 'paypal';
                      else if (borrower?.cashapp_username) methodToShow = 'cashapp';
                      else if (borrower?.venmo_username) methodToShow = 'venmo';
                    }
                    
                    const methodConfigs: Record<string, { bg: string, icon: React.ReactNode, name: string, value: string | undefined, getLink: (amount: number) => string }> = {
                      paypal: {
                        bg: 'bg-[#0070ba] dark:bg-[#003087]',
                        icon: <CreditCard className="w-6 h-6 text-white" />,
                        name: 'PayPal',
                        value: borrower?.paypal_email,
                        getLink: (amount) => `https://www.paypal.com/paypalme/${borrower?.paypal_email?.split('@')[0]}/${amount}`,
                      },
                      cashapp: {
                        bg: 'bg-[#00D632] dark:bg-[#00A826]',
                        icon: <span className="text-white font-bold text-2xl">$</span>,
                        name: 'Cash App',
                        value: borrower?.cashapp_username,
                        getLink: (amount) => `https://cash.app/${borrower?.cashapp_username}/${amount}`,
                      },
                      venmo: {
                        bg: 'bg-[#3D95CE] dark:bg-[#2a6a9a]',
                        icon: <span className="text-white font-bold text-2xl">V</span>,
                        name: 'Venmo',
                        value: borrower?.venmo_username,
                        getLink: (amount) => `https://venmo.com/${borrower?.venmo_username?.replace('@', '')}?txn=pay&amount=${amount}&note=Loan%20from%20Feyza`,
                      },
                    };
                    
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
                                <a
                                  href={config.getLink(loan.amount)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-6 py-3 bg-white text-neutral-900 rounded-lg font-semibold hover:bg-neutral-100 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors flex items-center gap-2"
                                >
                                  Open {config.name} <ExternalLink className="w-4 h-4" />
                                </a>
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
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold text-blue-800 dark:text-blue-300">Waiting for Lender to Send Funds</h3>
                </div>
                <p className="text-blue-700 dark:text-blue-400 text-sm mb-3">
                  Your loan has been approved! The lender will send <strong>{formatCurrency(loan.amount, loan.currency)}</strong> to you via ACH transfer. 
                  You'll be notified once the transfer is initiated.
                </p>
                
                {/* Show borrower's bank info */}
                <div className="bg-white/60 dark:bg-white/10 rounded-lg p-3 text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-300 mb-2">Your receiving account:</p>
                  {(() => {
                    const bankConnected = (loan as any).borrower_bank_connected || 
                      (loan as any).borrower_dwolla_funding_source_url ||
                      (loan.borrower as any)?.dwolla_funding_source_url;
                    const bankName = (loan as any).borrower_bank_name || (loan.borrower as any)?.bank_name;
                    const bankMask = (loan as any).borrower_bank_account_mask || (loan.borrower as any)?.bank_account_mask;
                    
                    if (bankConnected) {
                      return (
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                          <Building className="w-4 h-4" />
                          <span>{bankName || 'Bank Account'} {bankMask && `(••••${bankMask})`}</span>
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

            {/* Loan Amount & Progress */}
            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-6 mb-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Principal</p>
                  <p className="text-3xl font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(loan.amount, loan.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Paid</p>
                  <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                    {formatCurrency(loan.amount_paid, loan.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Remaining</p>
                  <p className="text-3xl font-bold text-neutral-700 dark:text-neutral-300">
                    {formatCurrency(loan.amount_remaining, loan.currency)}
                  </p>
                </div>
              </div>

              {/* Interest Information */}
              {loan.interest_rate > 0 && (
                <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Interest Rate</p>
                    <p className="font-semibold text-neutral-900 dark:text-white">{loan.interest_rate}% APR ({loan.interest_type})</p>
                  </div>
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Total Interest</p>
                    <p className="font-semibold text-orange-600 dark:text-orange-400">{formatCurrency(loan.total_interest, loan.currency)}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Total to Repay</p>
                    <p className="font-semibold text-neutral-900 dark:text-white">{formatCurrency(loan.total_amount, loan.currency)}</p>
                  </div>
                </div>
              )}
            </div>
            {/* Loan Status Summary */}
            {loan.status === 'active' && (loan as any).disbursement_status === 'completed' && schedule.length > 0 && (
              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Banknote className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        {schedule.filter(s => s.is_paid).length === schedule.length 
                          ? '🎉 All Payments Complete!'
                          : schedule.filter(s => s.is_paid).length > 0 
                            ? 'Loan In Progress' 
                            : 'Repayment Started'
                        }
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {schedule.filter(s => s.is_paid).length} of {schedule.length} payments completed
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress indicator */}
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all"
                        style={{ width: `${(schedule.filter(s => s.is_paid).length / schedule.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {Math.round((schedule.filter(s => s.is_paid).length / schedule.length) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* Loan Details */}
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              {loan.purpose && (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Purpose</p>
                    <p className="text-neutral-900 dark:text-white">{loan.purpose}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                <div>
                  <p className="text-neutral-500 dark:text-neutral-400">Repayment Schedule</p>
                  <p className="text-neutral-900 dark:text-white">
                    {formatCurrency(loan.repayment_amount, loan.currency)} / {loan.repayment_frequency}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                <div>
                  <p className="text-neutral-500 dark:text-neutral-400">Start Date</p>
                  <p className="text-neutral-900 dark:text-white">{formatDate(loan.start_date)}</p>
                </div>
              </div>
              {loan.pickup_person_name && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mt-0.5" />
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Pickup Person</p>
                    <p className="text-neutral-900 dark:text-white">
                      {loan.pickup_person_name}
                      {loan.pickup_person_location && ` (${loan.pickup_person_location})`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Lender Terms (shown for business lenders with terms) - NEW SECTION */}
          {loan.business_lender_id && (loan.business_lender as any)?.lending_terms && (
            <Card className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">
                    Lender Terms & Conditions
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTermsExpanded(!termsExpanded)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  {termsExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      Show More
                    </>
                  )}
                </Button>
              </div>
              
              <div className={`bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 overflow-hidden transition-all duration-300 ${
                termsExpanded ? 'max-h-[500px] overflow-y-auto' : 'max-h-32'
              }`}>
                <div className={`relative ${!termsExpanded ? 'gradient-mask-b-10' : ''}`}>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                    {(loan.business_lender as any)?.lending_terms}
                  </p>
                  {!termsExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-blue-50/90 to-transparent dark:from-blue-900/20 dark:to-transparent"></div>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-3">
                By accepting this loan, you agree to these terms set by {(loan.business_lender as any)?.business_name}
              </p>
            </Card>
          )}

          {/* Payment Timeline */}
          {loan.status === 'active' && (
            <Card className='my-5'>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">
                  Repayment Timeline
                </h2>
                {schedule.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const unpaidPayments = schedule
                        .filter(p => !p.is_paid)
                        .map(p => ({
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
                    <Download className="w-4 h-4 mr-1" />
                    Add to Calendar
                  </Button>
                )}
              </div>
              <LoanTimeline
                schedule={schedule}
                currency={loan.currency}
              />
            </Card>
          )}

          {/* Borrower All Paid Section */}
          {loan.status === 'active' && isBorrower && (loan as any).disbursement_status === 'completed' && schedule.length > 0 && !schedule.some(s => !s.is_paid) && (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-green-900 dark:text-green-300 text-lg">🎉 All Payments Complete!</h2>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Congratulations! You've made all scheduled payments. Your loan will be marked as completed once the final transfer processes.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Borrower Pay Early Section */}
          {loan.status === 'active' && isBorrower && (loan as any).disbursement_status === 'completed' && schedule.some(s => !s.is_paid) && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Banknote className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900 dark:text-white">Make a Payment</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Pay early to reduce interest & stay ahead</p>
                  </div>
                </div>
              </div>

              {/* Next Payment Due */}
              {(() => {
                const nextPayment = schedule.find(s => !s.is_paid);
                if (!nextPayment) return null;
                
                const dueDate = new Date(nextPayment.due_date);
                const today = new Date();
                const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysUntilDue < 0;
                const isDueToday = daysUntilDue === 0;
                
                return (
                  <div className={`p-4 rounded-xl border mb-4 ${
                    isOverdue ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 
                    isDueToday ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 
                    'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className={`text-sm font-medium ${
                          isOverdue ? 'text-red-700 dark:text-red-400' : 
                          isDueToday ? 'text-amber-700 dark:text-amber-400' : 
                          'text-neutral-600 dark:text-neutral-400'
                        }`}>
                          {isOverdue 
                            ? `⚠️ Overdue by ${Math.abs(daysUntilDue)} days`
                            : isDueToday 
                            ? '📅 Due Today'
                            : `Next payment in ${daysUntilDue} days`
                          }
                        </p>
                        <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                          {formatCurrency(nextPayment.amount, loan.currency)}
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                          Due {formatDate(nextPayment.due_date)}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleProcessPayment(nextPayment.id)}
                        disabled={processingPayment === nextPayment.id}
                        className={isOverdue ? 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600' : ''}
                      >
                        {processingPayment === nextPayment.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Early Payment
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {/* Payment breakdown */}
                    {(nextPayment.principal_amount || nextPayment.interest_amount) && (
                      <div className="flex gap-4 text-sm border-t border-neutral-200 dark:border-neutral-700 pt-3 mt-3">
                        <div>
                          <span className="text-neutral-500 dark:text-neutral-400">Principal: </span>
                          <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(nextPayment.principal_amount || 0, loan.currency)}</span>
                        </div>
                        {nextPayment.interest_amount && nextPayment.interest_amount > 0 && (
                          <div>
                            <span className="text-neutral-500 dark:text-neutral-400">Interest: </span>
                            <span className="font-medium text-orange-600 dark:text-orange-400">{formatCurrency(nextPayment.interest_amount, loan.currency)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Platform fee breakdown */}
                    {feeSettings?.enabled && !feeLoading && (() => {
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
                );
              })()}

              {/* All upcoming payments */}
              {schedule.filter(s => !s.is_paid).length > 1 && (
                <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                    All Upcoming Payments ({schedule.filter(s => !s.is_paid).length} remaining)
                  </p>
                  <div className="space-y-2">
                    {schedule.filter(s => !s.is_paid).slice(1, 4).map((payment) => {
                      const dueDate = new Date(payment.due_date);
                      const today = new Date();
                      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <div 
                          key={payment.id}
                          className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-sm">
                              <p className="font-medium text-neutral-900 dark:text-white">{formatCurrency(payment.amount, loan.currency)}</p>
                              <p className="text-neutral-500 dark:text-neutral-400">{formatDate(payment.due_date)}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProcessPayment(payment.id)}
                            disabled={processingPayment === payment.id}
                          >
                            {processingPayment === payment.id ? 'Processing...' : 'Pay Early'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  
                  {schedule.filter(s => !s.is_paid).length > 4 && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-3 text-center">
                      +{schedule.filter(s => !s.is_paid).length - 4} more payments
                    </p>
                  )}
                </div>
              )}

              {/* Info about auto-pay */}
              {(loan as any).auto_pay_enabled && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Auto-pay is enabled. Payments will be processed automatically on due dates.</span>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Lender Reminder Section */}
          {loan.status === 'active' && isLender && loan.funds_sent && (
            <Card className='my-5'>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900 dark:text-white">Payment Reminders</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Send reminders to the borrower</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowReminderModal(true)}
                  variant="outline"
                  className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Send Reminder
                </Button>
              </div>

              {/* Upcoming payments with reminder status */}
              <div className="space-y-3">
                {schedule.filter(s => !s.is_paid).slice(0, 3).map((payment) => {
                  const dueDate = new Date(payment.due_date);
                  const today = new Date();
                  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = daysUntilDue < 0;
                  const isDueToday = daysUntilDue === 0;
                  
                  // Check if reminder was sent at least 24 hours ago
                  const reminderSentAt = payment.reminder_sent_at || (payment as any).last_manual_reminder_at;
                  const reminderSent24hAgo = reminderSentAt 
                    ? (new Date().getTime() - new Date(reminderSentAt).getTime()) >= 24 * 60 * 60 * 1000
                    : false;
                  
                  // Only show Process Now if: overdue/due today AND reminder was sent 24+ hours ago
                  const canProcessNow = (isOverdue || isDueToday) && reminderSent24hAgo;
                  
                  return (
                    <div 
                      key={payment.id} 
                      className={`p-4 rounded-xl border ${isOverdue ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {formatCurrency(payment.amount, loan.currency)}
                          </p>
                          <p className={`text-sm ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-neutral-500 dark:text-neutral-400'}`}>
                            {isOverdue 
                              ? `⚠️ ${Math.abs(daysUntilDue)} days overdue`
                              : daysUntilDue === 0 
                                ? 'Due today'
                                : `Due in ${daysUntilDue} days`
                            } • {formatDate(payment.due_date)}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          {reminderSentAt ? (
                            <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Reminder sent
                              <span className="text-neutral-400 dark:text-neutral-500 ml-1">
                                {formatDate(reminderSentAt)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400 dark:text-neutral-500">No reminder sent</span>
                          )}
                          
                          {/* Process Payment Now button - only show 24hr after reminder was sent */}
                          {canProcessNow && isLender && (
                            <Button
                              size="sm"
                              variant={isOverdue ? 'danger' : 'outline'}
                              onClick={() => handleProcessPayment(payment.id)}
                              disabled={processingPayment === payment.id}
                            >
                              {processingPayment === payment.id ? (
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
                              Can process {Math.ceil((24 * 60 * 60 * 1000 - (new Date().getTime() - new Date(reminderSentAt).getTime())) / (60 * 60 * 1000))}h after reminder
                            </span>
                          )}
                          
                          {(isOverdue || isDueToday) && isLender && !reminderSentAt && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                              Send reminder first
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {schedule.filter(s => !s.is_paid).length === 0 && (
                <p className="text-center text-neutral-500 dark:text-neutral-400 py-4">All payments have been made! 🎉</p>
              )}
            </Card>
          )}

          {/* Signed Agreement Section - Visible to Lender */}
          {isLender && (loan.borrower_signed || loan.lender_signed) && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900 dark:text-white">Loan Agreement</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Signed contract for this loan</p>
                  </div>
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

              <div className="space-y-3">
                {/* Borrower Signature */}
                <div className={`p-4 rounded-xl border ${
                  loan.borrower_signed 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                    : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {loan.borrower_signed ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                      )}
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          Borrower: {(loan.borrower as any)?.full_name || 'Unknown'}
                        </p>
                        {loan.borrower_signed && loan.borrower_signed_at && (
                          <p className="text-sm text-green-600 dark:text-green-400">
                            Signed on {formatDate(loan.borrower_signed_at)}
                          </p>
                        )}
                        {!loan.borrower_signed && (
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Not yet signed</p>
                        )}
                      </div>
                    </div>
                    {loan.borrower_signed && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                        ✓ Signed
                      </span>
                    )}
                  </div>
                </div>

                {/* Lender Signature */}
                <div className={`p-4 rounded-xl border ${
                  loan.lender_signed 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                    : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {loan.lender_signed ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                      )}
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          Lender: {(loan.lender as any)?.full_name || (loan.business_lender as any)?.business_name || 'You'}
                        </p>
                        {loan.lender_signed && loan.lender_signed_at && (
                          <p className="text-sm text-green-600 dark:text-green-400">
                            Signed on {formatDate(loan.lender_signed_at)}
                          </p>
                        )}
                        {!loan.lender_signed && (
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Not yet signed</p>
                        )}
                      </div>
                    </div>
                    {loan.lender_signed && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                        ✓ Signed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-4">
                💡 Click "View Contract" to open the full loan agreement in a new tab. You can print or save it as PDF from your browser.
              </p>
            </Card>
          )}

          {/* Pending Actions */}
          {loan.status === 'pending' && (
            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Awaiting Response</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {isBorrower
                      ? 'Waiting for your lender to accept this loan request.'
                      : 'This loan request is waiting for your response.'}
                  </p>
                </div>
                {isLender && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleDeclineLoan}>
                      Decline
                    </Button>
                    <Button className="flex-1 sm:flex-none" onClick={handleAcceptLoan}>
                      Accept
                    </Button>
                  </div>
                )}
                {isBorrower && (
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30"
                    onClick={handleCancelLoan}
                  >
                    Cancel Request
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Completed Status */}
          {loan.status === 'completed' && (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 mt-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Loan Completed! 🎉</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    This loan has been fully repaid. Great job!
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>

      <Footer />

      {/* Payment Confirmation Modal - Lender confirms they sent payment with proof */}
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
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Amount sent:</p>
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
                      <XCircle className="w-4 h-4" />
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

      {/* Reminder Modal */}
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
              Send a reminder email to <strong>{(loan?.borrower as any)?.full_name || 'the borrower'}</strong> about their upcoming payment.
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
    </div>
  );
}