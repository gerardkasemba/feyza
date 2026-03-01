'use client';

import React from 'react';

interface FormProgressBarProps {
  step: number;
  totalSteps: number;
  progressPercent: number;
}

export function FormProgressBar({ step, totalSteps, progressPercent }: FormProgressBarProps) {
  return (
    <div className="sticky top-0 z-10 backdrop-blur-sm pt-3 pb-4 -mx-1 px-1">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={[
                'rounded-full transition-all duration-300',
                i === step - 1
                  ? 'bg-primary-500 w-6 h-2.5'
                  : i < step
                    ? 'bg-primary-500 w-4 h-2'
                    : 'bg-neutral-200 dark:bg-neutral-700 w-2 h-2',
              ].join(' ')}
            />
          ))}
        </div>
        <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 tabular-nums">
          {step} / {totalSteps}
        </span>
      </div>
      <div className="h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
