import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getTransfer } from '@/lib/dwolla';
import { onPaymentCompleted, onPaymentFailed } from '@/lib/payments';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('[Sync Dwolla Cron] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();

    // Get all pending/processing transfers
    const { data: transfers, error: fetchError } = await supabase
      .from('transfers')
      .select('*, loan:loans(*)')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('[Sync Dwolla Cron] Error fetching transfers:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 });
    }

    if (!transfers || transfers.length === 0) {
      console.log('[Sync Dwolla Cron] No pending transfers to sync');
      return NextResponse.json({ 
        success: true, 
        message: 'No pending transfers',
        synced: 0,
        duration_ms: Date.now() - startTime,
      });
    }

    console.log(`[Sync Dwolla Cron] Syncing ${transfers.length} transfers`);

    const results = {
      total: transfers.length,
      updated: 0,
      completed: 0,
      failed: 0,
      errors: 0,
      trustScoreUpdates: 0,
    };

    for (const transfer of transfers) {
      try {
        // Get status from Dwolla API
        const dwollaTransfer = await getTransfer(
          `https://api-sandbox.dwolla.com/transfers/${transfer.dwolla_transfer_id}`
        );

        const dwollaStatus = dwollaTransfer.status;
        let newStatus = transfer.status;

        // Map Dwolla status to our status
        if (dwollaStatus === 'processed') {
          newStatus = 'completed';
          results.completed++;
        } else if (dwollaStatus === 'failed') {
          newStatus = 'failed';
          results.failed++;
        } else if (dwollaStatus === 'cancelled') {
          newStatus = 'cancelled';
        }

        // Skip if no change
        if (newStatus === transfer.status) {
          continue;
        }

        results.updated++;

        // Update transfer status
        await supabase
          .from('transfers')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString(),
            processed_at: newStatus === 'completed' ? new Date().toISOString() : null,
          })
          .eq('id', transfer.id);

        console.log(`[Sync Dwolla Cron] Transfer ${transfer.dwolla_transfer_id}: ${transfer.status} → ${newStatus}`);

        const loan = transfer.loan;
        if (!loan) continue;

        // Handle disbursement completion
        if (transfer.type === 'disbursement') {
          if (newStatus === 'completed') {
            await supabase
              .from('loans')
              .update({
                disbursement_status: 'completed',
                funds_sent: true,
              })
              .eq('id', loan.id);
            
            console.log(`[Sync Dwolla Cron] ✅ Loan ${loan.id} disbursement completed`);
          } else if (newStatus === 'failed') {
            await supabase
              .from('loans')
              .update({
                disbursement_status: 'failed',
              })
              .eq('id', loan.id);
          }
        }

        // Handle repayment completion - update trust score!
        if (transfer.type === 'repayment') {
          if (newStatus === 'completed') {
            console.log(`[Sync Dwolla Cron] Processing repayment completion for loan ${loan.id}`);
            
            // Find the associated payment schedule item
            const { data: payment } = await supabase
              .from('payment_schedule')
              .select('id, amount, due_date')
              .eq('transfer_id', transfer.id)
              .single();
            
            // Update Trust Score
            if (loan.borrower_id) {
              try {
                await onPaymentCompleted({
                  supabase,
                  loanId: loan.id,
                  borrowerId: loan.borrower_id,
                  paymentId: payment?.id,
                  scheduleId: payment?.id,
                  amount: payment?.amount || transfer.amount,
                  dueDate: payment?.due_date,
                  paymentMethod: 'dwolla',
                });
                results.trustScoreUpdates++;
                console.log(`[Sync Dwolla Cron] ✅ Trust score updated for borrower ${loan.borrower_id}`);
              } catch (trustError) {
                console.error(`[Sync Dwolla Cron] Trust score update failed:`, trustError);
              }
            }
          } else if (newStatus === 'failed') {
            // Record failed payment for trust score
            if (loan.borrower_id) {
              try {
                await onPaymentFailed({
                  supabase,
                  borrowerId: loan.borrower_id,
                  loanId: loan.id,
                  reason: 'Dwolla transfer failed',
                });
                console.log(`[Sync Dwolla Cron] Trust score penalty recorded for failed payment`);
              } catch (trustError) {
                console.error(`[Sync Dwolla Cron] Trust score penalty failed:`, trustError);
              }
            }
          }
        }

      } catch (err: any) {
        console.error(`[Sync Dwolla Cron] Error syncing transfer ${transfer.dwolla_transfer_id}:`, err.message);
        results.errors++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Sync Dwolla Cron] Completed in ${duration}ms:`, results);

    return NextResponse.json({
      success: true,
      ...results,
      duration_ms: duration,
    });

  } catch (error: any) {
    console.error('[Sync Dwolla Cron] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync transfers' },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing
export async function GET(request: NextRequest) {
  // For GET, just return status info
  try {
    const supabase = await createServiceRoleClient();

    const { count: pendingCount } = await supabase
      .from('transfers')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'processing']);

    return NextResponse.json({
      endpoint: '/api/cron/sync-dwolla',
      description: 'Syncs Dwolla transfer statuses and updates trust scores',
      pending_transfers: pendingCount || 0,
      how_to_run: 'POST to this endpoint to sync all pending transfers',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
