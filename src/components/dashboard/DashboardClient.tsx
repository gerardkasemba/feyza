'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface DashboardClientProps {
  userId: string;
  children: React.ReactNode;
}

/**
 * Client-side wrapper for dashboard that handles real-time updates
 * Wraps server-rendered content and refreshes when data changes
 */
export function DashboardClient({ userId, children }: DashboardClientProps) {
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

  return <>{children}</>;
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
