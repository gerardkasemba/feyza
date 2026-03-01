'use client';

import React from 'react';
import { ChevronLeft, Upload, Building, CheckCircle, Loader2 } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';
import { COUNTRIES, ADDRESS_DOC_TYPES } from '../types';
import type { GuestLoanFormHook } from '../useGuestLoanForm';

type Props = Pick<
  GuestLoanFormHook,
  | 'setStep'
  | 'setStepError'
  | 'addressLine1'
  | 'setAddressLine1'
  | 'city'
  | 'setCity'
  | 'country'
  | 'setCountry'
  | 'addressDocumentType'
  | 'setAddressDocumentType'
  | 'addressDocumentFile'
  | 'setAddressDocumentFile'
  | 'bankConnected'
  | 'bankInfo'
  | 'plaidLoaded'
  | 'connectingBank'
  | 'handleConnectBank'
  | 'goToNextStep'
>;

export function StepAddress({
  setStep,
  setStepError,
  addressLine1,
  setAddressLine1,
  city,
  setCity,
  country,
  setCountry,
  addressDocumentType,
  setAddressDocumentType,
  addressDocumentFile,
  setAddressDocumentFile,
  bankConnected,
  bankInfo,
  plaidLoaded,
  connectingBank,
  handleConnectBank,
  goToNextStep,
}: Props) {
  return (
    <div className="pt-4 space-y-5 animate-fade-in">
      <button
        type="button"
        onClick={() => { setStep(6); setStepError(null); }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 -ml-1 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors active:scale-95"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white leading-tight mb-1">Address & Bank</h2>
        <p className="text-neutral-500">Final verification step</p>
      </div>

      <Input label="Address *" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="123 Main St" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="City *" value={city} onChange={(e) => setCity(e.target.value)} placeholder="New York" />
        <Select label="Country *" value={country} onChange={(e) => setCountry(e.target.value)} options={COUNTRIES} />
      </div>
      <Select
        label="Proof of Address Type *"
        value={addressDocumentType}
        onChange={(e) => setAddressDocumentType(e.target.value)}
        options={ADDRESS_DOC_TYPES}
      />

      <div>
        <label className="block text-sm font-medium mb-1.5">Upload Proof *</label>
        <div className="border-2 border-dashed border-neutral-300 rounded-xl p-6 text-center">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setAddressDocumentFile(e.target.files?.[0] || null)}
            className="hidden"
            id="addr-upload"
          />
          <label htmlFor="addr-upload" className="cursor-pointer">
            <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            {addressDocumentFile
              ? <p className="text-sm text-green-600 font-medium">{addressDocumentFile.name}</p>
              : <p className="text-sm text-neutral-600">Click to upload</p>}
          </label>
        </div>
      </div>

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
              disabled={!plaidLoaded || connectingBank}
              className="w-full"
            >
              {connectingBank ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Building className="w-4 h-4 mr-2" />}
              Connect Bank
            </Button>
          )}
        </div>
      </div>

      <div className="pt-2 pb-1">
        <Button type="button" onClick={() => goToNextStep(8)} className="w-full rounded-2xl py-3 text-base font-semibold">
          Continue
        </Button>
      </div>
    </div>
  );
}
