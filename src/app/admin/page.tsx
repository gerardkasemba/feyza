'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import {
  Users,
  FileText,
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Activity,
  Wifi,
  WifiOff,
  Ban,
  RefreshCw,
  CreditCard,
  AlertTriangle,
  Percent,
  Play,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface Stats {
  totalUsers: number;
  totalLoans: number;
  totalBusinesses: number;
  activeLoans: number;
  pendingLoans: number;
  completedLoans: number;
  cancelledLoans: number;
  totalLoanAmount: number;
  totalRepaid: number;
  recentUsers: any[];
  recentLoans: any[];
  overduePayments: number;
  blockedBorrowers: number;
  pendingVerifications: number;
  failedPayments: number;
  defaultRate: number;
  platformRevenue: number;
  retryQueueCount: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastRefreshRef = useRef<number>(Date.now());
  const supabase = createClient();

  const fetchStats = useCallback(async () => {
    // Fetch all stats in parallel
    const [
      usersResult,
      loansResult,
      businessesResult,
      activeLoansResult,
      pendingLoansResult,
      completedLoansResult,
      cancelledLoansResult,
      recentUsersResult,
      recentLoansResult,
      overdueResult,
      blockedResult,
      pendingVerificationResult,
      failedPaymentsResult,
      retryQueueResult,
      platformFeeResult,
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('loans').select('id, amount, amount_paid, status', { count: 'exact' }),
      supabase.from('business_profiles').select('id', { count: 'exact' }),
      supabase.from('loans').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('loans').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('loans').select('id', { count: 'exact' }).eq('status', 'completed'),
      supabase.from('loans').select('id', { count: 'exact' }).eq('status', 'cancelled'),
      supabase.from('users').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('loans').select(`
        *,
        borrower:users!borrower_id(full_name, email),
        lender:users!lender_id(full_name),
        business_lender:business_profiles!business_lender_id(business_name)
      `).order('created_at', { ascending: false }).limit(5),
      supabase.from('payment_schedule')
        .select('id', { count: 'exact' })
        .eq('is_paid', false)
        .lt('due_date', new Date().toISOString().split('T')[0]),
      supabase.from('users')
        .select('id', { count: 'exact' })
        .eq('is_blocked', true),
      supabase.from('business_profiles')
        .select('id', { count: 'exact' })
        .eq('is_verified', false),
      supabase.from('payment_schedule')
        .select('id', { count: 'exact' })
        .in('status', ['failed', 'defaulted']),
      supabase.from('payment_schedule')
        .select('id', { count: 'exact' })
        .gt('retry_count', 0)
        .lt('retry_count', 3)
        .eq('is_paid', false),
      supabase.from('transfers')
        .select('platform_fee')
        .eq('status', 'completed'),
    ]);

    const loans = loansResult.data || [];
    const totalLoanAmount = loans.reduce((sum, l) => sum + (l.amount || 0), 0);
    const totalRepaid = loans.reduce((sum, l) => sum + (l.amount_paid || 0), 0);
    
    // Calculate default rate
    const totalLoansCount = loansResult.count || 0;
    const defaultedLoans = loans.filter(l => l.status === 'defaulted').length;
    const defaultRate = totalLoansCount > 0 ? (defaultedLoans / totalLoansCount) * 100 : 0;
    
    // Calculate platform revenue
    const platformRevenue = (platformFeeResult.data || []).reduce((sum, t) => sum + (t.platform_fee || 0), 0);

    setStats({
      totalUsers: usersResult.count || 0,
      totalLoans: loansResult.count || 0,
      totalBusinesses: businessesResult.count || 0,
      activeLoans: activeLoansResult.count || 0,
      pendingLoans: pendingLoansResult.count || 0,
      completedLoans: completedLoansResult.count || 0,
      cancelledLoans: cancelledLoansResult.count || 0,
      totalLoanAmount,
      totalRepaid,
      recentUsers: recentUsersResult.data || [],
      recentLoans: recentLoansResult.data || [],
      overduePayments: overdueResult.count || 0,
      blockedBorrowers: blockedResult.count || 0,
      pendingVerifications: pendingVerificationResult.count || 0,
      failedPayments: failedPaymentsResult.count || 0,
      defaultRate,
      platformRevenue,
      retryQueueCount: retryQueueResult.count || 0,
    });
    setLoading(false);
  }, [supabase]);

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  // Debounced refresh
  const refreshData = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current > 2000) {
      lastRefreshRef.current = now;
      fetchStats();
    }
  }, [fetchStats]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Real-time subscriptions
  useEffect(() => {
    const channels: any[] = [];

    // Loans channel
    const loansChannel = supabase
      .channel('admin-loans')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, () => {
        refreshData();
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });
    channels.push(loansChannel);

    // Users channel
    const usersChannel = supabase
      .channel('admin-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        refreshData();
      })
      .subscribe();
    channels.push(usersChannel);

    // Business profiles channel
    const businessChannel = supabase
      .channel('admin-business')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_profiles' }, () => {
        refreshData();
      })
      .subscribe();
    channels.push(businessChannel);

    // Payments channel
    const paymentsChannel = supabase
      .channel('admin-payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_schedule' }, () => {
        refreshData();
      })
      .subscribe();
    channels.push(paymentsChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [supabase, refreshData]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-48" />
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Dashboard</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Platform overview and quick actions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-500">Connecting...</span>
              </>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium text-neutral-700 dark:text-neutral-200"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Alert Cards - Quick Actions */}
      {(stats?.pendingVerifications || 0) > 0 || (stats?.retryQueueCount || 0) > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(stats?.pendingVerifications || 0) > 0 && (
            <Link href="/admin/verification" className="block">
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-amber-800 dark:text-amber-300">
                      {stats?.pendingVerifications} Business{stats?.pendingVerifications !== 1 ? 'es' : ''} Pending Verification
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">Click to review</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-amber-500" />
                </div>
              </div>
            </Link>
          )}
          {(stats?.retryQueueCount || 0) > 0 && (
            <Link href="/admin/payments" className="block">
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-red-800 dark:text-red-300">
                      {stats?.retryQueueCount} Payment{stats?.retryQueueCount !== 1 ? 's' : ''} in Retry Queue
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">Payments awaiting retry</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </Link>
          )}
        </div>
      ) : null}

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          color="blue"
          href="/admin/users"
        />
        <StatCard
          title="Total Loans"
          value={stats?.totalLoans || 0}
          icon={FileText}
          color="emerald"
          href="/admin/loans"
        />
        <StatCard
          title="Businesses"
          value={stats?.totalBusinesses || 0}
          icon={Building2}
          color="purple"
          href="/admin/businesses"
        />
        <StatCard
          title="Platform Revenue"
          value={formatCurrency(stats?.platformRevenue || 0)}
          icon={DollarSign}
          color="amber"
          href="/admin/reports"
        />
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Loans"
          value={stats?.activeLoans || 0}
          icon={Activity}
          color="emerald"
          subtitle="Currently active"
        />
        <StatCard
          title="Pending Loans"
          value={stats?.pendingLoans || 0}
          icon={Clock}
          color="yellow"
          subtitle="Awaiting approval"
        />
        <StatCard
          title="Completed"
          value={stats?.completedLoans || 0}
          icon={CheckCircle}
          color="blue"
          subtitle="Successfully repaid"
        />
        <StatCard
          title="Overdue Payments"
          value={stats?.overduePayments || 0}
          icon={AlertCircle}
          color="red"
          subtitle="Need attention"
          href="/admin/payments"
        />
      </div>

      {/* Risk Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Blocked Borrowers"
          value={stats?.blockedBorrowers || 0}
          icon={Ban}
          color="red"
          href="/admin/blocked"
        />
        <StatCard
          title="Failed Payments"
          value={stats?.failedPayments || 0}
          icon={XCircle}
          color="orange"
          href="/admin/payments"
        />
        <StatCard
          title="Default Rate"
          value={`${(stats?.defaultRate || 0).toFixed(1)}%`}
          icon={Percent}
          color={stats?.defaultRate && stats.defaultRate > 5 ? 'red' : 'emerald'}
          href="/admin/reports"
        />
        <StatCard
          title="Retry Queue"
          value={stats?.retryQueueCount || 0}
          icon={RefreshCw}
          color="purple"
          href="/admin/payments"
        />
      </div>

      {/* Financial Overview + Loan Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Financial Overview</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-neutral-700 dark:text-neutral-300">Total Loaned</span>
              </div>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(stats?.totalLoanAmount || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-100 dark:border-blue-500/20">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-neutral-700 dark:text-neutral-300">Total Repaid</span>
              </div>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(stats?.totalRepaid || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-100 dark:border-amber-500/20">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="text-neutral-700 dark:text-neutral-300">Outstanding</span>
              </div>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency((stats?.totalLoanAmount || 0) - (stats?.totalRepaid || 0))}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-500/10 rounded-lg border border-purple-100 dark:border-purple-500/20">
              <div className="flex items-center gap-3">
                <Percent className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-neutral-700 dark:text-neutral-300">Platform Revenue</span>
              </div>
              <span className="font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(stats?.platformRevenue || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Loan Status Distribution</h2>
          <div className="space-y-4">
            <StatusBar
              label="Active"
              value={stats?.activeLoans || 0}
              total={stats?.totalLoans || 1}
              color="emerald"
            />
            <StatusBar
              label="Pending"
              value={stats?.pendingLoans || 0}
              total={stats?.totalLoans || 1}
              color="yellow"
            />
            <StatusBar
              label="Completed"
              value={stats?.completedLoans || 0}
              total={stats?.totalLoans || 1}
              color="blue"
            />
            <StatusBar
              label="Cancelled"
              value={stats?.cancelledLoans || 0}
              total={stats?.totalLoans || 1}
              color="neutral"
            />
          </div>
          <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">Repayment Rate</span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {((stats?.totalRepaid || 0) / (stats?.totalLoanAmount || 1) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickActionButton
            label="Trigger Payment Retry"
            icon={RefreshCw}
            href="/api/cron/payment-retry"
            color="blue"
          />
          <QuickActionButton
            label="Process Auto-Pay"
            icon={CreditCard}
            href="/api/cron/auto-pay"
            color="emerald"
          />
          <QuickActionButton
            label="Lift Restrictions"
            icon={Ban}
            href="/api/cron/lift-restrictions"
            color="purple"
          />
          <QuickActionButton
            label="Send Reminders"
            icon={Clock}
            href="/api/cron/reminders"
            color="amber"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Recent Users</h2>
            <Link
              href="/admin/users"
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.recentUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {user.full_name?.charAt(0) || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 dark:text-white truncate">
                    {user.full_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  user.user_type === 'business'
                    ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                    : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                }`}>
                  {user.user_type || 'individual'}
                </span>
              </div>
            ))}
            {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
              <p className="text-center text-neutral-500 dark:text-neutral-400 py-4">No users yet</p>
            )}
          </div>
        </div>

        {/* Recent Loans */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Recent Loans</h2>
            <Link
              href="/admin/loans"
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.recentLoans.map((loan) => (
              <div
                key={loan.id}
                className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 dark:text-white truncate">
                    {loan.borrower?.full_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    From: {loan.lender?.full_name || loan.business_lender?.business_name || 'Personal'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {formatCurrency(loan.amount, loan.currency)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    loan.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                    loan.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' :
                    loan.status === 'completed' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' :
                    'bg-neutral-100 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-300'
                  }`}>
                    {loan.status}
                  </span>
                </div>
              </div>
            ))}
            {(!stats?.recentLoans || stats.recentLoans.length === 0) && (
              <p className="text-center text-neutral-500 dark:text-neutral-400 py-4">No loans yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  href,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  href?: string;
  subtitle?: string;
}) {
  const colorClasses: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', darkBg: 'dark:bg-blue-500/20', darkText: 'dark:text-blue-400' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', darkBg: 'dark:bg-emerald-500/20', darkText: 'dark:text-emerald-400' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', darkBg: 'dark:bg-purple-500/20', darkText: 'dark:text-purple-400' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', darkBg: 'dark:bg-amber-500/20', darkText: 'dark:text-amber-400' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', darkBg: 'dark:bg-yellow-500/20', darkText: 'dark:text-yellow-400' },
    red: { bg: 'bg-red-100', text: 'text-red-600', darkBg: 'dark:bg-red-500/20', darkText: 'dark:text-red-400' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', darkBg: 'dark:bg-orange-500/20', darkText: 'dark:text-orange-400' },
  };

  const colorClass = colorClasses[color] || colorClasses.blue;

  const Card = (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 hover:shadow-lg dark:hover:shadow-neutral-900/50 transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${colorClass.bg} ${colorClass.darkBg}`}>
          <Icon className={`w-5 h-5 ${colorClass.text} ${colorClass.darkText}`} />
        </div>
        {href && <ArrowRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />}
      </div>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
      {subtitle && <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{subtitle}</p>}
    </div>
  );

  if (href) {
    return <Link href={href}>{Card}</Link>;
  }

  return Card;
}

function StatusBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    neutral: 'bg-neutral-400',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
        <span className="text-sm font-medium text-neutral-900 dark:text-white">{value}</span>
      </div>
      <div className="h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function QuickActionButton({
  label,
  icon: Icon,
  href,
  color,
}: {
  label: string;
  icon: React.ElementType;
  href: string;
  color: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  const colorClasses: Record<string, string> = {
    blue: 'hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    emerald: 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    purple: 'hover:bg-purple-50 dark:hover:bg-purple-500/10 text-purple-600 dark:text-purple-400',
    amber: 'hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  };

  const handleClick = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(href, { method: 'GET' });
      if (res.ok) {
        setResult('success');
      } else {
        setResult('error');
      }
    } catch (err) {
      setResult('error');
    }
    setLoading(false);
    setTimeout(() => setResult(null), 3000);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 transition-all ${colorClasses[color]} ${loading ? 'opacity-50 cursor-wait' : ''}`}
    >
      {loading ? (
        <RefreshCw className="w-5 h-5 animate-spin" />
      ) : result === 'success' ? (
        <CheckCircle className="w-5 h-5 text-emerald-500" />
      ) : result === 'error' ? (
        <XCircle className="w-5 h-5 text-red-500" />
      ) : (
        <Icon className="w-5 h-5" />
      )}
      <span className="text-xs font-medium text-center text-neutral-700 dark:text-neutral-300">{label}</span>
    </button>
  );
}
