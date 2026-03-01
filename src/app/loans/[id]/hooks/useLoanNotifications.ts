'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('useLoanNotifications');

import { useEffect, useState } from 'react';

export function useLoanNotifications(loanId: string) {
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [minimizedNotifications, setMinimizedNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loanId) return;

    try {
      const storedDismissed = localStorage.getItem(`loan-notifications-${loanId}`);
      if (storedDismissed) {
        setDismissedNotifications(new Set(JSON.parse(storedDismissed)));
      }

      const storedMinimized = localStorage.getItem(`loan-minimized-${loanId}`);
      if (storedMinimized) {
        setMinimizedNotifications(new Set(JSON.parse(storedMinimized)));
      }
    } catch (e) {
      log.error('Error loading notification state:', e);
    }
  }, [loanId]);

  const dismissNotification = (type: string) => {
    const next = new Set(dismissedNotifications);
    next.add(type);
    setDismissedNotifications(next);
    localStorage.setItem(`loan-notifications-${loanId}`, JSON.stringify(Array.from(next)));
  };

  const toggleNotification = (type: string) => {
    const next = new Set(minimizedNotifications);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setMinimizedNotifications(next);
    localStorage.setItem(`loan-minimized-${loanId}`, JSON.stringify(Array.from(next)));
  };

  return {
    dismissedNotifications,
    minimizedNotifications,
    dismissNotification,
    toggleNotification,
  };
}
