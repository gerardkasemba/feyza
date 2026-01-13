'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Input } from '@/components/ui';
import { Mail, ArrowRight, Shield, CreditCard, Calendar, AlertCircle } from 'lucide-react';

export default function BorrowerAccessPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/guest-borrower/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to find loans');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              Access Your Loan
            </h1>
            <p className="text-neutral-600 dark:text-neutral-300">
              Track and pay your loan from a friend or family member
            </p>
          </div>

          {success ? (
            <Card className="text-center bg-white dark:bg-neutral-800">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Check Your Email!</h2>
              <p className="text-neutral-600 dark:text-neutral-300 mb-6">
                We've sent you an email with a link to access your loan(s). 
                The link will expire in 24 hours.
              </p>
              <Button variant="outline" onClick={() => setSuccess(false)}>
                Try Another Email
              </Button>
            </Card>
          ) : (
            <Card className="bg-white dark:bg-neutral-800">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Your Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full pl-12 pr-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    />
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                    Enter the email your lender used to send you the loan
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Finding your loans...' : 'Access My Loan'}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
                  Don't have a loan yet?{' '}
                  <Link href="/auth/signup" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
                    Create an account
                  </Link>
                </p>
              </div>
            </Card>
          )}

          {/* Benefits */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">Track Payments</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mx-auto mb-2">
                <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">Pay Online</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">Secure</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}