'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Input, Card } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
            </div>
            <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white mb-2">
              Check your email
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mb-6">
              We've sent a password reset link to <strong className="text-neutral-900 dark:text-white">{email}</strong>
            </p>
            <Link href="/auth/signin">
              <Button variant="outline" className="w-full border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                Back to Sign In
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        <Card className="animate-fade-in bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-primary-600 dark:text-primary-500" />
            </div>
            <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
              Forgot password?
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              No worries, we'll send you reset instructions
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 focus:border-primary-500 dark:focus:border-primary-400 text-neutral-900 dark:text-white"
            />

            <Button type="submit" loading={isLoading} className="w-full">
              Send Reset Link
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}