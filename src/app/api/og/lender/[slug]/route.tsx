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
              fontFamily: 'Inter, system-ui, sans-serif',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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

    // Format numbers with commas
    const formatNumber = (num: number) => {
      return new Intl.NumberFormat('en-US').format(num)
    }

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
            fontFamily: 'Inter, system-ui, sans-serif',
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
                  border: '3px solid rgba(255, 255, 255, 0.2)',
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
                  border: '3px solid rgba(255, 255, 255, 0.2)',
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
                maxWidth: '900px',
              }}
            >
              {businessName}
            </h1>

            {/* Tagline */}
            <p
              style={{
                fontSize: '28px',
                opacity: 0.9,
                marginBottom: '48px',
                maxWidth: '900px',
              }}
            >
              {tagline}
            </p>

            {/* Loan Details - Enhanced with better spacing */}
            <div style={{ display: 'flex', gap: '60px', marginTop: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ 
                  fontSize: '18px', 
                  opacity: 0.75, 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>
                  Loan Range
                </span>
                <span style={{ fontSize: '40px', fontWeight: 700, lineHeight: 1 }}>
                  ${formatNumber(minAmount)} - ${formatNumber(maxAmount)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ 
                  fontSize: '18px', 
                  opacity: 0.75, 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>
                  Interest Rate
                </span>
                <span style={{ fontSize: '40px', fontWeight: 700, lineHeight: 1 }}>
                  {interestRate === 0 ? 'Interest Free' : `${interestRate}%`}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ 
                  fontSize: '18px', 
                  opacity: 0.75, 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>
                  Hidden Fees
                </span>
                <span style={{ fontSize: '40px', fontWeight: 700, lineHeight: 1 }}>
                  None
                </span>
              </div>
            </div>

            {/* Verified Badge */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginTop: '60px',
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '16px 24px',
              borderRadius: '12px',
              width: 'fit-content',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginRight: '12px' }}>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: '20px', fontWeight: 600 }}>Verified Lender on Feyza</span>
            </div>

            {/* Feyza Branding */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginTop: '40px', 
              fontSize: '22px',
              opacity: 0.8,
            }}>
              <span style={{ marginRight: '12px', fontSize: '28px' }}>⚡</span>
              <span style={{ fontWeight: 600 }}>Feyza</span>
              <span style={{ opacity: 0.7, marginLeft: '12px' }}>• Peer-to-Peer Lending</span>
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
            fontFamily: 'Inter, system-ui, sans-serif',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{ fontSize: '64px', fontWeight: 700, marginBottom: '16px' }}>
              ⚡ Feyza
            </h1>
            <p style={{ fontSize: '32px', opacity: 0.9 }}>
              Peer-to-Peer Lending
            </p>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }
}