'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import { 
  Search, 
  ArrowRight, 
  Clock,
  CheckCircle,
  AlertCircle,
  Mail,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface LoanRequest {
  id: string;
  amount: number;
  currency: string;
  purpose: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  lender_email?: string;
}

export default function LoanStatusPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<LoanRequest[] | null>(null);
  const [sentEmail, setSentEmail] = useState(false);

  // Check localStorage for saved loan requests
  useEffect(() => {
    const saved = localStorage.getItem('myLoanRequests');
    if (saved) {
      try {
        const loans = JSON.parse(saved);
        if (loans.length > 0) {
          // Pre-fill email from saved loans
          setEmail(loans[0].email || '');
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/loan-status/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check status');
      }

      if (data.requests && data.requests.length > 0) {
        setRequests(data.requests);
      } else {
        setSentEmail(true);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const statusConfig = {
    pending: { label: 'Waiting for Lender', variant: 'warning' as const, icon: Clock },
    accepted: { label: 'Accepted', variant: 'success' as const, icon: CheckCircle },
    declined: { label: 'Declined', variant: 'danger' as const, icon: AlertCircle },
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              Check Loan Status
            </h1>
            <p className="text-neutral-600 dark:text-neutral-300">
              See if your loan request has been accepted
            </p>
          </div>

          {sentEmail ? (
            <Card className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Check Your Email!</h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                We've sent you a status update email with links to all your loan requests.
              </p>
              <Button variant="outline" onClick={() => { setSentEmail(false); setRequests(null); }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Another Email
              </Button>
            </Card>
          ) : requests ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-neutral-900 dark:text-white">Your Loan Requests</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setRequests(null)}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  New Search
                </Button>
              </div>

              {requests.map((request) => {
                const config = statusConfig[request.status];
                const StatusIcon = config.icon;

                return (
                  <Card key={request.id} className="hover:shadow-md dark:hover:shadow-neutral-800 transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-xl text-neutral-900 dark:text-white">
                          {formatCurrency(request.amount, request.currency)}
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{request.purpose}</p>
                      </div>
                      <Badge variant={config.variant}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>

                    <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                      Requested on {formatDate(request.created_at)}
                    </div>

                    {request.status === 'pending' && (
                      <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                        <p className="text-sm text-amber-800 dark:text-amber-400">
                          💡 <strong>Tip:</strong> Share your request link with friends or family who might help!
                        </p>
                      </div>
                    )}

                    {request.status === 'accepted' && (
                      <Link href={`/borrower/access`}>
                        <Button className="w-full">
                          View Loan Details
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    )}

                    {request.status === 'pending' && (
                      <Link href={`/loan-request/${request.id}`}>
                        <Button variant="outline" className="w-full">
                          View & Share Request
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <form onSubmit={handleCheckStatus} className="space-y-6">
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
                      className="w-full pl-12 pr-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    />
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                    Enter the email you used when requesting the loan
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Checking...' : 'Check Status'}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
                  Need to make a payment?{' '}
                  <Link href="/borrower/access" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
                    Access your loan
                  </Link>
                </p>
              </div>
            </Card>
          )}

          {/* Help Text */}
          <div className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            <p>
              Can't find your loan?{' '}
              <Link href="/" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                Request a new loan
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}