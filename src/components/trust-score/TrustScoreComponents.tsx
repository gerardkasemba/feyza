'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('TrustScoreComponents');

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Shield,
  Users,
  CheckCircle,
  Clock,
  CreditCard,
  Award,
  Target,
  Zap,
  Trash2,
  UserPlus,
  Info,
  X,
  ChevronRight,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';

import { Card, Button, Badge, Progress, Modal } from '@/components/ui';
import { PathTo100Explainer } from './PathTo100Explainer';

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

/** Vouches you gave (people you vouched for) */
interface VouchGiven {
  id: string;
  relationship: string;
  trust_score_boost: number;
  created_at: string;
  status?: string;
  vouchee?: {
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
// UI HELPERS — indicative colors for all trust score options
// ============================================

/** Grade → gradient (badge background) */
function gradeGradient(grade: string) {
  if (grade.startsWith('A')) return 'from-emerald-500 to-green-600';
  if (grade.startsWith('B')) return 'from-blue-500 to-indigo-600';
  if (grade.startsWith('C')) return 'from-amber-500 to-orange-600';
  if (grade.startsWith('D')) return 'from-orange-500 to-red-500';
  return 'from-red-500 to-red-700'; // F
}

/** Score 0–100 → stroke/ring color (Tailwind) */
function scoreToRingStroke(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  if (s >= 90) return 'stroke-emerald-500 dark:stroke-emerald-400';
  if (s >= 80) return 'stroke-blue-500 dark:stroke-blue-400';
  if (s >= 70) return 'stroke-amber-500 dark:stroke-amber-400';
  if (s >= 60) return 'stroke-orange-500 dark:stroke-orange-400';
  return 'stroke-red-500 dark:stroke-red-400';
}

/** Score 0–100 → text color for score label / grade */
function scoreToTextColor(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  if (s >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (s >= 80) return 'text-blue-600 dark:text-blue-400';
  if (s >= 70) return 'text-amber-600 dark:text-amber-400';
  if (s >= 60) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

/** Score 0–100 → progress bar color (Tailwind class for the bar) */
function scoreToProgressColor(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  if (s >= 90) return 'bg-emerald-500';
  if (s >= 80) return 'bg-blue-500';
  if (s >= 70) return 'bg-amber-500';
  if (s >= 60) return 'bg-orange-500';
  return 'bg-red-500';
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function initials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join('') || '?';
}

function fmtMoney(n: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n || 0);
  } catch {
    return `$${(n || 0).toLocaleString()}`;
  }
}

type SheetTab = 'overview' | 'breakdown' | 'vouches' | 'activity';

// ============================================
// TRUST SCORE RING
// ============================================

interface TrustScoreRingProps {
  score: number;
  grade: string;
  label?: string;
}

export function TrustScoreRing({ score, grade, label }: TrustScoreRingProps) {
  const safeScore = clamp(score);
  const circumference = 2 * Math.PI * 22;
  const offset = circumference * (1 - safeScore / 100);
  const ringStroke = scoreToRingStroke(safeScore);
  const gradeColor = scoreToTextColor(safeScore);

  return (
    <div className="relative w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 56 56">
        <circle
          cx="28"
          cy="28"
          r="22"
          fill="none"
          strokeWidth="6"
          className="stroke-neutral-200 dark:stroke-neutral-800"
        />
        <circle
          cx="28"
          cy="28"
          r="22"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={ringStroke}
        />
      </svg>

      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-none">
          <div className={`text-xl font-bold ${gradeColor}`}>{safeScore}</div>
          <div className={`text-[11px] font-semibold ${gradeColor}`}>{grade}</div>
        </div>
      </div>

      {label ? (
        <div className="mt-2 text-center text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
          {label}
        </div>
      ) : null}
    </div>
  );
}

// ============================================
// TRUST SCORE BADGE (kept, simplified)
// ============================================

interface TrustScoreBadgeProps {
  score: number;
  grade: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function TrustScoreBadge({
  score,
  grade,
  size = 'md',
  showLabel = true,
}: TrustScoreBadgeProps) {
  const sizes = {
    sm: { container: 'w-11 h-11', score: 'text-sm', grade: 'text-[10px]' },
    md: { container: 'w-16 h-16', score: 'text-lg', grade: 'text-[11px]' },
    lg: { container: 'w-20 h-20', score: 'text-xl', grade: 'text-xs' },
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizes[size].container} rounded-2xl bg-gradient-to-br ${gradeGradient(
          grade
        )} flex flex-col items-center justify-center text-white shadow-sm`}
      >
        <span className={`font-bold ${sizes[size].score}`}>{clamp(score)}</span>
        <span className={`font-semibold ${sizes[size].grade}`}>{grade}</span>
      </div>
      {showLabel && size !== 'sm' ? (
        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
          Trust Score
        </span>
      ) : null}
    </div>
  );
}

// ============================================
// TRUST SCORE CARD (App-style)
// ============================================

interface TrustScoreCardProps {
  userId?: string;
  showDetails?: boolean;
  showVouches?: boolean;
  className?: string;
  currentUserId?: string;
  onVouchRevoked?: () => void;
}

export function TrustScoreCard({
  userId,
  showDetails = true,
  showVouches = true,
  className = '',
  currentUserId,
  onVouchRevoked,
}: TrustScoreCardProps) {
  const [loading, setLoading] = useState(true);
  const [scoreData, setScoreData] = useState<TrustScoreData | null>(null);
  const [vouches, setVouches] = useState<Vouch[]>([]);
  const [myVouchees, setMyVouchees] = useState<VouchGiven[]>([]);
  const [events, setEvents] = useState<TrustScoreEvent[]>([]);
  const [tab, setTab] = useState<SheetTab>('overview');

  const [myVouchForThisUser, setMyVouchForThisUser] = useState<string | null>(null);
  const [revokingVouch, setRevokingVouch] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);

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
    const run = async () => {
      setLoading(true);
      try {
        // For own profile: pass ?refresh=1 to trigger recalculation if stale
        const params = userId ? `?userId=${userId}` : '?refresh=1';
        const res = await fetch(`/api/trust-score${params}`);
        const data = await res.json();

        if (data?.score) {
          setScoreData(data.score);
          setVouches(data.topVouches || []);
          setMyVouchees(data.myVouchees || []);
          setEvents(data.recentEvents || []);
          setPaymentStats(data.paymentStats || null);
        } else {
          setScoreData(null);
        }

        if (currentUserId && userId && currentUserId !== userId) {
          try {
            const vouchResponse = await fetch('/api/vouches?type=given');
            if (vouchResponse.ok) {
              const vouchData = await vouchResponse.json();
              const myVouch = (vouchData.vouches || []).find((v: any) => v.vouchee_id === userId);
              if (myVouch) setMyVouchForThisUser(myVouch.id);
              else setMyVouchForThisUser(null);
            }
          } catch {
            // ignore
          }
        }
      } catch (e) {
        log.error('Error fetching trust score:', e);
        setScoreData(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [userId, currentUserId]);

  const isOwnProfile = !!currentUserId && (!userId || userId === currentUserId);

  const components = useMemo(
    () => [
      { label: 'Payment', score: scoreData?.payment_score ?? 0, weight: '40%', icon: CreditCard },
      { label: 'Completion', score: scoreData?.completion_score ?? 0, weight: '25%', icon: CheckCircle },
      { label: 'Social', score: scoreData?.social_score ?? 0, weight: '15%', icon: Users },
      { label: 'Verification', score: scoreData?.verification_score ?? 0, weight: '10%', icon: Shield },
      { label: 'Tenure', score: scoreData?.tenure_score ?? 0, weight: '10%', icon: Clock },
    ],
    [scoreData]
  );

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

        const params = userId ? `?userId=${userId}` : '';
        const scoreResponse = await fetch(`/api/trust-score${params}`);
        const data = await scoreResponse.json();
        if (data?.score) {
          setScoreData(data.score);
          setVouches(data.topVouches || []);
          setMyVouchees(data.myVouchees || []);
        }
      }
    } catch (error) {
      log.error('Error revoking vouch:', error);
    } finally {
      setRevokingVouch(false);
    }
  };

  if (loading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="h-3 w-56 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
          </div>
          <div className="mt-4 h-24 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
        </div>
      </Card>
    );
  }

  if (!scoreData) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-8">
          <Shield className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No trust score available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 sm:p-5 ${className}`}>
      {/* App-style header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <TrustScoreRing score={scoreData.score} grade={scoreData.score_grade} label="Trust" />
          <div className="pt-1">
            <div className="flex items-center gap-2">
              <h3 className={`text-base sm:text-lg font-bold ${scoreToTextColor(scoreData.score)}`}>
                {scoreData.score_label}
              </h3>
              <button
                type="button"
                onClick={() => setShowScoreModal(true)}
                className="p-0.5 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Learn about Trust Score"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              {isOwnProfile ? (
                <Badge variant="outline" className="text-[11px] px-2 py-0.5">
                  You
                </Badge>
              ) : null}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-neutral-500 dark:text-neutral-400">
              <span className="inline-flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                {scoreData.completed_loans} completed
              </span>
              <span className="text-neutral-300 dark:text-neutral-700">•</span>
              <span className="inline-flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {scoreData.current_streak} streak
              </span>
              {scoreData.vouches_received > 0 ? (
                <>
                  <span className="text-neutral-300 dark:text-neutral-700">•</span>
                  <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                    <Users className="w-3.5 h-3.5" />
                    {scoreData.vouches_received} vouch{scoreData.vouches_received !== 1 ? 'es' : ''}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* You vouched banner */}
      {myVouchForThisUser ? (
        <div className="mt-4 rounded-2xl border border-purple-200 dark:border-purple-900/40 bg-purple-50 dark:bg-purple-900/20 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <div className="text-sm font-medium text-purple-800 dark:text-purple-200">
                You vouched for this person
              </div>
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
      ) : null}

      {/* Segmented tabs (mobile-friendly) */}
      <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-neutral-100 dark:bg-neutral-900 p-1">
        {(
          [
            ['overview', 'Overview'],
            ['breakdown', 'Breakdown'],
            ['vouches', 'Vouches'],
            ['activity', 'Activity'],
          ] as const
        ).map(([key, label]) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={[
                'rounded-xl px-2 py-2 text-[12px] font-semibold transition',
                active
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400',
              ].join(' ')}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {tab === 'overview' ? (
          <div className="space-y-3">
            {/* Key stats cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Loans</div>
                <div className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">
                  {scoreData.total_loans}
                </div>
              </div>
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Best streak</div>
                <div className="mt-1 text-lg font-bold text-emerald-600">{scoreData.best_streak}</div>
              </div>
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Repaid</div>
                <div className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">
                  {fmtMoney(scoreData.total_amount_repaid || 0)}
                </div>
              </div>
            </div>

            {/* Payment methods */}
            {paymentStats && paymentStats.totalPayments > 0 ? (
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                      Payment methods
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[11px]">
                    {paymentStats.totalPayments} total
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={[
                          'w-2 h-2 rounded-full',
                          paymentStats.autoPayEnabled ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700',
                        ].join(' ')}
                      />
                      <div className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                        Auto-pay
                      </div>
                    </div>
                    <div className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">
                      {paymentStats.autoPayments}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {paymentStats.autoPayEnabled ? 'Enabled' : 'Not enabled'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <div className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                        Manual
                      </div>
                    </div>
                    <div className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">
                      {paymentStats.manualPayments}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Cash App, Venmo…</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-2 text-emerald-700 dark:text-emerald-300">
                    ✓ On-time: {paymentStats.onTime}
                  </div>
                  <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-2 text-blue-700 dark:text-blue-300">
                    ⚡ Early: {paymentStats.early}
                  </div>
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-2 text-amber-700 dark:text-amber-300">
                    ⏰ Late: {paymentStats.late}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === 'breakdown' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Score breakdown
              </div>
            </div>

            <div className="space-y-3">
              {components.map((c) => {
                const compScore = clamp(c.score);
                const barColor = scoreToProgressColor(compScore);
                const textColor = scoreToTextColor(compScore);
                return (
                  <div
                    key={c.label}
                    className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <c.icon className={`w-4 h-4 ${textColor}`} />
                        <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {c.label}{' '}
                          <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
                            ({c.weight})
                          </span>
                        </div>
                      </div>
                      <div className={`text-sm font-bold ${textColor}`}>{c.score}</div>
                    </div>

                    <div className="mt-2">
                      <Progress value={compScore} className="h-2" indicatorClassName={barColor} />
                    </div>
                  </div>
                );
              })}
            </div>

           
          </div>
        ) : null}

        {tab === 'vouches' && showVouches ? (
          <div className="space-y-4">
            {/* People you've vouched for (only on own profile) */}
            {myVouchees.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    People you&apos;ve vouched for ({myVouchees.length})
                  </div>
                </div>
                <div className="space-y-2">
                  {myVouchees.map((v: VouchGiven) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 grid place-items-center text-emerald-700 dark:text-emerald-200 font-bold">
                          {initials(v.vouchee?.full_name || v.vouchee?.username)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                            {v.vouchee?.full_name || v.vouchee?.username || 'Someone'}
                          </div>
                          <div className="text-[12px] text-neutral-500 dark:text-neutral-400 capitalize">
                            {v.relationship}
                            {v.status && v.status !== 'active' ? ` · ${v.status}` : ''}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200">
                        +{v.trust_score_boost}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* People who vouched for you */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-purple-500" />
                <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  People who vouched for you
                </div>
              </div>
              {vouches.length === 0 && myVouchees.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 text-center text-sm text-neutral-600 dark:text-neutral-400">
                  No vouches yet.
                </div>
              ) : vouches.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 text-center text-sm text-neutral-600 dark:text-neutral-400">
                  No one has vouched for you yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {vouches.slice(0, 6).map((v: any) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/30 grid place-items-center text-purple-700 dark:text-purple-200 font-bold">
                          {initials(v.voucher?.full_name)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                            {v.voucher?.full_name || 'Someone'}
                          </div>
                          <div className="text-[12px] text-neutral-500 dark:text-neutral-400 capitalize">
                            {v.relationship}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200">
                        +{v.trust_score_boost}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {tab === 'activity' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Recent activity</div>
            </div>

            {events.length === 0 ? (
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 text-center text-sm text-neutral-600 dark:text-neutral-400">
                No recent events.
              </div>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 8).map((e) => (
                  <div
                    key={e.id}
                    className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-neutral-900 dark:text-white">{e.title}</div>
                        {e.description ? (
                          <div className="mt-0.5 text-[12px] text-neutral-500 dark:text-neutral-400">
                            {e.description}
                          </div>
                        ) : null}
                      </div>

                      <Badge
                        variant="outline"
                        className={[
                          'text-[11px]',
                          e.score_impact >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300',
                        ].join(' ')}
                      >
                        {e.score_impact >= 0 ? `+${e.score_impact}` : e.score_impact}
                      </Badge>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500">
                      <span>{new Date(e.created_at).toLocaleDateString()}</span>
                      <span className="inline-flex items-center gap-1">
                        Details <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <Modal isOpen={showScoreModal} onClose={() => setShowScoreModal(false)} title="About Trust Score" size="xl">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Your trust score (0–100) is a weighted blend of payment history, loan completions, vouches, verification, and tenure. Lenders use it to assess reliability.
          </p>
          <PathTo100Explainer variant="full" />
        </div>
      </Modal>
    </Card>
  );
}

// ============================================
// MINI TRUST SCORE (compact)
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
        if (data?.score) {
          setScore({ score: data.score.score, grade: data.score.score_grade });
        }
      } catch (error) {
        log.error('Error fetching mini trust score:', error);
      }
    };

    fetchScore();
  }, [userId]);

  if (!score) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TrustScoreBadge score={score.score} grade={score.grade} size="sm" showLabel={false} />
      <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">Trust</span>
    </div>
  );
}

// ============================================
// VOUCH BUTTON (mobile bottom-sheet modal)
// ============================================

interface VouchButtonProps {
  targetUserId: string;
  targetName: string;
  onVouchComplete?: () => void;
  className?: string;
}

export function VouchButton({ targetUserId, targetName, onVouchComplete, className = '' }: VouchButtonProps) {
  const displayName = (targetName?.trim()) || 'this person';
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<{ message: string; code: string } | null>(null);
  const [formData, setFormData] = useState({
    vouch_type: 'character',
    relationship: 'friend',
    known_years: 1,
    message: '',
  });

  const handleOpenModal = async () => {
    // Pre-check eligibility before showing the form — better UX than failing at submit
    setEligibilityLoading(true);
    setEligibilityError(null);
    try {
      const res = await fetch('/api/vouches/eligibility');
      const data = await res.json();
      if (!data.eligible) {
        setEligibilityError({ message: data.reason, code: data.code });
        setShowModal(true); // Open modal in blocked state to show clear explanation
        return;
      }
    } catch {
      // Non-blocking — let server validation catch it at submit if this fails
    } finally {
      setEligibilityLoading(false);
    }
    setShowModal(true);
  };

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
      } else if (data?.vouching_blocked) {
        // Eligibility gate fired at server — update UI state
        setEligibilityError({ message: data.error, code: data.code || 'vouching_locked' });
      } else if (data?.error?.toLowerCase().includes('already vouched')) {
        // Duplicate vouch — show in modal
        setEligibilityError({ message: data.error, code: 'already_vouched' });
      } else {
        alert(data?.error || 'Failed to create vouch');
      }
    } catch (error) {
      log.error('Error creating vouch:', error);
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
        onClick={handleOpenModal}
        disabled={eligibilityLoading}
        className={className}
      >
        <UserPlus className="w-4 h-4 mr-2" />
        {eligibilityLoading ? 'Checking…' : `Vouch for ${displayName.split(' ')[0]}`}
      </Button>

      {showModal && typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop — portal to body + z-[9999] so modal always above navbar */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setShowModal(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Centered modal — not full screen */}
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl p-4 sm:p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-green-500" />
                <div>
                  <div className="text-base font-bold text-neutral-900 dark:text-white">
                    Vouch for {displayName}
                  </div>
                  <div className="text-[12px] text-neutral-500 dark:text-neutral-400">
                    Only vouch for people you truly trust.
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="mt-3 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-3">
              <div className="flex items-start gap-2 text-[13px] text-amber-900 dark:text-amber-200">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                By vouching, you’re putting your reputation on the line. If they default, your trust score drops and your vouching ability may be suspended.
              </div>
            </div>

            {/* Eligibility error */}
            {eligibilityError && (
              <div className="mt-3 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">
                    {eligibilityError.code === 'account_too_new' ? '⏳' :
                     eligibilityError.code === 'profile_incomplete' ? '👤' :
                     eligibilityError.code === 'already_vouched' ? '✓' : '🔒'}
                  </span>
                  <div>
                    <p className="font-bold text-red-700 dark:text-red-300 text-sm mb-1">
                      {eligibilityError.code === 'account_too_new' ? 'Account too new to vouch' :
                       eligibilityError.code === 'profile_incomplete' ? 'Complete your profile first' :
                       eligibilityError.code === 'already_vouched' ? 'Already vouched' :
                       'Vouching suspended'}
                    </p>
                    <p className="text-red-600 dark:text-red-400 text-xs leading-relaxed">{eligibilityError.message}</p>
                    {eligibilityError.code === 'account_too_new' && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">Your account must be at least 7 days old to vouch.</p>
                    )}
                    {eligibilityError.code === 'profile_incomplete' && (
                      <a href="/settings" className="inline-block mt-2 text-xs font-semibold text-red-700 dark:text-red-300 underline">Go to settings →</a>
                    )}
                    {eligibilityError.code === 'vouching_locked' && (
                      <a href="/vouch/requests" className="inline-block mt-2 text-xs font-semibold text-red-700 dark:text-red-300 underline">View my vouching record →</a>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Relationship
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full px-3 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
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
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Known for
                </label>
                <select
                  value={formData.known_years}
                  onChange={(e) => setFormData({ ...formData, known_years: Number(e.target.value) })}
                  className="w-full px-3 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white"
                >
                  <option value={1}>Less than 1 year</option>
                  <option value={2}>1–2 years</option>
                  <option value={5}>3–5 years</option>
                  <option value={10}>5–10 years</option>
                  <option value={15}>10+ years</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Message (optional)
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Why do you trust this person?"
                  rows={3}
                  className="w-full px-3 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setShowModal(false)} className="rounded-2xl">
                  Cancel
                </Button>
                <Button
                  onClick={handleVouch}
                  disabled={loading || !!eligibilityError}
                  className="rounded-2xl bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? 'Creating…' : 'Create vouch'}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
