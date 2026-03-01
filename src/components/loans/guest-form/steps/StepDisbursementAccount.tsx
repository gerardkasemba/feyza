'use client';

import React from 'react';
import { ChevronLeft, Building2, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import type { GuestLoanFormHook } from '../useGuestLoanForm';

type Props = Pick<
  GuestLoanFormHook,
  | 'isLoggedIn'
  | 'isDwollaEnabled'
  | 'bankInfo'
  | 'setStep'
  | 'setStepError'
  | 'guestFullName'
  | 'setGuestFullName'
  | 'guestEmail'
  | 'setGuestEmail'
  | 'guestPhone'
  | 'setGuestPhone'
  | 'guestPassword'
  | 'setGuestPassword'
  | 'guestConfirmPassword'
  | 'setGuestConfirmPassword'
  | 'showPassword'
  | 'setShowPassword'
  | 'goToNextStep'
>;

export function StepDisbursementAccount({
  isLoggedIn,
  isDwollaEnabled,
  bankInfo,
  setStep,
  setStepError,
  guestFullName,
  setGuestFullName,
  guestEmail,
  setGuestEmail,
  guestPhone,
  setGuestPhone,
  guestPassword,
  setGuestPassword,
  guestConfirmPassword,
  setGuestConfirmPassword,
  showPassword,
  setShowPassword,
  goToNextStep,
}: Props) {
  return (
    <div className="pt-4 space-y-5 animate-fade-in">
      <button
        type="button"
        onClick={() => { setStep(3); setStepError(null); }}
        className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      {isLoggedIn && isDwollaEnabled ? (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight mb-1">How to Receive Money</h2>
            <p className="text-neutral-500">Funds will be sent to your connected bank</p>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">Bank Transfer</p>
                <p className="text-sm text-green-700">
                  {bankInfo?.bank_name
                    ? `Funds will be sent to ${bankInfo.bank_name} (••••${bankInfo.account_mask})`
                    : 'Funds will be sent to your connected bank'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 pb-1">
            <Button type="button" onClick={() => goToNextStep(5)} className="w-full rounded-2xl py-3 text-base font-semibold">
              Continue
            </Button>
          </div>
        </>
      ) : !isLoggedIn ? (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight mb-1">Create Your Account</h2>
            <p className="text-neutral-500">Sign up to complete your loan request</p>
          </div>

          <Input
            label="Full Name *"
            value={guestFullName}
            onChange={(e) => setGuestFullName(e.target.value)}
            placeholder="John Doe"
          />
          <Input
            label="Email *"
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="john@example.com"
          />
          <Input
            label="Phone (Optional)"
            type="tel"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            placeholder="+1 234 567 8900"
          />

          <div>
            <label className="block text-sm font-medium mb-2">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={guestPassword}
                onChange={(e) => setGuestPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-primary-500 dark:bg-neutral-800 dark:border-neutral-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Input
            label="Confirm Password *"
            type={showPassword ? 'text' : 'password'}
            value={guestConfirmPassword}
            onChange={(e) => setGuestConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />

          <div className="pt-2 pb-1">
            <Button type="button" onClick={() => goToNextStep(5)} className="w-full rounded-2xl py-3 text-base font-semibold">
              Continue
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-neutral-600 dark:text-neutral-400">Please enable Dwolla to continue with your loan request.</p>
        </div>
      )}
    </div>
  );
}
