'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Badge } from '@/components/ui';
import { Navbar, Footer } from '@/components/layout';
import { VouchRequestCard } from '@/components/trust-score/VouchRequestCard';
import { VouchButton } from '@/components/trust-score/TrustScoreComponents';
import { Award, UserPlus, Loader2, Inbox, UserCheck, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

interface VouchRequest {
  id: string;
  status: string;
  message: string;
  suggested_relationship: string;
  created_at: string;
  requested_email?: string;
  requester?: { id: string; full_name: string };
}

interface Vouch {
  id: string;
  vouch_type: string;
  relationship: string;
  vouch_strength: number;
  trust_score_boost: number;
  status: string;
  created_at: string;
  voucher?: { id: string; full_name: string };
  vouchee?: { id: string; full_name: string };
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
}

// ── Vouch strength helpers ──────────────────────────────────────────────
function getStrengthMeta(strength: number) {
  if (strength >= 9) return { label: 'Exceptional', color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-300', bar: 'bg-emerald-500' };
  if (strength >= 7) return { label: 'Strong',       color: 'text-green-600',   bg: 'bg-green-100',   border: 'border-green-300',   bar: 'bg-green-500' };
  if (strength >= 5) return { label: 'Solid',        color: 'text-blue-600',    bg: 'bg-blue-100',    border: 'border-blue-300',    bar: 'bg-blue-500' };
  if (strength >= 3) return { label: 'Moderate',     color: 'text-amber-600',   bg: 'bg-amber-100',   border: 'border-amber-300',   bar: 'bg-amber-500' };
  return                    { label: 'Light',         color: 'text-neutral-500', bg: 'bg-neutral-100', border: 'border-neutral-300', bar: 'bg-neutral-400' };
}

function getMyVouchingPower(tier: string) {
  const map: Record<string, { power: number; label: string; desc: string; color: string }> = {
    tier_1: { power: 2,  label: 'Basic',       desc: 'Your vouches give a baseline trust boost',                color: 'text-neutral-600' },
    tier_2: { power: 4,  label: 'Building',     desc: 'Your vouches carry moderate weight with lenders',        color: 'text-amber-600' },
    tier_3: { power: 7,  label: 'Established',  desc: 'Your vouches give a strong trust signal to lenders',     color: 'text-emerald-600' },
    tier_4: { power: 10, label: 'High Power',    desc: 'Your vouches are the most valuable signal on Feyza',    color: 'text-blue-600' },
  };
  return map[tier] ?? map['tier_1'];
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */

export default function VouchRequestsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const [incomingRequests, setIncomingRequests] = useState<VouchRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<VouchRequest[]>([]);
  const [vouchesReceived, setVouchesReceived] = useState<Vouch[]>([]);
  const [vouchesGiven, setVouchesGiven] = useState<Vouch[]>([]);

  // Removed "Send Requests" tab per request
  const [activeTab, setActiveTab] = useState<'incoming' | 'received' | 'given'>('incoming');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/auth/signin?redirect=/vouch/requests');
        return;
      }

      setUser(authUser);

      // Fetch user profile (includes trust_tier for vouching power + accountability data)
      const { data: profile } = await supabase
        .from('users')
        .select('trust_tier, vouch_count, full_name, vouching_locked, vouching_locked_reason, vouching_locked_at, active_vouchee_defaults, vouching_success_rate, vouches_given_total, vouches_resulted_default, vouches_resulted_complete')
        .eq('id', authUser.id)
        .single();
      setUserProfile(profile);

      const [incoming, outgoing, received, given] = await Promise.all([
        supabase
          .from('vouch_requests')
          .select('id, status, message, suggested_relationship, created_at, requester:users!requester_id(id, full_name)')
          .eq('requested_user_id', authUser.id)
          .order('created_at', { ascending: false }),

        // still fetched (useful for counters / future screens), but not shown as a tab
        supabase
          .from('vouch_requests')
          .select('id, status, message, suggested_relationship, created_at, requested_email')
          .eq('requester_id', authUser.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('vouches')
          .select(
            'id, vouch_type, relationship, vouch_strength, trust_score_boost, status, created_at, voucher:users!voucher_id(id, full_name)'
          )
          .eq('vouchee_id', authUser.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('vouches')
          .select(
            'id, vouch_type, relationship, vouch_strength, trust_score_boost, status, created_at, vouchee:users!vouchee_id(id, full_name)'
          )
          .eq('voucher_id', authUser.id)
          .order('created_at', { ascending: false }),
      ]);

      setIncomingRequests((incoming.data ?? []) as unknown as VouchRequest[]);
      setOutgoingRequests((outgoing.data ?? []) as unknown as VouchRequest[]);
      setVouchesReceived((received.data ?? []) as unknown as Vouch[]);
      setVouchesGiven((given.data ?? []) as unknown as Vouch[]);

      setLoading(false);
    })();
  }, [router]);

  const pendingIncoming = incomingRequests.filter((r) => r.status === 'pending');

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
        <Footer />
      </>
    );
  }

  const tabs = [
    { key: 'incoming' as const, label: 'Incoming', icon: Inbox, count: pendingIncoming.length },
    { key: 'received' as const, label: 'Received', icon: Award, count: vouchesReceived.length },
    { key: 'given' as const, label: 'Given', icon: UserCheck, count: vouchesGiven.length },
  ];

  return (
    <>
      <Navbar />

      {/* ✅ Key fix:
          - make page a flex column so Footer is always below
          - make History panel scroll in its own area, not into footer
      */}
      <div className="min-h-[100dvh] bg-neutral-50 dark:bg-neutral-900 flex flex-col">
        {/* MAIN */}
        <div className="flex-1">
          <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 py-4 sm:py-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                  <Award className="w-7 h-7 sm:w-8 sm:h-8 text-primary-500" />
                  Vouches &amp; Requests
                </h1>
                <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 mt-1">
                  Manage your vouch requests and see who trusts you
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Back
                  </Button>
                </Link>
              </div>
            </div>

            {/* Pending alert */}
            {pendingIncoming.length > 0 && (
              <div className="mt-5 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Inbox className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-primary-900 dark:text-primary-100 truncate">
                      {pendingIncoming.length} pending vouch request{pendingIncoming.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-primary-700 dark:text-primary-300 truncate">
                      Review and respond to help build trust
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => setActiveTab('incoming')}
                  className="bg-primary-600 hover:bg-primary-700 flex-shrink-0"
                >
                  Review
                </Button>
              </div>
            )}

            {/* Main layout */}
            <div className="mt-5 grid gap-5 lg:grid-cols-12">
              {/* History (scrolling panel) */}
              <div className="lg:col-span-7 order-1">
                <div className="lg:sticky lg:top-4">
                  <div className="rounded-2xl overflow-hidden border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900">
                    {/* Tabs (sticky inside panel) */}
                    <div className="sticky top-0 z-10 px-3 sm:px-4 py-3 bg-white/95 dark:bg-neutral-900/85 backdrop-blur border-b border-neutral-200/60 dark:border-neutral-800/60">
                      <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        {tabs.map((tab) => (
                          <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-colors ${
                              activeTab === tab.key
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700'
                            }`}
                          >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {tab.count > 0 && (
                              <span
                                className={`px-1.5 py-0.5 rounded-full text-xs ${
                                  activeTab === tab.key
                                    ? 'bg-white/25 text-white'
                                    : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                }`}
                              >
                                {tab.count}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ✅ Scroll area (prevents overlapping footer) */}
                    <div className="max-h-[calc(100dvh-220px)] overflow-y-auto p-4 sm:p-5 pb-24">
                      {/* Incoming */}
                      {activeTab === 'incoming' && (
                        <div className="space-y-3">
                          {incomingRequests.length === 0 ? (
                            <div className="text-center py-10">
                              <Inbox className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                              <p className="text-neutral-500 dark:text-neutral-400">No incoming vouch requests</p>
                              <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                                When someone requests a vouch from you, it appears here
                              </p>
                            </div>
                          ) : (
                            incomingRequests.map((req) => (
                              <div
                                key={req.id}
                                className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold flex-shrink-0">
                                      {(req.requester as any)?.full_name?.charAt(0) ?? '?'}
                                    </div>

                                    <div className="min-w-0">
                                      <p className="font-medium text-neutral-900 dark:text-white truncate">
                                        {(req.requester as any)?.full_name ?? 'Unknown'}
                                      </p>
                                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        {formatDate(req.created_at)}
                                      </p>

                                      {req.message && (
                                        <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2 break-words">
                                          <span className="text-neutral-400 dark:text-neutral-500 italic">“</span>
                                          {req.message}
                                          <span className="text-neutral-400 dark:text-neutral-500 italic">”</span>
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <Badge
                                      variant={
                                        req.status === 'pending'
                                          ? 'warning'
                                          : req.status === 'accepted'
                                            ? 'success'
                                            : 'default'
                                      }
                                    >
                                      {req.status}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="mt-3 flex items-center justify-end gap-2 flex-wrap">
                                  {req.status === 'pending' && (req.requester as any)?.id && (
                                    <VouchButton
                                      targetUserId={(req.requester as any).id}
                                      targetName={(req.requester as any).full_name}
                                    />
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Received - UPDATED with strength bars */}
                      {activeTab === 'received' && (
                        <div className="space-y-3">
                          {vouchesReceived.length === 0 ? (
                            <div className="text-center py-10">
                              <Award className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                              <p className="text-neutral-500 dark:text-neutral-400">No vouches received yet</p>
                              <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                                Ask friends and family to vouch for you
                              </p>
                            </div>
                          ) : (
                            vouchesReceived.map((v) => {
                              const strength = v.vouch_strength ?? 0;
                              const meta = getStrengthMeta(strength);
                              const barPct = Math.round(strength * 10);
                              return (
                                <div
                                  key={v.id}
                                  className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                        {(v.voucher as any)?.full_name?.charAt(0) ?? '?'}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-medium text-neutral-900 dark:text-white truncate">
                                          {(v.voucher as any)?.full_name ?? 'Unknown'}
                                        </p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                                          {v.relationship} · {v.vouch_type}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="text-right flex-shrink-0">
                                      <Badge variant="success">+{v.trust_score_boost} pts</Badge>
                                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                        {formatDate(v.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Strength bar */}
                                  <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Vouch Strength</span>
                                      <span className={`text-xs font-bold ${meta.color}`}>{meta.label} — {strength}/10</span>
                                    </div>
                                    <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full transition-all ${meta.bar}`} style={{ width: `${barPct}%` }} />
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* Given - UPDATED with Vouching Accountability Dashboard */}
                      {activeTab === 'given' && (
                        <div className="space-y-3">
                          {/* Vouching Accountability Dashboard */}
                          {userProfile && (() => {
                            const power = getMyVouchingPower(userProfile.trust_tier || 'tier_1');
                            const tierNum = { tier_1: 1, tier_2: 2, tier_3: 3, tier_4: 4 }[userProfile.trust_tier as string] ?? 1;
                            const barPct = Math.round(power.power * 10);
                            const successRate: number = userProfile.vouching_success_rate ?? 100;
                            const isLocked: boolean = userProfile.vouching_locked ?? false;
                            const activeDefaults: number = userProfile.active_vouchee_defaults ?? 0;
                            const totalGiven: number = userProfile.vouches_given_total ?? 0;
                            const totalCompleted: number = userProfile.vouches_resulted_complete ?? 0;
                            const totalDefaulted: number = userProfile.vouches_resulted_default ?? 0;

                            const successRateColor =
                              successRate >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                              successRate >= 70 ? 'text-green-600 dark:text-green-400' :
                              successRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

                            const successRateBarColor =
                              successRate >= 90 ? 'bg-emerald-500' :
                              successRate >= 70 ? 'bg-green-500' :
                              successRate >= 50 ? 'bg-amber-500' : 'bg-red-500';

                            return (
                              <div className="space-y-3">
                                {/* Lock banner — shown only when locked */}
                                {isLocked && (
                                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-2xl">
                                    <div className="flex items-start gap-3">
                                      <span className="text-2xl shrink-0">🔒</span>
                                      <div>
                                        <p className="font-bold text-red-700 dark:text-red-300 text-sm">Vouching Suspended</p>
                                        <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                                          {userProfile.vouching_locked_reason ||
                                            `You have ${activeDefaults} people in default. Resolve their debts to restore your vouching ability.`}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Warning — close to lock threshold */}
                                {!isLocked && activeDefaults >= 1 && (
                                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-2xl">
                                    <div className="flex items-start gap-3">
                                      <span className="text-xl shrink-0">⚠️</span>
                                      <div>
                                        <p className="font-bold text-amber-700 dark:text-amber-300 text-sm">
                                          {activeDefaults} active vouchee default — 1 more suspends vouching
                                        </p>
                                        <p className="text-amber-600 dark:text-amber-400 text-xs mt-0.5">
                                          Be selective. Only vouch for people you truly trust with money.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Main dashboard card */}
                                <div className="p-4 bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-primary-900/20 dark:to-indigo-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl">
                                  <p className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wide mb-3">Your Vouching Profile</p>

                                  {/* Two-column layout: power + success rate */}
                                  <div className="grid grid-cols-2 gap-3 mb-3">
                                    {/* Vouching Power */}
                                    <div className="bg-white/70 dark:bg-neutral-800/50 rounded-lg p-3">
                                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Vouching Power</p>
                                      <p className={`text-xl font-black ${power.color}`}>{power.power}<span className="text-sm font-normal text-neutral-400">/10</span></p>
                                      <p className={`text-xs font-semibold ${power.color}`}>{power.label} · Tier {tierNum}</p>
                                      <div className="mt-2 h-1.5 bg-primary-200 dark:bg-primary-900 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-primary-500 to-indigo-600 rounded-full" style={{ width: `${barPct}%` }} />
                                      </div>
                                    </div>

                                    {/* Success Rate */}
                                    <div className="bg-white/70 dark:bg-neutral-800/50 rounded-lg p-3">
                                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Success Rate</p>
                                      <p className={`text-xl font-black ${successRateColor}`}>{successRate.toFixed(0)}<span className="text-sm font-normal text-neutral-400">%</span></p>
                                      <p className="text-xs text-neutral-400">
                                        {totalGiven === 0 ? 'No vouches yet' : `${totalCompleted} completed · ${totalDefaulted} defaulted`}
                                      </p>
                                      <div className="mt-2 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${successRateBarColor}`} style={{ width: `${successRate}%` }} />
                                      </div>
                                    </div>
                                  </div>

                                  {/* What success rate affects */}
                                  <div className="bg-white/50 dark:bg-neutral-800/30 rounded-lg px-3 py-2">
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                      {successRate >= 90
                                        ? '✅ Your track record is excellent — your vouches carry full weight with lenders.'
                                        : successRate >= 70
                                        ? '📊 Good track record. A few more successful outcomes will restore full vouch power.'
                                        : successRate >= 50
                                        ? '⚠️ Your vouch weight is reduced. Help your vouchees repay to rebuild your record.'
                                        : '🔴 Your vouching track record is poor. Future vouches carry significantly less weight.'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {vouchesGiven.length === 0 ? (
                            <div className="text-center py-10">
                              <UserPlus className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                              <p className="text-neutral-500 dark:text-neutral-400">
                                You haven&apos;t vouched for anyone yet
                              </p>
                              <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                                Search for someone below to vouch
                              </p>
                            </div>
                          ) : (
                            vouchesGiven.map((v) => {
                              const strength = v.vouch_strength ?? 0;
                              const meta = getStrengthMeta(strength);
                              const barPct = Math.round(strength * 10);
                              return (
                                <div
                                  key={v.id}
                                  className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                        {(v.vouchee as any)?.full_name?.charAt(0) ?? '?'}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-medium text-neutral-900 dark:text-white truncate">
                                          {(v.vouchee as any)?.full_name ?? 'Unknown'}
                                        </p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                                          {v.relationship} · {v.vouch_type}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="text-right flex-shrink-0">
                                      <Badge variant={v.status === 'active' ? 'success' : 'default'}>{v.status}</Badge>
                                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                        {formatDate(v.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Strength bar */}
                                  <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Strength of your vouch</span>
                                      <span className={`text-xs font-bold ${meta.color}`}>{meta.label} — {strength}/10</span>
                                    </div>
                                    <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full transition-all ${meta.bar}`} style={{ width: `${barPct}%` }} />
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* Optional info */}
                      {outgoingRequests.length > 0 && (
                        <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
                          You have {outgoingRequests.filter((r) => r.status === 'pending').length} pending sent request
                          {outgoingRequests.filter((r) => r.status === 'pending').length !== 1 ? 's' : ''}.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* VouchRequestCard */}
              <div className="lg:col-span-5 order-2">
                <div className="lg:sticky lg:top-4">
                  <div className="rounded-2xl overflow-hidden">
                    <VouchRequestCard />
                  </div>
                </div>
              </div>
            </div>

            <div className="h-10 sm:h-12" />
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}