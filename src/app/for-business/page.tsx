'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Button, Badge } from '@/components/ui';
import {
  Users,
  CreditCard,
  BarChart3,
  Shield,
  Globe,
  Settings,
  Clock,
  CheckCircle,
  ArrowRight,
  DollarSign,
  FileText,
  Award,
  Target,
} from 'lucide-react';

const benefits = [
  {
    icon: Users,
    title: 'Access Matched Borrowers',
    description:
      'Reach borrowers who match your criteria. Our system matches loan requests to your preferences by amount, term, trust tier, and location.',
  },
  {
    icon: CreditCard,
    title: 'Automated Payments',
    description:
      'Collect repayments via ACH (Dwolla). Offer auto-pay so borrowers pay on time—reducing overhead and late payments.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reporting',
    description:
      'Track your portfolio, monitor repayment rates, and export data. Business dashboard and analytics help you manage risk.',
  },
  {
    icon: Shield,
    title: 'Trust Tiers, Not Just Credit',
    description:
      'Every borrower has a tier (1–4) based on vouches and repayment history. You choose which tiers to lend to and set limits per tier.',
  },
  {
    icon: Globe,
    title: 'Geographic Control',
    description:
      'Set which countries and states you serve. Ideal for diaspora lending and compliance.',
  },
  {
    icon: Settings,
    title: 'Flexible Preferences',
    description:
      'Set min/max amounts, interest rates (including 0%), terms, loan types, and first-time borrower limits. You’re in control.',
  },
  {
    icon: Target,
    title: 'Default & Restriction Policy',
    description:
      'Borrowers who default face restrictions and lose trust standing. Single active business loan per borrower to reduce over-borrowing.',
  },
  {
    icon: Clock,
    title: 'Payment Reminders & Retries',
    description:
      'Automated reminders and retry logic help borrowers stay on track. Account restrictions apply after sustained non-payment.',
  },
  {
    icon: CheckCircle,
    title: 'Public Lender Profile',
    description:
      'Get a shareable page (e.g. feyza.app/lend/your-business) so borrowers can find you and apply directly.',
  },
];

const highlights = [
  { label: 'Trust-based matching', sub: 'Tiers & vouches' },
  { label: 'Structured agreements', sub: 'Clear terms' },
  { label: 'Verified businesses', sub: 'You get verified' },
  { label: 'Fast matching', sub: 'Receive requests' },
];

const steps = [
  {
    icon: FileText,
    title: 'Sign up & Apply',
    description: 'Create an account as a business and submit your business details for verification.',
    href: '/auth/signup',
  },
  {
    icon: Shield,
    title: 'Get Verified',
    description: 'Our team reviews your business. Once approved, you can set lending preferences.',
  },
  {
    icon: Settings,
    title: 'Set Preferences',
    description: 'Configure amounts, rates, terms, loan types, and regions you want to serve.',
    href: '/business/setup',
  },
  {
    icon: DollarSign,
    title: 'Receive Matches & Lend',
    description: 'Get matched with borrowers. Review requests, fund loans, and track repayments.',
    href: '/lender/matches',
  },
];

const dashboardFeatures = [
  'Real-time loan tracking and status updates',
  'Automated payment processing and reminders',
  'Borrower trust tier and repayment visibility',
  'Per-tier loan limits and interest settings',
  'Public profile page to attract borrowers',
  'Match management and funding workflow',
];

export default function ForBusinessPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <Navbar />

      {/* Hero */}
      <section className="relative py-20 bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-white/20 text-white border-0">
                For Business Lenders
              </Badge>

              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Lend to Qualified Borrowers on Feyza
              </h1>

              <p className="text-xl text-green-100 mb-8">
                Join as a verified business lender. Set your terms, get matched with borrowers by trust tier and preference, and grow your portfolio with structured, transparent lending.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href="/auth/signup">
                  <Button size="lg" className="bg-white text-green-700 hover:bg-green-50">
                    Apply to Become a Lender
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>

                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10 hover:text-white"
                  >
                    Contact Us
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-2 gap-4">
              {highlights.map((stat, i) => (
                <div
                  key={i}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20"
                >
                  <div className="text-lg font-bold text-white mb-1">{stat.label}</div>
                  <div className="text-green-200 text-sm">{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Highlights Mobile */}
      <section className="lg:hidden py-8 bg-green-700">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 gap-4">
          {highlights.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-base font-bold text-white">{stat.label}</div>
              <div className="text-green-200 text-sm">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
              Why Lenders Choose Feyza
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Trust-based matching, full control over terms, and tools to run your lending operation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, i) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={i}
                  className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 hover:shadow-lg hover:dark:shadow-none transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/25 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
              Get Started in 4 Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const content = (
                <div className="relative bg-white dark:bg-neutral-950 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 h-full flex flex-col">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-green-100 dark:bg-green-900/25 flex items-center justify-center mb-4 relative">
                    <Icon className="w-8 h-8 text-green-600 dark:text-green-400" />
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-green-600 text-white rounded-full text-sm font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 flex-1">{step.description}</p>
                  {step.href && (
                    <Link href={step.href} className="mt-3 text-sm font-medium text-green-600 dark:text-green-400 hover:underline inline-flex items-center gap-1">
                      {i === 0 ? 'Sign up' : i === 2 ? 'Set preferences' : i === 3 ? 'View matches' : null}
                      {step.href && <ArrowRight className="w-3 h-3" />}
                    </Link>
                  )}
                </div>
              );
              return (
                <div key={i} className="relative text-center">
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-green-200 dark:bg-green-800" />
                  )}
                  {step.href ? <Link href={step.href} className="block">{content}</Link> : content}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dashboard + CTA */}
      <section className="py-20 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Lender Dashboard
              </Badge>

              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-6">
                Everything You Need
              </h2>

              <ul className="space-y-4">
                {dashboardFeatures.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-neutral-700 dark:text-neutral-300">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/auth/signup">
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/business/setup">
                  <Button variant="outline">
                    Already have an account? Set up business
                  </Button>
                </Link>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/15 dark:to-emerald-900/15 rounded-3xl p-8 border border-green-200 dark:border-green-900/30">
              <div className="bg-white dark:bg-neutral-950 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-lg dark:shadow-none">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Your dashboard</h3>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    After approval
                  </Badge>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-6">
                  Once verified, your business dashboard shows active loans, total lent, repayment status, and match requests. You can fund loans, track payments, and manage your portfolio in one place.
                </p>
                <div className="h-2 bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-800">
                  <div className="h-full w-2/3 bg-green-500 rounded-full" />
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                  Example: repayment progress
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-green-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Award className="w-16 h-16 mx-auto mb-6 text-green-200" />
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Lend on Feyza?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join as a verified business lender. Set your terms, get matches, and grow with trust-based lending.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-white text-green-700 hover:bg-green-50">
                Apply Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>

            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10 hover:text-white"
              >
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
