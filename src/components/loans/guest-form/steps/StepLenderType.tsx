'use client';

import React from 'react';
import { Building2, Users, CreditCard, Loader2, Check, Star, Shield, Zap, Smartphone } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { ConnectedPaymentDisplay } from '@/components/payments';
import type { GuestLoanFormHook } from '../useGuestLoanForm';

type Props = Pick<
  GuestLoanFormHook,
  | 'isLoggedIn'
  | 'user'
  | 'lenderType'
  | 'setLenderType'
  | 'setValue'
  | 'requiresBankConnection'
  | 'bankConnected'
  | 'bankInfo'
  | 'connectingBank'
  | 'handleConnectBank'
  | 'loadingPaymentProviders'
  | 'loadingLimit'
  | 'borrowingLimit'
  | 'businessEligibility'
  | 'setStepError'
  | 'goToNextStep'
>;

export function StepLenderType({
  isLoggedIn,
  user,
  lenderType,
  setLenderType,
  setValue,
  requiresBankConnection,
  bankConnected,
  bankInfo,
  connectingBank,
  handleConnectBank,
  loadingPaymentProviders,
  loadingLimit,
  borrowingLimit,
  setStepError,
  goToNextStep,
}: Props) {
  const canSelectBusiness = !isLoggedIn || (
    (!requiresBankConnection || bankConnected) &&
    (user?.verification_status as string) === 'verified'
  );
  const canSelectPersonal = !isLoggedIn || !requiresBankConnection || bankConnected;

  return (
    <div className="pt-4 space-y-5 animate-fade-in">
      {/* Bank connection prompt — only when Dwolla is enabled */}
      {isLoggedIn && requiresBankConnection && !bankConnected && (
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-300">Connect Bank First</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Connect your bank account for automatic transfers.
              </p>
              <Button
                type="button"
                onClick={handleConnectBank}
                className="mt-3"
                size="sm"
                disabled={connectingBank}
              >
                {connectingBank ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                Connect Bank
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Bank connected status */}
      {isLoggedIn && requiresBankConnection && bankConnected && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-700 dark:text-green-300">
            Bank connected — {bankInfo?.bank_name} ••••{bankInfo?.account_mask}
          </span>
        </div>
      )}

      {/* Payment methods for logged-in users */}
      {isLoggedIn && !loadingPaymentProviders && (
        <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 to-white dark:from-green-900/10 dark:to-neutral-800">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="font-semibold text-neutral-900 dark:text-white">Where You'll Receive Funds</h3>
          </div>
          <ConnectedPaymentDisplay
            userId={(user?.id as string) ?? undefined}
            userCountry={(user?.country as string) || 'US'}
            bankConnected={bankConnected}
            bankName={bankInfo?.bank_name}
            bankAccountMask={bankInfo?.account_mask}
            showTitle={false}
            showAddPrompt={true}
            compact={false}
          />
        </Card>
      )}

      {/* For guests */}
      {!isLoggedIn && !loadingPaymentProviders && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <span className="text-sm text-blue-700 dark:text-blue-300">
            You'll add your Cash App, Venmo, or other payment method after signing up
          </span>
        </div>
      )}



      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight">
          Who do you want to borrow from?
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Choose your lender type to get started</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Business lender */}
        <button
          type="button"
          className={`w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            lenderType === 'business'
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 hover:border-neutral-300 dark:hover:border-neutral-600'
          } ${!canSelectBusiness ? 'opacity-50' : ''}`}
          onClick={() => {
            if (!canSelectBusiness) return;
            setLenderType('business');
            setValue('lenderType', 'business');
            setStepError(null);
          }}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${lenderType === 'business' ? 'bg-primary-100 dark:bg-primary-900/40' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
              <Building2 className={`w-6 h-6 ${lenderType === 'business' ? 'text-primary-600' : 'text-neutral-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-semibold text-neutral-900 dark:text-white text-sm">Business lender</span>
                <Zap className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Auto-matched instantly</p>
              {isLoggedIn && (user?.verification_status as string) !== 'verified' && (
                <p className="text-xs text-yellow-600 mt-0.5 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Needs verification
                </p>
              )}
            </div>
            {lenderType === 'business' && <Check className="w-5 h-5 text-primary-500 flex-shrink-0" />}
          </div>
        </button>

        {/* Personal lender */}
        <button
          type="button"
          className={`w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            lenderType === 'personal'
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 hover:border-neutral-300 dark:hover:border-neutral-600'
          } ${!canSelectPersonal ? 'opacity-50' : ''}`}
          onClick={() => {
            if (!canSelectPersonal) return;
            setLenderType('personal');
            setValue('lenderType', 'personal');
            setValue('interestRate', 0);
            setStepError(null);
          }}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${lenderType === 'personal' ? 'bg-primary-100 dark:bg-primary-900/40' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
              <Users className={`w-6 h-6 ${lenderType === 'personal' ? 'text-primary-600' : 'text-neutral-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-neutral-900 dark:text-white text-sm mb-0.5">Friend or family</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Invite someone you know</p>
            </div>
            {lenderType === 'personal' && <Check className="w-5 h-5 text-primary-500 flex-shrink-0" />}
          </div>
        </button>
      </div>

      <div className="pt-2 pb-1">
        <Button
          type="button"
          onClick={() => goToNextStep(2)}
          disabled={!lenderType || (isLoggedIn && requiresBankConnection && !bankConnected)}
          className="w-full rounded-2xl py-3 text-base font-semibold"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
