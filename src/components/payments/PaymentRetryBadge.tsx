'use client';

import React from 'react';
import { AlertTriangle, Clock, Ban } from 'lucide-react';
import { Badge } from '@/components/ui';

interface PaymentRetryBadgeProps {
  retryCount: number;
  maxRetries?: number;
  nextRetryAt?: string;
  status?: string;
  causedBlock?: boolean;
  className?: string;
}

/**
 * Displays payment retry status for failed/overdue payments
 * 
 * Shows:
 * - Number of retry attempts (X/3)
 * - Next retry date
 * - Warning when on last attempt
 * - Blocked status if caused block
 */
export function PaymentRetryBadge({
  retryCount,
  maxRetries = 3,
  nextRetryAt,
  status,
  causedBlock,
  className = '',
}: PaymentRetryBadgeProps) {
  // Don't show anything if no retries yet
  if (!retryCount && status !== 'defaulted' && status !== 'failed') {
    return null;
  }

  // Payment caused account block
  if (causedBlock || status === 'defaulted') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="destructive" size="sm">
          <Ban className="w-3 h-3 mr-1" />
          Defaulted
        </Badge>
      </div>
    );
  }

  const retriesRemaining = maxRetries - (retryCount || 0);
  const isLastRetry = retriesRemaining === 1;
  const nextRetryDate = nextRetryAt ? new Date(nextRetryAt) : null;

  // All retries exhausted but not yet marked as defaulted
  if (retriesRemaining <= 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="danger" size="sm">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Max Retries Reached
        </Badge>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {/* Retry count badge */}
      <Badge 
        variant={isLastRetry ? 'danger' : 'warning'} 
        size="sm"
      >
        <AlertTriangle className="w-3 h-3 mr-1" />
        Retry {retryCount}/{maxRetries}
        {isLastRetry && ' (Final)'}
      </Badge>

      {/* Next retry date */}
      {nextRetryDate && retriesRemaining > 0 && (
        <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Next retry: {nextRetryDate.toLocaleDateString()}
        </span>
      )}

      {/* Warning message for last retry */}
      {isLastRetry && (
        <span className="text-xs text-red-600 dark:text-red-400">
          ⚠️ Account will be blocked if next retry fails
        </span>
      )}
    </div>
  );
}

/**
 * Inline version for smaller displays
 */
export function PaymentRetryBadgeInline({
  retryCount,
  maxRetries = 3,
  status,
  causedBlock,
}: PaymentRetryBadgeProps) {
  if (!retryCount && status !== 'defaulted' && status !== 'failed') {
    return null;
  }

  if (causedBlock || status === 'defaulted') {
    return (
      <Badge variant="destructive" size="sm">
        Defaulted
      </Badge>
    );
  }

  const retriesRemaining = maxRetries - (retryCount || 0);
  const isLastRetry = retriesRemaining === 1;

  return (
    <Badge variant={isLastRetry ? 'danger' : 'warning'} size="sm">
      {retryCount}/{maxRetries} retries
    </Badge>
  );
}

export default PaymentRetryBadge;
