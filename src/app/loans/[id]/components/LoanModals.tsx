'use client';
import type { PlatformFeeSettings, FeeCalculation } from '@/lib/platformFee';

import { Button } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui';
import {
  CheckCircle,
  Bell,
  Send,
  CreditCard,
  Upload,
  X,
  Award,
  Info,
  User,
} from 'lucide-react';
import { Loan, PaymentScheduleItem } from '@/types';
import { formatCurrency } from '@/lib/utils';

// ─── Funds Sent Modal ─────────────────────────────────────────────────────────

interface FundsModalProps {
  loan: Loan;
  fundsPaymentMethod: 'paypal' | 'cashapp' | 'venmo';
  setFundsPaymentMethod: (m: 'paypal' | 'cashapp' | 'venmo') => void;
  fundsReference: string;
  setFundsReference: (v: string) => void;
  fundsProofFile: File | null;
  setFundsProofFile: (f: File | null) => void;
  fundsProofPreview: string | null;
  setFundsProofPreview: (v: string | null) => void;
  fundsSending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function FundsModal({
  loan,
  fundsPaymentMethod,
  setFundsPaymentMethod,
  fundsReference,
  setFundsReference,
  fundsProofFile,
  setFundsProofFile,
  fundsProofPreview,
  setFundsProofPreview,
  fundsSending,
  onClose,
  onConfirm,
}: FundsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 my-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Confirm Payment Sent</h2>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 mb-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Amount sent:</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">
            {formatCurrency(loan.amount, loan.currency)}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
            To: {(loan.borrower as any)?.full_name || 'Borrower'}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {/* Payment Method Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Payment Method Used *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(loan.borrower as any)?.paypal_email && (
                <button
                  type="button"
                  onClick={() => setFundsPaymentMethod('paypal')}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    fundsPaymentMethod === 'paypal'
                      ? 'border-[#0070ba] bg-[#0070ba]/10 dark:bg-[#0070ba]/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <div className="w-8 h-8 bg-[#0070ba] dark:bg-[#003087] rounded mx-auto mb-1 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-neutral-900 dark:text-white">PayPal</span>
                </button>
              )}
              {(loan.borrower as any)?.cashapp_username && (
                <button
                  type="button"
                  onClick={() => setFundsPaymentMethod('cashapp')}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    fundsPaymentMethod === 'cashapp'
                      ? 'border-[#00D632] bg-[#00D632]/10 dark:bg-[#00D632]/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <div className="w-8 h-8 bg-[#00D632] dark:bg-[#00A826] rounded mx-auto mb-1 flex items-center justify-center">
                    <span className="text-white font-bold">$</span>
                  </div>
                  <span className="text-xs font-medium text-neutral-900 dark:text-white">Cash App</span>
                </button>
              )}
              {(loan.borrower as any)?.venmo_username && (
                <button
                  type="button"
                  onClick={() => setFundsPaymentMethod('venmo')}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    fundsPaymentMethod === 'venmo'
                      ? 'border-[#3D95CE] bg-[#3D95CE]/10 dark:bg-[#3D95CE]/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <div className="w-8 h-8 bg-[#3D95CE] dark:bg-[#2a6a9a] rounded mx-auto mb-1 flex items-center justify-center">
                    <span className="text-white font-bold">V</span>
                  </div>
                  <span className="text-xs font-medium text-neutral-900 dark:text-white">Venmo</span>
                </button>
              )}
            </div>
          </div>

          {/* Transaction ID */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Transaction ID / Reference (optional)
            </label>
            <input
              type="text"
              value={fundsReference}
              onChange={(e) => setFundsReference(e.target.value)}
              placeholder="e.g., 5TY12345ABC678901"
              className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
            />
          </div>

          {/* Proof upload */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Screenshot Proof of Payment *
            </label>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
              Upload a screenshot showing the completed payment
            </p>

            {fundsProofPreview ? (
              <div className="relative">
                <img
                  src={fundsProofPreview}
                  alt="Payment proof"
                  className="w-full h-48 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFundsProofFile(null);
                    setFundsProofPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-colors">
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
                      setFundsProofFile(file);
                      const reader = new FileReader();
                      reader.onload = (ev) => setFundsProofPreview(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            )}
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>⚠️ Important:</strong> Screenshot proof is required. The borrower will be able to see this proof
            to confirm receipt.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              setFundsProofFile(null);
              setFundsProofPreview(null);
              setFundsReference('');
            }}
            className="flex-1"
            disabled={fundsSending}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
            disabled={fundsSending || !fundsProofFile}
          >
            {fundsSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm Payment
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Reminder Modal ───────────────────────────────────────────────────────────

interface ReminderModalProps {
  loan: Loan;
  reminderMessage: string;
  setReminderMessage: (v: string) => void;
  sendingReminder: boolean;
  onClose: () => void;
  onSend: () => void;
}

export function ReminderModal({
  loan,
  reminderMessage,
  setReminderMessage,
  sendingReminder,
  onClose,
  onSend,
}: ReminderModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <Bell className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Send Payment Reminder</h2>
        </div>

        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
          Send a reminder email to{' '}
          <strong>{(loan?.borrower as any)?.full_name || 'the borrower'}</strong> about their upcoming payment.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Add a personal message (optional)
          </label>
          <textarea
            value={reminderMessage}
            onChange={(e) => setReminderMessage(e.target.value)}
            placeholder="e.g., Just a friendly reminder about your upcoming payment..."
            className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white resize-none"
            rows={3}
          />
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Note:</strong> The borrower will receive an email with the payment details and your message.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              onClose();
              setReminderMessage('');
            }}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
            onClick={onSend}
            disabled={sendingReminder}
          >
            {sendingReminder ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Reminder
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Manual Payment Modal (borrower) ─────────────────────────────────────────

interface ManualPaymentModalProps {
  loan: Loan;
  nextPayment: PaymentScheduleItem | undefined;
  manualPaymentMethod: string;
  setManualPaymentMethod: (v: string) => void;
  manualPaymentReference: string;
  setManualPaymentReference: (v: string) => void;
  manualPaymentProofFile: File | null;
  setManualPaymentProofFile: (f: File | null) => void;
  manualPaymentProofPreview: string | null;
  setManualPaymentProofPreview: (v: string | null) => void;
  submittingManualPayment: boolean;
  feeSettings: PlatformFeeSettings;
  calculateFee: (amount: number) => FeeCalculation;
  onClose: () => void;
  onSubmit: () => void;
}

export function ManualPaymentModal({
  loan,
  nextPayment,
  manualPaymentMethod,
  setManualPaymentMethod,
  manualPaymentReference,
  setManualPaymentReference,
  manualPaymentProofFile,
  setManualPaymentProofFile,
  manualPaymentProofPreview,
  setManualPaymentProofPreview,
  submittingManualPayment,
  feeSettings,
  calculateFee,
  onClose,
  onSubmit,
}: ManualPaymentModalProps) {
  const feeCalc = feeSettings?.enabled && nextPayment ? calculateFee(nextPayment.amount) : null;
  const totalToPay = feeCalc ? feeCalc.grossAmount : nextPayment?.amount || 0;
  const platformFee = feeCalc?.platformFee || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Mark Payment as Made</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Amount summary */}
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm text-primary-700 dark:text-primary-300">Loan Payment</p>
                <p className="font-semibold text-primary-900 dark:text-primary-100">
                  {nextPayment && formatCurrency(nextPayment.amount, loan?.currency)}
                </p>
              </div>
              {platformFee > 0 && (
                <div className="flex justify-between items-start mb-2 text-sm">
                  <p className="text-primary-600 dark:text-primary-400">Platform Fee</p>
                  <p className="text-primary-800 dark:text-primary-200">
                    +{formatCurrency(platformFee, loan?.currency)}
                  </p>
                </div>
              )}
              <div className="border-t border-primary-200 dark:border-primary-700 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-primary-800 dark:text-primary-200">Total to Send</p>
                  <p className="text-2xl font-bold text-primary-900 dark:text-primary-100">
                    {formatCurrency(totalToPay, loan?.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Payment Method Used *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Cash App', 'Venmo', 'Zelle', 'PayPal'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setManualPaymentMethod(method.toLowerCase().replace(' ', ''))}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      manualPaymentMethod === method.toLowerCase().replace(' ', '')
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">{method}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction reference */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Transaction ID / Reference (optional)
              </label>
              <input
                type="text"
                value={manualPaymentReference}
                onChange={(e) => setManualPaymentReference(e.target.value)}
                placeholder="e.g., #ABC123"
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
            </div>

            {/* Proof upload */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Payment Screenshot *
              </label>
              {manualPaymentProofPreview ? (
                <div className="relative">
                  <img
                    src={manualPaymentProofPreview}
                    alt="Payment proof"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setManualPaymentProofFile(null);
                      setManualPaymentProofPreview(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                  <span className="text-sm text-neutral-500">Click to upload proof</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setManualPaymentProofFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => setManualPaymentProofPreview(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={!manualPaymentMethod || !manualPaymentProofFile || submittingManualPayment}
              className="flex-1"
            >
              {submittingManualPayment ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Vouch Modal ──────────────────────────────────────────────────────────────

interface VouchModalProps {
  loan: Loan;
  vouchMessage: string;
  setVouchMessage: (v: string) => void;
  vouchingForBorrower: boolean;
  onClose: () => void;
  onVouch: () => void;
}

export function VouchModal({
  loan,
  vouchMessage,
  setVouchMessage,
  vouchingForBorrower,
  onClose,
  onVouch,
}: VouchModalProps) {
  const borrowerName =
    (loan.borrower as any)?.full_name ??
    (loan as any).borrower_name ??
    'the borrower';
  const borrowerFirstName = borrowerName?.split(' ')[0] || (borrowerName !== 'the borrower' ? borrowerName : 'Borrower');

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 my-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            Vouch for {borrowerFirstName}
          </h2>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            As a lender, your vouch carries extra weight. You&apos;re confirming this borrower successfully repaid
            their loan.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-purple-200 dark:bg-purple-700 flex items-center justify-center">
                <User className="w-5 h-5 text-purple-700 dark:text-purple-200" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {borrowerName}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Relationship: Lender (highest trust weight)
                </p>
              </div>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Loan amount: {formatCurrency(loan.amount, loan.currency)} • Successfully repaid
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Add a message (optional)
            </label>
            <textarea
              value={vouchMessage}
              onChange={(e) => setVouchMessage(e.target.value)}
              placeholder="Share your experience lending to this borrower..."
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={onVouch}
            disabled={vouchingForBorrower}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            {vouchingForBorrower ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Award className="w-4 h-4 mr-2" />
                Create Vouch
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Dialogs ──────────────────────────────────────────────────────────

interface LoanConfirmDialogsProps {
  paymentConfirmDialog: { isOpen: boolean; paymentId: string | null; isBorrower: boolean };
  showDeclineDialog: boolean;
  showCancelDialog: boolean;
  processingPayment: string | null;
  onClosePaymentDialog: () => void;
  onConfirmPayment: () => void;
  onCloseDeclineDialog: () => void;
  onConfirmDecline: () => void;
  onCloseCancelDialog: () => void;
  onConfirmCancel: () => void;
}

export function LoanConfirmDialogs({
  paymentConfirmDialog,
  showDeclineDialog,
  showCancelDialog,
  processingPayment,
  onClosePaymentDialog,
  onConfirmPayment,
  onCloseDeclineDialog,
  onConfirmDecline,
  onCloseCancelDialog,
  onConfirmCancel,
}: LoanConfirmDialogsProps) {
  return (
    <>
      <ConfirmDialog
        isOpen={paymentConfirmDialog.isOpen}
        onClose={onClosePaymentDialog}
        onConfirm={onConfirmPayment}
        title={paymentConfirmDialog.isBorrower ? 'Confirm Early Payment' : 'Process Payment'}
        message={
          paymentConfirmDialog.isBorrower
            ? 'Pay this installment now? This will initiate an ACH transfer from your bank account to the lender.'
            : "Process this payment now? This will initiate an ACH transfer from the borrower's bank account."
        }
        confirmText={paymentConfirmDialog.isBorrower ? 'Pay Now' : 'Process Payment'}
        cancelText="Cancel"
        type="info"
        loading={!!processingPayment}
      />

      <ConfirmDialog
        isOpen={showDeclineDialog}
        onClose={onCloseDeclineDialog}
        onConfirm={onConfirmDecline}
        title="Decline Loan Request"
        message="Are you sure you want to decline this loan request? This action cannot be undone."
        confirmText="Decline"
        cancelText="Keep Request"
        type="danger"
      />

      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={onCloseCancelDialog}
        onConfirm={onConfirmCancel}
        title="Cancel Loan Request"
        message="Are you sure you want to cancel this loan request? This action cannot be undone."
        confirmText="Cancel Request"
        cancelText="Keep Request"
        type="warning"
      />
    </>
  );
}
