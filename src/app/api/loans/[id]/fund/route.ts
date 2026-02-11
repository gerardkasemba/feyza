import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { createFacilitatedTransfer } from '@/lib/dwolla';
import { sendEmail, getFundsOnTheWayEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// POST: Lender signs agreement and initiates transfer to borrower (ACH or Manual)
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

    // Handle MANUAL payment flow
    if (manualPayment) {
      console.log('[Fund API] Processing manual payment:', { paymentMethod, transactionRef, receiptUrl: !!receiptUrl });
      
      // Update loan with manual funding info (use existing columns)
      const { error: updateError } = await serviceSupabase
        .from('loans')
        .update({
          funds_sent: true,
          funds_sent_at: new Date().toISOString(),
          funds_sent_method: paymentMethod || 'manual',
          funds_sent_reference: transactionRef || null,
          funds_sent_note: receiptUrl ? `Receipt: ${receiptUrl}` : null,
          disbursement_status: 'completed',
          lender_signed: true,
          lender_signed_at: new Date().toISOString(),
        })
        .eq('id', loanId);

      if (updateError) {
        console.error('Failed to update loan:', updateError);
        return NextResponse.json({ error: 'Failed to record funding' }, { status: 500 });
      }

      // Send notification to borrower
      if (loan.borrower?.email) {
        try {
          const lenderName = loan.business_lender?.business_name || 
            (await serviceSupabase.from('users').select('full_name').eq('id', user.id).single()).data?.full_name || 
            'Your lender';
          
          // Get email content from the helper function
          const emailContent = getFundsOnTheWayEmail({
            borrowerName: loan.borrower.full_name || 'there',
            lenderName: lenderName,
            amount: loan.amount,
            currency: loan.currency || 'USD',
            loanId: loanId,
          });
          
          await sendEmail({
            to: loan.borrower.email,
            subject: emailContent.subject,
            html: emailContent.html,
          });
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
          // Don't fail the request if email fails
        }
      }

      // Create notification
      await serviceSupabase.from('notifications').insert({
        user_id: loan.borrower_id,
        type: 'funds_sent',
        title: 'Funds Sent!',
        message: `Your lender has sent ${loan.currency || 'USD'} ${loan.amount.toLocaleString()} to you via ${paymentMethod || 'payment app'}.`,
        link: `/loans/${loanId}`,
      });

      return NextResponse.json({ 
        success: true,
        message: 'Manual funding recorded successfully',
        fundsSent: true,
      });
    }

    // Handle ACH/Dwolla payment flow (existing code)
    // Get user profile with Dwolla info
    const { data: lenderProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!lenderProfile?.dwolla_funding_source_url) {
      return NextResponse.json({ error: 'Please connect your bank account first' }, { status: 400 });
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

    // IDEMPOTENCY CHECK: Check if a disbursement transfer already exists for this loan
    const { data: existingDisbursement } = await serviceSupabase
      .from('transfers')
      .select('id, dwolla_transfer_id, status')
      .eq('loan_id', loanId)
      .eq('type', 'disbursement')
      .limit(1)
      .single();
    
    if (existingDisbursement) {
      console.log(`[Fund] Disbursement already exists for loan ${loanId}: ${existingDisbursement.dwolla_transfer_id}`);
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

    // Record only ONE transfer in database (the final transfer ID)
    // Note: Dwolla facilitated transfers create 2 internal transfers (source→master, master→destination)
    // but from the user's perspective, this is one single transfer
    const mainTransferId = transferIds[transferIds.length - 1];
    if (mainTransferId) {
      // Use upsert to prevent duplicates (in case of race conditions)
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
      try {
        // Get email content from helper function for consistency
        const emailContent = getFundsOnTheWayEmail({
          borrowerName: loan.borrower?.full_name || 'there',
          lenderName: lenderName,
          amount: loan.amount,
          currency: loan.currency || 'USD',
          loanId: loanId,
        });

        await sendEmail({
          to: borrowerEmail,
          subject: emailContent.subject,
          html: emailContent.html,
        });
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Don't fail the request if email fails
      }
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