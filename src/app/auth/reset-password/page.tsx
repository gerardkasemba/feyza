'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { Lock, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
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
          <Card className="text-center bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
            </div>
            <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white mb-2">
              Password updated!
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400">
              Redirecting you to the dashboard...
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="animate-fade-in bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary-600 dark:text-primary-500" />
            </div>
            <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
              Reset your password
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">
              Enter your new password below
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="At least 8 characters"
              required
              className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
            />

            <Button type="submit" loading={isLoading} className="w-full">
              Reset Password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}