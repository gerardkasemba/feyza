import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Tier amounts for personal lending (friend-to-friend)
const TIER_AMOUNTS: Record<number, number> = {
  1: 150,
  2: 300,
  3: 600,
  4: 1200,
  5: 2000,
  6: 999999, // Unlimited
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lenderType = searchParams.get('lender_type') || 'personal'; // 'personal' or 'business'
    
    const supabase = await createServerSupabaseClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with borrowing stats
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // ============================================
    // CHECK IF BORROWER IS BLOCKED OR RESTRICTED
    // ============================================
    
    if (profile.is_blocked) {
      const now = new Date();
      const restrictionEndsAt = profile.restriction_ends_at ? new Date(profile.restriction_ends_at) : null;
      const debtClearedAt = profile.debt_cleared_at ? new Date(profile.debt_cleared_at) : null;
      
      // Check if debt is cleared but still in 90-day restriction
      if (debtClearedAt && restrictionEndsAt) {
        const daysRemaining = Math.ceil((restrictionEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining > 0) {
          return NextResponse.json({
            canBorrow: false,
            isBlocked: true,
            blockType: 'restriction',
            reason: `Your account is under a 90-day restriction period due to a previous default. You can request loans again on ${restrictionEndsAt.toLocaleDateString()}.`,
            restrictionEndsAt: profile.restriction_ends_at,
            daysRemaining,
            debtClearedAt: profile.debt_cleared_at,
            defaultCount: profile.default_count || 1,
          });
        }
      } else {
        // Still has outstanding debt - fully blocked
        // Get total outstanding debt
        const { data: outstandingPayments } = await supabase
          .from('repayment_schedule')
          .select('amount, currency, loan_id')
          .eq('status', 'defaulted')
          .in('loan_id', (
            await supabase
              .from('loans')
              .select('id')
              .eq('borrower_id', user.id)
          ).data?.map(l => l.id) || []);
        
        const totalDebt = outstandingPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        
        return NextResponse.json({
          canBorrow: false,
          isBlocked: true,
          blockType: 'defaulted',
          reason: `Your account is blocked due to payment default. Please clear your outstanding debt to restore access.`,
          blockedAt: profile.blocked_at,
          blockedReason: profile.blocked_reason,
          totalOutstandingDebt: totalDebt,
          defaultCount: profile.default_count || 1,
        });
      }
    }

    // Get completed loans count to determine if first-time borrower
    const { count: completedLoansCount } = await supabase
      .from('loans')
      .select('*', { count: 'exact', head: true })
      .eq('borrower_id', user.id)
      .eq('status', 'completed');

    const isFirstTimeBorrower = (completedLoansCount || 0) === 0;

    // Get active loans total
    const { data: activeLoans } = await supabase
      .from('loans')
      .select('amount, amount_remaining, amount_paid')
      .eq('borrower_id', user.id)
      .eq('status', 'active');

    const totalOutstanding = activeLoans?.reduce((sum, l) => sum + (l.amount_remaining || 0), 0) || 0;
    const totalActiveAmount = activeLoans?.reduce((sum, l) => sum + (l.amount || 0), 0) || 0;
    const totalPaidOnActive = activeLoans?.reduce((sum, l) => sum + (l.amount_paid || 0), 0) || 0;

    const borrowingTier = profile.borrowing_tier || 1;
    const loansAtCurrentTier = profile.loans_at_current_tier || 0;
    const loansNeededToUpgrade = 3;

    // For BUSINESS lenders: No fixed tier limits - matching happens based on lender preferences
    if (lenderType === 'business') {
      // Check if borrower has an active business loan and hasn't paid 75%
      const { data: activeBusinessLoans } = await supabase
        .from('loans')
        .select('id, amount, amount_paid, amount_remaining, business_lender_id')
        .eq('borrower_id', user.id)
        .eq('status', 'active')
        .not('business_lender_id', 'is', null);

      if (activeBusinessLoans && activeBusinessLoans.length > 0) {
        // Borrower has active business loan(s)
        const activeLoan = activeBusinessLoans[0]; // They can only have one at a time
        const paidPercentage = activeLoan.amount > 0 
          ? ((activeLoan.amount_paid || 0) / activeLoan.amount) * 100 
          : 0;
        
        if (paidPercentage < 75) {
          return NextResponse.json({
            canBorrow: false,
            reason: `You must pay at least 75% of your current business loan before requesting a new one. Currently paid: ${paidPercentage.toFixed(0)}% ($${(activeLoan.amount_paid || 0).toLocaleString()} of $${activeLoan.amount.toLocaleString()})`,
            lenderType: 'business',
            hasActiveBusinessLoan: true,
            activeBusinessLoanId: activeLoan.id,
            paidPercentage: Math.round(paidPercentage),
            requiredPercentage: 75,
            amountPaid: activeLoan.amount_paid || 0,
            totalAmount: activeLoan.amount,
            amountRemaining: activeLoan.amount_remaining || 0,
          });
        }
      }

      // Get the range of limits from available business lenders
      const { data: lenderPrefs } = await supabase
        .from('lender_preferences')
        .select('max_amount, first_time_borrower_limit, allow_first_time_borrowers')
        .eq('is_active', true)
        .not('business_id', 'is', null);

      // Calculate max available from any business lender
      let maxFromBusinesses = 0;
      if (lenderPrefs && lenderPrefs.length > 0) {
        if (isFirstTimeBorrower) {
          // For first-timers, find the highest first_time_borrower_limit
          const eligibleLenders = lenderPrefs.filter(lp => lp.allow_first_time_borrowers !== false);
          maxFromBusinesses = Math.max(0, ...eligibleLenders.map(lp => lp.first_time_borrower_limit || lp.max_amount || 500));
        } else {
          // For repeat borrowers, use max_amount
          maxFromBusinesses = Math.max(0, ...lenderPrefs.map(lp => lp.max_amount || 5000));
        }
      }

      return NextResponse.json({
        canBorrow: true,
        reason: '',
        lenderType: 'business',
        isFirstTimeBorrower,
        maxAvailableFromBusinesses: maxFromBusinesses,
        hasActiveBusinessLoan: false,
        // No tier limits for business lending
        borrowingTier: null,
        tierName: null,
        maxAmount: null, // Determined by individual lender preferences
        availableAmount: null,
        totalOutstanding,
        borrowerRating: profile.borrower_rating || 'neutral',
        message: isFirstTimeBorrower 
          ? `As a first-time borrower, you'll be matched with lenders who accept new borrowers. Maximum available: $${maxFromBusinesses.toLocaleString()}`
          : `You'll be matched with lenders based on their preferences. Maximum available: $${maxFromBusinesses.toLocaleString()}`,
        stats: {
          totalLoansCompleted: profile.total_loans_completed || 0,
          totalPaymentsMade: profile.total_payments_made || 0,
          paymentsOnTime: profile.payments_on_time || 0,
          paymentsEarly: profile.payments_early || 0,
          paymentsLate: profile.payments_late || 0,
          paymentsMissed: profile.payments_missed || 0,
        },
      });
    }

    // For PERSONAL lending: Use tier-based limits
    const maxAmount = TIER_AMOUNTS[borrowingTier] || 150;

    // Calculate available amount
    let availableAmount = maxAmount;
    let canBorrow = true;
    let reason = '';

    // For unlimited tier (6) with large outstanding loans
    if (borrowingTier >= 5 && totalOutstanding >= 2000) {
      const paidPercentage = totalActiveAmount > 0 ? (totalPaidOnActive / totalActiveAmount) : 0;
      
      if (paidPercentage < 0.75) {
        canBorrow = false;
        reason = `You must pay at least 75% of your current loans ($${totalActiveAmount.toFixed(2)}) before applying for a new one. Currently paid: ${(paidPercentage * 100).toFixed(0)}%`;
        availableAmount = 0;
      }
    }

    // For lower tiers, check if total would exceed limit
    if (borrowingTier < 6 && canBorrow) {
      availableAmount = Math.max(0, maxAmount - totalOutstanding);
      if (availableAmount <= 0) {
        canBorrow = false;
        reason = `You've reached your borrowing limit of $${maxAmount}. Pay off existing loans to borrow more.`;
      }
    }

    return NextResponse.json({
      canBorrow,
      reason,
      lenderType: 'personal',
      isFirstTimeBorrower,
      borrowingTier,
      tierName: getTierName(borrowingTier),
      maxAmount: borrowingTier === 6 ? null : maxAmount, // null for unlimited
      availableAmount: borrowingTier === 6 ? null : availableAmount,
      totalOutstanding,
      loansAtCurrentTier,
      loansNeededToUpgrade: borrowingTier < 6 ? loansNeededToUpgrade - loansAtCurrentTier : 0,
      nextTierAmount: borrowingTier < 6 ? TIER_AMOUNTS[borrowingTier + 1] : null,
      borrowerRating: profile.borrower_rating || 'neutral',
      stats: {
        totalLoansCompleted: profile.total_loans_completed || 0,
        totalPaymentsMade: profile.total_payments_made || 0,
        paymentsOnTime: profile.payments_on_time || 0,
        paymentsEarly: profile.payments_early || 0,
        paymentsLate: profile.payments_late || 0,
        paymentsMissed: profile.payments_missed || 0,
      },
    });
  } catch (error) {
    console.error('Error checking borrower eligibility:', error);
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
    case 6: return 'Diamond (Unlimited)';
    default: return 'Starter';
  }
}

// POST endpoint to check if a specific amount can be borrowed
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, lenderType = 'personal' } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if first-time borrower
    const { count: completedLoansCount } = await supabase
      .from('loans')
      .select('*', { count: 'exact', head: true })
      .eq('borrower_id', user.id)
      .eq('status', 'completed');

    const isFirstTimeBorrower = (completedLoansCount || 0) === 0;

    // For BUSINESS lenders: Check if any lender can support this amount
    if (lenderType === 'business') {
      const { data: lenderPrefs } = await supabase
        .from('lender_preferences')
        .select('max_amount, first_time_borrower_limit, allow_first_time_borrowers, capital_pool')
        .eq('is_active', true)
        .not('business_id', 'is', null)
        .gte('capital_pool', amount);

      let matchingLendersCount = 0;
      
      if (lenderPrefs && lenderPrefs.length > 0) {
        if (isFirstTimeBorrower) {
          // Count lenders who accept first-timers at this amount
          matchingLendersCount = lenderPrefs.filter(lp => 
            lp.allow_first_time_borrowers !== false && 
            (lp.first_time_borrower_limit || lp.max_amount || 500) >= amount
          ).length;
        } else {
          // Count lenders who can support this amount
          matchingLendersCount = lenderPrefs.filter(lp => 
            (lp.max_amount || 5000) >= amount
          ).length;
        }
      }

      const canBorrow = matchingLendersCount > 0;
      let reason = '';
      
      if (!canBorrow) {
        if (isFirstTimeBorrower) {
          reason = `No business lenders currently accept first-time borrowers at $${amount}. Try a lower amount or build history with a personal lender first.`;
        } else {
          reason = `No business lenders currently available for $${amount}. Try a lower amount.`;
        }
      }

      return NextResponse.json({
        canBorrow,
        reason,
        requestedAmount: amount,
        lenderType: 'business',
        isFirstTimeBorrower,
        matchingLendersCount,
        maxAmount: null, // No fixed limit for business lending
      });
    }

    // For PERSONAL lending: Use tier-based limits
    const borrowingTier = profile.borrowing_tier || 1;
    const maxAmount = TIER_AMOUNTS[borrowingTier] || 150;

    // Get active loans total
    const { data: activeLoans } = await supabase
      .from('loans')
      .select('amount, amount_remaining, amount_paid')
      .eq('borrower_id', user.id)
      .eq('status', 'active');

    const totalOutstanding = activeLoans?.reduce((sum, l) => sum + (l.amount_remaining || 0), 0) || 0;
    const totalActiveAmount = activeLoans?.reduce((sum, l) => sum + (l.amount || 0), 0) || 0;
    const totalPaidOnActive = activeLoans?.reduce((sum, l) => sum + (l.amount_paid || 0), 0) || 0;

    let canBorrow = true;
    let reason = '';

    // Check tier limit
    if (borrowingTier < 6) {
      if (amount > maxAmount) {
        canBorrow = false;
        reason = `Amount exceeds your tier limit of $${maxAmount}`;
      } else if ((totalOutstanding + amount) > maxAmount) {
        canBorrow = false;
        reason = `Total loans would exceed your limit of $${maxAmount}. Available: $${Math.max(0, maxAmount - totalOutstanding).toFixed(2)}`;
      }
    }

    // Check 75% rule for large outstanding loans
    if (borrowingTier >= 5 && totalOutstanding >= 2000 && canBorrow) {
      const paidPercentage = totalActiveAmount > 0 ? (totalPaidOnActive / totalActiveAmount) : 0;
      
      if (paidPercentage < 0.75) {
        canBorrow = false;
        reason = `You must pay at least 75% of current loans before borrowing more. Currently paid: ${(paidPercentage * 100).toFixed(0)}%`;
      }
    }

    return NextResponse.json({
      canBorrow,
      reason,
      requestedAmount: amount,
      lenderType: 'personal',
      isFirstTimeBorrower,
      maxAmount: borrowingTier === 6 ? null : maxAmount,
      totalOutstanding,
    });
  } catch (error) {
    console.error('Error checking amount:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
