import { NextRequest, NextResponse } from 'next/server';
import { normalizeTransferStatus } from '@/lib/users/user-lifecycle-service';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getTransfer } from '@/lib/dwolla';
import { logger } from '@/lib/logger';

const log = logger('dwolla-debug');

interface DwollaStatusCheck {
  db_id: string;
  dwolla_id: string;
  db_status?: string;
  dwolla_status?: string;
  match?: boolean;
  error?: string;
}

interface DebugLoan {
  id: string;
  status: string;
  disbursement_status?: string;
  funds_sent?: boolean;
  borrower_name?: string;
  lender_name?: string;
}


// GET: Debug endpoint to check transfers and their status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loan_id');
    const checkDwolla = searchParams.get('check_dwolla') === 'true';

    const supabase = await createServiceRoleClient();

    // Get transfers (optionally filtered by loan_id)
    let query = supabase
      .from('transfers')
      .select(`
        id,
        loan_id,
        dwolla_transfer_id,
        dwolla_transfer_url,
        type,
        amount,
        status,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (loanId) {
      query = query.eq('loan_id', loanId);
    }

    const { data: transfers, error } = await query;

    if (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }

    // Optionally check Dwolla API for real status
    let dwollaStatuses: DwollaStatusCheck[] = [];
    if (checkDwolla && transfers && transfers.length > 0) {
      for (const transfer of transfers) {
        if (transfer.dwolla_transfer_id) {
          try {
            const dwollaTransfer = await getTransfer(
              `https://api-sandbox.dwolla.com/transfers/${transfer.dwolla_transfer_id}`
            );
            dwollaStatuses.push({
              db_id: transfer.id,
              dwolla_id: transfer.dwolla_transfer_id,
              db_status: transfer.status,
              dwolla_status: (dwollaTransfer as any).status as string | undefined,
              match: transfer.status === dwollaTransfer.status || 
                     (dwollaTransfer.status === 'processed' && transfer.status === 'processed'),
            });
          } catch (err: unknown) {
            dwollaStatuses.push({
              db_id: transfer.id,
              dwolla_id: transfer.dwolla_transfer_id,
              error: (err as Error).message,
            });
          }
        }
      }
    }

    // Get associated loans
    const loanIds = Array.from(new Set(transfers?.map(t => t.loan_id).filter(Boolean)));
    let loans: DebugLoan[] = [];
    if (loanIds.length > 0) {
      const { data: loanData } = await supabase
        .from('loans')
        .select('id, status, disbursement_status, funds_sent, borrower_name, lender_name')
        .in('id', loanIds);
      loans = loanData || [];
    }

    return NextResponse.json({
      transfers: transfers || [],
      loans,
      dwolla_comparison: checkDwolla ? dwollaStatuses : 'Add ?check_dwolla=true to compare with Dwolla API',
      help: {
        description: 'This endpoint shows transfers in your database',
        to_sync: 'POST to /api/dwolla/sync-status with {"loan_id": "..."} to sync from Dwolla',
        to_force_update: 'POST to /api/dwolla/debug with transfer_id and new_status to force update',
      },
    });

  } catch (error: unknown) {
    log.error('[Debug] Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST: Force update a transfer status (for debugging/fixing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transfer_id, dwolla_transfer_id, loan_id, new_status, update_loan } = body;

    if (!new_status) {
      return NextResponse.json({ 
        error: 'new_status required',
        valid_statuses: ['pending', 'processing', 'processed', 'failed', 'cancelled'],
      }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Find the transfer
    let transfer;
    if (transfer_id) {
      const { data } = await supabase
        .from('transfers')
        .select('*, loan:loans(*)')
        .eq('id', transfer_id)
        .single();
      transfer = data;
    } else if (dwolla_transfer_id) {
      const { data } = await supabase
        .from('transfers')
        .select('*, loan:loans(*)')
        .eq('dwolla_transfer_id', dwolla_transfer_id)
        .single();
      transfer = data;
    } else if (loan_id) {
      // Get the most recent transfer for this loan
      const { data } = await supabase
        .from('transfers')
        .select('*, loan:loans(*)')
        .eq('loan_id', loan_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      transfer = data;
    }

    if (!transfer) {
      return NextResponse.json({ 
        error: 'Transfer not found',
        hint: 'Provide transfer_id, dwolla_transfer_id, or loan_id',
      }, { status: 404 });
    }

    // Update transfer status — normalize 'processed' → 'completed' (replaces tr_normalize_transfer_status)
    const normalizedStatus = normalizeTransferStatus(new_status);
    const { error: updateError } = await supabase
      .from('transfers')
      .update({ 
        status: normalizedStatus,
        updated_at: new Date().toISOString(),
        processed_at: normalizedStatus === 'completed' ? new Date().toISOString() : transfer.processed_at,
      })
      .eq('id', transfer.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Optionally update loan disbursement status
    let loanUpdated = false;
    if (update_loan !== false && transfer.type === 'disbursement' && transfer.loan) {
      if (normalizedStatus === 'completed') {
        await supabase
          .from('loans')
          .update({
            disbursement_status: 'completed',
            funds_sent: true,
          })
          .eq('id', transfer.loan.id);
        loanUpdated = true;
      } else if (normalizedStatus === 'failed') {
        await supabase
          .from('loans')
          .update({
            disbursement_status: 'failed',
          })
          .eq('id', transfer.loan.id);
        loanUpdated = true;
      } else if (new_status === 'pending') {
        await supabase
          .from('loans')
          .update({
            disbursement_status: 'processing',
            funds_sent: false,
          })
          .eq('id', transfer.loan.id);
        loanUpdated = true;
      }
    }

    return NextResponse.json({
      success: true,
      transfer_id: transfer.id,
      dwolla_transfer_id: transfer.dwolla_transfer_id,
      old_status: transfer.status,
      new_status: new_status,
      loan_id: transfer.loan?.id,
      loan_updated: loanUpdated,
    });

  } catch (error: unknown) {
    log.error('[Debug] Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
