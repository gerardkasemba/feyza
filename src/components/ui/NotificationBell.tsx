'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, X, Check, CheckCheck, Loader2 } from 'lucide-react';
import { useRealtime } from '@/components/providers/RealtimeProvider';
import { formatRelativeDate } from '@/lib/utils';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isConnected } = useRealtime();
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle marking all as read
  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    await markAllAsRead();
    setIsMarkingAll(false);
  };

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_received':
      case 'payment_confirmed':
        return '💰';
      case 'loan_request':
        return '📥';
      case 'loan_accepted':
        return '✅';
      case 'loan_declined':
        return '❌';
      case 'reminder':
        return '⏰';
      case 'funds_sent':
      case 'funds_disbursed':
        return '💸';
      case 'transfer_completed':
        return '✅';
      case 'transfer_failed':
        return '⚠️';
      case 'loan_match_offer':
        return '🎯';
      case 'no_match_found':
        return '🔍';
      default:
        return '🔔';
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-xs font-medium text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        {/* Connection Indicator */}
        <span 
          className={`absolute bottom-1 right-1 w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-yellow-500'
          }`}
          title={isConnected ? 'Connected' : 'Connecting...'}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
            <h3 className="font-semibold text-neutral-900 dark:text-white">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAll}
                  className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium flex items-center gap-1"
                >
                  {isMarkingAll ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3 h-3" />
                  )}
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                  No notifications yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {notifications.slice(0, 10).map((notification) => {
                  // Determine the link destination
                  const notificationLink = notification.loan_id 
                    ? `/loans/${notification.loan_id}`
                    : '#';
                  const isClickable = !!notification.loan_id;
                  
                  const handleClick = () => {
                    if (notification.loan_id) {
                      markAsRead(notification.id);
                      setIsOpen(false);
                    }
                  };
                  
                  const content = (
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <span className="text-xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </span>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''} text-neutral-900 dark:text-white`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                          {formatRelativeDate(notification.created_at)}
                        </p>
                      </div>
                      
                      {/* Mark as Read */}
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 flex-shrink-0"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4 text-neutral-400" />
                        </button>
                      )}
                    </div>
                  );
                  
                  return isClickable ? (
                    <Link
                      key={notification.id}
                      href={notificationLink}
                      onClick={handleClick}
                      className={`block px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer ${
                        !notification.is_read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                      }`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${
                        !notification.is_read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                      }`}
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
              >
                View all notifications →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
