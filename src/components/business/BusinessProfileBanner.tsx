'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Building2 } from 'lucide-react';
import { BusinessProfile } from '@/types';
import { GiReceiveMoney, GiOfficeChair, GiSmartphone, GiPayMoney, GiMoneyStack } from 'react-icons/gi';
import { MdLocationOn, MdEmail, MdPhone } from 'react-icons/md';
import { FaPercent, FaInfoCircle } from 'react-icons/fa';

interface BusinessProfileBannerProps {
  business: BusinessProfile;
}

export function BusinessProfileBanner({ business }: BusinessProfileBannerProps) {
  // Check what's missing with icons
  const missingItems = [
    { 
      key: 'description', 
      label: 'business description',
      icon: FaInfoCircle 
    },
    { 
      key: 'location', 
      label: 'location',
      icon: MdLocationOn 
    },
    { 
      key: 'contact_email', 
      label: 'contact email',
      icon: MdEmail 
    },
    { 
      key: 'contact_phone', 
      label: 'contact phone',
      icon: MdPhone 
    },
    { 
      key: 'default_interest_rate', 
      label: 'interest rate settings',
      icon: FaPercent 
    },
  ];

  const missing = missingItems.filter(item => {
    if (item.key === 'default_interest_rate') {
      return business.default_interest_rate === undefined || business.default_interest_rate === null;
    }
    return !business[item.key as keyof BusinessProfile];
  });

  // If profile is complete or marked as complete, don't show banner
  if (business.profile_completed || missing.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-800/50 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-300">Complete Your Business Profile</h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
            Your business profile is incomplete. Please add the following to start accepting loan requests:
          </p>
          <ul className="text-sm text-yellow-700 dark:text-yellow-400 mt-3 space-y-2">
            {missing.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <li key={index} className="flex items-center gap-2">
                  <IconComponent className="w-4 h-4 flex-shrink-0" />
                  <span className="capitalize">{item.label}</span>
                </li>
              );
            })}
          </ul>
          <Link
            href="/business/settings"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-yellow-100 dark:bg-yellow-800/50 hover:bg-yellow-200 dark:hover:bg-yellow-800 text-yellow-800 dark:text-yellow-300 rounded-lg text-sm font-medium transition-colors"
          >
            <Building2 className="w-4 h-4" />
            Complete Profile
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}