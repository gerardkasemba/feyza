'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Badge, Breadcrumbs, UpdateNotification, ConfirmDialog } from '@/components/ui';
import { Navbar, Footer } from '@/components/layout';
import { createClient } from '@/lib/supabase/client';
import { useGuestSession } from '@/hooks/useGuestSession';
import {
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Building,
  ArrowUpRight,
  ArrowDownLeft,
  Shield,
  Percent,
  PieChart,
  Loader2,
  RefreshCw,
  X,
  LayoutDashboard,
  Receipt,
  Wallet,
  Users,
  LogOut,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface LoanData {
  id: string;
  amount: number;
  currency: string;
  purpose?: string;
  status: string;
  interest_rate: number;
  interest_type: string;
  total_interest: number;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
  repayment_frequency: string;
  total_installments: number;
  repayment_amount: number;
  start_date: string;
  created_at: string;
  borrower_name?: string;
  borrower_invite_email?: string;
  borrower_bank_connected?: boolean;
  lender_name?: string;
  lender_email?: string;
  lender_bank_name?: string;
  lender_bank_account_mask?: string;
  lender_bank_connected?: boolean;
  disbursement_status?: string;
  disbursed_at?: string;
  auto_pay_enabled?: boolean;
  schedule: Array<{
    id: string;
    due_date: string;
    amount: number;
    principal_amount?: number;
    interest_amount?: number;
    is_paid: boolean;
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

type TabKey = 'overview' | 'schedule' | 'transfers' | 'borrower';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function StatusBadge({ status }: { status: string }) {
  const v = status === 'active' ? 'success' : status === 'completed' ? 'default' : status === 'failed' ? 'error' : 'warning';
  return <Badge variant={v as any} className="capitalize">{status}</Badge>;
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-neutral-800">
      <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <Icon className="w-4 h-4" /><span>{label}</span>
      </div>
      <div className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">{value}</div>
    </div>
  );
}

function TabPill({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cx('flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition',
        active ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700')}>
      <Icon className="w-4 h-4" />{label}
    </button>
  );
}

function MobileTabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cx('flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition',
        active ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400')}>
      <Icon className="w-5 h-5" />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

export default function GuestLenderDashboard() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  // Guest session management
  const { session, updateSession, clearSession, getOtherSessions, isLoaded: sessionLoaded } = useGuestSession(token, 'lender');

  const [loan, setLoan] = useState<LoanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [tab, setTab] = useState<TabKey>('overview');
  const [showNotMeDialog, setShowNotMeDialog] = useState(false);

  const supabase = createClient();
  const lastRefreshRef = useRef<number>(Date.now());

  // Get other lender sessions for "Your other loans" section
  const otherLenderSessions = useMemo(() => getOtherSessions('lender'), [getOtherSessions]);

  // Handle "Not me" action
  const handleNotMe = useCallback(() => {
    clearSession();
    router.push('/');
  }, [clearSession, router]);

  const fetchLoanData = useCallback(async () => {
    try {
      const response = await fetch(`/api/guest-lender/${token}`);
      if (!response.ok) {
        if (response.status === 404) setError('Invalid or expired access link');
        else setError('Failed to load loan');
        return null;
      }
      const data = await response.json();
      setLoan(data.loan);
      return data.loan as LoanData;
    } catch (err) {
      console.error('Error fetching loan data:', err);
      setError('Failed to load loan');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const refreshData = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current > 2000) {
      lastRefreshRef.current = now;
      fetchLoanData();
    }
  }, [fetchLoanData]);

  // Update session when loan data changes
  useEffect(() => {
    if (loan && sessionLoaded) {
      updateSession({
        name: loan.borrower_name || loan.borrower_invite_email,
        loanId: loan.id,
      });
    }
  }, [loan?.id, sessionLoaded]);

  useEffect(() => {
    if (token) fetchLoanData();
  }, [token, fetchLoanData]);

  useEffect(() => {
    if (!loan?.id) return;
    const shouldPoll = loan.status === 'pending' || loan.status === 'pending_signature' || loan.status === 'pending_funds' ||
      loan.disbursement_status === 'pending' || loan.disbursement_status === 'processing';
    if (!shouldPoll) return;
    const pollInterval = setInterval(() => fetchLoanData(), 30000);
    return () => clearInterval(pollInterval);
  }, [loan?.id, loan?.status, loan?.disbursement_status, fetchLoanData]);

  useEffect(() => {
    if (!loan?.id) return;
    const channels: any[] = [];

    const showUpdate = (message: string) => {
      setUpdateMessage(message);
      setShowUpdateNotification(true);
      setTimeout(() => setShowUpdateNotification(false), 5000);
    };

    const loanChannel = supabase
      .channel(`lender-loan-${loan.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans', filter: `id=eq.${loan.id}` }, (payload) => {
        const newData = payload.new as any;
        if (newData?.status !== loan?.status) {
          if (newData?.status === 'active') showUpdate('🎉 Loan is now active! Borrower can start repaying.');
          if (newData?.status === 'completed') showUpdate('✅ Congratulations! This loan has been fully repaid!');
        }
        if (newData?.disbursement_status === 'completed' && loan?.disbursement_status !== 'completed') {
          showUpdate('💰 Funds successfully sent to borrower!');
        }
        refreshData();
      })
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));
    channels.push(loanChannel);

    const scheduleChannel = supabase
      .channel(`lender-schedule-${loan.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_schedule', filter: `loan_id=eq.${loan.id}` }, (payload) => {
        const newData = payload.new as any;
        if (payload.eventType === 'UPDATE' && newData?.is_paid) showUpdate('💵 Borrower has made a payment!');
        refreshData();
      })
      .subscribe();
    channels.push(scheduleChannel);

    const transferChannel = supabase
      .channel(`lender-transfers-${loan.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers', filter: `loan_id=eq.${loan.id}` }, (payload) => {
        const newData = payload.new as any;
        if (newData?.status === 'completed') {
          if (newData?.type === 'disbursement') showUpdate('💰 Disbursement transfer processed!');
          if (newData?.type === 'repayment') showUpdate('✅ Repayment received in your bank account!');
        } else if (newData?.status === 'failed') {
          showUpdate('⚠️ Transfer failed. Please check details.');
        }
        refreshData();
      })
      .subscribe();
    channels.push(transferChannel);

    return () => channels.forEach((ch) => supabase.removeChannel(ch));
  }, [loan?.id, loan?.status, loan?.disbursement_status, supabase, refreshData]);

  const derived = useMemo(() => {
    if (!loan) return null;
    const borrowerName = loan.borrower_name || loan.borrower_invite_email?.split('@')[0] || 'Borrower';
    const progress = loan.total_amount > 0 ? (loan.amount_paid / loan.total_amount) * 100 : 0;
    const paidPayments = loan.schedule?.filter((s) => s.is_paid).length || 0;
    const totalPayments = loan.schedule?.length || loan.total_installments;
    const nextPayment = loan.schedule?.find((s) => !s.is_paid);
    const recentTransfers = (loan.transfers || []).slice(0, 5);
    return { borrowerName, progress, paidPayments, totalPayments, nextPayment, recentTransfers };
  }, [loan]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 dark:border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading your loan...</p>
        </div>
      </div>
    );
  }

  if (error || !loan || !derived) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
              {error?.includes('expired') ? 'Link Expired' : 'No Active Loan Found'}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              {error || "We couldn't find an active loan associated with this link."}
            </p>
            <div className="space-y-3">
              <Link href="/lender/access"><Button className="w-full">Request New Access Link</Button></Link>
              <Link href="/"><Button variant="outline" className="w-full">Go to Homepage</Button></Link>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const { borrowerName, progress, paidPayments, totalPayments, nextPayment, recentTransfers } = derived;

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    processed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="w-4 h-4" />,
    processing: <Loader2 className="w-4 h-4 animate-spin" />,
    completed: <CheckCircle className="w-4 h-4" />,
    processed: <CheckCircle className="w-4 h-4" />,
    failed: <AlertCircle className="w-4 h-4" />,
    cancelled: <X className="w-4 h-4" />,
  };

  // TAB CONTENT
  const OverviewTab = (
    <div className="space-y-6">
      {loan.disbursement_status && (
        <Card className={cx('border', loan.disbursement_status === 'processing' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800')}>
          <div className="flex items-center gap-3">
            {loan.disbursement_status === 'processing' ? <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />}
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">{loan.disbursement_status === 'processing' ? 'Funds Being Transferred' : 'Funds Sent'}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {loan.disbursement_status === 'processing' ? `${formatCurrency(loan.amount, loan.currency)} is being transferred to ${borrowerName}. ACH transfers take 1-3 business days.` : `${formatCurrency(loan.amount, loan.currency)} was sent on ${loan.disbursed_at ? formatDate(loan.disbursed_at) : 'N/A'}`}
              </p>
            </div>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="Principal" value={formatCurrency(loan.amount, loan.currency)} icon={Wallet} />
        <MiniStat label="Interest" value={`${loan.interest_rate}% (${loan.interest_type})`} icon={Percent} />
        <MiniStat label="Total to Receive" value={formatCurrency(loan.total_amount, loan.currency)} icon={TrendingUp} />
        <MiniStat label="Next Payment" value={nextPayment ? formatDate(nextPayment.due_date) : '—'} icon={Calendar} />
      </div>
      <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-300">{loan.auto_pay_enabled ? 'Auto-Pay Enabled' : 'Auto-Pay Status'}</h3>
            <p className="text-sm text-green-700 dark:text-green-400">{loan.auto_pay_enabled ? 'Payments will be automatically deposited to your bank account on each due date.' : 'Auto-pay is not enabled for this loan.'}</p>
          </div>
        </div>
        {loan.lender_bank_name && (
          <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800 flex items-center gap-3">
            <Building className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-green-800 dark:text-green-300"><strong>{loan.lender_bank_name}</strong>{loan.lender_bank_account_mask ? <> ••••{loan.lender_bank_account_mask}</> : null}</span>
          </div>
        )}
      </Card>
      {!!recentTransfers.length && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2"><ArrowDownLeft className="w-5 h-5 text-primary-600 dark:text-primary-400" />Recent Activity</h3>
            <Button variant="ghost" size="sm" onClick={fetchLoanData} className="text-sm"><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
          </div>
          <div className="space-y-3">
            {recentTransfers.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={cx('p-2 rounded-lg', statusColors[t.status] || statusColors.pending)}>{statusIcons[t.status] || statusIcons.pending}</div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">{t.type === 'disbursement' ? 'Sent to Borrower' : 'Payment Received'}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{formatDate(t.created_at)}</p>
                  </div>
                </div>
                <div className="text-right">
                  {t.type === 'disbursement' ? (
                    <p className="font-semibold text-red-600 dark:text-red-400">-{formatCurrency(t.amount, loan.currency)}</p>
                  ) : (
                    <>
                      <p className="font-semibold text-green-600 dark:text-green-400">+{formatCurrency(t.net_amount || t.amount, loan.currency)}</p>
                      {t.platform_fee && t.platform_fee > 0 && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatCurrency(t.platform_fee, loan.currency)} fee</p>
                      )}
                    </>
                  )}
                  <Badge variant={t.status === 'completed' ? 'success' : t.status === 'failed' ? 'error' : 'warning'} className="text-xs capitalize">{t.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  const ScheduleTab = (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2"><PieChart className="w-5 h-5 text-primary-600 dark:text-primary-400" />Payment Schedule</h3>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">{paidPayments} of {totalPayments} received</div>
        </div>
        <div className="space-y-3">
          {loan.schedule?.map((p, idx) => {
            const isOverdue = !p.is_paid && new Date(p.due_date) < new Date();
            return (
              <div key={p.id} className={`p-4 rounded-xl border ${p.is_paid ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' : isOverdue ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.is_paid ? 'bg-green-100 dark:bg-green-900/30' : isOverdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
                      {p.is_paid ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-500" /> : <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{idx + 1}</span>}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">{formatCurrency(p.amount, loan.currency)}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{formatDate(p.due_date)}</p>
                    </div>
                  </div>
                  {p.is_paid ? (
                    <Badge variant="success" className="text-xs"><CheckCircle className="w-3 h-3 mr-1" />Received</Badge>
                  ) : isOverdue ? (
                    <Badge variant="danger" className="text-xs">Overdue</Badge>
                  ) : (
                    <Badge variant="default" className="text-xs"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );

  const TransfersTab = (
    <div className="space-y-4">
      {/* Summary Card */}
      {loan.transfers && loan.transfers.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">Disbursed to Borrower</p>
            <p className="text-lg font-bold text-red-700 dark:text-red-300">
              {formatCurrency(
                loan.transfers
                  .filter(t => t.type === 'disbursement' && (t.status === 'completed' || t.status === 'processed'))
                  .reduce((sum, t) => sum + t.amount, 0),
                loan.currency
              )}
            </p>
          </Card>
          <Card className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">Received from Borrower</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-300">
              {formatCurrency(
                loan.transfers
                  .filter(t => t.type === 'repayment' && (t.status === 'completed' || t.status === 'processed'))
                  .reduce((sum, t) => sum + (t.net_amount || t.amount), 0),
                loan.currency
              )}
            </p>
            {/* Show total fees */}
            {loan.transfers
              .filter(t => t.type === 'repayment' && (t.status === 'completed' || t.status === 'processed') && t.platform_fee && t.platform_fee > 0)
              .reduce((sum, t) => sum + (t.platform_fee || 0), 0) > 0 && (
              <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                after {formatCurrency(
                  loan.transfers
                    .filter(t => t.type === 'repayment' && (t.status === 'completed' || t.status === 'processed'))
                    .reduce((sum, t) => sum + (t.platform_fee || 0), 0),
                  loan.currency
                )} platform fees
              </p>
            )}
          </Card>
        </div>
      )}

      {!loan.transfers?.length ? (
        <Card className="text-center py-10">
          <Receipt className="w-6 h-6 text-neutral-500 dark:text-neutral-400 mx-auto mb-3" />
          <h3 className="font-semibold text-neutral-900 dark:text-white">No transfers yet</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Transfer activity will show here.</p>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />Transfer History</h3>
            <Button variant="ghost" size="sm" onClick={fetchLoanData}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
          </div>
          <div className="space-y-3">
            {loan.transfers.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                <div className="flex items-center gap-3">
                  {t.type === 'disbursement' ? (
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center"><ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
                  ) : (
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center"><ArrowDownLeft className="w-5 h-5 text-green-600 dark:text-green-400" /></div>
                  )}
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">{t.type === 'disbursement' ? 'Loan Disbursement' : 'Payment Received'}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{formatDate(t.created_at)}</p>
                  </div>
                </div>
                <div className="text-right">
                  {t.type === 'disbursement' ? (
                    <p className="font-bold text-red-600 dark:text-red-400">-{formatCurrency(t.amount, loan.currency)}</p>
                  ) : (
                    <>
                      <p className="font-bold text-green-600 dark:text-green-400">+{formatCurrency(t.net_amount || t.amount, loan.currency)}</p>
                      {t.platform_fee && t.platform_fee > 0 && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {formatCurrency(t.gross_amount || t.amount, loan.currency)} - {formatCurrency(t.platform_fee, loan.currency)} fee
                        </p>
                      )}
                    </>
                  )}
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  const BorrowerTab = (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2"><User className="w-5 h-5 text-primary-600 dark:text-primary-400" />Borrower Information</h3>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center"><User className="w-7 h-7 text-primary-600 dark:text-primary-400" /></div>
          <div className="min-w-0">
            <p className="font-semibold text-neutral-900 dark:text-white truncate">{borrowerName}</p>
            {loan.borrower_invite_email && <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{loan.borrower_invite_email}</p>}
            <div className="flex items-center gap-2 mt-2">
              {loan.borrower_bank_connected ? (
                <Badge variant="success" className="text-xs"><CheckCircle className="w-3 h-3 mr-1" />Bank Connected</Badge>
              ) : (
                <Badge variant="warning" className="text-xs">Bank Not Connected</Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
      <Card>
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2"><Percent className="w-5 h-5 text-primary-600 dark:text-primary-400" />Loan Terms</h3>
        <div className="space-y-3">
          <div className="flex justify-between gap-4"><span className="text-neutral-600 dark:text-neutral-400">Principal</span><span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(loan.amount, loan.currency)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-neutral-600 dark:text-neutral-400">Interest Rate</span><span className="font-medium text-neutral-900 dark:text-white">{loan.interest_rate}% ({loan.interest_type})</span></div>
          <div className="flex justify-between gap-4"><span className="text-neutral-600 dark:text-neutral-400">Total Interest</span><span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(loan.total_interest, loan.currency)}</span></div>
          <div className="flex justify-between gap-4 pt-3 border-t border-neutral-200 dark:border-neutral-800"><span className="text-neutral-900 dark:text-white font-medium">Total to Receive</span><span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(loan.total_amount, loan.currency)}</span></div>
        </div>
      </Card>
    </div>
  );

  const tabContent = tab === 'overview' ? OverviewTab : tab === 'schedule' ? ScheduleTab : tab === 'transfers' ? TransfersTab : BorrowerTab;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900">
      <UpdateNotification show={showUpdateNotification} message={updateMessage} onRefresh={() => { setShowUpdateNotification(false); fetchLoanData(); }} />

      {/* Desktop layout */}
      <div className="hidden lg:flex lg:flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 py-8 px-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <Breadcrumbs items={[{ label: 'Lender Dashboard' }, { label: `Loan to ${borrowerName}` }]} />
              <div className="flex items-center gap-4">
                {isConnected && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />Live
                  </div>
                )}
                <button
                  onClick={() => setShowNotMeDialog(true)}
                  className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Not me
                </button>
              </div>
            </div>

            <Card className="mb-6 bg-gradient-to-br from-green-600 to-emerald-700 text-white border-0">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-green-100 text-sm mb-1">You Lent</p>
                  <p className="text-4xl font-bold">{formatCurrency(loan.amount, loan.currency)}</p>
                  <p className="text-green-100 mt-2">to {borrowerName}</p>
                </div>
                <Badge className="bg-white/20 text-white border-0 capitalize">{loan.status}</Badge>
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-sm text-green-100 mb-2">
                  <span>Repaid: {formatCurrency(loan.amount_paid, loan.currency)}</span>
                  <span>Remaining: {formatCurrency(loan.amount_remaining, loan.currency)}</span>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-center text-green-100 text-sm mt-2">{paidPayments} of {totalPayments} payments received</p>
              </div>
            </Card>

            <div className="flex flex-wrap gap-2 mb-6">
              <TabPill active={tab === 'overview'} onClick={() => setTab('overview')} icon={LayoutDashboard} label="Overview" />
              <TabPill active={tab === 'schedule'} onClick={() => setTab('schedule')} icon={Calendar} label="Schedule" />
              <TabPill active={tab === 'transfers'} onClick={() => setTab('transfers')} icon={Receipt} label="Transfers" />
              <TabPill active={tab === 'borrower'} onClick={() => setTab('borrower')} icon={Users} label="Borrower" />
              <div className="ml-auto">
                <Button variant="outline" size="sm" onClick={fetchLoanData}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
              </div>
            </div>

            {tabContent}
          </div>
        </main>
        <Footer />
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden min-h-screen flex flex-col">
        <Navbar />
        <div className="sticky top-0 z-30 bg-neutral-50/90 dark:bg-neutral-900/90 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Loan to</div>
              <div className="text-base font-semibold text-neutral-900 dark:text-white truncate">{borrowerName}</div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && (
                <div className="flex items-center gap-1.5 text-[11px] text-green-600 dark:text-green-400">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />Live
                </div>
              )}
              <StatusBadge status={loan.status} />
              <button
                onClick={() => setShowNotMeDialog(true)}
                className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                title="Not me"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-[12px] text-neutral-600 dark:text-neutral-300 mb-2">
              <span className="font-medium">{formatCurrency(loan.amount_paid, loan.currency)} repaid</span>
              <span>{formatCurrency(loan.amount_remaining, loan.currency)} left</span>
            </div>
            <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-neutral-900 dark:bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <main className="flex-1 px-4 py-4 pb-24">{tabContent}</main>

        <div className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-50/95 dark:bg-neutral-900/95 backdrop-blur border-t border-neutral-200 dark:border-neutral-800">
          <div className="max-w-md mx-auto px-4 py-2 grid grid-cols-4 gap-2">
            <MobileTabButton active={tab === 'overview'} onClick={() => setTab('overview')} icon={LayoutDashboard} label="Overview" />
            <MobileTabButton active={tab === 'schedule'} onClick={() => setTab('schedule')} icon={Calendar} label="Schedule" />
            <MobileTabButton active={tab === 'transfers'} onClick={() => setTab('transfers')} icon={Receipt} label="Transfers" />
            <MobileTabButton active={tab === 'borrower'} onClick={() => setTab('borrower')} icon={Users} label="Borrower" />
          </div>
        </div>
      </div>

      {/* Not Me Confirmation Dialog */}
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
  );
}
