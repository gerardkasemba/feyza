'use client';

import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useGuestLoanForm } from './guest-form/useGuestLoanForm';
import { FormProgressBar } from './guest-form/FormProgressBar';
import { StepLenderType } from './guest-form/steps/StepLenderType';
import { StepSelectLender } from './guest-form/steps/StepSelectLender';
import { StepLoanDetails } from './guest-form/steps/StepLoanDetails';
import { StepDisbursementAccount } from './guest-form/steps/StepDisbursementAccount';
import { StepIdentity } from './guest-form/steps/StepIdentity';
import { StepEmployment } from './guest-form/steps/StepEmployment';
import { StepAddress } from './guest-form/steps/StepAddress';
import { StepBankTransfer } from './guest-form/steps/StepBankTransfer';
import { StepPaymentMethods } from './guest-form/steps/StepPaymentMethods';
import { StepAgreement } from './guest-form/steps/StepAgreement';
import type { GuestLoanRequestFormProps } from './guest-form/types';

export default function GuestLoanRequestForm(props: GuestLoanRequestFormProps = {}) {
  const form = useGuestLoanForm(props);

  if (form.initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const isAgreementStep =
    (form.isLoggedIn && form.step === 5) ||
    (!form.isLoggedIn && form.lenderType === 'personal' && form.step === 6) ||
    (!form.isLoggedIn && form.lenderType === 'business' && form.step === 9);

  return (
    <form onSubmit={form.handleFormSubmit} className="flex flex-col">
      <FormProgressBar
        step={form.step}
        totalSteps={form.totalSteps}
        progressPercent={form.progressPercent}
      />

      {/* Error display */}
      {(form.stepError || form.submitError) && (
        <div className="mt-3 mb-1 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">
            {form.stepError || form.submitError}
          </p>
        </div>
      )}

      {/* Step 1: Lender type */}
      {form.step === 1 && <StepLenderType {...form} />}

      {/* Step 2: Select lender / invite */}
      {form.step === 2 && <StepSelectLender {...form} />}

      {/* Step 3: Loan details */}
      {form.step === 3 && <StepLoanDetails {...form} />}

      {/* Step 4: Account creation (guest) or disbursement (logged-in with Dwolla) */}
      {form.step === 4 && <StepDisbursementAccount {...form} />}

      {/* Steps 5-8: Guest business verification flow */}
      {!form.isLoggedIn && form.lenderType === 'business' && form.step === 5 && <StepIdentity {...form} />}
      {!form.isLoggedIn && form.lenderType === 'business' && form.step === 6 && <StepEmployment {...form} />}
      {!form.isLoggedIn && form.lenderType === 'business' && form.step === 7 && <StepAddress {...form} />}
      {!form.isLoggedIn && form.lenderType === 'business' && form.step === 8 && <StepBankTransfer {...form} />}

      {/* Step 5: Guest personal payment methods */}
      {!form.isLoggedIn && form.lenderType === 'personal' && form.step === 5 && <StepPaymentMethods {...form} />}

      {/* Final step: Agreement & submit */}
      {isAgreementStep && <StepAgreement {...form} />}
    </form>
  );
}
