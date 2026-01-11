'use client';

import React, { useState } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PaymentScheduleItem } from '@/types';
import { PaymentFormData } from '@/lib/validations';
import { 
  ExternalLink, CheckCircle, Calendar, 
  ArrowRight, AlertCircle, Upload, XCircle
} from 'lucide-react';

interface LenderPaymentInfo {
  paypal_email?: string;
  cashapp_username?: string;
  venmo_username?: string;
  preferred_payment_method?: 'paypal' | 'cashapp' | 'venmo';
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleItem: PaymentScheduleItem | null;
  currency: string;
  lenderPayPalEmail?: string; // Keep for backward compatibility
  lenderName?: string;
  lenderPaymentInfo?: LenderPaymentInfo; // New: full payment info
  onSubmit: (data: PaymentFormData) => Promise<void>;
}

const PAYMENT_METHODS = {
  paypal: {
    name: 'PayPal',
    bg: 'bg-[#0070ba]',
    hoverBg: 'hover:bg-[#003087]',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
      </svg>
    ),
  },
  cashapp: {
    name: 'Cash App',
    bg: 'bg-[#00D632]',
    hoverBg: 'hover:bg-[#00B82B]',
    icon: <span className="text-white font-bold text-2xl">$</span>,
  },
  venmo: {
    name: 'Venmo',
    bg: 'bg-[#3D95CE]',
    hoverBg: 'hover:bg-[#2B7AB5]',
    icon: <span className="text-white font-bold text-2xl">V</span>,
  },
};

export function PaymentModal({
  isOpen,
  onClose,
  scheduleItem,
  currency,
  lenderPayPalEmail,
  lenderName,
  lenderPaymentInfo,
  onSubmit,
}: PaymentModalProps) {
  const [step, setStep] = useState<'pay' | 'confirm'>('pay');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  if (!scheduleItem) return null;

  const amount = scheduleItem.amount;

  // Determine which payment method to show (lender's preferred)
  const getActivePaymentMethod = (): { method: string; value: string } | null => {
    const info = lenderPaymentInfo || { paypal_email: lenderPayPalEmail };
    const preferred = info.preferred_payment_method;
    
    // If preferred is set and available, use it
    if (preferred === 'paypal' && info.paypal_email) return { method: 'paypal', value: info.paypal_email };
    if (preferred === 'cashapp' && info.cashapp_username) return { method: 'cashapp', value: info.cashapp_username };
    if (preferred === 'venmo' && info.venmo_username) return { method: 'venmo', value: info.venmo_username };
    
    // Fallback to first available
    if (info.paypal_email) return { method: 'paypal', value: info.paypal_email };
    if (info.cashapp_username) return { method: 'cashapp', value: info.cashapp_username };
    if (info.venmo_username) return { method: 'venmo', value: info.venmo_username };
    
    return null;
  };

  const activePayment = getActivePaymentMethod();

  // Generate payment URL based on method
  const getPaymentUrl = () => {
    if (!activePayment) return null;
    
    const itemName = `Loan repayment to ${lenderName || 'Lender'}`;
    
    switch (activePayment.method) {
      case 'paypal':
        return `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(activePayment.value)}&amount=${amount}&currency_code=${currency}&item_name=${encodeURIComponent(itemName)}`;
      case 'cashapp':
        return `https://cash.app/${activePayment.value}/${amount}`;
      case 'venmo':
        const venmoUser = activePayment.value.replace('@', '');
        return `https://venmo.com/${venmoUser}?txn=pay&amount=${amount}&note=${encodeURIComponent(itemName)}`;
      default:
        return null;
    }
  };

  const handleConfirmPayment = async () => {
    if (!proofFile) {
      setError('Please upload a screenshot proof of payment');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const methodName = activePayment ? PAYMENT_METHODS[activePayment.method as keyof typeof PAYMENT_METHODS].name : 'Unknown';
      
      await onSubmit({
        amount,
        note: note || `${methodName} payment${transactionId ? ` - Transaction: ${transactionId}` : ''}`,
        proofUrl: transactionId ? `${methodName} Transaction ID: ${transactionId}` : undefined,
      });
      
      // Reset state
      setStep('pay');
      setTransactionId('');
      setNote('');
      setProofFile(null);
      setProofPreview(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('pay');
    setTransactionId('');
    setNote('');
    setError(null);
    setProofFile(null);
    setProofPreview(null);
    onClose();
  };

  const paymentUrl = getPaymentUrl();
  const methodConfig = activePayment ? PAYMENT_METHODS[activePayment.method as keyof typeof PAYMENT_METHODS] : null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Make Payment" size="md">
      {step === 'pay' && (
        <div className="space-y-6">
          {/* Payment Info */}
          <div className="text-center py-6 bg-primary-50 rounded-xl">
            <p className="text-sm text-neutral-500 mb-1">Amount Due</p>
            <p className="text-3xl font-bold text-primary-600">
              {formatCurrency(amount, currency)}
            </p>
            <p className="text-sm text-neutral-500 mt-2 flex items-center justify-center gap-1">
              <Calendar className="w-4 h-4" />
              Due: {formatDate(scheduleItem.due_date)}
            </p>
          </div>

          {/* Breakdown */}
          <div className="bg-neutral-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Principal</span>
              <span>{formatCurrency(scheduleItem.principal_amount, currency)}</span>
            </div>
            {scheduleItem.interest_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Interest</span>
                <span>{formatCurrency(scheduleItem.interest_amount, currency)}</span>
              </div>
            )}
          </div>

          {/* Payment Method - Show only lender's preferred */}
          {activePayment && methodConfig && paymentUrl ? (
            <>
              <div className="text-center">
                <p className="text-sm text-neutral-500 mb-2">Pay to:</p>
                <p className="font-medium text-neutral-900">{lenderName || 'Your Lender'}</p>
              </div>

              {/* Big Payment Button */}
              <div className={`${methodConfig.bg} rounded-xl p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      {methodConfig.icon}
                    </div>
                    <div className="text-white">
                      <p className="text-white/80 text-sm">via {methodConfig.name}</p>
                      <p className="font-bold text-lg">{activePayment.value}</p>
                    </div>
                  </div>
                </div>
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-white text-neutral-900 font-bold py-3 px-6 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  Pay {formatCurrency(amount, currency)}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="text-center">
                <p className="text-sm text-neutral-500 mb-3">
                  After completing payment in {methodConfig.name}:
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep('confirm')}
                >
                  I've completed the payment
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">No payment method available</p>
                  <p className="text-sm text-yellow-700">
                    Your lender hasn't set up a payment method. Please contact them directly to arrange payment.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900">Confirm Payment</h3>
            <p className="text-neutral-500">
              Did you complete the {formatCurrency(amount, currency)} payment via {methodConfig?.name}?
            </p>
          </div>

          <Input
            label={`${methodConfig?.name || 'Transaction'} ID (optional)`}
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="e.g., 1AB23456CD789012E"
            helperText={`Found in your ${methodConfig?.name || 'payment'} receipt`}
          />

          {/* Proof of Payment Upload */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Screenshot Proof of Payment *
            </label>
            <p className="text-xs text-neutral-500 mb-2">
              Upload a screenshot showing the completed payment
            </p>
            
            {proofPreview ? (
              <div className="relative">
                <img 
                  src={proofPreview} 
                  alt="Payment proof" 
                  className="w-full h-40 object-cover rounded-lg border border-neutral-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setProofFile(null);
                    setProofPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50/50 transition-colors">
                <div className="flex flex-col items-center">
                  <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                  <span className="text-sm text-neutral-500">Click to upload screenshot</span>
                  <span className="text-xs text-neutral-400 mt-1">PNG, JPG up to 5MB</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setProofFile(file);
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setProofPreview(ev.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            )}
          </div>

          <Input
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any additional notes"
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Important:</strong> Screenshot proof is required. Your lender will be notified and can confirm receipt of this payment.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep('pay')}
            >
              Go Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirmPayment}
              loading={isSubmitting}
              disabled={!proofFile}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Payment
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
