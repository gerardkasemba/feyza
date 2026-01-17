import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getLoanAcceptedEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const supabase = await createServerSupabaseClient();
    const serviceSupabase = await createServiceRoleClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the loan with all details
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*, borrower:users!borrower_id(*)')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Verify user is the lender or business owner
    let isAuthorized = loan.lender_id === user.id;
    let lenderName = user.user_metadata?.full_name || 'Your lender';
    
    if (!isAuthorized && loan.business_lender_id) {
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('user_id, business_name')
        .eq('id', loan.business_lender_id)
        .single();
      
      isAuthorized = businessProfile?.user_id === user.id;
      if (businessProfile?.business_name) {
        lenderName = businessProfile.business_name;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Update loan status to active and set lender_id
    // The lender will then need to go to the fund page to sign and send funds
    const { error: updateError } = await supabase
      .from('loans')
      .update({
        status: 'active',
        lender_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId);

    if (updateError) {
      console.error('Error updating loan:', updateError);
      return NextResponse.json({ error: 'Failed to accept loan' }, { status: 500 });
    }

    // Create disbursement if loan has recipient info (for diaspora loans)
    if (loan.recipient_name && loan.disbursement_method) {
      try {
        await serviceSupabase.from('disbursements').insert({
          loan_id: loanId,
          amount: loan.amount,
          currency: loan.currency || 'USD',
          disbursement_method: loan.disbursement_method,
          // Mobile Money
          mobile_provider: loan.mobile_money_provider,
          mobile_number: loan.mobile_money_phone,
          mobile_name: loan.mobile_money_name,
          // Bank Transfer
          bank_name: loan.bank_name,
          bank_account_name: loan.bank_account_name,
          bank_account_number: loan.bank_account_number,
          bank_branch: loan.bank_branch,
          bank_swift_code: loan.bank_swift_code,
          // Cash Pickup
          pickup_location: loan.cash_pickup_location,
          // Recipient
          recipient_name: loan.recipient_name,
          recipient_phone: loan.recipient_phone,
          recipient_id_type: loan.picker_id_type,
          recipient_id_number: loan.picker_id_number,
          recipient_country: loan.recipient_country,
          status: 'pending',
        });
        console.log('Disbursement created for loan:', loanId);
      } catch (disbursementError) {
        console.error('Error creating disbursement:', disbursementError);
        // Don't fail the loan acceptance if disbursement creation fails
      }
    }

    // Create notification for borrower
    try {
      await supabase.from('notifications').insert({
        user_id: loan.borrower_id,
        loan_id: loanId,
        type: 'loan_accepted',
        title: 'Loan Accepted! 🎉',
        message: `${lenderName} has accepted your loan request for ${loan.currency} ${loan.amount}. They will send the funds shortly.`,
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    // Send email to borrower
    if (loan.borrower?.email) {
      try {
        const { subject, html } = getLoanAcceptedEmail({
          borrowerName: loan.borrower.full_name || 'there',
          lenderName,
          amount: loan.amount,
          currency: loan.currency,
          loanId: loan.id,
        });

        await sendEmail({ to: loan.borrower.email, subject, html });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    }

    // Redirect to fund page so lender can sign and send funds
    return NextResponse.json({ 
      success: true, 
      redirectUrl: `/loans/${loanId}/fund`,
      message: 'Loan accepted! Please proceed to fund the loan.',
    });
  } catch (error) {
    console.error('Error accepting loan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
