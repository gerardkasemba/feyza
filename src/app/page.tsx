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
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
      <Navbar user={null} />

      {/* Hero Section with Loan Request Form */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left: Text Content */}
            <div className="animate-fade-in">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                Simple. Transparent. Trust-Based.
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-neutral-900 dark:text-white mb-6 leading-tight">
                Borrow from{' '}
                <span className="text-primary-600 dark:text-primary-400">people you trust</span>
                {' '}or{' '}
                <span className="text-accent-500 dark:text-amber-400">businesses that care</span>
              </h1>
              <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8 max-w-lg">
                Request a loan, track payments, and manage everything in one place. 
                No account needed to get started.
              </p>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm dark:shadow-neutral-900/50">
                  <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">10K+</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Active Users</p>
                </div>
                <div className="text-center p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm dark:shadow-neutral-900/50">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">$2M+</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Loans Tracked</p>
                </div>
                <div className="text-center p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm dark:shadow-neutral-900/50">
                  <p className="text-2xl font-bold text-accent-600 dark:text-accent-400">98%</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Repaid</p>
                </div>
              </div>
              
              {/* Already have a loan? */}
              <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                <p className="font-medium text-neutral-900 dark:text-white mb-3">Already using Feyza?</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link href="/borrower/access" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-left justify-start">
                      <CreditCard className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                      <span>
                        <span className="block font-medium">I borrowed money</span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">View & pay my loan</span>
                      </span>
                    </Button>
                  </Link>
                  <Link href="/lender/access" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-left justify-start">
                      <Users className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                      <span>
                        <span className="block font-medium">I lent money</span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">Track what I'm owed</span>
                      </span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: Loan Request Form */}
            <div className="lg:sticky lg:top-24">
              <GuestLoanRequestForm />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              Two ways to get a loan
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Whether you need a loan from a business or someone you know, we've got you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Business Lenders */}
            <div className="bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-neutral-800 rounded-3xl p-8 border border-primary-100 dark:border-primary-800">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-6">
                <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-2xl font-display font-bold text-neutral-900 dark:text-white mb-4">
                Business Lenders
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Browse registered business lenders on our platform. Submit a request, 
                wait for approval, and start tracking your loan with professional terms.
              </p>
              <ul className="space-y-3">
                {['Verified businesses', 'Clear interest rates', 'Professional support'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300">
                    <CheckCircle className="w-5 h-5 text-primary-500 dark:text-primary-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Personal Network */}
            <div className="bg-gradient-to-br from-accent-50 to-white rounded-3xl p-8 border border-accent-100">
              <div className="w-16 h-16 bg-accent-100 rounded-2xl flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-accent-600" />
              </div>
              <h3 className="text-2xl font-display font-bold text-neutral-900 mb-4">
                Friends & Family
              </h3>
              <p className="text-neutral-600 mb-6">
                Send an invite link to anyone. They can accept your loan request 
                without creating an account. Keep personal finances clear and organized.
              </p>
              <ul className="space-y-3">
                {['No account required for lender', 'Instant invites via email', 'Preserve relationships'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-neutral-700">
                    <CheckCircle className="w-5 h-5 text-accent-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              How it works
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-300">
              Get started in under 2 minutes
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Choose lender type',
                description: 'Select between a business lender or someone from your personal network',
              },
              {
                step: '02',
                title: 'Enter loan details',
                description: 'Specify the amount, purpose, and your preferred repayment schedule',
              },
              {
                step: '03',
                title: 'Wait for acceptance',
                description: 'Your lender reviews and accepts (or suggests changes to) the terms',
              },
              {
                step: '04',
                title: 'Track & repay',
                description: 'Both parties track progress with a visual timeline. No surprises.',
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

      {/* Features Grid */}
      <section className="py-24 bg-white dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              Everything you need to manage loans
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
              Built with features that make loan tracking simple and stress-free
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Calendar,
                title: 'Payment Schedules',
                description: 'Automatic payment schedule generation based on your preferred frequency - weekly, bi-weekly, or monthly.',
                color: 'primary',
              },
              {
                icon: Bell,
                title: 'Smart Reminders',
                description: 'Email notifications before payments are due. Never miss a payment or forget to follow up.',
                color: 'yellow',
              },
              {
                icon: PieChart,
                title: 'Visual Progress',
                description: 'See exactly how much has been paid and what remains with clear progress indicators.',
                color: 'green',
              },
              {
                icon: CreditCard,
                title: 'Multiple Payment Methods',
                description: 'Support for PayPal, Cash App, and Venmo. Set your preferred method for easy payments.',
                color: 'blue',
              },
              {
                icon: Lock,
                title: 'Secure & Private',
                description: 'Your loan information stays between you and your lender. We never share your data.',
                color: 'purple',
              },
              {
                icon: MessageSquare,
                title: 'Clear Communication',
                description: 'Both parties see the same information. No misunderstandings about amounts or due dates.',
                color: 'accent',
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
                  <div className={`w-12 h-12 ${colorClasses[feature.color]} rounded-xl flex items-center justify-center mb-4`}>
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
        </div>
      </section>

      {/* Guest Access Section */}
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
              <h3 className="text-xl font-bold text-white mb-2">
                Check Loan Status
              </h3>
              <p className="text-white/80 dark:text-white/90 text-sm mb-4">
                Submitted a request? See if it's been accepted yet.
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
              <h3 className="text-xl font-bold text-white mb-2">
                Pay Your Loan
              </h3>
              <p className="text-white/80 dark:text-white/90 text-sm mb-4">
                Access your active loan and make payments.
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
              <h3 className="text-xl font-bold text-white mb-2">
                Track What You're Owed
              </h3>
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

      {/* Trust Section */}
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
                We created Feyza because lending money to friends and family shouldn't be awkward. 
                Clear records make for clear relationships.
              </p>
              <div className="space-y-6">
                {[
                  {
                    title: 'No awkward conversations',
                    description: 'Automated reminders do the asking for you. No more uncomfortable follow-ups.',
                  },
                  {
                    title: 'Everyone stays on the same page',
                    description: 'Both borrower and lender see the exact same payment schedule and history.',
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
                { number: '98%', label: 'Repayment Rate' },
                { number: '4.9★', label: 'User Rating' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-center">
                  <p className="text-3xl font-display font-bold text-primary-600 dark:text-primary-400 mb-1">{stat.number}</p>
                  <p className="text-neutral-600 dark:text-neutral-300">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-6">
            Ready to simplify your loan tracking?
          </h2>
          <p className="text-xl text-primary-100 dark:text-primary-200 mb-8 max-w-2xl mx-auto">
            Join thousands of people using Feyza to manage loans with clarity and trust.
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
