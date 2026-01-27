'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, Button, Input } from '@/components/ui';
import {
  Mail,
  User,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Wallet,
  Loader2,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { MdEmail } from 'react-icons/md';
import { getMostRecentSession, hasGuestSessions, endGuestSessionsByType } from '@/hooks/useGuestSession';
import { Footer, Navbar } from '@/components/layout';

export default function LenderAccessPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingSession, setExistingSession] = useState<{ token: string; name?: string } | null>(null);

  useEffect(() => {
    const checkSession = () => {
      if (hasGuestSessions('lender')) {
        const recentSession = getMostRecentSession('lender');
        if (recentSession) setExistingSession({ token: recentSession.token, name: recentSession.name });
      }
      setCheckingSession(false);
    };

    setTimeout(checkSession, 100);
  }, []);

  const handleUseAnotherEmail = () => {
    // ✅ Properly end the lender guest session completely
    endGuestSessionsByType('lender');

    // ✅ Reset UI state
    setExistingSession(null);
    setEmail('');
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const clean = email.trim().toLowerCase();
    setEmail(clean);

    if (!clean || !clean.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/lender/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send access link');

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Checking your session…</p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
        <div className="max-w-md w-full">
          <Card className="p-6 sm:p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-5 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-500" />
            </div>

            <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
              Check your email <MdEmail className="inline-block ml-1 w-6 h-6 align-[-4px]" />
            </h1>

            <p className="text-neutral-500 dark:text-neutral-400 mt-3">
              We sent a secure access link to <strong className="text-neutral-900 dark:text-white">{email}</strong>.
            </p>

            <div className="mt-6 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-left">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-neutral-700 dark:text-neutral-300 mt-0.5" />
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  <p className="font-medium text-neutral-900 dark:text-white">Security tip</p>
                  <p className="mt-1">The link is unique to you. Don’t forward it. If you didn’t request this, you can ignore the email.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
              Didn’t receive it? Check spam, or{' '}
              <button onClick={() => setSuccess(false)} className="text-primary-600 dark:text-primary-400 hover:underline">
                try again
              </button>
              .
            </div>

            <div className="mt-6">
              <Link href="/" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                Back to home
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const title = existingSession ? 'Lender Access' : 'Lender Dashboard Access';
  const subtitle = existingSession
    ? 'Continue your session or request a new access link'
    : 'Enter your email to receive a secure access link';

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 px-4 py-10">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left */}
          <div className="lg:sticky lg:top-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary-600 dark:bg-primary-700 flex items-center justify-center shadow-sm">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">{title}</h1>
                <p className="text-neutral-600 dark:text-neutral-400">{subtitle}</p>
              </div>
            </div>

            {/* Existing session card */}
            {existingSession ? (
              <Card className="p-5 border border-green-200 dark:border-green-900/40 bg-green-50/60 dark:bg-green-900/10">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-green-700 dark:text-green-400" />
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold text-green-900 dark:text-green-200">Welcome back</p>
                    <p className="text-sm text-green-800/90 dark:text-green-300 mt-1">
                      {existingSession.name
                        ? `Continue managing loans for ${existingSession.name}.`
                        : 'You have an active lending session.'}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        onClick={() => router.push(`/lender/${existingSession.token}`)}
                        className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                        size="sm"
                      >
                        Go to dashboard
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>

                      <Button variant="outline" size="sm" onClick={handleUseAnotherEmail}>
                        Use another email
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">Secure, passwordless access</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                      We’ll email you a one-time link. No account required to view and manage loans tied to your email.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <ChevronRight className="w-4 h-4" />
                    View all requests & loans in one place
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <ChevronRight className="w-4 h-4" />
                    Confirm payments and track schedules
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <ChevronRight className="w-4 h-4" />
                    Bank-level security for access links
                  </div>
                </div>
              </Card>
            )}

            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Borrower requests are linked to your email. If someone sent you a request, use the same email address here.
            </p>
          </div>

          {/* Right: Form */}
          <Card className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-900 dark:text-amber-200 font-semibold">We couldn’t send the link</p>
                      <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">{error}</p>
                      {error.includes('No active loans') ? (
                        <p className="text-sm text-amber-800/90 dark:text-amber-300 mt-2">
                          If someone submitted a request to you, check your email for the acceptance link.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              <div>
                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  icon={<Mail className="w-4 h-4" />}
                />
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">We’ll only use this to send your secure dashboard link.</p>
              </div>

              <Button type="submit" className="w-full" loading={isLoading}>
                Send access link
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <div className="rounded-xl p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-neutral-700 dark:text-neutral-300 mt-0.5" />
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    <p className="font-medium text-neutral-900 dark:text-white">How it works</p>
                    <p className="mt-1">
                      If you have loan requests tied to this email, we’ll send a secure link to view and manage them.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Already have an account?{' '}
                  <Link href="/auth/signin" className="text-primary-600 dark:text-primary-400 hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </Card>
        </div>

        <div className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
          <Link href="/" className="text-primary-600 dark:text-primary-400 hover:underline">
            Back to home
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
