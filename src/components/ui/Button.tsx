import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
  
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 dark:bg-primary-700 dark:hover:bg-primary-600 dark:focus:ring-primary-400 shadow-lg shadow-primary-500/25 dark:shadow-primary-700/30 hover:shadow-xl hover:shadow-primary-500/30 dark:hover:shadow-primary-700/40',
    secondary: 'bg-neutral-800 text-white hover:bg-neutral-700 focus:ring-neutral-500 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:focus:ring-neutral-400 shadow-sm dark:shadow-neutral-900/30',
    outline: 'border-2 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 focus:ring-neutral-400 dark:focus:ring-neutral-500 bg-transparent',
    ghost: 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 focus:ring-neutral-400 dark:focus:ring-neutral-500 bg-transparent',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-600 dark:focus:ring-red-400 shadow-lg shadow-red-500/25 dark:shadow-red-700/30',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 dark:bg-green-700 dark:hover:bg-green-600 dark:focus:ring-green-400 shadow-lg shadow-green-500/25 dark:shadow-green-700/30',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500 dark:focus:ring-amber-400 shadow-lg shadow-amber-500/25 dark:shadow-amber-600/30',
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[36px] min-w-[36px]',
    md: 'px-5 py-2.5 text-base min-h-[44px] min-w-[44px]',
    lg: 'px-7 py-3.5 text-lg min-h-[52px] min-w-[52px]',
    xl: 'px-8 py-4 text-xl min-h-[60px] min-w-[60px]',
    icon: 'p-2.5 min-w-[44px] min-h-[44px]',
  };

  const focusRingOffset = {
    primary: 'focus:ring-offset-white dark:focus:ring-offset-neutral-900',
    secondary: 'focus:ring-offset-white dark:focus:ring-offset-neutral-900',
    outline: 'focus:ring-offset-white dark:focus:ring-offset-neutral-900',
    ghost: 'focus:ring-offset-white dark:focus:ring-offset-neutral-900',
    danger: 'focus:ring-offset-white dark:focus:ring-offset-neutral-900',
    success: 'focus:ring-offset-white dark:focus:ring-offset-neutral-900',
    warning: 'focus:ring-offset-white dark:focus:ring-offset-neutral-900',
  };

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        focusRingOffset[variant],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
}