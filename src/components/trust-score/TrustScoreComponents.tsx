'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Progress } from '@/components/ui';
import { 
  Shield, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  Clock, 
  CreditCard,
  Star,
  ChevronRight,
  Award,
  Target,
  Zap,
  UserPlus,
  ExternalLink,
  Info,
  X,
  Trash2,
  User
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ============================================
// TYPES
// ============================================

interface TrustScoreData {
  score: number;
  score_grade: string;
  score_label: string;
  payment_score: number;
  completion_score: number;
  social_score: number;
  verification_score: number;
  tenure_score: number;
  total_loans: number;
  completed_loans: number;
  current_streak: number;
  best_streak: number;
  vouches_received: number;
  total_amount_repaid: number;
}

interface Vouch {
  id: string;
  vouch_type: string;
  relationship: string;
  vouch_strength: number;
  trust_score_boost: number;
  created_at: string;
  voucher?: {
    id: string;
    full_name: string;
    username?: string;
  };
}

interface TrustScoreEvent {
  id: string;
  event_type: string;
  score_impact: number;
  title: string;
  description?: string;
  created_at: string;
}

// ============================================
// TRUST SCORE BADGE
// ============================================

interface TrustScoreBadgeProps {
  score: number;
  grade: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function TrustScoreBadge({ score, grade, size = 'md', showLabel = true }: TrustScoreBadgeProps) {
  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'from-emerald-500 to-green-600';
    if (grade.startsWith('B')) return 'from-blue-500 to-indigo-600';
    if (grade.startsWith('C')) return 'from-amber-500 to-orange-600';
    if (grade.startsWith('D')) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-red-700';
  };

  const sizes = {
    sm: { container: 'w-12 h-12', score: 'text-sm', grade: 'text-[10px]' },
    md: { container: 'w-20 h-20', score: 'text-xl', grade: 'text-xs' },
    lg: { container: 'w-28 h-28', score: 'text-3xl', grade: 'text-sm' },
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div 
        className={`${sizes[size].container} rounded-full bg-gradient-to-br ${getGradeColor(grade)} flex flex-col items-center justify-center text-white shadow-lg`}
      >
        <span className={`font-bold ${sizes[size].score}`}>{score}</span>
        <span className={`font-semibold ${sizes[size].grade}`}>{grade}</span>
      </div>
      {showLabel && size !== 'sm' && (
        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Trust Score</span>
      )}
    </div>
  );
}

// ============================================
// TRUST SCORE CARD (Full Display)
// ============================================

interface TrustScoreCardProps {
  userId?: string;
  showDetails?: boolean;
  showVouches?: boolean;
  className?: string;
  currentUserId?: string; // The logged-in user's ID
  onVouchRevoked?: () => void; // Callback when vouch is revoked
}

export function TrustScoreCard({ userId, showDetails = true, showVouches = true, className = '', currentUserId, onVouchRevoked }: TrustScoreCardProps) {
  const [loading, setLoading] = useState(true);
  const [scoreData, setScoreData] = useState<TrustScoreData | null>(null);
  const [vouches, setVouches] = useState<Vouch[]>([]);
  const [events, setEvents] = useState<TrustScoreEvent[]>([]);
  const [myVouchForThisUser, setMyVouchForThisUser] = useState<string | null>(null);
  const [revokingVouch, setRevokingVouch] = useState(false);
  const [paymentStats, setPaymentStats] = useState<{
    totalPayments: number;
    onTime: number;
    early: number;
    late: number;
    missed: number;
    autoPayments: number;
    manualPayments: number;
    autoPayEnabled: boolean;
    bankConnected: boolean;
  } | null>(null);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const supabase = createClient();
        const params = userId ? `?userId=${userId}` : '';
        
        const response = await fetch(`/api/trust-score${params}`);
        const data = await response.json();

        if (data.score) {
          setScoreData(data.score);
          setVouches(data.topVouches || []);
          setEvents(data.recentEvents || []);
          setPaymentStats(data.paymentStats || null);
        }

        // Check if current user has vouched for this user
        if (currentUserId && userId && currentUserId !== userId) {
          try {
            const vouchResponse = await fetch('/api/vouches?type=given');
            if (vouchResponse.ok) {
              const vouchData = await vouchResponse.json();
              const myVouch = (vouchData.vouches || []).find(
                (v: any) => v.vouchee_id === userId
              );
              if (myVouch) {
                setMyVouchForThisUser(myVouch.id);
              }
            }
          } catch (err) {
            console.error('Error checking vouch status:', err);
          }
        }
      } catch (error) {
        console.error('Error fetching trust score:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchScore();
  }, [userId, currentUserId]);

  // Check if viewing own profile
  const isOwnProfile = currentUserId && (!userId || userId === currentUserId);

  // Handler to revoke a vouch
  const handleRevokeVouch = async () => {
    if (!myVouchForThisUser) return;
    
    setRevokingVouch(true);
    try {
      const response = await fetch('/api/vouches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke',
          vouchId: myVouchForThisUser,
          reason: 'User revoked vouch',
        }),
      });

      if (response.ok) {
        setMyVouchForThisUser(null);
        onVouchRevoked?.();
        // Refresh the score data
        const params = userId ? `?userId=${userId}` : '';
        const scoreResponse = await fetch(`/api/trust-score${params}`);
        const data = await scoreResponse.json();
        if (data.score) {
          setScoreData(data.score);
          setVouches(data.topVouches || []);
        }
      }
    } catch (error) {
      console.error('Error revoking vouch:', error);
    } finally {
      setRevokingVouch(false);
    }
  };

  if (loading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-neutral-200 dark:bg-neutral-700" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-24" />
            <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-32" />
          </div>
        </div>
      </Card>
    );
  }

  if (!scoreData) {
    return (
      <Card className={className}>
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-500 dark:text-neutral-400">No trust score available</p>
        </div>
      </Card>
    );
  }

  const components = [
    { label: 'Payment History', score: scoreData.payment_score, weight: '40%', icon: CreditCard, color: 'text-emerald-500' },
    { label: 'Loan Completion', score: scoreData.completion_score, weight: '25%', icon: CheckCircle, color: 'text-blue-500' },
    { label: 'Social Trust', score: scoreData.social_score, weight: '15%', icon: Users, color: 'text-purple-500' },
    { label: 'Verification', score: scoreData.verification_score, weight: '10%', icon: Shield, color: 'text-amber-500' },
    { label: 'Platform Tenure', score: scoreData.tenure_score, weight: '10%', icon: Clock, color: 'text-cyan-500' },
  ];

  return (
    <Card className={className}>
      {/* Header */}
      <div className="flex items-center gap-6 mb-6">
        <TrustScoreBadge 
          score={scoreData.score} 
          grade={scoreData.score_grade} 
          size="lg" 
        />
        <div className="flex-1">
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1 flex items-center gap-2">
            {scoreData.score_label}
            {isOwnProfile && (
              <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">(You)</span>
            )}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {scoreData.completed_loans} loans completed • {scoreData.current_streak} payment streak
          </p>
          {scoreData.vouches_received > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                {scoreData.vouches_received} vouch{scoreData.vouches_received !== 1 ? 'es' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Show "You vouched" indicator if current user has vouched for this profile */}
      {myVouchForThisUser && (
        <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                You've vouched for this person
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRevokeVouch}
              disabled={revokingVouch}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {revokingVouch ? (
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Payment Method Stats */}
      {paymentStats && paymentStats.totalPayments > 0 && (
        <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
          <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-500" />
            Payment Methods
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${paymentStats.autoPayEnabled ? 'bg-green-500' : 'bg-neutral-300'}`} />
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Auto-Pay</span>
              </div>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {paymentStats.autoPayments}
              </p>
              <p className="text-xs text-neutral-500">
                {paymentStats.autoPayEnabled ? 'Enabled' : 'Not enabled'}
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Manual</span>
              </div>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {paymentStats.manualPayments}
              </p>
              <p className="text-xs text-neutral-500">
                Cash App, Venmo, etc.
              </p>
            </div>
          </div>
          {/* Payment timing breakdown */}
          <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-green-600 dark:text-green-400">✓ On-time: {paymentStats.onTime}</span>
              <span className="text-blue-600 dark:text-blue-400">⚡ Early: {paymentStats.early}</span>
              <span className="text-amber-600 dark:text-amber-400">⏰ Late: {paymentStats.late}</span>
            </div>
          </div>
        </div>
      )}

      {/* Score Breakdown */}
      {showDetails && (
        <div className="space-y-4 mb-6">
          <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Score Breakdown
          </h4>
          <div className="space-y-3">
            {components.map((comp) => (
              <div key={comp.label} className="flex items-center gap-3">
                <comp.icon className={`w-4 h-4 ${comp.color}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {comp.label}
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-1">({comp.weight})</span>
                    </span>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">{comp.score}</span>
                  </div>
                  <Progress value={comp.score} className="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vouches */}
      {showVouches && vouches.length > 0 && (
        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
          <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-purple-500" />
            Top Vouches
          </h4>
          <div className="space-y-2">
            {vouches.slice(0, 3).map((vouch) => (
              <div 
                key={vouch.id} 
                className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center text-purple-700 dark:text-purple-300 font-semibold text-sm">
                    {vouch.voucher?.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {vouch.voucher?.full_name || 'Anonymous'}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                      {vouch.relationship}
                    </p>
                  </div>
                </div>
                <Badge variant="default" className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                  +{vouch.trust_score_boost}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">{scoreData.total_loans}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Total Loans</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">{scoreData.best_streak}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Best Streak</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">
            ${(scoreData.total_amount_repaid || 0).toLocaleString()}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Repaid</p>
        </div>
      </div>
    </Card>
  );
}

// ============================================
// MINI TRUST SCORE (For loan cards, etc)
// ============================================

interface MiniTrustScoreProps {
  userId: string;
  className?: string;
}

export function MiniTrustScore({ userId, className = '' }: MiniTrustScoreProps) {
  const [score, setScore] = useState<{ score: number; grade: string } | null>(null);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const response = await fetch(`/api/trust-score?userId=${userId}`);
        const data = await response.json();
        if (data.score) {
          setScore({ score: data.score.score, grade: data.score.score_grade });
        }
      } catch (error) {
        console.error('Error fetching mini trust score:', error);
      }
    };

    fetchScore();
  }, [userId]);

  if (!score) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TrustScoreBadge score={score.score} grade={score.grade} size="sm" showLabel={false} />
    </div>
  );
}

// ============================================
// VOUCH BUTTON
// ============================================

interface VouchButtonProps {
  targetUserId: string;
  targetName: string;
  onVouchComplete?: () => void;
  className?: string;
}

export function VouchButton({ targetUserId, targetName, onVouchComplete, className = '' }: VouchButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vouch_type: 'character',
    relationship: 'friend',
    known_years: 1,
    message: '',
  });

  const handleVouch = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/vouches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vouch',
          voucheeId: targetUserId,
          ...formData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowModal(false);
        onVouchComplete?.();
      } else {
        alert(data.error || 'Failed to create vouch');
      }
    } catch (error) {
      console.error('Error creating vouch:', error);
      alert('Failed to create vouch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowModal(true)}
        className={className}
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Vouch for {targetName.split(' ')[0]}
      </Button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="w-6 h-6 text-purple-500" />
              Vouch for {targetName}
            </h2>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                By vouching, you're putting your reputation on the line. Only vouch for people you truly trust.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Relationship
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                >
                  <option value="family">Family</option>
                  <option value="friend">Friend</option>
                  <option value="colleague">Colleague</option>
                  <option value="neighbor">Neighbor</option>
                  <option value="business">Business Associate</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  How long have you known them?
                </label>
                <select
                  value={formData.known_years}
                  onChange={(e) => setFormData({ ...formData, known_years: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                >
                  <option value={1}>Less than 1 year</option>
                  <option value={2}>1-2 years</option>
                  <option value={5}>3-5 years</option>
                  <option value={10}>5-10 years</option>
                  <option value={15}>10+ years</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Message (optional)
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Why do you trust this person?"
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleVouch}
                disabled={loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {loading ? 'Creating...' : 'Create Vouch'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Export all components
// export { TrustScoreBadge, TrustScoreCard, MiniTrustScore, VouchButton };
