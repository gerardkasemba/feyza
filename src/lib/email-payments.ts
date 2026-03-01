import { emailWrapper, APP_URL } from './email-core';

// PAYMENT EMAILS
// ============================================

/**
 * Email sent to lender when payment is received
 */
export function getPaymentReceivedLenderEmail(params: {
  lenderName: string;
  borrowerName: string;
  amount: number;
  currency: string;
  remainingBalance: number;
  loanId: string;
  isCompleted?: boolean;
}): { subject: string; html: string } {
  const { lenderName, borrowerName, amount, currency, remainingBalance, loanId, isCompleted } = params;
  
  return {
    subject: isCompleted ? `🎉 Loan Fully Repaid by ${borrowerName}!` : `Payment Received from ${borrowerName}`,
    html: emailWrapper({
      title: isCompleted ? '🎉 Loan Completed!' : '💰 Payment Received',
      content: `
        <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${lenderName}! 👋</p>
        <p style="color: #166534;">${isCompleted ? `Great news! ${borrowerName} has fully repaid their loan.` : `${borrowerName} has made a payment on their loan.`}</p>
        
        <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">Payment Amount</p>
          <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0;">${currency} ${amount.toLocaleString()}</p>
          ${!isCompleted ? `<p style="color: #6b7280; margin: 15px 0 0;">Remaining: ${currency} ${remainingBalance.toLocaleString()}</p>` : ''}
        </div>
        
        ${isCompleted ? `
        <div style="background: #d1fae5; padding: 16px; border-radius: 8px;">
          <p style="color: #065f46; margin: 0; font-size: 14px; text-align: center;">
            ✅ This loan is now <strong>complete</strong>. Thank you for using Feyza!
          </p>
        </div>
        ` : ''}
      `,
      ctaText: 'View Loan Details',
      ctaUrl: `${APP_URL}/loans/${loanId}`,
    }),
  };
}

/**
 * Email sent when payment is missed
 */
export function getMissedPaymentEmail(params: {
  lenderName: string;
  borrowerName: string;
  amount: number;
  currency: string;
  dueDate: string;
  loanId: string;
  reason?: string;
}): { subject: string; html: string } {
  const { lenderName, borrowerName, amount, currency, dueDate, loanId, reason } = params;
  
  return {
    subject: `Payment Missed - ${borrowerName}`,
    html: emailWrapper({
      title: '⚠️ Missed Payment',
      content: `
        <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${lenderName},</p>
        <p style="color: #374151;">A scheduled payment from ${borrowerName} was not processed.</p>
        
        <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #fecaca;">
          <p style="margin: 0 0 10px;"><strong>Amount:</strong> ${currency} ${amount.toLocaleString()}</p>
          <p style="margin: 0 0 10px;"><strong>Due Date:</strong> ${dueDate}</p>
          ${reason ? `<p style="margin: 0; color: #dc2626;"><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        
        <p style="color: #374151;">The borrower will be notified to make the payment manually.</p>
      `,
      ctaText: 'View Loan',
      ctaUrl: `${APP_URL}/loans/${loanId}`,
    }),
  };
}

// ============================================
// BUSINESS VERIFICATION EMAILS
// ============================================

/**
 * Email sent when business is approved
 */
export function getBusinessApprovedEmail(params: {
  businessName: string;
  ownerName: string;
}): { subject: string; html: string } {
  const { businessName, ownerName } = params;
  
  return {
    subject: '🎉 Your Business Account Has Been Approved!',
    html: emailWrapper({
      title: '🎉 Approved!',
      subtitle: 'Your business account is now active',
      content: `
        <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${ownerName}! 👋</p>
        <p style="color: #166534;">Great news! <strong style="color: #059669;">${businessName}</strong> has been verified and approved as a lender on Feyza.</p>
        
        <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
          <h4 style="color: #065f46; margin: 0 0 15px;">You can now:</h4>
          <ul style="color: #374151; padding-left: 20px; margin: 0;">
            <li style="margin-bottom: 8px;">Receive matched loan requests</li>
            <li style="margin-bottom: 8px;">Set your lending preferences</li>
            <li style="margin-bottom: 8px;">Create a public lending profile</li>
            <li>Start earning with transparent lending</li>
          </ul>
        </div>
      `,
      ctaText: 'Go to Dashboard',
      ctaUrl: `${APP_URL}/business`,
    }),
  };
}

/**
 * Email sent when business is rejected
 */
export function getBusinessRejectedEmail(params: {
  businessName: string;
  ownerName: string;
  reason?: string;
}): { subject: string; html: string } {
  const { businessName, ownerName, reason } = params;
  
  return {
    subject: '📋 Update on Your Business Application',
    html: emailWrapper({
      title: 'Application Update',
      content: `
        <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${ownerName},</p>
        <p style="color: #374151;">After reviewing your application for <strong>${businessName}</strong>, we were unable to approve it at this time.</p>
        
        ${reason ? `
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
          <p style="color: #92400e; margin: 0;"><strong>Reason:</strong> ${reason}</p>
        </div>
        ` : ''}
        
        <p style="color: #374151;">If you believe this was a mistake or have additional information to provide, please contact our support team.</p>
      `,
      ctaText: 'Contact Support',
      ctaUrl: 'mailto:support@feyza.app',
    }),
  };
}

// ============================================
