'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('useFundsModal');

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loan } from '@/types';
import { useToast } from '@/components/ui/Alert';

export function useFundsModal(loan: Loan | null, setLoan: React.Dispatch<React.SetStateAction<Loan | null>>) {
  const { showToast } = useToast();

  const [showFundsModal, setShowFundsModal] = useState(false);
  const [fundsSending, setFundsSending] = useState(false);
  const [fundsReference, setFundsReference] = useState('');
  const [fundsPaymentMethod, setFundsPaymentMethod] = useState<'paypal' | 'cashapp' | 'venmo'>('paypal');
  const [fundsProofFile, setFundsProofFile] = useState<File | null>(null);
  const [fundsProofPreview, setFundsProofPreview] = useState<string | null>(null);

  const handleSendFunds = async () => {
    if (!loan) return;

    if (!fundsProofFile) {
      showToast({ type: 'warning', title: 'Proof Required', message: 'Please upload a screenshot proof of payment' });
      return;
    }

    setFundsSending(true);
    try {
      const supabase = createClient();
      const fileExt = fundsProofFile.name.split('.').pop();
      const fileName = `${loan.id}_${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('loan-documents')
        .upload(filePath, fundsProofFile);

      let proofUrl: string | null = null;
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('loan-documents').getPublicUrl(filePath);
        proofUrl = publicUrl;
      }

      const response = await fetch(`/api/loans/${loan.id}/funds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: fundsPaymentMethod,
          reference: fundsReference,
          proof_url: proofUrl,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setLoan((prev: Loan | null) => prev ? ({
          ...prev,
          funds_sent: true,
          funds_sent_at: new Date().toISOString(),
          funds_sent_method: fundsPaymentMethod as Loan['funds_sent_method'],
          status: result.status || 'active',
        }) : null);
        setShowFundsModal(false);
        setFundsReference('');
        setFundsProofFile(null);
        setFundsProofPreview(null);
        showToast({ type: 'success', title: 'Funds Sent', message: 'Payment confirmation recorded successfully' });
      } else {
        const error = await response.json();
        showToast({ type: 'error', title: 'Failed', message: error.error || 'Failed to confirm funds sent' });
      }
    } catch (error) {
      log.error('Error sending funds:', error);
      showToast({ type: 'error', title: 'Error', message: 'Failed to confirm funds sent' });
    } finally {
      setFundsSending(false);
    }
  };

  return {
    showFundsModal,
    setShowFundsModal,
    fundsSending,
    fundsReference,
    setFundsReference,
    fundsPaymentMethod,
    setFundsPaymentMethod,
    fundsProofFile,
    setFundsProofFile,
    fundsProofPreview,
    setFundsProofPreview,
    handleSendFunds,
  };
}
