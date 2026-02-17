// src/app/api/payment-methods/route.ts
// FIXED: Handles both ?country=&type= (provider list) and ?loanId= (legacy loan lookup)
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClientDirect } from '@/lib/supabase/server'

/**
 * GET /api/payment-methods
 *
 * Two call patterns:
 *
 * 1. Provider list (used by hooks/components):
 *    ?country=US&type=disbursement|repayment
 *    ?country=US&provider_type=automated|manual
 *    Returns: { providers: PaymentProvider[] }
 *
 * 2. Lender payment methods for a specific loan (legacy):
 *    ?loanId=<uuid>
 *    Returns: { success: true, paymentMethods: { ... } }
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl
    const loanId = url.searchParams.get('loanId')
    const country = url.searchParams.get('country')
    const type = url.searchParams.get('type')            // disbursement | repayment
    const providerType = url.searchParams.get('provider_type') // automated | manual

    const supabase = createServiceRoleClientDirect()

    // ─────────────────────────────────────────────────────────────────
    // Pattern 1: ?country=&type= or ?country=&provider_type=
    // Returns list of enabled payment providers
    // ─────────────────────────────────────────────────────────────────
    if (!loanId) {
      let query = supabase
        .from('payment_providers')
        .select(
          'id, slug, name, provider_type, is_enabled, ' +
          'is_available_for_disbursement, is_available_for_repayment, ' +
          'account_identifier_label, icon_name, brand_color, instructions, ' +
          'supported_countries, display_order'
        )
        .eq('is_enabled', true)
        .order('display_order', { ascending: true })

      if (type === 'disbursement') {
        query = query.eq('is_available_for_disbursement', true)
      } else if (type === 'repayment') {
        query = query.eq('is_available_for_repayment', true)
      }

      if (providerType) {
        query = query.eq('provider_type', providerType)
      }

      const { data: providers, error } = await query

      if (error) {
        console.error('[Payment Methods API] Error fetching providers:', error)
        return NextResponse.json({ providers: [] }, { status: 200 })
      }

      let filtered = providers || []
      if (country) {
        filtered = filtered.filter((p: any) =>
          !p.supported_countries ||
          p.supported_countries.length === 0 ||
          p.supported_countries.includes(country) ||
          p.supported_countries.includes('ALL')
        )
      }

      const mapped = filtered.map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        type: p.provider_type,
        isAutomated: p.provider_type === 'automated',
        requiresProof: p.provider_type === 'manual',
        accountIdentifierLabel: p.account_identifier_label ?? null,
        brandColor: p.brand_color ?? '#888888',
        instructions: p.instructions ?? '',
        iconName: p.icon_name ?? 'CreditCard',
      }))

      return NextResponse.json({ providers: mapped })
    }

    // ─────────────────────────────────────────────────────────────────
    // Pattern 2: ?loanId=<uuid>
    // Returns the lender's payment methods for a specific loan
    // ─────────────────────────────────────────────────────────────────
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(
        `id, lender_id, business_lender_id,
        lender:users!lender_id(
          id, full_name, email,
          paypal_email, paypal_connected,
          cashapp_username, venmo_username,
          zelle_email, zelle_phone,
          preferred_payment_method
        ),
        business_lender:business_profiles!business_lender_id(
          id, business_name, contact_email,
          paypal_email, paypal_connected,
          cashapp_username, venmo_username,
          zelle_email, zelle_phone, zelle_name,
          preferred_payment_method
        )`
      )
      .eq('id', loanId)
      .single()

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    const paymentMethods: Record<string, any> = {
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

    const loanAny = loan as any

    if (loanAny.business_lender_id && loanAny.business_lender) {
      const b = loanAny.business_lender
      Object.assign(paymentMethods, {
        paypal_email: b.paypal_email,
        paypal_connected: !!b.paypal_connected,
        cashapp_username: b.cashapp_username,
        venmo_username: b.venmo_username,
        zelle_email: b.zelle_email,
        zelle_phone: b.zelle_phone,
        zelle_name: b.zelle_name || b.business_name,
        preferred_payment_method: b.preferred_payment_method,
        source: 'business',
        lender_name: b.business_name,
        lender_email: b.contact_email,
      })
    } else if (loanAny.lender_id && loanAny.lender) {
      const p = loanAny.lender
      Object.assign(paymentMethods, {
        paypal_email: p.paypal_email,
        paypal_connected: !!p.paypal_connected,
        cashapp_username: p.cashapp_username,
        venmo_username: p.venmo_username,
        zelle_email: p.zelle_email,
        zelle_phone: p.zelle_phone,
        zelle_name: p.full_name,
        preferred_payment_method: p.preferred_payment_method,
        source: 'personal',
        lender_name: p.full_name,
        lender_email: p.email,
      })
    }

    const available: string[] = []
    if (paymentMethods.paypal_connected && paymentMethods.paypal_email) available.push('paypal')
    if (paymentMethods.cashapp_username) available.push('cashapp')
    if (paymentMethods.venmo_username) available.push('venmo')
    if (paymentMethods.zelle_email || paymentMethods.zelle_phone) available.push('zelle')

    paymentMethods.available_methods = available
    paymentMethods.has_payment_methods = available.length > 0

    return NextResponse.json({ success: true, paymentMethods })

  } catch (error: any) {
    console.error('[Payment Methods API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment methods', providers: [] },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}