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
  TrendingUp,
  Heart,
  Clock,
  Ban,
  Star,
  AlertCircle,
  Sparkles,
  CreditCard,
  Calendar,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
      <Navbar user={null} />

      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 dark:from-primary-800 dark:via-primary-900 dark:to-neutral-950">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative">
          {/* ✅ IMPORTANT: items-start instead of items-center */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            
            {/* Left: Main Message */}
            {/* ✅ FIXED TYPO: items-start pb-12 (space added) */}
            <div className="flex flex-col items-start pb-12">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Not Another P2P Platform</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-7xl lg:text-6xl font-display font-bold text-white mb-6 leading-tight">
                Bad Credit?
                <br />
                No Credit?
                <br />
                <span className="text-primary-200">No Problem.</span>
              </h1>

              <p className="text-lg sm:text-xl lg:text-2xl text-white/90 mb-8 leading-relaxed max-w-2xl">
                We don't check credit scores. We check your <strong className="text-white">community</strong> and let you{' '}
                <strong className="text-white">prove yourself</strong>.
              </p>

              {/* Trust Section */}
              <div className="w-full max-w-xl bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-8">
                <h3 className="text-lg font-bold text-white mb-4">Build Trust Two Ways:</h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Get people to vouch for you</p>
                      <p className="text-sm text-white/80">Friends, family, community members stake their reputation</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Start small, prove yourself</p>
                      <p className="text-sm text-white/80">Repay on time, build trust score, unlock bigger loans</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Link href="/auth/signup" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-primary-700 hover:bg-primary-50 font-semibold">
                    Get Started
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>

                <Link href="/how-vouching-works" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                  >
                    How It Works
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Loan Request Form */}
            <div className="lg:sticky lg:top-24 self-start">
              <div className="rounded-2xl border border-white/20 bg-white dark:bg-neutral-900 shadow-2xl p-6 backdrop-blur-sm">
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">Request a Loan</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">No credit check, no account needed to start</p>
                  </div>
                </div>

                <GuestLoanRequestForm />
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* THE PROBLEM - TRADITIONAL LENDING FAILS */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              Why Traditional Lending Fails You
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              The credit score system locks out millions of trustworthy people
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto mb-12">
            {[
              {
                icon: Ban,
                title: 'Bad Credit = Rejected',
                description: 'One past mistake? Banks reject you for years. No second chances, no context.',
              },
              {
                icon: AlertCircle,
                title: 'No Credit = Invisible',
                description: 'Never borrowed before? Young? New to area? To banks, you don\'t exist.',
              },
              {
                icon: Ban,
                title: 'Emergency? Too Bad',
                description: 'Car breaks down? Medical bill? Banks take weeks. Payday loans charge 400%+ APR.',
              },
            ].map((problem) => (
              <div
                key={problem.title}
                className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-red-200 dark:border-red-900/40"
              >
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mb-4">
                  <problem.icon className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{problem.title}</h3>
                <p className="text-neutral-600 dark:text-neutral-400">{problem.description}</p>
              </div>
            ))}
          </div>

          {/* The Broken System */}
          <div className="max-w-4xl mx-auto bg-white dark:bg-neutral-900 rounded-2xl border-2 border-red-200 dark:border-red-900/40 p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center shrink-0">
                <Ban className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
                  You're Not a Number
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 text-lg">
                  Credit scores measure your financial past. They ignore your character, your community, 
                  your current situation, and your commitment to repay. <strong>There's a better way.</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE FEYZA WAY - TRUST SCORE */}
      <section className="py-20 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-400">The Feyza Way</span>
            </div>
            <h2 className="text-4xl sm:text-7xl font-display font-bold text-neutral-900 dark:text-white mb-6">
              We Check <span className="text-primary-600 dark:text-primary-400">Trust</span>, Not Credit
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              Your Trust Score (0-100) replaces credit scores. Build it your way.
            </p>
          </div>

          {/* Trust Score Components */}
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-16">
            {[
              {
                component: 'Payment History',
                weight: '40%',
                description: 'Repay on time, score goes up',
                icon: CheckCircle,
                color: 'primary',
              },
              {
                component: 'Completion',
                weight: '25%',
                description: 'Finish loans successfully',
                icon: Star,
                color: 'amber',
              },
              {
                component: 'Community Vouches',
                weight: '15%',
                description: 'People vouch for you',
                icon: Users,
                color: 'green',
              },
              {
                component: 'Verification',
                weight: '10%',
                description: 'ID verified, real person',
                icon: Shield,
                color: 'blue',
              },
              {
                component: 'Platform Tenure',
                weight: '10%',
                description: 'Time as active member',
                icon: Clock,
                color: 'purple',
              },
            ].map((item) => {
              const colorClasses = {
                primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
                amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
                green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
              };

              return (
                <div
                  key={item.component}
                  className="bg-neutral-50 dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-shadow"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorClasses[item.color as keyof typeof colorClasses]}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-neutral-900 dark:text-white mb-1">{item.component}</div>
                  <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-2">{item.weight}</div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{item.description}</p>
                </div>
              );
            })}
          </div>

          {/* Two Paths */}
          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Path 1: Community Vouching */}
            <div className="bg-gradient-to-br from-green-50 to-primary-50 dark:from-green-900/20 dark:to-primary-900/20 rounded-2xl p-8 border-2 border-green-400 dark:border-green-600">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center">
                  <Users className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">Path 1: Get Vouched</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">15% of your trust score</p>
                </div>
              </div>

              <p className="text-neutral-700 dark:text-neutral-300 mb-6">
                Have friends, family, or community members vouch for your character. They stake their reputation (not money) to support you.
              </p>

              <ul className="space-y-3 mb-6">
                {[
                  'No financial risk to vouchers',
                  'They cannot be sued or lose money',
                  'Boosts your trust score immediately',
                  'Shows lenders you have support',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                    <span className="text-neutral-700 dark:text-neutral-300">{item}</span>
                  </li>
                ))}
              </ul>

              <Link href="/how-vouching-works">
                <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
                  How Vouching Works →
                </Button>
              </Link>
            </div>

            {/* Path 2: Prove Yourself */}
            <div className="bg-gradient-to-br from-blue-50 to-primary-50 dark:from-blue-900/20 dark:to-primary-900/20 rounded-2xl p-8 border-2 border-blue-400 dark:border-blue-600">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">Path 2: Prove Yourself</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">65% from payment & completion</p>
                </div>
              </div>

              <p className="text-neutral-700 dark:text-neutral-300 mb-6">
                Start small, repay on time, complete loans successfully. Your actions build trust more than any credit score could.
              </p>

              <ul className="space-y-3 mb-6">
                {[
                  'Begin with smaller loan amounts',
                  'Make payments on time consistently',
                  'Complete loans successfully',
                  'Unlock bigger amounts as trust grows',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <span className="text-neutral-700 dark:text-neutral-300">{item}</span>
                  </li>
                ))}
              </ul>

              <Link href="/auth/signup">
                <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                  Start Building Trust →
                </Button>
              </Link>
            </div>
          </div>

          {/* Both Paths Work Together */}
          <div className="mt-12 max-w-4xl mx-auto bg-primary-50 dark:bg-primary-900/20 rounded-2xl border border-primary-200 dark:border-primary-800 p-8 text-center">
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
              Best Results? Do Both
            </h3>
            <p className="text-lg text-neutral-700 dark:text-neutral-300">
              Get people to vouch for you <strong>AND</strong> prove yourself with on-time payments. 
              Your trust score grows faster, lenders trust you more, you unlock bigger loans sooner.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - ACTUAL FLOW */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              How Feyza Works
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400">
              From request to repayment in four steps
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Request a Loan',
                description: 'Tell us how much you need and why. No credit check, takes 2 minutes.',
                icon: CreditCard,
              },
              {
                step: '02',
                title: 'Get Matched',
                description: 'We match you with lenders automatically. Or invite someone you know to fund it.',
                icon: Building2,
              },
              {
                step: '03',
                title: 'Build Trust',
                description: 'Get vouches from your community and/or start with a smaller amount to prove yourself.',
                icon: Users,
              },
              {
                step: '04',
                title: 'Repay & Grow',
                description: 'Make payments on time (auto-pay available). Your trust score grows. Unlock bigger loans.',
                icon: TrendingUp,
              },
            ].map((item, index) => (
              <div key={item.step} className="relative">
                <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 h-full">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="text-4xl font-display font-bold text-primary-100 dark:text-primary-900/30 mb-2">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{item.description}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-primary-300 dark:text-primary-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TWO WAYS TO GET FUNDED */}
      <section className="py-20 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              Two Ways to Get Funded
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              Get matched with verified business lenders or invite someone you know
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Business Lenders */}
            <div className="bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-neutral-900 rounded-2xl p-8 border border-primary-200 dark:border-primary-800">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-6">
                <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-2xl font-display font-bold text-neutral-900 dark:text-white mb-4">
                Business Lenders
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                We automatically match your request with verified business lenders based on your loan amount, 
                trust score, and their lending preferences. No browsing required.
              </p>
              <ul className="space-y-3">
                {['Automatic matching', 'Multiple lender options', 'Clear terms & rates', 'Auto-pay & reminders'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300">
                    <CheckCircle className="w-5 h-5 text-primary-500 dark:text-primary-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/auth/signup">
                  <Button className="w-full sm:w-auto">
                    Get Matched
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Personal Lenders */}
            <div className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-neutral-900 rounded-2xl p-8 border border-green-200 dark:border-green-800">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-6">
                <Heart className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-display font-bold text-neutral-900 dark:text-white mb-4">
                Friends & Family
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Invite someone you trust to fund your loan directly. They don't need an account. 
                Feyza tracks everything so your relationship stays clean.
              </p>
              <ul className="space-y-3">
                {['No account required for lender', 'Email invite system', 'Clear payment tracking', 'Preserve relationships'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300">
                    <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/borrower/request">
                  <Button
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                  >
                    Invite a Lender
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES THAT HELP YOU SUCCEED */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              We Help You Succeed
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Tools to make repayment easy and build your trust score
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Calendar,
                title: 'SmartSchedule™',
                description: 'Payment plan based on YOUR payday, not random dates. Avoid rent week, align with income.',
                color: 'primary',
              },
              {
                icon: Zap,
                title: 'Auto-Pay',
                description: 'Connect your bank account. Payments happen automatically. Never miss a due date.',
                color: 'blue',
              },
              {
                icon: Clock,
                title: 'Payment Reminders',
                description: 'Email reminders before each payment. Track upcoming, completed, and remaining payments.',
                color: 'amber',
              },
              {
                icon: Shield,
                title: 'Manual Payments Too',
                description: 'Prefer Cash App, Venmo, PayPal? Upload proof of payment. We track it all.',
                color: 'green',
              },
              {
                icon: TrendingUp,
                title: 'Trust Score Tracking',
                description: 'Watch your trust score grow in real-time. See exactly what improves it.',
                color: 'purple',
              },
              {
                icon: Users,
                title: 'Guest Access',
                description: 'Even if you borrowed without an account, you can track everything and make payments.',
                color: 'pink',
              },
            ].map((feature) => {
              const colorClasses: Record<string, string> = {
                primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
                blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
                green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
              };

              return (
                <div
                  key={feature.title}
                  className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-lg transition-shadow"
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

      {/* FINAL CTA */}
      <section className="py-20 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 dark:from-primary-800 dark:via-primary-900 dark:to-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-7xl font-display font-bold text-white mb-6">
            Your Trust Score Matters More
            <br />
            <span className="text-primary-200">Than Your Credit Score</span>
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-3xl mx-auto">
            Stop letting past mistakes or lack of history hold you back. Build trust, get approved, unlock bigger loans.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/auth/signup">
              <Button size="lg" className="w-full sm:w-auto bg-white text-primary-700 hover:bg-primary-50 font-semibold text-lg px-8">
                Get Started Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/how-vouching-works">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 backdrop-blur-sm text-lg px-8"
              >
                Learn More
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-white/80">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>No credit check</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Start small, grow big</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Community vouching</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}