import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Navbar, Footer } from '@/components/layout'
import { Button, Card, Badge } from '@/components/ui'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import MonthlyChart from '@/components/analytics/MonthlyChart'
import ExportAnalyticsButton from '@/components/analytics/ExportAnalyticsButton'
import AnalyticsTabs from '@/components/analytics/AnalyticsTabs'
import type { Loan } from '@/types'

import {
  TrendingUp,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Users,
  CheckCircle,
  ArrowLeft,
  Globe,
  FileText,
  Calendar,
} from 'lucide-react'

export const revalidate = 60

export default async function BusinessAnalyticsPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/signin')

  const { data: businessProfile } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!businessProfile) redirect('/business/setup')

  const { data: allLoans } = await supabase
    .from('loans')
    .select(
      `
      *,
      borrower:users!borrower_id(id, full_name, email, borrowing_tier, country)
    `
    )
    .eq('business_lender_id', businessProfile.id)
    .order('created_at', { ascending: false })

  const loans = allLoans || []

  const { data: lenderPrefs } = await supabase
    .from('lender_preferences')
    .select('*')
    .eq('business_id', businessProfile.id)
    .single()

  // --- analytics ---
  const totalLoans = loans.length
  const activeLoans = loans.filter((l: Loan) => l.status === 'active')
  const completedLoans = loans.filter((l: Loan) => l.status === 'completed')
  const defaultedLoans = loans.filter((l: Loan) => l.status === 'defaulted')
  const cancelledLoans = loans.filter((l: Loan) => l.status === 'cancelled')

  const totalLent = loans.reduce((sum: number, l: Loan) => sum + Number(l.amount || 0), 0)
  const totalInterestEarned = completedLoans.reduce(
    (sum: number, l: Loan) => sum + Number(l.total_interest || 0),
    0
  )
  const totalOutstanding = activeLoans.reduce(
    (sum: number, l: Loan) => sum + Number(l.amount_remaining || 0),
    0
  )

  const averageLoanAmount = totalLoans > 0 ? totalLent / totalLoans : 0
  const completionRate = totalLoans > 0 ? (completedLoans.length / totalLoans) * 100 : 0
  const defaultRate = totalLoans > 0 ? (defaultedLoans.length / totalLoans) * 100 : 0

  const avgInterestRate =
    loans.length > 0
      ? loans.reduce((sum: number, l: Loan) => sum + Number(l.interest_rate || 0), 0) / loans.length
      : 0

  const portfolioByStatus = [
    {
      status: 'Active',
      count: activeLoans.length,
      amount: activeLoans.reduce((s: number, l: Loan) => s + Number(l.amount || 0), 0),
      color: '#3b82f6',
      percentage: totalLoans > 0 ? (activeLoans.length / totalLoans) * 100 : 0,
    },
    {
      status: 'Completed',
      count: completedLoans.length,
      amount: completedLoans.reduce((s: number, l: Loan) => s + Number(l.amount || 0), 0),
      color: '#10b981',
      percentage: totalLoans > 0 ? (completedLoans.length / totalLoans) * 100 : 0,
    },
    {
      status: 'Defaulted',
      count: defaultedLoans.length,
      amount: defaultedLoans.reduce((s: number, l: Loan) => s + Number(l.amount || 0), 0),
      color: '#ef4444',
      percentage: totalLoans > 0 ? (defaultedLoans.length / totalLoans) * 100 : 0,
    },
    {
      status: 'Cancelled',
      count: cancelledLoans.length,
      amount: cancelledLoans.reduce((s: number, l: Loan) => s + Number(l.amount || 0), 0),
      color: '#6b7280',
      percentage: totalLoans > 0 ? (cancelledLoans.length / totalLoans) * 100 : 0,
    },
  ]

  const geographicData = loans.reduce((acc: Record<string, { country: string; count: number; totalAmount: number; activeLoans: number; completedLoans: number; defaultedLoans: number }>, loan: Loan) => {
    const country = (loan.borrower as any)?.country || 'Unknown'
    if (!acc[country]) {
      acc[country] = {
        country,
        count: 0,
        totalAmount: 0,
        activeLoans: 0,
        completedLoans: 0,
        defaultedLoans: 0,
      }
    }
    acc[country].count++
    acc[country].totalAmount += Number(loan.amount || 0)
    if (loan.status === 'active') acc[country].activeLoans++
    if (loan.status === 'completed') acc[country].completedLoans++
    if ((loan.status as string) === 'defaulted') acc[country].defaultedLoans++
    return acc
  }, {})

  const topCountries = (Object.values(geographicData) as { country: string; count: number; totalAmount: number; activeLoans: number; completedLoans: number; defaultedLoans: number }[])
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  type LoanTypeItem = { purpose: string; count: number; totalAmount: number; avgAmount: number; completionRate: number; completed: number }
  const loanTypeData = loans.reduce((acc: Record<string, LoanTypeItem>, loan: Loan) => {
    const purpose = loan.purpose || 'Other'
    if (!acc[purpose]) {
      acc[purpose] = {
        purpose,
        count: 0,
        totalAmount: 0,
        avgAmount: 0,
        completionRate: 0,
        completed: 0,
      }
    }
    acc[purpose].count++
    acc[purpose].totalAmount += Number(loan.amount || 0)
    if (loan.status === 'completed') acc[purpose].completed++
    return acc
  }, {})

  Object.values(loanTypeData).forEach((type: any) => {
    type.avgAmount = type.count > 0 ? type.totalAmount / type.count : 0
    type.completionRate = type.count > 0 ? (type.completed / type.count) * 100 : 0
  })

  const topLoanTypes = Object.values(loanTypeData)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10)

  type BorrowerItem = { id: string; name: string; email: string; tier: number; country: string; totalLoans: number; totalAmount: number; completed: number; active: number; defaulted: number }
  const borrowerStats = loans.reduce((acc: Record<string, BorrowerItem>, loan: Loan) => {
    const borrowerId = loan.borrower?.id
    if (!borrowerId) return acc

    if (!acc[borrowerId]) {
      acc[borrowerId] = {
        id: borrowerId,
        name: loan.borrower?.full_name || (loan as { borrower_name?: string })?.borrower_name || 'Borrower',
        email: loan.borrower?.email || '',
        tier: loan.borrower?.borrowing_tier || 1,
        country: (loan.borrower as any)?.country || '',
        totalLoans: 0,
        totalAmount: 0,
        completed: 0,
        active: 0,
        defaulted: 0,
      }
    }

    acc[borrowerId].totalLoans++
    acc[borrowerId].totalAmount += Number(loan.amount || 0)
    if (loan.status === 'completed') acc[borrowerId].completed++
    if (loan.status === 'active') acc[borrowerId].active++
    if ((loan.status as string) === 'defaulted') acc[borrowerId].defaulted++
    return acc
  }, {})

  const topBorrowers = Object.values(borrowerStats)
    .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
    .slice(0, 10)

  // Monthly performance (last 12 months)
  const monthlyData: Record<
    string,
    { loans: number; amount: number; interest: number; active: number; completed: number; defaulted: number }
  > = {}

  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthlyData[key] = { loans: 0, amount: 0, interest: 0, active: 0, completed: 0, defaulted: 0 }
  }

  loans.forEach((loan: Loan) => {
    const date = loan.created_at ? new Date(loan.created_at) : null
    if (!date) return
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyData[key]) return

    monthlyData[key].loans++
    monthlyData[key].amount += Number(loan.amount || 0)
    if (loan.status === 'active') monthlyData[key].active++
    if (loan.status === 'completed') {
      monthlyData[key].completed++
      monthlyData[key].interest += Number(loan.total_interest || 0)
    }
    if ((loan.status as string) === 'defaulted') monthlyData[key].defaulted++
  })

  const monthlyStats = Object.entries(monthlyData).map(([month, data]: [string, any]) => {
    const date = new Date(month + '-01')
    return {
      month,
      monthName: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      ...data,
    }
  })

  // ---------- tab content blocks ----------
  const OverviewTab = (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{formatCurrency(totalLent)}</div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Total Deployed Capital</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
            {formatCurrency(totalInterestEarned)}
          </div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Total Interest Earned</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{formatPercentage(avgInterestRate)}</div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Average Interest Rate</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{totalLoans}</div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Total Loans Issued</div>
        </Card>
      </div>

{/* Overview Cards - App-like on mobile (swipe), Grid on desktop */}
<div className="mb-6">
  {/* Mobile: swipeable cards */}
  <div className="lg:hidden -mx-4 px-4">
    <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-px-4">
      {/* Portfolio Health */}
      <Card className="min-w-[88%] sm:min-w-[70%] snap-start rounded-3xl p-5 border border-neutral-200/70 dark:border-neutral-800/70 bg-white/90 dark:bg-neutral-900/70 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white leading-tight">
                Portfolio Health
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Quick portfolio summary
              </p>
            </div>
          </div>

          {/* Small badge */}
          <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200/60 dark:border-green-800/50">
            Healthy
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-3 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Completion</div>
            <div className="text-lg font-bold text-green-600">{formatPercentage(completionRate)}</div>
          </div>

          <div className="rounded-2xl p-3 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Default</div>
            <div className="text-lg font-bold text-red-600">{formatPercentage(defaultRate)}</div>
          </div>

          <div className="rounded-2xl p-3 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Average Loan</div>
            <div className="text-base font-semibold text-neutral-900 dark:text-white">
              {formatCurrency(averageLoanAmount)}
            </div>
          </div>

          <div className="rounded-2xl p-3 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Outstanding</div>
            <div className="text-base font-semibold text-blue-600">
              {formatCurrency(totalOutstanding)}
            </div>
          </div>
        </div>
      </Card>

      {/* Portfolio Breakdown */}
      <Card className="min-w-[88%] sm:min-w-[70%] snap-start rounded-3xl p-5 border border-neutral-200/70 dark:border-neutral-800/70 bg-white/90 dark:bg-neutral-900/70 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <PieChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white leading-tight">
                Portfolio Breakdown
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Status distribution
              </p>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-50 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700/60">
            {totalLoans} loans
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {portfolioByStatus.map((item) => (
            <div key={item.status} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate">
                    {item.status}
                  </span>
                </div>
                <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {item.count}
                </div>
              </div>

              <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                <span>{formatPercentage(item.percentage)}</span>
                <span>{formatCurrency(item.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Capital Management */}
      <Card className="min-w-[88%] sm:min-w-[70%] snap-start rounded-3xl p-5 border border-neutral-200/70 dark:border-neutral-800/70 bg-white/90 dark:bg-neutral-900/70 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white leading-tight">
                Capital Management
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Pool & availability
              </p>
            </div>
          </div>
        </div>

        {(() => {
          const pool = Number(lenderPrefs?.capital_pool || 0)
          const reserved = Number(lenderPrefs?.capital_reserved || 0)
          const available = pool - reserved
          const ok = available >= 0

          return (
            <>
              {/* Big availability number */}
              <div className="mt-4 rounded-2xl p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Available
                </div>
                <div className={`text-2xl font-bold ${ok ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(available)}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span>Pool: {formatCurrency(pool)}</span>
                  <span>Reserved: {formatCurrency(reserved)}</span>
                </div>
              </div>

              {/* ROI row */}
              <div className="mt-3 flex items-center justify-between rounded-2xl px-4 py-3 border border-neutral-200/60 dark:border-neutral-700/60 bg-white/60 dark:bg-neutral-900/40">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">ROI</span>
                <span className="text-sm font-semibold text-green-600">
                  {formatPercentage(totalLent > 0 ? (totalInterestEarned / totalLent) * 100 : 0)}
                </span>
              </div>
            </>
          )
        })()}
      </Card>
    </div>
  </div>

  {/* Desktop: grid */}
  <div className="hidden lg:grid lg:grid-cols-3 gap-6">
    {/* Portfolio Health */}
    <Card className="rounded-3xl p-6 border border-neutral-200/70 dark:border-neutral-800/70 bg-white/90 dark:bg-neutral-900/70">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Portfolio Health</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Quick portfolio summary</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-2xl p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">Completion</div>
          <div className="text-xl font-bold text-green-600">{formatPercentage(completionRate)}</div>
        </div>
        <div className="rounded-2xl p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">Default</div>
          <div className="text-xl font-bold text-red-600">{formatPercentage(defaultRate)}</div>
        </div>
        <div className="rounded-2xl p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">Average Loan</div>
          <div className="text-base font-semibold text-neutral-900 dark:text-white">
            {formatCurrency(averageLoanAmount)}
          </div>
        </div>
        <div className="rounded-2xl p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">Outstanding</div>
          <div className="text-base font-semibold text-blue-600">{formatCurrency(totalOutstanding)}</div>
        </div>
      </div>
    </Card>

    {/* Portfolio Breakdown */}
    <Card className="rounded-3xl p-6 border border-neutral-200/70 dark:border-neutral-800/70 bg-white/90 dark:bg-neutral-900/70">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <PieChart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Portfolio Breakdown</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Status distribution</p>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-50 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700/60">
          {totalLoans} loans
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {portfolioByStatus.map((item) => (
          <div key={item.status} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">{item.status}</span>
              </div>
              <span className="text-sm font-semibold text-neutral-900 dark:text-white">{item.count}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
            </div>
            <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
              <span>{formatPercentage(item.percentage)}</span>
              <span>{formatCurrency(item.amount)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>

    {/* Capital Management */}
    <Card className="rounded-3xl p-6 border border-neutral-200/70 dark:border-neutral-800/70 bg-white/90 dark:bg-neutral-900/70">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Capital Management</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Pool & availability</p>
          </div>
        </div>
      </div>

      {(() => {
        const pool = Number(lenderPrefs?.capital_pool || 0)
        const reserved = Number(lenderPrefs?.capital_reserved || 0)
        const available = pool - reserved
        const ok = available >= 0

        return (
          <>
            <div className="mt-5 rounded-2xl p-5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Available</div>
              <div className={`text-3xl font-bold ${ok ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(available)}
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
                <span>Pool: {formatCurrency(pool)}</span>
                <span>Reserved: {formatCurrency(reserved)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl px-4 py-3 border border-neutral-200/60 dark:border-neutral-700/60 bg-white/60 dark:bg-neutral-900/40">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">ROI</span>
              <span className="text-sm font-semibold text-green-600">
                {formatPercentage(totalLent > 0 ? (totalInterestEarned / totalLent) * 100 : 0)}
              </span>
            </div>
          </>
        )
      })()}
    </Card>
  </div>
</div>

    </div>
  )

  const PerformanceTab = (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Monthly Performance (Last 12 Months)
          </h3>
          <div className="h-80">
            <MonthlyChart data={monthlyStats} />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-600" />
            Status Distribution
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-xs text-neutral-500 mb-1">Active</div>
              <div className="text-xl font-bold">{activeLoans.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-neutral-500 mb-1">Completed</div>
              <div className="text-xl font-bold">{completedLoans.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-neutral-500 mb-1">Defaulted</div>
              <div className="text-xl font-bold">{defaultedLoans.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-neutral-500 mb-1">Cancelled</div>
              <div className="text-xl font-bold">{cancelledLoans.length}</div>
            </Card>
          </div>

          <div className="mt-4 space-y-2">
            {portfolioByStatus.map((item) => (
              <div key={item.status} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <div className="flex-1 text-sm text-neutral-600 dark:text-neutral-400">{item.status}</div>
                <div className="text-sm font-semibold">{formatPercentage(item.percentage)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )

  const CustomersTab = (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-600" />
            Customer Geography
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {topCountries.map((country, index) => {
              const percentage = totalLoans > 0 ? (country.count / totalLoans) * 100 : 0
              return (
                <div key={country.country} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {index + 1}. {country.country}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-neutral-900 dark:text-white">{country.count} loans</div>
                      <div className="text-xs text-neutral-500">{formatCurrency(country.totalAmount)}</div>
                    </div>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${percentage}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Active: {country.activeLoans} | Completed: {country.completedLoans}</span>
                    <span>{formatPercentage(percentage)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Top Borrowers
          </h3>

          {/* Mobile-friendly list + desktop table */}
          <div className="space-y-3">
            {topBorrowers.map((b: any) => {
              const successRate = b.totalLoans > 0 ? (b.completed / b.totalLoans) * 100 : 0
              return (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-neutral-900 dark:text-white truncate">{b.name}</div>
                      <div className="text-xs text-neutral-500 truncate">{b.email}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" size="sm">Tier {b.tier}</Badge>
                        <Badge variant="info" size="sm">{b.active} Active</Badge>
                        <Badge variant="success" size="sm">{b.completed} Completed</Badge>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold">{formatCurrency(b.totalAmount)}</div>
                      <div className="text-xs text-neutral-500">{b.totalLoans} loans</div>
                      <div
                        className={`mt-1 text-xs font-semibold ${
                          successRate >= 80 ? 'text-green-600' : successRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}
                      >
                        {formatPercentage(successRate)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )

  const InsightsTab = (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" />
          Most Popular Loan Types
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">Purpose</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">Count</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">Total</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">Avg</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">Completion</th>
              </tr>
            </thead>
            <tbody>
              {topLoanTypes.map((t: any) => (
                <tr key={t.purpose} className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="py-3 px-4 font-medium text-neutral-900 dark:text-white">{t.purpose}</td>
                  <td className="py-3 px-4 text-right font-medium">{t.count}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatCurrency(t.totalAmount)}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatCurrency(t.avgAmount)}</td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`font-semibold ${
                        t.completionRate >= 80 ? 'text-green-600' : t.completionRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}
                    >
                      {formatPercentage(t.completionRate)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900">
      <Navbar
        user={{
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || 'User',
          user_type: 'business',
        }}
      />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Link href="/business" className="shrink-0">
                  <Button variant="outline" size="sm" className="rounded-2xl">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                </Link>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-2xl md:text-3xl font-display font-bold text-neutral-900 dark:text-white">
                        Business Analytics
                      </h1>
                      <p className="text-sm md:text-base text-neutral-500 dark:text-neutral-400 truncate">
                        {businessProfile.business_name}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <ExportAnalyticsButton />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <AnalyticsTabs
            overview={OverviewTab}
            performance={PerformanceTab}
            customers={CustomersTab}
            insights={InsightsTab}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}
