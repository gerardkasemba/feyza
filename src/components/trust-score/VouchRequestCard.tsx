'use client';

import React, { useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { 
  UserPlus, 
  Send, 
  Mail, 
  Users, 
  CheckCircle, 
  X,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface VouchRequestCardProps {
  className?: string;
  compact?: boolean;
}

export function VouchRequestCard({ className = '', compact = false }: VouchRequestCardProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [relationship, setRelationship] = useState('friend');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSendRequest = async () => {
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
      console.log('[VouchRequestCard] Response:', data);

      if (response.ok) {
        setSent(true);
        setEmail('');
        setName('');
        setMessage('');
        
        // Show the token for testing (only in dev)
        if (data.request?.invite_token && process.env.NODE_ENV === 'development') {
          console.log('[VouchRequestCard] Vouch request created with token:', data.request.invite_token);
          console.log('[VouchRequestCard] Test URL:', `/vouch/accept?token=${data.request.invite_token}`);
        }
        
        // Reset after 3 seconds
        setTimeout(() => setSent(false), 3000);
      } else {
        console.error('[VouchRequestCard] Error:', data);
        setError(data.error || 'Failed to send request');
      }
    } catch (err) {
      console.error('[VouchRequestCard] Exception:', err);
      setError('Failed to send request. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Success state
  if (sent) {
    return (
      <Card className={`bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 ${className}`}>
        <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
          <CheckCircle className="w-6 h-6" />
          <div>
            <p className="font-semibold">Vouch request sent!</p>
            <p className="text-sm opacity-80">We've emailed your request</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {/* Header */}
      <div 
        className={`flex items-center justify-between ${compact ? 'cursor-pointer' : ''}`}
        onClick={() => compact && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              Boost Your Trust Score
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Ask friends & family to vouch for you
            </p>
          </div>
        </div>
        {compact && (
          <button className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-400" />
            )}
          </button>
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Quick Info */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3">
            <p className="text-sm text-purple-700 dark:text-purple-300">
              <strong>How it works:</strong> Send a vouch request to someone who knows you. 
              When they vouch, your Trust Score increases and lenders see you have trusted connections.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Their Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Their Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Relationship
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm"
              >
                <option value="family">Family Member</option>
                <option value="friend">Friend</option>
                <option value="colleague">Colleague</option>
                <option value="neighbor">Neighbor</option>
                <option value="business">Business Associate</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Personal Message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hey! I'm using Feyza and would love if you could vouch for me..."
                rows={2}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <X className="w-4 h-4" />
              {error}
            </div>
          )}

          <Button
            onClick={handleSendRequest}
            disabled={sending || !email}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {sending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Vouch Request
              </>
            )}
          </Button>

          {/* Tips */}
          <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1">
            <p>💡 <strong>Tip:</strong> Family and long-time friends give stronger vouches</p>
            <p>💡 People with high Trust Scores boost yours more</p>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Inline vouch request prompt (for loan application flow)
 */
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
      const response = await fetch('/api/vouches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          targetEmail: email,
          message: `I'm applying for a loan on Feyza and your vouch would really help!`,
        }),
      });

      if (response.ok) {
        setEmail('');
        setShowForm(false);
        onRequestSent?.();
      }
    } catch (err) {
      console.error('Failed to send vouch request:', err);
    } finally {
      setSending(false);
    }
  };

  // Only show if trust score is below 70
  if (trustScore >= 70) return null;

  return (
    <div className={`bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Users className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium mb-1">
            Improve your approval chances
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
            Your Trust Score is {trustScore}. Adding vouches from people who know you can boost your score and help lenders trust you.
          </p>

          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1"
            >
              <UserPlus className="w-4 h-4" />
              Quick: Ask someone to vouch
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@email.com"
                className="flex-1 px-3 py-1.5 text-sm border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
              <Button
                size="sm"
                onClick={handleQuickRequest}
                disabled={sending || !email}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {sending ? '...' : 'Send'}
              </Button>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded"
              >
                <X className="w-4 h-4 text-amber-600" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
