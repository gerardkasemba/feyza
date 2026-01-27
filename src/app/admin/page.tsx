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
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalLoans: number;
  totalBusinesses: number;
  activeLoans: number;
  pendingLoans: number;
  completedLoans: number;
  totalLoanAmount: number;
  totalRepaid: number;
  recentUsers: any[];
  recentLoans: any[];
  overduePayments: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
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
      recentUsersResult,
      recentLoansResult,
      overdueResult,
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('loans').select('id, amount, amount_paid', { count: 'exact' }),
      supabase.from('business_profiles').select('id', { count: 'exact' }),
      supabase.from('loans').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('loans').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('loans').select('id', { count: 'exact' }).eq('status', 'completed'),
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
    ]);

    const loans = loansResult.data || [];
    const totalLoanAmount = loans.reduce((sum, l) => sum + (l.amount || 0), 0);
    const totalRepaid = loans.reduce((sum, l) => sum + (l.amount_paid || 0), 0);

    setStats({
      totalUsers: usersResult.count || 0,
      totalLoans: loansResult.count || 0,
      totalBusinesses: businessesResult.count || 0,
      activeLoans: activeLoansResult.count || 0,
      pendingLoans: pendingLoansResult.count || 0,
      completedLoans: completedLoansResult.count || 0,
      totalLoanAmount,
      totalRepaid,
      recentUsers: recentUsersResult.data || [],
      recentLoans: recentLoansResult.data || [],
      overduePayments: overdueResult.count || 0,
    });
    setLoading(false);
  }, [supabase]);

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
        console.log('[Admin] Loan change');
        refreshData();
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });
    channels.push(loansChannel);

    // Users channel
    const usersChannel = supabase
      .channel('admin-users')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, () => {
        console.log('[Admin] New user');
        refreshData();
      })
      .subscribe();
    channels.push(usersChannel);

    // Business profiles channel
    const businessChannel = supabase
      .channel('admin-business')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_profiles' }, () => {
        console.log('[Admin] Business change');
        refreshData();
      })
      .subscribe();
    channels.push(businessChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [supabase, refreshData]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-neutral-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
          <p className="text-neutral-500">Overview of your platform</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-green-600">Live updates active</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-neutral-400" />
              <span className="text-neutral-500">Connecting...</span>
            </>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
          color="green"
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
          title="Total Volume"
          value={formatCurrency(stats?.totalLoanAmount || 0)}
          icon={DollarSign}
          color="amber"
        />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
          color="green"
          subtitle="Fully repaid"
        />
        <StatCard
          title="Overdue Payments"
          value={stats?.overduePayments || 0}
          icon={AlertCircle}
          color="red"
          subtitle="Need attention"
        />
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Financial Overview</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-neutral-700">Total Loaned</span>
              </div>
              <span className="font-bold text-green-600">
                {formatCurrency(stats?.totalLoanAmount || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-blue-600" />
                <span className="text-neutral-700">Total Repaid</span>
              </div>
              <span className="font-bold text-blue-600">
                {formatCurrency(stats?.totalRepaid || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-amber-600" />
                <span className="text-neutral-700">Outstanding</span>
              </div>
              <span className="font-bold text-amber-600">
                {formatCurrency((stats?.totalLoanAmount || 0) - (stats?.totalRepaid || 0))}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Loan Status Distribution</h2>
          <div className="space-y-3">
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
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Recent Users</h2>
            <Link
              href="/admin/users"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.recentUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg"
              >
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-medium">
                    {user.full_name?.charAt(0) || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 truncate">
                    {user.full_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-neutral-500 truncate">{user.email}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  user.user_type === 'business'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {user.user_type || 'individual'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Loans */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Recent Loans</h2>
            <Link
              href="/admin/loans"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.recentLoans.map((loan) => (
              <div
                key={loan.id}
                className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 truncate">
                    {loan.borrower?.full_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-neutral-500">
                    From: {loan.lender?.full_name || loan.business_lender?.business_name || 'Personal'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-neutral-900">
                    {formatCurrency(loan.amount, loan.currency)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    loan.status === 'active' ? 'bg-green-100 text-green-700' :
                    loan.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    loan.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-neutral-100 text-neutral-700'
                  }`}>
                    {loan.status}
                  </span>
                </div>
              </div>
            ))}
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
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
  };

  const Card = (
    <div className="bg-white rounded-xl border border-neutral-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {href && <ArrowRight className="w-5 h-5 text-neutral-400" />}
      </div>
      <p className="text-sm text-neutral-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
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
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-neutral-600">{label}</span>
        <span className="text-sm font-medium text-neutral-900">{value}</span>
      </div>
      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
