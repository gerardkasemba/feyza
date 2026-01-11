import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  highlight?: boolean;
  className?: string;
}

export function StatsCard({ title, value, subtitle, icon: Icon, trend, highlight, className }: StatsCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border p-6 transition-all hover:shadow-lg',
        highlight ? 'border-amber-300 bg-amber-50' : 'border-neutral-200',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          'p-3 rounded-xl',
          highlight ? 'bg-amber-100' : 'bg-primary-50'
        )}>
          <Icon className={cn(
            'w-6 h-6',
            highlight ? 'text-amber-600' : 'text-primary-600'
          )} />
        </div>
        {trend && (
          <span
            className={cn(
              'text-sm font-medium px-2 py-1 rounded-full',
              trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            )}
          >
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <p className={cn('text-sm mb-1', highlight ? 'text-amber-700' : 'text-neutral-500')}>{title}</p>
      <p className={cn('text-2xl font-bold', highlight ? 'text-amber-900' : 'text-neutral-900')}>{value}</p>
      {subtitle && <p className={cn('text-xs mt-1', highlight ? 'text-amber-600' : 'text-neutral-400')}>{subtitle}</p>}
    </div>
  );
}
