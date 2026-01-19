import React from 'react';
import { cn } from '@/lib/utils';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full px-4 py-3 rounded-xl border transition-all duration-200 resize-none',
            'bg-white dark:bg-neutral-800',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent',
            'placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
            'text-neutral-900 dark:text-white',
            error
              ? 'border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-500'
              : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600',
            className
          )}
          {...props}
        />
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

TextArea.displayName = 'TextArea';