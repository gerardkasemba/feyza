import nodemailer from 'nodemailer';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Configure Nodemailer with SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_EMAIL = process.env.SMTP_FROM || '"Feyza" <hello@feyza.app>';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailParams): Promise<{ success: boolean; data?: any; error?: any }> {
  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('=== EMAIL NOT SENT (SMTP not configured) ===');
    console.warn('To:', to);
    console.warn('Subject:', subject);
    console.warn('Set SMTP_USER and SMTP_PASS in your .env.local');
    console.warn('=============================================');
    return { success: true, data: { id: 'dev-mode-no-email' } };
  }

  try {
    console.log('Sending email to:', to);
    console.log('From:', FROM_EMAIL);
    console.log('Subject:', subject);

    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: to,
      subject: subject,
      html: html,
    });

    console.log('Email sent successfully! Message ID:', info.messageId);
    return { success: true, data: { id: info.messageId } };
  } catch (error: any) {
    console.error('Email send error:', error?.message || error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

// Email templates
export function getLoanInviteEmail(params: {
  borrowerName: string;
  amount: number;
  currency: string;
  inviteToken: string;
  purpose?: string;
}) {
  const { borrowerName, amount, currency, inviteToken, purpose } = params;
  const inviteUrl = `${APP_URL}/invite/${inviteToken}`;

return {
  subject: `${borrowerName} is requesting a loan from you`,
html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Loan Request - Feyza</title>
  </head>

  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background:#f9fafb;">

    <!-- ===== HEADER ===== -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 30px 30px; border-radius: 16px 16px 0 0;" align="center">

          <!-- Logo (email-safe center) -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <img
                  src="https://feyza.app/feyza.png"
                  alt="Feyza Logo"
                  height="45"
                  style="display:block; height:45px; width:auto; border:0; outline:none; text-decoration:none;"
                />
              </td>
            </tr>
          </table>

          <h1 style="color:white; margin:0; font-size:28px; font-weight:600;">💰 New Loan Request</h1>
          <p style="color:rgba(255,255,255,0.9); margin:10px 0 0; font-size:16px;">
            You've received a loan request
          </p>
        </td>
      </tr>
    </table>

    <!-- ===== CONTENT ===== -->
    <div style="background:#f0fdf4; padding:30px; border-radius:0 0 16px 16px; border:1px solid #bbf7d0; border-top:none;">

      <p style="font-size:18px; color:#166534; margin-bottom:20px;">Hi there! 👋</p>

      <p style="color:#166534; margin-bottom:25px;">
        <strong style="color:#065f46;">${borrowerName}</strong> has sent you a loan request through Feyza:
      </p>

      <!-- ===== LOAN CARD ===== -->
      <div style="background:white; padding:25px; border-radius:12px; margin:25px 0; border:1px solid #bbf7d0; box-shadow:0 4px 12px rgba(5,150,105,.08);">

        <h3 style="color:#065f46; margin:0 0 20px; font-size:20px; text-align:center;">
          Loan Request Details
        </h3>

        <div style="background:linear-gradient(to right,#f0fdf4,#dcfce7); padding:20px; border-radius:8px; border:1px solid #86efac; text-align:center;">
          <div style="color:#065f46; font-size:14px; margin-bottom:8px; font-weight:500;">
            REQUESTED AMOUNT
          </div>
          <div style="font-weight:bold; font-size:32px; color:#059669;">
            ${currency} ${amount.toLocaleString()}
          </div>
        </div>

        ${purpose ? `
        <div style="border-top:1px solid #e5e7eb; padding-top:20px; margin-top:20px;">
          <p style="color:#065f46; font-weight:600; margin-bottom:10px;">📋 Loan Purpose</p>
          <div style="background:#f9fafb; padding:15px; border-radius:8px; border:1px solid #e5e7eb;">
            <p style="margin:0; color:#4b5563;">${purpose}</p>
          </div>
        </div>` : ''}

        ${borrowerName ? `
        <div style="border-top:1px solid #e5e7eb; padding-top:20px; margin-top:20px;">
          <p style="color:#065f46; font-weight:600;">👤 Borrower</p>
          <p style="margin:0; color:#4b5563;">${borrowerName}</p>
        </div>` : ''}

      </div>

      <!-- ===== ACTION ===== -->
      <div style="background:white; padding:25px; border-radius:12px; margin:25px 0; border:1px solid #bbf7d0; box-shadow:0 4px 12px rgba(5,150,105,.08);">

        <h3 style="color:#065f46; margin:0 0 15px; font-size:18px;">Next Steps</h3>

        <p style="color:#4b5563; margin-bottom:20px;">
          Review this loan request and decide whether to accept or decline it.
          <strong style="color:#059669;">No account required.</strong>
        </p>

        <div style="text-align:center;">
          <a href="${inviteUrl}"
             style="display:inline-block; background:linear-gradient(to right,#059669,#047857);
                    color:white; text-decoration:none; padding:18px 40px; border-radius:10px;
                    font-weight:600; font-size:18px; box-shadow:0 6px 16px rgba(5,150,105,.25);">
            🔍 View Full Request →
          </a>
        </div>

        <div style="background:#fef3c7; padding:15px; border-radius:8px; margin-top:25px; border:1px solid #fcd34d;">
          <p style="color:#92400e; margin:0; font-size:14px; text-align:center;">
            ⏰ <strong>This link expires in 7 days</strong>
          </p>
        </div>
      </div>

      <!-- ===== BENEFITS ===== -->
      <div style="background:#dcfce7; padding:20px; border-radius:8px; border:1px solid #86efac;">
        <h4 style="color:#065f46; margin:0 0 15px;">🌟 Why Use Feyza?</h4>
        <ul style="margin:0; padding-left:20px; color:#065f46; font-size:14px;">
          <li><strong>Secure:</strong> Encrypted communication</li>
          <li><strong>Simple:</strong> No account required</li>
          <li><strong>Transparent:</strong> Clear terms</li>
        </ul>
      </div>

      <!-- ===== FOOTER ===== -->
      <div style="margin-top:30px; padding-top:20px; border-top:1px solid #bbf7d0; font-size:14px; color:#047857;">
        <a href="mailto:support@feyza.com" style="color:#059669; text-decoration:none; font-weight:500;">Contact Support</a>
        &nbsp;•&nbsp;
        <a href="${APP_URL}/lender/faq" style="color:#059669; text-decoration:none; font-weight:500;">View FAQ</a>
      </div>

    </div>

    <!-- ===== SIGNATURE ===== -->
    <div style="text-align:center; margin-top:20px; font-size:12px; color:#6b7280;">
      Sent via <strong style="color:#059669;">Feyza</strong><br>
      This is an automated message. Do not reply.
    </div>

  </body>
</html>
`
};
}

export function getPaymentReminderEmail(params: {
  borrowerName: string;
  amount: number;
  currency: string;
  dueDate: string;
  loanId: string;
  loanLink?: string;
  isManual?: boolean;
  lenderName?: string;
}) {
  const { borrowerName, amount, currency, dueDate, loanId, loanLink, isManual, lenderName } = params;
  const loanUrl = loanLink ? `${APP_URL}${loanLink}` : `${APP_URL}/loans/${loanId}`;

  const subject = isManual && lenderName 
    ? `Payment Reminder from ${lenderName}`
    : `Friendly reminder: Payment due ${dueDate}`;

  return {
    subject,
html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>

  <body style="
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background: #ffffff;
  ">

    <!-- ===== HEADER ===== -->
    <div style="
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      padding: 30px;
      border-radius: 16px 16px 0 0;
      text-align: center;
    ">

      <!-- Logo (email-safe centered) -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding-bottom: 20px;">
            <img
              src="https://feyza.app/feyza.png"
              alt="Feyza Logo"
              height="40"
              style="
                display:block;
                height:40px;
                width:auto;
                border:0;
                outline:none;
                text-decoration:none;
              "
            />
          </td>
        </tr>
      </table>

      <h1 style="
        color: #ffffff;
        margin: 0;
        font-size: 24px;
        font-weight: 600;
      ">
        ${isManual ? `💬 Reminder from ${lenderName}` : '📅 Payment Reminder'}
      </h1>

      <p style="
        color: rgba(255, 255, 255, 0.9);
        margin: 10px 0 0 0;
        font-size: 16px;
      ">
        ${isManual && lenderName
          ? 'Personal reminder from your lender'
          : 'Friendly payment reminder'}
      </p>
    </div>

    <!-- ===== CONTENT ===== -->
    <div style="
      background: #f0fdf4;
      padding: 30px;
      border-radius: 0 0 16px 16px;
      border: 1px solid #bbf7d0;
      border-top: none;
    ">

      <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">
        Hi ${borrowerName}! 👋
      </p>

      <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
        ${isManual && lenderName
          ? `<strong style="color:#059669;">${lenderName}</strong> has sent you a friendly reminder about your upcoming payment:`
          : 'Just a friendly reminder about your upcoming payment:'}
      </p>

      <!-- ===== PAYMENT CARD ===== -->
      <div style="
        background: #ffffff;
        padding: 24px;
        border-radius: 12px;
        margin: 20px 0;
        border: 1px solid #bbf7d0;
        box-shadow: 0 2px 8px rgba(5,150,105,0.1);
      ">
        <h3 style="
          margin: 0 0 15px 0;
          color: #065f46;
          font-size: 20px;
          font-weight: 600;
        ">
          Payment Details
        </h3>

        <p style="margin-bottom: 12px;">
          <strong style="color:#047857;">Amount Due:</strong>
          <span style="font-size: 22px; font-weight: bold; color:#065f46;">
            ${currency} ${amount.toLocaleString()}
          </span>
        </p>

        <p style="margin-bottom: 12px;">
          <strong style="color:#047857;">Due Date:</strong>
          <span style="font-weight: bold; color:#065f46;">
            ${dueDate}
          </span>
        </p>

        ${isManual && lenderName ? `
          <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <strong style="color:#047857;">From:</strong>
            <span style="font-weight: bold; color:#065f46;">
              ${lenderName}
            </span>
          </p>
        ` : ''}
      </div>

      <!-- ===== REMINDER NOTE ===== -->
      <div style="
        background: #dcfce7;
        padding: 20px;
        border-radius: 12px;
        margin: 20px 0;
        border: 1px solid #86efac;
      ">
        <h4 style="color:#065f46; margin:0 0 10px 0; font-size:16px;">
          💡 Important Reminder
        </h4>
        <p style="color:#065f46; font-size:14px; margin:0;">
          Once you've made the payment, please mark it as paid in the app so your lender can confirm it.
        </p>
      </div>

      <!-- ===== CTA ===== -->
      <a href="${loanUrl}" style="
        display:block;
        background: linear-gradient(to right, #059669, #047857);
        color:#ffffff;
        text-decoration:none;
        padding:16px 32px;
        border-radius:8px;
        font-weight:600;
        text-align:center;
        margin:24px 0;
        font-size:16px;
        box-shadow: 0 4px 12px rgba(5,150,105,0.25);
      ">
        View Loan Details & Payment Instructions →
      </a>

      <!-- ===== HELP ===== -->
      <div style="
        margin-top: 25px;
        padding-top: 20px;
        border-top: 1px solid #bbf7d0;
      ">
        <h4 style="color:#065f46; margin-bottom:15px; font-size:16px;">
          Need Assistance?
        </h4>

        <a href="${APP_URL}/help/making-payments"
           style="display:inline-block;margin-right:10px;color:#059669;text-decoration:none;font-weight:500;">
          Payment Help Guide
        </a>

        <a href="${APP_URL}/contact"
           style="display:inline-block;color:#059669;text-decoration:none;font-weight:500;">
          Contact Support
        </a>
      </div>
    </div>

    <!-- ===== FOOTER ===== -->
    <div style="
      text-align:center;
      margin-top:20px;
      color:#047857;
      font-size:12px;
    ">
      <p style="margin:0 0 5px 0;">
        Sent via Feyza • Simple loan tracking for everyone
      </p>
      <p style="margin:0;">
        <a href="${APP_URL}/privacy" style="color:#059669;text-decoration:none;">Privacy</a> •
        <a href="${APP_URL}/terms" style="color:#059669;text-decoration:none;">Terms</a> •
        <a href="${APP_URL}/unsubscribe" style="color:#059669;text-decoration:none;">Unsubscribe</a>
      </p>
    </div>

  </body>
</html>
`,
  };
}

export function getPaymentConfirmationEmail(params: {
  recipientName: string;
  amount: number;
  currency: string;
  loanId: string;
  role: 'borrower' | 'lender';
}) {
  const { recipientName, amount, currency, loanId, role } = params;
  const loanUrl = `${APP_URL}/loans/${loanId}`;
  
  const message = role === 'borrower' 
    ? 'Your payment has been confirmed by your lender!'
    : 'A payment has been marked as paid and needs your confirmation.';

  return {
    subject: role === 'borrower' ? 'Payment confirmed!' : 'Payment needs confirmation',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Header with logo -->
          <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <!-- Logo -->
            <div style="margin-bottom: 15px;">
              <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                  alt="Feyza Logo" 
                  style="height: 40px; width: auto; filter: brightness(0) invert(1);">
            </div>
            
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
              ${role === 'borrower' ? '✅ Payment Confirmed!' : '⏳ Payment Requires Confirmation'}
            </h1>
            
            <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px;">
              ${role === 'borrower' ? 'Your payment has been successfully processed' : 'Action required to complete payment'}
            </p>
          </div>
          
          <!-- Main content -->
          <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
            <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${recipientName}! 👋</p>
            
            <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">${message}</p>
            
            <!-- Payment amount card -->
            <div style="background: white; padding: 24px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0; text-align: center; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
              <p style="color: #065f46; margin: 0 0 10px 0; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Payment Amount</p>
              <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px;">
                <span style="font-weight: bold; font-size: 36px; color: #059669; font-family: monospace;">
                  ${currency} ${amount.toLocaleString()}
                </span>
              </div>
              <div style="display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 8px;">
                <span style="width: 12px; height: 12px; background: ${role === 'borrower' ? '#059669' : '#f59e0b'}; border-radius: 50%; display: inline-block;"></span>
                <span style="color: #047857; font-size: 14px; font-weight: 500;">
                  ${role === 'borrower' ? '✓ Confirmed' : '⏳ Pending Confirmation'}
                </span>
              </div>
            </div>
            
            <!-- Next steps -->
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
              <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                ${role === 'borrower' ? '🎉 Payment Complete!' : '📝 Next Steps:'}
              </h3>
              <p style="color: #166534; line-height: 1.6; margin: 0;">
                ${role === 'borrower' 
                  ? 'Your payment has been successfully recorded. Thank you for your timely payment!' 
                  : 'Please review and confirm this payment to update the loan status.'}
              </p>
            </div>
            
            <!-- CTA Button -->
            <a href="${loanUrl}" 
              style="display: block; background: linear-gradient(to right, #059669, #047857); 
                      color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                      font-weight: 600; text-align: center; margin: 30px 0; font-size: 16px;
                      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
              onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
              onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
              ${role === 'lender' ? 'Review & Confirm Payment →' : 'View Loan Details →'}
            </a>
            
            <!-- Additional info -->
            <div style="background: #dcfce7; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
              <p style="color: #065f46; margin: 0; font-size: 14px; display: flex; align-items: flex-start; gap: 10px;">
                <span style="font-size: 16px;">📋</span>
                <span>
                  <strong>Note:</strong> ${role === 'borrower' 
                    ? 'This payment has been added to your transaction history.' 
                    : 'Unconfirmed payments may affect loan tracking and reporting.'}
                </span>
              </p>
            </div>
            
            <!-- Footer links -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0;">
              <p style="color: #047857; margin: 0 0 10px 0; font-size: 14px;">Need help with payments?</p>
              <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                <a href="${APP_URL}/help/payments" style="color: #059669; text-decoration: none; font-weight: 500; font-size: 14px;">
                  Payment Help Center
                </a>
                <a href="${APP_URL}/transactions" style="color: #059669; text-decoration: none; font-weight: 500; font-size: 14px;">
                  View All Transactions
                </a>
                <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500; font-size: 14px;">
                  Contact Support
                </a>
              </div>
            </div>
          </div>
          
          <!-- Signature -->
          <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">Feyza • Secure Payment Processing</p>
            <p style="margin: 5px 0 0 0; font-size: 11px;">This is an automated notification. Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `,
  };
}

export function getLoanAcceptedEmail(params: {
  borrowerName: string;
  lenderName: string;
  amount: number;
  currency: string;
  loanId: string;
}) {
  const { borrowerName, lenderName, amount, currency, loanId } = params;
  const loanUrl = `${APP_URL}/loans/${loanId}`;

return {
  subject: `Great news! ${lenderName} accepted your loan request`,
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header with logo and gradient -->
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
          <!-- Logo -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding-bottom: 15px;">
                <img
                  src="https://feyza.app/feyza.png"
                  alt="Feyza Logo"
                  height="40"
                  style="display:block; height:40px; width:auto; border:0; outline:none; text-decoration:none;"
                />
              </td>
            </tr>
          </table>
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎉 Loan Accepted!</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Your funding is confirmed</p>
        </div>
        
        <!-- Content area -->
        <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
          <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${borrowerName}! 👋</p>
          
          <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
            Great news! <strong style="color: #059669;">${lenderName}</strong> has accepted your loan request.
          </p>
          
          <!-- Loan details card -->
          <div style="background: white; padding: 24px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1); text-align: center;">
            <p style="color: #047857; margin: 0 0 10px 0; font-weight: 500; font-size: 14px;">Loan Amount</p>
            <div style="font-weight: bold; font-size: 36px; color: #059669; margin-bottom: 5px;">
              ${currency} ${amount.toLocaleString()}
            </div>
            <div style="display: flex; justify-content: center; gap: 30px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <div>
                <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 12px; font-weight: 500;">Lender</p>
                <p style="color: #065f46; margin: 0; font-weight: 600;">${lenderName}</p>
              </div>
              <div>
                <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 12px; font-weight: 500;">Status</p>
                <p style="color: #059669; margin: 0; font-weight: 600;">✅ Active</p>
              </div>
            </div>
          </div>
          
          <!-- Next steps -->
          <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
            <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px; font-weight: 600;">📋 What's Next?</h3>
            <ul style="margin: 0; padding-left: 20px; color: #065f46;">
              <li style="margin-bottom: 8px; line-height: 1.5;">Your loan is now active and funds will be processed</li>
              <li style="margin-bottom: 8px; line-height: 1.5;">View your repayment schedule in the app</li>
              <li style="margin-bottom: 8px; line-height: 1.5;">Track your payment progress</li>
              <li style="line-height: 1.5;">Contact your lender if you have questions</li>
            </ul>
          </div>
          
          <!-- Important note -->
          <div style="background: #dcfce7; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
            <p style="color: #065f46; margin: 0; font-size: 14px; line-height: 1.5;">
              <strong>💡 Important:</strong> Make sure to review the loan agreement and repayment terms in your dashboard.
            </p>
          </div>
          
          <!-- CTA Button -->
          <a href="${loanUrl}" 
             style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                    color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                    font-weight: 600; text-align: center; margin: 24px 0; font-size: 16px;
                    box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
             onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
             onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
            View Your Loan Details →
          </a>
          
          <!-- Additional actions -->
          <div style="display: flex; gap: 15px; margin-top: 20px; flex-wrap: wrap;">
            <a href="${APP_URL}/dashboard" 
               style="display: inline-block; background: white; 
                      color: #059669; text-decoration: none; padding: 12px 24px; border-radius: 8px; 
                      font-weight: 500; text-align: center; font-size: 14px; border: 1.5px solid #059669;
                      box-shadow: 0 2px 6px rgba(5, 150, 105, 0.1); transition: all 0.2s ease; flex: 1;"
               onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 3px 8px rgba(5, 150, 105, 0.2)';this.style.background='#f0fdf4';"
               onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 6px rgba(5, 150, 105, 0.1)';this.style.background='white';">
              Go to Dashboard
            </a>
            <a href="${APP_URL}/help/loans" 
               style="display: inline-block; background: white; 
                      color: #047857; text-decoration: none; padding: 12px 24px; border-radius: 8px; 
                      font-weight: 500; text-align: center; font-size: 14px; border: 1.5px solid #bbf7d0;
                      box-shadow: 0 2px 6px rgba(5, 150, 105, 0.1); transition: all 0.2s ease; flex: 1;"
               onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 3px 8px rgba(5, 150, 105, 0.2)';this.style.background='#f0fdf4';"
               onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 6px rgba(5, 150, 105, 0.1)';this.style.background='white';">
              Need Help?
            </a>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">Questions about your loan?</p>
            <p style="margin: 0;">
              <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                Contact Feyza Support
              </a>
            </p>
          </div>
        </div>
        
        <!-- Signature -->
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">Feyza • Simple loan tracking for everyone</p>
          <p style="margin: 5px 0 0 0; font-size: 11px;">This is an automated notification</p>
        </div>
      </body>
    </html>
  `,
};
}

export function getOverduePaymentEmail(params: {
  borrowerName: string;
  lenderName: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysOverdue: number;
  loanId: string;
  loanLink?: string;
}) {
  const { borrowerName, lenderName, amount, currency, dueDate, daysOverdue, loanId, loanLink } = params;
  const loanUrl = loanLink ? `${APP_URL}${loanLink}` : `${APP_URL}/loans/${loanId}`;

return {
  subject: `OVERDUE: Your payment is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} late`,
  html: `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>

    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#ffffff;">

      <!-- HEADER -->
      <div style="background:linear-gradient(135deg,#059669 0%,#047857 100%);padding:30px;border-radius:16px 16px 0 0;text-align:center;">

        <!-- Logo (email-safe centered) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding-bottom:15px;">
              <img
                src="https://feyza.app/feyza.png"
                alt="Feyza Logo"
                height="36"
                style="display:block;height:36px;width:auto;border:0;outline:none;text-decoration:none;"
              />
            </td>
          </tr>
        </table>

        <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:600;">
          ⚠️ Overdue Payment Notice
        </h1>
      </div>

      <!-- CONTENT -->
      <div style="background:#f0fdf4;padding:30px;border-radius:0 0 16px 16px;border:1px solid #bbf7d0;border-top:none;">

        <p style="font-size:18px;margin-bottom:20px;color:#065f46;">
          Hi ${borrowerName},
        </p>

        <!-- ALERT CARD -->
        <div style="background:#ffffff;padding:24px;border-radius:12px;margin:20px 0;border:1px solid #bbf7d0;box-shadow:0 2px 8px rgba(5,150,105,0.15);">

          <h2 style="color:#047857;margin:0 0 15px 0;font-size:20px;font-weight:600;">
            Payment Overdue
          </h2>

          <p style="color:#047857;font-weight:600;font-size:16px;line-height:1.5;margin-bottom:15px;">
            Your payment to <strong>${lenderName}</strong> is
            <strong>${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue</strong>.
          </p>

          <!-- PAYMENT DETAILS -->
          <div style="background:#ecfdf5;padding:20px;border-radius:8px;margin:20px 0;border:1px solid #bbf7d0;">

            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="color:#6b7280;">Amount Due:</td>
                <td align="right" style="font-weight:bold;font-size:20px;color:#047857;">
                  ${currency} ${amount.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td style="color:#6b7280;padding-top:8px;">Original Due Date:</td>
                <td align="right" style="font-weight:bold;color:#065f46;padding-top:8px;">
                  ${dueDate}
                </td>
              </tr>
              <tr>
                <td style="color:#6b7280;padding-top:8px;">Days Overdue:</td>
                <td align="right" style="font-weight:bold;color:#065f46;padding-top:8px;">
                  ${daysOverdue}
                </td>
              </tr>
            </table>

          </div>

          <!-- WARNING -->
          <div style="background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0;color:#065f46;font-size:14px;font-weight:600;margin-bottom:6px;">
              Immediate Attention Required
            </p>
            <p style="margin:0;color:#065f46;font-size:14px;line-height:1.5;">
              Late payments may affect your borrower rating and limit future borrowing.
              Please take action as soon as possible.
            </p>
          </div>

        </div>

        <!-- ACTION BUTTONS -->
        <div style="margin:30px 0;">

          <a href="${loanUrl}"
            style="display:block;background:linear-gradient(to right,#059669,#047857);
                    color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:8px;
                    font-weight:600;text-align:center;font-size:16px;margin-bottom:15px;
                    box-shadow:0 4px 12px rgba(5,150,105,0.3);">
            Make Payment Now →
          </a>

          <a href="${APP_URL}/help/payment-issues"
            style="display:block;background:#ffffff;
                    color:#059669;text-decoration:none;padding:14px 32px;border-radius:8px;
                    font-weight:600;text-align:center;font-size:16px;
                    border:2px solid #059669;
                    box-shadow:0 2px 8px rgba(5,150,105,0.15);">
            Need Payment Assistance?
          </a>

        </div>

        <!-- INFO -->
        <div style="background:#f8fafc;padding:20px;border-radius:8px;margin:25px 0;border:1px solid #e2e8f0;">
          <h4 style="color:#065f46;margin:0 0 10px 0;font-weight:600;">
            Important Information
          </h4>
          <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;">
            <li style="margin-bottom:8px;">If you already paid, please mark it as paid in your account</li>
            <li style="margin-bottom:8px;">Contact your lender if you need alternative arrangements</li>
            <li>Late fees may apply per your agreement</li>
          </ul>
        </div>

        <!-- FOOTER -->
        <div style="margin-top:30px;padding-top:20px;border-top:1px solid #bbf7d0;color:#065f46;font-size:14px;text-align:center;">
          <p style="margin:0 0 10px 0;">Questions about your loan?</p>
          <p style="margin:0;">
            <a href="mailto:support@feyza.com" style="color:#059669;text-decoration:none;font-weight:500;margin-right:15px;">
              Contact Feyza Support
            </a>
            <a href="${APP_URL}/help" style="color:#059669;text-decoration:none;font-weight:500;">
              Help Center
            </a>
          </p>
        </div>

      </div>

      <!-- BRAND SIGNATURE -->
      <div style="text-align:center;margin-top:20px;padding:15px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;">
        <p style="margin:0;color:#047857;font-size:12px;">
          <strong>Feyza</strong> • Building Financial Relationships •
          <span style="color:#059669;">support@feyza.com</span>
        </p>
      </div>

    </body>
  </html>
  `,
};
}

export function getMissedPaymentLenderNotification(params: {
  lenderName: string;
  borrowerName: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysOverdue: number;
  loanId: string;
}) {
  const { lenderName, borrowerName, amount, currency, dueDate, daysOverdue, loanId } = params;
  const loanUrl = `${APP_URL}/loans/${loanId}`;

return {
  subject: `Payment missed: ${borrowerName}'s payment is ${daysOverdue} days overdue`,
  html: `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>

    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;">

      <!-- ===== HEADER ===== -->
      <div style="background:linear-gradient(135deg,#059669 0%,#047857 100%);padding:30px;border-radius:16px 16px 0 0;text-align:center;">

        <!-- Logo (email-safe centered) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding-bottom:15px;">
              <img
                src="https://feyza.app/feyza.png"
                alt="Feyza Logo"
                height="40"
                style="display:block;height:40px;width:auto;border:0;outline:none;text-decoration:none;"
              />
            </td>
          </tr>
        </table>

        <h1 style="color:white;margin:0;font-size:24px;font-weight:600;">
          ⚠️ Missed Payment Notice
        </h1>
      </div>

      <!-- ===== CONTENT ===== -->
      <div style="background:#f0fdf4;padding:30px;border-radius:0 0 16px 16px;border:1px solid #bbf7d0;border-top:none;">

        <p style="font-size:18px;margin-bottom:20px;color:#166534;">
          Hi ${lenderName},
        </p>

        <!-- Alert Card -->
        <div style="background:white;padding:24px;border-radius:12px;margin:20px 0;border:1px solid #dc2626;box-shadow:0 2px 8px rgba(220,38,38,0.1);">

          <h3 style="margin:0 0 15px 0;color:#dc2626;font-size:20px;font-weight:600;">
            ⚠️ Overdue Payment Alert
          </h3>

          <p style="color:#166534;margin-bottom:20px;">
            We're writing to inform you that
            <strong style="color:#065f46;">${borrowerName}</strong>
            has a payment that is now
            <strong style="color:#dc2626;">
              ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue
            </strong>.
          </p>

          <!-- Payment Details -->
          <div style="background:#fef2f2;padding:20px;border-radius:8px;border:1px solid #fecaca;margin:20px 0;">

            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td>
                  <div style="color:#6b7280;font-size:14px;">Amount Due</div>
                  <div style="font-weight:bold;font-size:24px;color:#dc2626;">
                    ${currency} ${amount.toLocaleString()}
                  </div>
                </td>
                <td align="right">
                  <span style="background:#dc2626;color:white;padding:6px 12px;border-radius:20px;font-size:14px;font-weight:600;">
                    ${daysOverdue} DAY${daysOverdue > 1 ? 'S' : ''} LATE
                  </span>
                </td>
              </tr>
            </table>

            <div style="border-top:1px solid #fecaca;padding-top:15px;margin-top:15px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="color:#6b7280;">Due Date</td>
                  <td align="right" style="font-weight:600;color:#065f46;">${dueDate}</td>
                </tr>
                <tr>
                  <td style="color:#6b7280;">Days Overdue</td>
                  <td align="right" style="font-weight:600;color:#dc2626;">
                    ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}
                  </td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Notification Info -->
          <div style="background:#fffbeb;padding:16px;border-radius:8px;border:1px solid #fde68a;margin:20px 0;">
            <p style="margin:0;color:#92400e;font-size:14px;">
              <strong>📢 Notification Sent:</strong>
              We've automatically sent the borrower a payment reminder.
              You can also contact them directly through the app.
            </p>
          </div>
        </div>

        <!-- Next Steps -->
        <div style="background:white;padding:20px;border-radius:12px;margin:20px 0;border:1px solid #bbf7d0;">
          <h3 style="margin:0 0 15px 0;color:#065f46;font-size:18px;font-weight:600;">
            Next Steps
          </h3>
          <ul style="margin:0;padding-left:20px;color:#166534;">
            <li style="margin-bottom:10px;">Review the loan details and payment history</li>
            <li style="margin-bottom:10px;">Contact the borrower through the secure messaging system</li>
            <li style="margin-bottom:10px;">Consider your options based on the loan agreement terms</li>
          </ul>
        </div>

        <!-- CTA -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center">
              <a
                href="${loanUrl}"
                style="display:block;background:linear-gradient(to right,#059669,#047857);
                      color:white;text-decoration:none;padding:16px 32px;border-radius:8px;
                      font-weight:600;text-align:center;font-size:16px;
                      box-shadow:0 4px 12px rgba(5,150,105,0.2);">
                View Loan Details & Contact Borrower →
              </a>
            </td>
          </tr>
        </table>

        <!-- Support -->
        <div style="margin-top:30px;padding-top:20px;border-top:1px solid #bbf7d0;color:#047857;font-size:14px;">
          <p style="margin:0 0 10px 0;font-weight:600;">
            Need assistance with overdue payments?
          </p>
          <p style="margin:0;">
            <a href="${APP_URL}/help/overdue-payments" style="color:#059669;text-decoration:none;font-weight:500;margin-right:15px;">
              📚 Overdue Payment Guide
            </a>
            <a href="mailto:support@feyza.com" style="color:#059669;text-decoration:none;font-weight:500;">
              📧 Contact Support
            </a>
          </p>
        </div>

      </div>

      <!-- ===== FOOTER ===== -->
      <div style="text-align:center;margin-top:20px;color:#6b7280;font-size:12px;">
        <p style="margin:0;">Feyza • Payment Tracking System</p>
        <p style="margin:5px 0 0 0;font-size:11px;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>

    </body>
  </html>
  `,
};
}

export function getCashPickupReminderEmail(params: {
  borrowerName: string;
  recipientName: string;
  amount: number;
  currency: string;
  pickupLocation: string;
  pickupCode: string;
  daysWaiting: number;
}) {
  const { borrowerName, recipientName, amount, currency, pickupLocation, pickupCode, daysWaiting } = params;

return {
  subject: `Reminder: Cash waiting for ${recipientName} (${daysWaiting} days)`,
html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>

  <body style="
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background: #ffffff;
  ">

    <!-- ===== HEADER ===== -->
    <div style="
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      padding: 30px 20px;
      border-radius: 16px 16px 0 0;
    ">

      <!-- Centered Logo (email-safe) -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding-bottom: 15px;">
            <img
              src="https://feyza.app/feyza.png"
              alt="Feyza Logo"
              height="40"
              style="display:block; height:40px; width:auto; border:0; outline:none; text-decoration:none;"
            />
          </td>
        </tr>
      </table>

      <h1 style="
        color: #ffffff;
        margin: 0;
        font-size: 24px;
        font-weight: 600;
        text-align: center;
      ">
        ⏰ Cash Pickup Reminder
      </h1>
    </div>

    <!-- ===== CONTENT ===== -->
    <div style="
      background: #f0fdf4;
      padding: 30px 20px;
      border-radius: 0 0 16px 16px;
      border: 1px solid #bbf7d0;
      border-top: none;
    ">

      <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">
        Hi ${borrowerName},
      </p>

      <p style="color: #166534; margin-bottom: 20px;">
        This is a friendly reminder that
        <strong style="color:#059669;">${currency} ${amount.toLocaleString()}</strong>
        has been waiting for
        <strong style="color:#059669;">${recipientName}</strong>
        to pick up for
        <strong style="color:#059669;">${daysWaiting} days</strong>.
      </p>

      <!-- ===== AMOUNT CARD ===== -->
      <div style="
        background: #ffffff;
        padding: 24px;
        border-radius: 12px;
        margin: 25px 0;
        border: 1px solid #bbf7d0;
        box-shadow: 0 4px 12px rgba(5,150,105,0.1);
      ">

        <p style="color:#047857; text-align:center; font-size:14px; margin:0;">
          AMOUNT WAITING
        </p>

        <p style="
          font-size: 36px;
          font-weight: bold;
          color: #059669;
          text-align: center;
          margin: 10px 0 5px 0;
        ">
          ${currency} ${amount.toLocaleString()}
        </p>

        <p style="color:#065f46; text-align:center; font-size:14px; margin:0;">
          Has been waiting for ${daysWaiting} days
        </p>

        <hr style="border:none;border-top:1px solid #ecfdf5;margin:20px 0;">

        <p style="color:#047857; font-size:14px; margin-bottom:5px;">
          📍 PICKUP LOCATION
        </p>
        <p style="color:#166534; font-size:16px; margin-bottom:15px;">
          ${pickupLocation}
        </p>

        <p style="color:#047857; font-size:14px; margin-bottom:5px;">
          👤 RECIPIENT
        </p>
        <p style="color:#166534; font-size:16px;">
          ${recipientName}
        </p>

        <!-- Pickup Code -->
        <p style="color:#047857; font-size:14px; margin:20px 0 10px 0;">
          🔑 PICKUP CODE
        </p>

        <div style="
          background: #ecfdf5;
          padding: 20px;
          border-radius: 10px;
          text-align: center;
          border: 2px dashed #059669;
        ">
          <span style="
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 4px;
            color: #065f46;
            font-family: 'Courier New', monospace;
          ">
            ${pickupCode}
          </span>
          <p style="color:#047857; font-size:12px; margin-top:8px;">
            Share this code with the recipient
          </p>
        </div>
      </div>

      <!-- ===== IMPORTANT NOTE ===== -->
      <div style="
        background: #dcfce7;
        border: 1px solid #86efac;
        border-left: 4px solid #059669;
        border-radius: 8px;
        padding: 20px;
        margin: 25px 0;
      ">
        <p style="color:#065f46; font-weight:600; margin-bottom:8px;">
          💡 Important Information
        </p>
        <p style="color:#166534; font-size:14px; margin-bottom:10px;">
          The cash will be held until ${recipientName} picks it up. Please remind them to bring:
        </p>
        <ul style="padding-left:20px; color:#166534; font-size:14px;">
          <li>Valid government-issued photo ID</li>
          <li>This pickup code: <strong style="color:#059669;">${pickupCode}</strong></li>
        </ul>
      </div>

      <!-- ===== ACTION BUTTONS ===== -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0;">
        <tr>
          <td align="center">
            <a href="${APP_URL}/loans"
              style="
                display:inline-block;
                background:#059669;
                color:#ffffff;
                text-decoration:none;
                padding:14px 28px;
                border-radius:8px;
                font-weight:600;
                font-size:16px;
              ">
              View Loan Details →
            </a>
          </td>
        </tr>
      </table>

      <!-- ===== SUPPORT ===== -->
      <div style="border-top:1px solid #bbf7d0; padding-top:20px;">
        <p style="color:#047857; font-weight:500;">
          Need assistance?
        </p>
        <p style="font-size:14px; color:#166534;">
          📞 <a href="mailto:support@feyza.com" style="color:#059669; text-decoration:none;">support@feyza.com</a>
        </p>
        <p style="font-size:14px; color:#166534;">
          📋 <a href="${APP_URL}/support/pickup-issues" style="color:#059669; text-decoration:none;">Report a pickup issue</a>
        </p>
      </div>
    </div>

    <!-- ===== FOOTER ===== -->
    <div style="text-align:center; margin-top:30px; font-size:12px; color:#047857;">
      <p style="margin:0;">Feyza • Simple loan tracking for everyone</p>
      <p style="margin-top:5px;">This is an automated reminder. Please do not reply.</p>
    </div>

  </body>
</html>
`,

};
}
