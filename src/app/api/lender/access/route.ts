import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Check if this email has any loans as a lender (invited or guest)
    const { data: loans } = await supabase
      .from('loans')
      .select('id')
      .eq('invite_email', email.toLowerCase())
      .limit(1);

    // Check if guest lender already exists
    let guestLender;
    const { data: existingLender } = await supabase
      .from('guest_lenders')
      .select('*')
      .eq('email', email.toLowerCase())
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
      const { data: newLender } = await supabase
        .from('guest_lenders')
        .insert({
          email: email.toLowerCase(),
          access_token: uuidv4(),
          access_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();
      
      guestLender = newLender;
    } else {
      // No loans found for this email - still send email but with helpful message
      try {
        await sendEmail({
          to: email,
          subject: 'LoanTrack - Dashboard Access Request',
          html: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0;">🏦 LoanTrack</h1>
                </div>
                <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb;">
                  <p>Hi there,</p>
                  <p>You requested access to your lending dashboard, but we don't have any loan requests associated with this email address yet.</p>
                  <p>If someone wants to borrow from you, they'll send you an invite email with a link to review and accept the loan.</p>
                  <p style="color: #6b7280; font-size: 14px;">If you think this is an error, the person requesting to borrow may have used a different email address.</p>
                </div>
              </body>
            </html>
          `,
        });
      } catch (emailError) {
        console.error('Error sending no-loans email:', emailError);
      }

      // Still return success to prevent email enumeration
      return NextResponse.json({ success: true });
    }

    // Send dashboard access link
    if (guestLender) {
      const dashboardUrl = `${APP_URL}/lender/${guestLender.access_token}`;
      
      try {
        await sendEmail({
          to: email,
          subject: 'Your LoanTrack Lending Dashboard',
          html: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0;">📊 Your Lending Dashboard</h1>
                </div>
                <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb;">
                  <p>Hi there,</p>
                  <p>Here's your secure link to access your lending dashboard where you can view and manage all your loans:</p>
                  <a href="${dashboardUrl}" style="display: block; background: #22c55e; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
                    Access Dashboard →
                  </a>
                  <p style="color: #6b7280; font-size: 14px;">This link expires in 30 days. Keep it safe - anyone with this link can access your lending information.</p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                  <p style="color: #6b7280; font-size: 12px;">
                    If you didn't request this, you can safely ignore this email.
                  </p>
                </div>
              </body>
            </html>
          `,
        });
      } catch (emailError) {
        console.error('Error sending dashboard link:', emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in lender access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
