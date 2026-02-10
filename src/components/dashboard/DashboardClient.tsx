'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TutorialProvider, TutorialAutoStart } from '@/components/tutorial';
import { HelpCircle } from 'lucide-react';

interface DashboardClientProps {
  userId: string;
  children: React.ReactNode;
  tutorialId?: string;
}

/**
 * Client-side wrapper for dashboard that handles real-time updates and tutorial
 * Wraps server-rendered content and refreshes when data changes
 */
export function DashboardClient({ userId, children, tutorialId = 'dashboard' }: DashboardClientProps) {
  const router = useRouter();
  const lastRefreshRef = useRef<number>(Date.now());
  const supabase = createClient();

  // Debounced refresh to avoid too many refreshes
  const refreshData = useCallback(() => {
    const now = Date.now();
    // Only refresh if at least 2 seconds since last update
    if (now - lastRefreshRef.current > 2000) {
      lastRefreshRef.current = now;
      router.refresh();
    }
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to loan changes for this user (as borrower)
    const borrowerChannel = supabase
      .channel(`dashboard-borrower-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'loans',
          filter: `borrower_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Dashboard] Loan change (borrower):', payload.eventType);
          refreshData();
        }
      )
      .subscribe();

    // Subscribe to loan changes for this user (as lender)
    const lenderChannel = supabase
      .channel(`dashboard-lender-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'loans',
          filter: `lender_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Dashboard] Loan change (lender):', payload.eventType);
          refreshData();
        }
      )
      .subscribe();

    // Subscribe to notifications
    const notificationChannel = supabase
      .channel(`dashboard-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Dashboard] New notification');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(borrowerChannel);
      supabase.removeChannel(lenderChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, [userId, supabase, refreshData]);

  return (
    <TutorialProvider>
      {children}
      <TutorialAutoStart tutorialId={tutorialId} />
      <TutorialHelpButton tutorialId={tutorialId} />
    </TutorialProvider>
  );
}

// Floating help button
function TutorialHelpButton({ tutorialId }: { tutorialId: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const handleClick = () => {
    // Reset and start tutorial
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`tutorial_${tutorialId}_completed`);
      window.location.reload();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="w-12 h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        title="Start Tutorial"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-neutral-800 text-white text-sm rounded-lg whitespace-nowrap">
          Restart Tutorial
        </div>
      )}
    </div>
  );
}

/**
 * Hook for dashboard data with real-time updates
 * Can be used in client components that need dashboard data
 */
export function useDashboardData(userId: string) {
  // Simplified - just return empty for now, can be expanded later
  return {
    borrowedLoans: [],
    lentLoans: [],
    notifications: [],
    loading: false,
    refetch: () => {},
  };
}
