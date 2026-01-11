import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendEmail, getLoanInviteEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      loanId, 
      inviteToken, 
      email, 
      phone, 
      borrowerName, 
      amount, 
      currency, 
      purpose,
      lenderType,
      businessId 
    } = body;

    console.log('Invite send request:', { lenderType, email, businessId, borrowerName });

    // Personal loan - send invite email to friend/family
    if (lenderType === 'personal' && email) {
      try {
        const { subject, html } = getLoanInviteEmail({
          borrowerName: borrowerName || 'Someone',
          amount: amount || 0,
          currency: currency || 'USD',
          inviteToken: inviteToken || '',
          purpose,
        });

        const result = await sendEmail({
          to: email,
          subject,
          html,
        });

        if (!result.success) {
          console.error('Failed to send invite email:', result.error);
        } else {
          console.log('Invite email sent successfully to:', email);
        }
      } catch (emailError) {
        console.error('Email send error:', emailError);
      }
    }

    // Business loan - notify the business owner
    if (lenderType === 'business' && businessId) {
      try {
        const supabase = await createServerSupabaseClient();
        
        // Get the business profile with owner info
        const { data: business, error: bizError } = await supabase
          .from('business_profiles')
          .select('*, owner:users!user_id(*)')
          .eq('id', businessId)
          .single();

        if (bizError) {
          console.error('Error fetching business:', bizError);
        }

        if (business?.owner?.email) {
          const emailContent = getBusinessLoanRequestEmail({
            businessName: business.business_name,
            borrowerName: borrowerName || 'A user',
            amount: amount || 0,
            currency: currency || 'USD',
            purpose,
            loanId: loanId || '',
          });

          const result = await sendEmail({
            to: business.owner.email,
            subject: emailContent.subject,
            html: emailContent.html,
          });

          if (!result.success) {
            console.error('Failed to send business notification email:', result.error);
          } else {
            console.log('Business loan request email sent to:', business.owner.email);
          }
        } else {
          console.log('No business owner email found for business:', businessId);
        }
      } catch (bizError) {
        console.error('Business email error:', bizError);
      }
    }

    if (phone) {
      console.log('SMS invite requested for:', phone, '- SMS not yet implemented');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in invite send:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getBusinessLoanRequestEmail(params: {
  businessName: string;
  borrowerName: string;
  amount: number;
  currency: string;
  purpose?: string;
  loanId: string;
}) {
  const { businessName, borrowerName, amount, currency, purpose, loanId } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const loanUrl = `${APP_URL}/business`;

  return {
    subject: `New loan request from ${borrowerName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📋 New Loan Request</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi ${businessName} team! 👋</p>
            
            <p>You have a new loan request from <strong>${borrowerName}</strong>:</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <div style="margin-bottom: 10px;">
                <span style="color: #6b7280;">Requested Amount:</span>
                <span style="font-weight: bold; font-size: 24px; color: #22c55e; margin-left: 10px;">${currency} ${amount.toLocaleString()}</span>
              </div>
              ${purpose ? `
              <div style="border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 10px;">
                <span style="color: #6b7280;">Purpose:</span>
                <p style="margin: 5px 0 0 0;">${purpose}</p>
              </div>
              ` : ''}
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">Review this request in your business dashboard to accept or decline.</p>
            
            <a href="${loanUrl}" style="display: block; background: #22c55e; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
              View Request →
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            Sent via LoanTrack • Simple loan tracking for everyone
          </p>
        </body>
      </html>
    `,
  };
}
