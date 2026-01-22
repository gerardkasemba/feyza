import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getPaymentConfirmationEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, loanId, paymentId, amount, businessId, borrowerName } = body;

    const supabase = await createServiceRoleClient();

    // Handle direct loan request notification to business
    if (type === 'direct_loan_request') {
      return await handleDirectLoanRequest(supabase, { loanId, businessId, borrowerName, amount });
    }

    // Original payment notification logic
    // Get loan with lender info
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        *,
        borrower:users!borrower_id(*),
        lender:users!lender_id(*)
      `)
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Send email to lender (if they have an account)
    if (loan.lender?.email) {
      const { subject, html } = getPaymentConfirmationEmail({
        recipientName: loan.lender.full_name,
        amount,
        currency: loan.currency,
        loanId: loan.id,
        role: 'lender',
      });

      await sendEmail({
        to: loan.lender.email,
        subject,
        html,
      });
    }

    // If personal loan, send to invite email
    if (loan.invite_email && !loan.lender_id) {
      const { subject, html } = getPaymentConfirmationEmail({
        recipientName: 'Lender',
        amount,
        currency: loan.currency,
        loanId: loan.id,
        role: 'lender',
      });

      await sendEmail({
        to: loan.invite_email,
        subject,
        html,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending payment notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleDirectLoanRequest(
  supabase: any,
  params: { loanId: string; businessId: string; borrowerName: string; amount: number }
) {
  const { loanId, businessId, borrowerName, amount } = params;

  console.log('[Notification] Handling direct loan request:', { loanId, businessId, borrowerName, amount });

  // Get business with owner info
  const { data: business, error: bizError } = await supabase
    .from('business_profiles')
    .select('*, owner:users!user_id(*)')
    .eq('id', businessId)
    .single();

  if (bizError || !business) {
    console.error('[Notification] Business not found:', bizError);
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  // Get loan details
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .single();

  if (loanError) {
    console.error('[Notification] Loan not found:', loanError);
  }

  // Create in-app notification for business owner
  if (business.owner?.id) {
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: business.owner.id,
      type: 'loan_request',
      title: 'New Loan Request',
      message: `${borrowerName || 'A borrower'} has requested a loan of $${amount?.toLocaleString() || 0} from ${business.business_name}`,
      data: { loan_id: loanId, business_id: businessId, amount },
      is_read: false,
    });

    if (notifError) {
      console.error('[Notification] Failed to create in-app notification:', notifError);
    } else {
      console.log('[Notification] In-app notification created for user:', business.owner.id);
    }
  }

  // Send email to business owner
  if (business.owner?.email) {
  const emailHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>

  <body style="
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    line-height:1.6;
    color:#333;
    max-width:600px;
    margin:0 auto;
    padding:20px;
    background:#f9fafb;
  ">

    <!-- ===== HEADER ===== -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="
          background:linear-gradient(135deg,#059669 0%,#047857 100%);
          padding:30px;
          border-radius:16px 16px 0 0;
          text-align:center;
        ">
          <!-- Logo -->
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

          <h1 style="color:white;margin:0;font-size:26px;font-weight:700;">
            New Loan Request
          </h1>
        </td>
      </tr>
    </table>

    <!-- ===== BODY ===== -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="
          background:#ffffff;
          padding:30px;
          border-radius:0 0 16px 16px;
          border:1px solid #e5e7eb;
          border-top:none;
        ">
          <p style="font-size:17px;margin-bottom:20px;">
            Hi <strong>${business.business_name}</strong> team,
          </p>

          <p>
            You have received a new loan request from
            <strong>${borrowerName || 'a borrower'}</strong>.
          </p>

          <!-- Request Card -->
          <div style="
            background:#f0fdf4;
            padding:20px;
            border-radius:12px;
            margin:20px 0;
            border:1px solid #bbf7d0;
          ">
            <div style="margin-bottom:10px;">
              <span style="color:#065f46;font-size:14px;">
                Requested Amount
              </span>
              <div style="
                font-weight:700;
                font-size:26px;
                color:#059669;
                margin-top:4px;
              ">
                $${amount?.toLocaleString() || 0}
              </div>
            </div>

            ${loan?.purpose ? `
            <div style="border-top:1px solid #bbf7d0;padding-top:10px;margin-top:10px;">
              <span style="color:#065f46;font-size:14px;">
                Purpose
              </span>
              <p style="margin:5px 0 0 0;">
                ${loan.purpose}
              </p>
            </div>
            ` : ''}
          </div>

          <p style="color:#6b7280;font-size:14px;">
            Review this request in your business dashboard to accept or decline.
          </p>

          <!-- CTA -->
          <a
            href="${APP_URL}/business"
            style="
              display:block;
              background:#059669;
              color:white;
              text-decoration:none;
              padding:16px 32px;
              border-radius:10px;
              font-weight:600;
              text-align:center;
              margin:24px 0;
            "
          >
            View Loan Request →
          </a>
        </td>
      </tr>
    </table>

    <!-- ===== FOOTER ===== -->
    <p style="
      color:#9ca3af;
      font-size:12px;
      text-align:center;
      margin-top:20px;
    ">
      Sent via Feyza • Simple loan tracking for everyone
    </p>

  </body>
  </html>
  `;
    const result = await sendEmail({
      to: business.owner.email,
      subject: `New loan request from ${borrowerName || 'a borrower'} - $${amount?.toLocaleString() || 0}`,
      html: emailHtml,
    });

    if (result.success) {
      console.log('[Notification] Email sent to business owner:', business.owner.email);
    } else {
      console.error('[Notification] Failed to send email:', result.error);
    }
  } else {
    console.log('[Notification] No business owner email found');
  }

  return NextResponse.json({ success: true });
}
