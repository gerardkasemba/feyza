'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { 
  CheckCircle, 
  Mail, 
  Share2, 
  Copy, 
  ArrowRight,
  MessageCircle,
  Users,
  Clock,
  Star,
  AlertTriangle,
  Bookmark,
  Smartphone
} from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const requestId = searchParams.get('id');
  const [copied, setCopied] = useState(false);
  const [showBookmarkHint, setShowBookmarkHint] = useState(true);

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/loan-request/${requestId}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Help me with a loan',
          text: 'I\'m looking for a loan through Feyza. Can you help?',
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopy();
    }
  };

  // Store loan link in localStorage for easy retrieval
  useEffect(() => {
    if (requestId && email) {
      const loans = JSON.parse(localStorage.getItem('myLoanRequests') || '[]');
      const exists = loans.find((l: any) => l.id === requestId);
      if (!exists) {
        loans.push({ id: requestId, email, createdAt: new Date().toISOString() });
        localStorage.setItem('myLoanRequests', JSON.stringify(loans));
      }
    }
  }, [requestId, email]);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-lg">
          {/* Success Card */}
          <Card className="text-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              Request Submitted! 🎉
            </h1>
            <p className="text-neutral-600 mb-6">
              We've sent a confirmation to <strong>{email}</strong>
            </p>

            {/* URGENT: Share Section - This is critical */}
            <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl p-6 mb-6 text-white">
              <div className="flex items-center justify-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-lg">Important: Share Your Request Now</h3>
              </div>
              <p className="text-white/90 text-sm mb-4">
                Your loan won't be funded until someone accepts it. Share with people who might help!
              </p>

              <div className="bg-white/10 rounded-lg p-3 mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-sm text-white placeholder-white/60"
                  />
                  <Button 
                    size="sm" 
                    className="bg-white text-primary-600 hover:bg-white/90"
                    onClick={handleCopy}
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                className="w-full bg-white text-primary-600 hover:bg-white/90 font-bold" 
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Link Now
              </Button>
            </div>

            {/* Quick Share Options */}
            <div className="mb-6">
              <p className="text-sm text-neutral-500 mb-3">Quick share with:</p>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Hey! I need a small loan and was hoping you might be able to help. Here's my request: ${shareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium"
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp
                </a>
                <a
                  href={`mailto:?subject=Can you help me with a loan?&body=Hey,%0A%0AI need a small loan and was hoping you might be able to help. I'm using Feyza to keep everything organized and transparent.%0A%0AHere's my request: ${shareUrl}%0A%0AThanks!`}
                  className="flex items-center justify-center gap-2 p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
                >
                  <Mail className="w-5 h-5" />
                  Email
                </a>
              </div>
            </div>

            {/* Suggestions for who to ask */}
            <div className="bg-neutral-50 rounded-xl p-4 text-left">
              <p className="font-medium text-neutral-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-600" />
                Who might help?
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {['👨‍👩‍👧 Parents', '👫 Siblings', '🤝 Close friends', '👴 Grandparents', '🧑‍💼 Coworkers', '👥 Extended family'].map((person) => (
                  <div key={person} className="flex items-center gap-2 text-neutral-600">
                    <span>{person}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Bookmark Reminder */}
          {showBookmarkHint && (
            <Card className="mb-6 border-2 border-amber-200 bg-amber-50">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Bookmark className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-amber-900">Save this page!</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Bookmark this page or save the email we sent you. You'll need the link to check your loan status later.
                  </p>
                </div>
                <button 
                  onClick={() => setShowBookmarkHint(false)}
                  className="text-amber-600 hover:text-amber-800"
                >
                  ✕
                </button>
              </div>
            </Card>
          )}

          {/* What's Next - Simplified */}
          <Card>
            <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-600" />
              What happens next?
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-neutral-900">✓ Request submitted</p>
                  <p className="text-sm text-neutral-500">Confirmation sent to your email</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-600">2</span>
                </div>
                <div>
                  <p className="font-medium text-neutral-900">Share with potential lenders</p>
                  <p className="text-sm text-neutral-500">The more people see it, the faster you'll get funded</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-neutral-400">3</span>
                </div>
                <div>
                  <p className="font-medium text-neutral-500">Someone accepts your request</p>
                  <p className="text-sm text-neutral-400">We'll email you immediately when this happens</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-neutral-400">4</span>
                </div>
                <div>
                  <p className="font-medium text-neutral-500">Receive funds & start repaying</p>
                  <p className="text-sm text-neutral-400">Track everything in one place</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Back to Home */}
          <div className="text-center mt-6">
            <Link href="/" className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-2">
              Back to Home
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function LoanRequestSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
