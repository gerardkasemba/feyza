'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, Button, Input } from '@/components/ui';
import { Mail, ArrowRight, CheckCircle, AlertCircle, Wallet } from 'lucide-react';

export default function LenderAccessPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/lender/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send access link');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
        <Card className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-display font-bold text-neutral-900 mb-2">
            Check Your Email! 📧
          </h1>
          <p className="text-neutral-500 mb-6">
            We've sent a link to <strong>{email}</strong> to access your lending dashboard.
          </p>
          <p className="text-sm text-neutral-400">
            Didn't receive it? Check your spam folder or{' '}
            <button
              onClick={() => setSuccess(false)}
              className="text-primary-600 hover:underline"
            >
              try again
            </button>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-neutral-900 mb-2">
            Lender Dashboard Access
          </h1>
          <p className="text-neutral-500">
            Enter your email to access your lending dashboard
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              icon={<Mail className="w-4 h-4" />}
            />

            <div className="bg-neutral-50 rounded-xl p-4">
              <p className="text-sm text-neutral-600">
                <strong>How it works:</strong> If you've received loan requests at this email, 
                we'll send you a secure link to view and manage all your loans.
              </p>
            </div>

            <Button type="submit" className="w-full" loading={isLoading}>
              Send Access Link
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-neutral-100 text-center">
            <p className="text-sm text-neutral-500 mb-2">Already have an account?</p>
            <Link href="/auth/signin">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
          </div>
        </Card>

        <p className="text-center text-sm text-neutral-500 mt-8">
          <Link href="/" className="text-primary-600 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
