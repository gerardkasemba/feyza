'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths } from 'date-fns';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  Percent,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  RefreshCw,
} from 'lucide-react';

interface DailyStats {
  date: string;
  loans: number;
  amount: number;
  payments: number;
  paymentAmount: number;
}

interface MonthlyStats {
  month: string;
  loans: number;
  amount: number;
  completed: number;
  defaulted: number;
  revenue: number;
}

interface PaymentTiming {
  early: number;
  onTime: number;
  late: number;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [paymentTiming, setPaymentTiming] = useState<PaymentTiming>({ early: 0, onTime: 0, late: 0 });
  const [totals, setTotals] = useState({
    totalLoans: 0,
    totalVolume: 0,
    totalRepaid: 0,
    totalRevenue: 0,
    avgLoanAmount: 0,
    defaultRate: 0,
    completionRate: 0,
    avgRepaymentTime: 0,
  });
  const [topBorrowers, setTopBorrowers] = useState<any[]>([]);
  const [topLenders, setTopLenders] = useState<any[]>([]);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);

    const daysBack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365;
    const startDate = subDays(new Date(), daysBack);

    // Fetch loans
    const { data: loans } = await supabase
      .from('loans')
      .select('*')
      .gte('created_at', startDate.toISOString());

    // Fetch payments
    const { data: payments } = await supabase
      .from('payment_schedule')
      .select('*')
      .gte('created_at', startDate.toISOString());

    // Fetch transfers for revenue
    const { data: transfers } = await supabase
      .from('transfers')
      .select('platform_fee, created_at')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString());

    // Fetch all loans for totals
    const { data: allLoans } = await supabase
      .from('loans')
      .select('amount, status, amount_paid, created_at, completed_at');

    // Calculate totals
    const totalVolume = (allLoans || []).reduce((sum, l) => sum + (l.amount || 0), 0);
    const totalRepaid = (allLoans || []).reduce((sum, l) => sum + (l.amount_paid || 0), 0);
    const totalRevenue = (transfers || []).reduce((sum, t) => sum + (t.platform_fee || 0), 0);
    const completedLoans = (allLoans || []).filter(l => l.status === 'completed').length;
    const defaultedLoans = (allLoans || []).filter(l => l.status === 'defaulted').length;

    setTotals({
      totalLoans: allLoans?.length || 0,
      totalVolume,
      totalRepaid,
      totalRevenue,
      avgLoanAmount: allLoans?.length ? totalVolume / allLoans.length : 0,
      defaultRate: allLoans?.length ? (defaultedLoans / allLoans.length) * 100 : 0,
      completionRate: allLoans?.length ? (completedLoans / allLoans.length) * 100 : 0,
      avgRepaymentTime: 0, // Would need more complex calculation
    });

    // Calculate daily stats
    const days = eachDayOfInterval({ start: startDate, end: new Date() });
    const dailyData: DailyStats[] = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayLoans = (loans || []).filter(l => l.created_at?.startsWith(dayStr));
      const dayPayments = (payments || []).filter(p => p.paid_at?.startsWith(dayStr));
      
      return {
        date: dayStr,
        loans: dayLoans.length,
        amount: dayLoans.reduce((sum, l) => sum + (l.amount || 0), 0),
        payments: dayPayments.length,
        paymentAmount: dayPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      };
    });
    setDailyStats(dailyData);

    // Calculate monthly stats
    const months = eachMonthOfInterval({ 
      start: subMonths(new Date(), 11), 
      end: new Date() 
    });
    const monthlyData: MonthlyStats[] = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthLoans = (allLoans || []).filter(l => {
        const date = new Date(l.created_at);
        return date >= monthStart && date <= monthEnd;
      });
      const monthTransfers = (transfers || []).filter(t => {
        const date = new Date(t.created_at);
        return date >= monthStart && date <= monthEnd;
      });
      
      return {
        month: format(month, 'MMM yyyy'),
        loans: monthLoans.length,
        amount: monthLoans.reduce((sum, l) => sum + (l.amount || 0), 0),
        completed: monthLoans.filter(l => l.status === 'completed').length,
        defaulted: monthLoans.filter(l => l.status === 'defaulted').length,
        revenue: monthTransfers.reduce((sum, t) => sum + (t.platform_fee || 0), 0),
      };
    });
    setMonthlyStats(monthlyData);

    // Calculate payment timing
    const paidPayments = (payments || []).filter(p => p.is_paid);
    let early = 0, onTime = 0, late = 0;
    paidPayments.forEach(p => {
      if (!p.paid_at || !p.due_date) return;
      const paidDate = new Date(p.paid_at);
      const dueDate = new Date(p.due_date);
      if (paidDate < dueDate) early++;
      else if (paidDate.toDateString() === dueDate.toDateString()) onTime++;
      else late++;
    });
    setPaymentTiming({ early, onTime, late });

    // Fetch top borrowers
    const { data: borrowerStats } = await supabase
      .from('users')
      .select('id, full_name, total_payments_made, borrower_rating')
      .order('total_payments_made', { ascending: false })
      .limit(5);
    setTopBorrowers(borrowerStats || []);

    // Fetch top lenders (business)
    const { data: lenderStats } = await supabase
      .from('business_profiles')
      .select('id, business_name, total_loans_funded, total_amount_funded')
      .order('total_amount_funded', { ascending: false })
      .limit(5);
    setTopLenders(lenderStats || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const maxDailyAmount = Math.max(...dailyStats.map(d => d.amount), 1);
  const maxMonthlyAmount = Math.max(...monthlyStats.map(m => m.amount), 1);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
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
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-emerald-500" />
            Reports & Analytics
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Platform performance and insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Volume"
          value={formatCurrency(totals.totalVolume)}
          icon={DollarSign}
          color="emerald"
          change={null}
        />
        <MetricCard
          title="Platform Revenue"
          value={formatCurrency(totals.totalRevenue)}
          icon={TrendingUp}
          color="blue"
          change={null}
        />
        <MetricCard
          title="Avg Loan Amount"
          value={formatCurrency(totals.avgLoanAmount)}
          icon={FileText}
          color="purple"
          change={null}
        />
        <MetricCard
          title="Default Rate"
          value={`${totals.defaultRate.toFixed(1)}%`}
          icon={AlertTriangle}
          color={totals.defaultRate > 5 ? 'red' : 'emerald'}
          change={null}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Daily Loan Volume</h2>
          <div className="h-48 flex items-end gap-1">
            {dailyStats.slice(-30).map((day, i) => (
              <div
                key={day.date}
                className="flex-1 bg-emerald-500 dark:bg-emerald-400 rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-pointer group relative"
                style={{ height: `${(day.amount / maxDailyAmount) * 100}%`, minHeight: day.amount > 0 ? '4px' : '0' }}
                title={`${format(new Date(day.date), 'MMM d')}: ${formatCurrency(day.amount)}`}
              >
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-neutral-900 dark:bg-neutral-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {format(new Date(day.date), 'MMM d')}: {formatCurrency(day.amount)}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span>{dailyStats[0] ? format(new Date(dailyStats[0].date), 'MMM d') : ''}</span>
            <span>{dailyStats[dailyStats.length - 1] ? format(new Date(dailyStats[dailyStats.length - 1].date), 'MMM d') : ''}</span>
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Monthly Trends</h2>
          <div className="h-48 flex items-end gap-2">
            {monthlyStats.map((month) => (
              <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-blue-500 dark:bg-blue-400 rounded-t opacity-80"
                  style={{ height: `${(month.amount / maxMonthlyAmount) * 100}%`, minHeight: month.amount > 0 ? '4px' : '0' }}
                  title={`${month.month}: ${formatCurrency(month.amount)}`}
                />
                <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate w-full text-center">
                  {month.month.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Timing & Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Timing */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Payment Timing</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Early</span>
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{paymentTiming.early}</span>
              </div>
              <div className="h-3 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(paymentTiming.early / (paymentTiming.early + paymentTiming.onTime + paymentTiming.late || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">On Time</span>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{paymentTiming.onTime}</span>
              </div>
              <div className="h-3 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(paymentTiming.onTime / (paymentTiming.early + paymentTiming.onTime + paymentTiming.late || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Late</span>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">{paymentTiming.late}</span>
              </div>
              <div className="h-3 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${(paymentTiming.late / (paymentTiming.early + paymentTiming.onTime + paymentTiming.late || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Borrowers */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Top Borrowers</h2>
          <div className="space-y-3">
            {topBorrowers.map((borrower, i) => (
              <div key={borrower.id} className="flex items-center gap-3">
                <span className="w-6 h-6 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center text-xs font-medium">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {borrower.full_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {borrower.total_payments_made || 0} payments
                  </p>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  borrower.borrower_rating === 'great' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                  borrower.borrower_rating === 'good' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' :
                  'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}>
                  {borrower.borrower_rating || 'neutral'}
                </span>
              </div>
            ))}
            {topBorrowers.length === 0 && (
              <p className="text-center text-neutral-500 dark:text-neutral-400 py-4">No data yet</p>
            )}
          </div>
        </div>

        {/* Top Lenders */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Top Business Lenders</h2>
          <div className="space-y-3">
            {topLenders.map((lender, i) => (
              <div key={lender.id} className="flex items-center gap-3">
                <span className="w-6 h-6 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full flex items-center justify-center text-xs font-medium">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {lender.business_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {lender.total_loans_funded || 0} loans
                  </p>
                </div>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {formatCurrency(lender.total_amount_funded || 0)}
                </span>
              </div>
            ))}
            {topLenders.length === 0 && (
              <p className="text-center text-neutral-500 dark:text-neutral-400 py-4">No data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Summary Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Loans</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{totals.totalLoans}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Repaid</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.totalRepaid)}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Completion Rate</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totals.completionRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Outstanding</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(totals.totalVolume - totals.totalRepaid)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  change,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  change: number | null;
}) {
  const colorClasses: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', darkBg: 'dark:bg-emerald-500/20', darkText: 'dark:text-emerald-400' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', darkBg: 'dark:bg-blue-500/20', darkText: 'dark:text-blue-400' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', darkBg: 'dark:bg-purple-500/20', darkText: 'dark:text-purple-400' },
    red: { bg: 'bg-red-100', text: 'text-red-600', darkBg: 'dark:bg-red-500/20', darkText: 'dark:text-red-400' },
  };
  const c = colorClasses[color] || colorClasses.emerald;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${c.bg} ${c.darkBg}`}>
          <Icon className={`w-5 h-5 ${c.text} ${c.darkText}`} />
        </div>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">{title}</span>
      </div>
      <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
      {change !== null && (
        <p className={`text-sm mt-1 ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)}% from last period
        </p>
      )}
    </div>
  );
}
