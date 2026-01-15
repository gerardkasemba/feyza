import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { createFacilitatedTransfer, getTransfer, getMasterAccountBalance } from '@/lib/dwolla';
import { sendEmail } from '@/lib/email';

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

    // Record all transfers in our database
    for (const tid of transferIds) {
      await adminSupabase
        .from('transfers')
        .insert({
          loan_id: loan_id,
          dwolla_transfer_id: tid,
          dwolla_transfer_url: `https://api-sandbox.dwolla.com/transfers/${tid}`,
          type: type,
          amount: parseFloat(amount),
          currency: 'USD',
          status: 'pending',
          source_user_id: sourceUser.id,
          destination_user_id: destinationUser.id,
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

    // Send notification emails
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    if (type === 'disbursement') {
      // Notify borrower
      await sendEmail({
        to: destinationUser.email,
        subject: '💰 Loan Funds on the Way!',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your loan has been disbursed!</h2>
            <p>Great news! ${sourceUser.full_name || 'Your lender'} has sent you <strong>$${amount}</strong>.</p>
            <p>The funds should arrive in your bank account within 1-3 business days.</p>
            <a href="${APP_URL}/loans/${loan_id}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">View Loan Details</a>
          </div>
        `,
      });
    } else if (type === 'repayment') {
      // Notify lender
      await sendEmail({
        to: destinationUser.email,
        subject: '💵 Payment Received!',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You received a payment!</h2>
            <p>${sourceUser.full_name || 'The borrower'} has sent you <strong>$${amount}</strong> for loan repayment.</p>
            <p>The funds should arrive in your bank account within 1-3 business days.</p>
            <a href="${APP_URL}/loans/${loan_id}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">View Loan Details</a>
          </div>
        `,
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
