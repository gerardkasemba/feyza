import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { createFacilitatedTransfer, getTransfer, getMasterAccountBalance } from '@/lib/dwolla';
import { sendEmail, getFundsOnTheWayEmail, getPaymentReceivedLenderEmail } from '@/lib/email';

// POST: Create a transfer (loan disbursement or repayment)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { 
      type, // 'disbursement' | 'repayment'
      loan_id,
      amount,
      source_user_id,
      destination_user_id,
    } = body;

    if (!type || !loan_id || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use service role for database operations
    const adminSupabase = await createServiceRoleClient();

    // Get loan details
    const { data: loan, error: loanError } = await adminSupabase
      .from('loans')
      .select(`
        *,
        borrower:users!borrower_id(*),
        lender:users!lender_id(*),
        business_lender:business_profiles!business_lender_id(*, owner:users!user_id(*))
      `)
      .eq('id', loan_id)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    let sourceFundingUrl: string;
    let destinationFundingUrl: string;
    let sourceUser: any;
    let destinationUser: any;

    if (type === 'disbursement') {
      // Lender sends money to borrower
      if (loan.business_lender_id) {
        // Business lender
        const businessOwner = loan.business_lender?.owner;
        if (!businessOwner?.dwolla_funding_source_url) {
          return NextResponse.json(
            { error: 'Lender has not connected a bank account' },
            { status: 400 }
          );
        }
        sourceFundingUrl = businessOwner.dwolla_funding_source_url;
        sourceUser = businessOwner;
      } else {
        // Personal lender
        if (!loan.lender?.dwolla_funding_source_url) {
          return NextResponse.json(
            { error: 'Lender has not connected a bank account' },
            { status: 400 }
          );
        }
        sourceFundingUrl = loan.lender.dwolla_funding_source_url;
        sourceUser = loan.lender;
      }

      // Borrower destination
      if (!loan.borrower?.dwolla_funding_source_url) {
        return NextResponse.json(
          { error: 'Borrower has not connected a bank account' },
          { status: 400 }
        );
      }
      destinationFundingUrl = loan.borrower.dwolla_funding_source_url;
      destinationUser = loan.borrower;
    } else if (type === 'repayment') {
      // Borrower sends money to lender
      if (!loan.borrower?.dwolla_funding_source_url) {
        return NextResponse.json(
          { error: 'Borrower has not connected a bank account' },
          { status: 400 }
        );
      }
      sourceFundingUrl = loan.borrower.dwolla_funding_source_url;
      sourceUser = loan.borrower;

      if (loan.business_lender_id) {
        // Business lender
        const businessOwner = loan.business_lender?.owner;
        if (!businessOwner?.dwolla_funding_source_url) {
          return NextResponse.json(
            { error: 'Lender has not connected a bank account' },
            { status: 400 }
          );
        }
        destinationFundingUrl = businessOwner.dwolla_funding_source_url;
        destinationUser = businessOwner;
      } else {
        // Personal lender
        if (!loan.lender?.dwolla_funding_source_url) {
          return NextResponse.json(
            { error: 'Lender has not connected a bank account' },
            { status: 400 }
          );
        }
        destinationFundingUrl = loan.lender.dwolla_funding_source_url;
        destinationUser = loan.lender;
      }
    } else {
      return NextResponse.json({ error: 'Invalid transfer type' }, { status: 400 });
    }

    // IDEMPOTENCY CHECK: Check if a transfer of this type already exists for this loan
    // For disbursements, only one can exist per loan
    // For repayments, we check by payment_schedule_id if provided, or skip check
    if (type === 'disbursement') {
      const { data: existingTransfer } = await adminSupabase
        .from('transfers')
        .select('id, dwolla_transfer_id, status')
        .eq('loan_id', loan_id)
        .eq('type', 'disbursement')
        .limit(1)
        .single();
      
      if (existingTransfer) {
        console.log(`[Dwolla Transfer] Disbursement already exists for loan ${loan_id}: ${existingTransfer.dwolla_transfer_id}`);
        return NextResponse.json({
          success: true,
          message: 'Disbursement already processed',
          transfer_id: existingTransfer.dwolla_transfer_id,
          transfer_url: `https://api-sandbox.dwolla.com/transfers/${existingTransfer.dwolla_transfer_id}`,
          status: existingTransfer.status,
          already_existed: true,
        });
      }
    }

    // Create the facilitated transfer in Dwolla (routes through Master Account)
    const { transferUrl, transferIds } = await createFacilitatedTransfer({
      sourceFundingSourceUrl: sourceFundingUrl,
      destinationFundingSourceUrl: destinationFundingUrl,
      amount: parseFloat(amount),
      metadata: {
        loan_id: loan_id,
        type: type,
      },
    });

    const transferId = transferIds.length > 0 ? transferIds[transferIds.length - 1] : null;

    // Record only ONE transfer in our database (the main transfer ID)
    // Note: Dwolla facilitated transfers create 2 internal transfers (source→master, master→destination)
    // but from the user's perspective, this is one single transfer
    if (transferId) {
      // Use upsert to prevent duplicates (in case of race conditions)
      await adminSupabase
        .from('transfers')
        .upsert({
          loan_id: loan_id,
          dwolla_transfer_id: transferId,
          dwolla_transfer_url: `https://api-sandbox.dwolla.com/transfers/${transferId}`,
          type: type,
          amount: parseFloat(amount),
          currency: 'USD',
          status: 'pending',
          source_user_id: sourceUser.id,
          destination_user_id: destinationUser.id,
        }, {
          onConflict: 'dwolla_transfer_id',
          ignoreDuplicates: true,
        });
    }

    // Update loan status if disbursement
    if (type === 'disbursement') {
      await adminSupabase
        .from('loans')
        .update({
          status: 'active',
          disbursement_status: 'processing',
          disbursement_transfer_id: transferId,
          disbursed_at: new Date().toISOString(),
        })
        .eq('id', loan_id);
    }

    // Get names and emails for notifications
    const borrowerName = loan.borrower?.full_name || 'Borrower';
    const borrowerEmail = loan.borrower?.email;
    const lenderName = loan.business_lender?.business_name || loan.lender?.full_name || 'Lender';
    const lenderEmail = loan.business_lender?.owner?.email || loan.lender?.email;

    // Send notification emails
        
    if (type === 'disbursement') {
      // Notify borrower
      const fundsEmail = getFundsOnTheWayEmail({
        borrowerName: borrowerName,
        lenderName: lenderName,
        amount: loan.amount,
        currency: loan.currency,
        loanId: loan.id,
      });
      await sendEmail({
        to: borrowerEmail,
        subject: fundsEmail.subject,
        html: fundsEmail.html,
      });
    }else if (type === 'repayment') {
      // Calculate remaining balance after this payment
      const remainingBalance = Math.max(0, (loan.amount_remaining || loan.total_due || loan.amount) - parseFloat(amount));
      
      // Notify lender
      const receivedEmail = getPaymentReceivedLenderEmail({
        lenderName: lenderName,
        borrowerName: borrowerName,
        amount: parseFloat(amount),
        currency: loan.currency,
        remainingBalance: remainingBalance,
        loanId: loan.id,
        isCompleted: remainingBalance <= 0,
      });
      await sendEmail({
        to: lenderEmail,
        subject: receivedEmail.subject,
        html: receivedEmail.html,
      });
    }

    return NextResponse.json({
      success: true,
      transfer_id: transferId,
      transfer_url: transferUrl,
      transfer_ids: transferIds,
      status: 'pending',
    });
  } catch (error: any) {
    console.error('Error creating transfer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create transfer' },
      { status: 500 }
    );
  }
}

// GET: Get transfer status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transferId = searchParams.get('id');

    if (!transferId) {
      return NextResponse.json({ error: 'Transfer ID required' }, { status: 400 });
    }

    const transfer = await getTransfer(`https://api-sandbox.dwolla.com/transfers/${transferId}`);

    return NextResponse.json({
      id: transfer.id,
      status: transfer.status,
      amount: transfer.amount,
      created: transfer.created,
    });
  } catch (error: any) {
    console.error('Error getting transfer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get transfer status' },
      { status: 500 }
    );
  }
}
