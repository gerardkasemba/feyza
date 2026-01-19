import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ 
  children, 
  className, 
  hover = false, 
  onClick,
  variant = 'default',
  shadow = 'sm'
}: CardProps) {
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm dark:shadow-neutral-900/30',
    md: 'shadow dark:shadow-neutral-900/50',
    lg: 'shadow-lg dark:shadow-neutral-900/70',
  };

  const variantClasses = {
    default: 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700',
    outline: 'border-2 border-neutral-200 dark:border-neutral-700 bg-transparent',
    ghost: 'border-none bg-neutral-50 dark:bg-neutral-800/50',
  };

  return (
    <div
      className={cn(
        'rounded-2xl',
        'p-4 sm:p-5 md:p-6', // Responsive padding
        'h-full flex flex-col', // Consistent height with flex layout
        'transition-all duration-200', // Smooth transitions for all states
        variantClasses[variant],
        shadowClasses[shadow],
        hover && 'hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-600 cursor-pointer',
        hover && variant === 'ghost' && 'hover:bg-neutral-100 dark:hover:bg-neutral-800',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ 
  children, 
  className,
  withDivider = false 
}: { 
  children: React.ReactNode; 
  className?: string;
  withDivider?: boolean;
}) {
  return (
    <div className={cn(
      'mb-3 sm:mb-4 flex-shrink-0',
      withDivider && 'pb-3 sm:pb-4 border-b border-neutral-100 dark:border-neutral-700',
      className
    )}>
      {children}
    </div>
  );
}

export function CardTitle({ 
  children, 
  className,
  truncate = false,
  size = 'md'
}: { 
  children: React.ReactNode; 
  className?: string;
  truncate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'text-sm sm:text-base',
    md: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl',
  };

  return (
    <h3 className={cn(
      'font-semibold text-neutral-900 dark:text-white',
      'leading-tight',
      'break-words overflow-hidden', // Prevent overflow
      sizeClasses[size],
      truncate ? 'truncate' : 'line-clamp-2', // Single line truncate or 2-line clamp
      className
    )}>
      {children}
    </h3>
  );
}

export function CardDescription({ 
  children, 
  className,
  variant = 'default'
}: { 
  children: React.ReactNode; 
  className?: string;
  variant?: 'default' | 'muted' | 'strong';
}) {
  const variantClasses = {
    default: 'text-neutral-500 dark:text-neutral-400',
    muted: 'text-neutral-400 dark:text-neutral-500',
    strong: 'text-neutral-600 dark:text-neutral-300 font-medium',
  };

  return (
    <p className={cn(
      'text-xs sm:text-sm mt-1',
      'line-clamp-2', // Prevent overflow with line clamping
      variantClasses[variant],
      className
    )}>
      {children}
    </p>
  );
}

export function CardContent({ 
  children, 
  className,
  noPadding = false 
}: { 
  children: React.ReactNode; 
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div className={cn(
      'flex-grow min-h-0', // Grows to fill space, min-h-0 prevents overflow issues
      !noPadding && 'pt-2',
      className
    )}>
      {children}
    </div>
  );
}

export function CardFooter({ 
  children, 
  className,
  align = 'right'
}: { 
  children: React.ReactNode; 
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
}) {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={cn(
      'mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-neutral-100 dark:border-neutral-700',
      'flex-shrink-0', // Prevents footer from shrinking
      'flex items-center gap-2',
      alignClasses[align],
      className
    )}>
      {children}
    </div>
  );
}

// Additional specialized card components for consistency
export function StatCard({ 
  title, 
  value, 
  description, 
  icon,
  trend,
  className 
}: { 
  title: string;
  value: string;
  description?: string;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle size="sm">{title}</CardTitle>
          {icon && (
            <div className="w-8 h-8 bg-primary-50 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</span>
          {trend && (
            <span className={`text-sm px-2 py-0.5 rounded-full ${
              trend.isPositive 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        {description && (
          <CardDescription className="mt-2">{description}</CardDescription>
        )}
      </CardContent>
    </Card>
  );
}

export function FeatureCard({
  title,
  description,
  icon,
  iconBg = 'primary',
  className
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg?: 'primary' | 'accent' | 'green' | 'blue' | 'yellow' | 'purple';
  className?: string;
}) {
  const iconBgClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    accent: 'bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  return (
    <Card hover className={className}>
      <div className="flex flex-col h-full">
        <div className={`w-12 h-12 ${iconBgClasses[iconBg]} rounded-xl flex items-center justify-center mb-4 flex-shrink-0`}>
          {icon}
        </div>
        <CardTitle className="mb-2">{title}</CardTitle>
        <CardDescription className="flex-grow">{description}</CardDescription>
      </div>
    </Card>
  );
}