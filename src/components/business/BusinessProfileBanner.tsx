'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Building2 } from 'lucide-react';
import { BusinessProfile } from '@/types';

interface BusinessProfileBannerProps {
  business: BusinessProfile;
}

export function BusinessProfileBanner({ business }: BusinessProfileBannerProps) {
  // Check what's missing
  const missing: string[] = [];
  
  if (!business.description) missing.push('business description');
  if (!business.location) missing.push('location');
  if (!business.contact_email) missing.push('contact email');
  if (!business.contact_phone) missing.push('contact phone');
  if (!business.default_interest_rate && business.default_interest_rate !== 0) missing.push('interest rate settings');

  // If profile is complete or marked as complete, don't show banner
  if (business.profile_completed || missing.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900">Complete Your Business Profile</h3>
          <p className="text-sm text-yellow-700 mt-1">
            Your business profile is incomplete. Please add the following to start accepting loan requests:
          </p>
          <ul className="text-sm text-yellow-700 mt-2 space-y-1">
            {missing.map((item, index) => (
              <li key={index}>• {item.charAt(0).toUpperCase() + item.slice(1)}</li>
            ))}
          </ul>
          <Link
            href="/business/settings"
            className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-yellow-800 hover:text-yellow-900"
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
