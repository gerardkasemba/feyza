'use client';

import React, { useState } from 'react';
import { Button, Card, Input, Modal } from '@/components/ui';
import { User } from '@/types';
import { CreditCard, Check, X, AlertCircle } from 'lucide-react';

interface PayPalConnectProps {
  user: User;
  onConnect: (email: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function PayPalConnect({ user, onConnect, onDisconnect }: PayPalConnectProps) {
  const [showModal, setShowModal] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = user.paypal_connected;

  const handleConnect = async () => {
    if (!paypalEmail || !paypalEmail.includes('@')) {
      setError('Please enter a valid PayPal email');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onConnect(paypalEmail);
      setShowModal(false);
      setPaypalEmail('');
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to connect PayPal');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your PayPal account? Automatic payments will be disabled.')) {
      return;
    }

    setLoading(true);
    try {
      await onDisconnect();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isConnected ? 'bg-green-100' : 'bg-neutral-100'
          }`}>
            <CreditCard className={`w-6 h-6 ${isConnected ? 'text-green-600' : 'text-neutral-400'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-neutral-900">PayPal Account</h3>
              {isConnected && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Connected
                </span>
              )}
            </div>
            
            {isConnected ? (
              <>
                <p className="text-sm text-neutral-500 mb-1">
                  Connected to: <strong>{user.paypal_email}</strong>
                </p>
                <p className="text-xs text-neutral-400 mb-3">
                  Automatic payments are enabled for loans you borrow
                </p>
                <Button variant="outline" size="sm" onClick={handleDisconnect} loading={loading}>
                  <X className="w-4 h-4 mr-1" />
                  Disconnect PayPal
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-neutral-500 mb-3">
                  Connect your PayPal to enable automatic loan payments and receive funds directly
                </p>
                <Button size="sm" onClick={() => setShowModal(true)}>
                  <CreditCard className="w-4 h-4 mr-1" />
                  Connect PayPal
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Connect Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Connect PayPal Account"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Why connect PayPal?</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• Automatic payment on due dates (no manual action needed)</li>
                  <li>• Receive loan disbursements directly</li>
                  <li>• Get paid instantly when borrowers repay</li>
                </ul>
              </div>
            </div>
          </div>

          <Input
            label="PayPal Email Address"
            type="email"
            placeholder="your-paypal@email.com"
            value={paypalEmail}
            onChange={(e) => setPaypalEmail(e.target.value)}
            error={error || undefined}
            helperText="Enter the email associated with your PayPal account"
          />

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> By connecting your PayPal, you authorize Feyza to:
            </p>
            <ul className="text-sm text-yellow-700 mt-2 space-y-1">
              <li>• Automatically charge your PayPal for loan repayments</li>
              <li>• Send loan funds to your PayPal account</li>
            </ul>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnect} loading={loading}>
              Connect PayPal
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
