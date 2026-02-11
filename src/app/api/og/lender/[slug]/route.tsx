import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params

    const supabase = await createClient()

    const { data: lender, error } = await supabase
      .from('business_profiles')
      .select(`
        *,
        lender_preferences (
          min_amount,
          max_amount,
          interest_rate,
          interest_type
        )
      `)
      .eq('slug', slug)
      .single()

    if (error || !lender) {
      return new ImageResponse(
        (
          <div
            style={{
              display: 'flex',
              background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
              width: '1200px',
              height: '630px',
              padding: '60px',
              color: 'white',
              fontFamily: 'Inter',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h1 style={{ fontSize: '64px', fontWeight: 700, marginBottom: '16px' }}>
                Lender Not Found
              </h1>
              <p style={{ fontSize: '32px', opacity: 0.9 }}>
                This lender profile isn't available
              </p>
            </div>
          </div>
        ),
        { width: 1200, height: 630 }
      )
    }

    const businessName = lender.business_name || 'Verified Lender'
    const tagline = lender.tagline || 'Fast, fair loans on Feyza'
    const logoUrl = lender.logo_url
    const minAmount = lender.lender_preferences?.[0]?.min_amount ?? 50
    const maxAmount = lender.lender_preferences?.[0]?.max_amount ?? 5000
    const interestRate = lender.lender_preferences?.[0]?.interest_rate ?? 0

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
            width: '1200px',
            height: '630px',
            padding: '60px',
            color: 'white',
            fontFamily: 'Inter',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
            {/* Logo */}
            {logoUrl ? (
              <img
                src={logoUrl}
                width={120}
                height={120}
                style={{
                  borderRadius: '24px',
                  marginBottom: '32px',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '24px',
                  background: 'white',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  fontWeight: 'bold',
                  marginBottom: '32px',
                }}
              >
                {businessName.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Business Name */}
            <h1
              style={{
                fontSize: '56px',
                fontWeight: 700,
                marginBottom: '16px',
                lineHeight: 1.2,
              }}
            >
              {businessName}
            </h1>

            {/* Tagline */}
            <p
              style={{
                fontSize: '28px',
                opacity: 0.9,
                marginBottom: '32px',
              }}
            >
              {tagline}
            </p>

            {/* Loan Details */}
            <div style={{ display: 'flex', gap: '48px', marginTop: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '20px', opacity: 0.8, marginBottom: '8px' }}>
                  Loan Range
                </span>
                <span style={{ fontSize: '36px', fontWeight: 700 }}>
                  ${minAmount} - ${maxAmount}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '20px', opacity: 0.8, marginBottom: '8px' }}>
                  Interest Rate
                </span>
                <span style={{ fontSize: '36px', fontWeight: 700 }}>
                  {interestRate === 0 ? '0%' : `${interestRate}%`}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '20px', opacity: 0.8, marginBottom: '8px' }}>
                  Hidden Fees
                </span>
                <span style={{ fontSize: '36px', fontWeight: 700 }}>None</span>
              </div>
            </div>

            {/* Feyza Branding */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '60px', fontSize: '24px' }}>
              <span style={{ marginRight: '12px' }}>⚡</span>
              <span style={{ fontWeight: 600 }}>Feyza</span>
              <span style={{ opacity: 0.8, marginLeft: '12px' }}>• Peer-to-Peer Lending</span>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  } catch (error) {
    console.error('OG Image Error:', error)

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
            width: '1200px',
            height: '630px',
            padding: '60px',
            color: 'white',
            fontFamily: 'Inter',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <h1 style={{ fontSize: '48px', fontWeight: 700 }}>
            Feyza • Peer-to-Peer Lending
          </h1>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }
}
