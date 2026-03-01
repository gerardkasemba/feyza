'use client';

import React from 'react';
import { ChevronLeft, Upload } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';
import { ID_TYPES } from '../types';
import type { GuestLoanFormHook } from '../useGuestLoanForm';

type Props = Pick<
  GuestLoanFormHook,
  | 'setStep'
  | 'setStepError'
  | 'idType'
  | 'setIdType'
  | 'idNumber'
  | 'setIdNumber'
  | 'idExpiry'
  | 'setIdExpiry'
  | 'idDocumentFile'
  | 'setIdDocumentFile'
  | 'goToNextStep'
>;

export function StepIdentity({
  setStep,
  setStepError,
  idType,
  setIdType,
  idNumber,
  setIdNumber,
  idExpiry,
  setIdExpiry,
  idDocumentFile,
  setIdDocumentFile,
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
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight mb-1">Identity Verification</h2>
        <p className="text-neutral-500">Required for business loans</p>
      </div>

      <Select label="ID Type *" value={idType} onChange={(e) => setIdType(e.target.value)} options={ID_TYPES} />
      <Input label="ID Number *" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="Enter ID number" />
      <Input label="ID Expiry (Optional)" type="date" value={idExpiry} onChange={(e) => setIdExpiry(e.target.value)} />

      <div>
        <label className="block text-sm font-medium mb-1.5">Upload ID Document *</label>
        <div className="border-2 border-dashed border-neutral-300 rounded-xl p-6 text-center">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setIdDocumentFile(e.target.files?.[0] || null)}
            className="hidden"
            id="id-upload"
          />
          <label htmlFor="id-upload" className="cursor-pointer">
            <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            {idDocumentFile
              ? <p className="text-sm text-green-600 font-medium">{idDocumentFile.name}</p>
              : <p className="text-sm text-neutral-600">Click to upload</p>}
          </label>
        </div>
      </div>

      <div className="pt-2 pb-1">
        <Button type="button" onClick={() => goToNextStep(6)} className="w-full rounded-2xl py-3 text-base font-semibold">
          Continue
        </Button>
      </div>
    </div>
  );
}
