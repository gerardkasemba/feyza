'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import GuestLoanRequestForm from '@/components/GuestLoanRequestForm'
import { Card } from '@/components/ui'
import { Navbar, Footer } from '@/components/layout'
import {
  Building2,
  Loader2,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Shield,
  Info,
} from 'lucide-react'
import Link from 'next/link'

interface BusinessLender {
  id: string
  business_name: string
  slug: string
  logo_url?: string
  description?: string
  tagline?: string
  is_verified: boolean
  verification_status: string
  default_interest_rate: number
  interest_type: string
  first_time_borrower_amount: number
  min_loan_amount: number | null
  max_loan_amount: number | null
}

interface LenderPreferences {
  interest_rate: number
  interest_type: string
  min_amount: number
  max_amount: number
  first_time_borrower_limit: number
  allow_first_time_borrowers: boolean
}

export default function ApplyWithSlugPage() {
  const params = useParams()
  const slug = params?.slug as string
  const supabase = createClient()

  const [business, setBusiness] = useState<BusinessLender | null>(null)
  const [preferences, setPreferences] = useState<LenderPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!slug) {
        setLoading(false)
        return
      }

      try {
        const { data: businessData, error: fetchError } = await supabase
          .from('business_profiles')
          .select(
            `
            id, 
            business_name, 
            slug, 
            logo_url, 
            description, 
            tagline,
            is_verified, 
            verification_status,
            default_interest_rate,
            interest_type,
            first_time_borrower_amount,
            min_loan_amount,
            max_loan_amount
          `
          )
          .eq('slug', slug)
          .single()

        if (fetchError || !businessData) {
          console.error('Business fetch error:', fetchError)
          setError('Business lender not found')
          setLoading(false)
          return
        }

        if (
          businessData.verification_status !== 'verified' &&
          businessData.verification_status !== 'approved'
        ) {
          setError('This lender is not currently accepting applications')
          setLoading(false)
          return
        }

        setBusiness(businessData)

        const { data: prefsData } = await supabase
          .from('lender_preferences')
          .select(
            'interest_rate, interest_type, min_amount, max_amount, first_time_borrower_limit, allow_first_time_borrowers'
          )
          .eq('business_id', businessData.id)
          .single()

        if (prefsData) {
          setPreferences(prefsData)
          console.log('[ApplySlug] Loaded lender preferences:', prefsData)
        }
      } catch (err) {
        console.error('Error fetching business:', err)
        setError('Failed to load lender information')
      } finally {
        setLoading(false)
      }
    }

    fetchBusiness()
  }, [slug, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <Navbar user={null} />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400">Loading lender information...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <Navbar user={null} />
        <div className="flex items-center justify-center p-4 py-20">
          <Card className="max-w-md w-full text-center p-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{error}</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mb-6">
              The lender you're looking for may not exist or is no longer accepting applications.
            </p>
            <Link href="/" className="text-primary-600 hover:text-primary-700 font-medium">
              ← Return to Home
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  const displayedInterestRate = preferences?.interest_rate ?? business?.default_interest_rate ?? 0
  const displayedInterestType = preferences?.interest_type ?? business?.interest_type ?? 'simple'
  const displayedFirstTimeLimit =
    preferences?.first_time_borrower_limit ?? business?.first_time_borrower_amount ?? 50
  const displayedMaxLoan = preferences?.max_amount ?? business?.max_loan_amount ?? null
  const displayedMinLoan = preferences?.min_amount ?? business?.min_loan_amount ?? null

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <Navbar user={null} />

      {/* Header */}
      <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {business && (
            <div className="flex items-start gap-4">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={business.business_name}
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-10 h-10 text-primary-600" />
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                    {business.business_name}
                  </h1>

                  {/* ✅ FIX: Lucide icons don't accept `title` prop */}
                  {business.is_verified && (
                    <span title="Verified Business" className="inline-flex">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </span>
                  )}
                </div>

                {business.tagline && (
                  <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-2">
                    {business.tagline}
                  </p>
                )}

                {business.description && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {business.description}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lender Terms Card */}
      {business && (
        <div className="max-w-3xl mx-auto px-4 pt-6">
          <Card className="p-5 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-primary-200 dark:border-primary-800">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h3 className="font-semibold text-neutral-900 dark:text-white">Lending Terms</h3>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/50 dark:bg-neutral-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium">Interest Rate</span>
                </div>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">
                  {displayedInterestRate}%
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                  {displayedInterestType} interest
                </p>
              </div>

              <div className="bg-white/50 dark:bg-neutral-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-1">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs font-medium">First-Time Limit</span>
                </div>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">
                  ${displayedFirstTimeLimit.toLocaleString()}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">For new borrowers</p>
              </div>

              {displayedMinLoan !== null && displayedMaxLoan !== null && (
                <div className="bg-white/50 dark:bg-neutral-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">Loan Range</span>
                  </div>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white">
                    ${displayedMinLoan.toLocaleString()}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Up to ${displayedMaxLoan.toLocaleString()}
                  </p>
                </div>
              )}

              <div className="bg-white/50 dark:bg-neutral-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-1">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Status</span>
                </div>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">Accepting</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Applications open</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Application Form */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card className="p-6 md:p-8">
          <GuestLoanRequestForm
            businessSlug={business?.slug || null}
            businessLenderId={business?.id || null}
          />
        </Card>
      </div>

      {/* Footer */}
      <div className="max-w-3xl mx-auto px-4 pb-8">
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          By applying, you agree to our{' '}
          <Link href="/terms" className="text-primary-600 hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-primary-600 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>

      <Footer />
    </div>
  )
}
