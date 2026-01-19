import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function Progress({ value, max = 100, size = 'md', showLabel = false, className }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            percentage >= 100
              ? 'bg-gradient-to-r from-green-500 to-green-400 dark:from-green-500 dark:to-green-400'
              : percentage >= 75
              ? 'bg-gradient-to-r from-primary-500 to-primary-400 dark:from-primary-500 dark:to-primary-400'
              : percentage >= 50
              ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 dark:from-yellow-500 dark:to-yellow-400'
              : 'bg-gradient-to-r from-orange-500 to-orange-400 dark:from-orange-500 dark:to-orange-400'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 text-right">
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  );
}