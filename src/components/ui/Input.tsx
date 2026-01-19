import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className, containerClassName, ...props }, ref) => {
    return (
      <div className={cn('space-y-1.5', containerClassName)}>
        {label && (
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full py-3 rounded-xl border bg-white dark:bg-neutral-800/90 text-neutral-900 dark:text-white transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent',
              'placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
              'disabled:bg-neutral-100 dark:disabled:bg-neutral-800/50 disabled:text-neutral-400 dark:disabled:text-neutral-500 disabled:cursor-not-allowed',
              icon ? 'pl-11 pr-4' : 'px-4',
              error
                ? 'border-red-300 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-400'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';