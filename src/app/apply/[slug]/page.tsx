'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import GuestLoanRequestForm from '@/components/loans/GuestLoanRequestForm'
import { Navbar, Footer } from '@/components/layout'
import {
  Building2, Loader2, AlertCircle, CheckCircle,
  TrendingUp, DollarSign, Shield, Percent,
  ArrowLeft, Zap, Lock, Clock, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface BusinessLender {
  id: string
  user_id: string
  business_name: string
  slug: string
  logo_url?: string
  description?: string
  tagline?: string
  is_verified: boolean
  verification_status: string
  default_interest_rate: number
  interest_type: string
}

interface LenderPreferences {
  interest_rate: number
  interest_type: string
  min_amount: number
  first_time_borrower_limit?: number
}

interface TierPolicy {
  tier_id: string
  max_loan_amount: number
  interest_rate: number
  is_active: boolean
}

export default function ApplyWithSlugPage() {
  const params = useParams()
  const slug = params?.slug as string
  const supabase = createClient()

  const [business, setBusiness] = useState<BusinessLender | null>(null)
  const [preferences, setPreferences] = useState<LenderPreferences | null>(null)
  const [tier1Policy, setTier1Policy] = useState<TierPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!slug) { setLoading(false); return }
      try {
        const { data, error: fetchError } = await supabase
          .from('business_profiles')
          .select('id, user_id, business_name, slug, logo_url, description, tagline, is_verified, verification_status, default_interest_rate, interest_type')
          .eq('slug', slug)
          .single()

        if (fetchError || !data) { setError('Business lender not found'); setLoading(false); return }
        if (data.verification_status !== 'verified' && data.verification_status !== 'approved') {
          setError('This lender is not currently accepting applications'); setLoading(false); return
        }
        setBusiness(data)

        const { data: prefs } = await supabase
          .from('lender_preferences')
          .select('interest_rate, interest_type, min_amount, first_time_borrower_limit')
          .eq('business_id', data.id)
          .single()
        if (prefs) setPreferences(prefs)

        // Fetch tier_1 policy for this lender to show accurate guest limit
        if (data.user_id) {
          const { data: t1 } = await supabase
            .from('lender_tier_policies')
            .select('tier_id, max_loan_amount, interest_rate, is_active')
            .eq('lender_id', data.user_id)
            .eq('tier_id', 'tier_1')
            .eq('is_active', true)
            .single()
          if (t1) setTier1Policy(t1)
        }
      } catch {
        setError('Failed to load lender information')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [slug, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
        <Navbar user={null} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            <p className="text-neutral-500 text-sm">Loading…</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
        <Navbar user={null} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-sm text-center">
            <div className="w-16 h-16 mx-auto mb-5 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{error}</h1>
            <p className="text-neutral-500 text-sm mb-6">
              The lender may not exist or is no longer accepting applications.
            </p>
            <Link href="/" className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium text-sm hover:underline">
              <ArrowLeft className="w-4 h-4" /> Return to home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const rate = tier1Policy?.interest_rate ?? preferences?.interest_rate ?? business?.default_interest_rate ?? 0
  const rateType = preferences?.interest_type ?? business?.interest_type ?? 'simple'

  // Guest cap: use tier_1 max_loan_amount from lender_tier_policies (authoritative).
  // Also respect first_time_borrower_limit if it's more restrictive.
  const tier1Max = tier1Policy?.max_loan_amount ?? 0
  const firstTimeLimit = preferences?.first_time_borrower_limit ?? 0
  const guestLimit = tier1Max > 0 && firstTimeLimit > 0
    ? Math.min(tier1Max, firstTimeLimit)
    : tier1Max || firstTimeLimit || 0

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <Navbar user={null} />

      {/* Back + breadcrumb */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href={`/lend/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to lender profile</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Lender</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-neutral-900 dark:text-white font-medium">Apply</span>
          </div>
        </div>
      </div>

      {/* Lender identity header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {business && (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden ring-1 ring-neutral-200 dark:ring-neutral-700 flex-shrink-0">
                {business.logo_url ? (
                  <img src={business.logo_url} alt={business.business_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-700">
                    <span className="text-white text-xl font-bold">{business.business_name[0]?.toUpperCase()}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-neutral-900 dark:text-white truncate">{business.business_name}</h1>
                  {business.is_verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold flex-shrink-0">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
                {business.tagline && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{business.tagline}</p>}
              </div>
              <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-neutral-500"><Lock className="w-3.5 h-3.5 text-green-500" /> Secure</div>
                <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700" />
                <div className="flex items-center gap-1.5 text-xs text-neutral-500"><Zap className="w-3.5 h-3.5 text-amber-500" /> Fast approval</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dark terms ribbon — shows accurate guest (Tier 1) values */}
      {business && (
        <div className="bg-neutral-900 dark:bg-neutral-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-neutral-800 overflow-x-auto">
              {[
                {
                  icon: DollarSign,
                  label: 'Your limit today',
                  value: guestLimit > 0 ? formatCurrency(guestLimit) : '—',
                  sub: 'Tier 1 (starting)',
                  color: 'text-green-400',
                },
                {
                  icon: Percent,
                  label: 'Interest rate',
                  value: rate === 0 ? 'Free' : `${rate}%`,
                  sub: `${rateType} interest`,
                  color: 'text-blue-400',
                },
                {
                  icon: TrendingUp,
                  label: 'Grows over time',
                  value: 'Tier system',
                  sub: '4 tiers to unlock',
                  color: 'text-amber-400',
                },
                {
                  icon: Clock,
                  label: 'Approval',
                  value: '< 24 hrs',
                  sub: 'Typically faster',
                  color: 'text-purple-400',
                },
              ].map(({ icon: Icon, label, value, sub, color }) => (
                <div key={label} className="flex items-center gap-3 px-5 py-4 min-w-[130px]">
                  <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">{label}</p>
                    <p className={`font-bold text-sm ${color}`}>{value}</p>
                    <p className="text-[10px] text-neutral-600">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Form */}
            <div className="lg:col-span-7">
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                  <h2 className="font-bold text-neutral-900 dark:text-white">Loan application</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Submit your request to <strong>{business?.business_name}</strong>.
                  </p>
                </div>
                <div className="p-6">
                  <GuestLoanRequestForm
                    businessSlug={business?.slug ?? null}
                    businessLenderId={business?.id ?? null}
                    presetMaxAmount={guestLimit ? Number(guestLimit) : undefined}
                  />
                </div>
              </div>
              <p className="text-center text-xs text-neutral-400 mt-4">
                By applying you agree to our{' '}
                <Link href="/terms" className="text-green-600 hover:underline">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-green-600 hover:underline">Privacy Policy</Link>
              </p>
            </div>

            {/* Right panel */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6 self-start">

              {/* Tier 1 limit callout */}
              {guestLimit > 0 && (
                <div className="rounded-2xl bg-neutral-900 text-white p-5 border border-neutral-800">
                  <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Your starting limit (Tier 1)</p>
                  <p className="text-3xl font-extrabold tracking-tight mb-2">{formatCurrency(guestLimit)}</p>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    New borrowers start at Tier 1. Your limit grows as you build history on Feyza.
                  </p>
                  {tier1Policy && (
                    <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-sm">
                      <span className="text-neutral-500">Tier 1 rate</span>
                      <span className="font-bold text-blue-400">{tier1Policy.interest_rate === 0 ? 'Interest free' : `${tier1Policy.interest_rate}%`}</span>
                    </div>
                  )}
                </div>
              )}

              {/* What happens next */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
                <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-4">What happens next</p>
                <ol className="space-y-4">
                  {[
                    { n: '1', title: 'Request submitted', body: `Your application is sent securely to ${business?.business_name || 'the lender'}.` },
                    { n: '2', title: 'Lender reviews', body: 'They typically respond within 24 hours — often much faster.' },
                    { n: '3', title: 'Funds released', body: 'If approved, money is sent directly to your account.' },
                  ].map(({ n, title, body }) => (
                    <li key={n} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[10px] font-bold flex items-center justify-center mt-0.5">{n}</span>
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">{title}</p>
                        <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Security */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
                <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Your information is safe</p>
                <div className="space-y-3">
                  {[
                    { icon: Lock, label: 'Bank-level encryption' },
                    { icon: Shield, label: 'No impact on your credit score' },
                    { icon: CheckCircle, label: 'Verified lender — no scams' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                      <Icon className="w-4 h-4 text-green-500 flex-shrink-0" />{label}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
