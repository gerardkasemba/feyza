import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('lender-matches');

/**
 * GET /api/lender/matches?filter=pending|all
 * Returns loan matches for the current lender with borrower names populated (service role).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filter = request.nextUrl.searchParams.get('filter') || 'pending';
    const service = await createServiceRoleClient();

    const { data: business } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let matchQuery = service
      .from('loan_matches')
      .select('id, loan_id, status, match_score, expires_at, created_at, lender_user_id, lender_business_id')
      .order('created_at', { ascending: false });

    if (business?.id) {
      matchQuery = matchQuery.or(`lender_user_id.eq.${user.id},lender_business_id.eq.${business.id}`);
    } else {
      matchQuery = matchQuery.eq('lender_user_id', user.id);
    }

    if (filter === 'pending') {
      matchQuery = matchQuery.eq('status', 'pending');
    }

    const { data: matchesData, error } = await matchQuery.limit(50);

    if (error) {
      log.error('lender/matches error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!matchesData?.length) {
      return NextResponse.json({ matches: [] });
    }

    const loanIds = matchesData.map((m: { loan_id: string }) => m.loan_id).filter(Boolean);
    const { data: loansData } = await service
      .from('loans')
      .select('id, amount, currency, purpose, repayment_frequency, total_installments, lender_id, business_lender_id, borrower_id, borrower_name')
      .in('id', loanIds);

    const borrowerIds = [...new Set((loansData || []).map((l: { borrower_id: string }) => l.borrower_id).filter(Boolean))];
    let borrowersMap: Record<string, { id: string; full_name: string; borrower_rating?: string }> = {};

    if (borrowerIds.length > 0) {
      const { data: borrowersData } = await service
        .from('users')
        .select('id, full_name, borrower_rating')
        .in('id', borrowerIds);

      borrowersMap = (borrowersData || []).reduce((acc, b) => {
        acc[b.id] = b;
        return acc;
      }, {} as Record<string, { id: string; full_name: string; borrower_rating?: string }>);
    }

    const matches = matchesData.map((match: Record<string, unknown>) => {
      const loan = (loansData || []).find((l: { id: string }) => l.id === match.loan_id);
      if (!loan) return null;
      const borrowerId = loan.borrower_id;
      const borrowerRow = borrowerId ? borrowersMap[borrowerId] : null;
      const borrowerName = (loan as { borrower_name?: string }).borrower_name;
      return {
        ...match,
        loan: {
          ...loan,
          borrower: borrowerRow
            ? { ...borrowerRow }
            : borrowerId
              ? { id: borrowerId, full_name: borrowerName || 'Borrower', borrower_rating: 'neutral' }
              : null,
        },
      };
    }).filter(Boolean);

    return NextResponse.json({ matches });
  } catch (err) {
    log.error('lender/matches error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
