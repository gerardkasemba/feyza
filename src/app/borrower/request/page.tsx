// app/borrow/request/page.tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Shield, Users, Building2, CheckCircle } from 'lucide-react';
import GuestLoanRequestForm from '@/components/GuestLoanRequestForm';
import { Footer, Navbar } from '@/components/layout';

export const metadata: Metadata = {
  title: 'Request a Loan | Feyza',
  description: 'Borrow from trusted friends, family, or local businesses. Fast, secure, and transparent lending.',
};

export default function BorrowRequestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950">
      {/* Navigation */}
      <Navbar user={null} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column: Information */}
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-sm font-medium">
                <Shield className="w-4 h-4" />
                Secure • Private • Fast
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 dark:text-white leading-tight">
                Borrow from your{' '}
                <span className="text-primary-600 dark:text-primary-400">trusted circle</span>
                {' '}or get{' '}
                <span className="text-accent-500 dark:text-accent-400">matched locally</span>
              </h1>
              
              <p className="text-lg text-neutral-600 dark:text-neutral-400">
                Formalize loans with friends, family, or local businesses. Keep everything clear, 
                trackable, and secure no hidden fees, no credit checks.
              </p>
            </div>

            {/* How it works */}
            <div className="bg-white dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">How it works</h2>
              <div className="space-y-4">
                {[
                  {
                    step: '1',
                    title: 'Create your request',
                    description: 'Tell us what you need and propose repayment terms.',
                  },
                  {
                    step: '2',
                    title: 'Share or get matched',
                    description: 'Send to people you know, or we match you with local lenders.',
                  },
                  {
                    step: '3',
                    title: 'Review & accept',
                    description: 'Compare offers, choose the best terms, and accept.',
                  },
                  {
                    step: '4',
                    title: 'Receive funds & repay',
                    description: 'Get money directly to your bank, repay on schedule.',
                  },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-700 dark:text-primary-400 font-bold">{item.step}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white">{item.title}</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Why use Feyza?</h2>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Users className="w-5 h-5 text-green-600 dark:text-green-500" />
                    </div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">For Personal Loans</h3>
                  </div>
                  <ul className="space-y-2">
                    {[
                      'Borrow from friends & family',
                      'Set clear repayment terms',
                      'Automated payment tracking',
                      'Email reminders',
                      'No credit checks',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                    </div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">For Business Loans</h3>
                  </div>
                  <ul className="space-y-2">
                    {[
                      'Access to verified lenders',
                      'Professional agreements',
                      'Larger loan amounts',
                      'Business credit building',
                      'Dedicated support',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <CheckCircle className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Testimonial */}
            <div className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-2xl p-6 border border-primary-100 dark:border-primary-800">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">M</span>
                  </div>
                </div>
                <div>
                  <p className="text-neutral-700 dark:text-neutral-300 italic mb-2">
                    "I borrowed from my brother for a car repair. Feyza made it so easy to set up the repayment schedule and track everything. No awkward conversations about money!"
                  </p>
                  <p className="font-medium text-neutral-900 dark:text-white">Maria S.</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">San Francisco, CA</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:sticky lg:top-24">
            <div className="space-y-4">
              {/* Form Header */}
              <div className="text-center lg:text-left">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  Start Your Loan Request
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                  Complete the form below. It only takes 2–3 minutes.
                </p>
              </div>

              {/* The Form */}
              <GuestLoanRequestForm />

              {/* Trust Badges */}
              <div className="bg-white dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">256-bit</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Encryption</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">SOC 2</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Certified</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">Plaid</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">Secure</div>
                  </div>
                </div>
              </div>

              {/* FAQ Link */}
              <div className="text-center">
                <Link
                  href="/help/borrowing"
                  className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                >
                  <span>Have questions about borrowing?</span>
                  <span className="text-primary-600 dark:text-primary-400 hover:underline">
                    Visit our help center
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
        <Footer />
    </div>
  );
}