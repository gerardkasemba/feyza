import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getTransfer } from '@/lib/dwolla';

// POST: Sync transfer status from Dwolla API
// This can be called manually or periodically to ensure status is up to date
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loan_id, transfer_id } = body;

    const supabase = await createServiceRoleClient();

    let transfers;

    if (transfer_id) {
      // Sync a specific transfer
      const { data } = await supabase
        .from('transfers')
        .select('*, loan:loans(*)')
        .eq('dwolla_transfer_id', transfer_id)
        .single();
      transfers = data ? [data] : [];
    } else if (loan_id) {
      // Sync all transfers for a loan
      const { data } = await supabase
        .from('transfers')
        .select('*, loan:loans(*)')
        .eq('loan_id', loan_id);
      transfers = data || [];
    } else {
      // Sync all pending transfers
      const { data } = await supabase
        .from('transfers')
        .select('*, loan:loans(*)')
        .in('status', ['pending', 'processing']);
      transfers = data || [];
    }

    console.log(`[Sync Status] Syncing ${transfers.length} transfers`);

    const results = [];

    for (const transfer of transfers) {
      try {
        // Get status from Dwolla
        const dwollaTransfer = await getTransfer(
          `https://api-sandbox.dwolla.com/transfers/${transfer.dwolla_transfer_id}`
        );

        const dwollaStatus = dwollaTransfer.status;
        let ourStatus = transfer.status;

        // Map Dwolla status to our status
        if (dwollaStatus === 'processed') {
          ourStatus = 'completed';  // Dwolla uses 'processed', we use 'completed'
        } else if (dwollaStatus === 'pending') {
          ourStatus = 'pending';
        } else if (dwollaStatus === 'failed') {
          ourStatus = 'failed';
        } else if (dwollaStatus === 'cancelled') {
          ourStatus = 'cancelled';
        }

        // Update if changed
        if (ourStatus !== transfer.status) {
          await supabase
            .from('transfers')
            .update({ 
              status: ourStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', transfer.id);

          // Update loan if disbursement
          if (transfer.type === 'disbursement' && transfer.loan) {
            if (ourStatus === 'completed') {
              // Check if disbursement_status is already completed to avoid duplicate stats
              const wasAlreadyCompleted = transfer.loan.disbursement_status === 'completed';
              
              await supabase
                .from('loans')
                .update({
                  disbursement_status: 'completed',
                  funds_sent: true,
                })
                .eq('id', transfer.loan.id);

              // Only update borrower stats if not already completed (avoid duplicates)
              if (!wasAlreadyCompleted && transfer.loan.borrower_id) {
                const { data: borrower } = await supabase
                  .from('users')
                  .select('total_amount_borrowed, current_outstanding_amount')
                  .eq('id', transfer.loan.borrower_id)
                  .single();

                if (borrower) {
                  const loanAmount = transfer.loan.total_amount || transfer.loan.amount || transfer.amount;
                  await supabase
                    .from('users')
                    .update({
                      total_amount_borrowed: (borrower.total_amount_borrowed || 0) + loanAmount,
                      current_outstanding_amount: (borrower.current_outstanding_amount || 0) + loanAmount,
                    })
                    .eq('id', transfer.loan.borrower_id);
                  
                  console.log(`[Sync Status] Updated borrower ${transfer.loan.borrower_id} - borrowed: +$${loanAmount}`);
                }
              } else if (wasAlreadyCompleted) {
                console.log(`[Sync Status] Skipping stats update - disbursement already completed for loan ${transfer.loan.id}`);
              }
            } else if (ourStatus === 'failed') {
              await supabase
                .from('loans')
                .update({
                  disbursement_status: 'failed',
                })
                .eq('id', transfer.loan.id);
            }
          }

          results.push({
            transfer_id: transfer.dwolla_transfer_id,
            old_status: transfer.status,
            new_status: ourStatus,
            dwolla_status: dwollaStatus,
            updated: true,
          });
        } else {
          results.push({
            transfer_id: transfer.dwolla_transfer_id,
            status: ourStatus,
            dwolla_status: dwollaStatus,
            updated: false,
          });
        }
      } catch (err: any) {
        console.error(`[Sync Status] Error syncing transfer ${transfer.dwolla_transfer_id}:`, err);
        results.push({
          transfer_id: transfer.dwolla_transfer_id,
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      synced: results.length,
      results,
    });

  } catch (error: any) {
    console.error('[Sync Status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync status' },
      { status: 500 }
    );
  }
}

// GET: Get current status of transfers for a loan (and sync with Dwolla)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loan_id');

    if (!loanId) {
      return NextResponse.json({ error: 'loan_id required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Get loan info first to check current disbursement status
    const { data: loanBefore } = await supabase
      .from('loans')
      .select('id, disbursement_status, funds_sent, disbursement_transfer_id, borrower_id, amount, total_amount')
      .eq('id', loanId)
      .single();

    // Get all transfers for this loan
    const { data: transfers } = await supabase
      .from('transfers')
      .select('id, dwolla_transfer_id, type, status, amount, created_at, updated_at, loan_id, platform_fee, net_amount, gross_amount, fee_type')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: false });

    // Sync pending transfers with Dwolla API
    const updatedTransfers = [];
    for (const transfer of (transfers || [])) {
      if (transfer.status === 'pending' || transfer.status === 'processing') {
        try {
          const dwollaTransfer = await getTransfer(
            `https://api-sandbox.dwolla.com/transfers/${transfer.dwolla_transfer_id}`
          );
          
          const dwollaStatus = dwollaTransfer.status;
          let newStatus = transfer.status;
          
          if (dwollaStatus === 'processed') {
            newStatus = 'completed';
          } else if (dwollaStatus === 'failed') {
            newStatus = 'failed';
          } else if (dwollaStatus === 'cancelled') {
            newStatus = 'cancelled';
          }
          
          // Update if changed
          if (newStatus !== transfer.status) {
            await supabase
              .from('transfers')
              .update({ 
                status: newStatus,
                updated_at: new Date().toISOString(),
              })
              .eq('id', transfer.id);
            
            // Update loan if disbursement completed
            if (transfer.type === 'disbursement' && newStatus === 'completed') {
              // Check if disbursement was already completed to avoid duplicate stats
              const wasAlreadyCompleted = loanBefore?.disbursement_status === 'completed';

              await supabase
                .from('loans')
                .update({
                  disbursement_status: 'completed',
                  funds_sent: true,
                })
                .eq('id', loanId);

              // Only update borrower stats if not already completed (avoid duplicates)
              if (!wasAlreadyCompleted && loanBefore?.borrower_id) {
                const { data: borrower } = await supabase
                  .from('users')
                  .select('total_amount_borrowed, current_outstanding_amount')
                  .eq('id', loanBefore.borrower_id)
                  .single();

                if (borrower) {
                  const loanAmount = loanBefore.total_amount || loanBefore.amount || transfer.amount;
                  await supabase
                    .from('users')
                    .update({
                      total_amount_borrowed: (borrower.total_amount_borrowed || 0) + loanAmount,
                      current_outstanding_amount: (borrower.current_outstanding_amount || 0) + loanAmount,
                    })
                    .eq('id', loanBefore.borrower_id);
                  
                  console.log(`[Sync Status GET] Updated borrower ${loanBefore.borrower_id} - borrowed: +$${loanAmount}`);
                }
              } else if (wasAlreadyCompleted) {
                console.log(`[Sync Status GET] Skipping stats update - disbursement already completed for loan ${loanId}`);
              }
            }
            
            updatedTransfers.push({ ...transfer, status: newStatus });
          } else {
            updatedTransfers.push(transfer);
          }
        } catch (err) {
          console.error(`[Sync Status] Error syncing transfer ${transfer.dwolla_transfer_id}:`, err);
          updatedTransfers.push(transfer);
        }
      } else {
        updatedTransfers.push(transfer);
      }
    }

    // Get updated loan info
    const { data: loan } = await supabase
      .from('loans')
      .select('id, disbursement_status, funds_sent, disbursement_transfer_id')
      .eq('id', loanId)
      .single();

    return NextResponse.json({
      loan: {
        id: loan?.id,
        disbursement_status: loan?.disbursement_status,
        funds_sent: loan?.funds_sent,
      },
      transfers: updatedTransfers,
    });

  } catch (error: any) {
    console.error('[Sync Status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get status' },
      { status: 500 }
    );
  }
}
