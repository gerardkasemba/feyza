import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Find loan requests by this email
    const { data: loanRequests, error: requestsError } = await supabase
      .from('loan_requests')
      .select('id, amount, currency, purpose, status, created_at')
      .eq('borrower_email', email.toLowerCase())
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('Error fetching loan requests:', requestsError);
      return NextResponse.json(
        { error: 'Failed to check status' },
        { status: 500 }
      );
    }

    // If we found requests, return them
    if (loanRequests && loanRequests.length > 0) {
      return NextResponse.json({
        success: true,
        requests: loanRequests.map(req => ({
          id: req.id,
          amount: req.amount,
          currency: req.currency || 'USD',
          purpose: req.purpose || 'Personal loan',
          status: req.status || 'pending',
          created_at: req.created_at,
        })),
      });
    }

    // No requests found - could also check loans table for accepted loans
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('id, amount, currency, purpose, status, created_at')
      .eq('borrower_invite_email', email.toLowerCase())
      .order('created_at', { ascending: false });

    if (loansError) {
      console.error('Error fetching loans:', loansError);
    }

    if (loans && loans.length > 0) {
      return NextResponse.json({
        success: true,
        requests: loans.map(loan => ({
          id: loan.id,
          amount: loan.amount,
          currency: loan.currency || 'USD',
          purpose: loan.purpose || 'Personal loan',
          status: 'accepted',
          created_at: loan.created_at,
        })),
      });
    }

    // No loans found
    return NextResponse.json({
      success: true,
      requests: [],
      message: 'No loan requests found for this email',
    });
  } catch (error) {
    console.error('Loan status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
