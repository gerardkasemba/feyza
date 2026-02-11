import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const supabase = await createServerSupabaseClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Verify user is the lender or business owner
    let isAuthorized = loan.lender_id === user.id;
    
    if (!isAuthorized && loan.business_lender_id) {
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('user_id')
        .eq('id', loan.business_lender_id)
        .single();
      
      isAuthorized = businessProfile?.user_id === user.id;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Update loan status
    const { error: updateError } = await supabase
      .from('loans')
      .update({
        status: 'declined',
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId);

    if (updateError) {
      console.error('Error declining loan:', updateError);
      return NextResponse.json({ error: 'Failed to decline loan' }, { status: 500 });
    }
    // Release reserved capital if this was a matched loan
    if (loan.business_lender_id || loan.lender_id) {
      try {
        const serviceSupabase = await createServiceRoleClient();
        
        // Determine which lender preference to update
        const lenderFilter = loan.business_lender_id 
          ? `business_id.eq.${loan.business_lender_id}`
          : `user_id.eq.${loan.lender_id}`;
        
        // Get the lender preference record
        const { data: lenderPref } = await serviceSupabase
          .from('lender_preferences')
          .select('id, capital_reserved')
          .or(lenderFilter)
          .single();

        if (lenderPref) {
          // Release the reserved capital
          const newReserved = Math.max(0, (lenderPref.capital_reserved || 0) - loan.amount);
          
          await serviceSupabase
            .from('lender_preferences')
            .update({ capital_reserved: newReserved })
            .eq('id', lenderPref.id);

          console.log(`[Decline] Released ${loan.amount} capital from lender preference ${lenderPref.id}. New reserved: ${newReserved}`);
        }
      } catch (releaseError) {
        console.error('[Decline] Error releasing capital:', releaseError);
        // Don't fail the decline if capital release fails
      }
    }
    // Create notification for borrower
    try {
      await supabase.from('notifications').insert({
        user_id: loan.borrower_id,
        loan_id: loanId,
        type: 'loan_declined',
        title: 'Loan Request Declined',
        message: `Your loan request for ${loan.currency} ${loan.amount} was declined.`,
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    return NextResponse.json({ success: true, redirectUrl: loan.business_lender_id ? '/business' : '/dashboard' });
  } catch (error) {
    console.error('Error declining loan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
