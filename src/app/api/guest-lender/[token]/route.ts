import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createServiceRoleClient();

    // Find loan by invite_token (this is the lender's access token)
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        amount,
        currency,
        purpose,
        status,
        interest_rate,
        interest_type,
        total_interest,
        total_amount,
        amount_paid,
        amount_remaining,
        repayment_frequency,
        total_installments,
        repayment_amount,
        start_date,
        created_at,
        borrower_invite_email,
        borrower_name,
        borrower_bank_connected,
        lender_name,
        lender_email,
        lender_bank_name,
        lender_bank_account_mask,
        lender_bank_connected,
        disbursement_status,
        disbursement_transfer_id,
        disbursed_at,
        auto_pay_enabled,
        schedule:payment_schedule(
          id,
          due_date,
          amount,
          principal_amount,
          interest_amount,
          is_paid,
          paid_at
        ),
        transfers(
          id,
          type,
          amount,
          status,
          created_at
        )
      `)
      .eq('invite_token', token)
      .single();

    if (loanError || !loan) {
      console.error('Loan fetch error:', loanError);
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    // Also try to get borrower name from loan_request if not on loan
    if (!loan.borrower_name) {
      const { data: loanRequest } = await supabase
        .from('loan_requests')
        .select('borrower_name')
        .eq('loan_id', loan.id)
        .single();
      
      if (loanRequest?.borrower_name) {
        loan.borrower_name = loanRequest.borrower_name;
      }
    }

    // Sort schedule by due date
    if (loan.schedule) {
      loan.schedule.sort((a: any, b: any) => 
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      );
    }

    // Sort transfers by date (newest first)
    if (loan.transfers) {
      loan.transfers.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return NextResponse.json({ loan });

  } catch (error) {
    console.error('Guest lender API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
