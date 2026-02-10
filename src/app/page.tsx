'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { Navbar, Footer } from '@/components/layout';
import GuestLoanRequestForm from '@/components/GuestLoanRequestForm';
import TypingAnimation from '@/components/TypingAnimation';
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
      <section className="relative bg-gradient-to-b from-primary-50 to-white dark:from-neutral-900 dark:to-neutral-950">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02] dark:opacity-[0.05]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text Content */}
            <div className="order-2 lg:order-1">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-neutral-900 dark:text-white mb-6 text-center lg:text-left leading-[1.1] tracking-tight">
              Borrow & lend from
              <br />
              <span className="text-primary-600 dark:text-primary-400">
                <TypingAnimation 
                  phrases={[
                    'friends & family',
                    'verified lenders'
                  ]}
                />
              </span>
              <br />
              <span className="text-neutral-900 dark:text-white">with trust</span>
            </h1>

              <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-lg text-center lg:text-left mx-auto lg:mx-0 leading-relaxed">
                Get matched with verified local lenders or borrow from friends & family. 
                Track payments, automate repayments, and stay on top of every loan.
              </p>

              {/* Trust indicators - simple horizontal list */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-3 mb-10 text-sm text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  <span>Verified lenders</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  <span>Autopay enabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  <span>Email reminders</span>
                </div>
              </div>

              {/* Guest access - compact */}
              {/* <div className="bg-neutral-100 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  Already using Feyza?
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/loan-status">
                    <Button variant="outline" size="sm" className="text-sm">
                      <Search className="w-3.5 h-3.5 mr-1.5" />
                      Check status
                    </Button>
                  </Link>
                  <Link href="/borrower/access">
                    <Button variant="outline" size="sm" className="text-sm">
                      <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                      I borrowed
                    </Button>
                  </Link>
                  <Link href="/lender/access">
                    <Button variant="outline" size="sm" className="text-sm">
                      <Users className="w-3.5 h-3.5 mr-1.5" />
                      I lent
                    </Button>
                  </Link>
                </div>
              </div> */}
            </div>

            {/* Right: Loan Request Form */}
            <div className="lg:sticky lg:top-24 order-1 lg:order-2">
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg shadow-neutral-200/50 dark:shadow-neutral-900/50 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white text-sm">Request a loan</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">No account needed to start</p>
                  </div>
                </div>
                <GuestLoanRequestForm />
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

      {/* ✅ SMARTSCHEDULE SECTION (NEW) */}
      <section className="py-24 bg-white dark:bg-neutral-900" id="smart-schedule">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/25 text-orange-700 dark:text-orange-300 rounded-full text-sm font-medium mb-6">
                <Calendar className="w-4 h-4" />
                New: SmartSchedule™
              </span>

              <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-6">
                Repay based on your paycheck not guesswork
              </h2>

              <p className="text-xl text-neutral-600 dark:text-neutral-300 mb-8">
                Tell Feyza how often you get paid (weekly, bi-weekly, or monthly) and your key monthly bills.
                We recommend a repayment schedule that feels fair, avoids rent week, and helps pay the loan off as fast as possible.
              </p>

              <div className="space-y-5 mb-10">
                {[
                  {
                    title: 'Payday-aligned payments',
                    desc: 'We place payments right after paydays so you\'re not stretched.',
                    icon: RefreshCw,
                  },
                  {
                    title: 'Respects rent & important bills',
                    desc: 'Your schedule avoids the weeks you\'re most likely to need cash.',
                    icon: Wallet,
                  },
                  {
                    title: 'Faster payoff, fewer headaches',
                    desc: 'A smarter schedule helps you stay consistent and finish sooner.',
                    icon: PieChart,
                  },
                ].map((x) => (
                  <div key={x.title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/40 flex items-center justify-center shrink-0">
                      <x.icon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-white">{x.title}</div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-300">{x.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/borrower/request">
                  <Button className="w-full sm:w-auto">
                    Try SmartSchedule
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/learn">
                  <Button variant="outline" className="w-full sm:w-auto">
                    How it works
                  </Button>
                </Link>
              </div>

              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-4">
                SmartSchedule is a recommendation tool you can adjust before confirming.
              </p>
            </div>

            {/* Right */}
            <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-orange-50 via-white to-white dark:from-orange-900/10 dark:via-neutral-900 dark:to-neutral-900 p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white">Example schedule preview</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-300">
                    Weekly pay + rent due on the 1st → payments shift to safe weeks.
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {[
                  { label: 'Pay frequency', value: 'Bi-weekly' },
                  { label: 'Take-home per paycheck', value: '$1,150' },
                  { label: 'Rent / mortgage', value: '$1,200 / month' },
                  { label: 'Important bills', value: '$350 / month' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/50 px-4 py-3">
                    <span className="text-sm text-neutral-600 dark:text-neutral-300">{row.label}</span>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-orange-200 dark:border-orange-900/40 bg-orange-50/70 dark:bg-orange-900/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-neutral-900 dark:text-white">Recommended payment</div>
                  <span className="inline-flex items-center gap-2 text-orange-700 dark:text-orange-300 text-sm font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    Balanced
                  </span>
                </div>
                <div className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <span className="font-semibold">$85</span> every <span className="font-semibold">2 weeks</span> • Estimated payoff in <span className="font-semibold">6–8 weeks</span>
                </div>
                <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                  You can adjust before confirming.
                </div>
              </div>
            </div>
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
                title: 'SmartSchedule™',
                description: 'Repayment recommendations based on pay frequency and key monthly bills.',
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
                Submitted a request? See if you've received an offer yet.
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
              <h3 className="text-xl font-bold text-white mb-2">Track What You're Owed</h3>
              <p className="text-white/80 dark:text-white/90 text-sm mb-4">
                Manage loans you've given to others.
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
            {/* Left: Trust Messaging */}
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium mb-6">
                <Shield className="w-4 h-4" />
                Built for trust
              </span>

              <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-6">
                Lending without the awkwardness
              </h2>

              <p className="text-xl text-neutral-600 dark:text-neutral-300 mb-8">
                Feyza keeps loans clear for both sides so relationships stay clean. Everything is documented, schedules are
                visible, and payments are easy to track.
              </p>

              <div className="space-y-6">
                {[
                  {
                    title: 'No awkward conversations',
                    description: 'Reminders reduce the need for uncomfortable follow-ups.',
                  },
                  {
                    title: 'Everyone stays aligned',
                    description: 'Borrower and lender share the same schedule, history, and remaining balance.',
                  },
                  {
                    title: 'Documentation when you need it',
                    description: 'If questions arise, you have a clear record of the agreement and each payment.',
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

              {/* Optional: Early access CTA (no fake stats) */}
              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <Link href="/borrower/request">
                  <Button className="w-full sm:w-auto">
                    Request a loan
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/business/setup">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Become a lender
                  </Button>
                </Link>
              </div>

              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
                We're currently onboarding early lenders and borrowers in select communities.
              </p>
            </div>

            {/* Right: "Proof" without metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                {
                  title: 'Transparent by design',
                  desc: 'Both sides see the same timeline, balance, and payment history.',
                  icon: Shield,
                  tone: 'primary',
                },
                {
                  title: 'Bank-to-bank',
                  desc: 'Autopay with a clear record or track manual payments too.',
                  icon: Wallet,
                  tone: 'green',
                },
                {
                  title: 'SmartSchedule™',
                  desc: 'Recommended repayments based on payday + key monthly bills.',
                  icon: Calendar,
                  tone: 'accent',
                },
                {
                  title: 'Privacy first',
                  desc: 'Loan details stay between borrower and lender. No public feed.',
                  icon: Lock,
                  tone: 'purple',
                },
              ].map((card) => {
                const toneClasses: Record<string, string> = {
                  primary: 'bg-primary-50 dark:bg-primary-900/15 border-primary-100 dark:border-primary-900/30',
                  green: 'bg-green-50 dark:bg-green-900/15 border-green-100 dark:border-green-900/30',
                  accent: 'bg-accent-50 dark:bg-amber-900/10 border-accent-100 dark:border-amber-900/20',
                  purple: 'bg-purple-50 dark:bg-purple-900/15 border-purple-100 dark:border-purple-900/30',
                };

                const iconClasses: Record<string, string> = {
                  primary: 'text-primary-600 dark:text-primary-400',
                  green: 'text-green-600 dark:text-green-400',
                  accent: 'text-accent-600 dark:text-amber-400',
                  purple: 'text-purple-600 dark:text-purple-400',
                };

                const Icon = card.icon;

                return (
                  <div
                    key={card.title}
                    className={`p-6 rounded-2xl border ${toneClasses[card.tone]} bg-white/70 dark:bg-neutral-900/40`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="">
                        <Icon className={`w-5 h-5 ${iconClasses[card.tone]}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white">{card.title}</p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">{card.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Optional: "Pilot" banner card */}
              <div className="sm:col-span-2 bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-start gap-3">
                  <div className="">
                    <BadgeCheck className="w-5 h-5 text-green-700 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">Early access program</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
                      We're onboarding a small group of lenders and borrowers to refine the experience. If you want in, request
                      a loan or register as a lender.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST SCORE & RELATIONSHIPS SECTION */}
      <section className="py-24 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm font-medium mb-4">
              <Shield className="w-4 h-4" />
              Build Your Trust
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              Two ways to build credibility
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
              Feyza helps you build trust with lenders through two complementary systems
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {/* Trust Score Card */}
            <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-neutral-900 p-8 rounded-2xl border border-purple-200 dark:border-purple-800">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
                Trust Score
              </h3>
              <p className="text-neutral-600 dark:text-neutral-300 mb-6">
                Your universal credibility score (0-100) visible to <strong>all lenders</strong> on Feyza.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">Payment History</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">On-time payments boost your score</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">Social Vouches</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Friends & family vouch for your trustworthiness</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BadgeCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">Verification Status</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">ID verification adds credibility</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-purple-200 dark:border-purple-800">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  <strong>When you apply for a new loan</strong>, lenders see your Trust Score to evaluate your application.
                </p>
              </div>
            </div>

            {/* Business Relationships Card */}
            <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-neutral-900 p-8 rounded-2xl border border-blue-200 dark:border-blue-800">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mb-6">
                <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
                Business Relationships
              </h3>
              <p className="text-neutral-600 dark:text-neutral-300 mb-6">
                Private trust history with <strong>each specific business</strong> lender you work with.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">Start Small</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">First-time loans have lower limits</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">Graduate to More</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Complete 3 loans to unlock higher amounts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">Private History</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Your relationship with each business is private</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Request directly</strong> from businesses you have built trust with for faster approvals and higher limits.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-12">
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Start building your trust today
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/auth/signup">
                <Button>
                  Create Account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/borrower/request">
                <Button variant="outline">
                  Request a Loan
                </Button>
              </Link>
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