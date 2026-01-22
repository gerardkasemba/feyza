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
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Loan Request</title>
      </head>

      <body style="margin:0;padding:0;background:#f9fafb;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:20px;">
              
              <!-- MAIN CARD -->
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

                <!-- HEADER -->
                <tr>
                  <td style="background:linear-gradient(135deg,#059669 0%,#047857 100%);padding:30px;text-align:center;">
                    
                    <!-- LOGO -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="padding-bottom:15px;">
                          <img
                            src="https://feyza.app/feyza.png"
                            alt="Feyza Logo"
                            height="42"
                            style="display:block;height:42px;width:auto;border:0;outline:none;text-decoration:none;"
                          />
                        </td>
                      </tr>
                    </table>

                    <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;">
                      🤝 New Loan Request
                    </h1>
                  </td>
                </tr>

                <!-- CONTENT -->
                <tr>
                  <td style="padding:30px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;line-height:1.6;">
                    
                    <p style="font-size:18px;margin:0 0 20px 0;">
                      Hi ${toName || 'there'} 👋
                    </p>

                    <p style="margin:0 0 16px 0;">
                      <strong>${borrowerName}</strong> is requesting to borrow money from you:
                    </p>

                    <!-- AMOUNT -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="padding:20px 0;">
                          <div style="background:#ecfdf5;border:1px solid #bbf7d0;border-radius:12px;padding:20px;">
                            <span style="font-size:32px;font-weight:700;color:#059669;">
                              ${formattedAmount}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <p style="color:#6b7280;font-size:14px;margin:0 0 24px 0;text-align:center;">
                      Review the details and decide if you'd like to help them out.
                    </p>

                    <!-- CTA -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center">
                          <a
                            href="${loanUrl}"
                            style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:8px;font-weight:600;font-size:16px;"
                          >
                            Review Request →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:30px;">
                      You received this because ${borrowerName} selected you as their lender on Feyza.
                    </p>

                  </td>
                </tr>

              </table>

              <!-- FOOTER -->
              <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                Sent via <strong>Feyza</strong> • Simple loan tracking for everyone
              </p>

            </td>
          </tr>
        </table>
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
