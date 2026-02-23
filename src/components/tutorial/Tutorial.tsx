'use client';

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Shield,
  Users,
  DollarSign,
  CheckCircle,
  Building2,
  TrendingUp,
  Award,
  Play,
  ArrowRight,
  AlertTriangle,
  Zap,
  Lock,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  detail?: string;          // secondary sentence below description
  icon: React.ReactNode;
  iconBg?: string;          // tailwind gradient bg classes for icon
  target?: string;          // CSS selector for spotlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  tip?: string;
  tipIcon?: React.ReactNode;
}

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  startTutorial: (tutorialId: string) => void;
  endTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  hasSeenTutorial: (tutorialId: string) => boolean;
  resetTutorial: (tutorialId: string) => void;
}

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────

const TutorialContext = createContext<TutorialContextType | null>(null);

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used within TutorialProvider');
  return ctx;
}

// ─────────────────────────────────────────────────────────────
// Tutorial content — reflects the current Feyza system
// ─────────────────────────────────────────────────────────────

const DASHBOARD_TUTORIAL: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Feyza',
    description: "Feyza is a trust-based lending network. Your reputation unlocks better loans over time. This tour covers the key ideas in under 2 minutes.",
    icon: <Sparkles className="w-5 h-5" />,
    iconBg: 'from-green-500 to-emerald-600',
    position: 'center',
    tip: 'You can restart this tour anytime from your Settings page.',
    tipIcon: <Sparkles className="w-3.5 h-3.5" />,
  },
  {
    id: 'trust-tier',
    title: 'Your Trust Tier',
    description: "You start at Tier 1 (Low Trust) and climb to Tier 4 (High Trust) by collecting vouches. Your tier directly controls which business lenders will match with you and how much they offer.",
    detail: "Tier 1: Low Trust  \u00b7  Tier 2: Building Trust  \u00b7  Tier 3: Established Trust  \u00b7  Tier 4: High Trust",
    icon: <Shield className="w-5 h-5" />,
    iconBg: 'from-violet-500 to-purple-600',
    target: '[data-tutorial="trust-score"]',
    position: 'bottom',
    tip: 'Verifying your identity contributes to your tier alongside vouches.',
    tipIcon: <Zap className="w-3.5 h-3.5" />,
  },
  {
    id: 'vouches',
    title: 'Vouching & Vouch Strength',
    description: "Ask people you know to vouch for you. Each vouch has a strength from 1\u201310 based on the voucher\u2019s own tier, your relationship, and how long they\u2019ve known you.",
    detail: "A Tier 4 close friend vouching for you carries far more weight than a Tier 1 acquaintance.",
    icon: <Users className="w-5 h-5" />,
    iconBg: 'from-blue-500 to-cyan-600',
    target: '[data-tutorial="vouch-request"]',
    position: 'bottom',
    tip: 'Vouchers have real accountability \u2014 if you default, their scores are affected too.',
    tipIcon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  {
    id: 'vouch-accountability',
    title: 'Vouchers Have Skin in the Game',
    description: "When someone vouches for you, they\u2019re putting their reputation on the line. If you default, their vouch strength drops and their ability to vouch for others is restricted.",
    detail: "2\u202b or more active defaults among their vouchees temporarily locks their vouching ability \u2014 so people only back borrowers they genuinely trust.",
    icon: <Lock className="w-5 h-5" />,
    iconBg: 'from-amber-500 to-orange-500',
    position: 'center',
    tip: 'This is why lenders trust Feyza vouches more than a simple reference.',
    tipIcon: <Shield className="w-3.5 h-3.5" />,
  },
  {
    id: 'business-trust',
    title: 'Business Lender Relationships',
    description: "First-time borrowers from a business lender start at a lower limit. Complete 3 loans on time and you automatically graduate to their standard maximum \u2014 a private track record just between you two.",
    icon: <Building2 className="w-5 h-5" />,
    iconBg: 'from-green-500 to-teal-600',
    target: '[data-tutorial="business-trust"]',
    position: 'top',
    tip: 'Your trust tier determines which business lenders you can match with at all.',
    tipIcon: <TrendingUp className="w-3.5 h-3.5" />,
  },
  {
    id: 'loan-eligibility',
    title: 'The 75% Rule',
    description: "You can\u2019t request a new loan until you\u2019ve paid at least 75% of any current active loan. This keeps repayment on track and steadily builds your record.",
    detail: "Your loan page always shows exactly how much more you need to pay before you can apply again.",
    icon: <DollarSign className="w-5 h-5" />,
    iconBg: 'from-emerald-500 to-green-600',
    position: 'center',
  },
  {
    id: 'loans',
    title: 'Matching & Your Loans',
    description: "When you request a business loan, Feyza matches you with lenders whose tier policies fit your profile. They can auto-accept or manually review \u2014 you\u2019ll be notified either way.",
    icon: <Zap className="w-5 h-5" />,
    iconBg: 'from-yellow-500 to-amber-500',
    target: '[data-tutorial="loans-tabs"]',
    position: 'top',
    tip: 'Every on-time payment is logged. Early payments boost your standing even faster.',
    tipIcon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  {
    id: 'complete',
    title: "You're ready to go!",
    description: "Start by requesting a vouch from a trusted contact, then browse available loans. The more consistently you repay, the faster your tier climbs and the better offers you\u2019ll receive.",
    icon: <CheckCircle className="w-5 h-5" />,
    iconBg: 'from-green-500 to-emerald-600',
    position: 'center',
  },
];

const BUSINESS_TUTORIAL: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to your Lender Dashboard',
    description: "This is where you manage your lending operation. The Feyza trust system does the heavy lifting \u2014 let\u2019s walk through how it protects you.",
    icon: <Building2 className="w-5 h-5" />,
    iconBg: 'from-green-500 to-emerald-600',
    position: 'center',
    tip: 'Replay this tour anytime from Settings.',
    tipIcon: <Sparkles className="w-3.5 h-3.5" />,
  },
  {
    id: 'trust-tiers',
    title: 'Borrower Trust Tiers',
    description: "Every borrower has a Trust Tier (1\u20134) earned by collecting quality vouches. Tier 1 is a brand-new borrower; Tier 4 is well-vouched, verified, and proven.",
    detail: "You configure tier policies \u2014 minimum tier required, maximum loan amount per tier, and your interest rate.",
    icon: <Shield className="w-5 h-5" />,
    iconBg: 'from-violet-500 to-purple-600',
    target: '[data-tutorial="trust-settings"]',
    position: 'bottom',
    tip: 'Tiers are objective and computed by the platform \u2014 you can\u2019t be pressured to override them.',
    tipIcon: <Lock className="w-3.5 h-3.5" />,
  },
  {
    id: 'vouch-quality',
    title: 'Vouch Strength Matters',
    description: "Borrowers don\u2019t just have vouches \u2014 each vouch has a strength score from 1\u201310 based on the voucher\u2019s tier, relationship, and tenure. High-strength vouches are meaningful signals.",
    detail: "Vouchers also carry accountability: 2+ active defaults among their vouchees locks their ability to vouch \u2014 so vouches you see have real weight behind them.",
    icon: <Users className="w-5 h-5" />,
    iconBg: 'from-blue-500 to-cyan-600',
    position: 'center',
    tip: 'Borrowers who earned their tier through strong vouches are your lowest-risk clients.',
    tipIcon: <TrendingUp className="w-3.5 h-3.5" />,
  },
  {
    id: 'graduated-trust',
    title: 'Graduated Trust Limits',
    description: "New borrowers start at your first-time limit. After completing 3 loans on time with you, they automatically graduate to your standard maximum. No manual review needed.",
    detail: "Start conservatively with any borrower and let their track record do the work.",
    icon: <TrendingUp className="w-5 h-5" />,
    iconBg: 'from-green-500 to-teal-600',
    target: '[data-tutorial="trust-settings"]',
    position: 'bottom',
    tip: 'Set your first-time limit conservatively \u2014 graduate only the ones who earn it.',
    tipIcon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  {
    id: 'loan-requests',
    title: 'Auto-Accept & Manual Review',
    description: "Set a minimum trust tier to auto-accept loans instantly. Below that threshold, requests queue for your manual review at /lender/matches.",
    detail: "You see the borrower\u2019s tier, vouch count, vouch strength, and repayment history before deciding.",
    icon: <DollarSign className="w-5 h-5" />,
    iconBg: 'from-amber-500 to-yellow-500',
    target: '[data-tutorial="loan-requests"]',
    position: 'bottom',
    tip: "The 75% rule means borrowers can\u2019t stack debt \u2014 they must be actively repaying before requesting again.",
    tipIcon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  {
    id: 'complete',
    title: "Ready to lend!",
    description: "You\u2019re all set. The tier system, vouch accountability, graduated limits, and auto-matching work together to connect you with creditworthy borrowers at the right risk level.",
    icon: <Award className="w-5 h-5" />,
    iconBg: 'from-green-500 to-emerald-600',
    position: 'center',
  },
];

export const TUTORIALS: Record<string, TutorialStep[]> = {
  dashboard: DASHBOARD_TUTORIAL,
  business: BUSINESS_TUTORIAL,
};

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTutorialId, setCurrentTutorialId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const currentTutorial = currentTutorialId ? (TUTORIALS[currentTutorialId] ?? []) : [];
  const totalSteps = currentTutorial.length;

  const hasSeenTutorial = useCallback((id: string) => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(`tutorial_${id}_completed`) === 'true';
  }, []);

  const markComplete = useCallback((id: string) => {
    if (typeof window !== 'undefined')
      localStorage.setItem(`tutorial_${id}_completed`, 'true');
  }, []);

  const startTutorial = useCallback((id: string) => {
    if (TUTORIALS[id]) {
      setCurrentTutorialId(id);
      setCurrentStep(0);
      setIsActive(true);
    }
  }, []);

  const endTutorial = useCallback(() => {
    if (currentTutorialId) markComplete(currentTutorialId);
    setIsActive(false);
    setCurrentStep(0);
    setCurrentTutorialId(null);
  }, [currentTutorialId, markComplete]);

  const skipTutorial = useCallback(() => endTutorial(), [endTutorial]);

  const nextStep = useCallback(() => {
    currentStep < totalSteps - 1
      ? setCurrentStep(p => p + 1)
      : endTutorial();
  }, [currentStep, totalSteps, endTutorial]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) setCurrentStep(p => p - 1);
  }, [currentStep]);

  const resetTutorial = useCallback((id: string) => {
    if (typeof window !== 'undefined') localStorage.removeItem(`tutorial_${id}_completed`);
  }, []);

  return (
    <TutorialContext.Provider value={{
      isActive, currentStep, totalSteps,
      startTutorial, endTutorial, nextStep, prevStep, skipTutorial,
      hasSeenTutorial, resetTutorial,
    }}>
      {children}
      {mounted && isActive && currentTutorial.length > 0 && (
        <TutorialOverlay
          step={currentTutorial[currentStep]}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTutorial}
        />
      )}
    </TutorialContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// Overlay
// ─────────────────────────────────────────────────────────────

interface OverlayProps {
  step: TutorialStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

function TutorialOverlay({ step, currentStep, totalSteps, onNext, onPrev, onSkip }: OverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const isCentered = step.position === 'center' || !step.target;

  useEffect(() => {
    if (step.target) {
      const el = document.querySelector(step.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [step.target]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') onNext();
      else if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNext, onPrev, onSkip]);

  const getTooltipStyle = (): React.CSSProperties => {
    if (isCentered || !targetRect) {
      return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
    const pad = 20;
    const W = 400;
    const H = 340;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = Math.max(pad, Math.min(targetRect.left + targetRect.width / 2 - W / 2, vw - W - pad));
    const cy = (y: number) => Math.max(pad, Math.min(y, vh - H - pad));
    switch (step.position) {
      case 'bottom': return { position: 'fixed', top: cy(targetRect.bottom + pad), left: cx };
      case 'top':    return { position: 'fixed', top: cy(targetRect.top - H - pad), left: cx };
      case 'left':   return { position: 'fixed', top: cy(targetRect.top + targetRect.height / 2 - H / 2), left: targetRect.left - W - pad };
      case 'right':  return { position: 'fixed', top: cy(targetRect.top + targetRect.height / 2 - H / 2), left: targetRect.right + pad };
      default:       return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  if (typeof window === 'undefined') return null;

  const iconBg = step.iconBg ?? 'from-green-500 to-emerald-600';

  return createPortal(
    <div className="fixed inset-0 z-[9999] animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" onClick={onSkip} />

      {/* Spotlight ring + corner brackets */}
      {targetRect && !isCentered && (
        <>
          <div
            className="absolute rounded-2xl pointer-events-none"
            style={{
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.65), 0 0 0 2px #22c55e, 0 0 20px 4px rgba(34,197,94,0.28)',
            }}
          />
          <SpotlightCorners rect={targetRect} />
        </>
      )}

      {/* Card */}
      <div
        className="absolute w-[400px] max-w-[calc(100vw-32px)] animate-slide-up"
        style={getTooltipStyle()}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl dark:shadow-black/70 border border-neutral-200 dark:border-neutral-700/80 overflow-hidden">

          {/* Top accent line */}
          <div className="h-0.5 w-full bg-gradient-to-r from-green-400 via-green-500 to-emerald-400" />

          <div className="p-5">

            {/* Header row: icon + title + close */}
            <div className="flex items-start justify-between mb-3.5">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center text-white shadow-md shadow-black/10`}>
                  {step.icon}
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-snug pt-0.5 pr-2">
                  {step.title}
                </h3>
              </div>
              <button
                onClick={onSkip}
                className="shrink-0 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors -mt-0.5 -mr-0.5"
                aria-label="Close tutorial"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {step.description}
            </p>

            {/* Detail — indented secondary line */}
            {step.detail && (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 leading-relaxed mt-2 pl-2.5 border-l-2 border-neutral-200 dark:border-neutral-700">
                {step.detail}
              </p>
            )}

            {/* Tip */}
            {step.tip && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-green-800/50">
                <span className="text-green-600 dark:text-green-400 shrink-0 mt-0.5">
                  {step.tipIcon ?? <Sparkles className="w-3.5 h-3.5" />}
                </span>
                <p className="text-xs text-green-800 dark:text-green-300 leading-relaxed">
                  <span className="font-semibold">Tip: </span>{step.tip}
                </p>
              </div>
            )}

            {/* Progress dots + counter */}
            <div className="flex items-center gap-1 mt-4 mb-3.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i < currentStep
                      ? 'bg-green-400 dark:bg-green-500 w-3'
                      : i === currentStep
                        ? 'bg-green-500 w-5'
                        : 'bg-neutral-200 dark:bg-neutral-700 w-1.5'
                  }`}
                />
              ))}
              <span className="ml-auto text-[11px] text-neutral-400 tabular-nums">
                {currentStep + 1} / {totalSteps}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={onSkip}
                className="text-xs text-neutral-400 hover:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
              >
                Skip tour
              </button>
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <Button variant="outline" size="sm" onClick={onPrev} className="h-8 px-3 text-xs">
                    <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                    Back
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={onNext}
                  className="h-8 px-4 text-xs bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md shadow-green-500/20 border-0"
                >
                  {isLast ? (
                    <>Done <CheckCircle className="w-3.5 h-3.5 ml-1.5" /></>
                  ) : (
                    <>Next <ChevronRight className="w-3.5 h-3.5 ml-0.5" /></>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard hint — first step only */}
        {isCentered && currentStep === 0 && (
          <p className="text-center text-neutral-500 dark:text-neutral-600 text-xs mt-2.5 animate-fade-in">
            <kbd className="px-1.5 py-0.5 rounded bg-neutral-800/60 border border-neutral-700/50 font-mono text-[10px]">
              &rarr;
            </kbd>{' '}
            next &nbsp;&middot;&nbsp;{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-neutral-800/60 border border-neutral-700/50 font-mono text-[10px]">
              Esc
            </kbd>{' '}
            exit
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────
// Spotlight corner brackets
// ─────────────────────────────────────────────────────────────

function SpotlightCorners({ rect }: { rect: DOMRect }) {
  const pad = 6;
  const sz = 10;
  const t = rect.top - pad;
  const l = rect.left - pad;
  const b = rect.bottom + pad;
  const r = rect.right + pad;
  const cls = 'absolute w-2.5 h-2.5 border-green-400 pointer-events-none';
  return (
    <>
      <div className={`${cls} border-t-2 border-l-2 rounded-tl`} style={{ top: t, left: l }} />
      <div className={`${cls} border-t-2 border-r-2 rounded-tr`} style={{ top: t, left: r - sz }} />
      <div className={`${cls} border-b-2 border-l-2 rounded-bl`} style={{ top: b - sz, left: l }} />
      <div className={`${cls} border-b-2 border-r-2 rounded-br`} style={{ top: b - sz, left: r - sz }} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Exported helpers
// ─────────────────────────────────────────────────────────────

export function TutorialTrigger({
  tutorialId,
  children,
  className = '',
}: {
  tutorialId: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { startTutorial } = useTutorial();
  return (
    <button
      onClick={() => startTutorial(tutorialId)}
      className={`inline-flex items-center gap-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium text-sm transition-colors ${className}`}
    >
      {children || (
        <>
          <Play className="w-4 h-4" />
          <span>Start Tour</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </>
      )}
    </button>
  );
}

export function TutorialAutoStart({ tutorialId }: { tutorialId: string }) {
  const { startTutorial, hasSeenTutorial } = useTutorial();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasSeenTutorial(tutorialId)) startTutorial(tutorialId);
    }, 1000);
    return () => clearTimeout(timer);
  }, [tutorialId, hasSeenTutorial, startTutorial]);

  return null;
}
