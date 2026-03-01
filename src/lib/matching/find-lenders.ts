import { logger } from '@/lib/logger';
const log = logger('find-lenders');
import { createServiceRoleClientDirect } from '@/lib/supabase/server';
import { calculateSimpleTrustTier, type SimpleTrustTier } from '@/lib/trust/simple-tier';

export interface EligibleLender {
  lenderId: string;
  lenderName: string;
  interestRate: number;
  maxLoanAmount: number;
}

export interface FindLendersResult {
  tier: SimpleTrustTier;
  eligibleLenders: EligibleLender[];
  totalLenders: number;
  bestRate: number | null;
  averageRate: number | null;
}

/**
 * Find individual (non-business) lenders who have an active tier policy
 * matching the borrower's current trust tier and requested amount.
 */
export async function findEligibleLenders(
  borrowerId: string,
  requestedAmount: number
): Promise<FindLendersResult> {
  const supabase = createServiceRoleClientDirect();

  const tier = await calculateSimpleTrustTier(borrowerId);

  const { data: policies, error } = await supabase
    .from('lender_tier_policies')
    .select(`
      interest_rate,
      max_loan_amount,
      lender:users!lender_id(id, full_name)
    `)
    .eq('tier_id', tier.tier)
    .eq('is_active', true)
    .gte('max_loan_amount', requestedAmount)
    .neq('lender_id', borrowerId) // exclude self
    .order('interest_rate', { ascending: true });

  if (error) {
    log.error('[FindLenders] Query error:', (error as Error).message);
  }

  type LenderPolicyRow = {
    interest_rate: number;
    max_loan_amount: number;
    lender: { id: string; full_name: string } | null;
  };
  const eligible: EligibleLender[] = (policies ?? [] as LenderPolicyRow[]).map((p: LenderPolicyRow) => ({
    lenderId: p.lender?.id ?? '',
    lenderName: p.lender?.full_name ?? 'Lender',
    interestRate: p.interest_rate,
    maxLoanAmount: p.max_loan_amount,
  }));

  const rates = eligible.map((l) => l.interestRate);
  const bestRate = rates.length > 0 ? Math.min(...rates) : null;
  const averageRate =
    rates.length > 0 ? rates.reduce((s, r) => s + r, 0) / rates.length : null;

  return {
    tier,
    eligibleLenders: eligible,
    totalLenders: eligible.length,
    bestRate,
    averageRate,
  };
}
