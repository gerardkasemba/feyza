// src/app/business/analytics/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Navbar, Footer } from '@/components/layout'
import { Button, Card, Badge } from '@/components/ui'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import MonthlyChart from '@/components/analytics/MonthlyChart'
import ExportAnalyticsButton from '@/components/analytics/ExportAnalyticsButton'
import {
  Building2,
  TrendingUp,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Users,
  Clock,
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

  if (!user) {
    redirect('/auth/signin')
  }

  // Fetch business profile
  const { data: businessProfile } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!businessProfile) {
    redirect('/business/setup')
  }

  // Fetch all business loans
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

  // Fetch lender preferences
  const { data: lenderPrefs } = await supabase
    .from('lender_preferences')
    .select('*')
    .eq('business_id', businessProfile.id)
    .single()

  // Calculate analytics
  const totalLoans = loans.length
  const activeLoans = loans.filter((l: any) => l.status === 'active')
  const completedLoans = loans.filter((l: any) => l.status === 'completed')
  const defaultedLoans = loans.filter((l: any) => l.status === 'defaulted')
  const cancelledLoans = loans.filter((l: any) => l.status === 'cancelled')

  const totalLent = loans.reduce((sum: number, l: any) => sum + Number(l.amount || 0), 0)
  const totalInterestEarned = completedLoans.reduce(
    (sum: number, l: any) => sum + Number(l.total_interest || 0),
    0
  )
  const totalOutstanding = activeLoans.reduce(
    (sum: number, l: any) => sum + Number(l.amount_remaining || 0),
    0
  )

  const averageLoanAmount = totalLoans > 0 ? totalLent / totalLoans : 0
  const completionRate = totalLoans > 0 ? (completedLoans.length / totalLoans) * 100 : 0
  const defaultRate = totalLoans > 0 ? (defaultedLoans.length / totalLoans) * 100 : 0

  const avgInterestRate =
    loans.length > 0
      ? loans.reduce((sum: number, l: any) => sum + Number(l.interest_rate || 0), 0) / loans.length
      : 0

  // Portfolio by status
  const portfolioByStatus = [
    {
      status: 'Active',
      count: activeLoans.length,
      amount: activeLoans.reduce((s: number, l: any) => s + Number(l.amount || 0), 0),
      color: '#3b82f6',
      percentage: totalLoans > 0 ? (activeLoans.length / totalLoans) * 100 : 0,
    },
    {
      status: 'Completed',
      count: completedLoans.length,
      amount: completedLoans.reduce((s: number, l: any) => s + Number(l.amount || 0), 0),
      color: '#10b981',
      percentage: totalLoans > 0 ? (completedLoans.length / totalLoans) * 100 : 0,
    },
    {
      status: 'Defaulted',
      count: defaultedLoans.length,
      amount: defaultedLoans.reduce((s: number, l: any) => s + Number(l.amount || 0), 0),
      color: '#ef4444',
      percentage: totalLoans > 0 ? (defaultedLoans.length / totalLoans) * 100 : 0,
    },
    {
      status: 'Cancelled',
      count: cancelledLoans.length,
      amount: cancelledLoans.reduce((s: number, l: any) => s + Number(l.amount || 0), 0),
      color: '#6b7280',
      percentage: totalLoans > 0 ? (cancelledLoans.length / totalLoans) * 100 : 0,
    },
  ]

  // Geographic breakdown
  const geographicData = loans.reduce((acc: any, loan: any) => {
    const country = loan.borrower?.country || 'Unknown'
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
    if (loan.status === 'defaulted') acc[country].defaultedLoans++

    return acc
  }, {})

  const topCountries = Object.values(geographicData)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10)

  // Loan type breakdown
  const loanTypeData = loans.reduce((acc: any, loan: any) => {
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

  // Top borrowers by volume
  const borrowerStats = loans.reduce((acc: any, loan: any) => {
    const borrowerId = loan.borrower?.id
    if (!borrowerId) return acc

    if (!acc[borrowerId]) {
      acc[borrowerId] = {
        id: borrowerId,
        name: loan.borrower.full_name || 'Unknown',
        email: loan.borrower.email || '',
        tier: loan.borrower.borrowing_tier || 1,
        country: loan.borrower.country || '',
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
    if (loan.status === 'defaulted') acc[borrowerId].defaulted++

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

  loans.forEach((loan: any) => {
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
    if (loan.status === 'defaulted') monthlyData[key].defaulted++
  })

  const monthlyStats = Object.entries(monthlyData).map(([month, data]) => {
    const date = new Date(month + '-01')
    return {
      month,
      monthName: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      ...data,
    }
  })

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
          {/* Redesigned Header - App-like + Desktop polish */}
          <div className="mb-8">
            {/* Mobile / App style */}
            <div className="md:hidden">
              <div className="flex items-center justify-between mb-4">
                <Link href="/business" className="shrink-0">
                  <Button variant="outline" size="sm" className="h-10 px-3 rounded-2xl">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                </Link>

                {/* ✅ Real PDF export */}
                <ExportAnalyticsButton />
              </div>

              <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h1 className="text-xl font-display font-bold text-neutral-900 dark:text-white leading-tight">
                        Business Analytics
                      </h1>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                        {businessProfile.business_name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-1.5 bg-gradient-to-r from-primary-500 via-blue-500 to-indigo-500" />
              </div>
            </div>

            {/* Desktop / Tablet */}
            <div className="hidden md:flex items-center justify-between gap-6">
              <div className="flex items-center gap-4 min-w-0">
                <Link href="/business" className="shrink-0">
                  <Button variant="outline" size="sm" className="rounded-2xl">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>

                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white">
                        Business Analytics
                      </h1>
                      <p className="text-neutral-500 dark:text-neutral-400 truncate">
                        {businessProfile.business_name}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ✅ Real PDF export */}
              <ExportAnalyticsButton />
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                {formatCurrency(totalLent)}
              </div>
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
              <div className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                {formatPercentage(avgInterestRate)}
              </div>
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

          {/* Performance Metrics */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Portfolio Health
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Completion Rate</span>
                  <span className="font-semibold text-green-600">{formatPercentage(completionRate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Default Rate</span>
                  <span className="font-semibold text-red-600">{formatPercentage(defaultRate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Average Loan</span>
                  <span className="font-semibold">{formatCurrency(averageLoanAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Outstanding</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(totalOutstanding)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-600" />
                Portfolio Breakdown
              </h3>
              <div className="space-y-3">
                {portfolioByStatus.map((item) => (
                  <div key={item.status} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">{item.status}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm">{item.count}</div>
                      </div>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                Capital Management
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Capital Pool</span>
                  <span className="font-semibold">{formatCurrency(Number(lenderPrefs?.capital_pool || 0))}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Reserved</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(Number(lenderPrefs?.capital_reserved || 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Available</span>
                  <span
                    className={`font-semibold ${
                      Number(lenderPrefs?.capital_pool || 0) - Number(lenderPrefs?.capital_reserved || 0) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(Number(lenderPrefs?.capital_pool || 0) - Number(lenderPrefs?.capital_reserved || 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">ROI</span>
                  <span className="font-semibold text-green-600">
                    {formatPercentage(totalLent > 0 ? (totalInterestEarned / totalLent) * 100 : 0)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Monthly Performance Chart */}
            <Card className="p-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Monthly Performance (Last 12 Months)
              </h3>

              <div className="h-80">
                {/* ✅ Stable React client component */}
                <MonthlyChart data={monthlyStats} />
              </div>
            </Card>

            {/* Geographic Distribution */}
            <Card className="p-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-600" />
                Customer Geography
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {topCountries.map((country: any, index) => {
                  const percentage = totalLoans > 0 ? (country.count / totalLoans) * 100 : 0
                  return (
                    <div key={country.country} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-900 dark:text-white">
                            {index + 1}. {country.country}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                            {country.count} loans
                          </div>
                          <div className="text-xs text-neutral-500">{formatCurrency(country.totalAmount)}</div>
                        </div>
                      </div>
                      <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${percentage}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>
                          Active: {country.activeLoans} | Completed: {country.completedLoans}
                        </span>
                        <span>{formatPercentage(percentage)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* Loan Types Analysis */}
          <Card className="p-6 mb-8">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Most Popular Loan Types
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Loan Purpose
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Count
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Total Amount
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Avg Amount
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Completion Rate
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Popularity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topLoanTypes.map((loanType: any, index) => {
                    const popularity = totalLoans > 0 ? (loanType.count / totalLoans) * 100 : 0
                    return (
                      <tr key={loanType.purpose} className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <span className="font-medium text-neutral-900 dark:text-white">{loanType.purpose}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{loanType.count}</td>
                        <td className="py-3 px-4 text-right font-medium">{formatCurrency(loanType.totalAmount)}</td>
                        <td className="py-3 px-4 text-right font-medium">{formatCurrency(loanType.avgAmount)}</td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-semibold ${
                              loanType.completionRate >= 80
                                ? 'text-green-600'
                                : loanType.completionRate >= 50
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                          >
                            {formatPercentage(loanType.completionRate)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                              <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${popularity}%` }} />
                            </div>
                            <span className="text-xs text-neutral-500 min-w-[3rem] text-right">
                              {formatPercentage(popularity)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Top Borrowers */}
          <Card className="p-6">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Top Borrowers
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Borrower
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Country
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Tier
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Total Loans
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Total Amount
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Completed
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Active
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Performance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topBorrowers.map((borrower: any) => {
                    const successRate = borrower.totalLoans > 0 ? (borrower.completed / borrower.totalLoans) * 100 : 0
                    return (
                      <tr key={borrower.id} className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-white">{borrower.name}</div>
                            <div className="text-xs text-neutral-500">{borrower.email}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm">{borrower.country || 'Unknown'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary" size="sm">
                            Tier {borrower.tier}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{borrower.totalLoans}</td>
                        <td className="py-3 px-4 text-right font-medium">{formatCurrency(borrower.totalAmount)}</td>
                        <td className="py-3 px-4 text-right">
                          <Badge variant="success" size="sm">
                            {borrower.completed}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Badge variant="info" size="sm">
                            {borrower.active}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-semibold ${
                              successRate >= 80 ? 'text-green-600' : successRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                            }`}
                          >
                            {formatPercentage(successRate)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
