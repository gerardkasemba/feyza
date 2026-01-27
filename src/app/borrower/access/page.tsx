'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Input } from '@/components/ui';
import {
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  Loader2,
  CreditCard,
  ShieldCheck,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { getMostRecentSession, hasGuestSessions, endGuestSessionsByType } from '@/hooks/useGuestSession';

export default function BorrowerAccessPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingSession, setExistingSession] = useState<{ token: string; name?: string } | null>(null);

  useEffect(() => {
    const checkSession = () => {
      if (hasGuestSessions('borrower')) {
        const recentSession = getMostRecentSession('borrower');
        if (recentSession) setExistingSession({ token: recentSession.token, name: recentSession.name });
      }
      setCheckingSession(false);
    };

    setTimeout(checkSession, 100);
  }, []);

  const handleUseAnotherEmail = () => {
    // ✅ fully end borrower sessions so the "welcome back" box won't return on refresh
    endGuestSessionsByType('borrower');

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

    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/guest-borrower/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to find loans');

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (checkingSession) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400">Checking your session…</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const hasSession = !!existingSession;

  const title = hasSession ? 'Borrower Access' : 'Access Your Loan';
  const subtitle = hasSession
    ? 'Continue your session or request a new access link.'
    : 'Track payments, view schedules, and pay securely online.';

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <Navbar />

      <main className="flex-1">
        {/* Top band (matches previous style) */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-950/60 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 px-4 py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-600 dark:bg-primary-700 flex items-center justify-center shadow-sm">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">{title}</h1>
                  <p className="text-neutral-600 dark:text-neutral-400">{subtitle}</p>
                </div>
              </div>

              <Link
                href="/loan-request"
                className="hidden sm:inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Create a new loan request <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 px-4 py-10">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* LEFT: Explanation + existing session (same vibe as lender page) */}
            <div className="lg:sticky lg:top-8 space-y-6">
              {hasSession ? (
                <Card className="p-5 border border-green-200 dark:border-green-900/40 bg-green-50/60 dark:bg-green-900/10">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-green-700 dark:text-green-400" />
                    </div>

                    <div className="flex-1">
                      <p className="font-semibold text-green-900 dark:text-green-200">Welcome back</p>
                      <p className="text-sm text-green-800/90 dark:text-green-300 mt-1">
                        {existingSession?.name
                          ? `Continue managing your loan for ${existingSession.name}.`
                          : 'You have an active borrower session.'}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          onClick={() => router.push(`/borrower/${existingSession!.token}`)}
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
                      <p className="font-semibold text-neutral-900 dark:text-white">Secure, email-based access</p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        We’ll email you a one-time link to your loan dashboard. No password needed.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <ChevronRight className="w-4 h-4" />
                      View schedule & repayment progress
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <ChevronRight className="w-4 h-4" />
                      Pay online (if enabled by your lender)
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <ChevronRight className="w-4 h-4" />
                      Automatic reminders & transparency
                    </div>
                  </div>
                </Card>
              )}

              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Borrower requests are linked to your email. If someone sent you a request, use the same email address here.
              </p>
            </div>

            {/* RIGHT: Form / success (same structure as lender page) */}
            <Card className="p-6 sm:p-8">
              {success ? (
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto mb-5 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-500" />
                  </div>

                  <h2 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">Check your email</h2>
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
                    <Button variant="outline" onClick={() => setSuccess(false)}>
                      Try another email
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error ? (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-amber-900 dark:text-amber-200 font-semibold">We couldn’t find your loans</p>
                          <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">{error}</p>
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
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      Enter the email your lender used to send you the loan.
                    </p>
                  </div>

                  <Button type="submit" className="w-full" loading={loading}>
                    Send access link
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <div className="rounded-xl p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-neutral-700 dark:text-neutral-300 mt-0.5" />
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        <p className="font-medium text-neutral-900 dark:text-white">How it works</p>
                        <p className="mt-1">
                          If you have a loan tied to this email, we’ll send a secure link to view payments and schedule.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 text-center">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Don’t have a loan yet?{' '}
                      <Link
                        href="/loan-request"
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                      >
                        Request a new loan
                      </Link>
                    </p>
                  </div>
                </form>
              )}
            </Card>
          </div>

          <div className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            <Link href="/" className="text-primary-600 dark:text-primary-400 hover:underline">
              Back to home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
