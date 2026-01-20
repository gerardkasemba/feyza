'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { Navbar, Footer } from '@/components/layout';
import GuestLoanRequestForm from '@/components/GuestLoanRequestForm';
import {
  ArrowRight,
  Shield,
  Users,
  Zap,
  CheckCircle,
  Building2,
  Bell,
  Calendar,
  PieChart,
  Lock,
  CreditCard,
  MessageSquare,
  Search,
  RefreshCw,
  BadgeCheck,
  Wallet,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
      <Navbar user={null} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 min-h-screen">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Left: Text Content */}
            <div className="animate-fade-in order-2 lg:order-1">
              <div className="flex justify-center lg:justify-start">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-sm font-medium mb-6">
                  <Zap className="w-4 h-4" />
                  Request → Match → Offer → Repay
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-neutral-900 dark:text-white mb-6 text-center lg:text-left leading-tight">
                Borrow from{' '}
                <span className="text-primary-600 dark:text-primary-400">people you trust</span>
                {' '}or get{' '}
                <span className="text-accent-500 dark:text-amber-400">matched to local lenders</span>
              </h1>

              <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 mb-8 max-w-xl text-center lg:text-left mx-auto lg:mx-0">
                Request a loan in minutes. Feyza automatically matches your request with trusted local business lenders
                (or you can invite friends & family). Track everything with email reminders and autopay.
              </p>

              {/* Trust strip - Stack on mobile, grid on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {[
                  {
                    icon: BadgeCheck,
                    title: 'Verified businesses',
                    desc: 'Registered local lenders with clear terms.',
                  },
                  {
                    icon: RefreshCw,
                    title: 'autopay',
                    desc: 'Enable bank-to-bank scheduled repayment.',
                  },
                  {
                    icon: Bell,
                    title: 'Email reminders',
                    desc: 'Both parties get payment nudges.',
                  },
                ].map((t) => (
                  <div
                    key={t.title}
                    className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white/80 dark:bg-neutral-800/70 backdrop-blur p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0">
                        <t.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white">{t.title}</p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">{t.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Already have a loan? - Improved mobile layout */}
              <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                <p className="font-medium text-neutral-900 dark:text-white mb-3 text-center lg:text-left">
                  Already using Feyza?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link href="/loan-status">
                    <Button variant="outline" size="sm" className="w-full text-left justify-start h-auto py-3">
                      <div className="flex items-center gap-3">
                        <Search className="w-4 h-4 text-neutral-600 dark:text-neutral-300 shrink-0" />
                        <span>
                          <span className="block font-medium">Check status</span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">See updates</span>
                        </span>
                      </div>
                    </Button>
                  </Link>
                  <Link href="/borrower/access">
                    <Button variant="outline" size="sm" className="w-full text-left justify-start h-auto py-3">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>
                          <span className="block font-medium">I borrowed</span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">View & pay</span>
                        </span>
                      </div>
                    </Button>
                  </Link>
                  <Link href="/lender/access">
                    <Button variant="outline" size="sm" className="w-full text-left justify-start h-auto py-3">
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                        <span>
                          <span className="block font-medium">I lent</span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">Track repayment</span>
                        </span>
                      </div>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: Loan Request Form - Now on top for mobile */}
            <div className="lg:sticky lg:top-24 order-1 lg:order-2 mb-8 lg:mb-0">
              <div className="rounded-2xl lg:rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm dark:shadow-neutral-900/50 p-4 sm:p-6">
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    <Zap className="w-4 h-4 text-accent-600 dark:text-amber-400 shrink-0" />
                    Start with a request (no account needed)
                  </div>
                </div>
                <GuestLoanRequestForm />
                <div className="mt-4">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Feyza matches your request automatically with the right lenders. You'll review and accept an offer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TWO WAYS */}
      <section className="py-24 bg-white dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              Two ways to get a loan
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              Get matched with local business lenders automatically or request a loan from friends and family.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Business Lenders */}
            <div className="bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-neutral-800 rounded-3xl p-8 border border-primary-100 dark:border-primary-800">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-6">
                <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-2xl font-display font-bold text-neutral-900 dark:text-white mb-4">
                Local Business Lenders
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                No browsing required. Feyza matches your request with registered lenders that fit your loan needs.
                Review offers, compare terms, and accept the one that works best.
              </p>
              <ul className="space-y-3">
                {['Automatic lender matching', 'Clear interest & terms', 'autopay + reminders'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300">
                    <CheckCircle className="w-5 h-5 text-primary-500 dark:text-primary-400" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link href="/auth/signup">
                  <Button className="w-full sm:w-auto">
                    Get matched
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Personal Network */}
            <div className="bg-gradient-to-br from-accent-50 to-white dark:from-amber-900/10 dark:to-neutral-800 rounded-3xl p-8 border border-accent-100 dark:border-amber-900/30">
              <div className="w-16 h-16 bg-accent-100 dark:bg-amber-900/25 rounded-2xl flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-accent-600 dark:text-amber-400" />
              </div>
              <h3 className="text-2xl font-display font-bold text-neutral-900 dark:text-white mb-4">
                Friends & Family
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Invite someone you trust. They can accept your loan request without creating an account.
                Feyza keeps your schedule, reminders, and repayment progress clear for both of you.
              </p>
              <ul className="space-y-3">
                {['No account required for lender', 'Instant invites via email', 'Preserve relationships'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300">
                    <CheckCircle className="w-5 h-5 text-accent-500 dark:text-amber-400" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link href="/borrower/request">
                  <Button
                    className="w-full sm:w-auto bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                  >
                    Invite a lender
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-neutral-50 dark:bg-neutral-900/50" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              How it works
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-300">
              From request to repayment in a few steps
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Submit your request',
                description: 'Enter amount, purpose, and your preferred repayment schedule.',
              },
              {
                step: '02',
                title: 'We match you automatically',
                description: 'Feyza routes your request to business lenders that fit your needs (or invite someone you know).',
              },
              {
                step: '03',
                title: 'Review offers & accept',
                description: 'A lender accepts or proposes terms. You choose what works best.',
              },
              {
                step: '04',
                title: 'Autopay + reminders',
                description: 'Enable bank autopay (optional) and get email reminders with a clear timeline.',
              },
            ].map((item, index) => (
              <div key={item.step} className="relative">
                <div className="text-6xl font-display font-bold text-primary-100 dark:text-primary-900/30 mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-display font-semibold text-neutral-900 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-neutral-600 dark:text-neutral-300">{item.description}</p>
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 -right-4 w-8">
                    <ArrowRight className="w-6 h-6 text-neutral-300 dark:text-neutral-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-24 bg-white dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              Everything you need to manage loans
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
              Not just tracking Feyza helps you repay on time and keep everyone aligned.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Building2,
                title: 'Automatic Matching',
                description: 'No browsing. We match your request with local business lenders that fit your needs.',
                color: 'primary',
              },
              {
                icon: Wallet,
                title: 'Auto-Pay',
                description: 'Connect borrower and lender bank accounts for automatic repayments on schedule.',
                color: 'blue',
              },
              {
                icon: Bell,
                title: 'Email Reminders',
                description: 'Automated email notifications before due dates for both borrower and lender.',
                color: 'yellow',
              },
              {
                icon: Calendar,
                title: 'Payment Schedules',
                description: 'Automatic schedule generation - weekly, bi-weekly, or monthly.',
                color: 'green',
              },
              {
                icon: PieChart,
                title: 'Visual Progress',
                description: 'See how much has been paid and what remains with clear progress indicators.',
                color: 'accent',
              },
              {
                icon: Lock,
                title: 'Secure & Private',
                description: 'Your loan information stays between you and your lender. We never share your data.',
                color: 'purple',
              },
            ].map((feature) => {
              const colorClasses: Record<string, string> = {
                primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
                yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
                green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                accent: 'bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400',
              };

              return (
                <div
                  key={feature.title}
                  className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-lg dark:hover:shadow-neutral-900/50 transition-all bg-white dark:bg-neutral-800"
                >
                  <div
                    className={`w-12 h-12 ${colorClasses[feature.color]} rounded-xl flex items-center justify-center mb-4`}
                  >
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-display font-semibold text-neutral-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-300">{feature.description}</p>
                </div>
              );
            })}
          </div>

          {/* manual payments note */}
          <div className="mt-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
              </div>
              <div>
                <div className="font-semibold text-neutral-900 dark:text-white">Manual payments still work</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  If you prefer to pay through Cash App, Venmo, or PayPal, you can still track repayments, schedules, and reminders inside Feyza.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GUEST ACCESS */}
      <section className="py-16 bg-gradient-to-r from-primary-600 to-accent-600 dark:from-primary-700 dark:to-accent-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Already using Feyza?</h2>
            <p className="text-white/80 dark:text-white/90">Access your existing loans</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Check Loan Status */}
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Check Loan Status</h3>
              <p className="text-white/80 dark:text-white/90 text-sm mb-4">
                Submitted a request? See if you’ve received an offer yet.
              </p>
              <Link href="/loan-status">
                <Button variant="outline" className="w-full border-white text-white hover:bg-white/10 dark:hover:bg-white/20">
                  Check Status
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Pay Your Loan */}
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Pay Your Loan</h3>
              <p className="text-white/80 dark:text-white/90 text-sm mb-4">
                Access your active loan and make a payment (or enable autopay).
              </p>
              <Link href="/borrower/access">
                <Button className="bg-white text-primary-600 hover:bg-white/90 w-full dark:bg-white/90 dark:text-primary-700 dark:hover:bg-white">
                  Make Payment
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Track What You're Owed */}
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Track What You’re Owed</h3>
              <p className="text-white/80 dark:text-white/90 text-sm mb-4">
                Manage loans you’ve given to others.
              </p>
              <Link href="/lender/access">
                <Button variant="outline" className="w-full border-white text-white hover:bg-white/10 dark:hover:bg-white/20">
                  Manage Loans
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="py-24 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium mb-6">
                <Shield className="w-4 h-4" />
                Built on Trust
              </span>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-6">
                Why people love Feyza
              </h2>
              <p className="text-xl text-neutral-600 dark:text-neutral-300 mb-8">
                We built Feyza because lending and borrowing shouldn’t be awkward. Clear records and automated reminders keep relationships clean.
              </p>
              <div className="space-y-6">
                {[
                  {
                    title: 'No awkward conversations',
                    description: 'Reminders and autopay reduce the need for uncomfortable follow-ups.',
                  },
                  {
                    title: 'Everyone stays aligned',
                    description: 'Borrower and lender share the same schedule, history, and remaining balance.',
                  },
                  {
                    title: 'Documentation when you need it',
                    description: 'If questions arise, you have a clear record of every agreement and payment.',
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">{item.title}</h3>
                      <p className="text-neutral-600 dark:text-neutral-300">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats/Social Proof */}
            <div className="grid grid-cols-2 gap-6">
              {[
                { number: '10K+', label: 'Active Users' },
                { number: '$2M+', label: 'Loans Tracked' },
                { number: '98%', label: 'On-time Payments' },
                { number: '4.9★', label: 'User Rating' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-center"
                >
                  <p className="text-3xl font-display font-bold text-primary-600 dark:text-primary-400 mb-1">{stat.number}</p>
                  <p className="text-neutral-600 dark:text-neutral-300">{stat.label}</p>
                </div>
              ))}

              <div className="col-span-2 bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">Transparent by design</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                      Every schedule, reminder, and payment record stays visible to both borrower and lender no surprises.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24 bg-gradient-to-br from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-6">
            Get matched to the right lender automatically
          </h2>
          <p className="text-xl text-primary-100 dark:text-primary-200 mb-8 max-w-2xl mx-auto">
            Submit one request. Feyza matches you with local business lenders or lets you invite someone you know.
            Then we help you repay with reminders and autopay.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-primary-600 hover:bg-neutral-100 dark:bg-white dark:text-primary-700 dark:hover:bg-white/90"
              >
                Create Free Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/business/setup">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-white text-white hover:bg-white/10 dark:hover:bg-white/20"
              >
                Register as Business Lender
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
