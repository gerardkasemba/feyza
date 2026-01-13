import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getLoanAcceptedEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

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
          due_date: dueDate.toISOString(),
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
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <!-- Header with logo and gradient -->
                <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                  <!-- Logo -->
                  <div style="margin-bottom: 20px;">
                    <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                        alt="Feyza Logo" 
                        style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                  </div>
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">📊 Your Lending Dashboard</h1>
                  <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Track & Manage Your Loans</p>
                </div>
                
                <!-- Content area -->
                <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                  <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${lenderName},</p>
                  
                  <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                    <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">Welcome to Your Dashboard</h3>
                    <p style="color: #166534; line-height: 1.6; margin-bottom: 15px;">
                      Thanks for accepting the loan request! You can now track all your loans and repayments using your personal dashboard.
                    </p>
                    <p style="color: #166534; line-height: 1.6;">
                      Your dashboard gives you complete visibility into:
                    </p>
                    <ul style="margin: 15px 0; padding-left: 20px; color: #065f46;">
                      <li style="margin-bottom: 8px; line-height: 1.6;">Active loan status and details</li>
                      <li style="margin-bottom: 8px; line-height: 1.6;">Repayment schedules and history</li>
                      <li style="margin-bottom: 8px; line-height: 1.6;">Borrower information and communication</li>
                      <li style="line-height: 1.6;">Financial reports and analytics</li>
                    </ul>
                  </div>
                  
                  <!-- Main CTA Button -->
                  <a href="${dashboardUrl}" 
                    style="display: block; background: linear-gradient(to right, #059669, #047857); 
                            color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                            font-weight: 600; text-align: center; margin: 30px 0; font-size: 16px;
                            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                    onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                    View Your Dashboard →
                  </a>
                  
                  <!-- Quick access tips -->
                  <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #86efac;">
                    <h4 style="color: #065f46; margin: 0 0 10px 0; font-weight: 600; font-size: 16px;">🔗 Quick Access Tips:</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                      <li style="margin-bottom: 8px; font-size: 14px;">Bookmark the dashboard link for easy access</li>
                      <li style="margin-bottom: 8px; font-size: 14px;">Set up notifications for repayment reminders</li>
                      <li style="font-size: 14px;">Download the mobile app for on-the-go access</li>
                    </ul>
                  </div>
                  
                  <!-- Dashboard features preview -->
                  <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0;">
                    <h4 style="color: #065f46; margin: 0 0 15px 0; font-weight: 600; font-size: 18px;">Dashboard Features:</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">
                      <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <div style="color: #059669; font-weight: 600; margin-bottom: 5px;">📈 Overview</div>
                        <div style="color: #047857; font-size: 13px;">Total portfolio and performance metrics</div>
                      </div>
                      <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <div style="color: #059669; font-weight: 600; margin-bottom: 5px;">💰 Loans</div>
                        <div style="color: #047857; font-size: 13px;">Active and completed loan details</div>
                      </div>
                      <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <div style="color: #059669; font-weight: 600; margin-bottom: 5px;">📅 Schedule</div>
                        <div style="color: #047857; font-size: 13px;">Upcoming repayment dates</div>
                      </div>
                      <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <div style="color: #059669; font-weight: 600; margin-bottom: 5px;">📊 Reports</div>
                        <div style="color: #047857; font-size: 13px;">Financial reports and statements</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Footer -->
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                    <p style="margin: 0 0 10px 0; font-weight: 600;">Need Help?</p>
                    <p style="margin: 0;">
                      <a href="${APP_URL}/help/dashboard" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                        Dashboard Guide
                      </a>
                      <a href="${APP_URL}/contact" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                        Contact Support
                      </a>
                      <a href="${APP_URL}/resources" style="color: #059669; text-decoration: none; font-weight: 500;">
                        Resources
                      </a>
                    </p>
                  </div>
                </div>
                
                <!-- Signature -->
                <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                  <p style="margin: 0;">Feyza • Your Trusted Lending Platform</p>
                  <p style="margin: 5px 0 0 0; font-size: 11px;">This link is unique to your account. Keep it secure.</p>
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
