'use client';
import React from 'react';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('useManualPaymentModal');
import type { PlatformFeeSettings, FeeCalculation } from '@/lib/platformFee';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loan, PaymentScheduleItem, UserProfile } from '@/types';
import { useToast } from '@/components/ui/Alert';

interface UseManualPaymentModalParams {
  loan: Loan | null;
  user: UserProfile | null;
  schedule: PaymentScheduleItem[];
  setLoan: React.Dispatch<React.SetStateAction<Loan | null>>;
  refetchLoan: () => Promise<void>;
  refetchSchedule: () => Promise<void>;
  feeSettings: PlatformFeeSettings;
  calculateFee: (amount: number) => FeeCalculation;
}

export function useManualPaymentModal({
  loan,
  user,
  schedule,
  setLoan,
  refetchLoan,
  refetchSchedule,
  feeSettings,
  calculateFee,
}: UseManualPaymentModalParams) {
  const { showToast } = useToast();
  const supabase = createClient();

  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false);
  const [manualPaymentId, setManualPaymentId] = useState<string | null>(null);
  const [manualPaymentMethod, setManualPaymentMethod] = useState<string>('');
  const [manualPaymentReference, setManualPaymentReference] = useState('');
  const [manualPaymentProofFile, setManualPaymentProofFile] = useState<File | null>(null);
  const [manualPaymentProofPreview, setManualPaymentProofPreview] = useState<string | null>(null);
  const [submittingManualPayment, setSubmittingManualPayment] = useState(false);

  const handleOpenManualPayment = (paymentId: string) => {
    setManualPaymentId(paymentId);
    setManualPaymentMethod('');
    setManualPaymentReference('');
    setManualPaymentProofFile(null);
    setManualPaymentProofPreview(null);
    setShowManualPaymentModal(true);
  };

  const handleManualPaymentProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setManualPaymentProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setManualPaymentProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitManualPayment = async () => {
    if (!loan || !manualPaymentId || !manualPaymentMethod || !manualPaymentProofFile) {
      showToast({ type: 'warning', title: 'Required Fields', message: 'Please select payment method and upload proof' });
      return;
    }

    setSubmittingManualPayment(true);
    try {
      const fileExt = manualPaymentProofFile.name.split('.').pop();
      const fileName = `${user?.id}_${manualPaymentId}_${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('loan-documents')
        .upload(filePath, manualPaymentProofFile);

      let proofUrl: string | null = null;
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('loan-documents').getPublicUrl(filePath);
        proofUrl = publicUrl;
      }

      const payment = schedule.find((p) => p.id === manualPaymentId);
      const feeCalc = feeSettings?.enabled && payment ? calculateFee(payment.amount) : null;
      const platformFee = feeCalc?.platformFee || 0;

      const response = await fetch('/api/payments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: loan.id,
          paymentId: manualPaymentId,
          paymentMethod: manualPaymentMethod,
          transactionReference: manualPaymentReference || null,
          proofUrl,
          platformFee,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to process payment');

      if (result.success) {
        setLoan((prev) =>
          prev
            ? {
                ...prev,
                amount_paid: result.newAmountPaid,
                amount_remaining: result.newAmountRemaining,
                status: result.isComplete ? 'completed' : prev.status,
              }
            : prev
        );
      }

      showToast({ type: 'success', title: 'Payment Submitted', message: 'Your payment has been recorded. The lender will be notified.' });

      setShowManualPaymentModal(false);
      setManualPaymentId(null);
      setManualPaymentMethod('');
      setManualPaymentReference('');
      setManualPaymentProofFile(null);
      setManualPaymentProofPreview(null);

      refetchLoan();
      refetchSchedule();
    } catch (error: unknown) {
      log.error('Error submitting manual payment:', error);
      showToast({ type: 'error', title: 'Error', message: (error as Error).message || 'Failed to submit payment' });
    } finally {
      setSubmittingManualPayment(false);
    }
  };

  return {
    showManualPaymentModal,
    setShowManualPaymentModal,
    manualPaymentId,
    manualPaymentMethod,
    setManualPaymentMethod,
    manualPaymentReference,
    setManualPaymentReference,
    manualPaymentProofFile,
    setManualPaymentProofFile,
    manualPaymentProofPreview,
    setManualPaymentProofPreview,
    submittingManualPayment,
    handleOpenManualPayment,
    handleManualPaymentProofChange,
    handleSubmitManualPayment,
  };
}
