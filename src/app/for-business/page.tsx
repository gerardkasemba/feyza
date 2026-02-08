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
} from 'lucide-react';

const benefits = [
  {
    icon: Users,
    title: 'Access More Borrowers',
    description:
      'Reach thousands of qualified borrowers actively seeking loans that match your criteria.',
  },
  {
    icon: CreditCard,
    title: 'Automated Payments',
    description:
      'Let technology handle collections with auto-pay, reducing overhead and late payments.',
  },
  {
    icon: BarChart3,
    title: 'Powerful Analytics',
    description:
      'Track performance, monitor repayment rates, and gain insights into your portfolio.',
  },
  {
    icon: Shield,
    title: 'Verified Borrowers',
    description:
      "Every borrower has a tier rating built from payment history. Know who you're lending to.",
  },
  {
    icon: Globe,
    title: 'Geographic Control',
    description:
      'Choose exactly which countries and states you want to serve for compliance.',
  },
  {
    icon: Settings,
    title: 'Flexible Preferences',
    description:
      'Set your min/max amounts, interest rates, terms, and auto-accept rules.',
  },
  {
    icon: Shield,
    title: '90-Day Default Restriction',
    description:
      'Defaulters face 90-day loan restrictions and lose all accumulated trust, ensuring higher quality borrowers over time.',
  },
  {
    icon: Clock,
    title: 'Automated Payment Reminders',
    description:
      "Payment reminders and retries occur every 3 days for up to 9 days, after which the user's account is blocked for added security.",
  },
  {
    icon: CheckCircle,
    title: 'Single Active Loan Policy',
    description:
      'Borrowers cannot request a new business loan while having an active one, preventing over-borrowing and reducing default risks.',
  },
];

const stats = [
  { value: '$2.5M+', label: 'Loans Facilitated' },
  { value: '95%', label: 'On-Time Payments' },
  { value: '500+', label: 'Active Lenders' },
  { value: '24h', label: 'Avg. Match Time' },
];

const steps = [
  { icon: FileText, title: 'Apply', description: 'Fill out our business application with your details' },
  { icon: Shield, title: 'Get Verified', description: 'Our team reviews and verifies your business' },
  { icon: Settings, title: 'Configure', description: 'Set your lending preferences and criteria' },
  { icon: DollarSign, title: 'Start Lending', description: 'Receive matches and start growing your business' },
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
                Grow Your Lending Business with Feyza
              </h1>

              <p className="text-xl text-green-100 mb-8">
                Access qualified borrowers, automate payments, and scale your operations with our powerful platform.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href="/business/register">
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
                    Talk to Sales
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-2 gap-4">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20"
                >
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-green-200 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Mobile */}
      <section className="lg:hidden py-8 bg-green-700">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-green-200 text-sm">{stat.label}</div>
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
              Everything you need to run a successful lending operation in one platform.
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
                  <p className="text-neutral-600 dark:text-neutral-400">
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
              Get Started in 4 Simple Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="relative text-center">
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-green-200 dark:bg-green-800" />
                  )}

                  <div className="relative bg-white dark:bg-neutral-950 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-green-100 dark:bg-green-900/25 flex items-center justify-center mb-4 relative">
                      <Icon className="w-8 h-8 text-green-600 dark:text-green-400" />
                      <span className="absolute -top-2 -right-2 w-6 h-6 bg-green-600 text-white rounded-full text-sm font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>

                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features List */}
      <section className="py-20 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Lender Dashboard
              </Badge>

              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-6">
                Everything You Need to Succeed
              </h2>

              <ul className="space-y-4">
                {[
                  'Real-time loan tracking and status updates',
                  'Automated payment processing and reminders',
                  'Borrower risk assessment and analytics',
                  'Custom reports and data export',
                  'Multi-user access with role permissions',
                  'Public profile page to attract borrowers',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-neutral-700 dark:text-neutral-300">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link href="/business/register">
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/15 dark:to-emerald-900/15 rounded-3xl p-8 border border-green-200 dark:border-green-900/30">
              <div className="bg-white dark:bg-neutral-950 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-lg dark:shadow-none">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Loan Overview</h3>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Live
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Active Loans</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">47</p>
                  </div>
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Lent</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">$125K</p>
                  </div>
                </div>

                <div className="h-2 bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-800">
                  <div className="h-full w-3/4 bg-green-500 rounded-full" />
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                  75% repayment rate this month
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
            Ready to Grow Your Lending Business?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join hundreds of lenders already using Feyza to reach more borrowers.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/business/register">
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
                Schedule a Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
