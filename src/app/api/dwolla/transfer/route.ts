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
        subject: 'Loan Funds on the Way!',
        html: `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f9fafb; padding:20px;">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.05);">

          <!-- Header -->
          <div style="background:linear-gradient(135deg,#059669,#047857);padding:30px;text-align:center;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:15px;">
                  <img
                    src="https://feyza.app/feyza.png"
                    alt="Feyza"
                    height="42"
                    style="display:block;border:0;outline:none;"
                  />
                </td>
              </tr>
            </table>
            <h1 style="color:white;margin:0;font-size:26px;">Loan Funds on the Way</h1>
          </div>

          <!-- Content -->
          <div style="padding:32px;text-align:center;">
            <p style="font-size:16px;color:#374151;margin-bottom:16px;">
              Great news! <strong>${sourceUser.full_name || 'Your lender'}</strong> has sent you
              <strong>$${amount}</strong>.
            </p>

            <p style="font-size:15px;color:#6b7280;margin-bottom:24px;">
              The funds should arrive in your bank account within <strong>1–3 business days</strong>.
            </p>

            <a
              href="${APP_URL}/loans/${loan_id}"
              style="display:inline-block;background:#059669;color:white;text-decoration:none;
                    padding:14px 28px;border-radius:10px;font-weight:600;font-size:16px;"
            >
              View Loan Details
            </a>
          </div>

          <!-- Footer -->
          <div style="background:#f0fdf4;padding:20px;text-align:center;font-size:12px;color:#065f46;">
            <p style="margin:0;">This notification was sent by Feyza</p>
          </div>

        </div>
      </body>
    </html>
        `,
      });
    }else if (type === 'repayment') {
      // Notify lender
      await sendEmail({
        to: destinationUser.email,
        subject: 'Payment Received!',
        html: `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f9fafb; padding:20px;">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.05);">

          <!-- Header -->
          <div style="background:linear-gradient(135deg,#059669,#047857);padding:30px;text-align:center;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:15px;">
                  <img
                    src="https://feyza.app/feyza.png"
                    alt="Feyza"
                    height="42"
                    style="display:block;border:0;outline:none;"
                  />
                </td>
              </tr>
            </table>
            <h1 style="color:white;margin:0;font-size:26px;">Payment Received</h1>
          </div>

          <!-- Content -->
          <div style="padding:32px;text-align:center;">
            <p style="font-size:16px;color:#374151;margin-bottom:16px;">
              <strong>${sourceUser.full_name || 'The borrower'}</strong> has sent you
              <strong>$${amount}</strong> as a loan repayment.
            </p>

            <p style="font-size:15px;color:#6b7280;margin-bottom:24px;">
              The funds should arrive in your bank account within <strong>1–3 business days</strong>.
            </p>

            <a
              href="${APP_URL}/loans/${loan_id}"
              style="display:inline-block;background:#059669;color:white;text-decoration:none;
                    padding:14px 28px;border-radius:10px;font-weight:600;font-size:16px;"
            >
              View Loan Details
            </a>
          </div>

          <!-- Footer -->
          <div style="background:#f0fdf4;padding:20px;text-align:center;font-size:12px;color:#065f46;">
            <p style="margin:0;">This notification was sent by Feyza</p>
          </div>

        </div>
      </body>
    </html>
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
