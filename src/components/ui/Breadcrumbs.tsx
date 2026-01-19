'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

export function Breadcrumbs({ items, showHome = true }: BreadcrumbsProps) {
  const allItems = showHome 
    ? [{ label: 'Home', href: '/' }, ...items]
    : items;

  return (
    <nav className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 mb-4 flex-wrap">
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        
        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 flex-shrink-0" />
            )}
            {item.href && !isLast ? (
              <Link 
                href={item.href}
                className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1"
              >
                {index === 0 && showHome && <Home className="w-3.5 h-3.5" />}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span className={
                isLast 
                  ? 'text-neutral-900 dark:text-white font-medium' 
                  : 'text-neutral-500 dark:text-neutral-400'
              }>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}