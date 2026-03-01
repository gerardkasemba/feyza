import { emailWrapper } from './email-core';

// VERIFICATION EMAILS
// ============================================

/**
 * Email sent when user verification is approved
 */
export function getVerificationApprovedEmail(params: {
  userName: string;
  isReverification?: boolean;
}): { subject: string; html: string } {
  const { userName, isReverification } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: isReverification ? '✅ Re-verification Complete - Feyza' : '🎉 Verification Approved - Feyza',
    html: emailWrapper({
      title: isReverification ? '✅ Re-verification Complete' : '🎉 You\'re Verified!',
      subtitle: 'Your identity has been confirmed',
      content: `
        <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${userName}! 👋</p>
        <p style="color: #374151;">${isReverification 
          ? 'Great news! Your re-verification has been approved. Your account is now fully active again.'
          : 'Congratulations! Your identity verification has been approved. You can now access all features on Feyza.'
        }</p>
        
        <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
          <div style="text-align: center;">
            <div style="width: 60px; height: 60px; background: #d1fae5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 30px;">✓</span>
            </div>
            <h3 style="color: #065f46; margin: 0;">Verified Status</h3>
            <p style="color: #6b7280; margin: 10px 0 0; font-size: 14px;">Valid for 3 months</p>
          </div>
        </div>
        
        <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="color: #065f46; margin: 0; font-size: 14px;">
            <strong>What you can do now:</strong><br>
            ✓ Request loans from verified lenders<br>
            ✓ Receive funds directly to your bank<br>
            ✓ Build your borrower reputation
          </p>
        </div>
      `,
      ctaText: 'Go to Dashboard',
      ctaUrl: `${APP_URL}/dashboard`,
      footerNote: 'You\'ll need to re-verify every 3 months to maintain your verified status.'
    })
  };
}

/**
 * Email sent when user verification is rejected
 */
export function getVerificationRejectedEmail(params: {
  userName: string;
  reason?: string;
}): { subject: string; html: string } {
  const { userName, reason } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: '⚠️ Verification Update Required - Feyza',
    html: emailWrapper({
      title: '⚠️ Verification Update Required',
      subtitle: 'Additional information needed',
      content: `
        <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${userName},</p>
        <p style="color: #374151;">We were unable to verify your identity with the documents provided. Please review the feedback below and resubmit your verification.</p>
        
        <div style="background: #fef2f2; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #fecaca;">
          <h4 style="color: #991b1b; margin: 0 0 10px 0;">Reason:</h4>
          <p style="color: #7f1d1d; margin: 0;">${reason || 'The submitted documents did not meet our verification requirements.'}</p>
        </div>
        
        <div style="background: white; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e5e7eb;">
          <p style="color: #374151; margin: 0; font-size: 14px;">
            <strong>Common issues:</strong><br>
            • Blurry or unclear document photos<br>
            • ID document is expired<br>
            • Face not clearly visible in selfie<br>
            • Information doesn't match
          </p>
        </div>
        
        <p style="color: #374151;">Don't worry — you can resubmit your verification at any time with corrected documents.</p>
      `,
      ctaText: 'Resubmit Verification',
      ctaUrl: `${APP_URL}/verify`,
      footerNote: 'If you believe this was a mistake, please contact support@feyza.app'
    })
  };
}

/**
 * Email sent when business verification is approved
 */
export function getBusinessVerificationApprovedEmail(params: {
  ownerName: string;
  businessName: string;
}): { subject: string; html: string } {
  const { ownerName, businessName } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: `🎉 ${businessName} is Now Verified - Feyza`,
    html: emailWrapper({
      title: '🎉 Business Verified!',
      subtitle: `${businessName} is now a verified lender`,
      content: `
        <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${ownerName}! 👋</p>
        <p style="color: #374151;">Great news! <strong>${businessName}</strong> has been verified as a lending business on Feyza. You can now start lending to borrowers.</p>
        
        <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
          <div style="width: 60px; height: 60px; background: #d1fae5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <span style="font-size: 30px;">🏢</span>
          </div>
          <h3 style="color: #065f46; margin: 0;">${businessName}</h3>
          <p style="color: #059669; margin: 10px 0 0; font-size: 14px; font-weight: 600;">✓ Verified Lender</p>
        </div>
        
        <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="color: #065f46; margin: 0; font-size: 14px;">
            <strong>Next steps:</strong><br>
            ✓ Complete your business profile<br>
            ✓ Set up your lending preferences<br>
            ✓ Share your public lending page<br>
            ✓ Start reviewing loan requests
          </p>
        </div>
      `,
      ctaText: 'View Business Dashboard',
      ctaUrl: `${APP_URL}/business/dashboard`,
      footerNote: 'Thank you for choosing Feyza for your lending business.'
    })
  };
}

/**
 * Email sent when business verification is rejected
 */
export function getBusinessVerificationRejectedEmail(params: {
  ownerName: string;
  businessName: string;
  reason?: string;
}): { subject: string; html: string } {
  const { ownerName, businessName, reason } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: `⚠️ ${businessName} Verification Update - Feyza`,
    html: emailWrapper({
      title: '⚠️ Verification Update Required',
      subtitle: `Additional information needed for ${businessName}`,
      content: `
        <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${ownerName},</p>
        <p style="color: #374151;">We were unable to verify <strong>${businessName}</strong> with the information provided. Please review the feedback and update your business profile.</p>
        
        <div style="background: #fef2f2; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #fecaca;">
          <h4 style="color: #991b1b; margin: 0 0 10px 0;">Reason:</h4>
          <p style="color: #7f1d1d; margin: 0;">${reason || 'The business information provided did not meet our verification requirements.'}</p>
        </div>
        
        <p style="color: #374151;">Please update your business information and resubmit for verification.</p>
      `,
      ctaText: 'Update Business Profile',
      ctaUrl: `${APP_URL}/business/settings`,
      footerNote: 'If you believe this was a mistake, please contact support@feyza.app'
    })
  };
}

/**
 * Email sent when re-verification is due soon (warning)
 */
export function getReverificationReminderEmail(params: {
  userName: string;
  daysRemaining: number;
  dueDate: string;
}): { subject: string; html: string } {
  const { userName, daysRemaining, dueDate } = params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    subject: `⏰ Re-verification Due in ${daysRemaining} Days - Feyza`,
    html: emailWrapper({
      title: '⏰ Re-verification Reminder',
      subtitle: `Your verification expires on ${dueDate}`,
      content: `
        <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${userName}! 👋</p>
        <p style="color: #374151;">Your Feyza verification will expire in <strong>${daysRemaining} days</strong>. To continue using all features without interruption, please complete re-verification before <strong>${dueDate}</strong>.</p>
        
        <div style="background: #fffbeb; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #fcd34d; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">⏰</div>
          <h3 style="color: #92400e; margin: 0;">${daysRemaining} Days Remaining</h3>
          <p style="color: #a16207; margin: 10px 0 0; font-size: 14px;">Expires: ${dueDate}</p>
        </div>
        
        <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="color: #065f46; margin: 0; font-size: 14px;">
            <strong>Quick & Easy:</strong><br>
            Re-verification only takes 1 minute — just a quick selfie!
          </p>
        </div>
      `,
      ctaText: 'Re-verify Now',
      ctaUrl: `${APP_URL}/verify`,
      footerNote: 'If your verification expires, you won\'t be able to request new loans until re-verified.'
    })
  };
}
