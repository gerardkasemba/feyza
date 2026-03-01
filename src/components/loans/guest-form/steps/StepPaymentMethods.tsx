'use client';

import React from 'react';
import { ChevronLeft, Building, CheckCircle, Loader2, Wallet } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import type { GuestLoanFormHook } from '../useGuestLoanForm';

type Props = Pick<
  GuestLoanFormHook,
  | 'setStep'
  | 'setStepError'
  | 'requiresBankConnection'
  | 'bankConnected'
  | 'bankInfo'
  | 'plaidLoaded'
  | 'connectingBank'
  | 'handleConnectBank'
  | 'guestFullName'
  | 'guestEmail'
  | 'guestCashapp'
  | 'setGuestCashapp'
  | 'guestVenmo'
  | 'setGuestVenmo'
  | 'guestZelle'
  | 'setGuestZelle'
  | 'goToNextStep'
>;

export function StepPaymentMethods({
  setStep,
  setStepError,
  requiresBankConnection,
  bankConnected,
  bankInfo,
  plaidLoaded,
  connectingBank,
  handleConnectBank,
  guestFullName,
  guestEmail,
  guestCashapp,
  setGuestCashapp,
  guestVenmo,
  setGuestVenmo,
  guestZelle,
  setGuestZelle,
  goToNextStep,
}: Props) {
  return (
    <div className="pt-4 space-y-5 animate-fade-in">
      <button
        type="button"
        onClick={() => { setStep(4); setStepError(null); }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 -ml-1 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight mb-1">
          {requiresBankConnection ? 'Connect Your Bank' : 'How to Receive Money'}
        </h2>
        <p className="text-neutral-500">
          {requiresBankConnection
            ? 'Funds will be sent directly to your bank account'
            : 'Your lender will send funds via Cash App, Venmo, or another method'}
        </p>
      </div>

      {requiresBankConnection ? (
        <div className="rounded-2xl border border-neutral-200">
          <div className="p-4 bg-neutral-50">
            <p className="text-sm font-semibold">Bank Connection *</p>
          </div>
          <div className="p-4">
            {bankConnected && bankInfo ? (
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-green-700" />
                <div>
                  <p className="font-semibold">{bankInfo.bank_name}</p>
                  <p className="text-xs text-neutral-500">••••{bankInfo.account_mask}</p>
                </div>
                <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleConnectBank}
                disabled={!plaidLoaded || connectingBank || !guestFullName || !guestEmail}
                className="w-full"
              >
                {connectingBank ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Building className="w-4 h-4 mr-2" />}
                Connect Bank
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-900">Manual Payment</p>
                <p className="text-sm text-blue-700">Your lender will send funds directly</p>
              </div>
            </div>
            <p className="text-sm text-blue-800">
              Once your loan is approved, you'll receive payment via Cash App, Venmo, Zelle, or another method.
              You'll confirm receipt in the app.
            </p>
          </div>

          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
            <p className="text-sm font-medium text-neutral-700 mb-3">Add your payment info (optional)</p>
            <div className="grid gap-3">
              <Input
                label="Cash App $Cashtag"
                placeholder="$username"
                value={guestCashapp}
                onChange={(e) => setGuestCashapp(e.target.value)}
              />
              <Input
                label="Venmo @username"
                placeholder="@username"
                value={guestVenmo}
                onChange={(e) => setGuestVenmo(e.target.value)}
              />
              <Input
                label="Zelle Email/Phone"
                placeholder="email@example.com or phone number"
                value={guestZelle}
                onChange={(e) => setGuestZelle(e.target.value)}
              />
            </div>
            <p className="text-xs text-neutral-500 mt-2">This helps your lender know where to send funds</p>
          </div>
        </div>
      )}

      <div className="pt-2 pb-1">
        <Button
          type="button"
          onClick={() => goToNextStep(6)}
          disabled={requiresBankConnection && !bankConnected}
          className="w-full rounded-2xl py-3 text-base font-semibold"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
