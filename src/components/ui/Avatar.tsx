import React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const colors = {
    light: [
      'bg-primary-500',
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-teal-500',
    ],
    dark: [
      'bg-primary-600',
      'bg-blue-600',
      'bg-purple-600',
      'bg-pink-600',
      'bg-orange-600',
      'bg-teal-600',
    ]
  };

  // Generate consistent color based on name
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.light.length;
  const bgColorLight = colors.light[colorIndex];
  const bgColorDark = colors.dark[colorIndex];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          'rounded-full object-cover border-2 border-white dark:border-neutral-800',
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white border-2 border-white dark:border-neutral-800',
        sizes[size],
        bgColorLight,
        'dark:' + bgColorDark,
        className
      )}
    >
      {initials}
    </div>
  );
}