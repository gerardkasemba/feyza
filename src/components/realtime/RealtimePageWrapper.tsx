'use client';

import { useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface RealtimePageWrapperProps {
  userId: string;
  children: ReactNode;
  /** Which subscriptions to enable */
  subscriptions?: {
    loans?: boolean;
    notifications?: boolean;
  };
  /** Debounce time in ms before refreshing (default 1500ms) */
  debounceMs?: number;
}

/**
 * Generic wrapper that adds real-time subscriptions to any page
 * Automatically refreshes server data when changes are detected
 */
export function RealtimePageWrapper({ 
  userId, 
  children, 
  subscriptions = { loans: true, notifications: true },
  debounceMs = 1500,
}: RealtimePageWrapperProps) {
  const router = useRouter();
  const lastRefreshRef = useRef<number>(Date.now());
  const supabase = createClient();

  // Debounced refresh function
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

    // Loan subscriptions
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

    // Notification subscriptions
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

  return <>{children}</>;
}

/**
 * Loans page specific wrapper
 */
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

/**
 * Business dashboard specific wrapper
 */
export function BusinessDashboardClient({ userId, children }: { userId: string; children: ReactNode }) {
  return (
    <RealtimePageWrapper 
      userId={userId} 
      subscriptions={{ loans: true, notifications: true }}
      debounceMs={1000}
    >
      {children}
    </RealtimePageWrapper>
  );
}

/**
 * Admin dashboard specific wrapper
 */
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
