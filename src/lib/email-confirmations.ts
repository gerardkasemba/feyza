import { emailWrapper, APP_URL } from './email-core';

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

