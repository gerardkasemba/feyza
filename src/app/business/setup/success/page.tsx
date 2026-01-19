'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { 
  CheckCircle, Clock, Building2, Settings, Bell, 
  Share2, ExternalLink, Copy, ArrowRight
} from 'lucide-react';
import { FaRegCheckCircle } from 'react-icons/fa';

export default function BusinessSetupSuccessPage() {
  const router = useRouter();
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      
      // Get business profile
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) {
        router.push('/business/setup');
        return;
      }
      
      setBusinessProfile(profile);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const copyProfileLink = () => {
    if (businessProfile?.slug) {
      const link = `${window.location.origin}/lend/${businessProfile.slug}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="animate-pulse text-neutral-500 dark:text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-teal-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        {/* Success Card */}
        <Card className="text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-900/30 dark:to-teal-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <FaRegCheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Application Submitted!
            </h1>
          </div>
          
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Your business profile for <strong className="text-neutral-900 dark:text-white">{businessProfile?.business_name}</strong> has been submitted for review.
          </p>

          {/* Status Card */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <span className="font-semibold text-yellow-800 dark:text-yellow-300">Under Review</span>
            </div>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Our team will review your application within 1-2 business days. 
              You'll receive an email once your account is approved.
            </p>
          </div>

          {/* What Happens Next */}
          <div className="text-left mb-6">
            <h2 className="font-semibold text-neutral-900 dark:text-white mb-3">What happens next?</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary-700 dark:text-primary-400">1</span>
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">Review Process</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    We verify your business information and compliance with lending regulations.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary-700 dark:text-primary-400">2</span>
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">Approval Email</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    You'll receive an email notification when your account is approved (or if we need more info).
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary-700 dark:text-primary-400">3</span>
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">Start Lending</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Once approved, borrowers can find you and you'll start receiving loan requests!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Public Profile Link (if enabled) */}
          {businessProfile?.slug && (
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Your Public Lender Profile</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-white dark:bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/lend/${businessProfile.slug}` : `/lend/${businessProfile.slug}`}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyProfileLink}
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                Share this link on social media or your website once approved!
              </p>
            </div>
          )}

          {/* While You Wait */}
          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6">
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">While you wait, you can:</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/lender/preferences">
                <Button variant="outline" className="w-full" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Set Preferences
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="w-full" size="sm">
                  <Building2 className="w-4 h-4 mr-2" />
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>

          {/* Continue Button */}
          <div className="mt-6">
            <Link href="/business">
              <Button className="w-full">
                Go to Business Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-6">
          Questions? Contact us at <a href="mailto:support@feyza.app" className="text-primary-600 dark:text-primary-400 hover:underline">support@feyza.app</a>
        </p>
      </div>
    </div>
  );
}