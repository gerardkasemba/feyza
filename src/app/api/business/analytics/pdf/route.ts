import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import React from 'react'
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'

export const runtime = 'nodejs'

// Professional styles matching Feyza platform
const styles = StyleSheet.create({
  page: {
    padding: 0,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  
  // Header Section with Gradient Effect
  header: {
    backgroundColor: '#3b82f6',
    padding: 32,
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  companyName: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 14,
    color: '#e0f2fe',
    marginBottom: 2,
  },
  generatedDate: {
    fontSize: 9,
    color: '#bfdbfe',
    marginTop: 8,
  },
  logoContainer: {
    backgroundColor: '#1e40af',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },

  // Content Container
  content: {
    padding: 32,
  },

  // Section Styles
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },

  // Metric Cards Grid (4 columns)
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    width: '23%',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
  },
  metricCardBlue: {
    borderLeftColor: '#3b82f6',
  },
  metricCardGreen: {
    borderLeftColor: '#10b981',
  },
  metricCardPurple: {
    borderLeftColor: '#8b5cf6',
  },
  metricCardOrange: {
    borderLeftColor: '#f59e0b',
  },
  metricCardRed: {
    borderLeftColor: '#ef4444',
  },
  metricLabel: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  metricSubValue: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 3,
  },

  // Summary Box
  summaryBox: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe',
  },
  summaryRowLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: 'normal',
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  summaryValueGreen: {
    color: '#059669',
  },
  summaryValueRed: {
    color: '#dc2626',
  },

  // Table Styles
  table: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 12,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#334155',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowEven: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    fontSize: 10,
    color: '#475569',
  },
  tableCellBold: {
    fontWeight: 'bold',
    color: '#0f172a',
  },

  // Highlight/Alert Box
  highlightBox: {
    backgroundColor: '#fef3c7',
    padding: 14,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    marginBottom: 12,
  },
  highlightText: {
    fontSize: 10,
    color: '#92400e',
    lineHeight: 1.5,
  },

  // Success Box
  successBox: {
    backgroundColor: '#d1fae5',
    padding: 14,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    marginBottom: 12,
  },
  successText: {
    fontSize: 10,
    color: '#065f46',
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    right: 32,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerBrand: {
    fontSize: 9,
    color: '#3b82f6',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Page Number
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 32,
    fontSize: 8,
    color: '#94a3b8',
  },
})

function money(n: number) {
  const val = Number(n || 0)
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function pct(n: number) {
  const val = Number(n || 0)
  return `${val.toFixed(1)}%`
}

function shortNum(n: number) {
  const val = Number(n || 0)
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`
  return money(val)
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: businessProfile } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!businessProfile) {
    return NextResponse.json({ error: 'Business profile not found' }, { status: 404 })
  }

  const { data: allLoans } = await supabase
    .from('loans')
    .select(`*, borrower:users!borrower_id(id, full_name, email, borrowing_tier, country)`)
    .eq('business_lender_id', businessProfile.id)
    .order('created_at', { ascending: false })

  const loans = allLoans || []

  const { data: lenderPrefs } = await supabase
    .from('lender_preferences')
    .select('*')
    .eq('business_id', businessProfile.id)
    .single()

  // ---- analytics ----
  const totalLoans = loans.length
  const activeLoans = loans.filter((l: any) => l.status === 'active')
  const completedLoans = loans.filter((l: any) => l.status === 'completed')
  const defaultedLoans = loans.filter((l: any) => l.status === 'defaulted')
  const cancelledLoans = loans.filter((l: any) => l.status === 'cancelled')

  const totalLent = loans.reduce((sum: number, l: any) => sum + Number(l.amount || 0), 0)
  const totalInterestEarned = completedLoans.reduce((sum: number, l: any) => sum + Number(l.total_interest || 0), 0)
  const totalOutstanding = activeLoans.reduce((sum: number, l: any) => sum + Number(l.amount_remaining || 0), 0)

  const averageLoanAmount = totalLoans > 0 ? totalLent / totalLoans : 0
  const completionRate = totalLoans > 0 ? (completedLoans.length / totalLoans) * 100 : 0
  const defaultRate = totalLoans > 0 ? (defaultedLoans.length / totalLoans) * 100 : 0

  const avgInterestRate = loans.length > 0
    ? loans.reduce((sum: number, l: any) => sum + Number(l.interest_rate || 0), 0) / loans.length
    : 0

  const capitalPool = Number(lenderPrefs?.capital_pool || 0)
  const capitalReserved = Number(lenderPrefs?.capital_reserved || 0)
  const capitalAvailable = capitalPool - capitalReserved
  const roi = totalLent > 0 ? (totalInterestEarned / totalLent) * 100 : 0

  // Monthly performance (last 12 months)
  const monthlyData: Record<string, any> = {}
  const now = new Date()

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthlyData[key] = { loans: 0, amount: 0, interest: 0, completed: 0 }
  }

  loans.forEach((loan: any) => {
    const date = loan.created_at ? new Date(loan.created_at) : null
    if (!date) return
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyData[key]) return

    monthlyData[key].loans++
    monthlyData[key].amount += Number(loan.amount || 0)
    if (loan.status === 'completed') {
      monthlyData[key].completed++
      monthlyData[key].interest += Number(loan.total_interest || 0)
    }
  })

  const monthlyStats = Object.entries(monthlyData).map(([month, data]) => {
    const date = new Date(month + '-01')
    return {
      month,
      monthName: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      ...(data as any),
    }
  })

  const reportDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // Build PDF document
  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      
      // Header with Feyza Logo
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          { style: styles.headerContent },
          React.createElement(
            View,
            { style: styles.headerLeft },
            React.createElement(Text, { style: styles.companyName }, businessProfile.business_name || 'Business Lender'),
            React.createElement(Text, { style: styles.reportTitle }, 'Business Analytics Report'),
            React.createElement(Text, { style: styles.generatedDate }, `Generated: ${reportDate}`)
          ),
          React.createElement(
            View,
            { style: styles.logoContainer },
            React.createElement(Text, { style: styles.logo }, 'FEYZA')
          )
        )
      ),

      // Content
      React.createElement(
        View,
        { style: styles.content },

        // Performance Alert (if applicable)
        capitalAvailable < 0 ? React.createElement(
          View,
          { style: styles.highlightBox },
          React.createElement(Text, { style: styles.highlightText }, '⚠️  Capital Alert: Your available capital is negative. Consider recharging your capital pool to accept new loan requests.')
        ) : capitalAvailable > 0 && completionRate >= 90 ? React.createElement(
          View,
          { style: styles.successBox },
          React.createElement(Text, { style: styles.successText }, '✓  Portfolio performing well! Completion rate above 90% and capital available for new loans.')
        ) : null,

        // Key Performance Metrics
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, 'Key Performance Metrics'),
          React.createElement(
            View,
            { style: styles.metricsGrid },
            React.createElement(
              View,
              { style: [styles.metricCard, styles.metricCardBlue] },
              React.createElement(Text, { style: styles.metricLabel }, 'Total Deployed'),
              React.createElement(Text, { style: styles.metricValue }, shortNum(totalLent)),
              React.createElement(Text, { style: styles.metricSubValue }, `${totalLoans} loans issued`)
            ),
            React.createElement(
              View,
              { style: [styles.metricCard, styles.metricCardGreen] },
              React.createElement(Text, { style: styles.metricLabel }, 'Interest Earned'),
              React.createElement(Text, { style: styles.metricValue }, shortNum(totalInterestEarned)),
              React.createElement(Text, { style: styles.metricSubValue }, `ROI: ${pct(roi)}`)
            ),
            React.createElement(
              View,
              { style: [styles.metricCard, styles.metricCardPurple] },
              React.createElement(Text, { style: styles.metricLabel }, 'Avg Interest Rate'),
              React.createElement(Text, { style: styles.metricValue }, pct(avgInterestRate)),
              React.createElement(Text, { style: styles.metricSubValue }, `Avg loan: ${money(averageLoanAmount)}`)
            ),
            React.createElement(
              View,
              { style: [styles.metricCard, styles.metricCardOrange] },
              React.createElement(Text, { style: styles.metricLabel }, 'Outstanding'),
              React.createElement(Text, { style: styles.metricValue }, shortNum(totalOutstanding)),
              React.createElement(Text, { style: styles.metricSubValue }, `${activeLoans.length} active loans`)
            )
          )
        ),

        // Portfolio Health
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, 'Portfolio Health'),
          React.createElement(
            View,
            { style: styles.summaryBox },
            React.createElement(
              View,
              { style: styles.summaryRow },
              React.createElement(Text, { style: styles.summaryLabel }, 'Completion Rate'),
              React.createElement(Text, { style: [styles.summaryValue, styles.summaryValueGreen] }, `${pct(completionRate)} (${completedLoans.length} loans)`)
            ),
            React.createElement(
              View,
              { style: styles.summaryRow },
              React.createElement(Text, { style: styles.summaryLabel }, 'Default Rate'),
              React.createElement(Text, { style: [styles.summaryValue, defaultRate > 5 ? styles.summaryValueRed : styles.summaryValue] }, `${pct(defaultRate)} (${defaultedLoans.length} loans)`)
            ),
            React.createElement(
              View,
              { style: styles.summaryRow },
              React.createElement(Text, { style: styles.summaryLabel }, 'Active Loans'),
              React.createElement(Text, { style: styles.summaryValue }, `${activeLoans.length} loans • ${money(activeLoans.reduce((s: number, l: any) => s + Number(l.amount || 0), 0))}`)
            ),
            React.createElement(
              View,
              { style: [styles.summaryRow, styles.summaryRowLast] },
              React.createElement(Text, { style: styles.summaryLabel }, 'Cancelled Loans'),
              React.createElement(Text, { style: styles.summaryValue }, `${cancelledLoans.length} loans`)
            )
          )
        ),

        // Capital Management
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, 'Capital Management'),
          React.createElement(
            View,
            { style: styles.summaryBox },
            React.createElement(
              View,
              { style: styles.summaryRow },
              React.createElement(Text, { style: styles.summaryLabel }, 'Capital Pool'),
              React.createElement(Text, { style: styles.summaryValue }, money(capitalPool))
            ),
            React.createElement(
              View,
              { style: styles.summaryRow },
              React.createElement(Text, { style: styles.summaryLabel }, 'Reserved Capital'),
              React.createElement(Text, { style: styles.summaryValue }, money(capitalReserved))
            ),
            React.createElement(
              View,
              { style: styles.summaryRow },
              React.createElement(Text, { style: styles.summaryLabel }, 'Available Capital'),
              React.createElement(Text, { 
                style: [
                  styles.summaryValue, 
                  capitalAvailable >= 0 ? styles.summaryValueGreen : styles.summaryValueRed
                ] 
              }, money(capitalAvailable))
            ),
            React.createElement(
              View,
              { style: [styles.summaryRow, styles.summaryRowLast] },
              React.createElement(Text, { style: styles.summaryLabel }, 'Return on Investment (ROI)'),
              React.createElement(Text, { style: [styles.summaryValue, styles.summaryValueGreen] }, pct(roi))
            )
          )
        ),

        // Monthly Performance
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, 'Monthly Performance (Last 12 Months)'),
          React.createElement(
            View,
            { style: styles.table },
            React.createElement(
              View,
              { style: styles.tableHeader },
              React.createElement(Text, { style: [styles.tableHeaderCell, { width: '25%' }] }, 'Month'),
              React.createElement(Text, { style: [styles.tableHeaderCell, { width: '15%', textAlign: 'right' }] }, 'Loans'),
              React.createElement(Text, { style: [styles.tableHeaderCell, { width: '25%', textAlign: 'right' }] }, 'Amount'),
              React.createElement(Text, { style: [styles.tableHeaderCell, { width: '15%', textAlign: 'right' }] }, 'Completed'),
              React.createElement(Text, { style: [styles.tableHeaderCell, { width: '20%', textAlign: 'right' }] }, 'Interest')
            ),
            ...monthlyStats.map((m, index) =>
              React.createElement(
                View,
                { 
                  key: m.month, 
                  style: index % 2 === 0 ? [styles.tableRow, styles.tableRowEven] : styles.tableRow
                },
                React.createElement(Text, { style: [styles.tableCell, styles.tableCellBold, { width: '25%' }] }, m.monthName),
                React.createElement(Text, { style: [styles.tableCell, { width: '15%', textAlign: 'right' }] }, m.loans.toString()),
                React.createElement(Text, { style: [styles.tableCell, { width: '25%', textAlign: 'right' }] }, money(m.amount)),
                React.createElement(Text, { style: [styles.tableCell, { width: '15%', textAlign: 'right' }] }, m.completed.toString()),
                React.createElement(Text, { style: [styles.tableCell, { width: '20%', textAlign: 'right' }] }, money(m.interest))
              )
            )
          )
        )
      ),

      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, { style: styles.footerText }, 'This report is confidential and intended solely for the use of the named recipient.'),
        React.createElement(Text, { style: styles.footerBrand }, 'Powered by Feyza P2P Lending Platform')
      )
    )
  )

  // FIX: Convert the stream to a buffer
  const pdfStream = await pdf(doc).toBuffer()
  
  // Convert NodeJS.ReadableStream to Buffer
  const chunks: Buffer[] = []
  for await (const chunk of pdfStream) {
    chunks.push(Buffer.from(chunk))
  }
  const pdfBuffer = Buffer.concat(chunks)

  const filename = `feyza-analytics-${businessProfile.slug || businessProfile.id}-${new Date().toISOString().split('T')[0]}.pdf`

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}