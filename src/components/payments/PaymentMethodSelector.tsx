'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import {
  Building2,
  CreditCard,
  Smartphone,
  Banknote,
  Zap,
  Clock,
  Check,
  ChevronRight,
  Loader2,
  AlertCircle,
  Globe,
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: 'automated' | 'manual' | 'mobile_money' | 'cash';
  isAutomated: boolean;
  requiresProof: boolean;
  accountIdentifierLabel: string | null | undefined; // Make it accept both
  accountIdentifierPlaceholder: string | null | undefined; // Make it accept both
  instructions: string;
  iconName: string;
  brandColor: string;
  supportedCurrencies: string[];
  estimatedDays: string;
  fees: {
    type: string;
    percentage: number;
    fixed: number;
  };
  limits: {
    min: number | null;
    max: number | null;
  };
}

interface PaymentMethodSelectorProps {
  country: string;
  transactionType: 'disbursement' | 'repayment';
  amount?: number;
  currency?: string;
  onSelect: (method: PaymentMethod) => void;
  selectedMethodId?: string;
  showInstructions?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Building2,
  CreditCard,
  Smartphone,
  Banknote,
  Zap,
};

const TYPE_BADGES: Record<string, { label: string; color: 'primary' | 'success' | 'warning' | 'secondary' }> = {
  automated: { label: 'Auto', color: 'primary' },
  manual: { label: 'Manual', color: 'warning' },
  mobile_money: { label: 'Mobile', color: 'success' },
  cash: { label: 'Cash', color: 'secondary' },
};

export default function PaymentMethodSelector({
  country,
  transactionType,
  amount,
  currency = 'USD',
  onSelect,
  selectedMethodId,
  showInstructions = false,
}: PaymentMethodSelectorProps) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);

  useEffect(() => {
    fetchMethods();
  }, [country, transactionType]);

  const fetchMethods = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        country,
        type: transactionType,
      });
      const res = await fetch(`/api/payment-methods?${params}`);
      if (!res.ok) throw new Error('Failed to fetch payment methods');
      const data = await res.json();
      setMethods(data.providers || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    return ICON_MAP[iconName] || CreditCard;
  };

  const calculateFee = (method: PaymentMethod) => {
    if (!amount || method.fees.type === 'none') return 0;
    let fee = 0;
    if (method.fees.percentage > 0) {
      fee += amount * method.fees.percentage;
    }
    if (method.fees.fixed > 0) {
      fee += method.fees.fixed;
    }
    return fee;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        <span className="ml-2 text-neutral-500">Loading payment methods...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <div>
          <p className="text-red-700 font-medium">Failed to load payment methods</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMethods} className="ml-auto">
          Retry
        </Button>
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <div className="p-6 bg-neutral-50 border border-neutral-200 rounded-xl text-center">
        <Globe className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
        <p className="text-neutral-600">No payment methods available for your region</p>
        <p className="text-neutral-500 text-sm mt-1">Please contact support for assistance</p>
      </div>
    );
  }

  // Group methods by type
  const automatedMethods = methods.filter(m => m.isAutomated);
  const manualMethods = methods.filter(m => !m.isAutomated);

  return (
    <div className="space-y-4">
      {/* Automated Methods (if any enabled) */}
      {automatedMethods.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium text-neutral-700">Automatic Transfer</span>
            <Badge variant="primary" size="sm">Recommended</Badge>
          </div>
          <div className="space-y-2">
            {automatedMethods.map(method => (
              <MethodCard
                key={method.id}
                method={method}
                isSelected={selectedMethodId === method.id}
                isExpanded={expandedMethod === method.id}
                onSelect={() => onSelect(method)}
                onToggleExpand={() => setExpandedMethod(expandedMethod === method.id ? null : method.id)}
                showInstructions={showInstructions}
                fee={calculateFee(method)}
                currency={currency}
                getIcon={getIcon}
              />
            ))}
          </div>
        </div>
      )}

      {/* Manual Methods */}
      {manualMethods.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-neutral-700">
              {automatedMethods.length > 0 ? 'Or Pay Manually' : 'Payment Methods'}
            </span>
          </div>
          <div className="space-y-2">
            {manualMethods.map(method => (
              <MethodCard
                key={method.id}
                method={method}
                isSelected={selectedMethodId === method.id}
                isExpanded={expandedMethod === method.id}
                onSelect={() => onSelect(method)}
                onToggleExpand={() => setExpandedMethod(expandedMethod === method.id ? null : method.id)}
                showInstructions={showInstructions}
                fee={calculateFee(method)}
                currency={currency}
                getIcon={getIcon}
              />
            ))}
          </div>
        </div>
      )}

      {/* Info about manual payments */}
      {manualMethods.length > 0 && !automatedMethods.length && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <strong>How manual payments work:</strong> Send payment via your chosen app, then upload a screenshot as proof. The recipient will confirm receipt.
        </div>
      )}
    </div>
  );
}

// Individual Method Card Component
interface MethodCardProps {
  method: PaymentMethod;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  showInstructions: boolean;
  fee: number;
  currency: string;
  getIcon: (name: string) => React.ComponentType<any>;
}

function MethodCard({
  method,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  showInstructions,
  fee,
  currency,
  getIcon,
}: MethodCardProps) {
  const Icon = getIcon(method.iconName);
  const typeBadge = TYPE_BADGES[method.type];

  return (
    <div
      className={`rounded-xl border-2 transition-all overflow-hidden ${
        isSelected
          ? 'border-primary-500 bg-primary-50/50'
          : 'border-neutral-200 hover:border-neutral-300 bg-white'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full p-4 text-left flex items-center gap-4"
      >
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${method.brandColor}15` }}
        >
          <Icon className="w-6 h-6" style={{ color: method.brandColor }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-neutral-900">{method.name}</span>
            <Badge variant={typeBadge.color} size="sm">{typeBadge.label}</Badge>
          </div>
          <p className="text-sm text-neutral-500 truncate">{method.description}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {method.estimatedDays}
            </span>
            {fee > 0 && (
              <span className="text-yellow-600">
                +{currency} {fee.toFixed(2)} fee
              </span>
            )}
          </div>
        </div>

        {/* Selection indicator */}
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          isSelected ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'
        }`}>
          {isSelected && <Check className="w-4 h-4 text-white" />}
        </div>
      </button>

      {/* Instructions (expandable) */}
      {showInstructions && method.requiresProof && isSelected && (
        <div className="px-4 pb-4 border-t border-neutral-100">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            className="w-full py-2 text-sm text-primary-600 hover:text-primary-700 flex items-center justify-center gap-1"
          >
            {isExpanded ? 'Hide' : 'Show'} instructions
            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
          
          {isExpanded && method.instructions && (
            <div className="mt-2 p-3 bg-neutral-50 rounded-lg text-sm text-neutral-600 whitespace-pre-line">
              {method.instructions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
