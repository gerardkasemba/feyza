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
  Users
} from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const requestId = searchParams.get('id');
  const [copied, setCopied] = useState(false);

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
          text: 'I\'m looking for a loan through LoanTrack. Can you help?',
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopy();
    }
  };

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
              We've sent a confirmation email to <strong>{email}</strong>
            </p>

            {/* Share Section */}
            <div className="bg-primary-50 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-neutral-900 mb-2 flex items-center justify-center gap-2">
                <Share2 className="w-5 h-5 text-primary-600" />
                Share with potential lenders
              </h3>
              <p className="text-sm text-neutral-600 mb-4">
                Send this link to friends or family who might help
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-600"
                />
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              <Button className="w-full mt-4" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share Now
              </Button>
            </div>

            {/* Quick Share Options */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`I'm looking for a loan. Can you help? ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </a>
              <a
                href={`mailto:?subject=Help me with a loan&body=Hi, I'm looking for a loan through LoanTrack. Can you help? ${shareUrl}`}
                className="flex items-center justify-center gap-2 p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
              >
                <Mail className="w-5 h-5" />
                Email
              </a>
            </div>
          </Card>

          {/* What's Next */}
          <Card>
            <h3 className="font-semibold text-neutral-900 mb-4">What happens next?</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-600">1</span>
                </div>
                <div>
                  <p className="font-medium text-neutral-900">Check your email</p>
                  <p className="text-sm text-neutral-600">
                    We've sent you a confirmation with your request details
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-600">2</span>
                </div>
                <div>
                  <p className="font-medium text-neutral-900">Share with potential lenders</p>
                  <p className="text-sm text-neutral-600">
                    Send your loan request link to friends, family, or anyone who might help
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-600">3</span>
                </div>
                <div>
                  <p className="font-medium text-neutral-900">Get notified when accepted</p>
                  <p className="text-sm text-neutral-600">
                    We'll email you when someone accepts your loan request
                  </p>
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
