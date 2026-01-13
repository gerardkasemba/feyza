import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover = false, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700',
        'p-4 sm:p-5 md:p-6', // Responsive padding
        'h-full flex flex-col', // Consistent height with flex layout
        hover && 'transition-all duration-200 hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-600 cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 sm:mb-4 flex-shrink-0', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ 
  children, 
  className,
  truncate = false 
}: { 
  children: React.ReactNode; 
  className?: string;
  truncate?: boolean;
}) {
  return (
    <h3 className={cn(
      'text-base sm:text-lg font-semibold text-neutral-900 dark:text-white',
      'leading-tight',
      'break-words overflow-hidden', // Prevent overflow
      truncate ? 'truncate' : 'line-clamp-2', // Single line truncate or 2-line clamp
      className
    )}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn(
      'text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1',
      'line-clamp-2', // Prevent overflow with line clamping
      className
    )}>
      {children}
    </p>
  );
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'flex-grow min-h-0', // Grows to fill space, min-h-0 prevents overflow issues
      className
    )}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-neutral-100 dark:border-neutral-700',
      'flex-shrink-0', // Prevents footer from shrinking
      className
    )}>
      {children}
    </div>
  );
}