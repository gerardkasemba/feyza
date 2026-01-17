import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { createFacilitatedTransfer } from '@/lib/dwolla';
import { sendEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// POST: Lender signs agreement and initiates ACH transfer to borrower
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const body = await request.json();
    const { agreementAccepted } = body;

    if (!agreementAccepted) {
      return NextResponse.json({ error: 'Agreement must be accepted' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const serviceSupabase = await createServiceRoleClient();

    // Get current user (lender)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with Dwolla info
    const { data: lenderProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!lenderProfile?.dwolla_funding_source_url) {
      return NextResponse.json({ error: 'Please connect your bank account first' }, { status: 400 });
    }

    // Get the loan with all details
    const { data: loan, error: loanError } = await serviceSupabase
      .from('loans')
      .select(`
        *,
        borrower:users!borrower_id(id, email, full_name, dwolla_funding_source_url, dwolla_customer_url, bank_name, bank_account_mask),
        business_lender:business_profiles!business_lender_id(id, business_name, contact_email, user_id)
      `)
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      console.error('Loan fetch error:', loanError);
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Verify the user is the lender for this loan
    let isLender = loan.lender_id === user.id;
    if (!isLender && loan.business_lender?.user_id === user.id) {
      isLender = true;
    }

    if (!isLender) {
      return NextResponse.json({ error: 'Only the lender can fund this loan' }, { status: 403 });
    }

    // Check if already funded
    if (loan.funds_sent || loan.disbursement_status === 'completed') {
      return NextResponse.json({ error: 'Loan has already been funded' }, { status: 400 });
    }

    // Get borrower's Dwolla info - check multiple sources
    const borrowerDwollaFundingSource = 
      loan.borrower_dwolla_funding_source_url ||
      loan.borrower?.dwolla_funding_source_url;

    if (!borrowerDwollaFundingSource) {
      return NextResponse.json({ 
        error: 'Borrower has not connected their bank account. Please ask them to connect their bank in Settings.' 
      }, { status: 400 });
    }

    console.log('[Fund] Initiating ACH transfer:', {
      loanId,
      amount: loan.amount,
      lenderFundingSource: lenderProfile.dwolla_funding_source_url,
      borrowerFundingSource: borrowerDwollaFundingSource,
    });

    // Initiate the ACH transfer via Dwolla
    let transferUrl = null;
    let transferIds: string[] = [];

    try {
      const result = await createFacilitatedTransfer({
        sourceFundingSourceUrl: lenderProfile.dwolla_funding_source_url,
        destinationFundingSourceUrl: borrowerDwollaFundingSource,
        amount: loan.amount,
        currency: 'USD',
        metadata: {
          loan_id: loanId,
          type: 'disbursement',
        },
      });

      transferUrl = result.transferUrl;
      transferIds = result.transferIds;
      console.log('[Fund] Transfer initiated:', { transferUrl, transferIds });

    } catch (dwollaError: any) {
      console.error('[Fund] Dwolla transfer error:', dwollaError);
      return NextResponse.json({ 
        error: 'Failed to initiate transfer. Please try again.',
        details: dwollaError.message || 'Dwolla transfer failed'
      }, { status: 500 });
    }

    // Record transfers in database
    for (let i = 0; i < transferIds.length; i++) {
      await serviceSupabase
        .from('transfers')
        .insert({
          loan_id: loanId,
          dwolla_transfer_id: transferIds[i],
          dwolla_transfer_url: `https://api-sandbox.dwolla.com/transfers/${transferIds[i]}`,
          type: 'disbursement',
          amount: loan.amount,
          currency: 'USD',
          status: 'pending',
        });
    }

    // Update loan - mark as funded and lender signed
    const { error: updateError } = await serviceSupabase
      .from('loans')
      .update({
        funds_sent: true,
        funds_sent_at: new Date().toISOString(),
        funds_sent_method: 'ach',
        lender_signed: true,
        lender_signed_at: new Date().toISOString(),
        disbursement_status: 'processing',
        disbursement_transfer_id: transferIds[transferIds.length - 1],
        // Update lender info if not already set
        lender_dwolla_customer_url: lenderProfile.dwolla_customer_url,
        lender_dwolla_customer_id: lenderProfile.dwolla_customer_id,
        lender_dwolla_funding_source_url: lenderProfile.dwolla_funding_source_url,
        lender_dwolla_funding_source_id: lenderProfile.dwolla_funding_source_id,
        lender_bank_name: lenderProfile.bank_name,
        lender_bank_account_mask: lenderProfile.bank_account_mask,
        lender_bank_connected: true,
      })
      .eq('id', loanId);

    if (updateError) {
      console.error('[Fund] Loan update error:', updateError);
      // Transfer already initiated, so don't fail completely
    }

    const lenderName = lenderProfile.full_name || loan.business_lender?.business_name || 'Your lender';
    const borrowerName = loan.borrower?.full_name || 'the borrower';
    const borrowerEmail = loan.borrower?.email;

    // Create notification for borrower
    await serviceSupabase.from('notifications').insert({
      user_id: loan.borrower_id,
      loan_id: loanId,
      type: 'funds_sent',
      title: '💵 Funds on the Way!',
      message: `${lenderName} has initiated a transfer of $${loan.amount.toLocaleString()} to your bank account. Expect it in 1-3 business days.`,
      is_read: false,
    });

    // Create notification for lender
    await serviceSupabase.from('notifications').insert({
      user_id: user.id,
      loan_id: loanId,
      type: 'funds_sent',
      title: '💸 Transfer Initiated',
      message: `You have initiated a transfer of $${loan.amount.toLocaleString()} to ${borrowerName}. The transfer will complete in 1-3 business days.`,
      is_read: false,
    });

    // Send email to borrower
    if (borrowerEmail) {
      await sendEmail({
        to: borrowerEmail,
        subject: `💵 ${lenderName} has sent you $${loan.amount.toLocaleString()}!`,
        html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0;">💵 Funds on the Way!</h1>
              </div>
              <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0;">
                <p style="font-size: 18px;">Hi ${borrowerName}! 👋</p>
                
                <p><strong>${lenderName}</strong> has initiated a bank transfer for your loan!</p>
                
                <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; border: 1px solid #bbf7d0;">
                  <p style="color: #6b7280; margin: 0;">Amount Being Transferred</p>
                  <p style="font-size: 32px; font-weight: bold; color: #22c55e; margin: 5px 0;">$${loan.amount.toLocaleString()}</p>
                  <p style="color: #6b7280; margin: 5px 0;">via ACH Bank Transfer</p>
                </div>
                
                <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0; color: #1e40af; font-size: 14px;">
                    <strong>⏱️ When will I receive it?</strong><br/>
                    The funds will arrive in your bank account within 1-3 business days.
                  </p>
                </div>
                
                <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>📅 Repayment Reminder:</strong><br/>
                    Your first payment of $${(loan.repayment_amount || 0).toLocaleString()} is due on ${new Date(loan.start_date).toLocaleDateString()}.
                  </p>
                </div>
                
                <a href="${APP_URL}/loans/${loanId}" style="display: block; background: #22c55e; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
                  View Loan Details →
                </a>
              </div>
            </body>
          </html>
        `,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Transfer initiated successfully',
      transferIds,
    });

  } catch (error: any) {
    console.error('[Fund] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
