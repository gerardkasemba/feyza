'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { formatRelativeDate } from '@/lib/utils';
import {
  Bell,
  CheckCheck,
  Filter,
  Loader2,
  Inbox,
  DollarSign,
  FileText,
  Target,
  MessageCircle,
  ChevronRight,
} from 'lucide-react';

export type NotificationRecord = {
  id: string;
  user_id: string;
  loan_id?: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
};

type StatusFilter = 'all' | 'unread' | 'read';
type TypeFilter = 'all' | 'payment' | 'loan' | 'match' | 'other';

const TYPE_GROUPS: Record<TypeFilter, string[]> = {
  all: [],
  payment: [
    'payment_received', 'payment_confirmed', 'payment_confirmation_needed', 'payment_disputed',
    'payment_reminder', 'payment_retry_success', 'payment_retry_failed', 'funds_sent',
    'funds_disbursed', 'transfer_completed', 'transfer_failed',
  ],
  loan: [
    'loan_request', 'loan_accepted', 'loan_declined', 'loan_cancelled', 'loan_created',
    'loan_completed', 'contract_signed', 'reminder', 'paypal_required', 'bank_required',
  ],
  match: ['loan_match_offer'],
  other: [
    'account_blocked', 'vouch_received', 'voucher_defaulted', 'voucher_completed', 'voucher_locked',
  ],
};

function getNotificationMeta(type: string) {
  if (type.startsWith('payment_') || type.startsWith('funds_') || type.startsWith('transfer_')) {
    return { icon: DollarSign, label: 'Payment', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' };
  }
  if (type === 'loan_match_offer' || type === 'no_match_found') {
    return { icon: Target, label: 'Match', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' };
  }
  if (type.startsWith('loan_') || type.startsWith('contract_') || type === 'reminder' || type === 'paypal_required' || type === 'bank_required') {
    return { icon: FileText, label: 'Loan', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' };
  }
  return { icon: MessageCircle, label: 'Other', color: 'text-neutral-600 dark:text-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-800' };
}

function getHref(n: NotificationRecord): string {
  if (n.type === 'loan_match_offer' && (n.data as { match_id?: string })?.match_id) {
    return `/lender/matches/${(n.data as { match_id: string }).match_id}`;
  }
  if (n.loan_id) return `/loans/${n.loan_id}`;
  return '#';
}

interface NotificationsViewProps {
  notifications: NotificationRecord[];
  userId: string;
}

export function NotificationsView({ notifications: initialNotifications, userId }: NotificationsViewProps) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>(initialNotifications);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  const filtered = useMemo(() => {
    let list = notifications;
    if (statusFilter === 'unread') list = list.filter((n) => !n.is_read);
    if (statusFilter === 'read') list = list.filter((n) => n.is_read);
    if (typeFilter !== 'all') {
      const types = TYPE_GROUPS[typeFilter];
      list = list.filter((n) => types.includes(n.type));
    }
    return list;
  }, [notifications, statusFilter, typeFilter]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } finally {
      setMarkingAllRead(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
            Notifications
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread · ${notifications.length} total`
              : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markingAllRead}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50"
          >
            {markingAllRead ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          <Filter className="w-4 h-4" />
          Filter
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'unread', 'read'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                statusFilter === status
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {status}
            </button>
          ))}
          <span className="w-px h-6 bg-neutral-200 dark:bg-neutral-700 self-center" />
          {(['all', 'payment', 'loan', 'match', 'other'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                typeFilter === type
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="text-center py-16">
          <Inbox className="w-14 h-14 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" aria-hidden />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            {notifications.length === 0 ? 'No notifications yet' : 'No notifications match this filter'}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-300 text-sm">
            {notifications.length === 0 ? "You're all caught up. We'll notify you when something happens." : 'Try changing the filter above.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const { icon: Icon, color, bg } = getNotificationMeta(n.type);
            const href = getHref(n);
            const content = (
              <>
                <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'} text-neutral-900 dark:text-white`}>
                      {n.title}
                    </p>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" aria-hidden />
                    )}
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                    {n.message}
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                    {formatRelativeDate(n.created_at)}
                  </p>
                </div>
                {href !== '#' && (
                  <ChevronRight className="w-5 h-5 text-neutral-400 flex-shrink-0" />
                )}
              </>
            );
            const cardClass = `flex items-start gap-4 p-4 rounded-2xl border transition-colors ${
              !n.is_read
                ? 'bg-emerald-50/60 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-800/60 hover:border-emerald-300 dark:hover:border-emerald-700'
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
            }`;
            return href !== '#' ? (
              <Link key={n.id} href={href} className="block">
                <Card hover className={cardClass}>{content}</Card>
              </Link>
            ) : (
              <div key={n.id}>
                <Card className={cardClass}>{content}</Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
