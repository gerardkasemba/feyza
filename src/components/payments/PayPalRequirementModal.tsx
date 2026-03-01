'use client';

import React, { useState } from 'react';
import { Button, Card } from '@/components/ui';
import { CreditCard, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface PayPalRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (email: string) => Promise<void>;
  title?: string;
  description?: string;
}

export function PayPalRequirementModal({
  isOpen,
  onClose,
  onConnect,
  title = 'PayPal Connection Required',
  description = 'You need to connect your PayPal account to proceed with this action.',
}: PayPalRequirementModalProps) {
  const [paypalEmail, setPaypalEmail] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnect = async () => {
    if (!paypalEmail || !paypalEmail.includes('@')) {
      setError('Please enter a valid PayPal email address');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await onConnect(paypalEmail);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to connect PayPal');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
          <p className="text-neutral-500 mt-2">{description}</p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-xl">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Why PayPal?</p>
                <ul className="text-blue-700 mt-1 space-y-1">
                  <li>• Secure payment processing</li>
                  <li>• Instant fund transfers</li>
                  <li>• Payment protection for both parties</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              PayPal Email Address
            </label>
            <input
              type="email"
              value={paypalEmail}
              onChange={(e) => {
                setPaypalEmail(e.target.value);
                setError(null);
              }}
              placeholder="your-email@example.com"
              className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleConnect}
              loading={isConnecting}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Connect PayPal
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
