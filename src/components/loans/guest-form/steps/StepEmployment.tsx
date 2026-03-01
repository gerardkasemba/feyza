'use client';

import React from 'react';
import { ChevronLeft, Upload } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';
import { EMPLOYMENT_STATUSES } from '../types';
import type { GuestLoanFormHook } from '../useGuestLoanForm';

type Props = Pick<
  GuestLoanFormHook,
  | 'setStep'
  | 'setStepError'
  | 'employmentStatus'
  | 'setEmploymentStatus'
  | 'employerName'
  | 'setEmployerName'
  | 'employmentStartDate'
  | 'setEmploymentStartDate'
  | 'monthlyIncome'
  | 'setMonthlyIncome'
  | 'employmentDocumentFile'
  | 'setEmploymentDocumentFile'
  | 'goToNextStep'
>;

export function StepEmployment({
  setStep,
  setStepError,
  employmentStatus,
  setEmploymentStatus,
  employerName,
  setEmployerName,
  employmentStartDate,
  setEmploymentStartDate,
  monthlyIncome,
  setMonthlyIncome,
  employmentDocumentFile,
  setEmploymentDocumentFile,
  goToNextStep,
}: Props) {
  return (
    <div className="pt-4 space-y-5 animate-fade-in">
      <button
        type="button"
        onClick={() => { setStep(5); setStepError(null); }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 -ml-1 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight mb-1">Employment Information</h2>
        <p className="text-neutral-500">Help us verify your income</p>
      </div>

      <Select
        label="Employment Status *"
        value={employmentStatus}
        onChange={(e) => setEmploymentStatus(e.target.value)}
        options={EMPLOYMENT_STATUSES}
      />
      <Input
        label="Employer Name *"
        value={employerName}
        onChange={(e) => setEmployerName(e.target.value)}
        placeholder="Company name"
      />
      <Input
        label="Employment Start Date *"
        type="date"
        value={employmentStartDate}
        onChange={(e) => setEmploymentStartDate(e.target.value)}
      />
      <Input
        label="Monthly Income (Optional)"
        type="number"
        value={monthlyIncome}
        onChange={(e) => setMonthlyIncome(e.target.value)}
        placeholder="5000"
      />

      <div>
        <label className="block text-sm font-medium mb-1.5">Upload Proof of Employment *</label>
        <div className="border-2 border-dashed border-neutral-300 rounded-xl p-6 text-center">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setEmploymentDocumentFile(e.target.files?.[0] || null)}
            className="hidden"
            id="emp-upload"
          />
          <label htmlFor="emp-upload" className="cursor-pointer">
            <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            {employmentDocumentFile
              ? <p className="text-sm text-green-600 font-medium">{employmentDocumentFile.name}</p>
              : <p className="text-sm text-neutral-600">Click to upload</p>}
          </label>
        </div>
      </div>

      <div className="pt-2 pb-1">
        <Button type="button" onClick={() => goToNextStep(7)} className="w-full rounded-2xl py-3 text-base font-semibold">
          Continue
        </Button>
      </div>
    </div>
  );
}
