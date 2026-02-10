'use client';

import React, { useEffect } from 'react';
import { TutorialProvider, TutorialAutoStart, TutorialTrigger, useTutorial } from '@/components/tutorial';
import { Button } from '@/components/ui';
import { HelpCircle, Play } from 'lucide-react';

interface DashboardTutorialWrapperProps {
  children: React.ReactNode;
  tutorialId?: string;
}

// Inner component that uses the tutorial context
function TutorialContent({ children, tutorialId }: DashboardTutorialWrapperProps) {
  return (
    <>
      {children}
      <TutorialAutoStart tutorialId={tutorialId || 'dashboard'} />
    </>
  );
}

// Main wrapper with provider
export function DashboardTutorialWrapper({ children, tutorialId = 'dashboard' }: DashboardTutorialWrapperProps) {
  return (
    <TutorialProvider>
      <TutorialContent tutorialId={tutorialId}>
        {children}
      </TutorialContent>
    </TutorialProvider>
  );
}

// Help button to restart tutorial
export function TutorialHelpButton({ tutorialId = 'dashboard' }: { tutorialId?: string }) {
  return (
    <TutorialProvider>
      <TutorialHelpButtonInner tutorialId={tutorialId} />
    </TutorialProvider>
  );
}

function TutorialHelpButtonInner({ tutorialId }: { tutorialId: string }) {
  const { startTutorial, resetTutorial } = useTutorial();

  const handleClick = () => {
    resetTutorial(tutorialId);
    startTutorial(tutorialId);
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
      title="Start Tutorial"
    >
      <HelpCircle className="w-6 h-6" />
    </button>
  );
}

// Inline tutorial trigger for settings page
export function RestartTutorialButton({ 
  tutorialId, 
  label = 'Restart Tutorial' 
}: { 
  tutorialId: string;
  label?: string;
}) {
  return (
    <TutorialProvider>
      <RestartButtonInner tutorialId={tutorialId} label={label} />
    </TutorialProvider>
  );
}

function RestartButtonInner({ tutorialId, label }: { tutorialId: string; label: string }) {
  const { startTutorial, resetTutorial } = useTutorial();

  const handleClick = () => {
    resetTutorial(tutorialId);
    startTutorial(tutorialId);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      <Play className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}
