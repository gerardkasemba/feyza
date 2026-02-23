'use client';

import React, { useState } from 'react';
import { Shield, Users, TrendingUp, ChevronDown, ChevronUp, Zap, Award, Lock } from 'lucide-react';

const TIERS = [
  {
    id: 'tier_1',
    label: 'Tier 1',
    name: 'Low Trust',
    vouches: '0 – 2 vouches',
    color: 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600',
    badge: 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300',
    dot: 'bg-neutral-400',
    example: 'Tight limits, higher rate — they\'re proving themselves',
  },
  {
    id: 'tier_2',
    label: 'Tier 2',
    name: 'Building Trust',
    vouches: '3 – 5 vouches',
    color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-400',
    example: 'Moderate limits — community is starting to trust them',
  },
  {
    id: 'tier_3',
    label: 'Tier 3',
    name: 'Established Trust',
    vouches: '6 – 10 vouches',
    color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    example: 'Higher limits, better rate — consistently vouched for',
  },
  {
    id: 'tier_4',
    label: 'Tier 4',
    name: 'High Trust',
    vouches: '11+ vouches',
    color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
    example: 'Your best terms — their social graph is their credit score',
  },
];

interface TrustTierExplainerProps {
  /** Whether to show the full explainer or just the collapsed teaser */
  defaultExpanded?: boolean;
}

export function TrustTierExplainer({ defaultExpanded = false }: TrustTierExplainerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-2xl border border-primary-200 dark:border-primary-800 bg-gradient-to-br from-primary-50 to-emerald-50 dark:from-primary-900/20 dark:to-emerald-900/20 overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="font-semibold text-primary-900 dark:text-primary-100 text-sm">
              What are Trust Tiers?
            </p>
            <p className="text-xs text-primary-700 dark:text-primary-300 mt-0.5">
              Feyza's vouch-based borrower scoring — your edge over every other lender
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 ml-3">
          {expanded
            ? <ChevronUp className="w-4 h-4 text-primary-500" />
            : <ChevronDown className="w-4 h-4 text-primary-500" />}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 pb-6 space-y-6 border-t border-primary-200 dark:border-primary-800 pt-4">

          {/* The moat pitch */}
          <div className="grid md:grid-cols-3 gap-3">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/60 dark:bg-neutral-900/40 border border-white/80 dark:border-neutral-700/50">
              <Users className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">Social credit score</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  A borrower's tier is determined by how many people in their real-world network have
                  personally vouched for them — not an algorithm, not a credit bureau.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/60 dark:bg-neutral-900/40 border border-white/80 dark:border-neutral-700/50">
              <Lock className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">Skin in the game</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Vouchers put their own reputation on the line. A default harms the voucher's standing too —
                  creating strong incentives for borrowers to repay.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/60 dark:bg-neutral-900/40 border border-white/80 dark:border-neutral-700/50">
              <TrendingUp className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">Reward loyalty</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  As borrowers earn more vouches their tier rises, unlocking better rates and limits from you
                  automatically — incentivising long-term behaviour.
                </p>
              </div>
            </div>
          </div>

          {/* How tiers work */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
              The 4 tiers
            </p>
            <div className="space-y-2">
              {TIERS.map((tier) => (
                <div
                  key={tier.id}
                  className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${tier.color}`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${tier.dot}`} />
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${tier.badge}`}>
                      {tier.label}
                    </span>
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 flex-shrink-0">
                      {tier.name}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0 hidden sm:block">
                      · {tier.vouches}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 text-right hidden md:block flex-shrink-0 max-w-[200px]">
                    {tier.example}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* How to set your policies */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-100/60 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700">
            <Zap className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
                Set your rates and limits below
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                For each tier you choose an interest rate and a maximum loan amount.
                When a borrower applies, Feyza automatically matches them to your policy for their current tier.
                You can disable any tier you don't want to lend to — e.g. disable Tier 1 to only accept
                borrowers with at least 3 vouches.
              </p>
            </div>
          </div>

          {/* Why it's your moat */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white/60 dark:bg-neutral-900/40 border border-amber-200 dark:border-amber-700">
            <Award className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
                Why this beats a credit score
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Credit bureaus are backward-looking, easily gamed, and opaque. A trust tier is
                forward-looking — it reflects who is willing to put their name behind a borrower
                right now. The more your borrowers build their social network on Feyza, the better
                the signal you get, and the smarter your pricing becomes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
