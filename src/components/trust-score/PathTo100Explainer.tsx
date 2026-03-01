'use client';

import React, { useState } from 'react';
import {
  Target,
  CreditCard,
  CheckCircle,
  Users,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

const PATH_ITEMS = [
  {
    icon: CreditCard,
    label: 'Payment',
    weight: '40%',
    summary: 'On-time and early payments, plus streaks.',
    toMax: 'Pay on time or early. Streaks of 5, 10, 25+ on-time payments add bonus points. Avoid late or missed payments.',
  },
  {
    icon: CheckCircle,
    label: 'Completion',
    weight: '25%',
    summary: 'Successfully repaid loans vs defaults.',
    toMax: 'Complete loans without defaulting. The more you repay (e.g. 8–10+ loans, 0 defaults), the higher this component. One default hurts; many completions build it up.',
  },
  {
    icon: Users,
    label: 'Social',
    weight: '15%',
    summary: 'Vouches you receive + your vouching track record.',
    toMax: 'Receive strong vouches (e.g. 5+ with high strength, or enough so total boost ≥ 50) and, if you vouch for others, have 7+ of your vouchees complete loans with 0 defaults to max both sides of social.',
  },
  {
    icon: Shield,
    label: 'Verification',
    weight: '10%',
    summary: 'ID, bank, phone, and other checks.',
    toMax: 'Complete verification steps (e.g. identity, bank connection, phone). Each step adds points toward the verification component.',
  },
  {
    icon: Clock,
    label: 'Tenure',
    weight: '10%',
    summary: 'How long you’ve been on the platform.',
    toMax: 'Time on platform. New accounts start around 50; the score grows with months of activity (e.g. 6+ months for a solid tenure score).',
  },
];

interface PathTo100ExplainerProps {
  /** Compact: single expandable block. Full: always expanded, e.g. for a dedicated page. */
  variant?: 'compact' | 'full';
  className?: string;
}

export function PathTo100Explainer({ variant = 'compact', className = '' }: PathTo100ExplainerProps) {
  const [expanded, setExpanded] = useState(variant === 'full');

  const content = (
    <div className="space-y-3">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Your trust score is the weighted average of five areas. To reach 100, each area needs to be strong — there’s no single shortcut.
      </p>
      <ul className="space-y-3">
        {PATH_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <li
              key={item.label}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">{item.label}</span>
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">({item.weight})</span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-neutral-600 dark:text-neutral-400">{item.summary}</p>
                  <p className="mt-1.5 text-[12px] text-neutral-700 dark:text-neutral-300 font-medium">How to max it:</p>
                  <p className="text-[12px] text-neutral-600 dark:text-neutral-400">{item.toMax}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );

  if (variant === 'full') {
    return (
      <div className={`rounded-2xl border border-primary-200 dark:border-primary-800 bg-gradient-to-br from-primary-50/50 to-transparent dark:from-primary-900/10 dark:to-transparent p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Path to 100</h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">What it takes to reach a full trust score</p>
          </div>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10 overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          <span className="text-sm font-semibold text-neutral-900 dark:text-white">Path to 100</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
      </button>
      {expanded ? <div className="px-3 pb-3 pt-0">{content}</div> : null}
    </div>
  );
}
