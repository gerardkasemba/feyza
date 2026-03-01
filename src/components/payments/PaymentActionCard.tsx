'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import {
  CreditCard,
  Smartphone,
  Banknote,
  Building2,
  Zap,
  ExternalLink,
  CheckCircle,
  Upload,
  X,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface PaymentProvider {
  id: string;
  slug: string;
  name: string;
  provider_type: string;
  account_identifier_label: string | null;
  icon_name: string;
  brand_color: string;
  instructions: string;
}

interface UserPaymentMethod {
  id: string;
  payment_provider_id: string;
  account_identifier: string;
  is_default: boolean;
  payment_provider?: PaymentProvider;
}

interface PaymentActionCardProps {
  // Transaction info
  loanId: string;
  amount: number;
  currency: string;
  transactionType: 'disbursement' | 'repayment';
  
  // Parties
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  receiverPaymentMethods?: UserPaymentMethod[];
  
  // Callbacks
  onPaymentConfirmed?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
  
  // Schedule info (for repayments)
  paymentScheduleId?: string;
  dueDate?: string;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Building2,
  CreditCard,
  Smartphone,
  Banknote,
  Zap,
};

// Deep link generators for popular apps
const getDeepLink = (
  provider: PaymentProvider,
  identifier: string,
  amount: number,
  note: string
): { appLink: string; webLink: string; canOpenApp: boolean } => {
  const slug = provider.slug;
  const encodedNote = encodeURIComponent(note);
  
  switch (slug) {
    case 'cashapp':
      // Clean the cashtag
      const cashtag = identifier.replace(/^\$/, '');
      return {
        appLink: `cashapp://cash.app/pay/${cashtag}?amount=${amount}&note=${encodedNote}`,
        webLink: `https://cash.app/$${cashtag}/${amount}`,
        canOpenApp: true,
      };
    
    case 'venmo':
      // Clean the username
      const venmoUser = identifier.replace(/^@/, '');
      return {
        appLink: `venmo://paycharge?txn=pay&recipients=${venmoUser}&amount=${amount}&note=${encodedNote}`,
        webLink: `https://venmo.com/${venmoUser}?txn=pay&amount=${amount}&note=${encodedNote}`,
        canOpenApp: true,
      };
    
    case 'zelle':
      // Zelle doesn't have a universal deep link, but some banks support it
      return {
        appLink: '',
        webLink: '',
        canOpenApp: false,
      };
    
    case 'paypal':
      // PayPal.me link
      const paypalUser = identifier.includes('@') 
        ? identifier.split('@')[0] 
        : identifier;
      return {
        appLink: `paypal://paypalme/${paypalUser}/${amount}`,
        webLink: `https://www.paypal.com/paypalme/${paypalUser}/${amount}`,
        canOpenApp: true,
      };
    
    case 'mpesa':
      // M-Pesa doesn't have universal deep links
      return {
        appLink: '',
        webLink: '',
        canOpenApp: false,
      };
    
    default:
      return {
        appLink: '',
        webLink: '',
        canOpenApp: false,
      };
  }
};

// Brand colors and styling
const PROVIDER_STYLES: Record<string, { bg: string; text: string; buttonBg: string }> = {
  cashapp: { bg: 'bg-[#00D632]', text: 'text-white', buttonBg: 'hover:bg-[#00B82B]' },
  venmo: { bg: 'bg-[#008CFF]', text: 'text-white', buttonBg: 'hover:bg-[#0070CC]' },
  zelle: { bg: 'bg-[#6D1ED4]', text: 'text-white', buttonBg: 'hover:bg-[#5A18B0]' },
  paypal: { bg: 'bg-[#0070BA]', text: 'text-white', buttonBg: 'hover:bg-[#005A99]' },
  mpesa: { bg: 'bg-[#4CAF50]', text: 'text-white', buttonBg: 'hover:bg-[#3D8B40]' },
  orange_money: { bg: 'bg-[#FF6600]', text: 'text-white', buttonBg: 'hover:bg-[#E55C00]' },
  mtn_momo: { bg: 'bg-[#FFCC00]', text: 'text-black', buttonBg: 'hover:bg-[#E5B800]' },
};

export default function PaymentActionCard({
  loanId,
  amount,
  currency,
  transactionType,
  senderId,
  senderName,
  receiverId,
  receiverName,
  receiverPaymentMethods = [],
  onPaymentConfirmed,
  onCancel,
  paymentScheduleId,
  dueDate,
}: PaymentActionCardProps) {
  const supabase = createClient();
  
  const [step, setStep] = useState<'select' | 'pay' | 'proof' | 'success'>('select');
  const [selectedMethod, setSelectedMethod] = useState<UserPaymentMethod | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Proof upload state
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofReference, setProofReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getIcon = (iconName: string) => ICON_MAP[iconName] || CreditCard;

  const formatCurrency = (amt: number, curr: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(amt);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenApp = (method: UserPaymentMethod) => {
    const provider = method.payment_provider as PaymentProvider;
    if (!provider) return;

    const note = transactionType === 'disbursement' 
      ? `Loan funding from ${senderName}` 
      : `Loan payment to ${receiverName}`;
    
    const links = getDeepLink(provider, method.account_identifier, amount, note);
    
    // Try app link first, then web link
    if (links.appLink) {
      // Create hidden iframe to try app link (won't navigate away if app not installed)
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = links.appLink;
      document.body.appendChild(iframe);
      
      // After short delay, try web link as fallback
      setTimeout(() => {
        document.body.removeChild(iframe);
        if (links.webLink) {
          window.open(links.webLink, '_blank');
        }
      }, 500);
    } else if (links.webLink) {
      window.open(links.webLink, '_blank');
    }
    
    // Move to proof step
    setStep('pay');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setProofFile(file);
      setError(null);
      
      const reader = new FileReader();
      reader.onload = (e) => setProofPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProof = async () => {
    if (!selectedMethod) return;
    
    setSubmitting(true);
    setError(null);

    try {
      // Upload proof file if present
      let proofUrl = null;
      if (proofFile) {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${loanId}_${Date.now()}.${fileExt}`;
        const filePath = `payment-proofs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('loan-documents')
          .upload(filePath, proofFile);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('loan-documents')
            .getPublicUrl(filePath);
          proofUrl = publicUrl;
        }
      }

      // Submit payment proof
      const response = await fetch('/api/payments/proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_id: loanId,
          payment_schedule_id: paymentScheduleId,
          payment_provider_id: selectedMethod.payment_provider_id,
          amount,
          currency,
          transaction_type: transactionType,
          proof_type: proofFile ? 'screenshot' : 'reference_number',
          proof_url: proofUrl,
          proof_reference: proofReference || null,
          receiver_payment_identifier: selectedMethod.account_identifier,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit payment proof');
      }

      setStep('success');
      onPaymentConfirmed?.(data.transaction);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter to methods that have identifiers
  const availableMethods = receiverPaymentMethods.filter(m => 
    m.account_identifier && m.payment_provider
  );

  if (availableMethods.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">
            No Payment Methods Available
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {receiverName} hasn't set up their payment methods yet.
            They need to add a Cash App, Venmo, or other payment method in their settings.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">
              {transactionType === 'disbursement' ? 'Send Funds' : 'Make Payment'}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {formatCurrency(amount, currency)} to {receiverName}
            </p>
          </div>
          {dueDate && (
            <Badge variant="warning" size="sm">
              <Clock className="w-3 h-3 mr-1" />
              Due {new Date(dueDate).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 1: Select Payment Method */}
        {step === 'select' && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
              Choose how to send {formatCurrency(amount, currency)}:
            </p>

            {availableMethods.map(method => {
              const provider = method.payment_provider as PaymentProvider;
              if (!provider) return null;
              
              const Icon = getIcon(provider.icon_name);
              const styles = PROVIDER_STYLES[provider.slug] || { bg: 'bg-neutral-700', text: 'text-white', buttonBg: '' };
              const links = getDeepLink(provider, method.account_identifier, amount, 'Payment');
              
              return (
                <div
                  key={method.id}
                  className={`rounded-xl overflow-hidden ${styles.bg}`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                          <Icon className={`w-6 h-6 ${styles.text}`} />
                        </div>
                        <div className={styles.text}>
                          <p className="font-semibold">{provider.name}</p>
                          <p className="text-sm opacity-90">{method.account_identifier}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(method.account_identifier)}
                          className={`p-2 rounded-lg bg-white/20 ${styles.text} hover:bg-white/30 transition-colors`}
                          title="Copy"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                        
                        {links.canOpenApp || links.webLink ? (
                          <Button
                            onClick={() => {
                              setSelectedMethod(method);
                              handleOpenApp(method);
                            }}
                            className={`${styles.bg} ${styles.buttonBg} ${styles.text} border-2 border-white/30`}
                          >
                            Open {provider.name}
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              setSelectedMethod(method);
                              setStep('pay');
                            }}
                            className={`${styles.bg} ${styles.buttonBg} ${styles.text} border-2 border-white/30`}
                          >
                            Send via {provider.name}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {onCancel && (
              <Button variant="ghost" onClick={onCancel} className="w-full mt-4">
                Cancel
              </Button>
            )}
          </div>
        )}

        {/* Step 2: Instructions & Confirm */}
        {step === 'pay' && selectedMethod && (
          <div className="space-y-4">
            {(() => {
              const provider = selectedMethod.payment_provider as PaymentProvider;
              if (!provider) return null;
              
              const Icon = getIcon(provider.icon_name);
              const styles = PROVIDER_STYLES[provider.slug] || { bg: 'bg-neutral-700', text: 'text-white', buttonBg: '' };
              const links = getDeepLink(provider, selectedMethod.account_identifier, amount, 'Payment');
              
              return (
                <>
                  {/* Payment target card */}
                  <div className={`rounded-xl p-4 ${styles.bg} ${styles.text}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                        <Icon className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-sm opacity-80">Send to</p>
                        <p className="text-xl font-bold">{selectedMethod.account_identifier}</p>
                        <p className="text-sm opacity-80">{receiverName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Amount to send</p>
                    <p className="text-3xl font-bold text-neutral-900 dark:text-white">
                      {formatCurrency(amount, currency)}
                    </p>
                  </div>

                  {/* Instructions */}
                  {provider.instructions && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                      <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-line">
                        {provider.instructions}
                      </p>
                    </div>
                  )}

                  {/* Open app button (if applicable) */}
                  {(links.canOpenApp || links.webLink) && (
                    <Button
                      onClick={() => handleOpenApp(selectedMethod)}
                      className={`w-full ${styles.bg} ${styles.buttonBg} ${styles.text}`}
                    >
                      <Icon className="w-5 h-5 mr-2" />
                      Open {provider.name}
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedMethod(null);
                        setStep('select');
                      }}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep('proof')}
                      className="flex-1"
                    >
                      I've Sent It
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Step 3: Upload Proof */}
        {step === 'proof' && selectedMethod && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                Almost Done!
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Upload proof of your {formatCurrency(amount, currency)} payment
              </p>
            </div>

            {/* Screenshot upload */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Screenshot Proof *
              </label>
              
              {proofPreview ? (
                <div className="relative">
                  <img
                    src={proofPreview}
                    alt="Payment proof"
                    className="w-full max-h-48 object-cover rounded-xl border border-neutral-200 dark:border-neutral-700"
                  />
                  <button
                    onClick={() => {
                      setProofFile(null);
                      setProofPreview(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl cursor-pointer hover:border-primary-500 transition-colors">
                  <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                  <span className="text-sm text-neutral-500">Click to upload screenshot</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Reference number */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Transaction ID / Reference (Optional)
              </label>
              <Input
                value={proofReference}
                onChange={(e) => setProofReference(e.target.value)}
                placeholder="e.g., TXN123456 or confirmation code"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('pay')}
                className="flex-1"
                disabled={submitting}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmitProof}
                disabled={!proofFile || submitting}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit Proof
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
              Payment Submitted!
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              {receiverName} will be notified to confirm receipt.
              Once confirmed, the payment will be marked complete.
            </p>
            <Button onClick={onCancel} variant="outline">
              Done
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
