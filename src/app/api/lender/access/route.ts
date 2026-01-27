import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getDashboardAccessEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();
    const normalizedEmail = email.toLowerCase();
    
    // Check if this email has any loans as a lender (invited or guest)
    const { data: loans } = await supabase
      .from('loans')
      .select('id, status, borrower_invite_email, borrower_name')
      .eq('invite_email', normalizedEmail)
      .in('status', ['pending', 'pending_signature', 'pending_funds', 'active']);

    // Also check guest_lenders table
    let guestLender;
    const { data: existingLender } = await supabase
      .from('guest_lenders')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (existingLender) {
      // Refresh the access token
      const newToken = uuidv4();
      const { data: updated } = await supabase
        .from('guest_lenders')
        .update({
          access_token: newToken,
          access_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLender.id)
        .select()
        .single();
      
      guestLender = updated;
    } else if (loans && loans.length > 0) {
      // Create new guest lender record
      const newToken = uuidv4();
      const { data: newLender } = await supabase
        .from('guest_lenders')
        .insert({
          email: normalizedEmail,
          access_token: newToken,
          access_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();
      
      guestLender = newLender;
    } else {
      // No loans found for this email
      return NextResponse.json({ 
        success: false, 
        error: 'No active loans found for this email address. If someone has sent you a loan request, check your email for the link.',
        noLoans: true
      }, { status: 404 });
    }

    // Send dashboard access link
    if (guestLender?.access_token) {
      const dashboardUrl = `${APP_URL}/lender/${guestLender.access_token}`;
      
      try {
        const dashEmail = getDashboardAccessEmail({
          recipientName: email.split('@')[0],
          accessUrl: dashboardUrl,
          role: 'lender',
        });
        await sendEmail({
          to: email,
          subject: dashEmail.subject,
          html: dashEmail.html,
        });
      } catch (emailError) {
        console.error('Error sending dashboard link:', emailError);
      }
    }

    return NextResponse.json({ 
      success: true,
      loansFound: loans?.length || 0,
    });
  } catch (error: any) {
    console.error('Error in lender access:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
