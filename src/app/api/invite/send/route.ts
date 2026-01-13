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
        <!-- Header with logo -->
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
          <!-- Logo -->
          <div style="margin-bottom: 15px;">
            <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                 alt="Feyza Logo" 
                 style="height: 40px; width: auto; filter: brightness(0) invert(1);">
          </div>
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">📋 New Loan Request</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">Ready for your review</p>
        </div>
        
        <!-- Main content -->
        <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
          <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${businessName} team! 👋</p>
          
          <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
            You have a new loan request from <strong style="color: #059669;">${borrowerName}</strong>:
          </p>
          
          <!-- Loan details card -->
          <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
            <h3 style="margin: 0 0 20px 0; color: #065f46; font-size: 18px; font-weight: 600;">Request Details</h3>
            
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <div style="flex: 1;">
                <span style="color: #047857; font-size: 14px; font-weight: 500;">Requested Amount:</span>
              </div>
              <div style="text-align: right;">
                <span style="font-weight: bold; font-size: 28px; color: #059669;">${currency} ${amount.toLocaleString()}</span>
              </div>
            </div>
            
            ${purpose ? `
            <div style="border-top: 1px solid #bbf7d0; padding-top: 15px; margin-top: 15px;">
              <div style="margin-bottom: 8px;">
                <span style="color: #047857; font-size: 14px; font-weight: 500;">Purpose:</span>
              </div>
              <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; border-left: 4px solid #059669;">
                <p style="margin: 0; color: #166534; line-height: 1.5;">${purpose}</p>
              </div>
            </div>
            ` : ''}
            
            <!-- Quick stats (optional - add if you have more data) -->
            <!--
            <div style="border-top: 1px solid #bbf7d0; padding-top: 15px; margin-top: 15px;">
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                <div>
                  <span style="color: #047857; font-size: 12px; font-weight: 500;">Risk Score:</span>
                  <div style="font-weight: 600; color: #166534;">Medium</div>
                </div>
                <div>
                  <span style="color: #047857; font-size: 12px; font-weight: 500;">Borrower Rating:</span>
                  <div style="font-weight: 600; color: #166534;">★★★★☆</div>
                </div>
              </div>
            </div>
            -->
          </div>
          
          <!-- Action box -->
          <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
            <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px; font-weight: 600;">Next Steps</h3>
            <p style="color: #166534; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
              Review this request in your business dashboard to accept or decline. 
              Remember to check borrower details and risk assessment before making a decision.
            </p>
            
            <!-- Timer/urgency (optional) -->
            <!--
            <div style="background: #fef3c7; padding: 12px; border-radius: 8px; border: 1px solid #fbbf24; margin-bottom: 20px;">
              <div style="display: flex; align-items: center;">
                <span style="color: #92400e; font-size: 14px; font-weight: 500;">⏰ Respond within:</span>
                <span style="color: #92400e; font-weight: 600; margin-left: auto;">48 hours</span>
              </div>
            </div>
            -->
            
            <div style="display: flex; gap: 15px; margin-top: 20px; flex-wrap: wrap;">
              <a href="${loanUrl}" 
                 style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                        color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                        font-weight: 600; text-align: center; font-size: 16px; flex: 2; min-width: 200px;
                        box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                 onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                 onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                Review Request →
              </a>
              
              <a href="${APP_URL}/business/requests" 
                 style="display: inline-block; background: white; 
                        color: #059669; text-decoration: none; padding: 16px 24px; border-radius: 8px; 
                        font-weight: 600; text-align: center; font-size: 16px; border: 2px solid #059669;
                        box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1); transition: all 0.2s ease; flex: 1;"
                 onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';this.style.background='#f0fdf4';"
                 onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(5, 150, 105, 0.1)';this.style.background='white';">
                View All
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">Need help reviewing loan requests?</p>
            <p style="margin: 0;">
              <a href="${APP_URL}/help/lender-guide" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                Lender Guide
              </a>
              <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                Contact Support
              </a>
            </p>
          </div>
        </div>
        
        <!-- Signature -->
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">Feyza • Automated Loan Matching System</p>
          <p style="margin: 5px 0 0 0; font-size: 11px; color: #9ca3af;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      </body>
    </html>
  `,
};
}
