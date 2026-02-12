'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Loader2, Info, CheckCircle } from 'lucide-react';
import GuestLoanRequestForm from '@/components/GuestLoanRequestForm';
import { Footer, Navbar } from '@/components/layout';
import { Card } from '@/components/ui';

function BorrowPageContent() {
  const searchParams = useSearchParams();
  
  // Get business parameters from URL
  const businessId = searchParams.get('business');
  const maxAmount = searchParams.get('max');
  const businessSlug = searchParams.get('slug');

  // Determine if we should skip to step 3
  // Skip if business ID or slug is provided (direct business loan)
  const isDirectBusinessLoan = !!(businessId || businessSlug);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950">
      <Navbar user={null} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-sm font-medium mb-4">
            <Shield className="w-4 h-4" />
            Secure • Private • Fast
          </div>
          
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-3">
            {isDirectBusinessLoan ? 'Apply for a Loan' : 'Request a Loan'}
          </h1>
          
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
            {isDirectBusinessLoan
              ? 'Complete your loan application with your trusted lender'
              : 'Borrow from friends, family, or get matched with trusted business lenders'
            }
          </p>
          
          {/* Max Amount Display */}
          {maxAmount && (
            <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                    Pre-Approved Amount
                  </p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                    ${Number(maxAmount).toLocaleString()}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    Based on your eligibility with this lender
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Info Cards for New Borrowers */}
          {!isDirectBusinessLoan && (
            <div className="grid sm:grid-cols-3 gap-4 mt-6">
              <Card className="p-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">Fast Approval</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Get matched with lenders in minutes</p>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🔒</span>
                  </div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">Secure Process</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Bank-level encryption protects your data</p>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">💰</span>
                  </div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">Flexible Terms</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Choose repayment schedules that work for you</p>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Application Form */}
        <div className="bg-white dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
          <div className="p-6 md:p-8">
            <GuestLoanRequestForm 
              businessSlug={businessSlug || null} 
              businessLenderId={businessId || null}
              presetMaxAmount={maxAmount ? Number(maxAmount) : undefined}
            />
          </div>
        </div>

        {/* Trust & Safety Footer */}
        <Card className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-800/30 border-neutral-200 dark:border-neutral-700">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
                Your Information is Protected
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                We use industry-standard encryption to keep your personal and financial information secure. 
                Your data will never be sold or shared without your permission.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Footer />
    </div>
  );
}

export default function BorrowPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">Loading loan application...</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">Please wait</p>
        </div>
      </div>
    }>
      <BorrowPageContent />
    </Suspense>
  );
}