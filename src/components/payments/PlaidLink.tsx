'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from '@/components/ui';
import { Building, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface PlaidLinkButtonProps {
  onSuccess: (data: {
    bank_name: string;
    account_mask: string;
    account_type: string;
    funding_source_id: string;
  }) => void;
  onError?: (error: string) => void;
  buttonText?: string;
  className?: string;
  isUpdate?: boolean;
}

export function PlaidLinkButton({
  onSuccess,
  onError,
  buttonText = 'Connect Bank Account',
  className = '',
  isUpdate = false,
}: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch link token on mount
  useEffect(() => {
    const fetchLinkToken = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/plaid/link-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isUpdate }),
        });
        
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
          onError?.(data.error);
        } else {
          setLinkToken(data.link_token);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize bank connection');
        onError?.(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLinkToken();
  }, [isUpdate, onError]);

  // Handle successful Plaid Link
  const handlePlaidSuccess = useCallback(
    async (publicToken: string, metadata: any) => {
      setConnecting(true);
      setError(null);
      
      try {
        const accountId = metadata.accounts[0]?.id;
        const institution = metadata.institution;
        
        const response = await fetch('/api/plaid/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token: publicToken,
            account_id: accountId,
            institution: institution,
          }),
        });
        
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
          onError?.(data.error);
        } else {
          onSuccess({
            bank_name: data.bank_name,
            account_mask: data.account_mask,
            account_type: data.account_type,
            funding_source_id: data.funding_source_id,
          });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to connect bank account');
        onError?.(err.message);
      } finally {
        setConnecting(false);
      }
    },
    [onSuccess, onError]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handlePlaidSuccess,
    onExit: (err) => {
      if (err) {
        console.log('Plaid Link exit error:', err);
      }
    },
  });

  if (error) {
    return (
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setError(null);
            setLinkToken(null);
            // Re-fetch link token
            window.location.reload();
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => open()}
      disabled={!ready || loading || connecting}
      className={className}
    >
      {loading || connecting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {connecting ? 'Connecting...' : 'Loading...'}
        </>
      ) : (
        <>
          <Building className="w-4 h-4 mr-2" />
          {buttonText}
        </>
      )}
    </Button>
  );
}

// Display connected bank info
interface ConnectedBankProps {
  bankName: string;
  accountMask: string;
  accountType?: string;
  onDisconnect?: () => void;
  onUpdate?: () => void;
}

export function ConnectedBank({
  bankName,
  accountMask,
  accountType,
  onDisconnect,
  onUpdate,
}: ConnectedBankProps) {
  return (
    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center">
            <Building className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-900 dark:text-white">{bankName}</span>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {accountType && `${accountType.charAt(0).toUpperCase() + accountType.slice(1)} • `}
              ••••{accountMask}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onUpdate && (
            <Button variant="outline" size="sm" onClick={onUpdate}>
              Update
            </Button>
          )}
          {onDisconnect && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDisconnect}
              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Disconnect
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Bank connection required banner
interface BankConnectionRequiredProps {
  message?: string;
  onConnect?: () => void;
}

export function BankConnectionRequired({ 
  message = 'Connect your bank account to send and receive payments',
  onConnect 
}: BankConnectionRequiredProps) {
  return (
    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
            Bank Account Required
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
            {message}
          </p>
          {onConnect ? (
            <Button 
              size="sm" 
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
              onClick={onConnect}
            >
              <Building className="w-4 h-4 mr-2" />
              Connect Bank
            </Button>
          ) : (
            <a href="/settings?tab=payments">
              <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white">
                <Building className="w-4 h-4 mr-2" />
                Go to Settings
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
