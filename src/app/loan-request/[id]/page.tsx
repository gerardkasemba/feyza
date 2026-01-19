'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import { 
  DollarSign, 
  User, 
  Calendar, 
  FileText, 
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Share2,
  Copy,
  MessageCircle,
  Mail,
  Heart,
  Shield
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  MdEmergency, 
  MdLocalHospital, 
  MdSchool, 
  MdBusiness, 
  MdHome,
  MdDescription 
} from 'react-icons/md';

interface LoanRequest {
  id: string;
  amount: number;
  currency: string;
  purpose: string;
  description?: string;
  borrower_name: string;
  borrower_email: string;
  status: string;
  created_at: string;
}

export default function LoanRequestPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestId = params.id as string;
  const token = searchParams.get('token');

  const [request, setRequest] = useState<LoanRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Lender info for accepting
  const [lenderEmail, setLenderEmail] = useState('');
  const [lenderName, setLenderName] = useState('');
  const [showAcceptForm, setShowAcceptForm] = useState(false);

  useEffect(() => {
    fetchRequest();
  }, [requestId]);

  const fetchRequest = async () => {
    try {
      const url = token 
        ? `/api/guest-loan-request/${requestId}?token=${token}`
        : `/api/guest-loan-request/${requestId}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load request');
      }

      setRequest(data.request);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!lenderEmail || !lenderName) {
      alert('Please enter your name and email');
      return;
    }

    setAccepting(true);
    try {
      const response = await fetch(`/api/guest-loan-request/${requestId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lender_email: lenderEmail,
          lender_name: lenderName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept request');
      }

      // Redirect to setup loan terms
      router.push(`/lender/setup-loan/${data.loan_id}?token=${data.lender_token}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAccepting(false);
    }
  };

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/loan-request/${requestId}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isBorrower = !!token;

  const purposeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    emergency: { label: 'Emergency', icon: <MdEmergency className="w-5 h-5 mr-2" /> },
    medical: { label: 'Medical', icon: <MdLocalHospital className="w-5 h-5 mr-2" /> },
    education: { label: 'Education', icon: <MdSchool className="w-5 h-5 mr-2" /> },
    business: { label: 'Business', icon: <MdBusiness className="w-5 h-5 mr-2" /> },
    personal: { label: 'Personal', icon: <MdHome className="w-5 h-5 mr-2" /> },
    other: { label: 'Other', icon: <MdDescription className="w-5 h-5 mr-2" /> },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 dark:border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading request...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Request Not Found</h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              {error || 'This loan request may have been removed or expired.'}
            </p>
            <Link href="/">
              <Button>Go to Homepage</Button>
            </Link>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const purposeInfo = purposeLabels[request.purpose] || { label: request.purpose, icon: <FileText className="w-5 h-5 mr-2" /> };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900">
      <Navbar />

      <main className="flex-1 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Status Badge */}
          <div className="flex justify-center mb-6">
            <Badge 
              variant={request.status === 'pending' ? 'warning' : 'success'} 
              className="text-sm px-4 py-2"
            >
              {request.status === 'pending' ? (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Looking for a lender
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Loan in progress
                </>
              )}
            </Badge>
          </div>

          {/* Main Card */}
          <Card className="mb-6">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-primary-600 dark:text-primary-500" />
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 mb-2">Loan Request</p>
              <h1 className="text-4xl font-bold text-neutral-900 dark:text-white">
                {formatCurrency(request.amount, request.currency)}
              </h1>
            </div>

            {/* Details */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                <User className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Borrower</p>
                  <p className="font-medium text-neutral-900 dark:text-white">{request.borrower_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                <div className="text-neutral-400 dark:text-neutral-500">
                  {purposeInfo.icon}
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Purpose</p>
                  <div className="flex items-center font-medium text-neutral-900 dark:text-white">
                    {purposeInfo.icon}
                    {purposeInfo.label}
                  </div>
                </div>
              </div>

              {request.description && (
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Description</p>
                  <p className="text-neutral-700 dark:text-neutral-300">{request.description}</p>
                </div>
              )}

              <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                <Calendar className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Requested On</p>
                  <p className="font-medium text-neutral-900 dark:text-white">{formatDate(request.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            {request.status === 'pending' && !isBorrower && (
              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6">
                {!showAcceptForm ? (
                  <div className="text-center">
                    <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                      Want to help {request.borrower_name} with this loan?
                    </p>
                    <Button size="lg" className="w-full" onClick={() => setShowAcceptForm(true)}>
                      <Heart className="w-5 h-5 mr-2" />
                      I'll Lend This Money
                    </Button>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-3">
                      You'll be able to set interest rates and terms on the next step
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-neutral-900 dark:text-white">Your Information</h3>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={lenderName}
                        onChange={(e) => setLenderName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Your Email
                      </label>
                      <input
                        type="email"
                        value={lenderEmail}
                        onChange={(e) => setLenderEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      />
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        We'll send you updates about this loan
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setShowAcceptForm(false)}>
                        Cancel
                      </Button>
                      <Button 
                        className="flex-1" 
                        onClick={handleAccept}
                        disabled={accepting || !lenderName || !lenderEmail}
                      >
                        {accepting ? 'Processing...' : 'Continue'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Share Section (for borrower) */}
            {isBorrower && request.status === 'pending' && (
              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6">
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-primary-600 dark:text-primary-500" />
                  Share this request
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                  Send this link to friends or family who might help
                </p>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white"
                  />
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`I need help with a loan. Can you help? ${shareUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-xl transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                  </a>
                  <a
                    href={`mailto:?subject=Help me with a loan&body=Hi, I need help with a loan. Can you help? ${shareUrl}`}
                    className="flex items-center justify-center gap-2 p-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                    Email
                  </a>
                </div>
              </div>
            )}
          </Card>

          {/* Trust Section */}
          <div className="flex items-center justify-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              Secure
            </span>
            <span>•</span>
            <span>No fees</span>
            <span>•</span>
            <span>Powered by Feyza</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}