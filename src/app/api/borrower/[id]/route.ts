import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('borrower-id');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: borrowerId } = await params;
    const supabase = await createServiceRoleClient();

    // Get borrower profile (public info only)
    const { data: borrower, error } = await supabase
      .from('users')
      .select(`
        id,
        full_name,
        borrower_rating,
        borrower_rating_updated_at,
        total_loans_completed,
        total_payments_made,
        payments_on_time,
        payments_early,
        payments_late,
        payments_missed,
        borrowing_tier,
        verification_status,
        created_at
      `)
      .eq('id', borrowerId)
      .single();

    if (error || !borrower) {
      return NextResponse.json({ error: 'Borrower not found' }, { status: 404 });
    }

    // Calculate rating details
    const totalPayments = borrower.total_payments_made || 0;
    const onTimePayments = borrower.payments_on_time || 0;
    const earlyPayments = borrower.payments_early || 0;
    const latePayments = borrower.payments_late || 0;
    const missedPayments = borrower.payments_missed || 0;

    const ratingInfo = getRatingInfo(borrower.borrower_rating || 'neutral');

    // Loan history: use denormalized total + exact counts for active/defaulted, and sum for totalBorrowed
    const totalCompleted = borrower.total_loans_completed ?? 0;

    const [
      { count: activeCount },
      { count: defaultedCount },
      { data: loanAmounts },
    ] = await Promise.all([
      supabase.from('loans').select('id', { count: 'exact', head: true }).eq('borrower_id', borrowerId).eq('status', 'active'),
      supabase.from('loans').select('id', { count: 'exact', head: true }).eq('borrower_id', borrowerId).eq('status', 'defaulted'),
      supabase.from('loans').select('amount').eq('borrower_id', borrowerId),
    ]);

    const activeLoans = activeCount ?? 0;
    const defaultedLoans = defaultedCount ?? 0;
    const totalBorrowed = (loanAmounts ?? []).reduce((sum: number, row: { amount?: number }) => sum + Number(row.amount || 0), 0);

    // Calculate member duration
    const memberSince = new Date(borrower.created_at);
    const monthsAsMember = Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24 * 30));

    return NextResponse.json({
      borrower: {
        id: borrower.id,
        name: borrower.full_name,
        full_name: borrower.full_name,
        memberSince: borrower.created_at,
        monthsAsMember,
        isVerified: borrower.verification_status === 'verified',
        borrowingTier: borrower.borrowing_tier || 1,
        tierName: getTierName(borrower.borrowing_tier || 1),
      },
      rating: {
        overall: borrower.borrower_rating || 'neutral',
        ...ratingInfo,
        lastUpdated: borrower.borrower_rating_updated_at,
      },
      paymentHistory: {
        totalPayments,
        total: totalPayments,
        onTime: onTimePayments,
        early: earlyPayments,
        late: latePayments,
        missed: missedPayments,
        onTimePercentage: totalPayments > 0 ? Math.round(((onTimePayments + earlyPayments) / totalPayments) * 100) : 0,
      },
      loanHistory: {
        totalCompleted,
        activeLoans,
        currentlyActive: activeLoans,
        defaulted: defaultedLoans,
        totalBorrowed,
      },
      recommendation: getRecommendation(borrower.borrower_rating || 'neutral', totalPayments),
    });
  } catch (error) {
    log.error('Error fetching borrower profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getTierName(tier: number): string {
  switch (tier) {
    case 1: return 'Starter';
    case 2: return 'Bronze';
    case 3: return 'Silver';
    case 4: return 'Gold';
    case 5: return 'Platinum';
    case 6: return 'Diamond';
    default: return 'Starter';
  }
}

function getRatingInfo(rating: string) {
  const ratings: Record<string, { label: string; color: string; emoji: string; description: string }> = {
    great: {
      label: 'Great Borrower',
      color: 'green',
      emoji: '⭐',
      description: 'Pays early most of the time. Highly reliable.',
    },
    good: {
      label: 'Good Borrower',
      color: 'blue',
      emoji: '👍',
      description: 'Pays on time consistently. Trustworthy.',
    },
    neutral: {
      label: 'New Borrower',
      color: 'gray',
      emoji: '🆕',
      description: 'No payment history yet or limited data.',
    },
    poor: {
      label: 'Poor Borrower',
      color: 'yellow',
      emoji: '⚠️',
      description: 'Mixed payment history. Some missed payments.',
    },
    bad: {
      label: 'Bad Borrower',
      color: 'orange',
      emoji: '⛔',
      description: 'Frequently late on payments. High risk.',
    },
    worst: {
      label: 'High Risk',
      color: 'red',
      emoji: '🚨',
      description: 'Rarely or never pays. Avoid lending.',
    },
  };

  return ratings[rating] || ratings.neutral;
}

function getRecommendation(rating: string, totalPayments: number): string {
  if (totalPayments === 0) {
    return 'This is a new borrower with no payment history. Consider starting with a small loan amount.';
  }

  switch (rating) {
    case 'great':
      return 'Excellent track record! This borrower is highly recommended for lending.';
    case 'good':
      return 'Good payment history. This borrower is generally reliable.';
    case 'neutral':
      return 'Limited payment data available. Consider the loan amount carefully.';
    case 'poor':
      return 'Caution advised. This borrower has missed some payments in the past.';
    case 'bad':
      return 'High risk borrower. Frequently late on payments. Consider carefully before lending.';
    case 'worst':
      return 'Very high risk. This borrower has a history of not paying. Not recommended for lending.';
    default:
      return 'Unable to determine borrower reliability.';
  }
}
