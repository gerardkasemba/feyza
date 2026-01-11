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
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={null} />

      {/* Hero Section with Loan Request Form */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left: Text Content */}
            <div className="animate-fade-in">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                Simple. Transparent. Trust-Based.
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-neutral-900 mb-6 leading-tight">
                Borrow & lend with{' '}
                <span className="text-primary-600">friends & family</span>
              </h1>
              <p className="text-xl text-neutral-600 mb-8 max-w-lg">
                Request a loan, track payments, and manage everything in one place. 
                No account needed to get started.
              </p>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                  <p className="text-2xl font-bold text-primary-600">10K+</p>
                  <p className="text-sm text-neutral-500">Active Users</p>
                </div>
                <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                  <p className="text-2xl font-bold text-green-600">$2M+</p>
                  <p className="text-sm text-neutral-500">Loans Tracked</p>
                </div>
                <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                  <p className="text-2xl font-bold text-accent-600">98%</p>
                  <p className="text-sm text-neutral-500">Repaid</p>
                </div>
              </div>
              
              {/* Already have a loan? */}
              <div className="bg-white rounded-xl p-4 border border-neutral-200">
                <p className="font-medium text-neutral-900 mb-3">Already have a loan?</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link href="/borrower/access" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay Your Loan
                    </Button>
                  </Link>
                  <Link href="/lender/access" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Users className="w-4 h-4 mr-2" />
                      Manage as Lender
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
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 mb-4">
              Two ways to get a loan
            </h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Whether you need a loan from a business or someone you know, we've got you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Business Lenders */}
            <div className="bg-gradient-to-br from-primary-50 to-white rounded-3xl p-8 border border-primary-100">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-6">
                <Building2 className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-2xl font-display font-bold text-neutral-900 mb-4">
                Business Lenders
              </h3>
              <p className="text-neutral-600 mb-6">
                Browse registered business lenders on our platform. Submit a request, 
                wait for approval, and start tracking your loan with professional terms.
              </p>
              <ul className="space-y-3">
                {['Verified businesses', 'Clear interest rates', 'Professional support'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-neutral-700">
                    <CheckCircle className="w-5 h-5 text-primary-500" />
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
      <section className="py-24 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 mb-4">
              How it works
            </h2>
            <p className="text-xl text-neutral-600">
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
                <div className="text-6xl font-display font-bold text-primary-100 mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-display font-semibold text-neutral-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-neutral-600">{item.description}</p>
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 -right-4 w-8">
                    <ArrowRight className="w-6 h-6 text-neutral-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 mb-4">
              Everything you need to manage loans
            </h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
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
                primary: 'bg-primary-100 text-primary-600',
                yellow: 'bg-yellow-100 text-yellow-600',
                green: 'bg-green-100 text-green-600',
                blue: 'bg-blue-100 text-blue-600',
                purple: 'bg-purple-100 text-purple-600',
                accent: 'bg-accent-100 text-accent-600',
              };
              return (
                <div key={feature.title} className="p-6 rounded-2xl border border-neutral-200 hover:border-neutral-300 hover:shadow-lg transition-all">
                  <div className={`w-12 h-12 ${colorClasses[feature.color]} rounded-xl flex items-center justify-center mb-4`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-display font-semibold text-neutral-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Guest Access Section */}
      <section className="py-16 bg-gradient-to-r from-primary-600 to-accent-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* For Borrowers */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Have a loan to pay?
              </h3>
              <p className="text-white/80 mb-6">
                Someone lent you money through Feyza? Access your loan, track payments, 
                and pay directly - no account needed.
              </p>
              <Link href="/borrower/access">
                <Button className="bg-white text-primary-600 hover:bg-white/90 w-full sm:w-auto">
                  Pay Your Loan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* For Lenders */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Lent money to someone?
              </h3>
              <p className="text-white/80 mb-6">
                Track a loan you made to a friend or family member. Manage payments 
                and send reminders - no account needed.
              </p>
              <Link href="/lender/access">
                <Button className="bg-white text-primary-600 hover:bg-white/90 w-full sm:w-auto">
                  Manage Your Loan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-6">
                <Shield className="w-4 h-4" />
                Built on Trust
              </span>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 mb-6">
                Why people love Feyza
              </h2>
              <p className="text-xl text-neutral-600 mb-8">
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
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 mb-1">{item.title}</h3>
                      <p className="text-neutral-600">{item.description}</p>
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
                <div key={stat.label} className="bg-white p-6 rounded-2xl border border-neutral-200 text-center">
                  <p className="text-3xl font-display font-bold text-primary-600 mb-1">{stat.number}</p>
                  <p className="text-neutral-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary-600 to-primary-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-6">
            Ready to simplify your loan tracking?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of people using Feyza to manage loans with clarity and trust.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-primary-600 hover:bg-neutral-100"
              >
                Create Free Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/business/setup">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-white text-white hover:bg-white/10"
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
