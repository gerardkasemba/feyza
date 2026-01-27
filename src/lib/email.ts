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

// ============================================
// BASE EMAIL WRAPPER
// ============================================

/**
 * Base email wrapper with consistent Feyza branding
 */
function emailWrapper(params: {
  title: string;
  subtitle?: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
}): string {
  const { title, subtitle, content, ctaText, ctaUrl, footerNote } = params;
  
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Feyza</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
    
    <!-- HEADER -->
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding-bottom: 15px;">
            <img src="https://feyza.app/feyza.png" alt="Feyza Logo" height="40" style="display:block; height:40px; width:auto; border:0; outline:none; text-decoration:none;" />
          </td>
        </tr>
      </table>
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${title}</h1>
      ${subtitle ? `<p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">${subtitle}</p>` : ''}
    </div>
    
    <!-- CONTENT -->
    <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
      ${content}
      
      ${ctaText && ctaUrl ? `
      <div style="text-align: center; margin: 25px 0;">
        <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(5,150,105,0.2);">
          ${ctaText} →
        </a>
      </div>
      ` : ''}
      
      ${footerNote ? `
      <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #bbf7d0; font-size: 13px; color: #6b7280; text-align: center;">
        ${footerNote}
      </div>
      ` : ''}
    </div>
    
    <!-- FOOTER -->
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">
      Feyza • Secure Lending Platform<br>
      <a href="mailto:support@feyza.app" style="color: #059669; text-decoration: none;">support@feyza.app</a>
    </div>
  </body>
</html>
`;
}

// ============================================
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
// LOAN CANCELLED EMAIL
// ============================================

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

// ============================================
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
