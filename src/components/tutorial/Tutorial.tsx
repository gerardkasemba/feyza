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
  HelpCircle,
  Play
} from 'lucide-react';

// Tutorial step interface
interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string; // CSS selector for spotlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

// Tutorial context
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

const TutorialContext = createContext<TutorialContextType | null>(null);

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
}

// Tutorial steps for different pages
const DASHBOARD_TUTORIAL: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Feyza! 👋',
    description: 'Let us show you around. This quick tour will help you understand how Feyza works. You can skip anytime or access this tutorial later from Settings.',
    icon: <Sparkles className="w-6 h-6 text-primary-500" />,
    position: 'center',
  },
  {
    id: 'trust-score',
    title: 'Your Trust Score',
    description: 'This is your universal Trust Score (0-100). It shows lenders how trustworthy you are based on your payment history, vouches, verification status, and time on the platform. A higher score means better loan offers!',
    icon: <Shield className="w-6 h-6 text-purple-500" />,
    target: '[data-tutorial="trust-score"]',
    position: 'bottom',
  },
  {
    id: 'vouches',
    title: 'Social Vouching',
    description: 'Get friends and family to vouch for you! Each vouch increases your Trust Score. This is like having references, but for loans. The stronger your network, the more lenders trust you.',
    icon: <Users className="w-6 h-6 text-blue-500" />,
    target: '[data-tutorial="vouch-request"]',
    position: 'bottom',
  },
  {
    id: 'business-trust',
    title: 'Business Relationships',
    description: 'When you borrow from business lenders, you build a private trust relationship with them. Complete more loans to unlock higher amounts. You can request new loans directly from businesses you have history with!',
    icon: <Building2 className="w-6 h-6 text-green-500" />,
    target: '[data-tutorial="business-trust"]',
    position: 'top',
  },
  {
    id: 'loans',
    title: 'Your Loans',
    description: 'View all your active loans here. You can see borrowed money, lent money, and pending requests. Make payments on time to build your Trust Score!',
    icon: <DollarSign className="w-6 h-6 text-amber-500" />,
    target: '[data-tutorial="loans-tabs"]',
    position: 'top',
  },
  {
    id: 'complete',
    title: 'You are all set! 🎉',
    description: 'You now know the basics of Feyza. Start by requesting vouches from people you know, or browse available loans. You can always access this tutorial from Settings > Help.',
    icon: <CheckCircle className="w-6 h-6 text-green-500" />,
    position: 'center',
  },
];

const BUSINESS_TUTORIAL: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Business Dashboard! 🏢',
    description: 'This is where you manage your lending business. Let us walk you through the key features.',
    icon: <Building2 className="w-6 h-6 text-primary-500" />,
    position: 'center',
  },
  {
    id: 'trust-system',
    title: 'Graduated Trust System',
    description: 'New borrowers start with lower loan limits. As they complete loans successfully, they graduate to higher limits. This protects your business from defaults.',
    icon: <TrendingUp className="w-6 h-6 text-blue-500" />,
    target: '[data-tutorial="trust-settings"]',
    position: 'bottom',
  },
  {
    id: 'borrower-scores',
    title: 'Borrower Trust Scores',
    description: 'Every borrower has a Trust Score (0-100). Higher scores mean lower risk. You can see their payment history, vouches received, and verification status before approving loans.',
    icon: <Shield className="w-6 h-6 text-purple-500" />,
    position: 'center',
  },
  {
    id: 'loan-requests',
    title: 'Managing Loan Requests',
    description: 'When borrowers request loans, review their Trust Score and history. Approve or decline based on your risk tolerance. Set up auto-pay for easier collections.',
    icon: <DollarSign className="w-6 h-6 text-green-500" />,
    target: '[data-tutorial="loan-requests"]',
    position: 'bottom',
  },
  {
    id: 'complete',
    title: 'Ready to Lend! 💰',
    description: 'You are all set to start lending. Remember: the Trust Score and graduated trust system help protect your business. Good luck!',
    icon: <Award className="w-6 h-6 text-amber-500" />,
    position: 'center',
  },
];

const TUTORIALS: Record<string, TutorialStep[]> = {
  dashboard: DASHBOARD_TUTORIAL,
  business: BUSINESS_TUTORIAL,
};

// Provider component
export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTutorialId, setCurrentTutorialId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTutorial = currentTutorialId ? TUTORIALS[currentTutorialId] : [];
  const totalSteps = currentTutorial.length;

  const hasSeenTutorial = useCallback((tutorialId: string) => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(`tutorial_${tutorialId}_completed`) === 'true';
  }, []);

  const markTutorialComplete = useCallback((tutorialId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tutorial_${tutorialId}_completed`, 'true');
    }
  }, []);

  const startTutorial = useCallback((tutorialId: string) => {
    if (TUTORIALS[tutorialId]) {
      setCurrentTutorialId(tutorialId);
      setCurrentStep(0);
      setIsActive(true);
    }
  }, []);

  const endTutorial = useCallback(() => {
    if (currentTutorialId) {
      markTutorialComplete(currentTutorialId);
    }
    setIsActive(false);
    setCurrentStep(0);
    setCurrentTutorialId(null);
  }, [currentTutorialId, markTutorialComplete]);

  const skipTutorial = useCallback(() => {
    endTutorial();
  }, [endTutorial]);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      endTutorial();
    }
  }, [currentStep, totalSteps, endTutorial]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const resetTutorial = useCallback((tutorialId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`tutorial_${tutorialId}_completed`);
    }
  }, []);

  const value: TutorialContextType = {
    isActive,
    currentStep,
    totalSteps,
    startTutorial,
    endTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    hasSeenTutorial,
    resetTutorial,
  };

  return (
    <TutorialContext.Provider value={value}>
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

// Tutorial overlay component
interface TutorialOverlayProps {
  step: TutorialStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

function TutorialOverlay({ step, currentStep, totalSteps, onNext, onPrev, onSkip }: TutorialOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const isCentered = step.position === 'center' || !step.target;

  useEffect(() => {
    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [step.target]);

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (isCentered || !targetRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 16;
    const tooltipWidth = 400;
    const tooltipHeight = 250;

    switch (step.position) {
      case 'bottom':
        return {
          position: 'fixed',
          top: targetRect.bottom + padding,
          left: Math.max(padding, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding)),
        };
      case 'top':
        return {
          position: 'fixed',
          top: targetRect.top - tooltipHeight - padding,
          left: Math.max(padding, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding)),
        };
      case 'left':
        return {
          position: 'fixed',
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left - tooltipWidth - padding,
        };
      case 'right':
        return {
          position: 'fixed',
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.right + padding,
        };
      default:
        return {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay with spotlight */}
      <div 
        className="absolute inset-0 bg-black/60 transition-opacity"
        onClick={onSkip}
      />
      
      {/* Spotlight on target element */}
      {targetRect && !isCentered && (
        <div
          className="absolute bg-transparent border-4 border-primary-400 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}
      
      {/* Tooltip */}
      <div 
        className="w-[400px] max-w-[90vw] bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl p-6 z-10"
        style={getTooltipStyle()}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        >
          <X className="w-5 h-5 text-neutral-400" />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 bg-primary-50 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-4">
          {step.icon}
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
          {step.title}
        </h3>
        <p className="text-neutral-600 dark:text-neutral-300 mb-6 leading-relaxed">
          {step.description}
        </p>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= currentStep 
                  ? 'bg-primary-500' 
                  : 'bg-neutral-200 dark:bg-neutral-700'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            Skip tutorial
          </button>
          
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={onPrev}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <Button size="sm" onClick={onNext}>
              {isLast ? 'Finish' : 'Next'}
              {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Tutorial trigger button for settings/help
export function TutorialTrigger({ 
  tutorialId, 
  children,
  className = '' 
}: { 
  tutorialId: string; 
  children?: React.ReactNode;
  className?: string;
}) {
  const { startTutorial } = useTutorial();

  return (
    <button
      onClick={() => startTutorial(tutorialId)}
      className={`flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline ${className}`}
    >
      {children || (
        <>
          <Play className="w-4 h-4" />
          <span>Start Tutorial</span>
        </>
      )}
    </button>
  );
}

// Auto-start tutorial for first-time users
export function TutorialAutoStart({ tutorialId }: { tutorialId: string }) {
  const { startTutorial, hasSeenTutorial } = useTutorial();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Small delay to let the page render first
    const timer = setTimeout(() => {
      if (!hasSeenTutorial(tutorialId)) {
        startTutorial(tutorialId);
      }
      setChecked(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [tutorialId, hasSeenTutorial, startTutorial]);

  return null;
}

// Export everything
export { TUTORIALS };
