'use client';

import React, { useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { 
  CreditCard, ExternalLink, CheckCircle, AlertCircle, 
  DollarSign, Calendar, ArrowRight 
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PayPalPaymentProps {
  loanId: string;
  scheduleId?: string;
  amount: number;
  currency: string;
  recipientEmail: string;
  recipientName: string;
  dueDate?: string;
  onPaymentComplete: (transactionId?: string) => Promise<void>;
  isRepayment?: boolean;
}

export function PayPalPayment({
  loanId,
  scheduleId,
  amount,
  currency,
  recipientEmail,
  recipientName,
  dueDate,
  onPaymentComplete,
  isRepayment = true,
}: PayPalPaymentProps) {
  const [processing, setProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Create PayPal payment URL
  const getPayPalUrl = () => {
    const itemName = isRepayment 
      ? `Loan repayment to ${recipientName}`
      : `Loan to ${recipientName}`;
    
    return `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(recipientEmail)}&amount=${amount}&currency_code=${currency}&item_name=${encodeURIComponent(itemName)}`;
  };

  const handleConfirmPayment = async () => {
    setProcessing(true);
    setError(null);

    try {
      await onPaymentComplete(transactionId || undefined);
      setShowConfirm(false);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to record payment');
    } finally {
      setProcessing(false);
    }
  };

  const paypalUrl = getPayPalUrl();

  if (showConfirm) {
    return (
      <Card>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900">Confirm Payment</h3>
          <p className="text-neutral-500">
            Did you complete the {formatCurrency(amount, currency)} payment?
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <Input
            label="PayPal Transaction ID (optional)"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="e.g., 1AB23456CD789012E"
            helperText="Found in your PayPal receipt email"
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowConfirm(false)}
          >
            Go Back
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirmPayment}
            loading={processing}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirm Payment
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <DollarSign className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900">
          {isRepayment ? 'Make Payment' : 'Send Loan'}
        </h3>
        {dueDate && (
          <p className="text-sm text-neutral-500 flex items-center justify-center gap-1 mt-1">
            <Calendar className="w-4 h-4" />
            Due: {formatDate(dueDate)}
          </p>
        )}
      </div>

      {/* Payment Amount */}
      <div className="bg-primary-50 rounded-xl p-6 mb-6 text-center">
        <p className="text-sm text-neutral-500 mb-1">Amount to send</p>
        <p className="text-3xl font-bold text-primary-600">
          {formatCurrency(amount, currency)}
        </p>
        <p className="text-sm text-neutral-500 mt-2">
          To: {recipientName}
        </p>
        <p className="text-sm font-medium text-neutral-700">
          {recipientEmail}
        </p>
      </div>

      {/* PayPal Button */}
      <a
        href={paypalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full bg-[#0070ba] hover:bg-[#005ea6] text-white font-bold py-4 px-6 rounded-xl transition-colors mb-4"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
        </svg>
        Pay with PayPal
        <ExternalLink className="w-4 h-4" />
      </a>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setShowConfirm(true)}
      >
        I've completed the payment
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>

      <p className="text-xs text-neutral-400 text-center mt-4">
        After paying via PayPal, return here and click "I've completed the payment" to record it.
      </p>
    </Card>
  );
}
