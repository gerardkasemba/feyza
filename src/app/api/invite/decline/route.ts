import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email-core';
import { emailWrapper } from '@/lib/email-core';

const log = logger('invite-decline');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Find the loan with borrower details before updating
    const { data: loan, error: fetchError } = await supabase
      .from('loans')
      .select('id, amount, currency, borrower:borrower_id(id, full_name, email)')
      .eq('invite_token', token)
      .single();

    if (fetchError || !loan) {
      return NextResponse.json({ error: 'Loan not found or already processed' }, { status: 404 });
    }

    // Update the loan status to declined
    const { error: updateError } = await supabase
      .from('loans')
      .update({ status: 'declined' })
      .eq('invite_token', token);

    if (updateError) {
      log.error('Error declining loan:', updateError);
      return NextResponse.json({ error: 'Failed to decline loan' });
    }

    // Send notification email to borrower about declined request
    const borrower = Array.isArray(loan.borrower) ? loan.borrower[0] : loan.borrower;
    if (borrower?.email) {
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const { subject, html } = {
        subject: 'Your Loan Request Was Declined',
        html: emailWrapper({
          title: '❌ Loan Request Declined',
          content: `
            <p style="font-size: 18px; color: #374151; margin-top: 0;">Hi ${borrower.full_name || 'there'},</p>
            <p style="color: #374151;">Unfortunately, the lender has declined your loan request for <strong>${loan.currency || 'USD'} ${Number(loan.amount).toLocaleString()}</strong>.</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                No funds were transferred and no action is required on your part. You can submit a new loan request at any time.
              </p>
            </div>
          `,
          ctaText: 'Request a New Loan',
          ctaUrl: `${APP_URL}/loans/new`,
          footerNote: 'If you have questions, reply to this email or contact support@feyza.app',
        }),
      };

      const emailResult = await sendEmail({ to: borrower.email, subject, html });
      if (!emailResult.success) {
        // Non-fatal — loan is already declined, just log the failure
        log.warn(`Failed to send decline email to borrower: ${borrower.email} - ${emailResult.error}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Error declining invite:', error);
    return NextResponse.json({ error: 'Internal server error' });
  }
}
