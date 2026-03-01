'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('page');

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import { 
  Clock, CheckCircle, Mail, FileText, Shield, ArrowRight, Loader2,
  RefreshCw, User, CreditCard, Camera, Briefcase, MapPin, Lock,
  ShieldCheck, Fingerprint, Bell, ExternalLink
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function VerifyPendingContent() {
  const searchParams = useSearchParams();
  const source = searchParams?.get('source');
  const type = searchParams?.get('type'); // 'reverification' for re-verification
  const supabase = createClient();
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUser(authUser);
          
          const { data: profile } = await supabase
            .from('users')
            .select('verification_status, full_name, email, verification_submitted_at')
            .eq('id', authUser.id)
            .single();
          
          if (profile) {
            setVerificationStatus(profile.verification_status);
            setUser({ ...authUser, ...profile });
          }
        }
      } catch (err) {
        log.error('Error checking user:', err);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-neutral-500">Loading...</p>
        </div>
      </div>
    );
  }

  const isFromGuestBusiness = source === 'guest-business';
  const isReverification = type === 'reverification';

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
            <ArrowRight className="w-5 h-5 rotate-180" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-600" />
            <span className="font-semibold text-neutral-900 dark:text-white">Verification Status</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Secure</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <Card className="p-8 shadow-xl border-0">
          {/* Animated Icon */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-amber-100 dark:bg-amber-900/30 rounded-full animate-pulse" />
            <div className="absolute inset-2 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>
            {/* Orbiting dots */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-500 rounded-full" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-3">
              {isReverification ? 'Re-verification Submitted' : 'Verification In Progress'}
            </h1>

            {isFromGuestBusiness && user?.full_name && (
              <p className="text-lg text-primary-600 dark:text-primary-400 font-medium mb-2">
                Welcome to Feyza, {user.full_name.split(' ')[0]}! 🎉
              </p>
            )}

            <p className="text-neutral-600 dark:text-neutral-400">
              {isReverification 
                ? "Your new selfie has been submitted for review. This usually takes just a few hours."
                : "Your documents are being reviewed. This typically takes 1-2 business days."
              }
            </p>
          </div>

          {/* Progress Timeline */}
          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-6 mb-8">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-5 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary-600" />
              {isReverification ? 'Re-verification Progress' : 'Verification Progress'}
            </h3>
            
            <div className="relative">
              {/* Progress line */}
              <div className="absolute left-3 top-6 bottom-6 w-0.5 bg-neutral-200 dark:bg-neutral-700" />
              
              <div className="space-y-6">
                {/* Step 1 - Submitted */}
                <div className="flex items-start gap-4 relative">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 z-10 shadow-lg shadow-green-500/30">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {isReverification ? 'Selfie Submitted' : 'Documents Submitted'}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {user?.verification_submitted_at 
                        ? new Date(user.verification_submitted_at).toLocaleString()
                        : 'Just now'
                      }
                    </p>
                  </div>
                </div>

                {/* Step 2 - Under Review */}
                <div className="flex items-start gap-4 relative">
                  <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 z-10 shadow-lg shadow-amber-500/30 animate-pulse">
                    <Clock className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="font-medium text-neutral-900 dark:text-white">Under Review</p>
                    <p className="text-sm text-neutral-500">Our team is verifying your submission</p>
                  </div>
                </div>

                {/* Step 3 - Approved (pending) */}
                <div className="flex items-start gap-4 relative">
                  <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0 z-10">
                    <CheckCircle className="w-3.5 h-3.5 text-neutral-400" />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="font-medium text-neutral-400 dark:text-neutral-500">
                      {isReverification ? 'Identity Confirmed' : 'Verification Approved'}
                    </p>
                    <p className="text-sm text-neutral-400">Pending review completion</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What was submitted */}
          {!isReverification && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { icon: User, label: 'Personal Info', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
                { icon: CreditCard, label: 'ID Document', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
                { icon: Camera, label: 'Selfie', color: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30' },
                { icon: MapPin, label: 'Address', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
              ].map((item, i) => (
                <div key={i} className="text-center p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                  <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center mx-auto mb-2`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{item.label}</p>
                  <CheckCircle className="w-4 h-4 text-green-500 mx-auto mt-1" />
                </div>
              ))}
            </div>
          )}

          {/* Email notification */}
          <div className="flex items-start gap-3 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl mb-8">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-primary-800 dark:text-primary-300">We'll notify you</p>
              <p className="text-sm text-primary-700 dark:text-primary-400 mt-0.5">
                An email will be sent to <strong>{user?.email}</strong> once your verification is complete.
              </p>
            </div>
          </div>

          {/* Estimated time */}
          <div className="text-center p-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl mb-8">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Estimated review time</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
              {isReverification ? '2-4 hours' : '1-2 business days'}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link href="/dashboard">
              <Button className="w-full h-12 text-base">
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            
            <div className="flex gap-3">
              <Link href="/settings" className="flex-1">
                <Button variant="outline" className="w-full">
                  Settings
                </Button>
              </Link>
              <a href="mailto:support@feyza.io" className="flex-1">
                <Button variant="outline" className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              </a>
            </div>
          </div>
        </Card>

        {/* Security Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-6 text-xs text-neutral-400">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>256-bit SSL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Bank-level security</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5" />
              <span>GDPR compliant</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyPendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-neutral-500">Loading...</p>
        </div>
      </div>
    }>
      <VerifyPendingContent />
    </Suspense>
  );
}
