'use client';

import { useEffect, useCallback, useRef, ReactNode } from 'react';
import { clientLogger } from '@/lib/client-logger';

const log = clientLogger('NotificationsPageClient');
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface NotificationsPageClientProps {
  userId: string;
  children: ReactNode;
}

/**
 * Real-time wrapper for the notifications page
 * Auto-refreshes when new notifications arrive
 */
export function NotificationsPageClient({ userId, children }: NotificationsPageClientProps) {
  const router = useRouter();
  const lastRefreshRef = useRef<number>(Date.now());
  const supabase = createClient();

  const refreshData = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current > 1000) {
      lastRefreshRef.current = now;
      router.refresh();
    }
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-page-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          log.debug('Notification change', { event: payload.eventType });
          refreshData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, refreshData]);

  return <>{children}</>;
}
