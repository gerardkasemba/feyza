import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('loans-fund-details');

/**
 * GET: Return borrower display info and preferred payment method for the fund page.
 * Uses service role so the lender can see borrower name and payment method even when RLS would block direct reads.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const supabase = await createServerSupabaseClient();
    const serviceSupabase = await createServiceRoleClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: loan, error: loanError } = await serviceSupabase
      .from('loans')
      .select('id, borrower_id, borrower_name, lender_id, business_lender_id')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    let isLender = loan.lender_id === user.id;
    if (!isLender && loan.business_lender_id) {
      const { data: biz } = await serviceSupabase
        .from('business_profiles')
        .select('user_id')
        .eq('id', loan.business_lender_id)
        .single();
      isLender = biz?.user_id === user.id;
    }

    if (!isLender) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const borrowerId = loan.borrower_id as string | null;
    let borrowerName = (loan.borrower_name as string) || null;
    let borrowerEmail: string | null = null;

    if (borrowerId) {
      const { data: borrowerRow } = await serviceSupabase
        .from('users')
        .select('full_name, email')
        .eq('id', borrowerId)
        .single();
      if (borrowerRow) {
        borrowerName = borrowerName || borrowerRow.full_name || null;
        borrowerEmail = borrowerRow.email || null;
      }
    }

    let preferredPaymentMethod: {
      slug: string;
      name: string;
      account_identifier: string;
      account_name?: string;
    } | null = null;

    if (borrowerId) {
      const { data: methods } = await serviceSupabase
        .from('user_payment_methods')
        .select(`
          account_identifier,
          account_name,
          is_default,
          payment_provider_id ( slug, name, is_enabled )
        `)
        .eq('user_id', borrowerId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .limit(1);

      const row = methods?.[0];
      if (row) {
        const providerRaw = (row as any).payment_provider_id;
        const provider = Array.isArray(providerRaw) ? providerRaw[0] : providerRaw;
        if (provider?.is_enabled) {
          preferredPaymentMethod = {
            slug: provider.slug,
            name: provider.name,
            account_identifier: row.account_identifier,
            account_name: row.account_name || undefined,
          };
        }
      }
    }

    return NextResponse.json({
      borrowerName: borrowerName || 'the borrower',
      borrowerEmail,
      preferredPaymentMethod,
    });
  } catch (err) {
    log.error('fund-details error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
