'use client';

import { useState, useEffect, useCallback } from 'react';

interface GuestSession {
  token: string;
  type: 'borrower' | 'lender';
  name?: string;
  email?: string;
  loanId?: string;
  createdAt: string;
  lastAccessedAt: string;
}

const STORAGE_KEY = 'feyza_guest_sessions';

// ==========================
// Storage helpers
// ==========================
function getStoredSessions(): GuestSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as GuestSession[]) : [];
  } catch {
    return [];
  }
}

function setStoredSessions(sessions: GuestSession[]) {
  if (typeof window === 'undefined') return;
  try {
    // If no sessions left, remove the key entirely (true "logout")
    if (!sessions || sessions.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Storage full or disabled
  }
}

function removeSessions(predicate: (s: GuestSession) => boolean): GuestSession[] {
  const sessions = getStoredSessions();
  const filtered = sessions.filter(s => !predicate(s));
  setStoredSessions(filtered);
  return filtered;
}

// ==========================
// Public "end session" helpers (use anywhere)
// ==========================
export function endGuestSession(token: string, type: 'borrower' | 'lender'): GuestSession[] {
  return removeSessions(s => s.token === token && s.type === type);
}

export function endGuestSessionsByType(type: 'borrower' | 'lender'): GuestSession[] {
  return removeSessions(s => s.type === type);
}

export function endAllGuestSessions(): GuestSession[] {
  setStoredSessions([]);
  return [];
}

// ==========================
// Hook
// ==========================
export function useGuestSession(token: string, type: 'borrower' | 'lender') {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [allSessions, setAllSessions] = useState<GuestSession[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load session on mount
  useEffect(() => {
    const sessions = getStoredSessions();
    setAllSessions(sessions);

    // Find existing session for this token
    const existing = sessions.find(s => s.token === token && s.type === type);

    if (existing) {
      // Update last accessed time
      const updated: GuestSession = {
        ...existing,
        lastAccessedAt: new Date().toISOString(),
      };
      setSession(updated);

      // Update in storage
      const updatedSessions = sessions.map(s => (s.token === token && s.type === type ? updated : s));
      setStoredSessions(updatedSessions);
      setAllSessions(updatedSessions);
    } else {
      // Create new session
      const newSession: GuestSession = {
        token,
        type,
        createdAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
      };
      setSession(newSession);

      const updatedSessions = [...sessions, newSession];
      setStoredSessions(updatedSessions);
      setAllSessions(updatedSessions);
    }

    setIsLoaded(true);
  }, [token, type]);

  // Update session details (name, email, loanId)
  const updateSession = useCallback(
    (updates: Partial<Pick<GuestSession, 'name' | 'email' | 'loanId'>>) => {
      if (!session) return;

      const updated: GuestSession = {
        ...session,
        ...updates,
        lastAccessedAt: new Date().toISOString(),
      };
      setSession(updated);

      const sessions = getStoredSessions();
      const updatedSessions = sessions.map(s => (s.token === token && s.type === type ? updated : s));
      setStoredSessions(updatedSessions);
      setAllSessions(updatedSessions);
    },
    [session, token, type]
  );

  // Clear current session ("Not me" button) — removes only this token+type
  const clearSession = useCallback(() => {
    const filtered = endGuestSession(token, type);
    setSession(null);
    setAllSessions(filtered);
  }, [token, type]);

  // Clear all sessions for borrower/lender (or all)
  const clearAllSessions = useCallback((sessionType?: 'borrower' | 'lender') => {
    const filtered = sessionType ? endGuestSessionsByType(sessionType) : endAllGuestSessions();
    setSession(null);
    setAllSessions(filtered);
  }, []);

  // Get other sessions (for showing "Your other loans" in dashboard)
  const getOtherSessions = useCallback(
    (sessionType?: 'borrower' | 'lender') => {
      return allSessions.filter(s => {
        if (sessionType && s.type !== sessionType) return false;
        // Exclude current session
        if (s.token === token && s.type === type) return false;
        return true;
      });
    },
    [allSessions, token, type]
  );

  return {
    session,
    isLoaded,
    updateSession,
    clearSession,
    clearAllSessions,
    getOtherSessions,
    allSessions,
  };
}

// ==========================
// Utilities
// ==========================

// Get all guest sessions (for use outside of hook)
export function getAllGuestSessions(): GuestSession[] {
  return getStoredSessions();
}

// Check if user has any active sessions
export function hasGuestSessions(type?: 'borrower' | 'lender'): boolean {
  const sessions = getStoredSessions();
  if (type) return sessions.some(s => s.type === type);
  return sessions.length > 0;
}

// Get the most recent session of a type
export function getMostRecentSession(type: 'borrower' | 'lender'): GuestSession | null {
  const sessions = getStoredSessions().filter(s => s.type === type);
  if (sessions.length === 0) return null;

  return sessions.sort(
    (a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()
  )[0];
}
