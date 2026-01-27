import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createServiceRoleClient();

    // Find loan by invite_token (this is the lender's access token)
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        amount,
        currency,
        purpose,
        status,
        interest_rate,
        interest_type,
        total_interest,
        total_amount,
        amount_paid,
        amount_remaining,
        repayment_frequency,
        total_installments,
        repayment_amount,
        start_date,
        created_at,
        borrower_invite_email,
        borrower_name,
        borrower_bank_connected,
        lender_name,
        lender_email,
        lender_bank_name,
        lender_bank_account_mask,
        lender_bank_connected,
        disbursement_status,
        disbursement_transfer_id,
        disbursed_at,
        auto_pay_enabled,
        schedule:payment_schedule(
          id,
          due_date,
          amount,
          principal_amount,
          interest_amount,
          is_paid,
          paid_at
        ),
        transfers(
          id,
          type,
          amount,
          status,
          dwolla_transfer_id,
          created_at,
          processed_at,
          failure_reason,
          platform_fee,
          net_amount,
          gross_amount,
          fee_type
        )
      `)
      .eq('invite_token', token)
      .single();

    if (loanError || !loan) {
      console.error('Loan fetch error:', loanError);
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    // Cast loan to mutable object
    const loanData = loan as any;

    // Also try to get borrower name from loan_request if not on loan
    if (!loanData.borrower_name) {
      const { data: loanRequest } = await supabase
        .from('loan_requests')
        .select('borrower_name')
        .eq('loan_id', loanData.id)
        .single();
      
      if (loanRequest?.borrower_name) {
        loanData.borrower_name = loanRequest.borrower_name;
      }
    }

    // ALWAYS fetch transfers separately to ensure we get them
    // The relationship query sometimes doesn't return transfers correctly
    console.log('[Guest Lender] Fetching transfers for loan:', loanData.id);
    const { data: transfersData, error: transfersError } = await supabase
      .from('transfers')
      .select('id, type, amount, status, dwolla_transfer_id, created_at, processed_at, failure_reason, platform_fee, net_amount, gross_amount, fee_type')
      .eq('loan_id', loanData.id)
      .order('created_at', { ascending: false });
    
    if (transfersError) {
      console.error('[Guest Lender] Error fetching transfers:', transfersError);
    } else {
      console.log('[Guest Lender] Found', transfersData?.length || 0, 'transfers');
      loanData.transfers = transfersData || [];
    }

    // AUTO-SYNC: Check and update pending transfer statuses from Dwolla
    // This ensures guest loans reflect the latest status even if webhooks failed
    if (loanData.transfers && loanData.transfers.length > 0) {
      const pendingTransfers = loanData.transfers.filter(
        (t: any) => t.status === 'pending' || t.status === 'processing'
      );
      
      if (pendingTransfers.length > 0) {
        console.log(`[Guest Lender] Found ${pendingTransfers.length} pending transfers, syncing with Dwolla...`);
        
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
              console.log(`[Guest Lender] Syncing transfer ${transfer.id}: ${transfer.status} → ${newStatus}`);
              
              // Update transfer
              await supabase
                .from('transfers')
                .update({ 
                  status: newStatus,
                  processed_at: newStatus === 'completed' ? new Date().toISOString() : null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', transfer.id);
              
              // Update loan if disbursement completed
              if (transfer.type === 'disbursement' && newStatus === 'completed') {
                console.log(`[Guest Lender] Disbursement completed! Updating loan ${loanData.id}`);
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
              if (newStatus === 'completed') transfer.processed_at = new Date().toISOString();
            }
          } catch (syncErr: any) {
            console.error(`[Guest Lender] Failed to sync transfer ${transfer.id}:`, syncErr.message);
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

    // Sort transfers by date (newest first)
    if (loanData.transfers) {
      loanData.transfers.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    console.log('[Guest Lender] Returning loan with', loanData.transfers?.length || 0, 'transfers');
    return NextResponse.json({ loan: loanData });

  } catch (error) {
    console.error('Guest lender API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
