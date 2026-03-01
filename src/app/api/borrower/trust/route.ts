import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('borrower-trust');

export interface BorrowerTrustResponse {
  maxAmount: number;
  isGraduated: boolean;
  completedLoans: number;
  loansUntilGraduation: number;
  trustStatus: 'new' | 'building' | 'graduated' | 'suspended' | 'banned';
  firstTimeAmount: number;
  standardMaxAmount: number;
  canBorrow: boolean;
  reason?: string;
  businessName?: string;
}

/** Look up the max_loan_amount from lender_tier_policies for a given business+tier combo.
 * lender_tier_policies uses lender_id (business owner user_id) and tier_id (string: 'tier_1'..'tier_4')
 */
async function getTierPolicyMaxAmount(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  businessId: string,
  trustTier: string  // 'tier_1', 'tier_2', 'tier_3', 'tier_4'
): Promise<{ firstTimeAmount: number; standardMaxAmount: number }> {
  // Get the business owner's user_id and first-time amount
  const { data: business } = await supabase
    .from('business_profiles')
    .select('user_id, first_time_borrower_amount')
    .eq('id', businessId)
    .single();

  const firstTimeAmount = (business as any)?.first_time_borrower_amount || 50;
  const lenderId = (business as any)?.user_id;

  if (!lenderId) return { firstTimeAmount, standardMaxAmount: firstTimeAmount };

  // Find the tier policy matching the borrower's current trust tier
  const { data: policy } = await supabase
    .from('lender_tier_policies')
    .select('max_loan_amount')
    .eq('lender_id', lenderId)
    .eq('tier_id', trustTier)
    .eq('is_active', true)
    .single();

  if (policy) {
    return { firstTimeAmount, standardMaxAmount: (policy as any).max_loan_amount };
  }

  // Fallback: use the highest active tier policy the lender has configured
  const { data: policies } = await supabase
    .from('lender_tier_policies')
    .select('max_loan_amount, tier_id')
    .eq('lender_id', lenderId)
    .eq('is_active', true)
    .order('max_loan_amount', { ascending: false })
    .limit(1);

  const maxFromPolicies = (policies as any[])?.[0]?.max_loan_amount;
  return {
    firstTimeAmount,
    standardMaxAmount: maxFromPolicies || firstTimeAmount,
  };
}

// GET /api/borrower/trust?business_id=xxx
// If no business_id, returns all trust records for the user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    
    const supabase = await createServerSupabaseClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get borrower's current vouch-based trust tier
    const { data: borrowerProfile } = await supabase
      .from('users')
      .select('trust_tier')
      .eq('id', user.id)
      .single();
    const trustTier: string = (borrowerProfile as any)?.trust_tier || 'tier_1';

    // If no business_id, return all trust records for this borrower
    if (!businessId) {
      const { data: trustRecords } = await supabase
        .from('borrower_business_trust')
        .select(`
          *,
          business:business_profiles(id, business_name, first_time_borrower_amount)
        `)
        .eq('borrower_id', user.id)
        .order('updated_at', { ascending: false });

      const formattedRecords = await Promise.all((trustRecords || []).map(async record => {
        const business = record.business as any;
        const { firstTimeAmount, standardMaxAmount } = await getTierPolicyMaxAmount(
          supabase, record.business_id, trustTier
        );
        const isGraduated = record.has_graduated || record.completed_loan_count >= 3;
        
        return {
          business_id: record.business_id,
          business_name: business?.business_name || 'Unknown Business',
          completed_loan_count: record.completed_loan_count,
          has_graduated: isGraduated,
          trust_status: record.trust_status,
          max_amount: isGraduated ? standardMaxAmount : firstTimeAmount,
          first_time_amount: firstTimeAmount,
          standard_max_amount: standardMaxAmount,
          loans_until_graduation: isGraduated ? 0 : Math.max(0, 3 - record.completed_loan_count),
        };
      }));

      return NextResponse.json({ trustRecords: formattedRecords });
    }

    // Get business profile for name
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('id, business_name, first_time_borrower_amount')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Look up tier-based limits from lender_tier_policies
    const { firstTimeAmount, standardMaxAmount } = await getTierPolicyMaxAmount(
      supabase, businessId, trustTier
    );

    // Get borrower's trust record with this business
    const { data: trust } = await supabase
      .from('borrower_business_trust')
      .select('*')
      .eq('borrower_id', user.id)
      .eq('business_id', businessId)
      .single();
    
    // If no trust record, this is a new relationship
    if (!trust) {
      return NextResponse.json({
        maxAmount: firstTimeAmount,
        isGraduated: false,
        completedLoans: 0,
        loansUntilGraduation: 3,
        trustStatus: 'new',
        firstTimeAmount,
        standardMaxAmount,
        canBorrow: true,
        businessName: (business as any).business_name,
        message: `As a new borrower with ${(business as any).business_name}, you can borrow up to $${firstTimeAmount}. Complete 3 loans to unlock higher amounts.`,
      } as BorrowerTrustResponse);
    }

    // Check if banned or suspended
    if (trust.trust_status === 'banned') {
      return NextResponse.json({
        maxAmount: 0,
        isGraduated: false,
        completedLoans: trust.completed_loan_count,
        loansUntilGraduation: 0,
        trustStatus: 'banned',
        firstTimeAmount,
        standardMaxAmount,
        canBorrow: false,
        reason: `You are not eligible to borrow from ${(business as any).business_name}.`,
        businessName: (business as any).business_name,
      } as BorrowerTrustResponse);
    }

    if (trust.trust_status === 'suspended') {
      return NextResponse.json({
        maxAmount: 0,
        isGraduated: false,
        completedLoans: trust.completed_loan_count,
        loansUntilGraduation: 0,
        trustStatus: 'suspended',
        firstTimeAmount,
        standardMaxAmount,
        canBorrow: false,
        reason: `Your borrowing privileges with ${(business as any).business_name} are temporarily suspended.`,
        businessName: (business as any).business_name,
      } as BorrowerTrustResponse);
    }

    // Calculate values
    const isGraduated = trust.has_graduated || trust.completed_loan_count >= 3;
    const loansUntilGraduation = isGraduated ? 0 : Math.max(0, 3 - trust.completed_loan_count);
    const maxAmount = isGraduated ? standardMaxAmount : firstTimeAmount;

    let message = '';
    if (isGraduated) {
      message = `You've graduated! You can borrow up to $${standardMaxAmount} from ${(business as any).business_name} (based on your ${trustTier.replace('_', ' ')} trust standing).`;
    } else if (trust.completed_loan_count === 0) {
      message = `Complete 3 loans at $${firstTimeAmount} to unlock higher amounts.`;
    } else {
      message = `${trust.completed_loan_count}/3 loans completed. ${loansUntilGraduation} more to unlock up to $${standardMaxAmount}.`;
    }

    return NextResponse.json({
      maxAmount,
      isGraduated,
      completedLoans: trust.completed_loan_count,
      loansUntilGraduation,
      trustStatus: trust.trust_status,
      firstTimeAmount,
      standardMaxAmount,
      canBorrow: true,
      message,
      businessName: (business as any).business_name,
      // Additional stats
      totalBorrowed: trust.total_amount_borrowed,
      totalRepaid: trust.total_amount_repaid,
      hasDefaulted: trust.has_defaulted,
      defaultCount: trust.default_count,
      onTimePayments: trust.on_time_payment_count,
      latePayments: trust.late_payment_count,
    } as BorrowerTrustResponse & {
      totalBorrowed?: number;
      totalRepaid?: number;
      hasDefaulted?: boolean;
      defaultCount?: number;
      onTimePayments?: number;
      latePayments?: number;
    });
  } catch (error) {
    log.error('Error checking borrower trust:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/borrower/trust - For business lenders to manage trust
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, borrower_id, business_id } = body;
    
    if (!action || !borrower_id || !business_id) {
      return NextResponse.json(
        { error: 'action, borrower_id, and business_id are required' }, 
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this business
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('user_id, business_name')
      .eq('id', business_id)
      .single();

    if (businessError || !business || business.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to manage this business' }, { status: 403 });
    }

    // Perform the action
    switch (action) {
      case 'ban':
        const { data: banResult } = await supabase.rpc('ban_borrower_from_business', {
          p_borrower_id: borrower_id,
          p_business_id: business_id,
        });
        return NextResponse.json({ 
          success: true, 
          message: 'Borrower has been banned from your business',
          trust: banResult,
        });

      case 'suspend':
        await supabase
          .from('borrower_business_trust')
          .upsert({
            borrower_id,
            business_id,
            trust_status: 'suspended',
          }, {
            onConflict: 'borrower_id,business_id',
          });
        return NextResponse.json({ 
          success: true, 
          message: 'Borrower has been suspended',
        });

      case 'reinstate':
        const { data: trust } = await supabase
          .from('borrower_business_trust')
          .select('completed_loan_count')
          .eq('borrower_id', borrower_id)
          .eq('business_id', business_id)
          .single();
        
        const newStatus = (trust?.completed_loan_count || 0) >= 3 ? 'graduated' : 
                          (trust?.completed_loan_count || 0) > 0 ? 'building' : 'new';
        
        await supabase
          .from('borrower_business_trust')
          .update({ 
            trust_status: newStatus,
            has_graduated: (trust?.completed_loan_count || 0) >= 3,
          })
          .eq('borrower_id', borrower_id)
          .eq('business_id', business_id);
        
        return NextResponse.json({ 
          success: true, 
          message: 'Borrower has been reinstated',
        });

      case 'reset':
        const { data: resetResult } = await supabase.rpc('reset_borrower_trust_on_default', {
          p_borrower_id: borrower_id,
          p_business_id: business_id,
        });
        return NextResponse.json({ 
          success: true, 
          message: 'Borrower trust has been reset',
          trust: resetResult,
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    log.error('Error managing borrower trust:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
