'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Button } from '@/components/ui';
import {
  Shield,
  Zap,
  Users,
  CreditCard,
  Bell,
  Globe,
  Lock,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Smartphone,
  BarChart3,
  Wallet,
  UserCheck,
  RefreshCw,
  FileText,
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Instant Matching',
    description:
      'Our smart algorithm matches borrowers with the perfect lenders based on amount, location, and preferences in seconds.',
    color: 'amber',
  },
  {
    icon: Shield,
    title: 'Verified Lenders',
    description:
      'Every business lender goes through a rigorous verification process to ensure safety and legitimacy.',
    color: 'green',
  },
  {
    icon: CreditCard,
    title: 'Automated Payments',
    description:
      'Set up auto-pay and never miss a payment. ACH transfers are processed securely through Dwolla.',
    color: 'blue',
  },
  {
    icon: TrendingUp,
    title: 'Credit Building',
    description:
      'Build your borrowing tier with on-time payments. Unlock higher loan amounts as you prove reliability.',
    color: 'purple',
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    description: 'Get timely notifications before payments are due. Never be caught off guard.',
    color: 'rose',
  },
  {
    icon: Globe,
    title: 'Multi-Currency Support',
    description: 'Support for multiple currencies including USD, with more coming soon.',
    color: 'cyan',
  },
  {
    icon: Lock,
    title: 'Bank-Level Security',
    description: 'Your data is encrypted and protected with enterprise-grade security measures.',
    color: 'emerald',
  },
  {
    icon: Users,
    title: 'Personal & Business Loans',
    description: 'Borrow from friends and family or connect with verified business lenders.',
    color: 'orange',
  },
];

const borrowerFeatures = [
  { icon: CheckCircle, text: 'No credit score required' },
  { icon: Clock, text: 'Get funds in 24-48 hours' },
  { icon: Wallet, text: 'Flexible repayment terms' },
  { icon: TrendingUp, text: 'Build your borrowing reputation' },
  { icon: Bell, text: 'Payment reminders' },
  { icon: Shield, text: 'Transparent fee structure' },
];

const lenderFeatures = [
  { icon: UserCheck, text: 'Verified borrower profiles' },
  { icon: BarChart3, text: 'Risk assessment tools' },
  { icon: RefreshCw, text: 'Automated collections' },
  { icon: FileText, text: 'Loan management dashboard' },
  { icon: Globe, text: 'Geographic preferences' },
  { icon: Zap, text: 'Auto-accept qualified borrowers' },
];

const colorClasses: Record<string, string> = {
  amber: 'bg-amber-100 dark:bg-amber-900/25 text-amber-600 dark:text-amber-300',
  green: 'bg-green-100 dark:bg-green-900/25 text-green-600 dark:text-green-300',
  blue: 'bg-blue-100 dark:bg-blue-900/25 text-blue-600 dark:text-blue-300',
  purple: 'bg-purple-100 dark:bg-purple-900/25 text-purple-600 dark:text-purple-300',
  rose: 'bg-rose-100 dark:bg-rose-900/25 text-rose-600 dark:text-rose-300',
  cyan: 'bg-cyan-100 dark:bg-cyan-900/25 text-cyan-600 dark:text-cyan-300',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/25 text-emerald-600 dark:text-emerald-300',
  orange: 'bg-orange-100 dark:bg-orange-900/25 text-orange-600 dark:text-orange-300',
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 py-20 lg:py-28">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Powerful Features for
              <span className="block text-green-200">Modern Lending</span>
            </h1>
            <p className="text-xl text-green-100 max-w-3xl mx-auto mb-8">
              Everything you need to borrow or lend money safely, efficiently, and transparently.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/auth/signup">
                <Button size="lg" className="bg-white text-green-700 hover:bg-green-50">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>

              <Link href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 hover:text-white"
                >
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Grid */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Feyza combines powerful technology with user-friendly design to make peer-to-peer lending simple and secure.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <div
                  key={index}
                  className="bg-white dark:bg-neutral-950 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 hover:shadow-lg dark:hover:shadow-none transition-shadow"
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${colorClasses[feature.color]} flex items-center justify-center mb-4`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* For Borrowers */}
      <section className="py-20 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/25 text-blue-700 dark:text-blue-200 rounded-full text-sm font-medium mb-4">
                <Users className="w-4 h-4" />
                For Borrowers
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Get the funds you need, fast
              </h2>

              <p className="text-lg text-gray-600 dark:text-neutral-400 mb-8">
                Whether you need emergency cash or want to fund a project, Feyza connects you with lenders who understand your needs.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {borrowerFeatures.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/25 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-green-600 dark:text-green-300" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">{item.text}</span>
                    </div>
                  );
                })}
              </div>

              <Link href="/loans/new">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white">
                  Request a Loan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-3xl p-8 text-white">
                <Smartphone className="w-16 h-16 mb-6 opacity-80" />
                <h3 className="text-2xl font-bold mb-4">Mobile-First Experience</h3>
                <p className="text-blue-100 mb-6">
                  Apply for loans, track payments, and manage your account from anywhere with our responsive platform.
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    iOS & Android
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Web App
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* For Lenders */}
      <section className="py-20 bg-gray-50 dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl p-8 text-white">
                <BarChart3 className="w-16 h-16 mb-6 opacity-80" />
                <h3 className="text-2xl font-bold mb-4">Powerful Dashboard</h3>
                <p className="text-purple-100 mb-6">
                  Track your portfolio, manage loans, and monitor repayments with our comprehensive lender dashboard.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-2xl font-bold">98%</div>
                    <div className="text-purple-200">Repayment Rate</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-2xl font-bold">24h</div>
                    <div className="text-purple-200">Avg. Match Time</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/25 text-purple-700 dark:text-purple-200 rounded-full text-sm font-medium mb-4">
                <TrendingUp className="w-4 h-4" />
                For Lenders
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Grow your lending business
              </h2>

              <p className="text-lg text-gray-600 dark:text-neutral-400 mb-8">
                Whether you're a microfinance institution or a community lender, Feyza gives you the tools to reach more borrowers and manage risk effectively.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {lenderFeatures.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/25 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">{item.text}</span>
                    </div>
                  );
                })}
              </div>

              <Link href="/business">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white">
                  Learn More
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-green-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join thousands of borrowers and lenders already using Feyza.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-white text-green-700 hover:bg-green-50">
                Create Free Account
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10 hover:text-white"
              >
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
