'use client';

import React from 'react';
import { ChevronLeft, Sparkles, Shield, Star, Zap, Calendar as CalendarIcon, Edit3 } from 'lucide-react';
import { Button, Input, Select, Card, Calendar as CalendarPicker } from '@/components/ui';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { ComfortLevel } from '@/lib/smartSchedule';
import { FREQUENCY_OPTIONS, CURRENCY_OPTIONS } from '../types';
import type { GuestLoanFormHook } from '../useGuestLoanForm';

type Props = Pick<
  GuestLoanFormHook,
  | 'setStep'
  | 'setStepError'
  | 'lenderType'
  | 'businessLenderInfo'
  | 'businessLenderId'
  | 'businessSlug'
  | 'presetMaxAmount'
  | 'maxLoanAmount'
  | 'loadingBusinessInfo'
  | 'register'
  | 'setValue'
  | 'amount'
  | 'totalInstallments'
  | 'interestRate'
  | 'totalInterest'
  | 'totalAmount'
  | 'repaymentAmount'
  | 'useSmartSchedule'
  | 'setUseSmartSchedule'
  | 'financialProfile'
  | 'incomeBasedSchedule'
  | 'selectedComfortLevel'
  | 'setSelectedComfortLevel'
  | 'repaymentPresets'
  | 'selectedPresetIndex'
  | 'setSelectedPresetIndex'
  | 'selectedStartDate'
  | 'setSelectedStartDate'
  | 'canProceedStep3'
  | 'goToNextStep'
>;

export function StepLoanDetails({
  setStep,
  setStepError,
  businessLenderInfo,
  businessLenderId,
  businessSlug,
  presetMaxAmount,
  maxLoanAmount,
  loadingBusinessInfo,
  register,
  setValue,
  amount,
  totalInstallments,
  interestRate,
  totalInterest,
  totalAmount,
  repaymentAmount,
  useSmartSchedule,
  setUseSmartSchedule,
  financialProfile,
  incomeBasedSchedule,
  selectedComfortLevel,
  setSelectedComfortLevel,
  repaymentPresets,
  selectedPresetIndex,
  setSelectedPresetIndex,
  selectedStartDate,
  setSelectedStartDate,
  canProceedStep3,
  goToNextStep,
}: Props) {
  const isDirectLoan = !!(businessLenderId || businessSlug);

  // While the trust API is resolving the lender-configured max amount,
  // show a spinner rather than the form with a misleading $0 or $500 limit.
  if (loadingBusinessInfo) {
    return (
      <div className="pt-8 flex flex-col items-center gap-3 text-neutral-500 dark:text-neutral-400 text-sm">
        <svg className="animate-spin w-6 h-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>Loading your personalised limit…</span>
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-5 animate-fade-in">
      {businessLenderInfo && (
        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
          <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
            Applying to: {(businessLenderInfo as { business_name?: string }).business_name}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => { setStep(2); setStepError(null); }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 -ml-1 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight mb-1">Loan Details</h2>
        <p className="text-neutral-500">Specify the amount and repayment terms</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Input
            label="Principal Amount *"
            type="number"
            placeholder="1000"
            min="1"
            max={maxLoanAmount}
            {...register('amount', { valueAsNumber: true })}
            helperText={
              presetMaxAmount
                ? `Maximum available: $${presetMaxAmount.toLocaleString()}`
                : isDirectLoan
                  ? `First-time limit: ${formatCurrency(maxLoanAmount)}`
                  : `Maximum: ${formatCurrency(maxLoanAmount)}`
            }
          />
        </div>
        <Select label="Currency *" options={CURRENCY_OPTIONS} {...register('currency')} />
      </div>

      <Input label="Purpose (optional)" placeholder="e.g., Business supplies, emergency" {...register('purpose')} />

      {amount > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">Repayment Schedule *</label>
            <button
              type="button"
              onClick={() => setUseSmartSchedule(!useSmartSchedule)}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              {useSmartSchedule ? <><Edit3 className="w-4 h-4" /> Custom</> : <><Zap className="w-4 h-4" /> Smart</>}
            </button>
          </div>

          {useSmartSchedule ? (
            <>
              {financialProfile && incomeBasedSchedule?.suggestions ? (
                <div className="space-y-4">
                  <div className="p-3 bg-gradient-to-r from-green-50 to-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center gap-2 text-green-700">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Personalized for your income ({formatCurrency(incomeBasedSchedule.disposableIncome ?? 0)}/mo disposable)
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {(['comfortable', 'balanced', 'aggressive'] as ComfortLevel[]).map((level) => {
                      const suggestion = incomeBasedSchedule.suggestions![level];
                      const isSelected = selectedComfortLevel === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setSelectedComfortLevel(level)}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-green-500 bg-green-50' : 'border-neutral-200 hover:border-neutral-300'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-green-100' : 'bg-neutral-100'}`}>
                                {level === 'comfortable' && <Shield className={`w-5 h-5 ${isSelected ? 'text-green-600' : 'text-neutral-500'}`} />}
                                {level === 'balanced' && <Star className={`w-5 h-5 ${isSelected ? 'text-green-600' : 'text-neutral-500'}`} />}
                                {level === 'aggressive' && <Zap className={`w-5 h-5 ${isSelected ? 'text-green-600' : 'text-neutral-500'}`} />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium capitalize">{level}</p>
                                  {level === 'balanced' && <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Recommended</span>}
                                </div>
                                <p className="text-sm text-neutral-500">{suggestion.numberOfPayments} payments • {suggestion.percentOfDisposable}% of disposable</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{formatCurrency(suggestion.amount)}</p>
                              <p className="text-xs text-neutral-500">~{suggestion.weeksToPayoff} weeks</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : repaymentPresets.length > 0 ? (
                <div className="grid gap-3">
                  {repaymentPresets.map((preset, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedPresetIndex(index)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedPresetIndex === index ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedPresetIndex === index ? 'bg-primary-100' : 'bg-neutral-100'}`}>
                            <CalendarIcon className={`w-5 h-5 ${selectedPresetIndex === index ? 'text-primary-600' : 'text-neutral-500'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{preset.label}</p>
                              {preset.recommended && <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">Recommended</span>}
                            </div>
                            <p className="text-sm text-neutral-500">
                              {preset.frequency === 'weekly' ? 'Weekly' : preset.frequency === 'biweekly' ? 'Bi-weekly' : 'Monthly'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(preset.paymentAmount)}</p>
                          <p className="text-xs text-neutral-500">per payment</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-neutral-50 rounded-xl text-center text-neutral-500">Enter an amount to see options</div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label="Frequency" options={FREQUENCY_OPTIONS} {...register('repaymentFrequency')} />
              <Input label="Number of Installments" type="number" placeholder="10" min="1" {...register('totalInstallments', { valueAsNumber: true })} />
            </div>
          )}
        </div>
      )}

      {(!amount || amount <= 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Repayment Frequency *" options={FREQUENCY_OPTIONS} {...register('repaymentFrequency')} />
          <Input label="Number of Installments *" type="number" placeholder="10" min="1" {...register('totalInstallments', { valueAsNumber: true })} />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Start Date *</label>
        <CalendarPicker
          selectedDate={selectedStartDate}
          onDateSelect={setSelectedStartDate}
          minDate={new Date()}
          placeholder="Select start date"
        />
      </div>

      {amount > 0 && totalInstallments > 0 && (
        <Card className="bg-neutral-50 dark:bg-neutral-800">
          <h4 className="font-semibold mb-2">Loan Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-neutral-500">Principal:</span>
            <span className="text-right font-medium">{formatCurrency(amount)}</span>
            {interestRate > 0 && (
              <>
                <span className="text-neutral-500">Interest Rate:</span>
                <span className="text-right font-medium">{formatPercentage(interestRate)}</span>
                <span className="text-neutral-500">Total Interest:</span>
                <span className="text-right font-medium text-orange-600">{formatCurrency(totalInterest)}</span>
              </>
            )}
            <span className="text-neutral-500 font-medium">Total to Repay:</span>
            <span className="text-right font-bold text-primary-600">{formatCurrency(totalAmount)}</span>
            <span className="text-neutral-500">Per Installment:</span>
            <span className="text-right font-medium">{formatCurrency(repaymentAmount)}</span>
          </div>
        </Card>
      )}

      <div className="pt-2 pb-1">
        <Button
          type="button"
          onClick={() => goToNextStep(4)}
          disabled={!canProceedStep3()}
          className="w-full rounded-2xl py-3 text-base font-semibold"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
