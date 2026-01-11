import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createServiceRoleClient();

    // Find guest lender by access token
    const { data: lender, error: lenderError } = await supabase
      .from('guest_lenders')
      .select('*')
      .eq('access_token', token)
      .single();

    if (lenderError || !lender) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    // Check if token is expired
    if (lender.access_token_expires_at && new Date(lender.access_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'This link has expired' }, { status: 404 });
    }

    // Get all loans for this guest lender
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select(`
        id,
        amount,
        currency,
        status,
        interest_rate,
        total_amount,
        amount_paid,
        amount_remaining,
        start_date,
        created_at,
        borrower_invite_email,
        borrower:users!borrower_id(full_name, email)
      `)
      .eq('guest_lender_id', lender.id)
      .order('created_at', { ascending: false });

    // Also get loans sent to this email that don't have a guest_lender_id yet
    const { data: inviteLoans } = await supabase
      .from('loans')
      .select(`
        id,
        amount,
        currency,
        status,
        interest_rate,
        total_amount,
        amount_paid,
        amount_remaining,
        start_date,
        created_at,
        borrower_invite_email,
        borrower:users!borrower_id(full_name, email)
      `)
      .eq('invite_email', lender.email)
      .is('guest_lender_id', null)
      .order('created_at', { ascending: false });

    // Get loan_requests to get borrower names for guest borrowers
    const allLoanIds = [...(loans || []), ...(inviteLoans || [])].map(l => l.id);
    const { data: loanRequests } = await supabase
      .from('loan_requests')
      .select('loan_id, borrower_name')
      .in('loan_id', allLoanIds);
    
    const requestNameMap = new Map((loanRequests || []).map(r => [r.loan_id, r.borrower_name]));

    // Combine and format loans
    const allLoans = [...(loans || []), ...(inviteLoans || [])].map(loan => {
      const borrower = loan.borrower as any;
      // Try multiple sources for borrower name
      let borrowerName = borrower?.full_name || borrower?.email;
      if (!borrowerName) {
        borrowerName = requestNameMap.get(loan.id);
      }
      if (!borrowerName && loan.borrower_invite_email) {
        borrowerName = loan.borrower_invite_email.split('@')[0];
      }
      
      return {
        id: loan.id,
        borrower_name: borrowerName || 'Guest Borrower',
        amount: loan.amount,
        currency: loan.currency,
        status: loan.status,
        interest_rate: loan.interest_rate || 0,
        total_amount: loan.total_amount,
        amount_paid: loan.amount_paid || 0,
        amount_remaining: loan.amount_remaining || loan.total_amount,
        start_date: loan.start_date,
        created_at: loan.created_at,
      };
    });

    return NextResponse.json({
      lender: {
        id: lender.id,
        email: lender.email,
        full_name: lender.full_name,
        phone: lender.phone,
        paypal_email: lender.paypal_email,
        paypal_connected: lender.paypal_connected,
        total_loans: lender.total_loans,
        total_amount_lent: lender.total_amount_lent,
      },
      loans: allLoans,
    });
  } catch (error) {
    console.error('Error fetching guest lender data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
