'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Badge, Progress, Avatar } from '@/components/ui';
import { LoanTimeline, PaymentModal } from '@/components/loans';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getLoanProgress } from '@/lib/utils';
import { downloadICalFile } from '@/lib/calendar';
import { Loan, PaymentScheduleItem, LoanStatus } from '@/types';
import { PaymentFormData } from '@/lib/validations';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Banknote,
  CreditCard,
  Upload,
  ExternalLink,
  Bell,
  FileText,
  Download,
  TrendingUp,
  DollarSign,
  Users,
  MoreHorizontal,
} from 'lucide-react';

type TabType = 'overview' | 'payments' | 'reminders' | 'documents';

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<PaymentScheduleItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<PaymentScheduleItem | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
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

  const loanId = params.id as string;

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

      let hasAccess = false;
      if (loanData.borrower_id === authUser.id) hasAccess = true;
      else if (loanData.lender_id === authUser.id) hasAccess = true;
      else if (loanData.business_lender_id) {
        const { data: businessProfile } = await supabase
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
      setLoan({ ...loanData, lender: lenderInfo });

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

  const handleMarkPaid = async (data: PaymentFormData) => {
    if (!selectedScheduleItem || !loan) return;

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: loan.id,
          scheduleId: selectedScheduleItem.id,
          amount: data.amount,
          note: data.note,
          proofUrl: data.proofUrl,
        }),
      });

      if (!response.ok) throw new Error('Failed to create payment');
      const result = await response.json();

      setLoan({
        ...loan,
        amount_paid: result.loan.amount_paid,
        amount_remaining: result.loan.amount_remaining,
        status: result.loan.status,
      });

      setSchedule(schedule.map((item) =>
        item.id === selectedScheduleItem.id
          ? { ...item, is_paid: true, payment_id: result.payment.id }
          : item
      ));

      setShowPaymentModal(false);
      setSelectedScheduleItem(null);
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Failed to record payment. Please try again.');
    }
  };

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
      const response = await fetch(`/api/loans/${loan.id}/accept`, { method: 'POST' });
      if (response.redirected) window.location.href = response.url;
    } catch (error) {
      console.error('Error accepting loan:', error);
    }
  };

  const handleDeclineLoan = async () => {
    if (!loan) return;
    try {
      const response = await fetch(`/api/loans/${loan.id}/decline`, { method: 'POST' });
      if (response.ok) router.push('/dashboard');
    } catch (error) {
      console.error('Error declining loan:', error);
    }
  };

  const handleCancelLoan = async () => {
    if (!loan || !confirm('Are you sure you want to cancel this loan request?')) return;
    try {
      const response = await fetch(`/api/loans/${loan.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by borrower' }),
      });
      if (response.ok) router.push('/dashboard');
    } catch (error) {
      console.error('Error cancelling loan:', error);
    }
  };

  const handleSendFunds = async () => {
    if (!loan || !fundsProofFile) {
      alert('Please upload a screenshot proof of payment');
      return;
    }
    
    setFundsSending(true);
    try {
      const supabase = createClient();
      const fileExt = fundsProofFile.name.split('.').pop();
      const fileName = `${loan.id}_${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('loan-documents')
        .upload(filePath, fundsProofFile);
      
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
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-500 text-sm">Loading loan details...</p>
        </div>
      </div>
    );
  }

  const isBorrower = loan.borrower_id === user?.id;
  const isLender = loan.lender_id === user?.id || 
    (loan.business_lender && (loan.business_lender as any).user_id === user?.id);
  const progress = getLoanProgress(loan.amount_paid, loan.amount);
  
  const otherParty = isBorrower ? loan.lender : loan.borrower;
  const otherPartyName = otherParty 
    ? ('business_name' in otherParty ? otherParty.business_name : otherParty.full_name)
    : loan.invite_email || 'Pending';

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

  // Calculate stats
  const paidPayments = schedule.filter(s => s.is_paid).length;
  const totalPayments = schedule.length;
  const overduePayments = schedule.filter(s => !s.is_paid && new Date(s.due_date) < new Date()).length;
  const nextPayment = schedule.find(s => !s.is_paid);

  const tabs: { id: TabType; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'payments', label: 'Payments', icon: DollarSign, count: totalPayments },
    ...(isLender && loan.funds_sent ? [{ id: 'reminders' as TabType, label: 'Reminders', icon: Bell, count: overduePayments }] : []),
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <Navbar user={user} />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Back Link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>

          {/* Header Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left: Avatar + Info */}
              <div className="flex items-center gap-4">
                <Avatar name={otherPartyName} size="lg" className="ring-4 ring-neutral-100 dark:ring-neutral-800" />
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white truncate">
                      {otherPartyName}
                    </h1>
                    <Badge variant={statusColor} size="sm">
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusLabel}
                    </Badge>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    {isBorrower ? 'Your Lender' : 'Borrower'} • {loan.lender_type === 'business' ? 'Business Loan' : 'Personal Loan'}
                  </p>
                </div>
              </div>

              {/* Right: Amount + Quick Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="text-left sm:text-right">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Amount</p>
                  <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(loan.total_amount || loan.amount, loan.currency)}
                  </p>
                </div>
                
                {/* Primary Action Button */}
                {loan.status === 'active' && !loan.funds_sent && isLender && (
                  <Button 
                    onClick={() => setShowFundsModal(true)}
                    className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Payment
                  </Button>
                )}
                {isLender && loan.funds_sent && (
                  <Button 
                    onClick={() => setShowReminderModal(true)}
                    variant="outline"
                    className="whitespace-nowrap"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Send Reminder
                  </Button>
                )}
              </div>
            </div>

            {/* Progress Bar (for active loans) */}
            {loan.status === 'active' && loan.funds_sent && (
              <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    {formatCurrency(loan.amount_paid, loan.currency)} paid
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-white">{progress}% complete</span>
                </div>
                <Progress value={progress} size="md" />
              </div>
            )}
          </div>

          {/* Alert Banners */}
          {loan.status === 'active' && !loan.funds_sent && isLender && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Action Required</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Send {formatCurrency(loan.amount, loan.currency)} to {(loan.borrower as any)?.full_name || 'the borrower'} to activate this loan.
                  </p>
                </div>
              </div>
            </div>
          )}

          {loan.status === 'active' && !loan.funds_sent && isBorrower && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">Waiting for Payment</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Your lender will send {formatCurrency(loan.amount, loan.currency)} soon. You'll be notified when it's sent.
                  </p>
                </div>
              </div>
            </div>
          )}

          {loan.status === 'pending' && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      {isBorrower ? 'Awaiting Lender Response' : 'Loan Request Pending'}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      {isBorrower 
                        ? 'Waiting for your lender to accept this loan request.'
                        : 'Review the details and accept or decline this loan request.'}
                    </p>
                  </div>
                </div>
                {isLender && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleDeclineLoan}>
                      Decline
                    </Button>
                    <Button size="sm" onClick={handleAcceptLoan}>
                      Accept Loan
                    </Button>
                  </div>
                )}
                {isBorrower && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={handleCancelLoan}
                  >
                    Cancel Request
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl mb-6 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 sm:flex-none justify-center ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                        : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">Principal</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">
                      {formatCurrency(loan.amount, loan.currency)}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">Paid</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(loan.amount_paid, loan.currency)}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">Remaining</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">
                      {formatCurrency(loan.amount_remaining, loan.currency)}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">Payments</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">
                      {paidPayments}/{totalPayments}
                    </p>
                  </div>
                </div>

                {/* Loan Details */}
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Loan Details</h2>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    {loan.purpose && (
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">Purpose</p>
                        <p className="text-sm text-neutral-900 dark:text-white">{loan.purpose}</p>
                      </div>
                    )}
                    
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">Repayment</p>
                      <p className="text-sm text-neutral-900 dark:text-white">
                        {formatCurrency(loan.repayment_amount, loan.currency)} / {loan.repayment_frequency}
                      </p>
                    </div>

                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">Start Date</p>
                      <p className="text-sm text-neutral-900 dark:text-white">{formatDate(loan.start_date)}</p>
                    </div>

                    {loan.interest_rate > 0 && (
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">Interest Rate</p>
                        <p className="text-sm text-neutral-900 dark:text-white">{loan.interest_rate}% APR ({loan.interest_type})</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Next Payment Card */}
                {nextPayment && loan.funds_sent && (
                  <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Next Payment</h2>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <div>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                          {formatCurrency(nextPayment.amount, loan.currency)}
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                          Due {formatDate(nextPayment.due_date)}
                        </p>
                      </div>
                      {isBorrower && (
                        <Button 
                          onClick={() => {
                            setSelectedScheduleItem(nextPayment);
                            setShowPaymentModal(true);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Paid
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Send Payment Section (for lender) */}
                {loan.status === 'active' && !loan.funds_sent && isLender && (
                  <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Send Payment to Borrower</h2>
                    
                    {(() => {
                      const borrower = loan.borrower as any;
                      const preferred = borrower?.preferred_payment_method;
                      let methodToShow = preferred;
                      if (!methodToShow) {
                        if (borrower?.paypal_email) methodToShow = 'paypal';
                        else if (borrower?.cashapp_username) methodToShow = 'cashapp';
                        else if (borrower?.venmo_username) methodToShow = 'venmo';
                      }
                      
                      if (!methodToShow) {
                        return (
                          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-amber-700 dark:text-amber-300 text-sm">
                              ⚠️ Borrower hasn't set up payment methods. Contact them to add PayPal, Cash App, or Venmo.
                            </p>
                          </div>
                        );
                      }
                      
                      const methodConfigs: Record<string, { bg: string; icon: React.ReactNode; name: string; value: string | undefined; getLink: (amount: number) => string }> = {
                        paypal: {
                          bg: 'bg-[#0070ba]',
                          icon: <CreditCard className="w-5 h-5 text-white" />,
                          name: 'PayPal',
                          value: borrower?.paypal_email,
                          getLink: (amount) => `https://www.paypal.com/paypalme/${borrower?.paypal_email?.split('@')[0]}/${amount}`,
                        },
                        cashapp: {
                          bg: 'bg-[#00D632]',
                          icon: <span className="text-white font-bold text-lg">$</span>,
                          name: 'Cash App',
                          value: borrower?.cashapp_username,
                          getLink: (amount) => `https://cash.app/${borrower?.cashapp_username}/${amount}`,
                        },
                        venmo: {
                          bg: 'bg-[#3D95CE]',
                          icon: <span className="text-white font-bold text-lg">V</span>,
                          name: 'Venmo',
                          value: borrower?.venmo_username,
                          getLink: (amount) => `https://venmo.com/${borrower?.venmo_username?.replace('@', '')}?txn=pay&amount=${amount}&note=Loan%20from%20Feyza`,
                        },
                      };
                      
                      const config = methodConfigs[methodToShow];
                      if (!config?.value) return null;
                      
                      return (
                        <div className={`${config.bg} rounded-xl p-4 sm:p-6`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                {config.icon}
                              </div>
                              <div className="min-w-0">
                                <p className="text-white/80 text-sm">Send via {config.name}</p>
                                <p className="font-bold text-lg text-white truncate">{config.value}</p>
                              </div>
                            </div>
                            <a
                              href={config.getLink(loan.amount)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-5 py-2.5 bg-white text-neutral-900 rounded-lg font-medium hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                              Open {config.name}
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      );
                    })()}

                    <Button
                      onClick={() => setShowFundsModal(true)}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      I've Sent Payment - Upload Proof
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Payment Schedule</h2>
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
                      <Download className="w-4 h-4 mr-2" />
                      Add to Calendar
                    </Button>
                  )}
                </div>

                <LoanTimeline
                  schedule={schedule}
                  currency={loan.currency}
                  onMarkPaid={isBorrower ? (item) => {
                    setSelectedScheduleItem(item);
                    setShowPaymentModal(true);
                  } : undefined}
                />
              </div>
            )}

            {/* Reminders Tab */}
            {activeTab === 'reminders' && isLender && loan.funds_sent && (
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Payment Reminders</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Send reminders to the borrower about upcoming payments</p>
                  </div>
                  <Button onClick={() => setShowReminderModal(true)}>
                    <Bell className="w-4 h-4 mr-2" />
                    Send Reminder
                  </Button>
                </div>

                <div className="space-y-3">
                  {schedule.filter(s => !s.is_paid).length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <p className="text-neutral-600 dark:text-neutral-400">All payments have been made! 🎉</p>
                    </div>
                  ) : (
                    schedule.filter(s => !s.is_paid).map((payment) => {
                      const dueDate = new Date(payment.due_date);
                      const today = new Date();
                      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      const isOverdue = daysUntilDue < 0;
                      
                      return (
                        <div 
                          key={payment.id} 
                          className={`p-4 rounded-xl border ${
                            isOverdue 
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                              : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-neutral-900 dark:text-white">
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
                            <div className="flex items-center gap-3">
                              {(payment.reminder_sent_at || (payment as any).last_manual_reminder_at) ? (
                                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Reminded {formatDate(payment.reminder_sent_at ?? (payment as any).last_manual_reminder_at)}
                                </span>
                              ) : (
                                <span className="text-xs text-neutral-400">No reminder sent</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Loan Documents</h2>

                {(loan.borrower_signed || loan.lender_signed) ? (
                  <div className="space-y-4">
                    <a
                      href={`/api/contracts?loanId=${loan.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-green-300 dark:hover:border-green-700 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                          <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">Loan Agreement</p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Signed contract for this loan</p>
                        </div>
                      </div>
                      <Download className="w-5 h-5 text-neutral-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
                    </a>

                    {/* Signature Status */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className={`p-4 rounded-xl border ${
                        loan.borrower_signed 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                          : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                      }`}>
                        <div className="flex items-center gap-3">
                          {loan.borrower_signed ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-neutral-400" />
                          )}
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white text-sm">
                              Borrower: {(loan.borrower as any)?.full_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {loan.borrower_signed && loan.borrower_signed_at
                                ? `Signed ${formatDate(loan.borrower_signed_at)}` 
                                : 'Not yet signed'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`p-4 rounded-xl border ${
                        loan.lender_signed 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                          : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                      }`}>
                        <div className="flex items-center gap-3">
                          {loan.lender_signed ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-neutral-400" />
                          )}
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white text-sm">
                              Lender: {(loan.lender as any)?.full_name || (loan.business_lender as any)?.business_name || 'You'}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {loan.lender_signed && loan.lender_signed_at
                                ? `Signed ${formatDate(loan.lender_signed_at)}` 
                                : 'Not yet signed'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-500 dark:text-neutral-400">No documents available yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Completed Status */}
            {loan.status === 'completed' && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-200">Loan Completed! 🎉</h3>
                    <p className="text-sm text-green-700 dark:text-green-300">This loan has been fully repaid.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedScheduleItem(null);
        }}
        scheduleItem={selectedScheduleItem}
        currency={loan.currency}
        lenderPayPalEmail={
          (loan.lender as any)?.paypal_email || 
          (loan.business_lender as any)?.paypal_email ||
          (loan as any).guest_lender?.paypal_email
        }
        lenderName={
          (loan.lender as any)?.full_name || 
          (loan.business_lender as any)?.business_name ||
          (loan as any).guest_lender?.full_name ||
          'Lender'
        }
        lenderPaymentInfo={{
          paypal_email: (loan.lender as any)?.paypal_email || (loan.business_lender as any)?.paypal_email || (loan.business_lender as any)?.contact_email || (loan as any).guest_lender?.paypal_email,
          cashapp_username: (loan.lender as any)?.cashapp_username || (loan.business_lender as any)?.cashapp_username,
          venmo_username: (loan.lender as any)?.venmo_username || (loan.business_lender as any)?.venmo_username,
          preferred_payment_method: (loan.lender as any)?.preferred_payment_method || (loan.business_lender as any)?.preferred_payment_method,
        }}
        onSubmit={handleMarkPaid}
      />

      {/* Funds Confirmation Modal */}
      {showFundsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 my-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Confirm Payment Sent</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Upload proof of your payment</p>
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500 dark:text-neutral-400">Amount</span>
                <span className="text-xl font-bold text-neutral-900 dark:text-white">
                  {formatCurrency(loan.amount, loan.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-neutral-500 dark:text-neutral-400">To</span>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {(loan.borrower as any)?.full_name || 'Borrower'}
                </span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Payment Method *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(loan.borrower as any)?.paypal_email && (
                    <button
                      type="button"
                      onClick={() => setFundsPaymentMethod('paypal')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        fundsPaymentMethod === 'paypal' 
                          ? 'border-[#0070ba] bg-[#0070ba]/10' 
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <div className="w-8 h-8 bg-[#0070ba] rounded mx-auto mb-1 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">PayPal</span>
                    </button>
                  )}
                  {(loan.borrower as any)?.cashapp_username && (
                    <button
                      type="button"
                      onClick={() => setFundsPaymentMethod('cashapp')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        fundsPaymentMethod === 'cashapp' 
                          ? 'border-[#00D632] bg-[#00D632]/10' 
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <div className="w-8 h-8 bg-[#00D632] rounded mx-auto mb-1 flex items-center justify-center">
                        <span className="text-white font-bold">$</span>
                      </div>
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Cash App</span>
                    </button>
                  )}
                  {(loan.borrower as any)?.venmo_username && (
                    <button
                      type="button"
                      onClick={() => setFundsPaymentMethod('venmo')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        fundsPaymentMethod === 'venmo' 
                          ? 'border-[#3D95CE] bg-[#3D95CE]/10' 
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <div className="w-8 h-8 bg-[#3D95CE] rounded mx-auto mb-1 flex items-center justify-center">
                        <span className="text-white font-bold">V</span>
                      </div>
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Venmo</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Transaction Reference (optional)
                </label>
                <input
                  type="text"
                  value={fundsReference}
                  onChange={(e) => setFundsReference(e.target.value)}
                  placeholder="e.g., 5TY12345ABC678901"
                  className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Proof Upload */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Screenshot Proof *
                </label>
                
                {fundsProofPreview ? (
                  <div className="relative">
                    <img 
                      src={fundsProofPreview} 
                      alt="Payment proof" 
                      className="w-full h-40 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFundsProofFile(null);
                        setFundsProofPreview(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors">
                    <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Click to upload</span>
                    <span className="text-xs text-neutral-400 mt-1">PNG, JPG up to 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFundsProofFile(file);
                          const reader = new FileReader();
                          reader.onload = (e) => setFundsProofPreview(e.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
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
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={fundsSending || !fundsProofFile}
              >
                {fundsSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Confirming...
                  </>
                ) : (
                  'Confirm Payment'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Send Reminder</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  To {(loan?.borrower as any)?.full_name || 'borrower'}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Personal message (optional)
              </label>
              <textarea
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                placeholder="Add a friendly note..."
                className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                rows={3}
              />
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
                className="flex-1 bg-amber-500 hover:bg-amber-600"
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