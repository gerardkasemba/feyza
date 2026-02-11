/**
 * Feyza Trust Score System
 * 
 * A revolutionary alternative to traditional credit scores.
 * Based on actual behavior, not debt history.
 * 
 * Score Components:
 * - Payment History (40%): On-time payments, early payments, streaks
 * - Loan Completion (25%): Successfully completed loans
 * - Social Trust (15%): Vouches from other trusted users
 * - Verification (10%): Identity, employment, address verification
 * - Platform Tenure (10%): Time on platform, consistency
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================
// TYPES
// ============================================

export interface TrustScore {
  id: string;
  user_id: string;
  score: number;
  score_grade: string;
  score_label: string;
  
  // Component scores
  payment_score: number;
  completion_score: number;
  social_score: number;
  verification_score: number;
  tenure_score: number;
  
  // Stats
  total_loans: number;
  completed_loans: number;
  active_loans: number;
  defaulted_loans: number;
  
  total_payments: number;
  ontime_payments: number;
  early_payments: number;
  late_payments: number;
  missed_payments: number;
  
  total_amount_borrowed: number;
  total_amount_repaid: number;
  
  current_streak: number;
  best_streak: number;
  
  vouches_received: number;
  vouches_given: number;
  vouch_defaults: number;
  
  created_at: string;
  updated_at: string;
}

export interface TrustScoreEvent {
  event_type: TrustEventType;
  score_impact: number;
  title: string;
  description?: string;
  loan_id?: string;
  payment_id?: string;
  other_user_id?: string;
  vouch_id?: string;
  metadata?: Record<string, any>;
}

export type TrustEventType =
  | 'payment_ontime'
  | 'payment_early'
  | 'payment_late'
  | 'payment_missed'
  | 'payment_failed'   // ✅ add this
  | 'loan_completed'
  | 'loan_defaulted'
  | 'loan_started'
  | 'vouch_received'
  | 'vouch_given'
  | 'vouch_revoked'
  | 'vouchee_defaulted'
  | 'verification_completed'
  | 'streak_milestone'
  | 'first_loan_completed'
  | 'amount_milestone';

export interface Vouch {
  id: string;
  voucher_id: string;
  vouchee_id: string;
  vouch_type: 'character' | 'guarantee' | 'employment' | 'family';
  relationship: string;
  relationship_details?: string;
  known_years?: number;
  message?: string;
  guarantee_percentage?: number;
  guarantee_max_amount?: number;
  vouch_strength: number;
  trust_score_boost: number;
  status: 'active' | 'revoked' | 'expired' | 'claimed';
  is_public: boolean;
  created_at: string;
  
  // Joined data
  voucher?: {
    id: string;
    full_name: string;
    username?: string;
    trust_score?: TrustScore;
  };
}

// ============================================
// SCORE WEIGHTS
// ============================================

const WEIGHTS = {
  PAYMENT: 0.40,      // 40%
  COMPLETION: 0.25,   // 25%
  SOCIAL: 0.15,       // 15%
  VERIFICATION: 0.10, // 10%
  TENURE: 0.10,       // 10%
};

// Score impact for various events
const IMPACTS = {
  // Payment events
  PAYMENT_ONTIME: 2,
  PAYMENT_EARLY: 4,
  PAYMENT_LATE_1_7_DAYS: -3,
  PAYMENT_LATE_8_14_DAYS: -5,
  PAYMENT_LATE_15_30_DAYS: -8,
  PAYMENT_MISSED: -15,
  
  // Loan events
  LOAN_COMPLETED: 10,
  LOAN_DEFAULTED: -30,
  FIRST_LOAN_COMPLETED: 15,
  
  // Streak bonuses
  STREAK_5: 5,
  STREAK_10: 10,
  STREAK_25: 20,
  STREAK_50: 35,
  STREAK_100: 50,
  
  // Vouch events
  VOUCH_RECEIVED_BASE: 3,
  VOUCH_RECEIVED_STRONG: 8,
  VOUCHEE_DEFAULTED: -10,
  
  // Verification
  KYC_COMPLETED: 10,
  BANK_CONNECTED: 5,
  EMPLOYMENT_VERIFIED: 8,
  ADDRESS_VERIFIED: 5,
  
  // Amount milestones
  REPAID_1000: 5,
  REPAID_5000: 10,
  REPAID_10000: 15,
  REPAID_25000: 25,
};

// ============================================
// TRUST SCORE SERVICE
// ============================================

export class TrustScoreService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Get a user's trust score
   */
  async getScore(userId: string): Promise<TrustScore | null> {
    const { data, error } = await this.supabase
      .from('trust_scores')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching trust score:', error);
      return null;
    }

    return data;
  }

  /**
   * Recalculate and update a user's trust score
   */
  async recalculate(userId: string): Promise<TrustScore | null> {
    console.log(`[TrustScore] Recalculating for user ${userId}`);

    // Calculate each component first
    const paymentScore = await this.calculatePaymentScore(userId);
    const completionScore = await this.calculateCompletionScore(userId);
    const socialScore = await this.calculateSocialScore(userId);
    const verificationScore = await this.calculateVerificationScore(userId);
    const tenureScore = await this.calculateTenureScore(userId);

    // Calculate weighted final score
    const finalScore = Math.round(
      paymentScore * WEIGHTS.PAYMENT +
      completionScore * WEIGHTS.COMPLETION +
      socialScore * WEIGHTS.SOCIAL +
      verificationScore * WEIGHTS.VERIFICATION +
      tenureScore * WEIGHTS.TENURE
    );

    // Clamp to 0-100
    const clampedScore = Math.max(0, Math.min(100, finalScore));

    // Get stats for the score
    const stats = await this.getUserStats(userId);
    
    // Determine grade based on score
    let scoreGrade = 'C';
    let scoreLabel = 'Building Trust';
    if (clampedScore >= 90) { scoreGrade = 'A+'; scoreLabel = 'Exceptional'; }
    else if (clampedScore >= 80) { scoreGrade = 'A'; scoreLabel = 'Excellent'; }
    else if (clampedScore >= 70) { scoreGrade = 'B'; scoreLabel = 'Good'; }
    else if (clampedScore >= 60) { scoreGrade = 'C'; scoreLabel = 'Building Trust'; }
    else if (clampedScore >= 50) { scoreGrade = 'D'; scoreLabel = 'Needs Improvement'; }
    else { scoreGrade = 'F'; scoreLabel = 'Poor'; }

    const scoreData = {
      user_id: userId,
      score: clampedScore,
      score_grade: scoreGrade,
      score_label: scoreLabel,
      payment_score: paymentScore,
      completion_score: completionScore,
      social_score: socialScore,
      verification_score: verificationScore,
      tenure_score: tenureScore,
      last_calculated_at: new Date().toISOString(),
      ...stats,
    };

    // For update, don't include user_id (it's the key we're matching on)
    const { user_id, ...updateFields } = scoreData;

    // First try to update existing record
    const { data: updateData, error: updateError } = await this.supabase
      .from('trust_scores')
      .update(updateFields)
      .eq('user_id', userId)
      .select();

    if (updateError) {
      console.error('[TrustScore] Error updating:', updateError);
    }

    // If update returned rows, we're done
    if (updateData && updateData.length > 0) {
      console.log(`[TrustScore] Updated: ${clampedScore} (${scoreGrade})`);
      return updateData[0];
    }

    // No rows updated - need to insert
    console.log(`[TrustScore] No existing record, inserting new for user ${userId}`);
    const { data: insertData, error: insertError } = await this.supabase
      .from('trust_scores')
      .insert(scoreData)
      .select();

    if (insertError) {
      console.error('[TrustScore] Error inserting:', insertError);
      // If insert failed due to conflict, try to fetch existing
      if (insertError.code === '23505') { // unique_violation
        return await this.getScore(userId);
      }
      return null;
    }

    if (insertData && insertData.length > 0) {
      console.log(`[TrustScore] Inserted new: ${clampedScore} (${scoreGrade})`);
      return insertData[0];
    }

    console.error('[TrustScore] Neither update nor insert returned data');
    return null;
  }

  /**
   * Calculate payment history score (0-100)
   */
  private async calculatePaymentScore(userId: string): Promise<number> {
    // Get all payments for loans where user is borrower
    const { data: loans } = await this.supabase
      .from('loans')
      .select('id')
      .eq('borrower_id', userId);

    if (!loans || loans.length === 0) return 50; // Default for new users

    const loanIds = loans.map(l => l.id);

    const { data: payments } = await this.supabase
      .from('payment_schedule')
      .select('*')
      .in('loan_id', loanIds)
      .eq('is_paid', true);

    if (!payments || payments.length === 0) return 50;

    let score = 50; // Start at baseline
    let ontime = 0;
    let early = 0;
    let late = 0;
    let streak = 0;
    let maxStreak = 0;

    // Sort by due date
    const sortedPayments = payments.sort((a, b) => 
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

    for (const payment of sortedPayments) {
      const dueDate = new Date(payment.due_date);
      const paidDate = payment.paid_at ? new Date(payment.paid_at) : new Date();
      const daysDiff = Math.floor((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 0) {
        // On time or early
        if (daysDiff < -2) {
          early++;
          score += IMPACTS.PAYMENT_EARLY;
        } else {
          ontime++;
          score += IMPACTS.PAYMENT_ONTIME;
        }
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else if (daysDiff <= 7) {
        late++;
        score += IMPACTS.PAYMENT_LATE_1_7_DAYS;
        streak = 0;
      } else if (daysDiff <= 14) {
        late++;
        score += IMPACTS.PAYMENT_LATE_8_14_DAYS;
        streak = 0;
      } else {
        late++;
        score += IMPACTS.PAYMENT_LATE_15_30_DAYS;
        streak = 0;
      }
    }

    // Streak bonuses
    if (maxStreak >= 100) score += IMPACTS.STREAK_100;
    else if (maxStreak >= 50) score += IMPACTS.STREAK_50;
    else if (maxStreak >= 25) score += IMPACTS.STREAK_25;
    else if (maxStreak >= 10) score += IMPACTS.STREAK_10;
    else if (maxStreak >= 5) score += IMPACTS.STREAK_5;

    // Update streak in score record
    await this.supabase
      .from('trust_scores')
      .update({ 
        current_streak: streak, 
        best_streak: maxStreak,
        ontime_payments: ontime,
        early_payments: early,
        late_payments: late,
        total_payments: payments.length,
      })
      .eq('user_id', userId);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate loan completion score (0-100)
   */
  private async calculateCompletionScore(userId: string): Promise<number> {
    const { data: loans } = await this.supabase
      .from('loans')
      .select('status, amount')
      .eq('borrower_id', userId);

    if (!loans || loans.length === 0) return 50;

    const completed = loans.filter(l => l.status === 'completed').length;
    const defaulted = loans.filter(l => l.status === 'defaulted').length;
    const total = loans.length;

    // Completion rate (max 60 points)
    const completionRate = total > 0 ? (completed / total) * 60 : 30;

    // Default penalty
    const defaultPenalty = defaulted * 15;

    // Bonus for number of completed loans (max 40 points)
    const completionBonus = Math.min(completed * 5, 40);

    const score = 50 + completionRate + completionBonus - defaultPenalty;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate social trust score from vouches (0-100)
   */
  private async calculateSocialScore(userId: string): Promise<number> {
    // Get active vouches for this user
    const { data: vouches } = await this.supabase
      .from('vouches')
      .select(`
        *,
        voucher:users!voucher_id(
          id,
          full_name
        )
      `)
      .eq('vouchee_id', userId)
      .eq('status', 'active');

    if (!vouches || vouches.length === 0) return 50; // Default

    // Sum up trust score boosts from all vouches
    let totalBoost = 0;
    for (const vouch of vouches) {
      totalBoost += vouch.trust_score_boost || 0;
    }

    // Base 50 + boosts (capped)
    const score = 50 + Math.min(totalBoost, 50);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate verification score (0-100)
   */
  private async calculateVerificationScore(userId: string): Promise<number> {
    const { data: user } = await this.supabase
      .from('users')
      .select(`
        verification_status,
        is_verified,
        selfie_verified,
        phone_verified,
        dwolla_customer_id
      `)
      .eq('id', userId)
      .single();

    if (!user) return 0;

    let score = 0;

    // KYC verified (40 points)
    if (user.verification_status === 'verified' || user.is_verified) {
      score += 40;
    }

    // Selfie verified (20 points)
    if (user.selfie_verified) {
      score += 20;
    }

    // Phone verified (15 points)
    if (user.phone_verified) {
      score += 15;
    }

    // Bank connected (25 points)
    if (user.dwolla_customer_id) {
      score += 25;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate platform tenure score (0-100)
   */
  private async calculateTenureScore(userId: string): Promise<number> {
    const { data: user } = await this.supabase
      .from('users')
      .select('created_at')
      .eq('id', userId)
      .single();

    if (!user) return 0;

    const createdAt = new Date(user.created_at);
    const now = new Date();
    const monthsOnPlatform = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30);

    // 0-6 months: 0-30 points
    // 6-12 months: 30-50 points
    // 12-24 months: 50-75 points
    // 24+ months: 75-100 points
    if (monthsOnPlatform < 6) {
      return Math.round(monthsOnPlatform * 5);
    } else if (monthsOnPlatform < 12) {
      return Math.round(30 + (monthsOnPlatform - 6) * 3.33);
    } else if (monthsOnPlatform < 24) {
      return Math.round(50 + (monthsOnPlatform - 12) * 2.08);
    } else {
      return Math.min(100, Math.round(75 + (monthsOnPlatform - 24) * 1));
    }
  }

  /**
   * Get aggregated stats for a user
   */
  private async getUserStats(userId: string) {
    const { data: loans } = await this.supabase
      .from('loans')
      .select('status, amount, amount_paid')
      .eq('borrower_id', userId);

    const stats = {
      total_loans: loans?.length || 0,
      completed_loans: loans?.filter(l => l.status === 'completed').length || 0,
      active_loans: loans?.filter(l => l.status === 'active').length || 0,
      defaulted_loans: loans?.filter(l => l.status === 'defaulted').length || 0,
      total_amount_borrowed: loans?.reduce((sum, l) => sum + Number(l.amount), 0) || 0,
      total_amount_repaid: loans?.reduce((sum, l) => sum + Number(l.amount_paid || 0), 0) || 0,
    };

    return stats;
  }

  /**
   * Record a trust score event
   */
  async recordEvent(userId: string, event: TrustScoreEvent): Promise<void> {
    await this.supabase.from('trust_score_events').insert({
      user_id: userId,
      event_type: event.event_type,
      score_impact: event.score_impact,
      title: event.title,
      description: event.description,
      loan_id: event.loan_id,
      payment_id: event.payment_id,
      other_user_id: event.other_user_id,
      vouch_id: event.vouch_id,
      metadata: event.metadata || {},
    });

    // Recalculate score after event
    await this.recalculate(userId);
  }

  /**
   * Handle payment made event
   */
  async onPaymentMade(
    userId: string, 
    loanId: string, 
    paymentId: string, 
    amount: number,
    daysFromDue: number // negative = early, positive = late
  ): Promise<void> {
    let event: TrustScoreEvent;

    if (daysFromDue < -2) {
      event = {
        event_type: 'payment_early',
        score_impact: IMPACTS.PAYMENT_EARLY,
        title: 'Early Payment',
        description: `Payment of $${amount} made ${Math.abs(daysFromDue)} days early`,
        loan_id: loanId,
        payment_id: paymentId,
      };
    } else if (daysFromDue <= 0) {
      event = {
        event_type: 'payment_ontime',
        score_impact: IMPACTS.PAYMENT_ONTIME,
        title: 'On-Time Payment',
        description: `Payment of $${amount} made on time`,
        loan_id: loanId,
        payment_id: paymentId,
      };
    } else if (daysFromDue <= 7) {
      event = {
        event_type: 'payment_late',
        score_impact: IMPACTS.PAYMENT_LATE_1_7_DAYS,
        title: 'Late Payment',
        description: `Payment of $${amount} made ${daysFromDue} days late`,
        loan_id: loanId,
        payment_id: paymentId,
      };
    } else {
      event = {
        event_type: 'payment_late',
        score_impact: IMPACTS.PAYMENT_LATE_15_30_DAYS,
        title: 'Very Late Payment',
        description: `Payment of $${amount} made ${daysFromDue} days late`,
        loan_id: loanId,
        payment_id: paymentId,
      };
    }

    await this.recordEvent(userId, event);
  }

  /**
   * Handle loan completed event
   */
  async onLoanCompleted(userId: string, loanId: string, amount: number): Promise<void> {
    // Check if this is the user's first completed loan
    const { data: completedLoans } = await this.supabase
      .from('loans')
      .select('id')
      .eq('borrower_id', userId)
      .eq('status', 'completed');

    const isFirst = completedLoans?.length === 1;

    const event: TrustScoreEvent = {
      event_type: isFirst ? 'first_loan_completed' : 'loan_completed',
      score_impact: isFirst ? IMPACTS.FIRST_LOAN_COMPLETED : IMPACTS.LOAN_COMPLETED,
      title: isFirst ? 'First Loan Completed! 🎉' : 'Loan Completed',
      description: `Successfully repaid $${amount} loan`,
      loan_id: loanId,
    };

    await this.recordEvent(userId, event);
  }

  /**
   * Handle vouch received event
   */
  async onVouchReceived(
    userId: string, 
    voucherId: string, 
    vouchId: string, 
    strength: number
  ): Promise<void> {
    const impact = strength >= 70 ? IMPACTS.VOUCH_RECEIVED_STRONG : IMPACTS.VOUCH_RECEIVED_BASE;

    const event: TrustScoreEvent = {
      event_type: 'vouch_received',
      score_impact: impact,
      title: 'New Vouch Received',
      description: `Someone vouched for your trustworthiness`,
      other_user_id: voucherId,
      vouch_id: vouchId,
    };

    await this.recordEvent(userId, event);
  }

  /**
   * Get recent trust score events for a user
   */
  async getEvents(userId: string, limit: number = 20): Promise<any[]> {
    const { data } = await this.supabase
      .from('trust_score_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Get trust score history for a user
   */
  async getHistory(userId: string, limit: number = 30): Promise<any[]> {
    const { data } = await this.supabase
      .from('trust_score_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }
}

// ============================================
// VOUCH SERVICE
// ============================================

export class VouchService {
  private supabase: SupabaseClient;
  private trustScoreService: TrustScoreService;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.trustScoreService = new TrustScoreService(supabase);
  }

  /**
   * Create a vouch for another user
   */
  async createVouch(
    voucherId: string,
    voucheeId: string,
    data: {
      vouch_type: 'character' | 'guarantee' | 'employment' | 'family';
      relationship: string;
      relationship_details?: string;
      known_years?: number;
      message?: string;
      guarantee_percentage?: number;
      guarantee_max_amount?: number;
      is_public?: boolean;
    }
  ): Promise<{ vouch?: Vouch; error?: string }> {
    // Can't vouch for yourself
    if (voucherId === voucheeId) {
      return { error: "You can't vouch for yourself" };
    }

    // Check if already vouched
    const { data: existing } = await this.supabase
      .from('vouches')
      .select('id')
      .eq('voucher_id', voucherId)
      .eq('vouchee_id', voucheeId)
      .eq('status', 'active')
      .single();

    if (existing) {
      return { error: 'You have already vouched for this person' };
    }

    // Create the vouch
    const { data: vouch, error } = await this.supabase
      .from('vouches')
      .insert({
        voucher_id: voucherId,
        vouchee_id: voucheeId,
        vouch_type: data.vouch_type,
        relationship: data.relationship,
        relationship_details: data.relationship_details,
        known_years: data.known_years,
        message: data.message,
        guarantee_percentage: data.guarantee_percentage || 0,
        guarantee_max_amount: data.guarantee_max_amount || 0,
        is_public: data.is_public !== false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating vouch:', error);
      return { error: error.message };
    }

    // Record event and recalculate vouchee's score
    await this.trustScoreService.onVouchReceived(
      voucheeId,
      voucherId,
      vouch.id,
      vouch.vouch_strength
    );

    return { vouch };
  }

  /**
   * Get vouches for a user
   */
  async getVouchesFor(userId: string): Promise<Vouch[]> {
    const { data } = await this.supabase
      .from('vouches')
      .select(`
        *,
        voucher:users!voucher_id(
          id,
          full_name,
          username
        )
      `)
      .eq('vouchee_id', userId)
      .eq('status', 'active')
      .order('vouch_strength', { ascending: false });

    // Get voucher trust scores
    if (data) {
      for (const vouch of data) {
        if (vouch.voucher?.id) {
          const score = await this.trustScoreService.getScore(vouch.voucher.id);
          (vouch.voucher as any).trust_score = score;
        }
      }
    }

    return data || [];
  }

  /**
   * Get vouches given by a user
   */
  async getVouchesBy(userId: string): Promise<Vouch[]> {
    const { data } = await this.supabase
      .from('vouches')
      .select(`
        *,
        vouchee:users!vouchee_id(
          id,
          full_name,
          username
        )
      `)
      .eq('voucher_id', userId)
      .order('created_at', { ascending: false });

    return data || [];
  }

  /**
   * Revoke a vouch
   */
  async revokeVouch(
    voucherId: string,
    vouchId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('vouches')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq('id', vouchId)
      .eq('voucher_id', voucherId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Request a vouch from someone
   */
  async requestVouch(
    requesterId: string,
    targetUserId?: string,
    targetEmail?: string,
    message?: string,
    suggestedRelationship?: string
  ): Promise<{ request?: any; error?: string }> {
    if (!targetUserId && !targetEmail) {
      return { error: 'Must provide either user ID or email' };
    }

    const inviteToken = targetEmail ? this.generateToken() : null;

    const { data, error } = await this.supabase
      .from('vouch_requests')
      .insert({
        requester_id: requesterId,
        requested_user_id: targetUserId,
        requested_email: targetEmail,
        message,
        suggested_relationship: suggestedRelationship,
        invite_token: inviteToken,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { request: data };
  }

  /**
   * Accept a vouch request
   */
  async acceptVouchRequest(
    requestId: string,
    userId: string,
    vouchData: {
      vouch_type: 'character' | 'guarantee' | 'employment' | 'family';
      relationship: string;
      relationship_details?: string;
      known_years?: number;
      message?: string;
    }
  ): Promise<{ vouch?: Vouch; error?: string }> {
    // Get the request
    const { data: request } = await this.supabase
      .from('vouch_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!request) {
      return { error: 'Request not found' };
    }

    if (request.status !== 'pending') {
      return { error: 'Request is no longer pending' };
    }

    // Create the vouch
    const result = await this.createVouch(userId, request.requester_id, vouchData);

    if (result.error) {
      return { error: result.error };
    }

    // Update request status
    await this.supabase
      .from('vouch_requests')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
        vouch_id: result.vouch?.id,
      })
      .eq('id', requestId);

    return { vouch: result.vouch };
  }

  /**
   * Decline a vouch request
   */
  async declineVouchRequest(
    requestId: string,
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('vouch_requests')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString(),
        response_message: reason,
      })
      .eq('id', requestId)
      .eq('requested_user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  private generateToken(): string {
    return Array.from({ length: 32 }, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        .charAt(Math.floor(Math.random() * 62))
    ).join('');
  }
}

// ============================================
// EXPORTS
// ============================================

export { WEIGHTS, IMPACTS };
