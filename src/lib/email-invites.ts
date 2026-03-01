import { emailWrapper, APP_URL } from './email-core';

export function getLoanCancelledEmail(params: {
  recipientName: string;
  cancelledBy: 'borrower' | 'lender';
  amount: number;
  currency: string;
  borrowerName: string;
}): { subject: string; html: string } {
  const { recipientName, cancelledBy, amount, currency, borrowerName } = params;
  
  return {
    subject: 'Loan Request Cancelled',
    html: emailWrapper({
      title: '❌ Loan Cancelled',
      content: `
        <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${recipientName},</p>
        <p style="color: #374151;">The loan request for <strong>${currency} ${amount.toLocaleString()}</strong> ${cancelledBy === 'borrower' ? `from ${borrowerName}` : `to ${borrowerName}`} has been cancelled.</p>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">
            No funds were transferred. No further action is required.
          </p>
        </div>
      `,
    }),
  };
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

