'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('BorrowerPaymentMethods');

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import {
  getPaymentDeepLink,
  supportsDeepLink,
  getOpenAppLabel,
  getManualPaymentInstructions,
  getProviderBrandColor,
  getProviderIcon,
} from '@/lib/payment-links';
import {
  CreditCard,
  Smartphone,
  Banknote,
  Building2,
  Building,
  Zap,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
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
  is_verified: boolean;
  payment_provider?: PaymentProvider;
}

interface BorrowerPaymentMethodsProps {
  borrowerId: string;
  borrowerName?: string;
  amount: number;
  currency: string;
  loanPurpose?: string;
  // Legacy fallback fields from user profile
  legacyPaypalEmail?: string;
  legacyCashappUsername?: string;
  legacyVenmoUsername?: string;
  legacyPreferredMethod?: string;
  // Bank info
  bankConnected?: boolean;
  bankName?: string;
  bankAccountMask?: string;
  dwollaFundingSourceUrl?: string;
  // Callbacks
  onSelectACH?: () => void;
  onConfirmManualPayment?: (method: string, identifier: string) => void;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Building2,
  CreditCard,
  Smartphone,
  Banknote,
  Zap,
};

export default function BorrowerPaymentMethods({
  borrowerId,
  borrowerName = 'the borrower',
  amount,
  currency,
  loanPurpose,
  legacyPaypalEmail,
  legacyCashappUsername,
  legacyVenmoUsername,
  legacyPreferredMethod,
  bankConnected,
  bankName,
  bankAccountMask,
  dwollaFundingSourceUrl,
  onSelectACH,
  onConfirmManualPayment,
}: BorrowerPaymentMethodsProps) {
  const supabase = createClient();
  
  const [paymentMethods, setPaymentMethods] = useState<UserPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentMethods();
  }, [borrowerId]);

  const fetchPaymentMethods = async () => {
    setLoading(true);
    try {
      // Fetch from user_payment_methods table
      const { data: methods, error } = await supabase
        .from('user_payment_methods')
        .select('*, payment_provider:payment_provider_id(*)')
        .eq('user_id', borrowerId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setPaymentMethods(methods || []);
    } catch (err) {
      log.error('Error fetching payment methods:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getIcon = (iconName: string) => ICON_MAP[iconName] || CreditCard;

  // Check if we have any payment methods (new system or legacy)
  const hasNewPaymentMethods = paymentMethods.length > 0;
  const hasLegacyMethods = legacyPaypalEmail || legacyCashappUsername || legacyVenmoUsername;
  const hasACH = bankConnected && dwollaFundingSourceUrl;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  // No payment methods available
  if (!hasNewPaymentMethods && !hasLegacyMethods && !hasACH) {
    return (
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
          <div>
            <p className="font-medium text-orange-800 dark:text-orange-300">No Payment Method Available</p>
            <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
              {borrowerName} hasn't connected any payment methods yet. They need to add a payment method in their settings before you can send funds.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const note = loanPurpose ? `Loan for ${loanPurpose}` : 'Loan from Feyza';

  return (
    <div className="space-y-4">
      {/* ACH Bank Transfer Option */}
      {hasACH && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center">
                <Building className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-green-800 dark:text-green-300">Bank Account (ACH)</p>
                  <Badge variant="success" size="sm">Recommended</Badge>
                </div>
                <p className="text-sm text-green-700 dark:text-green-400">
                  {bankName || 'Bank Account'} {bankAccountMask && `(••••${bankAccountMask})`}
                </p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                  Automatic transfer • 1-3 business days
                </p>
              </div>
            </div>
            {onSelectACH && (
              <Button onClick={onSelectACH} className="bg-green-600 hover:bg-green-700">
                <Banknote className="w-4 h-4 mr-2" />
                Send via ACH
              </Button>
            )}
          </div>
        </div>
      )}

      {/* New Payment Methods System */}
      {hasNewPaymentMethods && (
        <div className="space-y-3">
          {(hasACH || hasLegacyMethods) && (
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Or send via payment app:
            </p>
          )}
          
          {paymentMethods.map((method) => {
            const provider = method.payment_provider as PaymentProvider;
            if (!provider) return null;
            
            const Icon = getIcon(provider.icon_name);
            const brandColor = provider.brand_color || getProviderBrandColor(provider.slug);
            const deepLink = getPaymentDeepLink({
              providerSlug: provider.slug,
              identifier: method.account_identifier,
              amount,
              note,
              currency,
            });
            const hasDeepLink = supportsDeepLink(provider.slug);

            return (
              <div
                key={method.id}
                className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
                style={{ borderColor: `${brandColor}40` }}
              >
                <div 
                  className="p-4"
                  style={{ backgroundColor: `${brandColor}10` }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${brandColor}20` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: brandColor }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-neutral-900 dark:text-white">
                            {provider.name}
                          </p>
                          {method.is_default && (
                            <Badge variant="primary" size="sm">Preferred</Badge>
                          )}
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                          {method.account_identifier}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(method.account_identifier, method.id)}
                      >
                        {copiedId === method.id ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      
                      {hasDeepLink && deepLink ? (
                        <a
                          href={deepLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white transition-colors"
                          style={{ backgroundColor: brandColor }}
                        >
                          {getOpenAppLabel(provider.slug)}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onConfirmManualPayment?.(provider.slug, method.account_identifier)}
                        >
                          I've Sent Payment
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Instructions for non-deep-link methods */}
                  {!hasDeepLink && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
                      {getManualPaymentInstructions(provider.slug, method.account_identifier)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legacy Payment Methods (fallback) */}
      {!hasNewPaymentMethods && hasLegacyMethods && (
        <div className="space-y-3">
          {hasACH && (
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Or send via payment app:
            </p>
          )}

          {/* CashApp */}
          {legacyCashappUsername && (
            <LegacyPaymentCard
              name="Cash App"
              identifier={legacyCashappUsername}
              brandColor="#00D632"
              icon="$"
              deepLink={getPaymentDeepLink({
                providerSlug: 'cashapp',
                identifier: legacyCashappUsername,
                amount,
                note,
              })}
              isPreferred={legacyPreferredMethod === 'cashapp'}
              onCopy={() => copyToClipboard(legacyCashappUsername, 'cashapp')}
              copied={copiedId === 'cashapp'}
            />
          )}

          {/* Venmo */}
          {legacyVenmoUsername && (
            <LegacyPaymentCard
              name="Venmo"
              identifier={legacyVenmoUsername}
              brandColor="#3D95CE"
              icon="V"
              deepLink={getPaymentDeepLink({
                providerSlug: 'venmo',
                identifier: legacyVenmoUsername,
                amount,
                note,
              })}
              isPreferred={legacyPreferredMethod === 'venmo'}
              onCopy={() => copyToClipboard(legacyVenmoUsername, 'venmo')}
              copied={copiedId === 'venmo'}
            />
          )}

          {/* PayPal */}
          {legacyPaypalEmail && (
            <LegacyPaymentCard
              name="PayPal"
              identifier={legacyPaypalEmail}
              brandColor="#0070BA"
              icon="P"
              deepLink={getPaymentDeepLink({
                providerSlug: 'paypal',
                identifier: legacyPaypalEmail,
                amount,
                note,
              })}
              isPreferred={legacyPreferredMethod === 'paypal'}
              onCopy={() => copyToClipboard(legacyPaypalEmail, 'paypal')}
              copied={copiedId === 'paypal'}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Legacy payment card component for backward compatibility
function LegacyPaymentCard({
  name,
  identifier,
  brandColor,
  icon,
  deepLink,
  isPreferred,
  onCopy,
  copied,
}: {
  name: string;
  identifier: string;
  brandColor: string;
  icon: string;
  deepLink: string | null;
  isPreferred: boolean;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: `${brandColor}40` }}
    >
      <div 
        className="p-4"
        style={{ backgroundColor: `${brandColor}10` }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              <span className="text-white font-bold text-xl">{icon}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-neutral-900 dark:text-white">{name}</p>
                {isPreferred && <Badge variant="primary" size="sm">Preferred</Badge>}
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                {identifier}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={onCopy}>
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
            
            {deepLink && (
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: brandColor }}
              >
                Open {name}
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
