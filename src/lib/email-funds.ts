import { emailWrapper, APP_URL } from './email-core';

// FUNDS DISBURSEMENT EMAILS
// ============================================

/**
 * Email sent to borrower when funds are on the way
 */
export function getFundsOnTheWayEmail(params: {
  borrowerName: string;
  lenderName: string;
  amount: number;
  currency: string;
  loanId: string;
}): { subject: string; html: string } {
  const { borrowerName, lenderName, amount, currency, loanId } = params;
  
  return {
    subject: `${lenderName} has sent you ${currency}${amount.toLocaleString()}!`,
    html: emailWrapper({
      title: '💸 Funds On The Way!',
      content: `
        <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${borrowerName}! 👋</p>
        <p style="color: #166534;"><strong style="color: #059669;">${lenderName}</strong> has sent your loan funds!</p>
        
        <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">Amount Sent</p>
          <p style="font-size: 40px; font-weight: bold; color: #059669; margin: 10px 0;">${currency} ${amount.toLocaleString()}</p>
        </div>
        
        <div style="background: #dbeafe; padding: 16px; border-radius: 8px; border: 1px solid #93c5fd;">
          <p style="color: #1e40af; margin: 0; font-size: 14px;">
            🏦 <strong>ACH Transfer:</strong> Funds typically arrive in 1-3 business days.
          </p>
        </div>
      `,
      ctaText: 'View Loan Details',
      ctaUrl: `${APP_URL}/loans/${loanId}`,
    }),
  };
}

/**
 * Email sent when funds have arrived
 */
export function getFundsArrivedEmail(params: {
  borrowerName: string;
  amount: number;
  currency: string;
  loanId: string;
}): { subject: string; html: string } {
  const { borrowerName, amount, currency, loanId } = params;
  
  return {
    subject: 'Loan Funds Have Arrived! – Feyza',
    html: emailWrapper({
      title: '✅ Funds Received!',
      subtitle: 'Your loan is now active',
      content: `
        <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${borrowerName}! 👋</p>
        <p style="color: #166534;">Great news! The loan funds have been deposited into your bank account.</p>
        
        <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">Amount Received</p>
          <p style="font-size: 40px; font-weight: bold; color: #059669; margin: 10px 0;">${currency} ${amount.toLocaleString()}</p>
        </div>
        
        <p style="color: #374151;">Your loan is now <strong>active</strong>. Your first payment will be due according to your repayment schedule.</p>
      `,
      ctaText: 'View Repayment Schedule',
      ctaUrl: `${APP_URL}/loans/${loanId}`,
    }),
  };
}

/**
 * Email sent when disbursement fails
 */
export function getDisbursementFailedEmail(params: {
  lenderName: string;
  borrowerName: string;
  amount: number;
  currency: string;
  loanId: string;
  errorMessage?: string;
}): { subject: string; html: string } {
  const { lenderName, borrowerName, amount, currency, loanId, errorMessage } = params;
  
  return {
    subject: 'Loan Disbursement Failed - Feyza',
    html: emailWrapper({
      title: '⚠️ Disbursement Failed',
      content: `
        <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${lenderName},</p>
        <p style="color: #374151;">Unfortunately, the disbursement for your loan to ${borrowerName} has failed.</p>
        
        <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <p style="margin: 0 0 10px;"><strong>Amount:</strong> ${currency} ${amount.toLocaleString()}</p>
          <p style="margin: 0;"><strong>Borrower:</strong> ${borrowerName}</p>
          ${errorMessage ? `<p style="margin: 10px 0 0; color: #dc2626;"><strong>Error:</strong> ${errorMessage}</p>` : ''}
        </div>
        
        <p style="color: #374151;">Please check your bank connection and try again, or contact support for assistance.</p>
      `,
      ctaText: 'View Loan',
      ctaUrl: `${APP_URL}/loans/${loanId}`,
    }),
  };
}

// ============================================
