'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

// Base interface for all database records
export interface BaseDatabaseRecord {
  id: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface SubscriptionConfig<T extends BaseDatabaseRecord> {
  table: string;
  schema?: string;
  event?: PostgresChangeEvent;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: { old: T; new: T }) => void;
  onDelete?: (payload: T) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void;
}

/**
 * Hook for subscribing to real-time Postgres changes on a table
 */
export function useRealtimeSubscription<T extends BaseDatabaseRecord>(
  config: SubscriptionConfig<T>,
  enabled: boolean = true
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!enabled) return;

    const {
      table,
      schema = 'public',
      event = '*',
      filter,
      onInsert,
      onUpdate,
      onDelete,
      onChange,
    } = config;

    // Create unique channel name
    const channelName = `realtime:${schema}:${table}:${filter || 'all'}`;

    // Build the channel config
    const channelConfig: any = {
      event,
      schema,
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    // Subscribe to the channel
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        channelConfig,
        (payload: RealtimePostgresChangesPayload<T>) => {
          console.log(`[Realtime] ${table} change:`, payload.eventType);

          // Call the general onChange handler
          onChange?.(payload);

          // Call specific event handlers
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload.new as T);
              break;
            case 'UPDATE':
              onUpdate?.({ old: payload.old as T, new: payload.new as T });
              break;
            case 'DELETE':
              onDelete?.(payload.old as T);
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] ${table} subscription status:`, status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [enabled, config.table, config.filter, config.event]);

  // Manual unsubscribe function
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
    }
  }, []);

  return { unsubscribe, isConnected };
}

/**
 * Hook for subscribing to broadcast channel (for custom events)
 */
export function useBroadcastChannel(
  channelName: string,
  eventName: string,
  onMessage: (payload: any) => void,
  enabled: boolean = true
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: eventName }, (payload) => {
        console.log(`[Broadcast] ${channelName}:${eventName}`, payload);
        onMessage(payload.payload);
      })
      .subscribe((status) => {
        console.log(`[Broadcast] ${channelName} status:`, status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [enabled, channelName, eventName]);

  // Send a message to the channel
  const send = useCallback(
    async (payload: any) => {
      if (channelRef.current) {
        return channelRef.current.send({
          type: 'broadcast',
          event: eventName,
          payload,
        });
      }
    },
    [eventName]
  );

  return { send, isConnected };
}

/**
 * Hook for subscribing to presence (who's online)
 */
export function usePresence(
  channelName: string,
  userInfo: Record<string, any>,
  enabled: boolean = true
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [presenceState, setPresenceState] = useState<Record<string, any[]>>({});
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!enabled || !userInfo) return;

    const channel = supabase
      .channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('[Presence] Sync:', state);
        setPresenceState(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[Presence] Join:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[Presence] Leave:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(userInfo);
          setIsConnected(true);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [enabled, channelName, JSON.stringify(userInfo)]);

  return { presenceState, isConnected };
}

/**
 * Hook for subscribing to loan updates
 */
export function useLoanSubscription(
  loanId: string | null,
  callbacks: {
    onUpdate?: (loan: any) => void;
  }
) {
  return useRealtimeSubscription<any>(
    {
      table: 'loans',
      event: 'UPDATE',
      filter: loanId ? `id=eq.${loanId}` : undefined,
      onUpdate: ({ new: loan }) => callbacks.onUpdate?.(loan),
    },
    !!loanId
  );
}

/**
 * Hook for subscribing to all loans for a user (as borrower or lender)
 */
export function useUserLoansSubscription(
  userId: string | null,
  callbacks: {
    onInsert?: (loan: any) => void;
    onUpdate?: (loan: any) => void;
    onDelete?: (loan: any) => void;
  }
) {
  // Subscribe to loans where user is borrower
  useRealtimeSubscription<any>(
    {
      table: 'loans',
      filter: userId ? `borrower_id=eq.${userId}` : undefined,
      onInsert: callbacks.onInsert,
      onUpdate: ({ new: loan }) => callbacks.onUpdate?.(loan),
      onDelete: callbacks.onDelete,
    },
    !!userId
  );

  // Subscribe to loans where user is lender
  useRealtimeSubscription<any>(
    {
      table: 'loans',
      filter: userId ? `lender_id=eq.${userId}` : undefined,
      onInsert: callbacks.onInsert,
      onUpdate: ({ new: loan }) => callbacks.onUpdate?.(loan),
      onDelete: callbacks.onDelete,
    },
    !!userId
  );
}

/**
 * Hook for subscribing to payment schedule updates
 */
export function usePaymentScheduleSubscription(
  loanId: string | null,
  callbacks: {
    onUpdate?: (payment: any) => void;
    onInsert?: (payment: any) => void;
  }
) {
  return useRealtimeSubscription<any>(
    {
      table: 'payment_schedule',
      filter: loanId ? `loan_id=eq.${loanId}` : undefined,
      onUpdate: ({ new: payment }) => callbacks.onUpdate?.(payment),
      onInsert: callbacks.onInsert,
    },
    !!loanId
  );
}

/**
 * Hook for subscribing to notifications
 */
export function useNotificationsSubscription(
  userId: string | null,
  callbacks: {
    onInsert?: (notification: any) => void;
    onUpdate?: (notification: any) => void;
    onDelete?: (notification: any) => void;
  }
) {
  return useRealtimeSubscription<any>(
    {
      table: 'notifications',
      filter: userId ? `user_id=eq.${userId}` : undefined,
      onInsert: callbacks.onInsert,
      onUpdate: ({ new: notification }) => callbacks.onUpdate?.(notification),
      onDelete: callbacks.onDelete,
    },
    !!userId
  );
}

/**
 * Hook for subscribing to loan request updates (for guest borrowers)
 */
export function useLoanRequestSubscription(
  requestId: string | null,
  callbacks: {
    onInsert?: (request: any) => void;
    onUpdate?: (request: any) => void;
  }
) {
  return useRealtimeSubscription<any>(
    {
      table: 'loan_requests',
      filter: requestId ? `id=eq.${requestId}` : undefined,
      onInsert: callbacks.onInsert,
      onUpdate: ({ new: request }) => callbacks.onUpdate?.(request),
    },
    !!requestId
  );
}

/**
 * Hook for subscribing to transfer status updates
 */
export function useTransferSubscription(
  loanId: string | null,
  callbacks: {
    onInsert?: (transfer: any) => void;
    onUpdate?: (transfer: any) => void;
  }
) {
  return useRealtimeSubscription<any>(
    {
      table: 'transfers',
      filter: loanId ? `loan_id=eq.${loanId}` : undefined,
      onInsert: callbacks.onInsert,
      onUpdate: ({ new: transfer }) => callbacks.onUpdate?.(transfer),
    },
    !!loanId
  );
}

/**
 * Hook for subscribing to business profile updates (for admin)
 */
export function useBusinessProfileSubscription(
  businessId: string | null,
  callbacks: {
    onUpdate?: (profile: any) => void;
  }
) {
  return useRealtimeSubscription<any>(
    {
      table: 'business_profiles',
      event: 'UPDATE',
      filter: businessId ? `id=eq.${businessId}` : undefined,
      onUpdate: ({ new: profile }) => callbacks.onUpdate?.(profile),
    },
    !!businessId
  );
}

/**
 * Hook for subscribing to all pending business verifications (for admin)
 */
export function usePendingVerificationsSubscription(
  callbacks: {
    onInsert?: (profile: any) => void;
    onUpdate?: (profile: any) => void;
  },
  enabled: boolean = true
) {
  return useRealtimeSubscription<any>(
    {
      table: 'business_profiles',
      filter: 'verification_status=eq.pending',
      onInsert: callbacks.onInsert,
      onUpdate: ({ new: profile }) => callbacks.onUpdate?.(profile),
    },
    enabled
  );
}

/**
 * Hook for subscribing to payment updates
 */
export function usePaymentsSubscription(
  loanId: string | null,
  callbacks: {
    onInsert?: (payment: any) => void;
    onUpdate?: (payment: any) => void;
  }
) {
  return useRealtimeSubscription<any>(
    {
      table: 'payments',
      filter: loanId ? `loan_id=eq.${loanId}` : undefined,
      onInsert: callbacks.onInsert,
      onUpdate: ({ new: payment }) => callbacks.onUpdate?.(payment),
    },
    !!loanId
  );
}

// Export types for use in other components
export type { PostgresChangeEvent };