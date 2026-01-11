import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getOverduePaymentEmail, getMissedPaymentLenderNotification, getPaymentReminderEmail, getCashPickupReminderEmail } from '@/lib/email';

// This endpoint should be called by a cron job daily
// e.g., using Vercel Cron, Railway Cron, or external service
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret OR allow if no secret is set (for admin testing)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // If CRON_SECRET is set, require it for external cron jobs
    // But also allow requests without authorization for admin testing
    if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    let remindersSent = 0;
    let overdueRemindersSent = 0;
    let lenderNotificationsSent = 0;
    let cashPickupRemindersSent = 0;

    // =====================================================
    // 1. SEND OVERDUE PAYMENT REMINDERS
    // =====================================================
    
    // Get all overdue payments that haven't had a reminder sent in the last 24 hours
    const { data: overduePayments, error: overdueError } = await supabase
      .from('payment_schedule')
      .select(`
        *,
        loan:loans(
          id,
          amount,
          currency,
          borrower_id,
          borrower_invite_email,
          borrower_access_token,
          lender_id,
          business_lender_id,
          invite_email
        )
      `)
      .eq('status', 'pending')
      .lt('due_date', today);

    if (overdueError) {
      console.error('Error fetching overdue payments:', overdueError);
    }

    if (overduePayments && overduePayments.length > 0) {
      for (const payment of overduePayments) {
        // Check if reminder was sent in last 24 hours
        if (payment.overdue_reminder_sent_at) {
          const lastSent = new Date(payment.overdue_reminder_sent_at);
          const hoursSinceLastReminder = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastReminder < 24) continue;
        }

        const loan = payment.loan;
        if (!loan) continue;

        const daysOverdue = Math.floor((now.getTime() - new Date(payment.due_date).getTime()) / (1000 * 60 * 60 * 24));

        // Get borrower info - support both registered users and guest borrowers
        let borrowerEmail: string | null = null;
        let borrowerName = 'there';
        
        if (loan.borrower_id) {
          const { data: borrower } = await supabase
            .from('users')
            .select('email, full_name')
            .eq('id', loan.borrower_id)
            .single();
          if (borrower) {
            borrowerEmail = borrower.email;
            borrowerName = borrower.full_name || 'there';
          }
        }
        
        // For guest borrowers, use borrower_invite_email
        if (!borrowerEmail && loan.borrower_invite_email) {
          borrowerEmail = loan.borrower_invite_email;
        }

        if (!borrowerEmail) continue;

        // Get lender info
        let lenderName = 'your lender';
        let lenderEmail: string | null = null;
        
        if (loan.lender_id) {
          const { data: lender } = await supabase
            .from('users')
            .select('email, full_name')
            .eq('id', loan.lender_id)
            .single();
          if (lender) {
            lenderName = lender.full_name || 'Your lender';
            lenderEmail = lender.email;
          }
        } else if (loan.business_lender_id) {
          const { data: business } = await supabase
            .from('business_profiles')
            .select('business_name, contact_email')
            .eq('id', loan.business_lender_id)
            .single();
          if (business) {
            lenderName = business.business_name;
            lenderEmail = business.contact_email;
          }
        } else if (loan.invite_email) {
          lenderEmail = loan.invite_email;
        }

        try {
          // Build loan link - use guest access token for guest borrowers
          const loanLink = loan.borrower_access_token 
            ? `/borrower/${loan.borrower_access_token}`
            : `/loans/${loan.id}`;
          
          // Send email to borrower
          const { subject, html } = getOverduePaymentEmail({
            borrowerName,
            lenderName,
            amount: payment.amount,
            currency: loan.currency || 'USD',
            dueDate: new Date(payment.due_date).toLocaleDateString(),
            daysOverdue,
            loanId: loan.id,
            loanLink,
          });

          await sendEmail({ to: borrowerEmail, subject, html });

          // Update reminder sent timestamp
          await supabase
            .from('payment_schedule')
            .update({ 
              overdue_reminder_sent_at: now.toISOString(),
              status: 'overdue', // Mark as overdue
            })
            .eq('id', payment.id);

          // Update borrower's missed payment count (only for registered users, on first overdue)
          if (!payment.overdue_reminder_sent_at && loan.borrower_id) {
            await supabase
              .from('users')
              .update({
                payments_missed: supabase.rpc('increment_missed_payments', { user_id: loan.borrower_id }),
              })
              .eq('id', loan.borrower_id);
          }

          overdueRemindersSent++;

          // Also notify lender (first time only)
          if (lenderEmail && !payment.overdue_reminder_sent_at) {
            const lenderNotif = getMissedPaymentLenderNotification({
              lenderName: lenderName,
              borrowerName: borrowerName || 'A borrower',
              amount: payment.amount,
              currency: loan.currency || 'USD',
              dueDate: new Date(payment.due_date).toLocaleDateString(),
              daysOverdue,
              loanId: loan.id,
            });

            await sendEmail({
              to: lenderEmail,
              subject: lenderNotif.subject,
              html: lenderNotif.html,
            });
            lenderNotificationsSent++;
          }
        } catch (emailError) {
          console.error(`Failed to send overdue reminder to ${borrowerEmail}:`, emailError);
        }
      }
    }

    // =====================================================
    // 2. SEND UPCOMING PAYMENT REMINDERS (based on user preferences)
    // =====================================================
    
    // Get all pending payments within the next 7 days (max reminder window)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const maxReminderDate = sevenDaysFromNow.toISOString().split('T')[0];

    const { data: upcomingPayments, error: upcomingError } = await supabase
      .from('payment_schedule')
      .select(`
        *,
        loan:loans(
          id,
          currency,
          borrower_id,
          borrower_invite_email,
          borrower_access_token,
          lender_id,
          business_lender_id
        )
      `)
      .eq('status', 'pending')
      .eq('is_paid', false)
      .gte('due_date', today)
      .lte('due_date', maxReminderDate)
      .is('reminder_sent_at', null);

    if (upcomingError) {
      console.error('Error fetching upcoming payments:', upcomingError);
    }

    if (upcomingPayments && upcomingPayments.length > 0) {
      for (const payment of upcomingPayments) {
        const loan = payment.loan;
        if (!loan) continue;

        // Get borrower info - support both registered users and guest borrowers
        let upcomingBorrowerEmail: string | null = null;
        let upcomingBorrowerName = 'there';
        let emailRemindersEnabled = true; // Default true for guest borrowers
        let reminderDaysBefore = 3; // Default 3 days

        if (loan.borrower_id) {
          const { data: borrower } = await supabase
            .from('users')
            .select('email, full_name, email_reminders, reminder_days_before')
            .eq('id', loan.borrower_id)
            .single();
          
          if (borrower) {
            upcomingBorrowerEmail = borrower.email;
            upcomingBorrowerName = borrower.full_name || 'there';
            emailRemindersEnabled = borrower.email_reminders !== false;
            reminderDaysBefore = borrower.reminder_days_before || 3;
          }
        }
        
        // For guest borrowers, use borrower_invite_email
        if (!upcomingBorrowerEmail && loan.borrower_invite_email) {
          upcomingBorrowerEmail = loan.borrower_invite_email;
        }

        if (!upcomingBorrowerEmail || !emailRemindersEnabled) continue;

        // Calculate days until due
        const daysUntilDue = Math.ceil((new Date(payment.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Only send if we're within the reminder window
        if (daysUntilDue > reminderDaysBefore) continue;

        try {
          // Build loan link - use guest access token for guest borrowers
          const loanLink = loan.borrower_access_token 
            ? `/borrower/${loan.borrower_access_token}`
            : `/loans/${loan.id}`;
          
          const { subject, html } = getPaymentReminderEmail({
            borrowerName: upcomingBorrowerName,
            amount: payment.amount,
            currency: loan.currency || 'USD',
            dueDate: new Date(payment.due_date).toLocaleDateString(),
            loanId: loan.id,
            loanLink,
          });

          await sendEmail({ to: upcomingBorrowerEmail, subject, html });

          // Update reminder sent timestamp
          await supabase
            .from('payment_schedule')
            .update({ reminder_sent_at: now.toISOString() })
            .eq('id', payment.id);

          remindersSent++;
        } catch (emailError) {
          console.error(`Failed to send reminder to ${upcomingBorrowerEmail}:`, emailError);
        }
      }
    }

    // =====================================================
    // 3. SEND CASH PICKUP REMINDERS
    // =====================================================
    
    // Get cash pickups that are ready but not picked up, send reminder every 7 days
    const { data: pendingPickups, error: pickupError } = await supabase
      .from('disbursements')
      .select(`
        *,
        loan:loans(
          id,
          borrower_id,
          borrower:users!borrower_id(email, full_name)
        )
      `)
      .eq('status', 'ready_for_pickup')
      .eq('disbursement_method', 'cash_pickup');

    if (pickupError) {
      console.error('Error fetching pending pickups:', pickupError);
    }

    if (pendingPickups && pendingPickups.length > 0) {
      for (const pickup of pendingPickups) {
        // Check if reminder was sent in last 7 days
        if (pickup.last_reminder_sent_at) {
          const lastSent = new Date(pickup.last_reminder_sent_at);
          const daysSinceLastReminder = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceLastReminder < 7) continue;
        }

        const borrowerEmail = pickup.loan?.borrower?.email;
        if (!borrowerEmail) continue;

        const daysWaiting = Math.floor((now.getTime() - new Date(pickup.created_at).getTime()) / (1000 * 60 * 60 * 24));

        try {
          const { subject, html } = getCashPickupReminderEmail({
            borrowerName: pickup.loan?.borrower?.full_name || 'there',
            recipientName: pickup.recipient_name,
            amount: pickup.amount,
            currency: pickup.currency || 'USD',
            pickupLocation: pickup.pickup_location || 'the designated location',
            pickupCode: pickup.pickup_code || 'N/A',
            daysWaiting,
          });

          await sendEmail({ to: borrowerEmail, subject, html });

          // Update reminder tracking
          await supabase
            .from('disbursements')
            .update({
              last_reminder_sent_at: now.toISOString(),
              reminder_count: (pickup.reminder_count || 0) + 1,
            })
            .eq('id', pickup.id);

          cashPickupRemindersSent++;
        } catch (emailError) {
          console.error(`Failed to send cash pickup reminder to ${borrowerEmail}:`, emailError);
        }
      }
    }

    // =====================================================
    // 4. UPDATE BORROWER RATINGS
    // =====================================================
    
    // Get all users who have overdue payments and update their ratings
    const { data: usersWithOverdue } = await supabase
      .from('payment_schedule')
      .select('loan:loans(borrower_id)')
      .eq('status', 'overdue');

    const borrowerIds: string[] = [];
    if (usersWithOverdue) {
      for (const p of usersWithOverdue) {
        const loan = p.loan as any;
        if (loan?.borrower_id && !borrowerIds.includes(loan.borrower_id)) {
          borrowerIds.push(loan.borrower_id);
        }
      }
    }
    
    for (const borrowerId of borrowerIds) {
      try {
        // Get user's payment stats
        const { data: user } = await supabase
          .from('users')
          .select('total_payments_made, payments_on_time, payments_early, payments_late, payments_missed')
          .eq('id', borrowerId)
          .single();

        if (user && user.total_payments_made > 0) {
          const total = user.total_payments_made;
          const earlyRatio = (user.payments_early || 0) / total;
          const onTimeRatio = (user.payments_on_time || 0) / total;
          const lateRatio = (user.payments_late || 0) / total;
          const missedRatio = (user.payments_missed || 0) / total;

          let rating = 'neutral';
          if (earlyRatio > 0.5) {
            rating = 'great';
          } else if ((onTimeRatio + earlyRatio) > 0.8) {
            rating = 'good';
          } else if ((lateRatio + missedRatio) >= 0.3 && (lateRatio + missedRatio) < 0.5) {
            rating = 'poor';
          } else if (lateRatio > 0.5) {
            rating = 'bad';
          } else if (missedRatio > 0.7) {
            rating = 'worst';
          }

          await supabase
            .from('users')
            .update({
              borrower_rating: rating,
              borrower_rating_updated_at: now.toISOString(),
            })
            .eq('id', borrowerId);
        }
      } catch (error) {
        console.error(`Failed to update rating for user ${borrowerId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      remindersSent,
      overdueRemindersSent,
      lenderNotificationsSent,
      cashPickupRemindersSent,
      ratingsUpdated: borrowerIds.length,
    });
  } catch (error) {
    console.error('Error processing reminders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to check cron status (for debugging)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Payment reminder cron endpoint. Send POST request to trigger.',
    nextRun: 'Configure your cron job to call this endpoint daily.',
  });
}
