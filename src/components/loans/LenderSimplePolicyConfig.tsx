'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('LenderSimplePolicyConfig');

import React, { useEffect, useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { Shield, Loader2, CheckCircle, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';

interface TierPolicy {
  tier_id: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4';
  interest_rate: number;
  max_loan_amount: number;
  is_active: boolean;
}

const TIER_META = [
  {
    id: 'tier_1' as const,
    name: 'Tier 1 — Low Trust',
    desc: '0–2 vouches',
    color: 'border-neutral-200 dark:border-neutral-700',
    activeBg: 'bg-neutral-50 dark:bg-neutral-900/40',
  },
  {
    id: 'tier_2' as const,
    name: 'Tier 2 — Building Trust',
    desc: '3–5 vouches',
    color: 'border-amber-200 dark:border-amber-800/50',
    activeBg: 'bg-amber-50/60 dark:bg-amber-900/10',
  },
  {
    id: 'tier_3' as const,
    name: 'Tier 3 — Established Trust',
    desc: '6–10 vouches',
    color: 'border-emerald-200 dark:border-emerald-800/50',
    activeBg: 'bg-emerald-50/60 dark:bg-emerald-900/10',
  },
  {
    id: 'tier_4' as const,
    name: 'Tier 4 — High Trust',
    desc: '11+ vouches',
    color: 'border-blue-200 dark:border-blue-800/50',
    activeBg: 'bg-blue-50/60 dark:bg-blue-900/10',
  },
];

const DEFAULT_POLICIES: TierPolicy[] = TIER_META.map((t) => ({
  tier_id: t.id,
  interest_rate: 10,
  max_loan_amount: 500,
  is_active: true,
}));

export function LenderSimplePolicyConfig() {
  const [policies, setPolicies] = useState<TierPolicy[]>(DEFAULT_POLICIES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/lender/tier-policies')
      .then((r) => r.json())
      .then((d) => {
        if (d.policies && d.policies.length > 0) {
          // Merge fetched policies into defaults (handles missing tiers gracefully)
          const merged = DEFAULT_POLICIES.map((def) => {
            const fetched = d.policies.find((p: TierPolicy) => p.tier_id === def.tier_id);
            return fetched
              ? {
                  tier_id: def.tier_id,
                  interest_rate: fetched.interest_rate,
                  max_loan_amount: fetched.max_loan_amount,
                  is_active: fetched.is_active,
                }
              : def;
          });
          setPolicies(merged);
        }
      })
      .catch((e) => log.error('[LenderSimplePolicyConfig]', e))
      .finally(() => setLoading(false));
  }, []);

  function update(tierId: string, field: keyof TierPolicy, value: number | boolean) {
    setPolicies((prev) =>
      prev.map((p) => (p.tier_id === tierId ? { ...p, [field]: value } : p))
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch('/api/lender/tier-policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policies),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Failed to save policies.');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-2xl bg-neutral-100 dark:bg-neutral-900 grid place-items-center border border-black/5 dark:border-white/5">
          <Shield className="w-4 h-4 text-neutral-700 dark:text-neutral-200" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            Trust Tier Policies
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Set your rate and max amount per borrower trust tier
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {TIER_META.map((meta) => {
          const policy = policies.find((p) => p.tier_id === meta.id)!;
          return (
            <div
              key={meta.id}
              className={`rounded-2xl border p-4 transition-all ${
                policy.is_active ? `${meta.color} ${meta.activeBg}` : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/20 opacity-60'
              }`}
            >
              {/* Tier header + toggle */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {meta.name}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {meta.desc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => update(meta.id, 'is_active', !policy.is_active)}
                  className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300"
                  aria-label={policy.is_active ? 'Disable tier' : 'Enable tier'}
                >
                  {policy.is_active ? (
                    <ToggleRight className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-neutral-400" />
                  )}
                  <span>{policy.is_active ? 'Active' : 'Off'}</span>
                </button>
              </div>

              {policy.is_active && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                      Interest rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={policy.interest_rate}
                      onChange={(e) =>
                        update(meta.id, 'interest_rate', parseFloat(e.target.value) || 0)
                      }
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                      Max amount ($)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="50"
                      value={policy.max_loan_amount}
                      onChange={(e) =>
                        update(meta.id, 'max_loan_amount', parseInt(e.target.value) || 0)
                      }
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Tier policies saved successfully.
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          Save tier policies
        </Button>
      </div>
    </div>
  );
}
