import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET: Fetch a specific loan request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceRoleClient();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    const { data: loanRequest, error } = await supabase
      .from('loan_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !loanRequest) {
      return NextResponse.json(
        { error: 'Loan request not found' },
        { status: 404 }
      );
    }

    // If token provided, verify it matches (for borrower access)
    if (token && loanRequest.access_token !== token) {
      return NextResponse.json(
        { error: 'Invalid access token' },
        { status: 403 }
      );
    }

    // Don't expose sensitive data to public viewers
    const publicData = {
      id: loanRequest.id,
      amount: loanRequest.amount,
      currency: loanRequest.currency,
      purpose: loanRequest.purpose,
      description: loanRequest.description,
      borrower_name: loanRequest.borrower_name,
      status: loanRequest.status,
      created_at: loanRequest.created_at,
      // Only show email if it's the borrower viewing
      borrower_email: token ? loanRequest.borrower_email : undefined,
    };

    return NextResponse.json({ request: publicData });

  } catch (error) {
    console.error('Fetch loan request error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loan request' },
      { status: 500 }
    );
  }
}
