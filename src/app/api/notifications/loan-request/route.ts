import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      toEmail, 
      toName, 
      borrowerName, 
      amount, 
      currency = 'USD',
      loanId,
      isExistingUser,
    } = body;

    if (!toEmail || !borrowerName || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);

    const subject = `${borrowerName} sent you a loan request`;
    const loanUrl = `${APP_URL}/loans/${loanId}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🤝 New Loan Request</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi ${toName || 'there'}! 👋</p>
            
            <p><strong>${borrowerName}</strong> is requesting to borrow money from you:</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb; text-align: center;">
              <span style="font-weight: bold; font-size: 32px; color: #6366f1;">${formattedAmount}</span>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">Review the details and decide if you'd like to help them out.</p>
            
            <a href="${loanUrl}" style="display: block; background: #6366f1; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
              Review Request →
            </a>
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 30px;">
              You received this because ${borrowerName} selected you as their lender on Feyza.
            </p>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            Sent via Feyza • Simple loan tracking for everyone
          </p>
        </body>
      </html>
    `;

    console.log('Sending loan request notification to:', toEmail);
    
    const result = await sendEmail({
      to: toEmail,
      subject: subject,
      html: emailHtml,
    });

    if (!result.success) {
      console.error('Failed to send loan request email:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log('Loan request email sent successfully to:', toEmail);
    return NextResponse.json({ success: true, messageId: result.data?.id });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
