import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getLoanAcceptedEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, paypalEmail, lenderName, interestRate, interestType } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    if (!paypalEmail) {
      return NextResponse.json({ error: 'PayPal email is required' }, { status: 400 });
    }

    if (!lenderName) {
      return NextResponse.json({ error: 'Lender name is required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Find the loan by invite token
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        *,
        borrower:users!borrower_id(*)
      `)
      .eq('invite_token', token)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
    }

    if (loan.invite_accepted) {
      return NextResponse.json({ error: 'Already accepted' }, { status: 400 });
    }

    // Check if borrower has signed
    if (!loan.borrower_signed) {
      return NextResponse.json({ error: 'Borrower must sign the agreement first' }, { status: 400 });
    }

    // Create or update guest lender record
    let guestLender;
    const { data: existingLender } = await supabase
      .from('guest_lenders')
      .select('*')
      .eq('email', loan.invite_email)
      .single();

    if (existingLender) {
      // Update existing guest lender
      const { data: updated, error: updateErr } = await supabase
        .from('guest_lenders')
        .update({
          full_name: lenderName,
          paypal_email: paypalEmail,
          paypal_connected: true,
          total_loans: existingLender.total_loans + 1,
          total_amount_lent: existingLender.total_amount_lent + loan.amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLender.id)
        .select()
        .single();
      
      guestLender = updated;
    } else {
      // Create new guest lender
      const accessToken = uuidv4();
      const { data: newLender, error: createErr } = await supabase
        .from('guest_lenders')
        .insert({
          email: loan.invite_email,
          full_name: lenderName,
          paypal_email: paypalEmail,
          paypal_connected: true,
          total_loans: 1,
          total_amount_lent: loan.amount,
          access_token: accessToken,
          access_token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        })
        .select()
        .single();
      
      guestLender = newLender;
    }

    // Calculate new totals if lender set interest rate
    let totalInterest = loan.total_interest || 0;
    let totalAmount = loan.total_amount;
    let repaymentAmount = loan.repayment_amount;

    if (interestRate !== undefined && interestRate > 0) {
      // Recalculate with lender's interest rate
      const termMonths = loan.total_installments * (
        loan.repayment_frequency === 'weekly' ? 0.25 :
        loan.repayment_frequency === 'biweekly' ? 0.5 : 1
      );

      if (interestType === 'simple') {
        totalInterest = loan.amount * (interestRate / 100 / 12) * termMonths;
      } else {
        const r = interestRate / 100;
        const t = termMonths / 12;
        totalInterest = loan.amount * Math.pow(1 + r / 12, 12 * t) - loan.amount;
      }

      totalAmount = loan.amount + totalInterest;
      repaymentAmount = totalAmount / loan.total_installments;
    }

    // Update the loan
    const { error: updateError } = await supabase
      .from('loans')
      .update({
        invite_accepted: true,
        status: 'active',
        guest_lender_id: guestLender?.id,
        // Lender's interest rate settings
        lender_interest_rate: interestRate || 0,
        lender_interest_type: interestType || 'simple',
        interest_set_by_lender: interestRate > 0,
        // Update totals if lender set interest
        interest_rate: interestRate || loan.interest_rate,
        interest_type: interestType || loan.interest_type,
        total_interest: Math.round(totalInterest * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
        repayment_amount: Math.round(repaymentAmount * 100) / 100,
        amount_remaining: Math.round(totalAmount * 100) / 100,
        // Lender signed
        lender_signed: true,
        lender_signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', loan.id);

    if (updateError) {
      console.error('Error updating loan:', updateError);
      return NextResponse.json({ error: 'Failed to accept loan' }, { status: 500 });
    }

    // Update payment schedule if interest was changed
    if (interestRate > 0) {
      // Delete existing schedule
      await supabase
        .from('payment_schedule')
        .delete()
        .eq('loan_id', loan.id);

      // Create new schedule with updated amounts
      const scheduleItems = [];
      const principalPerPayment = loan.amount / loan.total_installments;
      const interestPerPayment = totalInterest / loan.total_installments;
      
      for (let i = 0; i < loan.total_installments; i++) {
        const dueDate = new Date(loan.start_date);
        if (loan.repayment_frequency === 'weekly') {
          dueDate.setDate(dueDate.getDate() + i * 7);
        } else if (loan.repayment_frequency === 'biweekly') {
          dueDate.setDate(dueDate.getDate() + i * 14);
        } else {
          dueDate.setMonth(dueDate.getMonth() + i);
        }

        scheduleItems.push({
          loan_id: loan.id,
          due_date: format(dueDate, 'yyyy-MM-dd'),
          amount: Math.round(repaymentAmount * 100) / 100,
          principal_amount: Math.round(principalPerPayment * 100) / 100,
          interest_amount: Math.round(interestPerPayment * 100) / 100,
          is_paid: false,
        });
      }

      await supabase.from('payment_schedule').insert(scheduleItems);
    }

    // Send notification email to borrower
    if (loan.borrower?.email) {
      try {
        const { subject, html } = getLoanAcceptedEmail({
          borrowerName: loan.borrower.full_name,
          lenderName: lenderName,
          amount: loan.amount,
          currency: loan.currency,
          loanId: loan.id,
        });

        await sendEmail({
          to: loan.borrower.email,
          subject,
          html,
        });
      } catch (emailError) {
        console.error('Error sending acceptance email:', emailError);
      }
    }

    // Create notification for borrower
    try {
      await supabase.from('notifications').insert({
        user_id: loan.borrower_id,
        loan_id: loan.id,
        type: 'loan_accepted',
        title: 'Loan Accepted! 🎉',
        message: `${lenderName} has accepted your loan request for ${loan.currency} ${loan.amount}.${interestRate > 0 ? ` Interest rate: ${interestRate}% APR.` : ''}`,
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    // Send lender their dashboard link
    if (guestLender?.access_token) {
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const dashboardUrl = `${APP_URL}/lender/${guestLender.access_token}`;
      
      try {
        await sendEmail({
          to: loan.invite_email,
          subject: 'Your Lending Dashboard - Feyza',
          html: `
          <!DOCTYPE html>
          <html lang="en">
            <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;background-color:#f9fafb;">

              <!-- Main Card -->
              <div style="background:white;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

                <!-- Header -->
                <div style="background:linear-gradient(135deg,#059669 0%,#047857 100%);padding:32px 24px;text-align:center;">

                  <!-- Logo (email-safe centered) -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding-bottom:16px;">
                        <img
                          src="https://feyza.app/feyza.png"
                          alt="Feyza Logo"
                          height="42"
                          style="display:block;height:42px;width:auto;border:0;outline:none;text-decoration:none;"
                        />
                      </td>
                    </tr>
                  </table>

                  <h1 style="color:white;margin:0;font-size:24px;font-weight:700;">
                    Your Lending Dashboard
                  </h1>
                </div>

                <!-- Content -->
                <div style="padding:28px 24px;background:#ffffff;">
                  <p style="margin:0 0 16px 0;color:#111827;">
                    Hi <strong>${lenderName}</strong>,
                  </p>

                  <p style="margin:0 0 20px 0;color:#374151;line-height:1.6;">
                    Thanks for accepting the loan request. You can now track all your loans,
                    repayments, and borrower activity from your personal Feyza dashboard.
                  </p>

                  <!-- CTA -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center">
                        <a
                          href="${dashboardUrl}"
                          style="display:inline-block;background:#059669;color:white;text-decoration:none;
                                padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">
                          View Your Dashboard →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:20px 0 0 0;color:#6b7280;font-size:12px;text-align:center;">
                    Bookmark this link to access your dashboard anytime.
                  </p>
                </div>

                <!-- Footer -->
                <div style="background:#f0fdf4;padding:16px 24px;border-top:1px solid #bbf7d0;text-align:center;">
                  <p style="margin:0;color:#065f46;font-size:12px;">
                    This is an automated message from Feyza.
                  </p>
                </div>

              </div>
            </body>
          </html>
          `,
        });
      } catch (emailError) {
        console.error('Error sending dashboard email:', emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
