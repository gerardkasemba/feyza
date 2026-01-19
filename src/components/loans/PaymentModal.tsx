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
import { FaPaypal, FaRegMoneyBillAlt } from 'react-icons/fa';

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
    bg: 'bg-[#0070ba] dark:bg-[#005EA6]',
    hoverBg: 'hover:bg-[#003087] dark:hover:bg-[#004C9E]',
    icon: <FaPaypal className="w-6 h-6 text-white" />,
  },
  cashapp: {
    name: 'Cash App',
    bg: 'bg-[#00D632] dark:bg-[#00B82B]',
    hoverBg: 'hover:bg-[#00B82B] dark:hover:bg-[#009A24]',
    icon: <FaRegMoneyBillAlt className="w-6 h-6 text-white" />,
  },
  venmo: {
    name: 'Venmo',
    bg: 'bg-[#3D95CE] dark:bg-[#2B7AB5]',
    hoverBg: 'hover:bg-[#2B7AB5] dark:hover:bg-[#1E5F9C]',
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
          <div className="text-center py-6 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Amount Due</p>
            <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
              {formatCurrency(amount, currency)}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 flex items-center justify-center gap-1">
              <Calendar className="w-4 h-4" />
              Due: {formatDate(scheduleItem.due_date)}
            </p>
          </div>

          {/* Breakdown */}
          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Principal</span>
              <span className="text-neutral-900 dark:text-neutral-300">{formatCurrency(scheduleItem.principal_amount, currency)}</span>
            </div>
            {scheduleItem.interest_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Interest</span>
                <span className="text-neutral-900 dark:text-neutral-300">{formatCurrency(scheduleItem.interest_amount, currency)}</span>
              </div>
            )}
          </div>

          {/* Payment Method - Show only lender's preferred */}
          {activePayment && methodConfig && paymentUrl ? (
            <>
              <div className="text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Pay to:</p>
                <p className="font-medium text-neutral-900 dark:text-white">{lenderName || 'Your Lender'}</p>
              </div>

              {/* Big Payment Button */}
              <div className={`${methodConfig.bg} rounded-xl p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 dark:bg-white/10 rounded-xl flex items-center justify-center">
                      {methodConfig.icon}
                    </div>
                    <div className="text-white">
                      <p className="text-white/80 dark:text-white/90 text-sm">via {methodConfig.name}</p>
                      <p className="font-bold text-lg">{activePayment.value}</p>
                    </div>
                  </div>
                </div>
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-white dark:bg-white/95 text-neutral-900 dark:text-neutral-800 font-bold py-3 px-6 rounded-lg hover:bg-neutral-100 dark:hover:bg-white transition-colors"
                >
                  Pay {formatCurrency(amount, currency)}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
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
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-300">No payment method available</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
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
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Confirm Payment</h3>
            <p className="text-neutral-500 dark:text-neutral-400">
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
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Screenshot Proof of Payment *
            </label>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
              Upload a screenshot showing the completed payment
            </p>
            
            {proofPreview ? (
              <div className="relative">
                <img 
                  src={proofPreview} 
                  alt="Payment proof" 
                  className="w-full h-40 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700"
                />
                <button
                  type="button"
                  onClick={() => {
                    setProofFile(null);
                    setProofPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1 bg-red-500 dark:bg-red-600 text-white rounded-full hover:bg-red-600 dark:hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-colors">
                <div className="flex flex-col items-center">
                  <Upload className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mb-2" />
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">Click to upload screenshot</span>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">PNG, JPG up to 5MB</span>
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
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">
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