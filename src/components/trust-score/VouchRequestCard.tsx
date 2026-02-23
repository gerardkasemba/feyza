'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, Button } from '@/components/ui';
import {
  UserPlus,
  Send,
  CheckCircle,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  Shield,
  Loader2,
  Users,
  Mail,
} from 'lucide-react';
import { VouchButton } from './TrustScoreComponents';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

interface SearchResult {
  id: string;
  full_name: string;
  username: string | null;
  email_hint: string | null;
  phone_hint: string | null;
  trust_tier: string | null;
  vouch_count: number;
  is_verified: boolean;
}

interface VouchRequestCardProps {
  className?: string;
  compact?: boolean;
}

/* ─────────────────────────────────────────────
   Tier badge helper
───────────────────────────────────────────── */

const TIER_LABELS: Record<string, string> = {
  tier_1: 'Low Trust',
  tier_2: 'Building Trust',
  tier_3: 'Established Trust',
  tier_4: 'High Trust',
};

function TierPill({ tier }: { tier: string | null }) {
  if (!tier) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
      {TIER_LABELS[tier] ?? tier}
    </span>
  );
}

/* ─────────────────────────────────────────────
   User Search Panel (embedded in the card)
   - mobile-friendly rows
   - actions wrap
   - less cramped
───────────────────────────────────────────── */

function UserSearchSection({ onRequestSent }: { onRequestSent?: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
        const d = await res.json();
        setResults(d.users ?? []);
        setSearched(true);
      } catch {
        setResults([]);
        setSearched(true);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function sendRequest(user: SearchResult) {
    setSending(user.id);
    try {
      const res = await fetch('/api/vouches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          targetEmail: null,
          targetUserId: user.id,
          targetName: user.full_name,
          message: `I'm building my trust score on Feyza and would love if you could vouch for me!`,
          suggestedRelationship: 'friend',
        }),
      });

      if (res.ok) {
        setSentIds((p) => [...p, user.id]);
        onRequestSent?.();
      }
    } catch {
      // silent
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, @username, email, phone"
          className="w-full pl-10 pr-9 py-2.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setSearched(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Searching indicator */}
      {searching && (
        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Searching…
        </div>
      )}

      {/* No results */}
      {!searching && searched && results.length === 0 && (
        <div className="rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50 dark:bg-neutral-900 p-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            No one found for <span className="font-medium">“{query}”</span>.
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Try the email invite below.</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((u) => {
            const alreadySent = sentIds.includes(u.id);

            return (
              <div
                key={u.id}
                className="p-3 sm:p-4 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold text-sm flex-shrink-0">
                    {u.full_name?.charAt(0) ?? '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                        {u.full_name}
                      </span>
                      {u.is_verified && (
                        <span className="inline-flex">
                          <Shield className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" aria-label="Verified" role="img" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {u.username && <span className="text-xs text-neutral-500 dark:text-neutral-400">@{u.username}</span>}
                      {u.email_hint && (
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">{u.email_hint}</span>
                      )}
                      {u.phone_hint && (
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">{u.phone_hint}</span>
                      )}
                      <TierPill tier={u.trust_tier} />
                    </div>
                  </div>
                </div>

                {/* Actions (wrap + full-width on mobile if needed) */}
                <div className="mt-3 flex items-center justify-end gap-2 flex-wrap">
                  {alreadySent ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Sent
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => sendRequest(u)}
                        disabled={sending === u.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition disabled:opacity-50"
                      >
                        {sending === u.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        Request
                      </button>

                      <VouchButton
                        targetUserId={u.id}
                        targetName={u.full_name}
                        onVouchComplete={() => setSentIds((p) => [...p, u.id])}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main VouchRequestCard (app-like)
   - rounded corners
   - cleaner spacing
   - compact mode works
───────────────────────────────────────────── */

export function VouchRequestCard({ className = '', compact = false }: VouchRequestCardProps) {
  const [expanded, setExpanded] = useState(!compact);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [relationship, setRelationship] = useState('friend');

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSendEmailRequest = async () => {
    if (!email) {
      setError('Please enter an email address');
      return;
    }

    setSending(true);
    setError('');

    try {
      const response = await fetch('/api/vouches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          targetEmail: email,
          targetName: name,
          message: message || `I'm building my trust score on Feyza and would really appreciate if you could vouch for me!`,
          suggestedRelationship: relationship,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSent(true);
        setEmail('');
        setName('');
        setMessage('');
        setTimeout(() => setSent(false), 4000);
      } else {
        setError(data.error || 'Failed to send request');
      }
    } catch {
      setError('Failed to send request. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <Card
        className={`rounded-2xl p-4 sm:p-5 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 ${className}`}
      >
        <div className="flex items-start gap-3 text-primary-700 dark:text-primary-400">
          <CheckCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">Vouch request sent!</p>
            <p className="text-sm opacity-80">We’ve emailed your request.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`rounded-2xl p-4 sm:p-5 ${className}`}>
      {/* Header */}
      <div
        className={`flex items-start justify-between gap-3 ${compact ? 'cursor-pointer select-none' : ''}`}
        onClick={() => compact && setExpanded((v) => !v)}
        role={compact ? 'button' : undefined}
        aria-expanded={compact ? expanded : undefined}
        tabIndex={compact ? 0 : -1}
        onKeyDown={(e) => {
          if (!compact) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              Boost Your Trust Tier
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Ask friends &amp; family to vouch for you
            </p>
          </div>
        </div>

        {compact && (
          <button
            type="button"
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl flex-shrink-0"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 space-y-5">
          {/* How it works */}
          <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl p-3">
            <p className="text-sm text-primary-700 dark:text-primary-300">
              <strong>How it works:</strong> Find someone on Feyza below or invite anyone by email. When they vouch for
              you, your Trust Tier improves and lenders see stronger trust.
            </p>
          </div>

          {/* Section 1 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Find someone on Feyza</span>
            </div>
            <UserSearchSection />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
            <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">NOT ON FEYZA YET?</span>
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
          </div>

          {/* Section 2: Email invite */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Invite by email</span>
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                    Their Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="friend@example.com"
                    className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                    Their Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John"
                    className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Relationship
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="family">Family Member</option>
                  <option value="friend">Friend</option>
                  <option value="colleague">Colleague</option>
                  <option value="neighbor">Neighbor</option>
                  <option value="business">Business Associate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Personal Message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hey! I'm using Feyza and would love if you could vouch for me..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <X className="w-4 h-4 flex-shrink-0" />
                  <span className="break-words">{error}</span>
                </div>
              )}

              <Button
                onClick={handleSendEmailRequest}
                disabled={sending || !email}
                className="w-full bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 rounded-2xl"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Email Invite
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Tips */}
          <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1 border-t border-neutral-100 dark:border-neutral-800 pt-3">
            <p>💡 Family and long-time friends give stronger vouches</p>
            <p>💡 Verified users with higher Trust Tiers boost yours more</p>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ─────────────────────────────────────────────
   InlineVouchPrompt (mobile-friendly)
───────────────────────────────────────────── */

interface InlineVouchPromptProps {
  trustScore: number;
  onRequestSent?: () => void;
  className?: string;
}

export function InlineVouchPrompt({ trustScore, onRequestSent, className = '' }: InlineVouchPromptProps) {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleQuickRequest = async () => {
    if (!email) return;
    setSending(true);
    try {
      const res = await fetch('/api/vouches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          targetEmail: email,
          message: `I'm applying for a loan on Feyza and your vouch would really help!`,
        }),
      });

      if (res.ok) {
        setEmail('');
        setShowForm(false);
        onRequestSent?.();
      }
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  if (trustScore >= 70) return null;

  return (
    <div
      className={`bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <Users className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-primary-800 dark:text-primary-300 font-medium mb-1">
            Improve your approval chances
          </p>
          <p className="text-xs text-primary-700 dark:text-primary-400 mb-3">
            Your Trust Score is {trustScore}. Adding vouches can boost your tier and help lenders trust you.
          </p>

          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="text-sm font-medium text-primary-700 dark:text-primary-300 hover:underline flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Quick: Ask someone to vouch
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@email.com"
                className="w-full px-3 py-2 text-sm border border-primary-300 dark:border-primary-700 rounded-2xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleQuickRequest}
                  disabled={sending || !email}
                  className="bg-primary-600 hover:bg-primary-700 rounded-xl"
                >
                  {sending ? 'Sending…' : 'Send'}
                </Button>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-xl"
                  aria-label="Cancel"
                >
                  <X className="w-4 h-4 text-primary-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}