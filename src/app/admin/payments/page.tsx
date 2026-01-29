'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import {
  CreditCard,
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Filter,
  Play,
  Calendar,
  User,
  FileText,
  TrendingUp,
  Ban,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface Payment {
  id: string;
  loan_id: string;
  due_date: string;
  amount: number;
  principal_amount: number;
  interest_amount: number;
  is_paid: boolean;
  status: string;
  retry_count: number;
  last_retry_at: string | null;
  next_retry_at: string | null;
  caused_block: boolean;
  loan?: {
    id: string;
    amount: number;
    currency: string;
    borrower_name: string;
    lender_name: string;
    borrower?: { full_name: string; email: string };
    business_lender?: { business_name: string };
  };
}

interface RetryLog {
  id: string;
  payment_id: string;
  retry_number: number;
  attempted_at: string;
  success: boolean;
  error_message: string | null;
  will_block_on_failure: boolean;
}

type FilterStatus = 'all' | 'overdue' | 'failed' | 'defaulted' | 'retry_pending';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [retryLogs, setRetryLogs] = useState<RetryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [triggeringRetry, setTriggeringRetry] = useState(false);
  const [triggeringAutoPay, setTriggeringAutoPay] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    overdue: 0,
    failed: 0,
    defaulted: 0,
    retryPending: 0,
  });
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);

    const today = new Date().toISOString().split('T')[0];

    // Fetch payments with issues
    const { data: paymentsData } = await supabase
      .from('payment_schedule')
      .select(`
        *,
        loan:loans(
          id,
          amount,
          currency,
          borrower_name,
          lender_name,
          borrower:users!borrower_id(full_name, email),
          business_lender:business_profiles!business_lender_id(business_name)
        )
      `)
      .eq('is_paid', false)
      .or(`status.eq.failed,status.eq.defaulted,status.eq.overdue,due_date.lt.${today}`)
      .order('due_date', { ascending: true })
      .limit(100);

    // Fetch retry logs
    const { data: logsData } = await supabase
      .from('payment_retry_log')
      .select('*')
      .order('attempted_at', { ascending: false })
      .limit(50);

    // Calculate stats
    const allPayments = paymentsData || [];
    const overdueCount = allPayments.filter(p => {
      const dueDate = new Date(p.due_date);
      const now = new Date();
      return dueDate < now && !p.is_paid && p.status !== 'failed' && p.status !== 'defaulted';
    }).length;

    setPayments(allPayments);
    setRetryLogs(logsData || []);
    setStats({
      total: allPayments.length,
      overdue: overdueCount,
      failed: allPayments.filter(p => p.status === 'failed').length,
      defaulted: allPayments.filter(p => p.status === 'defaulted').length,
      retryPending: allPayments.filter(p => p.retry_count > 0 && p.retry_count < 3 && !p.is_paid).length,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const triggerPaymentRetry = async () => {
    setTriggeringRetry(true);
    try {
      const res = await fetch('/api/cron/payment-retry');
      const data = await res.json();
      alert(`Payment retry completed: ${JSON.stringify(data)}`);
      await fetchData();
    } catch (err) {
      alert('Failed to trigger payment retry');
    }
    setTriggeringRetry(false);
  };

  const triggerAutoPay = async () => {
    setTriggeringAutoPay(true);
    try {
      const res = await fetch('/api/cron/auto-pay');
      const data = await res.json();
      alert(`Auto-pay completed: ${JSON.stringify(data)}`);
      await fetchData();
    } catch (err) {
      alert('Failed to trigger auto-pay');
    }
    setTriggeringAutoPay(false);
  };

  const markAsPaid = async (paymentId: string) => {
    if (!confirm('Mark this payment as paid? This will update the loan balance.')) return;

    try {
      const { error } = await supabase
        .from('payment_schedule')
        .update({
          is_paid: true,
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (error) throw error;
      await fetchData();
    } catch (err) {
      alert('Failed to mark payment as paid');
    }
  };

  const filteredPayments = payments.filter(payment => {
    const borrowerName = payment.loan?.borrower?.full_name || payment.loan?.borrower_name || '';
    const matchesSearch = borrowerName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === 'all') return true;
    if (filterStatus === 'overdue') {
      const dueDate = new Date(payment.due_date);
      return dueDate < new Date() && payment.status !== 'failed' && payment.status !== 'defaulted';
    }
    if (filterStatus === 'failed') return payment.status === 'failed';
    if (filterStatus === 'defaulted') return payment.status === 'defaulted';
    if (filterStatus === 'retry_pending') return payment.retry_count > 0 && payment.retry_count < 3;

    return true;
  });

  const getStatusBadge = (payment: Payment) => {
    if (payment.status === 'defaulted') {
      return (
        <span className="px-2 py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 text-xs rounded-full flex items-center gap-1">
          <Ban className="w-3 h-3" />
          Defaulted
        </span>
      );
    }
    if (payment.status === 'failed') {
      return (
        <span className="px-2 py-1 bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 text-xs rounded-full flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Failed ({payment.retry_count}/3)
        </span>
      );
    }
    const dueDate = new Date(payment.due_date);
    if (dueDate < new Date()) {
      return (
        <span className="px-2 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs rounded-full flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Overdue
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs rounded-full flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-48" />
          <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-emerald-500" />
            Payments & Retries
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Monitor payment issues and retry queue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={triggerAutoPay}
            disabled={triggeringAutoPay}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            {triggeringAutoPay ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Auto-Pay
          </button>
          <button
            onClick={triggerPaymentRetry}
            disabled={triggeringRetry}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            {triggeringRetry ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Trigger Retry
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg">
              <FileText className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.total}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Issues</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.overdue}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Overdue</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg">
              <XCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.failed}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Failed</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg">
              <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.defaulted}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Defaulted</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
              <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.retryPending}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Retry Queue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by borrower name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-neutral-900 dark:text-white placeholder-neutral-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-neutral-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
          >
            <option value="all">All Issues</option>
            <option value="overdue">Overdue</option>
            <option value="failed">Failed</option>
            <option value="defaulted">Defaulted</option>
            <option value="retry_pending">Retry Pending</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Borrower</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Due Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Next Retry</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-neutral-500" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {payment.loan?.borrower?.full_name || payment.loan?.borrower_name || 'Unknown'}
                        </p>
                        <Link 
                          href={`/admin/loans?id=${payment.loan_id}`}
                          className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          View Loan
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-neutral-900 dark:text-white">
                        {format(new Date(payment.due_date), 'MMM d, yyyy')}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {formatDistanceToNow(new Date(payment.due_date), { addSuffix: true })}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {formatCurrency(payment.amount, payment.loan?.currency)}
                    </p>
                  </td>
                  <td className="py-4 px-4">
                    {getStatusBadge(payment)}
                    {payment.caused_block && (
                      <span className="ml-2 text-xs text-red-500">• Caused Block</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm text-neutral-600 dark:text-neutral-300">
                    {payment.next_retry_at ? (
                      <div>
                        <p>{format(new Date(payment.next_retry_at), 'MMM d, h:mm a')}</p>
                        <p className="text-xs text-neutral-400">
                          {formatDistanceToNow(new Date(payment.next_retry_at), { addSuffix: true })}
                        </p>
                      </div>
                    ) : payment.status === 'defaulted' ? (
                      <span className="text-red-500">Max retries reached</span>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => markAsPaid(payment.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 rounded-lg transition-colors text-sm font-medium"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark Paid
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500 dark:text-neutral-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-50" />
                    <p>No payment issues found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Retry History */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Recent Retry Attempts</h2>
        <div className="space-y-3">
          {retryLogs.slice(0, 10).map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  log.success 
                    ? 'bg-emerald-100 dark:bg-emerald-500/20' 
                    : 'bg-red-100 dark:bg-red-500/20'
                }`}>
                  {log.success ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    Retry #{log.retry_number}
                    {log.will_block_on_failure && !log.success && (
                      <span className="ml-2 text-xs text-red-500">(Final attempt)</span>
                    )}
                  </p>
                  {log.error_message && (
                    <p className="text-sm text-red-500 dark:text-red-400">
                      {log.error_message}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  {format(new Date(log.attempted_at), 'MMM d, h:mm a')}
                </p>
                <p className="text-xs text-neutral-400">
                  {formatDistanceToNow(new Date(log.attempted_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
          {retryLogs.length === 0 && (
            <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">
              No retry attempts yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
