import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  rounded?: 'full' | 'lg';
  withDot?: boolean;
}

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className, 
  rounded = 'full',
  withDot = false 
}: BadgeProps) {
  const variants = {
    default: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400',
    accent: 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const roundedClasses = {
    full: 'rounded-full',
    lg: 'rounded-lg',
  };

  const dotColors = {
    default: 'bg-neutral-400 dark:bg-neutral-500',
    success: 'bg-green-500 dark:bg-green-400',
    warning: 'bg-yellow-500 dark:bg-yellow-400',
    danger: 'bg-red-500 dark:bg-red-400',
    info: 'bg-blue-500 dark:bg-blue-400',
    primary: 'bg-primary-500 dark:bg-primary-400',
    accent: 'bg-accent-500 dark:bg-accent-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium',
        variants[variant],
        sizes[size],
        roundedClasses[rounded],
        className
      )}
    >
      {withDot && (
        <span 
          className={cn(
            'w-1.5 h-1.5 rounded-full mr-2 animate-pulse',
            dotColors[variant]
          )} 
        />
      )}
      {children}
    </span>
  );
}