'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Notification {
  id: string;
  user_id: string;
  loan_id?: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface RealtimeContextType {
  // Connection status
  isConnected: boolean;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  
  // Events for components to react to
  onLoanUpdate: (callback: (loan: any) => void) => () => void;
  onPaymentUpdate: (callback: (payment: any) => void) => () => void;
  onNotification: (callback: (notification: Notification) => void) => () => void;
  
  // Manual refresh
  refreshNotifications: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

interface RealtimeProviderProps {
  children: ReactNode;
  userId: string | null;
}

export function RealtimeProvider({ children, userId }: RealtimeProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [channels, setChannels] = useState<RealtimeChannel[]>([]);
  
  // Event listeners
  const [loanListeners, setLoanListeners] = useState<Set<(loan: any) => void>>(new Set());
  const [paymentListeners, setPaymentListeners] = useState<Set<(payment: any) => void>>(new Set());
  const [notificationListeners, setNotificationListeners] = useState<Set<(notification: Notification) => void>>(new Set());
  
  const supabase = createClient();

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Fetch initial notifications
  const refreshNotifications = useCallback(async () => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!error && data) {
      setNotifications(data);
    }
  }, [userId]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  }, [userId]);

  // Register event listeners
  const onLoanUpdate = useCallback((callback: (loan: any) => void) => {
    setLoanListeners(prev => new Set(prev).add(callback));
    return () => {
      setLoanListeners(prev => {
        const next = new Set(prev);
        next.delete(callback);
        return next;
      });
    };
  }, []);

  const onPaymentUpdate = useCallback((callback: (payment: any) => void) => {
    setPaymentListeners(prev => new Set(prev).add(callback));
    return () => {
      setPaymentListeners(prev => {
        const next = new Set(prev);
        next.delete(callback);
        return next;
      });
    };
  }, []);

  const onNotification = useCallback((callback: (notification: Notification) => void) => {
    setNotificationListeners(prev => new Set(prev).add(callback));
    return () => {
      setNotificationListeners(prev => {
        const next = new Set(prev);
        next.delete(callback);
        return next;
      });
    };
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!userId) {
      setIsConnected(false);
      setNotifications([]);
      return;
    }

    // Fetch initial notifications
    refreshNotifications();

    const newChannels: RealtimeChannel[] = [];

    // Subscribe to notifications
    const notificationsChannel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          console.log('[Realtime] New notification:', notification.title);
          
          // Add to state
          setNotifications(prev => [notification, ...prev]);
          
          // Notify listeners
          notificationListeners.forEach(listener => listener(notification));
          
          // Show browser notification if permitted
          if (Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico',
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Notifications channel:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      });
    
    newChannels.push(notificationsChannel);

    // Subscribe to loan updates (as borrower)
    const borrowerLoansChannel = supabase
      .channel(`loans:borrower:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'loans',
          filter: `borrower_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime] Loan update (borrower):', payload.eventType);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            loanListeners.forEach(listener => listener(payload.new));
          }
        }
      )
      .subscribe();
    
    newChannels.push(borrowerLoansChannel);

    // Subscribe to loan updates (as lender)
    const lenderLoansChannel = supabase
      .channel(`loans:lender:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'loans',
          filter: `lender_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime] Loan update (lender):', payload.eventType);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            loanListeners.forEach(listener => listener(payload.new));
          }
        }
      )
      .subscribe();
    
    newChannels.push(lenderLoansChannel);

    // Subscribe to payment schedule updates
    const paymentsChannel = supabase
      .channel(`payments:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_schedule',
        },
        (payload) => {
          console.log('[Realtime] Payment update:', payload.eventType);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            paymentListeners.forEach(listener => listener(payload.new));
          }
        }
      )
      .subscribe();
    
    newChannels.push(paymentsChannel);

    setChannels(newChannels);

    // Cleanup
    return () => {
      newChannels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      setChannels([]);
      setIsConnected(false);
    };
  }, [userId, refreshNotifications]);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const value: RealtimeContextType = {
    isConnected,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    onLoanUpdate,
    onPaymentUpdate,
    onNotification,
    refreshNotifications,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}
