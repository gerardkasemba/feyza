// src/app/api/payment-methods/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface PersonalLender {
  id: string
  full_name: string | null
  email: string | null
  paypal_email: string | null
  paypal_connected: boolean | null
  cashapp_username: string | null
  venmo_username: string | null
  zelle_email: string | null
  zelle_phone: string | null
  preferred_payment_method: string | null
}

interface BusinessLender {
  id: string
  business_name: string | null
  contact_email: string | null
  paypal_email: string | null
  paypal_connected: boolean | null
  cashapp_username: string | null
  venmo_username: string | null
  zelle_email: string | null
  zelle_phone: string | null
  zelle_name: string | null
  preferred_payment_method: string | null
}

interface PaymentMethodsResponse {
  paypal_email: string | null
  paypal_connected: boolean
  cashapp_username: string | null
  venmo_username: string | null
  zelle_email: string | null
  zelle_phone: string | null
  zelle_name: string | null
  preferred_payment_method: string | null
  source: 'business' | 'personal' | null
  lender_name: string | null
  lender_email: string | null
  has_payment_methods: boolean
  available_methods: string[]
}

/**
 * GET /api/payment-methods?loanId=<uuid>
 * Returns payment methods for the lender (business or personal) for a given loan.
 *
 * NOTE: If you also pass other query params (country/type), we ignore them here unless you need them.
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl
    const loanId = url.searchParams.get('loanId')

    if (!loanId) {
      return NextResponse.json({ error: 'loanId query param is required' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(
        `
        id,
        lender_id,
        business_lender_id,
        lender:users!lender_id(
          id,
          full_name,
          email,
          paypal_email,
          paypal_connected,
          cashapp_username,
          venmo_username,
          zelle_email,
          zelle_phone,
          preferred_payment_method
        ),
        business_lender:business_profiles!business_lender_id(
          id,
          business_name,
          contact_email,
          paypal_email,
          paypal_connected,
          cashapp_username,
          venmo_username,
          zelle_email,
          zelle_phone,
          zelle_name,
          preferred_payment_method
        )
      `
      )
      .eq('id', loanId)
      .single()

    if (loanError) {
      console.error('[Payment Methods API] Database error:', loanError)
      return NextResponse.json({ error: 'Failed to fetch loan details' }, { status: 500 })
    }

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    const paymentMethods: PaymentMethodsResponse = {
      paypal_email: null,
      paypal_connected: false,
      cashapp_username: null,
      venmo_username: null,
      zelle_email: null,
      zelle_phone: null,
      zelle_name: null,
      preferred_payment_method: null,
      source: null,
      lender_name: null,
      lender_email: null,
      has_payment_methods: false,
      available_methods: [],
    }

    // Business lender
    if ((loan as any).business_lender_id && (loan as any).business_lender) {
      const business = (loan as any).business_lender as BusinessLender

      paymentMethods.paypal_email = business.paypal_email
      paymentMethods.paypal_connected = !!business.paypal_connected
      paymentMethods.cashapp_username = business.cashapp_username
      paymentMethods.venmo_username = business.venmo_username
      paymentMethods.zelle_email = business.zelle_email
      paymentMethods.zelle_phone = business.zelle_phone
      paymentMethods.zelle_name = business.zelle_name || business.business_name
      paymentMethods.preferred_payment_method = business.preferred_payment_method
      paymentMethods.source = 'business'
      paymentMethods.lender_name = business.business_name
      paymentMethods.lender_email = business.contact_email
    }
    // Personal lender
    else if ((loan as any).lender_id && (loan as any).lender) {
      const personal = (loan as any).lender as PersonalLender

      paymentMethods.paypal_email = personal.paypal_email
      paymentMethods.paypal_connected = !!personal.paypal_connected
      paymentMethods.cashapp_username = personal.cashapp_username
      paymentMethods.venmo_username = personal.venmo_username
      paymentMethods.zelle_email = personal.zelle_email
      paymentMethods.zelle_phone = personal.zelle_phone
      paymentMethods.zelle_name = personal.full_name
      paymentMethods.preferred_payment_method = personal.preferred_payment_method
      paymentMethods.source = 'personal'
      paymentMethods.lender_name = personal.full_name
      paymentMethods.lender_email = personal.email
    }

    const availableMethods: string[] = []
    if (paymentMethods.paypal_connected && paymentMethods.paypal_email) availableMethods.push('paypal')
    if (paymentMethods.cashapp_username) availableMethods.push('cashapp')
    if (paymentMethods.venmo_username) availableMethods.push('venmo')
    if (paymentMethods.zelle_email || paymentMethods.zelle_phone) availableMethods.push('zelle')

    paymentMethods.available_methods = availableMethods
    paymentMethods.has_payment_methods = availableMethods.length > 0

    return NextResponse.json({ success: true, paymentMethods })
  } catch (error: any) {
    console.error('[Payment Methods API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch payment methods',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}
