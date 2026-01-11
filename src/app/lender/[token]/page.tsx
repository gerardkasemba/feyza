'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Input, Select } from '@/components/ui';
import { 
  DollarSign, Calendar, User, Mail, Phone, CheckCircle, XCircle, 
  Clock, AlertCircle, TrendingUp, CreditCard, ArrowRight
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface GuestLender {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  paypal_email?: string;
  paypal_connected: boolean;
  total_loans: number;
  total_amount_lent: number;
}

interface LoanSummary {
  id: string;
  borrower_name: string;
  amount: number;
  currency: string;
  status: string;
  interest_rate: number;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
  start_date: string;
  created_at: string;
}

export default function GuestLenderDashboard() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const [lender, setLender] = useState<GuestLender | null>(null);
  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayPalSetup, setShowPayPalSetup] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [savingPayPal, setSavingPayPal] = useState(false);

  useEffect(() => {
    if (token) {
      fetchLenderData();
    }
  }, [token]);

  const fetchLenderData = async () => {
    try {
      const response = await fetch(`/api/guest-lender/${token}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Invalid or expired access link');
        } else {
          setError('Failed to load your lending dashboard');
        }
        return;
      }
      
      const data = await response.json();
      setLender(data.lender);
      setLoans(data.loans || []);
      setPaypalEmail(data.lender?.paypal_email || '');
    } catch (err) {
      console.error('Error fetching lender data:', err);
      setError('Failed to load your lending dashboard');
    } finally {
      setLoading(false);
    }
  };

  const savePayPalEmail = async () => {
    if (!paypalEmail) return;
    
    setSavingPayPal(true);
    try {
      const response = await fetch(`/api/guest-lender/${token}/paypal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paypalEmail }),
      });
      
      if (response.ok) {
        setLender(prev => prev ? { ...prev, paypal_email: paypalEmail, paypal_connected: true } : null);
        setShowPayPalSetup(false);
      }
    } catch (err) {
      console.error('Error saving PayPal:', err);
    } finally {
      setSavingPayPal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-pulse text-neutral-500">Loading your dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Card className="max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-neutral-900 mb-2">{error}</h1>
          <p className="text-neutral-500 mb-4">
            This link may have expired or is no longer valid.
          </p>
          <Link href="/">
            <Button>Go to Homepage</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const activeLoans = loans.filter(l => l.status === 'active');
  const pendingLoans = loans.filter(l => l.status === 'pending');
  const completedLoans = loans.filter(l => l.status === 'completed');
  const totalLent = loans.reduce((sum, l) => l.status !== 'declined' && l.status !== 'cancelled' ? sum + l.amount : sum, 0);
  const totalEarned = loans.reduce((sum, l) => sum + l.amount_paid, 0);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Your Lending Dashboard</h1>
              <p className="text-neutral-500">Welcome back, {lender?.full_name || lender?.email}</p>
            </div>
            <div className="flex items-center gap-4">
              {!lender?.paypal_connected && (
                <Button onClick={() => setShowPayPalSetup(true)} variant="outline">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Connect PayPal
                </Button>
              )}
              <Link href="/auth/signup">
                <Button>Create Full Account</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* PayPal Setup Notice */}
        {!lender?.paypal_connected && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Connect PayPal to receive payments</p>
              <p className="text-sm text-yellow-700">
                You need to connect your PayPal account to receive loan repayments automatically.
              </p>
              <Button 
                size="sm" 
                className="mt-2"
                onClick={() => setShowPayPalSetup(true)}
              >
                Connect Now
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Total Lent</p>
                <p className="text-2xl font-bold">{formatCurrency(totalLent)}</p>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Received Back</p>
                <p className="text-2xl font-bold">{formatCurrency(totalEarned)}</p>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Active Loans</p>
                <p className="text-2xl font-bold">{activeLoans.length}</p>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Pending Requests</p>
                <p className="text-2xl font-bold">{pendingLoans.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Pending Requests */}
        {pendingLoans.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Pending Requests</h2>
            <div className="space-y-4">
              {pendingLoans.map(loan => (
                <Card key={loan.id} className="border-orange-200 bg-orange-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900">{loan.borrower_name}</p>
                        <p className="text-sm text-neutral-500">
                          Requested {formatCurrency(loan.amount, loan.currency)} • {formatDate(loan.created_at)}
                        </p>
                      </div>
                    </div>
                    <Link href={`/invite/${token}?loan=${loan.id}`}>
                      <Button>
                        Review Request
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Active Loans */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Active Loans</h2>
          {activeLoans.length > 0 ? (
            <div className="space-y-4">
              {activeLoans.map(loan => (
                <Card key={loan.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900">{loan.borrower_name}</p>
                        <p className="text-sm text-neutral-500">
                          {formatCurrency(loan.amount, loan.currency)} @ {loan.interest_rate}% APR
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-neutral-500">Remaining</p>
                      <p className="text-lg font-bold text-primary-600">
                        {formatCurrency(loan.amount_remaining, loan.currency)}
                      </p>
                      <div className="w-32 h-2 bg-neutral-200 rounded-full mt-2">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${(loan.amount_paid / loan.total_amount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-8">
              <Clock className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">No active loans</p>
            </Card>
          )}
        </div>

        {/* Completed Loans */}
        {completedLoans.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Completed Loans</h2>
            <div className="space-y-4">
              {completedLoans.map(loan => (
                <Card key={loan.id} className="opacity-75">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900">{loan.borrower_name}</p>
                        <p className="text-sm text-neutral-500">
                          {formatCurrency(loan.total_amount, loan.currency)} fully repaid
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      Completed
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Create Account CTA */}
        <Card className="mt-8 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
          <div className="text-center py-4">
            <h3 className="text-xl font-bold mb-2">Want more features?</h3>
            <p className="text-primary-100 mb-4">
              Create a full account to track all your loans, set up automatic payments, and more.
            </p>
            <Link href="/auth/signup">
              <Button variant="secondary">
                Create Free Account
              </Button>
            </Link>
          </div>
        </Card>
      </main>

      {/* PayPal Setup Modal */}
      {showPayPalSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h3 className="text-lg font-bold text-neutral-900 mb-4">Connect PayPal</h3>
            <p className="text-sm text-neutral-500 mb-4">
              Enter your PayPal email address to receive loan repayments.
            </p>
            <Input
              label="PayPal Email"
              type="email"
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
              placeholder="your@email.com"
            />
            <div className="flex gap-3 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowPayPalSetup(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={savePayPalEmail}
                loading={savingPayPal}
                className="flex-1"
              >
                Save
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
