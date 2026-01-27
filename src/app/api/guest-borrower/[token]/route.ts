import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getPaymentConfirmationNeededEmail } from '@/lib/email';

// GET: Fetch loan data for guest borrower
// This endpoint supports two scenarios:
// 1. Loan exists with borrower_access_token - return full loan details
// 2. No loan yet but loan_request exists - return request status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    console.log('[Guest Borrower] Looking up token:', token.substring(0, 8) + '...');

    // First, try to find a loan with this borrower access token
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        amount,
        amount_paid,
        amount_remaining,
        currency,
        interest_rate,
        interest_type,
        total_interest,
        total_amount,
        status,
        purpose,
        start_date,
        repayment_frequency,
        repayment_amount,
        total_installments,
        funds_sent,
        borrower_payment_method,
        borrower_payment_username,
        borrower_access_token_expires,
        lender_name,
        lender_bank_connected,
        lender_bank_name,
        lender_paypal_email,
        lender_cashapp_username,
        lender_venmo_username,
        lender_preferred_payment_method,
        disbursement_status,
        disbursed_at,
        auto_pay_enabled,
        borrower_bank_connected,
        borrower_bank_name,
        borrower_bank_account_mask,
        lender:users!lender_id(
          full_name,
          email,
          paypal_email,
          cashapp_username,
          venmo_username,
          preferred_payment_method,
          dwolla_funding_source_url
        ),
        business_lender:business_profiles!business_lender_id(
          business_name,
          paypal_email,
          cashapp_username,
          venmo_username,
          preferred_payment_method
        ),
        schedule:payment_schedule(
          id,
          due_date,
          amount,
          principal_amount,
          interest_amount,
          is_paid,
          status,
          payment_id,
          paid_at
        ),
        transfers(
          id,
          type,
          amount,
          status,
          dwolla_transfer_id,
          created_at,
          completed_at,
          error_message
        )
      `)
      .eq('borrower_access_token', token)
      .single();

    // If loan found, return it
    if (loan && !loanError) {
      console.log('[Guest Borrower] Found loan:', loan.id);
      
      // Cast loan to mutable object
      const loanData = loan as any;
      
      // Check if token has expired
      if (loanData.borrower_access_token_expires) {
        const expiresAt = new Date(loanData.borrower_access_token_expires);
        if (expiresAt < new Date()) {
          return NextResponse.json({ error: 'Access link has expired. Please request a new one.' }, { status: 401 });
        }
      }

      // ALWAYS fetch transfers separately to ensure we get them
      // The relationship query sometimes doesn't return transfers correctly
      console.log('[Guest Borrower] Fetching transfers for loan:', loanData.id);
      const { data: transfersData, error: transfersError } = await supabase
        .from('transfers')
        .select('id, type, amount, status, dwolla_transfer_id, created_at, completed_at, error_message, platform_fee, net_amount, gross_amount, fee_type')
        .eq('loan_id', loanData.id)
        .order('created_at', { ascending: false });
      
      if (transfersError) {
        console.error('[Guest Borrower] Error fetching transfers:', transfersError);
      } else {
        console.log('[Guest Borrower] Found', transfersData?.length || 0, 'transfers');
        loanData.transfers = transfersData || [];
      }

      // AUTO-SYNC: Check and update pending transfer statuses from Dwolla
      // This ensures guest loans reflect the latest status even if webhooks failed
      if (loanData.transfers && loanData.transfers.length > 0) {
        const pendingTransfers = loanData.transfers.filter(
          (t: any) => t.status === 'pending' || t.status === 'processing'
        );
        
        if (pendingTransfers.length > 0) {
          console.log(`[Guest Borrower] Found ${pendingTransfers.length} pending transfers, syncing with Dwolla...`);
          
          // Import dynamically to avoid issues
          const { getTransfer } = await import('@/lib/dwolla');
          
          for (const transfer of pendingTransfers) {
            try {
              const dwollaTransfer = await getTransfer(
                `https://api-sandbox.dwolla.com/transfers/${transfer.dwolla_transfer_id}`
              );
              
              const dwollaStatus = dwollaTransfer.status;
              let newStatus = transfer.status;
              
              if (dwollaStatus === 'processed') newStatus = 'completed';
              else if (dwollaStatus === 'failed') newStatus = 'failed';
              else if (dwollaStatus === 'cancelled') newStatus = 'cancelled';
              
              if (newStatus !== transfer.status) {
                console.log(`[Guest Borrower] Syncing transfer ${transfer.id}: ${transfer.status} → ${newStatus}`);
                
                // Update transfer
                await supabase
                  .from('transfers')
                  .update({ 
                    status: newStatus,
                    completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', transfer.id);
                
                // Update loan if disbursement completed
                if (transfer.type === 'disbursement' && newStatus === 'completed') {
                  console.log(`[Guest Borrower] Disbursement completed! Updating loan ${loanData.id}`);
                  await supabase
                    .from('loans')
                    .update({
                      disbursement_status: 'completed',
                      funds_sent: true,
                    })
                    .eq('id', loanData.id);
                  
                  // Update the loan object we're returning
                  loanData.disbursement_status = 'completed';
                  loanData.funds_sent = true;
                }
                
                // Update the transfer in our response
                transfer.status = newStatus;
                if (newStatus === 'completed') transfer.completed_at = new Date().toISOString();
              }
            } catch (syncErr: any) {
              console.error(`[Guest Borrower] Failed to sync transfer ${transfer.id}:`, syncErr.message);
            }
          }
        }
      }

      // Sort schedule by due date
      if (loanData.schedule) {
        loanData.schedule.sort((a: any, b: any) => 
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        );
      }
      
      // Sort transfers by created_at (newest first)
      if (loanData.transfers && Array.isArray(loanData.transfers)) {
        loanData.transfers.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }

      // Debug: Log transfers count
      console.log('[Guest Borrower] Returning loan with', loanData.transfers?.length || 0, 'transfers');
      
      return NextResponse.json({ loan: loanData, type: 'loan' });
    }

    console.log('[Guest Borrower] No loan found, checking loan_requests...');

    // No loan found, check if there's a loan_request with this token
    // The token might be stored in loan_requests.access_token or as a lookup reference
    const { data: loanRequest, error: requestError } = await supabase
      .from('loan_requests')
      .select(`
        id,
        amount,
        currency,
        purpose,
        description,
        borrower_name,
        borrower_email,
        status,
        created_at,
        access_token,
        access_token_expires,
        proposed_frequency,
        proposed_installments,
        proposed_payment_amount,
        accepted_by_name,
        accepted_at,
        loan_id
      `)
      .eq('access_token', token)
      .single();

    if (loanRequest && !requestError) {
      console.log('[Guest Borrower] Found loan_request:', loanRequest.id, 'status:', loanRequest.status);
      
      // Check if token has expired
      if (loanRequest.access_token_expires) {
        const expiresAt = new Date(loanRequest.access_token_expires);
        if (expiresAt < new Date()) {
          return NextResponse.json({ error: 'Access link has expired. Please request a new one.' }, { status: 401 });
        }
      }

      // If the request has a loan_id, try to fetch the loan with that ID
      if (loanRequest.loan_id) {
        const { data: linkedLoan } = await supabase
          .from('loans')
          .select(`
            id,
            amount,
            amount_paid,
            amount_remaining,
            currency,
            interest_rate,
            interest_type,
            total_interest,
            total_amount,
            status,
            purpose,
            start_date,
            repayment_frequency,
            repayment_amount,
            total_installments,
            funds_sent,
            borrower_access_token_expires,
            lender_name,
            disbursement_status,
            disbursed_at,
            auto_pay_enabled,
            borrower_bank_connected,
            borrower_bank_name,
            borrower_bank_account_mask,
            lender:users!lender_id(full_name, email),
            business_lender:business_profiles!business_lender_id(business_name),
            schedule:payment_schedule(id, due_date, amount, principal_amount, interest_amount, is_paid, status, payment_id)
          `)
          .eq('id', loanRequest.loan_id)
          .single();

        if (linkedLoan) {
          console.log('[Guest Borrower] Found linked loan via loan_request:', linkedLoan.id);
          
          // Cast to mutable
          const linkedLoanData = linkedLoan as any;
          
          // Fetch transfers separately
          const { data: transfersData } = await supabase
            .from('transfers')
            .select('id, type, amount, status, dwolla_transfer_id, created_at, completed_at, error_message, platform_fee, net_amount, gross_amount, fee_type')
            .eq('loan_id', linkedLoanData.id)
            .order('created_at', { ascending: false });
          
          linkedLoanData.transfers = transfersData || [];
          console.log('[Guest Borrower] Linked loan has', linkedLoanData.transfers.length, 'transfers');
          
          // Sort schedule
          if (linkedLoanData.schedule) {
            linkedLoanData.schedule.sort((a: any, b: any) => 
              new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
            );
          }
          
          return NextResponse.json({ loan: linkedLoanData, type: 'loan' });
        }
      }

      // Return the loan request status (no loan created yet)
      return NextResponse.json({ 
        loanRequest: {
          id: loanRequest.id,
          amount: loanRequest.amount,
          currency: loanRequest.currency,
          purpose: loanRequest.purpose,
          description: loanRequest.description,
          borrower_name: loanRequest.borrower_name,
          status: loanRequest.status,
          created_at: loanRequest.created_at,
          proposed_frequency: loanRequest.proposed_frequency,
          proposed_installments: loanRequest.proposed_installments,
          accepted_by_name: loanRequest.accepted_by_name,
          accepted_at: loanRequest.accepted_at,
        },
        type: 'request' 
      });
    }

    console.log('[Guest Borrower] Neither loan nor loan_request found for token');
    return NextResponse.json({ error: 'Invalid or expired access link' }, { status: 404 });

  } catch (error) {
    console.error('Guest borrower GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update borrower payment method
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { token } = await params;
    const body = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Verify token and get loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('id, borrower_access_token_expires')
      .eq('borrower_access_token', token)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Invalid access link' }, { status: 404 });
    }

    // Check expiry
    if (loan.borrower_access_token_expires) {
      const expiresAt = new Date(loan.borrower_access_token_expires);
      if (expiresAt < new Date()) {
        return NextResponse.json({ error: 'Access link has expired' }, { status: 401 });
      }
    }

    const { action, payment_method, payment_username } = body;

    if (action === 'set_payment_method') {
      if (!payment_method || !payment_username) {
        return NextResponse.json({ error: 'Payment method and username are required' }, { status: 400 });
      }

      const { error: updateError } = await supabase
        .from('loans')
        .update({
          borrower_payment_method: payment_method,
          borrower_payment_username: payment_username,
        })
        .eq('id', loan.id);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({ success: true, message: 'Payment method saved' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Guest borrower PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Record a payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { token } = await params;
    const body = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Verify token and get loan
    const { data: loanData, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        currency,
        borrower_access_token_expires,
        lender_id,
        business_lender_id,
        lender:users!lender_id(email, full_name),
        business_lender:business_profiles!business_lender_id(contact_email, business_name)
      `)
      .eq('borrower_access_token', token)
      .single();

    if (loanError || !loanData) {
      return NextResponse.json({ error: 'Invalid access link' }, { status: 404 });
    }

    // Cast to proper types
    const loan = loanData as any;

    // Check expiry
    if (loan.borrower_access_token_expires) {
      const expiresAt = new Date(loan.borrower_access_token_expires);
      if (expiresAt < new Date()) {
        return NextResponse.json({ error: 'Access link has expired' }, { status: 401 });
      }
    }

    const { action, schedule_id, note } = body;

    if (action === 'record_payment') {
      if (!schedule_id) {
        return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
      }

      // Get the schedule item
      const { data: scheduleItem, error: scheduleError } = await supabase
        .from('payment_schedule')
        .select('*')
        .eq('id', schedule_id)
        .eq('loan_id', loan.id)
        .single();

      if (scheduleError || !scheduleItem) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      if (scheduleItem.is_paid) {
        return NextResponse.json({ error: 'Payment already recorded' }, { status: 400 });
      }

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          loan_id: loan.id,
          schedule_id: schedule_id,
          amount: scheduleItem.amount,
          status: 'pending', // Needs lender confirmation
          note: note || 'Payment recorded by borrower',
        })
        .select()
        .single();

      if (paymentError) {
        throw paymentError;
      }

      // Update schedule item
      await supabase
        .from('payment_schedule')
        .update({
          is_paid: true,
          payment_id: payment.id,
          status: 'pending',
        })
        .eq('id', schedule_id);

      // Update loan amounts
      const { data: updatedSchedules } = await supabase
        .from('payment_schedule')
        .select('amount')
        .eq('loan_id', loan.id)
        .eq('is_paid', true);

      const totalPaid = updatedSchedules?.reduce((sum, s) => sum + s.amount, 0) || 0;

      const { data: loanData } = await supabase
        .from('loans')
        .select('amount')
        .eq('id', loan.id)
        .single();

      await supabase
        .from('loans')
        .update({
          amount_paid: totalPaid,
          amount_remaining: (loanData?.amount || 0) - totalPaid,
        })
        .eq('id', loan.id);

      // Notify lender
      const lenderEmail = loan.lender?.email || loan.business_lender?.contact_email;
      const lenderName = loan.lender?.full_name || loan.business_lender?.business_name || 'Lender';

      if (lenderEmail) {
        const confirmEmail = getPaymentConfirmationNeededEmail({
          borrowerName: loan.borrower_invite_email?.split('@')[0] || 'Borrower',
          amount: payment.amount,
          currency: loan.currency,
          lenderName: loan.lender?.full_name || loan.business_lender?.business_name || 'Lender',
          accessToken: token,
          loanId: loan.id,
        });
        await sendEmail({
          to: lenderEmail,
          subject: confirmEmail.subject,
          html: confirmEmail.html,
        });
      }

      // Also create notification for lender if they have an account
      if (loan.lender_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: loan.lender_id,
            type: 'payment_received',
            title: 'Payment Received',
            message: `Your borrower has recorded a payment of ${loan.currency} ${scheduleItem.amount}. Please confirm.`,
            loan_id: loan.id,
          });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Payment recorded successfully',
        payment_id: payment.id,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Guest borrower POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
