'use client';

import { useEffect, useCallback, useRef, ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TutorialProvider, TutorialAutoStart } from '@/components/tutorial';
import { HelpCircle } from 'lucide-react';

interface RealtimePageWrapperProps {
  userId: string;
  children: ReactNode;
  subscriptions?: {
    loans?: boolean;
    notifications?: boolean;
  };
  debounceMs?: number;
  tutorialId?: string;
}

export function RealtimePageWrapper({ 
  userId, 
  children, 
  subscriptions = { loans: true, notifications: true },
  debounceMs = 1500,
  tutorialId,
}: RealtimePageWrapperProps) {
  const router = useRouter();
  const lastRefreshRef = useRef<number>(Date.now());
  const supabase = createClient();

  const refreshData = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current > debounceMs) {
      lastRefreshRef.current = now;
      router.refresh();
    }
  }, [router, debounceMs]);

  useEffect(() => {
    if (!userId) return;

    const channels: any[] = [];

    if (subscriptions.loans) {
      const borrowerChannel = supabase
        .channel(`realtime-borrower-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'loans', filter: `borrower_id=eq.${userId}` },
          () => refreshData()
        )
        .subscribe();
      channels.push(borrowerChannel);

      const lenderChannel = supabase
        .channel(`realtime-lender-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'loans', filter: `lender_id=eq.${userId}` },
          () => refreshData()
        )
        .subscribe();
      channels.push(lenderChannel);
    }

    if (subscriptions.notifications) {
      const notificationChannel = supabase
        .channel(`realtime-notifications-${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          () => console.log('[Realtime] New notification')
        )
        .subscribe();
      channels.push(notificationChannel);
    }

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [userId, subscriptions.loans, subscriptions.notifications, supabase, refreshData]);

  if (tutorialId) {
    return (
      <TutorialProvider>
        {children}
        <TutorialAutoStart tutorialId={tutorialId} />
        <TutorialHelpButton tutorialId={tutorialId} />
      </TutorialProvider>
    );
  }

  return <>{children}</>;
}

function TutorialHelpButton({ tutorialId }: { tutorialId: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const handleClick = () => {
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

export function LoansPageClient({ userId, children }: { userId: string; children: ReactNode }) {
  return (
    <RealtimePageWrapper 
      userId={userId} 
      subscriptions={{ loans: true, notifications: true }}
      debounceMs={1500}
    >
      {children}
    </RealtimePageWrapper>
  );
}

export function BusinessDashboardClient({ userId, children }: { userId: string; children: ReactNode }) {
  return (
    <RealtimePageWrapper 
      userId={userId} 
      subscriptions={{ loans: true, notifications: true }}
      debounceMs={1000}
      tutorialId="business"
    >
      {children}
    </RealtimePageWrapper>
  );
}

export function AdminDashboardClient({ userId, children }: { userId: string; children: ReactNode }) {
  return (
    <RealtimePageWrapper 
      userId={userId} 
      subscriptions={{ loans: true, notifications: true }}
      debounceMs={2000}
    >
      {children}
    </RealtimePageWrapper>
  );
}
