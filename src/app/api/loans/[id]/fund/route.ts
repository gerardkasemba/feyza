import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { createFacilitatedTransfer } from '@/lib/dwolla';
import { sendEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// POST: Lender signs agreement and funds the loan
// Supports both ACH (Dwolla) and manual payment methods
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const body = await request.json();
    const { agreementAccepted, manualPayment, paymentMethod, transactionRef, receiptUrl } = body;

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

    // Get user profile
    const { data: lenderProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // Check if Dwolla is enabled
    let isDwollaEnabled = false;
    try {
      // First, check if Dwolla row exists at all
      const { data: allProviders, error: listError } = await serviceSupabase
        .from('payment_providers')
        .select('slug, is_enabled')
        .limit(10);
      
      console.log('[Fund] All payment providers:', allProviders?.map(p => `${p.slug}:${p.is_enabled}`));
      
      if (listError) {
        console.error('[Fund] Error listing providers:', listError.message);
      }

      // Query Dwolla provider status
      const { data: dwollaProvider, error: dwollaError } = await serviceSupabase
        .from('payment_providers')
        .select('slug, is_enabled, is_available_for_disbursement, supported_countries')
        .eq('slug', 'dwolla')
        .maybeSingle(); // Use maybeSingle to not throw if not found
      
      if (dwollaError) {
        console.log('[Fund] Dwolla query error:', dwollaError.message);
      } else if (!dwollaProvider) {
        console.log('[Fund] ❌ Dwolla provider NOT FOUND in database!');
      } else {
        console.log('[Fund] Dwolla provider status:', {
          is_enabled: dwollaProvider.is_enabled,
          is_available_for_disbursement: dwollaProvider.is_available_for_disbursement,
          supported_countries: dwollaProvider.supported_countries,
        });
        
        isDwollaEnabled = dwollaProvider.is_enabled === true && 
                          dwollaProvider.is_available_for_disbursement === true;
      }
    } catch (e: any) {
      console.error('[Fund] Error checking Dwolla:', e.message);
      isDwollaEnabled = false;
    }

    console.log('[Fund] Payment mode:', isDwollaEnabled ? 'ACH (Dwolla)' : 'Manual');
    console.log('[Fund] Request body manualPayment flag:', body.manualPayment);

    // For ACH payments, require bank connection
    if (isDwollaEnabled && !manualPayment) {
      if (!lenderProfile?.dwolla_funding_source_url) {
        return NextResponse.json({ error: 'Please connect your bank account first' }, { status: 400 });
      }
    }

    // Get the loan with all details
    const { data: loan, error: loanError } = await serviceSupabase
      .from('loans')
      .select(`
        *,
        borrower:users!borrower_id(id, email, full_name, dwolla_funding_source_url, dwolla_customer_url, bank_name, bank_account_mask, phone),
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

    const lenderName = lenderProfile?.full_name || loan.business_lender?.business_name || 'Your lender';
    const borrowerName = loan.borrower?.full_name || 'the borrower';
    const borrowerEmail = loan.borrower?.email;

    // === MANUAL PAYMENT FLOW ===
    if (!isDwollaEnabled || manualPayment) {
      console.log('[Fund] Processing manual payment:', { paymentMethod, transactionRef, receiptUrl });

      // Update loan - mark as funded manually
      const { error: updateError } = await serviceSupabase
        .from('loans')
        .update({
          funds_sent: true,
          funds_sent_at: new Date().toISOString(),
          funds_sent_method: paymentMethod || 'manual',
          funds_sent_reference: transactionRef || null,
          disbursement_receipt_url: receiptUrl || null,
          lender_signed: true,
          lender_signed_at: new Date().toISOString(),
          disbursement_status: 'pending_confirmation', // Borrower needs to confirm receipt
          status: 'active', // Activate the loan
        })
        .eq('id', loanId);

      if (updateError) {
        console.error('[Fund] Loan update error:', updateError);
        return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 });
      }

      // Create notification for borrower
      await serviceSupabase.from('notifications').insert({
        user_id: loan.borrower_id,
        loan_id: loanId,
        type: 'funds_sent',
        title: '💵 Funds Sent!',
        message: `${lenderName} has sent you $${loan.amount.toLocaleString()} via ${paymentMethod || 'external transfer'}. Please confirm when you receive it.`,
        is_read: false,
      });

      // Create notification for lender
      await serviceSupabase.from('notifications').insert({
        user_id: user.id,
        loan_id: loanId,
        type: 'funds_sent',
        title: '✅ Loan Funded',
        message: `You've confirmed sending $${loan.amount.toLocaleString()} to ${borrowerName}. The loan is now active.`,
        is_read: false,
      });

      // Send email to borrower
      if (borrowerEmail) {
        await sendEmail({
          to: borrowerEmail,
          subject: `${lenderName} has sent you $${loan.amount.toLocaleString()}!`,
          html: `
          <!DOCTYPE html>
          <html lang="en">
            <body style="
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9fafb;
            ">
              <div style="
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 10px 25px rgba(0,0,0,0.05);
              ">
                <div style="
                  background: linear-gradient(135deg, #059669 0%, #047857 100%);
                  padding: 30px;
                  text-align: center;
                ">
                  <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">
                    💵 Funds Sent!
                  </h1>
                </div>

                <div style="background: #f0fdf4; padding: 30px; border: 1px solid #bbf7d0;">
                  <p style="font-size: 18px; margin-top: 0;">
                    Hi ${borrowerName}! 👋
                  </p>

                  <p>
                    <strong>${lenderName}</strong> has sent you funds for your loan.
                  </p>

                  <div style="
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    margin: 24px 0;
                    text-align: center;
                    border: 1px solid #bbf7d0;
                  ">
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Amount Sent</p>
                    <p style="font-size: 32px; font-weight: bold; color: #059669; margin: 6px 0;">
                      $${loan.amount.toLocaleString()}
                    </p>
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">
                      via ${paymentMethod || 'External Transfer'}
                    </p>
                  </div>

                  <div style="
                    background: #fef3c7;
                    border: 1px solid #fcd34d;
                    border-radius: 8px;
                    padding: 16px;
                    margin: 20px 0;
                  ">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                      <strong>📅 Repayment Reminder</strong><br/>
                      Your first payment of <strong>$${(loan.repayment_amount || 0).toLocaleString()}</strong>
                      is due on <strong>${loan.start_date ? new Date(loan.start_date).toLocaleDateString() : 'the agreed date'}</strong>.
                    </p>
                  </div>

                  <a href="${APP_URL}/loans/${loanId}" style="
                    display: block;
                    background: linear-gradient(to right, #059669, #047857);
                    color: white;
                    text-decoration: none;
                    padding: 16px 32px;
                    border-radius: 8px;
                    font-weight: 600;
                    text-align: center;
                    margin: 28px 0 10px;
                  ">
                    View Loan Details →
                  </a>
                </div>
              </div>
            </body>
          </html>
          `,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Loan funded successfully',
        method: 'manual',
        paymentMethod: paymentMethod || 'manual',
      });
    }

    // === ACH PAYMENT FLOW (Dwolla) ===
    // Get borrower's Dwolla info
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
      lenderFundingSource: lenderProfile?.dwolla_funding_source_url,
      borrowerFundingSource: borrowerDwollaFundingSource,
    });

    // IDEMPOTENCY CHECK: Check if a disbursement transfer already exists
    const { data: existingDisbursement } = await serviceSupabase
      .from('transfers')
      .select('id, dwolla_transfer_id, status')
      .eq('loan_id', loanId)
      .eq('type', 'disbursement')
      .limit(1)
      .single();
    
    if (existingDisbursement) {
      console.log(`[Fund] Disbursement already exists for loan ${loanId}`);
      return NextResponse.json({
        success: true,
        message: 'Disbursement already processed',
        transfer_id: existingDisbursement.dwolla_transfer_id,
        status: existingDisbursement.status,
        already_existed: true,
      });
    }

    // Initiate the ACH transfer via Dwolla
    let transferUrl = null;
    let transferIds: string[] = [];

    try {
      const result = await createFacilitatedTransfer({
        sourceFundingSourceUrl: lenderProfile!.dwolla_funding_source_url,
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

    // Record transfer in database
    const mainTransferId = transferIds[transferIds.length - 1];
    if (mainTransferId) {
      await serviceSupabase
        .from('transfers')
        .upsert({
          loan_id: loanId,
          dwolla_transfer_id: mainTransferId,
          dwolla_transfer_url: `https://api-sandbox.dwolla.com/transfers/${mainTransferId}`,
          type: 'disbursement',
          amount: loan.amount,
          currency: 'USD',
          status: 'pending',
        }, {
          onConflict: 'dwolla_transfer_id',
          ignoreDuplicates: true,
        });
    }

    // Update loan
    await serviceSupabase
      .from('loans')
      .update({
        funds_sent: true,
        funds_sent_at: new Date().toISOString(),
        funds_sent_method: 'ach',
        lender_signed: true,
        lender_signed_at: new Date().toISOString(),
        disbursement_status: 'processing',
        disbursement_transfer_id: transferIds[transferIds.length - 1],
        lender_dwolla_customer_url: lenderProfile?.dwolla_customer_url,
        lender_dwolla_customer_id: lenderProfile?.dwolla_customer_id,
        lender_dwolla_funding_source_url: lenderProfile?.dwolla_funding_source_url,
        lender_dwolla_funding_source_id: lenderProfile?.dwolla_funding_source_id,
        lender_bank_name: lenderProfile?.bank_name,
        lender_bank_account_mask: lenderProfile?.bank_account_mask,
        lender_bank_connected: true,
      })
      .eq('id', loanId);

    // Create notifications
    await serviceSupabase.from('notifications').insert({
      user_id: loan.borrower_id,
      loan_id: loanId,
      type: 'funds_sent',
      title: '💵 Funds on the Way!',
      message: `${lenderName} has initiated a transfer of $${loan.amount.toLocaleString()} to your bank account. Expect it in 1-3 business days.`,
      is_read: false,
    });

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
        subject: `${lenderName} has sent you $${loan.amount.toLocaleString()}!`,
        html: `
        <!DOCTYPE html>
        <html lang="en">
          <body style="
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
          ">
            <div style="
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 10px 25px rgba(0,0,0,0.05);
            ">
              <div style="
                background: linear-gradient(135deg, #059669 0%, #047857 100%);
                padding: 30px;
                text-align: center;
              ">
                <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">
                  💵 Funds on the Way!
                </h1>
              </div>

              <div style="background: #f0fdf4; padding: 30px; border: 1px solid #bbf7d0;">
                <p style="font-size: 18px; margin-top: 0;">Hi ${borrowerName}! 👋</p>
                <p><strong>${lenderName}</strong> has initiated a bank transfer for your loan.</p>

                <div style="
                  background: white;
                  padding: 20px;
                  border-radius: 12px;
                  margin: 24px 0;
                  text-align: center;
                  border: 1px solid #bbf7d0;
                ">
                  <p style="color: #6b7280; margin: 0; font-size: 14px;">Amount Being Transferred</p>
                  <p style="font-size: 32px; font-weight: bold; color: #059669; margin: 6px 0;">
                    $${loan.amount.toLocaleString()}
                  </p>
                  <p style="color: #6b7280; margin: 0; font-size: 14px;">via ACH Bank Transfer</p>
                </div>

                <div style="
                  background: #ecfdf5;
                  border: 1px solid #bbf7d0;
                  border-radius: 8px;
                  padding: 16px;
                  margin: 20px 0;
                ">
                  <p style="margin: 0; color: #065f46; font-size: 14px;">
                    <strong>⏱️ When will I receive it?</strong><br/>
                    Funds typically arrive in your bank account within <strong>1–3 business days</strong>.
                  </p>
                </div>

                <div style="
                  background: #fef3c7;
                  border: 1px solid #fcd34d;
                  border-radius: 8px;
                  padding: 16px;
                  margin: 20px 0;
                ">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>📅 Repayment Reminder</strong><br/>
                    Your first payment of <strong>$${(loan.repayment_amount || 0).toLocaleString()}</strong>
                    is due on <strong>${loan.start_date ? new Date(loan.start_date).toLocaleDateString() : 'the agreed date'}</strong>.
                  </p>
                </div>

                <a href="${APP_URL}/loans/${loanId}" style="
                  display: block;
                  background: linear-gradient(to right, #059669, #047857);
                  color: white;
                  text-decoration: none;
                  padding: 16px 32px;
                  border-radius: 8px;
                  font-weight: 600;
                  text-align: center;
                  margin: 28px 0 10px;
                ">
                  View Loan Details →
                </a>
              </div>
            </div>
          </body>
        </html>
        `,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Transfer initiated successfully',
      method: 'ach',
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
