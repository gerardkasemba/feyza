import { createServiceRoleClientDirect } from '@/lib/supabase/server';

export interface VouchEligibility {
  canVouch: boolean;
  reason?: string;
}

/**
 * Check whether a user is allowed to vouch for others.
 * Non-negotiable rule: KYC must be completed (verification_status = 'verified').
 */
export async function canUserVouch(userId: string): Promise<VouchEligibility> {
  const supabase = createServiceRoleClientDirect();

  const { data: user, error } = await supabase
    .from('users')
    .select('verification_status, is_blocked')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return { canVouch: false, reason: 'User not found.' };
  }

  if (user.is_blocked) {
    return { canVouch: false, reason: 'Your account is currently restricted.' };
  }

  if (user.verification_status !== 'verified') {
    return {
      canVouch: false,
      reason:
        'You must complete identity verification before you can vouch for others. This protects the community from fake accounts.',
    };
  }

  return { canVouch: true };
}
