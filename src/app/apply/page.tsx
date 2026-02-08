'use client';

import React from 'react';
import GuestLoanRequestForm from '@/components/loans/GuestLoanRequestForm';
import { Card } from '@/components/ui';
import Link from 'next/link';

export default function ApplyPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Apply for a Loan</h1>
            <p className="text-neutral-500 dark:text-neutral-400">Get started with your loan application</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card className="p-6 md:p-8">
          <GuestLoanRequestForm />
        </Card>
      </div>

      {/* Footer */}
      <div className="max-w-3xl mx-auto px-4 pb-8">
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          By applying, you agree to our{' '}
          <Link href="/terms" className="text-primary-600 hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
