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
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
  Eye,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { 
  FaUserFriends, 
  FaHandshake, 
  FaUserTie, 
  FaUserGraduate,
} from 'react-icons/fa';
import { RiParentLine } from 'react-icons/ri';

function SuccessContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const requestId = searchParams.get('id');
  const borrowerToken = searchParams.get('token');
  const [copied, setCopied] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/loan-request/${requestId}`
    : '';

  // URL for borrower portal
  const borrowerPortalUrl = `/borrower/${borrowerToken}`;

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
    if (requestId && email && borrowerToken) {
      const loans = JSON.parse(localStorage.getItem('myLoanRequests') || '[]');
      const exists = loans.find((l: any) => l.id === requestId);
      if (!exists) {
        loans.push({ 
          id: requestId, 
          email, 
          borrowerToken: borrowerToken,
          createdAt: new Date().toISOString() 
        });
        localStorage.setItem('myLoanRequests', JSON.stringify(loans));
      }
    }
  }, [requestId, email, borrowerToken]);

  const peopleSuggestions = [
    { icon: <RiParentLine className="w-5 h-5 text-primary-600" />, label: 'Parents' },
    { icon: <FaUserFriends className="w-5 h-5 text-blue-600" />, label: 'Siblings' },
    { icon: <FaHandshake className="w-5 h-5 text-green-600" />, label: 'Close friends' },
    { icon: <FaUserGraduate className="w-5 h-5 text-purple-600" />, label: 'Grandparents' },
    { icon: <FaUserTie className="w-5 h-5 text-amber-600" />, label: 'Coworkers' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      <Navbar />

      <main className="flex-1 py-8 px-4">
        <div className="w-full max-w-2xl mx-auto">
          
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
              You're All Set! 🎉
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Your loan request has been created successfully.
            </p>
          </div>

          {/* What To Do Now - Main Action Card */}
          <Card className="mb-6 border-2 border-primary-200 dark:border-primary-800 bg-white dark:bg-neutral-900">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">What To Do Now</h2>
            </div>
            
            <div className="space-y-4">
              {/* Step 1: Share */}
              <div className="flex gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
                    Share Your Request Link
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                    Send your link to someone you know and trust who might be able to help. This could be family, friends, or anyone you have a relationship with.
                  </p>
                  
                  {/* Share URL Box */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-amber-300 dark:border-amber-700 rounded-lg text-sm text-neutral-800 dark:text-neutral-200"
                    />
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300"
                      onClick={handleCopy}
                    >
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Quick Share Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Hey! I need a small loan and was hoping you might be able to help. Here's my request: ${shareUrl}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </a>
                    <a
                      href={`mailto:?subject=Can you help me with a loan?&body=Hey,%0A%0AI need a small loan and was hoping you might be able to help. I'm using Feyza to keep everything organized and transparent.%0A%0AHere's my request: ${shareUrl}%0A%0AThanks!`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </a>
                    <Button 
                      size="sm"
                      onClick={handleShare}
                      className="bg-primary-600 hover:bg-primary-700"
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 2: Wait */}
              <div className="flex gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                    Wait for Someone to Accept
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    When someone opens your link, they'll see your request and can choose to help. They'll set up the loan terms (interest rate, payment schedule) and send you the money.
                  </p>
                </div>
              </div>

              {/* Step 3: Track */}
              <div className="flex gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 dark:text-green-200 mb-1">
                    Track Everything in Your Dashboard
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                    Use your personal dashboard to see your loan status, receive funds, and make repayments when the time comes.
                  </p>
                  <Link href={borrowerPortalUrl}>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      <Eye className="w-4 h-4 mr-2" />
                      View My Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>

          {/* People Who Might Help */}
          <Card className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h3 className="font-semibold text-neutral-900 dark:text-white">Who to Ask?</h3>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
              Feyza works best for loans between people who know each other. Consider reaching out to:
            </p>
            <div className="flex flex-wrap gap-2">
              {peopleSuggestions.map((person, index) => (
                <div key={index} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full text-sm text-neutral-700 dark:text-neutral-300">
                  {person.icon}
                  <span>{person.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Email Confirmation */}
          <Card className="mb-6 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5" />
              <div>
                <p className="font-medium text-primary-900 dark:text-primary-200">
                  Check your email!
                </p>
                <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                  We've sent a confirmation to <strong>{email}</strong> with your dashboard link. Save it for easy access later.
                </p>
              </div>
            </div>
          </Card>

          {/* How It Works - Expandable */}
          <Card className="mb-6">
            <button 
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-neutral-500" />
                <span className="font-semibold text-neutral-900 dark:text-white">How does Feyza work?</span>
              </div>
              {showHowItWorks ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {showHowItWorks && (
              <div className="mt-4 space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
                <div className="flex gap-3">
                  <DollarSign className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">You request money</p>
                    <p>Tell us how much you need and why. We connect your bank so you can receive funds directly.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Users className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">Someone you know lends to you</p>
                    <p>Share your request with friends or family. They review your request and decide if they can help.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">Everything is tracked automatically</p>
                    <p>Feyza keeps track of the loan terms, payment schedule, and who paid what. No more awkward conversations or forgotten IOUs.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Calendar className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">You repay over time</p>
                    <p>Make payments according to the schedule. We send reminders and track your progress automatically.</p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* FAQ - Expandable */}
          <Card className="mb-6">
            <button 
              onClick={() => setShowFAQ(!showFAQ)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-neutral-500" />
                <span className="font-semibold text-neutral-900 dark:text-white">Common Questions</span>
              </div>
              {showFAQ ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {showFAQ && (
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">What if no one accepts my request?</p>
                  <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                    Your request stays active until someone accepts or you cancel it. Try sharing with more people or asking directly.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">Is my information safe?</p>
                  <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                    Yes! Your banking info is securely handled by our partners (Plaid & Dwolla). We never see your bank login.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">How fast will I get the money?</p>
                  <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                    Once someone accepts and sends funds, it typically takes 1-3 business days for the bank transfer to complete.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">Does Feyza charge fees?</p>
                  <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                    Feyza charges a small platform fee to help keep the service running. You'll see all fees clearly before finalizing any loan.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Footer Actions */}
          <div className="text-center space-y-4">
            <Link href={borrowerPortalUrl}>
              <Button size="lg" className="w-full bg-primary-600 hover:bg-primary-700 text-white">
                Go to My Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/" className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 font-medium inline-flex items-center gap-2 text-sm">
              Back to Home
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
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 dark:border-primary-400 border-t-transparent rounded-full" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
