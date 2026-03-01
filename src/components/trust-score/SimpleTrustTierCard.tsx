'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('SimpleTrustTierCard');

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Modal } from '@/components/ui';
import { Users, ChevronRight, Loader2, ArrowUp, HelpCircle } from 'lucide-react';

interface SimpleTrustTier {
  tier: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4';
  tierNumber: number;
  tierName: string;
  vouchCount: number;
  nextTierVouches: number;
}

// Indicative colors aligned with trust score: tier_1 = lowest (red), tier_4 = highest (green)
const TIER_CONFIG: Record<
  string,
  {
    bg: string;
    border: string;
    badge: string;
    badgeText: string;
    dot: string;
    progress: string;
    label: string;
  }
> = {
  tier_1: {
    bg: 'bg-red-50/60 dark:bg-red-900/10',
    border: 'border-red-200 dark:border-red-800/50',
    badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    badgeText: 'Low Trust',
    dot: 'bg-red-500',
    progress: 'bg-red-500',
    label: 'Small amounts · Higher rates',
  },
  tier_2: {
    bg: 'bg-orange-50/60 dark:bg-orange-900/10',
    border: 'border-orange-200 dark:border-orange-800/50',
    badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    badgeText: 'Building Trust',
    dot: 'bg-orange-500',
    progress: 'bg-orange-500',
    label: 'Moderate amounts · Better rates',
  },
  tier_3: {
    bg: 'bg-blue-50/60 dark:bg-blue-900/10',
    border: 'border-blue-200 dark:border-blue-800/50',
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    badgeText: 'Established Trust',
    dot: 'bg-blue-500',
    progress: 'bg-blue-500',
    label: 'Higher amounts · Good rates',
  },
  tier_4: {
    bg: 'bg-emerald-50/60 dark:bg-emerald-900/10',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    badgeText: 'High Trust',
    dot: 'bg-emerald-500',
    progress: 'bg-emerald-500',
    label: 'Max amounts · Best rates',
  },
};

// Progress of vouches within the current tier
function tierProgress(tier: SimpleTrustTier): number {
  const { vouchCount } = tier;
  if (tier.tier === 'tier_4') return 100;
  if (tier.tier === 'tier_3') return Math.round(((vouchCount - 6) / 5) * 100);
  if (tier.tier === 'tier_2') return Math.round(((vouchCount - 3) / 3) * 100);
  return Math.round((vouchCount / 3) * 100);
}

export function SimpleTrustTierCard({ className = '' }: { className?: string }) {
  const [tier, setTier] = useState<SimpleTrustTier | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTierModal, setShowTierModal] = useState(false);

  useEffect(() => {
    fetch('/api/trust/tier')
      .then((r) => r.json())
      .then((d) => setTier(d.tier ?? null))
      .catch((e) => log.error('[SimpleTrustTierCard]', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className={`rounded-2xl border ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
        </div>
      </Card>
    );
  }

  if (!tier) return null;

  const cfg = TIER_CONFIG[tier.tier] ?? TIER_CONFIG.tier_1;
  const progress = tierProgress(tier);

  return (
    <Card
      className={`rounded-2xl border ${cfg.border} ${cfg.bg} ${className}`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/70 dark:bg-neutral-900/50 grid place-items-center border border-black/5 dark:border-white/5">
              <Users className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Trust Tier
                </p>
                <button
                  type="button"
                  onClick={() => setShowTierModal(true)}
                  className="p-0.5 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  aria-label="Learn about Trust Tiers"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                {cfg.badgeText}
              </p>
            </div>
          </div>

          {/* Tier number badge */}
          <span
            className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-sm font-black ${cfg.badge}`}
          >
            {tier.tierNumber}
          </span>
        </div>

        {/* Vouch count */}
        <div className="mb-3">
          <div className="flex items-end justify-between mb-1.5">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {tier.vouchCount} vouch{tier.vouchCount !== 1 ? 'es' : ''}
            </span>
            {tier.tier !== 'tier_4' && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {tier.nextTierVouches} more to Tier {tier.tierNumber + 1}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${cfg.progress}`}
              style={{ width: `${Math.min(100, Math.max(4, progress))}%` }}
            />
          </div>
        </div>

        {/* Perks label */}
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-3">
          {cfg.label}
        </p>

        {/* CTA */}
        <Link
          href="/vouch/requests"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/60 dark:bg-neutral-900/50 border border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-neutral-900 transition"
        >
          <div className="flex items-center gap-2">
            <ArrowUp className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
              {tier.tier === 'tier_4' ? 'View your vouches' : 'Get more vouches'}
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        </Link>
      </div>

      <Modal isOpen={showTierModal} onClose={() => setShowTierModal(false)} title="About Trust Tiers" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Your Trust Tier is based on how many people have vouched for you on Feyza. Lenders use tiers to set rates and limits — higher tiers unlock better terms.
          </p>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">The 4 tiers</p>
            {Object.entries(TIER_CONFIG).map(([key, t]) => (
              <div
                key={key}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${t.border} ${t.bg}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.dot}`} />
                <div className="min-w-0 flex-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.badge}`}>{t.badgeText}</span>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 ml-2">{t.label}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Get more vouches from people who know you to move up. Vouchers put their reputation on the line — if you default, their standing is affected too.
          </p>
        </div>
      </Modal>
    </Card>
  );
}
