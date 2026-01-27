import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendEmail, getLoanInviteEmail, getBusinessLoanRequestEmail } from '@/lib/email';

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
