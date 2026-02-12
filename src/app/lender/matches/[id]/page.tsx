'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Button, Card, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Clock,
  User,
  Star,
  Shield,
  MapPin,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Zap,
} from 'lucide-react';
import { 
  FaStar as FaStarIcon, 
  FaThumbsUp, 
  FaUserPlus, 
  FaExclamationTriangle, 
  FaBan, 
  FaExclamationCircle 
} from 'react-icons/fa';

interface Match {
  id: string;
  loan_id: string;
  match_score: number;
  match_rank: number;
  status: string;
  expires_at: string;
  loan: {
    id: string;
    amount: number;
    currency: string;
    purpose?: string;
    total_installments: number;
    repayment_frequency: string;
    recipient_name?: string;
    recipient_country?: string;
    disbursement_method?: string;
    created_at: string;
    borrower: {
      id: string;
      full_name: string;
      borrower_rating: string;
      verification_status: string;
      total_payments_made: number;
      payments_on_time: number;
      payments_early: number;
    };
  };
}

interface TrustScore {
  score: number;
  score_grade: string;
  score_label: string;
  total_loans: number;
  completed_loans: number;
  ontime_payments: number;
  total_payments: number;
}

export default function MatchReviewPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null); // ADDED
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    fetchUserAndMatch();
  }, [matchId]);

  useEffect(() => {
    if (match?.expires_at) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const expires = new Date(match.expires_at).getTime();
        const diff = expires - now;

        if (diff <= 0) {
          setTimeLeft('Expired');
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setTimeLeft(`${hours}h ${minutes}m`);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [match?.expires_at]);

  const fetchUserAndMatch = async () => {
    try {
      const supabase = createClient();
      
      // Get authenticated user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/auth/signin');
        return;
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setUser(profile || {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || 'User',
        user_type: authUser.user_metadata?.user_type || 'business',
      });

      // Fetch match
      console.log('[MatchReview] Fetching match:', matchId);
      const response = await fetch(`/api/matching/${matchId}`);
      const data = await response.json();
      
      console.log('[MatchReview] Response:', response.status, data);
      
      if (!response.ok) {
        setError(data.error || 'Failed to load match details');
        return;
      }
      
      setMatch(data.match);
      
      // ============================================
      // ADDED: Fetch trust score for borrower
      // ============================================
      if (data.match?.loan?.borrower?.id) {
        try {
          const { data: scoreData } = await supabase
            .from('trust_scores')
            .select('score, score_grade, score_label, total_loans, completed_loans, ontime_payments, total_payments')
            .eq('user_id', data.match.loan.borrower.id)
            .single();
          
          setTrustScore(scoreData);
          console.log('[MatchReview] Trust score:', scoreData);
        } catch (err) {
          console.log('[MatchReview] No trust score found for borrower');
        }
      }
      
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load match details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'accept' | 'decline') => {
    if (action === 'decline' && !showDeclineModal) {
      setShowDeclineModal(true);
      return;
    }

    setActionLoading(action);
    try {
      const response = await fetch(`/api/matching/${matchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          decline_reason: action === 'decline' ? declineReason : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (action === 'accept') {
          router.push(`/loans/${match?.loan_id}`);
        } else {
          router.push('/lender/matches');
        }
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert('Action failed');
    } finally {
      setActionLoading(null);
      setShowDeclineModal(false);
    }
  };

  const getRatingBadge = (rating: string) => {
    const config: Record<string, { 
      color: string; 
      darkColor: string; 
      icon: React.ReactNode 
    }> = {
      great: { 
        color: 'bg-green-100 text-green-700', 
        darkColor: 'dark:bg-green-900/30 dark:text-green-400',
        icon: <FaStarIcon className="w-3 h-3" />
      },
      good: { 
        color: 'bg-blue-100 text-blue-700', 
        darkColor: 'dark:bg-blue-900/30 dark:text-blue-400',
        icon: <FaThumbsUp className="w-3 h-3" />
      },
      neutral: { 
        color: 'bg-gray-100 text-gray-700', 
        darkColor: 'dark:bg-neutral-800 dark:text-neutral-400',
        icon: <FaUserPlus className="w-3 h-3" />
      },
      poor: { 
        color: 'bg-yellow-100 text-yellow-700', 
        darkColor: 'dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: <FaExclamationTriangle className="w-3 h-3" />
      },
      bad: { 
        color: 'bg-orange-100 text-orange-700', 
        darkColor: 'dark:bg-orange-900/30 dark:text-orange-400',
        icon: <FaBan className="w-3 h-3" />
      },
      worst: { 
        color: 'bg-red-100 text-red-700', 
        darkColor: 'dark:bg-red-900/30 dark:text-red-400',
        icon: <FaExclamationCircle className="w-3 h-3" />
      },
    };
    const c = config[rating] || config.neutral;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${c.color} ${c.darkColor}`}>
        {c.icon} {rating.charAt(0).toUpperCase() + rating.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Navbar user={user} />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 dark:border-primary-400 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Navbar user={user} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
              {error || 'Match Not Found'}
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 mb-6">
              This match may have been accepted, declined, or expired.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/lender/matches">
                <Button variant="outline">
                  View All Matches
                </Button>
              </Link>
              <Link href="/business">
                <Button>
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const loan = match.loan;
  const borrower = loan.borrower;
  const isExpired = match.status === 'expired' || new Date(match.expires_at) < new Date();
  const isPending = match.status === 'pending' && !isExpired;

  // Calculate on-time percentage
  const onTimePercentage = borrower.total_payments_made > 0
    ? Math.round(((borrower.payments_on_time + borrower.payments_early) / borrower.total_payments_made) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/lender/matches" className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-300 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Matches
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Loan Match Review</h1>
              <p className="text-neutral-500 dark:text-neutral-400">Review and respond to this loan request</p>
            </div>
            {isPending && (
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{timeLeft} left</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Banner */}
        {!isPending && (
          <Card className={`mb-6 ${
            match.status === 'accepted' ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' :
            match.status === 'declined' ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' :
            'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/20'
          }`}>
            <div className="flex items-center gap-3">
              {match.status === 'accepted' && <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-500" />}
              {match.status === 'declined' && <XCircle className="w-6 h-6 text-red-600 dark:text-red-500" />}
              {(match.status === 'expired' || isExpired) && <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />}
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {match.status === 'accepted' && 'You accepted this loan'}
                  {match.status === 'declined' && 'You declined this loan'}
                  {(match.status === 'expired' || isExpired) && 'This match has expired'}
                </p>
                {match.status === 'accepted' && (
                  <Link href={`/loans/${loan.id}`} className="text-sm text-green-700 dark:text-green-400 underline">
                    View loan details →
                  </Link>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Match Score */}
        <Card className="mb-6 bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 dark:text-primary-200">Match Score</p>
              <p className="text-2xl font-bold">{match.match_score}%</p>
            </div>
            <div className="text-right">
              <p className="text-primary-100 dark:text-primary-200">Loan Amount</p>
              <p className="text-2xl font-bold">{formatCurrency(loan.amount, loan.currency)}</p>
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Borrower Info */}
          <Card>
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500 dark:text-primary-400" />
              Borrower Profile
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Name</span>
                <span className="font-medium text-neutral-900 dark:text-white">{borrower.full_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Rating</span>
                {getRatingBadge(borrower.borrower_rating || 'neutral')}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Verified</span>
                {borrower.verification_status === 'verified' ? (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-500">
                    <Shield className="w-4 h-4" />
                    Verified
                  </span>
                ) : (
                  <span className="text-neutral-400 dark:text-neutral-500">Not verified</span>
                )}
              </div>
              
              {/* ============================================ */}
              {/* ADDED: Trust Score Display */}
              {/* ============================================ */}
              {trustScore && (
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      Trust Score
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-neutral-900 dark:text-white">
                        {trustScore.score}
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        trustScore.score >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        trustScore.score >= 60 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {trustScore.score_grade}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {trustScore.score_label} • {trustScore.completed_loans || 0} loans completed
                  </p>
                  {trustScore.total_payments > 0 && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      {trustScore.ontime_payments}/{trustScore.total_payments} payments on-time
                    </p>
                  )}
                </div>
              )}
              {/* ============================================ */}
              {/* END TRUST SCORE DISPLAY */}
              {/* ============================================ */}
              
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-500 dark:text-neutral-400">Payment History</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{borrower.total_payments_made} payments</span>
                </div>
                <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 dark:bg-green-600"
                    style={{ width: `${onTimePercentage}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {onTimePercentage}% on-time or early
                </p>
              </div>
            </div>
          </Card>

          {/* Loan Details */}
          <Card>
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-500 dark:text-primary-400" />
              Loan Details
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Amount</span>
                <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(loan.amount, loan.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Installments</span>
                <span className="font-medium text-neutral-900 dark:text-white">{loan.total_installments} × {loan.repayment_frequency}</span>
              </div>
              {loan.purpose && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Purpose</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{loan.purpose}</span>
                </div>
              )}
              {loan.recipient_country && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Recipient Country</span>
                  <span className="font-medium text-neutral-900 dark:text-white flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {loan.recipient_country}
                  </span>
                </div>
              )}
              {loan.recipient_name && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Recipient</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{loan.recipient_name}</span>
                </div>
              )}
              {loan.disbursement_method && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Disbursement</span>
                  <span className="font-medium text-neutral-900 dark:text-white capitalize">{loan.disbursement_method.replace('_', ' ')}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Requested</span>
                <span className="text-neutral-400 dark:text-neutral-500 text-sm">{new Date(loan.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Auto-accept Tip */}
        {isPending && (
          <Card className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900 dark:text-yellow-400">Save time with Auto-Accept</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-1">
                  Enable auto-accept in your preferences to automatically fund loans that match your criteria.
                  <Link href="/lender/preferences" className="underline ml-1">
                    Update preferences →
                  </Link>
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        {isPending && (
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1 text-red-600 dark:text-red-400 border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
              onClick={() => handleAction('decline')}
              loading={actionLoading === 'decline'}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Decline
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
              onClick={() => handleAction('accept')}
              loading={actionLoading === 'accept'}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Accept & Fund
            </Button>
          </div>
        )}

        {/* Decline Modal */}
        {showDeclineModal && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-white dark:bg-neutral-900">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Decline Loan</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Are you sure you want to decline this loan? It will be offered to the next matching lender.
              </p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Reason for declining (optional)"
                className="w-full p-3 border border-neutral-200 dark:border-neutral-700 rounded-xl min-h-[80px] mb-4 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowDeclineModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
                  onClick={() => handleAction('decline')}
                  loading={actionLoading === 'decline'}
                >
                  Confirm Decline
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}