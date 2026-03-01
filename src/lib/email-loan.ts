import { emailWrapper, APP_URL } from './email-core';

// LOAN REQUEST EMAILS
// ============================================

/**
 * Email sent when a guest submits a loan request
 */
export function getLoanRequestSubmittedEmail(params: {
  borrowerName: string;
  amount: number;
  currency: string;
  purpose: string;
  requestId: string;
  accessToken: string;
}): { subject: string; html: string } {
  const { borrowerName, amount, currency, purpose, requestId, accessToken } = params;
  
  return {
    subject: 'Loan Request Submitted - Feyza',
    html: emailWrapper({
      title: '✅ Request Submitted!',
      content: `
        <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${borrowerName},</p>
        <p style="color: #374151;">Your loan request has been submitted successfully! Your bank account is connected and ready to receive funds.</p>
        
        <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">Request Amount</p>
          <p style="font-size: 32px; font-weight: bold; color: #059669; margin: 0;">${currency} ${amount.toLocaleString()}</p>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 14px;">Purpose: ${purpose.charAt(0).toUpperCase() + purpose.slice(1)}</p>
        </div>
        
        <div style="background: #d1fae5; padding: 14px 16px; border-radius: 8px; margin: 16px 0;">
          <p style="color: #065f46; margin: 0; font-size: 14px;">
            ✅ <strong>Bank Connected</strong> — When your loan is accepted, funds will be sent directly to your bank account via ACH transfer.
          </p>
        </div>
        
        <h3 style="color: #374151; margin-top: 24px;">What's next?</h3>
        <ol style="color: #374151; padding-left: 20px; margin-top: 10px;">
          <li style="margin-bottom: 12px;"><strong>Share your request</strong> — Send the link to friends, family, or anyone who might lend.</li>
          <li style="margin-bottom: 12px;"><strong>Wait for a lender</strong> — Once accepted, money is sent directly to your bank.</li>
          <li style="margin-bottom: 12px;"><strong>Receive funds</strong> — Typically arrives in 1–3 business days via ACH.</li>
        </ol>
      `,
      ctaText: 'View & Share Your Request',
      ctaUrl: `${APP_URL}/loan-request/${requestId}?token=${accessToken}`,
      footerNote: '💡 <strong>Tip:</strong> Share your loan request with people you trust. This link expires in 7 days.',
    }),
  };
}

/**
 * Email sent to lender when they receive a new loan request
 */
export function getNewLoanRequestForLenderEmail(params: {
  lenderName?: string;
  borrowerName: string;
  amount: number;
  currency: string;
  purpose?: string;
  loanId: string;
}): { subject: string; html: string } {
  const { lenderName, borrowerName, amount, currency, purpose, loanId } = params;
  
  return {
    subject: `New loan request from ${borrowerName} - ${currency}${amount.toLocaleString()}`,
    html: emailWrapper({
      title: '📥 New Loan Request',
      subtitle: 'Someone wants to borrow from you',
      content: `
        <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${lenderName || 'there'}! 👋</p>
        <p style="color: #166534;">You've received a new loan request:</p>
        
        <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
          <div style="text-align: center; margin-bottom: 20px;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Requested Amount</p>
            <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0;">${currency} ${amount.toLocaleString()}</p>
          </div>
          <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
            <p style="margin: 0 0 8px;"><strong>From:</strong> ${borrowerName}</p>
            ${purpose ? `<p style="margin: 0;"><strong>Purpose:</strong> ${purpose}</p>` : ''}
          </div>
        </div>
        
        <p style="color: #374151;">Review the request and decide whether to accept or decline.</p>
      `,
      ctaText: 'Review Request',
      ctaUrl: `${APP_URL}/loans/${loanId}`,
    }),
  };
}

/**
 * Email sent to borrower when no matching lenders found
 */
export function getNoMatchFoundEmail(params: {
  borrowerName: string;
  amount: number;
  currency: string;
  requestId: string;
}): { subject: string; html: string } {
  const { borrowerName, amount, currency, requestId } = params;
  
  return {
    subject: 'Loan Request Update - No Matching Lenders Found',
    html: emailWrapper({
      title: '📋 Loan Request Update',
      content: `
        <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${borrowerName},</p>
        <p style="color: #374151;">We couldn't find a matching business lender for your loan request at this time.</p>
        
        <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <p style="margin: 0;"><strong>Requested Amount:</strong> ${currency} ${amount.toLocaleString()}</p>
        </div>
        
        <h4 style="color: #374151;">What you can do:</h4>
        <ul style="color: #374151; padding-left: 20px;">
          <li>Share your request with friends or family who might lend</li>
          <li>Try a smaller amount (first-time borrowers may have limits)</li>
          <li>Check back later as more lenders join</li>
        </ul>
      `,
      ctaText: 'View Your Request',
      ctaUrl: `${APP_URL}/loan-request/${requestId}`,
    }),
  };
}

// ============================================
// LOAN ACCEPTANCE EMAILS
// ============================================

/**
 * Email sent to borrower when loan is accepted
 */
export function getLoanAcceptedBorrowerEmail(params: {
  borrowerName: string;
  lenderName: string;
  amount: number;
  currency: string;
  interestRate: number;
  loanId: string;
  isAutoAccept?: boolean;
}): { subject: string; html: string } {
  const { borrowerName, lenderName, amount, currency, interestRate, loanId, isAutoAccept } = params;
  
  return {
    subject: isAutoAccept ? 'Loan Instantly Matched!' : 'Your Loan Has Been Accepted!',
    html: emailWrapper({
      title: isAutoAccept ? '⚡ Instant Match!' : '🎉 Loan Accepted!',
      subtitle: isAutoAccept ? 'Automatically approved' : undefined,
      content: `
        <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${borrowerName}! 👋</p>
        <p style="color: #166534;">Great news! Your loan has been ${isAutoAccept ? 'instantly matched and approved' : 'accepted'} by <strong style="color:#059669;">${lenderName}</strong>.</p>
        
        <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
          <h3 style="margin: 0 0 20px; color: #065f46; font-size: 20px; text-align: center;">Loan Details</h3>
          <div style="text-align: center; margin-bottom: 20px;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Loan Amount</p>
            <p style="font-size: 40px; font-weight: bold; color: #059669; margin: 10px 0;">${currency} ${amount.toLocaleString()}</p>
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px; text-align: center;">
                <div style="background: #f0fdf4; padding: 15px; border-radius: 8px;">
                  <p style="color: #065f46; margin: 0; font-size: 13px; font-weight: 600;">Interest Rate</p>
                  <p style="color: #059669; margin: 8px 0 0; font-size: 22px; font-weight: bold;">${interestRate}%</p>
                  <p style="color: #6b7280; margin: 5px 0 0; font-size: 12px;">per annum</p>
                </div>
              </td>
              <td style="padding: 8px; text-align: center;">
                <div style="background: #f0fdf4; padding: 15px; border-radius: 8px;">
                  <p style="color: #065f46; margin: 0; font-size: 13px; font-weight: 600;">Lender</p>
                  <p style="color: #059669; margin: 8px 0 0; font-size: 18px; font-weight: bold;">${lenderName}</p>
                  <p style="color: #6b7280; margin: 5px 0 0; font-size: 12px;">Verified Partner</p>
                </div>
              </td>
            </tr>
          </table>
        </div>
        
        <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <h4 style="margin: 0 0 8px; color: #065f46; font-weight: 600;">Next Steps</h4>
          <p style="margin: 0; color: #166534;">The lender will send <strong>${currency} ${amount.toLocaleString()}</strong> to your bank account. You'll receive another notification when the payment is sent.</p>
        </div>
      `,
      ctaText: 'View Your Loan',
      ctaUrl: `${APP_URL}/loans/${loanId}`,
    }),
  };
}

/**
 * Email sent to lender when they accept a loan
 */
export function getLoanAcceptedLenderEmail(params: {
  lenderName: string;
  borrowerName: string;
  amount: number;
  currency: string;
  loanId: string;
}): { subject: string; html: string } {
  const { lenderName, borrowerName, amount, currency, loanId } = params;
  
  return {
    subject: 'You Accepted a Loan!',
    html: emailWrapper({
      title: '✅ Loan Accepted',
      content: `
        <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${lenderName}! 👋</p>
        <p style="color: #166534;">You've accepted a loan request from <strong>${borrowerName}</strong>.</p>
        
        <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">Loan Amount</p>
          <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0;">${currency} ${amount.toLocaleString()}</p>
          <p style="color: #6b7280; margin: 0;">to ${borrowerName}</p>
        </div>
        
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border: 1px solid #fcd34d;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>Next Step:</strong> Send the funds to the borrower to activate the loan.
          </p>
        </div>
      `,
      ctaText: 'Manage Loan',
      ctaUrl: `${APP_URL}/loans/${loanId}`,
    }),
  };
}

// ============================================
