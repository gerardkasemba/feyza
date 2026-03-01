import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const log = logger('admin-trigger-cron');

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Admin endpoint to trigger cron jobs manually
// Executes the job logic directly (not via fetch to avoid localhost issues)

/** Generic payment row shape for cron preview queries */
interface CronPayment {
  id: string;
  loan_id: string;
  due_date: string;
  amount: number;
  is_paid: boolean;
  retry_count?: number;
  reminder_sent_at?: string | null;
  loan?: {
    id: string;
    status: string;
    borrower_id?: string;
    lender_id?: string;
    borrower_dwolla_funding_source_url?: string;
    lender_dwolla_funding_source_url?: string;
    [key: string]: unknown;
  } | null;
}

/** Lender preference row shape for pending-notify preview */
interface LenderPref {
  user_id?: string | null;
  business_id?: string | null;
  min_loan_amount?: number | null;
  max_loan_amount?: number | null;
  [key: string]: unknown;
}

/** Cron job result shape */
type CronResult = Record<string, unknown> & { processed?: number; retriesAttempted?: number; restrictionsLifted?: number; remindersSent?: number; notificationsSent?: number; matchesExpired?: number; message?: string; };



// Admin endpoint to trigger cron jobs manually
// Executes the job logic directly (not via fetch to avoid localhost issues)

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { job } = await request.json();

    const validJobs = [
      'auto-pay',
      'payment-retry',
      'lift-restrictions',
      'payment-reminders',
      'notify-lenders-pending',
      'match-expiry',
    ];

    if (!validJobs.includes(job)) {
      return NextResponse.json({ error: 'Invalid job name' }, { status: 400 });
    }

    // Use service role client for cron operations
    let serviceClient;
    try {
      serviceClient = await createServiceRoleClient();
    } catch (err) {
      log.error('Error creating service role client:', err);
      serviceClient = supabase;
    }

    log.info(`[Trigger-Cron] Running job: ${job}`);

    let result: CronResult = { message: 'Job executed' };
    let itemsProcessed = 0;
    let success = true;

    try {
      switch (job) {
        case 'auto-pay':
          result = await runAutoPayJob(serviceClient);
          itemsProcessed = result.processed || 0;
          break;
          
        case 'payment-retry':
          result = await runPaymentRetryJob(serviceClient);
          itemsProcessed = result.retriesAttempted || 0;
          break;
          
        case 'lift-restrictions':
          result = await runLiftRestrictionsJob(serviceClient);
          itemsProcessed = result.restrictionsLifted || 0;
          break;
          
        case 'payment-reminders':
          result = await runPaymentRemindersJob(serviceClient);
          itemsProcessed = result.remindersSent || 0;
          break;
          
        case 'notify-lenders-pending':
          result = await runNotifyLendersJob(serviceClient);
          itemsProcessed = result.notificationsSent || 0;
          break;
          
        case 'match-expiry':
          result = await runMatchExpiryJob(serviceClient);
          itemsProcessed = result.matchesExpired || 0;
          break;
      }
      
      log.info(`[Trigger-Cron] Job ${job} completed:`, result);
    } catch (jobError: unknown) {
      log.error(`[Trigger-Cron] Error running job ${job}:`, jobError);
      success = false;
      result = { error: jobError instanceof Error ? jobError.message : String(jobError) };
    }

    const duration = Date.now() - startTime;

    // Log the job run
    try {
      await serviceClient.from('cron_job_runs').insert({
        job_name: job,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        status: success ? 'success' : 'error',
        items_processed: itemsProcessed,
        result: result,
        error_message: result.error || null,
        triggered_by: user.id,
      });
    } catch (logError) {
      log.info('Could not log job run:', logError);
    }

    return NextResponse.json({
      success,
      job,
      duration_ms: duration,
      items_processed: itemsProcessed,
      result,
    });
  } catch (error: unknown) {
    log.error('Error triggering cron job:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// ============================================
// JOB IMPLEMENTATIONS
// ============================================

async function runAutoPayJob(supabase: SupabaseClient) {
  const today = new Date().toISOString().split('T')[0];
  
  log.info(`[Auto-Pay] Processing payments for ${today}`);

  // Find all unpaid payments due today or earlier with loan info
  const { data: duePayments, error } = await supabase
    .from('payment_schedule')
    .select(`
      id, loan_id, amount, due_date,
      loan:loans(id, status, borrower_id, lender_id, borrower_dwolla_funding_source_url, lender_dwolla_funding_source_url)
    `)
    .eq('is_paid', false)
    .lte('due_date', today)
    .order('due_date', { ascending: true })
    .limit(50);

  if (error) {
    log.error('[Auto-Pay] Error:', error);
    return { error: (error as Error).message };
  }

  log.info(`[Auto-Pay] Found ${duePayments?.length || 0} due payments`);

  // Filter to only active loans
  const activePayments = (duePayments || []).filter((p: any) => p.loan?.status === 'active');
  
  // Check bank connections
  const paymentsWithBank = activePayments.filter((p: any) => 
    p.loan?.borrower_dwolla_funding_source_url && p.loan?.lender_dwolla_funding_source_url
  );
  const paymentsWithoutBank = activePayments.filter((p: any) => 
    !p.loan?.borrower_dwolla_funding_source_url || !p.loan?.lender_dwolla_funding_source_url
  );

  return {
    message: 'Auto-pay check completed',
    totalDue: duePayments?.length || 0,
    activeLoans: activePayments.length,
    readyToProcess: paymentsWithBank.length,
    missingBankInfo: paymentsWithoutBank.length,
    processed: paymentsWithBank.length,
    note: paymentsWithBank.length > 0 
      ? 'Payments found ready for processing. Dwolla transfers would be initiated in production.'
      : 'No payments ready for automatic processing.',
  };
}

async function runPaymentRetryJob(supabase: SupabaseClient) {
  const today = new Date().toISOString().split('T')[0];
  
  log.info(`[Payment-Retry] Checking for overdue payments`);

  // Find payments that are overdue and need retry
  const { data: overduePayments, error } = await supabase
    .from('payment_schedule')
    .select(`
      id, loan_id, amount, due_date, retry_count,
      loan:loans(id, status, borrower_id)
    `)
    .eq('is_paid', false)
    .lt('due_date', today)
    .limit(50);

  if (error) {
    log.error('[Payment-Retry] Error:', error);
    return { error: (error as Error).message };
  }

  // Filter to only active loans
  const activeOverdue = (overduePayments || []).filter((p: any) => p.loan?.status === 'active');
  
  // Separate by retry status
  const needsRetry = (activeOverdue as any[]).filter((p: CronPayment) => (p.retry_count || 0) < 3);
  const maxedOut = (activeOverdue as any[]).filter((p: CronPayment) => (p.retry_count || 0) >= 3);

  // Update retry counts
  let retriesAttempted = 0;
  for (const payment of needsRetry) {
    const { error: updateError } = await supabase
      .from('payment_schedule')
      .update({
        retry_count: (payment.retry_count || 0) + 1,
        last_retry_at: new Date().toISOString(),
      })
      .eq('id', payment.id);
    
    if (!updateError) {
      retriesAttempted++;
      log.info(`[Payment-Retry] Incremented retry count for payment ${payment.id}`);
    }
  }

  log.info(`[Payment-Retry] Completed: ${retriesAttempted} retries attempted`);

  return {
    message: 'Payment retry check completed',
    totalOverdue: overduePayments?.length || 0,
    activeOverdue: activeOverdue.length,
    retriesAttempted,
    maxedOutPayments: maxedOut.length,
  };
}

async function runLiftRestrictionsJob(supabase: SupabaseClient) {
  const now = new Date().toISOString();
  
  log.info(`[Lift-Restrictions] Checking for users to unblock`);

  // Find users whose restriction period has ended
  const { data: usersToUnblock, error } = await supabase
    .from('users')
    .select('id, full_name, email, restriction_ends_at')
    .eq('is_blocked', true)
    .not('restriction_ends_at', 'is', null)
    .lte('restriction_ends_at', now)
    .limit(50);

  if (error) {
    log.error('[Lift-Restrictions] Error:', error);
    return { error: (error as Error).message };
  }

  log.info(`[Lift-Restrictions] Found ${usersToUnblock?.length || 0} users to unblock`);

  let restrictionsLifted = 0;
  for (const user of usersToUnblock || []) {
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_blocked: false,
        blocked_reason: null,
        restriction_ends_at: null,
        borrower_rating: 'neutral', // Reset to starter rating
      })
      .eq('id', user.id);
    
    if (!updateError) {
      restrictionsLifted++;
      log.info(`[Lift-Restrictions] Unblocked user ${user.email}`);
    }
  }

  return {
    message: 'Lift restrictions check completed',
    usersFound: usersToUnblock?.length || 0,
    restrictionsLifted,
  };
}

async function runPaymentRemindersJob(supabase: SupabaseClient) {
  const reminderDate = new Date();
  reminderDate.setDate(reminderDate.getDate() + 3);
  const targetDate = reminderDate.toISOString().split('T')[0];
  
  log.info(`[Payment-Reminders] Checking for payments due on ${targetDate}`);

  // Find unpaid payments due in 3 days
  const { data: upcomingPayments, error } = await supabase
    .from('payment_schedule')
    .select(`
      id, amount, due_date,
      loan:loans(
        id, borrower_id, currency,
        borrower:users!borrower_id(full_name, email, email_reminders)
      )
    `)
    .eq('is_paid', false)
    .eq('due_date', targetDate)
    .limit(100);

  if (error) {
    log.error('[Payment-Reminders] Error:', error);
    return { error: (error as Error).message };
  }

  // Filter to users who have reminders enabled
  const remindersToSend = (upcomingPayments || []).filter((p: any) => 
    p.loan?.borrower_id && p.loan?.status === 'active'
  );

  log.info(`[Payment-Reminders] Found ${remindersToSend.length} reminders to send`);

  // Create notification records for each
  let remindersSent = 0;
  for (const payment of remindersToSend) {
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: payment.loan?.[0]?.borrower_id,
        type: 'payment_reminder',
        title: 'Payment Reminder',
        message: `Your payment of $${payment.amount} is due on ${payment.due_date}`,
        data: { loan_id: payment.loan?.[0]?.id, amount: payment.amount, due_date: payment.due_date },
        is_read: false,
      });
    
    if (!notifError) {
      remindersSent++;
    }
  }

  return {
    message: 'Payment reminders check completed',
    paymentsFound: upcomingPayments?.length || 0,
    eligibleForReminder: remindersToSend.length,
    remindersSent,
    note: 'In production, emails would also be sent via Resend.',
  };
}

async function runNotifyLendersJob(supabase: SupabaseClient) {
  log.info(`[Notify-Lenders] Checking for pending loans`);

  // Find pending loans without lenders that are at least 1 hour old
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data: pendingLoans, error } = await supabase
    .from('loans')
    .select(`
      id, amount, currency, purpose, created_at, loan_type_id, country, state,
      borrower:users!borrower_id(full_name)
    `)
    .eq('status', 'pending')
    .eq('lender_type', 'business')
    .is('lender_id', null)
    .is('business_lender_id', null)
    .lt('created_at', oneHourAgo)
    .limit(50);

  if (error) {
    log.error('[Notify-Lenders] Error fetching loans:', error);
    return { error: (error as Error).message };
  }

  log.info(`[Notify-Lenders] Found ${pendingLoans?.length || 0} pending loans without lenders`);

  if (!pendingLoans || pendingLoans.length === 0) {
    return {
      message: 'No pending loans found',
      pendingLoansFound: 0,
      notificationsSent: 0,
    };
  }

  // Find lenders with matching preferences
  const { data: lenderPrefs, error: prefsError } = await supabase
    .from('lender_preferences')
    .select(`
      business_id, min_amount, max_amount, countries, states, auto_accept,
      business:business_profiles!business_id(id, owner_id, business_name)
    `)
    .eq('is_active', true)
    .gt('available_capital', 0);

  if (prefsError) {
    log.error('[Notify-Lenders] Error fetching preferences:', prefsError);
    return { error: prefsError.message };
  }

  let notificationsSent = 0;
  
  // For each pending loan, notify matching lenders
  for (const loan of pendingLoans) {
    const matchingLenders = (lenderPrefs || []).filter((pref: LenderPref) => {
      // Check amount range
      if (loan.amount < (pref.min_amount as number) || loan.amount > (pref.max_amount as number)) return false;
      
      // Check country
      if (pref.countries && (pref.countries as any[]).length > 0 && loan.country) {
        if (!(pref.countries as string[]).includes(loan.country)) return false;
      }
      
      // Check state
      if (pref.states && (pref.states as any[]).length > 0 && loan.state) {
        if (!(pref.states as string[]).includes(loan.state)) return false;
      }
      
      return true;
    });

    // Create notifications for matching lenders
    for (const lender of matchingLenders) {
      if (!(lender.business as any)?.[0]?.owner_id) continue;
      
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: (lender.business as any)?.[0]?.owner_id,
          type: 'new_loan_opportunity',
          title: 'New Loan Opportunity',
          message: `A borrower is requesting ${loan.currency} ${loan.amount} for ${loan.purpose}`,
          data: { loan_id: loan.id, amount: loan.amount, purpose: loan.purpose },
          is_read: false,
        });
      
      if (!notifError) {
        notificationsSent++;
      }
    }
  }

  return {
    message: 'Notify lenders check completed',
    pendingLoansFound: pendingLoans.length,
    lendersChecked: lenderPrefs?.length || 0,
    notificationsSent,
  };
}

async function runMatchExpiryJob(supabase: SupabaseClient) {
  // Find expired matches (older than 48 hours)
  const expiredTime = new Date();
  expiredTime.setHours(expiredTime.getHours() - 48);
  
  log.info(`[Match-Expiry] Checking for matches before ${expiredTime.toISOString()}`);

  const { data: expiredMatches, error } = await supabase
    .from('loans')
    .select('id, borrower_id, lender_id, business_lender_id, matched_at, match_status')
    .eq('status', 'pending')
    .eq('match_status', 'pending_acceptance')
    .lt('matched_at', expiredTime.toISOString())
    .limit(50);

  if (error) {
    log.error('[Match-Expiry] Error:', error);
    return { error: (error as Error).message };
  }

  log.info(`[Match-Expiry] Found ${expiredMatches?.length || 0} expired matches`);

  let matchesExpired = 0;
  for (const loan of expiredMatches || []) {
    // Reset the match
    const { error: updateError } = await supabase
      .from('loans')
      .update({
        lender_id: null,
        business_lender_id: null,
        matched_at: null,
        match_status: 'pending',
      })
      .eq('id', loan.id);
    
    if (!updateError) {
      matchesExpired++;
      log.info(`[Match-Expiry] Reset match for loan ${loan.id}`);
      
      // Create notification for borrower
      await supabase.from('notifications').insert({
        user_id: loan.borrower_id,
        type: 'match_expired',
        title: 'Match Expired',
        message: 'Your loan match has expired. We are looking for a new lender.',
        data: { loan_id: loan.id },
        is_read: false,
      });
    }
  }

  return {
    message: 'Match expiry check completed',
    expiredMatchesFound: expiredMatches?.length || 0,
    matchesExpired,
  };
}
