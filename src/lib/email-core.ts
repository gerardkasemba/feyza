import { logger } from '@/lib/logger';
const log = logger('email-core');
import nodemailer from 'nodemailer';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
export { APP_URL };

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

export async function sendEmail({ to, subject, html }: EmailParams): Promise<{ success: boolean; data?: unknown; error?: unknown }> {
  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    log.warn('=== EMAIL NOT SENT (SMTP not configured) ===');
    log.warn('To:', to);
    log.warn('Subject:', subject);
    log.warn('Set SMTP_USER and SMTP_PASS in your .env.local');
    log.warn('=============================================');
    return { success: true, data: { id: 'dev-mode-no-email' } };
  }

  try {
    log.info('Sending email to:', to);
    log.info('From:', FROM_EMAIL);
    log.info('Subject:', subject);

    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: to,
      subject: subject,
      html: html,
    });

    log.info('Email sent successfully! Message ID:', info.messageId);
    return { success: true, data: { id: info.messageId } };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log.error('Email send error:', errMsg);
    return { success: false, error: errMsg };
  }
}

// ============================================
// BASE EMAIL WRAPPER
// ============================================

/**
 * Base email wrapper with consistent Feyza branding
 */
export function emailWrapper(params: {
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
