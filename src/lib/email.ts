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

const FROM_EMAIL = process.env.SMTP_FROM || '"LoanTrack" <noreply@loantrack.app>';

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
          <title>Loan Request</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">💰 Loan Request</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi there! 👋</p>
            
            <p><strong>${borrowerName}</strong> is requesting a loan from you:</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <div style="margin-bottom: 10px;">
                <span style="color: #6b7280;">Amount:</span>
                <span style="font-weight: bold; font-size: 24px; color: #22c55e; margin-left: 10px;">${currency} ${amount.toLocaleString()}</span>
              </div>
              ${purpose ? `
              <div style="border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 10px;">
                <span style="color: #6b7280;">Purpose:</span>
                <p style="margin: 5px 0 0 0;">${purpose}</p>
              </div>
              ` : ''}
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">You can view the full details and accept or decline this request by clicking the button below. <strong>No account required.</strong></p>
            
            <a href="${inviteUrl}" style="display: block; background: #22c55e; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
              View Loan Request →
            </a>
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 30px;">
              This link will expire in 7 days. If you have questions, reply to this email.
            </p>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            Sent via LoanTrack • Simple loan tracking for everyone
          </p>
        </body>
      </html>
    `,
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
    ? `💬 Payment Reminder from ${lenderName}`
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
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${isManual ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#fef9c3'}; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: ${isManual ? 'white' : '#854d0e'}; margin: 0; font-size: 24px;">
              ${isManual ? `💬 Reminder from ${lenderName}` : '📅 Payment Reminder'}
            </h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi ${borrowerName}! 👋</p>
            
            ${isManual && lenderName 
              ? `<p><strong>${lenderName}</strong> has sent you a friendly reminder about your upcoming payment:</p>`
              : `<p>Just a friendly reminder about your upcoming payment:</p>`
            }
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <div style="margin-bottom: 10px;">
                <span style="color: #6b7280;">Amount:</span>
                <span style="font-weight: bold; font-size: 20px; margin-left: 10px;">${currency} ${amount.toLocaleString()}</span>
              </div>
              <div>
                <span style="color: #6b7280;">Due:</span>
                <span style="font-weight: bold; margin-left: 10px;">${dueDate}</span>
              </div>
            </div>
            
            <a href="${loanUrl}" style="display: block; background: ${isManual ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#22c55e'}; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
              View Loan Details →
            </a>
            
            <p style="color: #6b7280; font-size: 14px;">Once you've made the payment, don't forget to mark it as paid in the app so your lender can confirm it.</p>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            Sent via LoanTrack • Simple loan tracking for everyone
          </p>
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
    ? 'Your payment has been confirmed by your lender! 🎉'
    : 'A payment has been marked as paid and needs your confirmation.';

  return {
    subject: role === 'borrower' ? 'Payment confirmed! 🎉' : 'Payment needs confirmation',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Payment Update</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi ${recipientName}! 👋</p>
            
            <p>${message}</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb; text-align: center;">
              <span style="font-weight: bold; font-size: 28px; color: #22c55e;">${currency} ${amount.toLocaleString()}</span>
            </div>
            
            <a href="${loanUrl}" style="display: block; background: #22c55e; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
              ${role === 'lender' ? 'Confirm Payment →' : 'View Loan →'}
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
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Loan Accepted!</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi ${borrowerName}! 👋</p>
            
            <p>Great news! <strong>${lenderName}</strong> has accepted your loan request.</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #6b7280; margin: 0 0 10px 0;">Loan Amount</p>
              <span style="font-weight: bold; font-size: 32px; color: #22c55e;">${currency} ${amount.toLocaleString()}</span>
            </div>
            
            <p>Your loan is now active. You can view your repayment schedule and track your progress in the app.</p>
            
            <a href="${loanUrl}" style="display: block; background: #22c55e; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
              View Your Loan →
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
    subject: `⚠️ OVERDUE: Your payment is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} late`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Overdue Payment</h1>
          </div>
          
          <div style="background: #fef2f2; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #fecaca;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi ${borrowerName},</p>
            
            <p style="color: #dc2626; font-weight: bold; font-size: 16px;">
              Your payment of ${currency} ${amount.toLocaleString()} to ${lenderName} is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #fecaca;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #6b7280;">Amount Due:</span>
                <span style="font-weight: bold; font-size: 20px; color: #dc2626;">${currency} ${amount.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280;">Original Due Date:</span>
                <span style="font-weight: bold;">${dueDate}</span>
              </div>
            </div>
            
            <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #991b1b; font-size: 14px;">
                <strong>⚠️ Important:</strong> Late payments negatively affect your borrower rating and may limit your ability to borrow in the future. Please make your payment as soon as possible.
              </p>
            </div>
            
            <a href="${loanUrl}" style="display: block; background: #dc2626; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
              Make Payment Now →
            </a>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              If you've already made this payment, please log in and mark it as paid.
            </p>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            Sent via LoanTrack • Simple loan tracking for everyone
          </p>
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
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📋 Missed Payment Notice</h1>
          </div>
          
          <div style="background: #fffbeb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #fde68a;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi ${lenderName},</p>
            
            <p>We're writing to inform you that <strong>${borrowerName}</strong> has a payment that is now <strong>${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #fde68a;">
              <div style="margin-bottom: 10px;">
                <span style="color: #6b7280;">Amount:</span>
                <span style="font-weight: bold; font-size: 20px; margin-left: 10px;">${currency} ${amount.toLocaleString()}</span>
              </div>
              <div>
                <span style="color: #6b7280;">Due Date:</span>
                <span style="font-weight: bold; margin-left: 10px;">${dueDate}</span>
              </div>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              We've sent the borrower a reminder. You can view the loan details and contact the borrower through the app.
            </p>
            
            <a href="${loanUrl}" style="display: block; background: #d97706; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
              View Loan Details →
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
    subject: `⏰ Reminder: Cash waiting for ${recipientName} (${daysWaiting} days)`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Cash Pickup Reminder</h1>
          </div>
          
          <div style="background: #fffbeb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #fde68a;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi ${borrowerName},</p>
            
            <p>This is a friendly reminder that <strong>${currency} ${amount.toLocaleString()}</strong> has been waiting for <strong>${recipientName}</strong> to pick up for <strong>${daysWaiting} days</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #fde68a;">
              <div style="text-align: center; margin-bottom: 15px;">
                <p style="color: #6b7280; margin: 0;">Amount</p>
                <p style="font-size: 28px; font-weight: bold; color: #d97706; margin: 5px 0;">${currency} ${amount.toLocaleString()}</p>
              </div>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
                <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${pickupLocation}</p>
                <p style="margin: 5px 0;"><strong>🔑 Pickup Code:</strong></p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin-top: 10px;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1f2937;">${pickupCode}</span>
                </div>
              </div>
            </div>
            
            <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>💡 Note:</strong> The cash will be held indefinitely until ${recipientName} picks it up. Please remind them to bring valid ID and the pickup code.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              If there are any issues or the recipient cannot pick up the cash, please contact our support team.
            </p>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            Sent via LoanTrack • Simple loan tracking for everyone
          </p>
        </body>
      </html>
    `,
  };
}
