import { emailWrapper } from './email-core';

// DASHBOARD ACCESS EMAILS
// ============================================

/**
 * Email sent with dashboard access link
 */
export function getDashboardAccessEmail(params: {
  recipientName: string;
  accessUrl: string;
  role: 'borrower' | 'lender';
}): { subject: string; html: string } {
  const { recipientName, accessUrl, role } = params;
  
  const title = role === 'lender' ? 'Your Lending Dashboard' : 'Your Borrower Dashboard';
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: `${title} - Feyza`,
    html: `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom: 15px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="40" style="display:block; height:40px;"/></td></tr>
      </table>
      <h1 style="color: #fff; margin: 0; font-size: 24px;">${title}</h1>
    </div>
    <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
      <p style="font-size: 18px; color: #166534;">Hi ${recipientName}! 👋</p>
      <p style="color: #166534;">Click below to access your ${role === 'lender' ? 'lending' : 'loan'} dashboard.</p>
      <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
        <p style="color: #374151; margin: 0;">From your dashboard you can:</p>
        <ul style="color: #374151; padding-left: 20px; margin: 10px 0 0;">
          ${role === 'lender' ? '<li>View and manage loan requests</li><li>Track payments received</li><li>Send reminders</li>' : '<li>View loan details</li><li>Make payments</li><li>Track progress</li>'}
        </ul>
      </div>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${accessUrl}" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">Access Dashboard →</a>
      </div>
      <div style="background: #fef3c7; padding: 14px; border-radius: 8px; border: 1px solid #fcd34d;">
        <p style="color: #92400e; margin: 0; font-size: 14px;">⏰ <strong>This link expires in 24 hours</strong></p>
      </div>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">Feyza • Secure Lending Platform</div>
  </body>
</html>
`,
  };
}

/**
 * Email sent before auto-pay charges
 */
export function getAutoPayReminderEmail(params: {
  borrowerName: string;
  amount: number;
  currency: string;
  chargeDate: string;
  loanId: string;
}): { subject: string; html: string } {
  const { borrowerName, amount, currency, chargeDate, loanId } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: `Payment auto-charge tomorrow - ${currency} ${amount}`,
    html: `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom: 15px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="40" style="display:block; height:40px;"/></td></tr>
      </table>
      <h1 style="color: #fff; margin: 0; font-size: 24px;">🔔 Auto-Pay Reminder</h1>
    </div>
    <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
      <p style="font-size: 18px; color: #166534;">Hi ${borrowerName}! 👋</p>
      <p style="color: #166534;">Your scheduled auto-payment will be charged tomorrow.</p>
      <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
        <p style="color: #6b7280; margin: 0; font-size: 14px;">Auto-Pay Amount</p>
        <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0;">${currency} ${amount.toLocaleString()}</p>
        <p style="color: #6b7280; margin: 0;">Charge Date: ${chargeDate}</p>
      </div>
      <div style="background: #dbeafe; padding: 16px; border-radius: 8px; border: 1px solid #93c5fd;">
        <p style="color: #1e40af; margin: 0; font-size: 14px;">💳 Make sure your bank account has sufficient funds.</p>
      </div>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${APP_URL}/loans/${loanId}" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">View Loan →</a>
      </div>
    </div>
  </body>
</html>
`,
  };
}

/**
 * Email sent to lender when a new loan matches their preferences
 */
export function getNewMatchForLenderEmail(params: {
  lenderName?: string;
  borrowerName: string;
  amount: number;
  currency: string;
  purpose?: string;
  matchId: string;
  autoAccept: boolean;
}): { subject: string; html: string } {
  const { lenderName, borrowerName, amount, currency, purpose, matchId, autoAccept } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: `New Loan Match: ${currency} ${amount.toLocaleString()}`,
    html: `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom: 15px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="40" style="display:block; height:40px;"/></td></tr>
      </table>
      <h1 style="color: #fff; margin: 0; font-size: 24px;">${autoAccept ? '⚡ Auto-Accepted Match' : '🎯 New Loan Match'}</h1>
      ${autoAccept ? '<p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">Automatically approved</p>' : ''}
    </div>
    <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
      <p style="font-size: 18px; color: #166534;">Hi ${lenderName || 'there'}! 👋</p>
      <p style="color: #166534;">${autoAccept ? 'A loan has been auto-accepted based on your preferences.' : 'You have a new loan match.'}</p>
      <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
        <div style="text-align: center; margin-bottom: 20px;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">Loan Amount</p>
          <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0;">${currency} ${amount.toLocaleString()}</p>
        </div>
        <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
          <p style="margin: 0 0 8px;"><strong>Borrower:</strong> ${borrowerName}</p>
          ${purpose ? `<p style="margin: 0;"><strong>Purpose:</strong> ${purpose}</p>` : ''}
        </div>
      </div>
      ${autoAccept ? '<div style="background: #d1fae5; padding: 16px; border-radius: 8px;"><p style="color: #065f46; margin: 0; font-size: 14px;">✅ This loan was <strong>auto-accepted</strong>. Please disburse the funds.</p></div>' : ''}
      <div style="text-align: center; margin: 25px 0;">
        <a href="${APP_URL}/lender/matches/${matchId}" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">${autoAccept ? 'Disburse Funds' : 'Review Match'} →</a>
      </div>
    </div>
  </body>
</html>
`,
  };
}

// ============================================
// PAYMENT PROCESSING EMAILS
// ============================================

/**
 * Email sent when a payment is processed (for borrower)
 */
export function getPaymentProcessedEmail(params: {
  borrowerName: string;
  amount: number;
  currency: string;
  lenderName: string;
  remainingBalance: number;
  loanId: string;
}): { subject: string; html: string } {
  const { borrowerName, amount, currency, lenderName, remainingBalance, loanId } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: `Payment processed - ${currency} ${amount}`,
    html: `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom: 15px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="40" style="display:block; height:40px;"/></td></tr>
      </table>
      <h1 style="color: #fff; margin: 0; font-size: 24px;">✅ Payment Processed</h1>
    </div>
    <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
      <p style="font-size: 18px; color: #166534;">Hi ${borrowerName}! 👋</p>
      <p style="color: #166534;">Your payment to <strong>${lenderName}</strong> has been processed successfully.</p>
      <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
        <p style="color: #6b7280; margin: 0; font-size: 14px;">Payment Amount</p>
        <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0;">${currency} ${amount.toLocaleString()}</p>
        <p style="color: #6b7280; margin: 15px 0 0;">Remaining Balance: ${currency} ${remainingBalance.toLocaleString()}</p>
      </div>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${APP_URL}/loans/${loanId}" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">View Loan →</a>
      </div>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">Feyza • Secure Lending Platform</div>
  </body>
</html>
`,
  };
}

/**
 * Email sent when a payment is received (for lender)
 */
export function getPaymentReceivedEmail(params: {
  lenderName: string;
  borrowerName: string;
  amount: number;
  currency: string;
  remainingBalance: number;
  loanId: string;
  isCompleted?: boolean;
}): { subject: string; html: string } {
  const { lenderName, borrowerName, amount, currency, remainingBalance, loanId, isCompleted } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: isCompleted ? `🎉 Loan Fully Repaid - ${currency} ${amount}` : `Payment received - ${currency} ${amount}`,
    html: `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom: 15px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="40" style="display:block; height:40px;"/></td></tr>
      </table>
      <h1 style="color: #fff; margin: 0; font-size: 24px;">${isCompleted ? '🎉 Loan Completed!' : '💰 Payment Received'}</h1>
    </div>
    <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
      <p style="font-size: 18px; color: #166534;">Hi ${lenderName}! 👋</p>
      <p style="color: #166534;">${isCompleted ? `Great news! ${borrowerName} has fully repaid their loan.` : `You've received a payment from ${borrowerName}.`}</p>
      <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
        <p style="color: #6b7280; margin: 0; font-size: 14px;">Payment Amount</p>
        <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0;">${currency} ${amount.toLocaleString()}</p>
        ${!isCompleted ? `<p style="color: #6b7280; margin: 15px 0 0;">Remaining: ${currency} ${remainingBalance.toLocaleString()}</p>` : ''}
      </div>
      ${isCompleted ? '<div style="background: #d1fae5; padding: 16px; border-radius: 8px;"><p style="color: #065f46; margin: 0; font-size: 14px; text-align: center;">✅ This loan is now <strong>complete</strong>. Thank you for using Feyza!</p></div>' : ''}
      <div style="text-align: center; margin: 25px 0;">
        <a href="${APP_URL}/loans/${loanId}" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">View Loan →</a>
      </div>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">Feyza • Secure Lending Platform</div>
  </body>
</html>
`,
  };
}

/**
 * Email sent for payment confirmation needed (guest borrower)
 */
export function getPaymentConfirmationNeededEmail(params: {
  borrowerName: string;
  amount: number;
  currency: string;
  lenderName: string;
  accessToken: string;
  loanId: string;
}): { subject: string; html: string } {
  const { borrowerName, amount, currency, lenderName, accessToken, loanId } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: 'Payment Received – Confirmation Needed',
    html: `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom: 15px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="40" style="display:block; height:40px;"/></td></tr>
      </table>
      <h1 style="color: #fff; margin: 0; font-size: 24px;">💰 Payment Received</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Please confirm receipt</p>
    </div>
    <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
      <p style="font-size: 18px; color: #166534;">Hi ${borrowerName}! 👋</p>
      <p style="color: #166534;"><strong>${lenderName}</strong> has marked a payment as received. Please confirm this payment.</p>
      <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
        <p style="color: #6b7280; margin: 0; font-size: 14px;">Payment Amount</p>
        <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0;">${currency} ${amount.toLocaleString()}</p>
      </div>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${APP_URL}/guest-borrower/${accessToken}?loan=${loanId}" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">Confirm Payment →</a>
      </div>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">Feyza • Secure Lending Platform</div>
  </body>
</html>
`,
  };
}

/**
 * Email sent to access loans (guest borrower)
 */
export function getAccessLoansEmail(params: {
  borrowerName: string;
  accessToken: string;
  loanCount: number;
}): { subject: string; html: string } {
  const { borrowerName, accessToken, loanCount } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: 'Access Your Loan(s) on Feyza',
    html: `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom: 15px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="40" style="display:block; height:40px;"/></td></tr>
      </table>
      <h1 style="color: #fff; margin: 0; font-size: 24px;">🔗 Access Your Loans</h1>
    </div>
    <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
      <p style="font-size: 18px; color: #166534;">Hi ${borrowerName}! 👋</p>
      <p style="color: #166534;">Click below to access your ${loanCount > 1 ? `${loanCount} loans` : 'loan'} on Feyza.</p>
      <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
        <p style="color: #374151; margin: 0;">From your dashboard you can:</p>
        <ul style="color: #374151; padding-left: 20px; margin: 10px 0 0;">
          <li>View loan details and terms</li>
          <li>Track your repayment progress</li>
          <li>Make payments</li>
        </ul>
      </div>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${APP_URL}/guest-borrower/${accessToken}" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">Access Your Loans →</a>
      </div>
      <div style="background: #fef3c7; padding: 14px; border-radius: 8px; border: 1px solid #fcd34d;">
        <p style="color: #92400e; margin: 0; font-size: 14px;">⏰ <strong>This link expires in 24 hours</strong> for security.</p>
      </div>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">Feyza • Secure Lending Platform</div>
  </body>
</html>
`,
  };
}

/**
 * Email sent when loan is matched with new lender (after expiry)
 */
export function getLoanRematchedEmail(params: {
  borrowerName: string;
  amount: number;
  currency: string;
  newLenderName: string;
  loanId: string;
}): { subject: string; html: string } {
  const { borrowerName, amount, currency, newLenderName, loanId } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: 'Loan Matched with New Lender!',
    html: `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom: 15px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="40" style="display:block; height:40px;"/></td></tr>
      </table>
      <h1 style="color: #fff; margin: 0; font-size: 24px;">🎯 New Lender Match!</h1>
    </div>
    <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
      <p style="font-size: 18px; color: #166534;">Hi ${borrowerName}! 👋</p>
      <p style="color: #166534;">Your loan request has been matched with a new lender: <strong style="color: #059669;">${newLenderName}</strong>.</p>
      <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
        <p style="color: #6b7280; margin: 0; font-size: 14px;">Loan Amount</p>
        <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0;">${currency} ${amount.toLocaleString()}</p>
      </div>
      <p style="color: #374151;">The lender is reviewing your request. You'll be notified once they make a decision.</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${APP_URL}/loans/${loanId}" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">View Loan →</a>
      </div>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">Feyza • Secure Lending Platform</div>
  </body>
</html>
`,
  };
}

/**
 * Email sent when no lenders available after all matches expired
 */
export function getNoLendersAvailableEmail(params: {
  borrowerName: string;
  amount: number;
  currency: string;
}): { subject: string; html: string } {
  const { borrowerName, amount, currency } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: 'Unable to Find a Matching Lender',
    html: `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom: 15px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="40" style="display:block; height:40px;"/></td></tr>
      </table>
      <h1 style="color: #fff; margin: 0; font-size: 24px;">📋 Loan Request Update</h1>
    </div>
    <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
      <p style="font-size: 18px; color: #166534;">Hi ${borrowerName},</p>
      <p style="color: #374151;">Unfortunately, we couldn't find a matching lender for your loan request of <strong>${currency} ${amount.toLocaleString()}</strong>.</p>
      <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb;">
        <h4 style="color: #374151; margin: 0 0 15px;">What you can do:</h4>
        <ul style="color: #374141; padding-left: 20px; margin: 0;">
          <li style="margin-bottom: 8px;">Share your request with friends or family</li>
          <li style="margin-bottom: 8px;">Try a smaller amount</li>
          <li>Submit a new request later as more lenders join</li>
        </ul>
      </div>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${APP_URL}/borrow" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">Submit New Request →</a>
      </div>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">Feyza • Secure Lending Platform</div>
  </body>
</html>
`,
  };
}

/**
 * Auto-charge warning email (sent day before auto-pay)
 */
export function getAutoChargeWarningEmail(params: {
  borrowerName: string;
  amount: number;
  currency: string;
  dueDate: string;
  loanId: string;
}): { subject: string; html: string } {
  const { borrowerName, amount, currency, dueDate, loanId } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: `Payment auto-charge tomorrow - ${currency} ${amount}`,
    html: `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom: 15px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="40" style="display:block; height:40px;"/></td></tr>
      </table>
      <h1 style="color: #fff; margin: 0; font-size: 24px;">⏰ Auto-Pay Tomorrow</h1>
    </div>
    <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
      <p style="font-size: 18px; color: #166534;">Hi ${borrowerName}! 👋</p>
      <p style="color: #166534;">Your scheduled payment will be automatically charged tomorrow.</p>
      <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
        <p style="color: #6b7280; margin: 0; font-size: 14px;">Amount to be Charged</p>
        <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0;">${currency} ${amount.toLocaleString()}</p>
        <p style="color: #6b7280; margin: 0;">Due: ${dueDate}</p>
      </div>
      <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border: 1px solid #fcd34d;">
        <p style="color: #92400e; margin: 0; font-size: 14px;">💳 <strong>Please ensure your connected bank account has sufficient funds.</strong></p>
      </div>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${APP_URL}/loans/${loanId}" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">View Loan →</a>
      </div>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">Feyza • Secure Lending Platform</div>
  </body>
</html>
`,
  };
}

/**
 * Email sent to guest lender when they accept a loan request
 */
export function getGuestLenderAcceptedEmail(params: {
  lenderName: string;
  borrowerName: string;
  amount: number;
  currency: string;
  accessToken: string;
  requestId: string;
}): { subject: string; html: string } {
  const { lenderName, borrowerName, amount, currency, accessToken, requestId } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: 'You accepted a loan request - Set your terms',
    html: `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom: 15px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="40" style="display:block; height:40px;"/></td></tr>
      </table>
      <h1 style="color: #fff; margin: 0; font-size: 24px;">✅ Request Accepted</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">Now set your lending terms</p>
    </div>
    <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
      <p style="font-size: 18px; color: #166534;">Hi ${lenderName}! 👋</p>
      <p style="color: #166534;">You've accepted the loan request from <strong>${borrowerName}</strong> for <strong>${currency} ${amount.toLocaleString()}</strong>.</p>
      <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
        <h4 style="color: #065f46; margin: 0 0 15px;">Next Step: Set Your Terms</h4>
        <p style="color: #374151; margin: 0;">Click the button below to set the interest rate and repayment schedule for this loan.</p>
      </div>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${APP_URL}/lender/setup-loan/${requestId}?token=${accessToken}" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">Set Loan Terms →</a>
      </div>
      <div style="background: #fef3c7; padding: 14px; border-radius: 8px; border: 1px solid #fcd34d;">
        <p style="color: #92400e; margin: 0; font-size: 14px;">⏰ This link expires in 7 days.</p>
      </div>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">Feyza • Secure Lending Platform</div>
  </body>
</html>
`,
  };
}

/**
 * Email sent to business when they receive a new loan request
 */
export function getBusinessLoanRequestEmail(params: {
  businessName: string;
  borrowerName: string;
  amount: number;
  currency: string;
  purpose?: string;
  loanId: string;
}): { subject: string; html: string } {
  const { businessName, borrowerName, amount, currency, purpose, loanId } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: `New loan request from ${borrowerName}`,
    html: `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom: 15px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="40" style="display:block; height:40px;"/></td></tr>
      </table>
      <h1 style="color: #fff; margin: 0; font-size: 24px;">📋 New Loan Request</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">Ready for your review</p>
    </div>
    <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
      <p style="font-size: 18px; color: #166534;">Hi ${businessName} team! 👋</p>
      <p style="color: #166534;">You have a new loan request from <strong style="color: #059669;">${borrowerName}</strong>:</p>
      <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
        <p style="color: #6b7280; margin: 0; font-size: 14px;">Requested Amount</p>
        <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0;">${currency} ${amount.toLocaleString()}</p>
        ${purpose ? `<p style="color: #6b7280; margin: 15px 0 0;">Purpose: ${purpose}</p>` : ''}
      </div>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${APP_URL}/business" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">Review Request →</a>
      </div>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">Feyza • Secure Lending Platform</div>
  </body>
</html>
`,
  };
}

/**
 * Email sent for early payment notification to lender
 */
export function getEarlyPaymentLenderEmail(params: {
  lenderName: string;
  borrowerName: string;
  amount: number;
  currency: string;
  originalDueDate: string;
  remainingBalance: number;
  loanId: string;
  isCompleted?: boolean;
}): { subject: string; html: string } {
  const { lenderName, borrowerName, amount, currency, originalDueDate, remainingBalance, loanId, isCompleted } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: isCompleted ? `🎉 Loan Fully Repaid Early!` : `Early Payment Received - ${currency} ${amount}`,
    html: `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom: 15px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="40" style="display:block; height:40px;"/></td></tr>
      </table>
      <h1 style="color: #fff; margin: 0; font-size: 24px;">${isCompleted ? '🎉 Loan Completed Early!' : '⚡ Early Payment Received'}</h1>
    </div>
    <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
      <p style="font-size: 18px; color: #166534;">Hi ${lenderName}! 👋</p>
      <p style="color: #166534;"><strong>${borrowerName}</strong> made an <strong style="color: #059669;">early payment</strong> ahead of the scheduled due date!</p>
      <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
        <p style="color: #6b7280; margin: 0; font-size: 14px;">Payment Amount</p>
        <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0;">${currency} ${amount.toLocaleString()}</p>
        <p style="color: #6b7280; margin: 10px 0 0; font-size: 14px;">Originally due: ${originalDueDate}</p>
        ${!isCompleted ? `<p style="color: #6b7280; margin: 10px 0 0;">Remaining: ${currency} ${remainingBalance.toLocaleString()}</p>` : ''}
      </div>
      ${isCompleted ? '<div style="background: #d1fae5; padding: 16px; border-radius: 8px;"><p style="color: #065f46; margin: 0; font-size: 14px; text-align: center;">✅ This loan is now <strong>fully repaid</strong>. Thank you for using Feyza!</p></div>' : '<div style="background: #d1fae5; padding: 16px; border-radius: 8px;"><p style="color: #065f46; margin: 0; font-size: 14px;">⭐ Early payments show responsible borrowing behavior!</p></div>'}
      <div style="text-align: center; margin: 25px 0;">
        <a href="${APP_URL}/loans/${loanId}" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">View Loan →</a>
      </div>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">Feyza • Secure Lending Platform</div>
  </body>
</html>
`,
  };
}

/**
 * Email sent to borrower when payment is processed (for both guest and logged-in)
 */
export function getPaymentProcessedBorrowerEmail(params: {
  borrowerName: string;
  lenderName: string;
  amount: number;
  currency: string;
  remainingBalance: number;
  loanId: string;
  accessToken?: string; // For guest users
  isCompleted?: boolean;
}): { subject: string; html: string } {
  const { borrowerName, lenderName, amount, currency, remainingBalance, loanId, accessToken, isCompleted } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Use guest link if accessToken provided, otherwise use logged-in link
  const viewLoanUrl = accessToken 
    ? `${APP_URL}/borrower/${accessToken}`
    : `${APP_URL}/loans/${loanId}`;
  
  return {
    subject: isCompleted ? '🎉 Congratulations! Loan Fully Repaid' : `✅ Payment Processed - ${currency} ${amount.toLocaleString()}`,
    html: `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom: 15px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="40" style="display:block; height:40px;"/></td></tr>
      </table>
      <h1 style="color: #fff; margin: 0; font-size: 24px;">${isCompleted ? '🎉 Loan Completed!' : '✅ Payment Processed'}</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">${isCompleted ? 'Congratulations on paying off your loan!' : 'Your payment has been sent to the lender'}</p>
    </div>
    <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
      <p style="font-size: 18px; color: #166534;">Hi ${borrowerName}! 👋</p>
      <p style="color: #374151;">Your scheduled payment has been successfully processed and sent to <strong>${lenderName}</strong>.</p>
      
      <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
        <p style="color: #6b7280; margin: 0; font-size: 14px;">Payment Amount</p>
        <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0;">${currency} ${amount.toLocaleString()}</p>
        ${!isCompleted ? `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">Remaining Balance</p>
          <p style="font-size: 24px; font-weight: bold; color: #374151; margin: 5px 0;">${currency} ${remainingBalance.toLocaleString()}</p>
        </div>
        ` : ''}
      </div>
      
      ${isCompleted ? `
      <div style="background: #d1fae5; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
        <p style="color: #065f46; margin: 0; font-size: 16px; font-weight: 600;">🎊 Congratulations!</p>
        <p style="color: #065f46; margin: 10px 0 0; font-size: 14px;">You have successfully paid off your entire loan. Thank you for being a responsible borrower!</p>
      </div>
      ` : `
      <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #065f46; margin: 0; font-size: 14px;">✅ <strong>Auto-Pay Active</strong> — Your next payment will be automatically processed on the scheduled date.</p>
      </div>
      `}
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${viewLoanUrl}" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">View Loan Details →</a>
      </div>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">Feyza • Secure Lending Platform</div>
  </body>
</html>
`,
  };
}

/**
 * Email sent to guest lender when payment is received
 */
export function getPaymentReceivedGuestLenderEmail(params: {
  lenderName: string;
  borrowerName: string;
  amount: number;
  currency: string;
  remainingBalance: number;
  loanId: string;
  accessToken: string;
  isCompleted?: boolean;
}): { subject: string; html: string } {
  const { lenderName, borrowerName, amount, currency, remainingBalance, loanId, accessToken, isCompleted } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: isCompleted ? `🎉 Loan Fully Repaid by ${borrowerName}` : `💰 Payment Received - ${currency} ${amount.toLocaleString()}`,
    html: `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding-bottom: 15px;"><img src="https://feyza.app/feyza.png" alt="Feyza" height="40" style="display:block; height:40px;"/></td></tr>
      </table>
      <h1 style="color: #fff; margin: 0; font-size: 24px;">${isCompleted ? '🎉 Loan Completed!' : '💰 Payment Received'}</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">${isCompleted ? 'The loan has been fully repaid' : 'A payment is on the way to your bank'}</p>
    </div>
    <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
      <p style="font-size: 18px; color: #166534;">Hi ${lenderName}! 👋</p>
      <p style="color: #374151;">${isCompleted ? `Great news! <strong>${borrowerName}</strong> has fully repaid their loan.` : `You've received a payment from <strong>${borrowerName}</strong>.`}</p>
      
      <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
        <p style="color: #6b7280; margin: 0; font-size: 14px;">Payment Amount</p>
        <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0;">${currency} ${amount.toLocaleString()}</p>
        ${!isCompleted ? `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">Remaining to Collect</p>
          <p style="font-size: 24px; font-weight: bold; color: #374151; margin: 5px 0;">${currency} ${remainingBalance.toLocaleString()}</p>
        </div>
        ` : ''}
      </div>
      
      ${isCompleted ? `
      <div style="background: #d1fae5; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
        <p style="color: #065f46; margin: 0; font-size: 16px; font-weight: 600;">✅ Loan Complete</p>
        <p style="color: #065f46; margin: 10px 0 0; font-size: 14px;">This loan has been fully repaid. Thank you for using Feyza!</p>
      </div>
      ` : `
      <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #065f46; margin: 0; font-size: 14px;">💳 <strong>Funds Transfer</strong> — The payment will be deposited into your connected bank account within 1-3 business days.</p>
      </div>
      `}
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${APP_URL}/lender/${accessToken}" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">View Loan Dashboard →</a>
      </div>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">Feyza • Secure Lending Platform</div>
  </body>
</html>
`,
  };
}

// ============================================
