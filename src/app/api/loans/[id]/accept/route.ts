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

    // Get the loan with all details using service role to avoid RLS issues
    const { data: loan, error: loanError } = await serviceSupabase
      .from('loans')
      .select('*, borrower:users!borrower_id(*)')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      console.error('Error fetching loan:', loanError);
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Check loan status
    if (loan.status !== 'pending' && loan.status !== 'matched') {
      return NextResponse.json({ 
        error: `Cannot accept loan with status: ${loan.status}` 
      }, { status: 400 });
    }

    // Verify user is the lender or business owner
    let isAuthorized = false;
    let lenderName = user.user_metadata?.full_name || 'Your lender';
    
    // Check if user is individual lender
    if (loan.lender_id === user.id) {
      isAuthorized = true;
    }
    
    // Check if user owns the business lender
    if (!isAuthorized && loan.business_lender_id) {
      const { data: businessProfile } = await serviceSupabase
        .from('business_profiles')
        .select('user_id, business_name')
        .eq('id', loan.business_lender_id)
        .single();
      
      if (businessProfile?.user_id === user.id) {
        isAuthorized = true;
        if (businessProfile?.business_name) {
          lenderName = businessProfile.business_name;
        }
      }
    }
    
    // Check if loan was sent directly to this user (no lender assigned yet)
    // This handles the case where loan is pending/matched but no lender_id
    if (!isAuthorized && !loan.lender_id) {
      // Check if there's a lender match for this user
      const { data: match } = await serviceSupabase
        .from('lender_matches')
        .select('id')
        .eq('loan_id', loanId)
        .eq('lender_id', user.id)
        .single();
      
      if (match) {
        isAuthorized = true;
      }
      
      // Also check if user has a business that was matched
      if (!isAuthorized) {
        const { data: businessMatch } = await serviceSupabase
          .from('lender_matches')
          .select('id, business_profiles!inner(user_id, business_name)')
          .eq('loan_id', loanId)
          .not('business_lender_id', 'is', null);
        
        const userMatch = businessMatch?.find((m: any) => 
          m.business_profiles?.user_id === user.id
        );
        if (userMatch) {
          isAuthorized = true;
          lenderName = (userMatch as any).business_profiles?.business_name || lenderName;
        }
      }
    }

    // Get user's full name for lender name if not set
    if (isAuthorized && lenderName === 'Your lender') {
      const { data: userProfile } = await serviceSupabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (userProfile?.full_name) {
        lenderName = userProfile.full_name;
      }
    }

    if (!isAuthorized) {
      console.log('Authorization failed for user:', user.id, 'on loan:', loanId);
      return NextResponse.json({ error: 'Not authorized to accept this loan' }, { status: 403 });
    }

    // Update loan status to active and set lender_id using service role
    const { error: updateError } = await serviceSupabase
      .from('loans')
      .update({
        status: 'active',
        lender_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId);

    if (updateError) {
      console.error('Error updating loan:', updateError);
      return NextResponse.json({ error: 'Failed to accept loan: ' + updateError.message }, { status: 500 });
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
      await serviceSupabase.from('notifications').insert({
        user_id: loan.borrower_id,
        loan_id: loanId,
        type: 'loan_accepted',
        title: 'Loan Accepted! 🎉',
        message: `${lenderName} has accepted your loan request for ${loan.currency || 'USD'} ${loan.amount}. They will send the funds shortly.`,
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
          currency: loan.currency || 'USD',
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
  } catch (error: any) {
    console.error('Error accepting loan:', error);
    return NextResponse.json({ error: 'Internal server error: ' + (error.message || 'Unknown error') }, { status: 500 });
  }
}
