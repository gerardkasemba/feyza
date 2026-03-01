'use client';

import React from 'react';
import { ChevronLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui';
import type { GuestLoanFormHook } from '../useGuestLoanForm';

type Props = Pick<
  GuestLoanFormHook,
  | 'setStep'
  | 'setStepError'
  | 'bankInfo'
  | 'goToNextStep'
>;

export function StepBankTransfer({ setStep, setStepError, bankInfo, goToNextStep }: Props) {
  return (
    <div className="pt-4 space-y-5 animate-fade-in">
      <button
        type="button"
        onClick={() => { setStep(7); setStepError(null); }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 -ml-1 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

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
                ? `${bankInfo.bank_name} (••••${bankInfo.account_mask})`
                : 'Your connected bank account'}
            </p>
          </div>
        </div>
      </div>

      <div className="pt-2 pb-1">
        <Button type="button" onClick={() => goToNextStep(9)} className="w-full rounded-2xl py-3 text-base font-semibold">
          Continue
        </Button>
      </div>
    </div>
  );
}
