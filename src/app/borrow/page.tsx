'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Loader2 } from 'lucide-react';
import GuestLoanRequestForm from '@/components/GuestLoanRequestForm';
import { Footer, Navbar } from '@/components/layout';

function BorrowPageContent() {
  const searchParams = useSearchParams();
  
  // Get business parameters from URL
  const businessId = searchParams.get('business');
  const maxAmount = searchParams.get('max');
  const businessSlug = searchParams.get('slug');

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950">
      <Navbar user={null} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-sm font-medium mb-4">
            <Shield className="w-4 h-4" />
            Secure • Private • Fast
          </div>
          
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Request a Loan
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {businessId 
              ? 'Request a loan from your trusted business lender'
              : 'Borrow from friends, family, or get matched with local business lenders'
            }
          </p>
          
          {maxAmount && (
            <p className="text-sm text-primary-600 dark:text-primary-400 mt-2">
              Your maximum available: ${Number(maxAmount).toLocaleString()}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6">
          <GuestLoanRequestForm 
            businessSlug={businessSlug} 
            businessLenderId={businessId}
            presetMaxAmount={maxAmount ? Number(maxAmount) : undefined}
            skipToStep={businessId ? 3 : undefined}
          />
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function BorrowPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    }>
      <BorrowPageContent />
    </Suspense>
  );
}
