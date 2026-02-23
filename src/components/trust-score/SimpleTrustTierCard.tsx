'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Badge } from '@/components/ui';
import { Users, ChevronRight, Loader2, ArrowUp } from 'lucide-react';

interface SimpleTrustTier {
  tier: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4';
  tierNumber: number;
  tierName: string;
  vouchCount: number;
  nextTierVouches: number;
}

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
    bg: 'bg-neutral-50 dark:bg-neutral-900/40',
    border: 'border-neutral-200 dark:border-neutral-700',
    badge: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300',
    badgeText: 'Low Trust',
    dot: 'bg-neutral-400',
    progress: 'bg-neutral-400',
    label: 'Small amounts · Higher rates',
  },
  tier_2: {
    bg: 'bg-amber-50/60 dark:bg-amber-900/10',
    border: 'border-amber-200 dark:border-amber-800/50',
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    badgeText: 'Building Trust',
    dot: 'bg-amber-500',
    progress: 'bg-amber-500',
    label: 'Moderate amounts · Better rates',
  },
  tier_3: {
    bg: 'bg-emerald-50/60 dark:bg-emerald-900/10',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    badgeText: 'Established Trust',
    dot: 'bg-emerald-500',
    progress: 'bg-emerald-500',
    label: 'Higher amounts · Good rates',
  },
  tier_4: {
    bg: 'bg-blue-50/60 dark:bg-blue-900/10',
    border: 'border-blue-200 dark:border-blue-800/50',
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    badgeText: 'High Trust',
    dot: 'bg-blue-500',
    progress: 'bg-blue-500',
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

  useEffect(() => {
    fetch('/api/trust/tier')
      .then((r) => r.json())
      .then((d) => setTier(d.tier ?? null))
      .catch((e) => console.error('[SimpleTrustTierCard]', e))
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
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Trust Tier
              </p>
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
    </Card>
  );
}
