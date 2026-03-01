'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { Navbar, Footer } from '@/components/layout';
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
  X,
  ChevronRight,
} from 'lucide-react';
import GuestLoanRequestForm from '@/components/loans/GuestLoanRequestForm';

// ─── Tier system  vouch-based (the real data) ──────────────────────────────
const TRUST_TIERS = [
  {
    tier: 'tier_1',
    number: 1,
    label: 'Low Trust',
    vouches: '0 – 2 vouches',
    description: 'Starting point. Access to basic loan amounts from lenders who accept new borrowers.',
    unlocks: 'Entry access',
    color: 'neutral',
  },
  {
    tier: 'tier_2',
    number: 2,
    label: 'Building Trust',
    vouches: '3 – 5 vouches',
    description: 'Your community is backing you. More lenders become available, higher limits unlock.',
    unlocks: '3+ vouches',
    color: 'blue',
  },
  {
    tier: 'tier_3',
    number: 3,
    label: 'Established Trust',
    vouches: '6 – 10 vouches',
    description: 'A strong community signal. Lenders compete for your business at this tier.',
    unlocks: '6+ vouches',
    color: 'amber',
  },
  {
    tier: 'tier_4',
    number: 4,
    label: 'High Trust',
    vouches: '11+ vouches',
    description: 'The highest tier. Maximum limits, best rates, full access to all lenders.',
    unlocks: '11+ vouches',
    color: 'green',
  },
];

// Trust score components (the 0-100 metric  separate from tier)
const TRUST_SCORE_COMPONENTS = [
  { label: 'Payment History', weight: '40%', desc: 'On-time payments build your score', icon: CheckCircle, color: 'green' },
  { label: 'Loan Completion', weight: '25%', desc: 'Finishing loans matters', icon: Star, color: 'amber' },
  { label: 'Community Vouches', weight: '15%', desc: 'Who backs you up', icon: Users, color: 'blue' },
  { label: 'Verification', weight: '10%', desc: 'ID confirmed, real person', icon: Shield, color: 'purple' },
  { label: 'Platform Tenure', weight: '10%', desc: 'Time as active member', icon: Clock, color: 'neutral' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
      <Navbar user={null} />
      {/* ══════════════════════════════════════════════════════════
          HERO  The Declaration
      ══════════════════════════════════════════════════════════ */}
      <section className="relative bg-primary-500 dark:bg-primary-950 overflow-hidden"> {/* Added overflow-hidden */}
        {/* Dot grid - opacity increased to 0.07 */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        {/* Purposeful depth blobs - Made responsive */}
        <div className="absolute top-0 right-0 w-[300px] md:w-[600px] h-[300px] md:h-[500px] bg-primary-400/40 dark:bg-emerald-500/40 rounded-full blur-[80px] md:blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[250px] md:w-[500px] h-[250px] md:h-[400px] bg-primary-700/30 dark:bg-emerald-700/30 rounded-full blur-[80px] md:blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-16 pb-16 md:pb-20 relative"> {/* Adjusted padding for mobile */}
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-start">

            {/* Left  Manifesto */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 border border-white/25 rounded-full mb-6 md:mb-7 self-start">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-bold text-white tracking-wide uppercase">No Credit Check</span>
              </div>

              <h1 className="font-display font-black text-white leading-[1.1] md:leading-[1.05] tracking-tight mb-5 md:mb-6"
                style={{ fontSize: 'clamp(2.2rem, 8vw, 5rem)' }}> {/* Adjusted clamp for mobile */}
                Your credit score
                <br />
                <span className="text-primary-200/70 dark:text-emerald-200/70 line-through decoration-red-300 decoration-[2px] md:decoration-[3px]">defines you.</span> {/* Adjusted decoration thickness for mobile */}
                <br />
                <span className="text-white">We disagree.</span>
              </h1>

              <p className="text-base md:text-lg text-primary-100 dark:text-emerald-50 leading-relaxed mb-6 md:mb-8 max-w-lg">
                Banks judge you by a three-digit number calculated by an algorithm that's never met you. We built something different   a system where{' '}
                <strong className="text-white">your community vouches for you</strong>, and your actions prove the rest.
              </p>

              {/* Two-column value props - Frosted glass cards */}
              <div className="grid grid-cols-2 gap-2 md:gap-3 mb-6 md:mb-8 max-w-lg">
                {[
                  { icon: Ban, label: 'No credit check', sub: 'Ever.' },
                  { icon: Users, label: 'Community vouching', sub: 'Real people back you' },
                  { icon: TrendingUp, label: 'Tier system', sub: 'Grow your access' },
                  { icon: Zap, label: 'Fast decisions', sub: 'Under 24 hours' },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex items-start gap-2 md:gap-3 p-2.5 md:p-3.5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-semibold text-white leading-tight">{label}</p>
                      <p className="text-[10px] md:text-[11px] text-primary-100/80 dark:text-emerald-50/80">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/auth/signup" className="w-full sm:w-auto">
                  <Button 
                    size="lg" 
                    className="w-full bg-white text-primary-600 hover:bg-white/90 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-400 font-bold shadow-md dark:shadow-emerald-500/20"
                  >
                    Get Started   It's Free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/how-vouching-works" className="w-full sm:w-auto">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full border-white/40 text-white hover:bg-white/10 dark:border-emerald-500/50 dark:text-emerald-500 dark:hover:bg-emerald-500/10 dark:hover:border-emerald-400"
                  >
                    How Vouching Works
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right  Guest Form - Crisp card */}
            <div className="lg:col-span-6 lg:sticky lg:top-24">
              <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800">
                <div className="px-6 pt-5 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Zap className="w-4.5 h-4.5 text-primary-500 dark:text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white text-sm">Request a Loan</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">No account needed · No credit check</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <GuestLoanRequestForm />
                </div>
                <div className="px-6 rounded-bl-xl rounded-br-xl py-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-800">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                    🔒 Your information is encrypted — we never check your credit
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          THE INDICTMENT  Credit Scores Are Broken
          Visual tone: cold, clinical, machine-like
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold tracking-[0.3em] text-neutral-500 uppercase mb-3">
              The Problem
            </p>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4 leading-tight">
              A three-digit number
              <br />
              <span className="text-neutral-400 dark:text-neutral-500">decided your future.</span>
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-lg">
              The credit score system was built in 1989  before the internet, before smartphones, before most of us were born. Yet it still determines whether you can pay your rent or fix your car.
            </p>
          </div>

          {/* The three failures */}
          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {[
              {
                label: 'One mistake. Punished for years.',
                body: 'Miss a payment during a crisis? The algorithm marks you for 7 years. No context. No appeal. No second chance.',
                icon: Ban,
              },
              {
                label: 'Never borrowed? You\'re invisible.',
                body: 'Young, new to the country, or just careful with money? To a bank, no credit history means no trustworthiness. Circular logic.',
                icon: AlertCircle,
              },
              {
                label: 'Emergency? The system laughs.',
                body: 'Car breaks down, medical bill arrives. Banks take weeks and still say no. Payday lenders charge 300–400% APR. Take it or leave it.',
                icon: X,
              },
            ].map(({ label, body, icon: Icon }) => (
              <div key={label} className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-red-100 dark:border-red-900/30">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-red-500 dark:text-red-400" />
                </div>
                <h3 className="font-bold text-neutral-900 dark:text-white mb-2 text-sm">{label}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          {/* The verdict */}
          <div className="p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl bg-neutral-900 dark:bg-neutral-950 border border-neutral-800 max-w-4xl mx-4 sm:mx-6 md:mx-auto">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-neutral-800 flex items-center justify-center flex-shrink-0">
                <span className="text-base sm:text-lg md:text-xl">⚖️</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 sm:mb-2">
                  The score doesn't know you.
                </h3>
                <p className="text-sm sm:text-base text-neutral-400 leading-relaxed">
                  A credit score measures your relationship with debt. It says nothing about your character, your work ethic, your community, or your commitment to the people you owe. It treats every missed payment the same   whether it happened during a medical crisis or a moment of irresponsibility.{' '}
                  <strong className="text-white">There has to be a better signal.</strong>
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          THE FEYZA SIGNAL  Vouching
          Visual tone: warm, human, community
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full mb-6">
                <Sparkles className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                <span className="text-xs font-bold text-green-700 dark:text-green-400 tracking-wide uppercase">The Feyza Signal</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-6 leading-tight">
                Who vouches for you
                <br />
                <span className="text-green-600 dark:text-green-400">is more powerful</span>
                <br />
                than any algorithm.
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 text-lg leading-relaxed mb-8">
                When someone puts their reputation on the line for you  a friend, a family member, a community elder  that says more about your character than three digits ever could. We built our entire system around this.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { title: 'No financial risk to your voucher', sub: 'They stake their reputation, not their money. They cannot be sued or lose anything.' },
                  { title: 'Vouches unlock higher tiers', sub: 'Each tier unlocks larger loan amounts from more lenders. More vouches, more access.' },
                  { title: 'Vouchers have skin in the game', sub: 'A poor vouch reflects on them too. People only vouch for people they genuinely trust.' },
                ].map(({ title, sub }) => (
                  <div key={title} className="flex items-start gap-3.5">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white text-sm">{title}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/how-vouching-works">
                <Button className="bg-green-600 hover:bg-green-700 text-white font-bold">
                  How Vouching Works <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            {/* Right  Comparison: old vs new */}
            <div className="space-y-3">
              <p className="text-xs font-bold tracking-[0.25em] text-neutral-400 uppercase mb-5">Credit score vs Feyza</p>

              {[
                { label: 'What it measures', old: 'Your debt payment history', feyza: 'Your community trust + behavior' },
                { label: 'New to credit?', old: 'Invisible. Rejected.', feyza: 'Start at Tier 1, build from there' },
                { label: 'Past mistakes', old: 'Counted against you for 7 years', feyza: 'Addressed through community vouches' },
                { label: 'Who decides', old: 'An algorithm', feyza: 'Real people who know you' },
                { label: 'How to improve', old: 'Wait. Or pay for credit repair.', feyza: 'Get vouched. Build your track record.' },
                { label: 'Emergency access', old: 'Denied or 400% APR payday loans', feyza: 'Same-day request, 24hr decision' },
              ].map(({ label, old, feyza }) => (
                <div key={label} className="grid grid-cols-12 gap-2 text-sm">
                  <div className="col-span-3 text-xs text-neutral-400 py-3 font-medium">{label}</div>
                  <div className="col-span-4 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 text-xs leading-tight flex items-center">
                    {old}
                  </div>
                  <div className="col-span-5 px-3 py-2.5 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/30 text-green-700 dark:text-green-400 text-xs leading-tight flex items-center font-medium">
                    {feyza}
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-12 gap-2 pt-2">
                <div className="col-span-3" />
                <div className="col-span-4 text-center">
                  <span className="text-[10px] text-red-400 font-bold tracking-wide uppercase">Old System</span>
                </div>
                <div className="col-span-5 text-center">
                  <span className="text-[10px] text-green-500 font-bold tracking-wide uppercase">Feyza</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          TRUST TIERS  The Four-Tier System
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.3em] text-neutral-500 uppercase mb-3">The Tier System</p>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4 leading-tight">
              More vouches. Higher tier.
              <br />
              <span className="text-green-400">Bigger loans.</span>
            </h2>
            <p className="text-neutral-400 max-w-xl mx-auto">
              Your tier determines what loan amounts lenders will approve. It's based entirely on how many active vouches you have. No waiting. No scoring algorithm. Just people backing you.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {TRUST_TIERS.map((tier, i) => {
              const colors = {
                neutral: { ring: 'border-neutral-700', bg: 'bg-neutral-900', badge: 'bg-neutral-700 text-neutral-300', dot: 'bg-neutral-500' },
                blue: { ring: 'border-blue-500/30', bg: 'bg-blue-950/20', badge: 'bg-blue-500/15 text-blue-300', dot: 'bg-blue-400' },
                amber: { ring: 'border-amber-500/30', bg: 'bg-amber-950/20', badge: 'bg-amber-500/15 text-amber-300', dot: 'bg-amber-400' },
                green: { ring: 'border-green-500/40', bg: 'bg-green-950/20', badge: 'bg-green-500/15 text-green-300', dot: 'bg-green-400' },
              }[tier.color] ?? { ring: 'border-neutral-700', bg: 'bg-neutral-900', badge: 'bg-neutral-700 text-neutral-300', dot: 'bg-neutral-500' };

              return (
                <div key={tier.tier}
                  className={`relative rounded-2xl border p-5 ${colors.ring} ${colors.bg} ${i === 3 ? 'ring-1 ring-green-500/20' : ''}`}>
                  {i === 3 && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-green-500 text-[10px] font-bold text-white whitespace-nowrap">
                      Highest Access
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                    <span className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Tier {tier.number}</span>
                  </div>
                  <h3 className="font-bold text-white text-base mb-1">{tier.label}</h3>
                  <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold mb-3 ${colors.badge}`}>
                    {tier.vouches}
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">{tier.description}</p>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-neutral-600 max-w-lg mx-auto">
            Tiers update automatically as you receive vouches. Lenders set their own limits per tier  the more lenders available at your tier, the better your options.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          TRUST SCORE  The 0–100 Metric
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid lg:grid-cols-2 gap-16 items-center">

            <div>
              <p className="text-xs font-bold tracking-[0.3em] text-neutral-400 uppercase mb-3">Trust Score</p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4 leading-tight">
                A score that actually
                <br />
                <span className="text-primary-600 dark:text-primary-400">reflects who you are.</span>
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-8 leading-relaxed">
                Alongside your tier, you have a Trust Score from 0–100. It's visible to lenders and tells a richer story than any credit score ever could  because it accounts for <em>behavior</em>, not just payment history.
              </p>
              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Your score is built from</p>
                <div className="space-y-3">
                  {TRUST_SCORE_COMPONENTS.map((c) => {
                    const colorMap = {
                      green: 'bg-green-500',
                      amber: 'bg-amber-400',
                      blue: 'bg-blue-500',
                      purple: 'bg-purple-500',
                      neutral: 'bg-neutral-500',
                    };
                    const widthMap = { '40%': 'w-[40%]', '25%': 'w-[25%]', '15%': 'w-[15%]', '10%': 'w-[10%]' };
                    return (
                      <div key={c.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{c.label}</span>
                          <span className="text-sm font-bold text-neutral-900 dark:text-white">{c.weight}</span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${colorMap[c.color as keyof typeof colorMap]} ${widthMap[c.weight as keyof typeof widthMap]}`} />
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5">{c.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-7 rounded-2xl bg-gradient-to-br from-green-50 to-white dark:from-green-900/15 dark:to-neutral-900 border border-green-100 dark:border-green-900/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white">Trust Tier</p>
                    <p className="text-xs text-neutral-500">Determines your loan limit access</p>
                  </div>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 leading-relaxed">
                  Your tier (1–4) is based on how many active vouches you have. This is what lenders use to determine how much they'll lend you.
                </p>
                <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400">
                  More vouches → Higher tier → Bigger loans
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              <div className="p-7 rounded-2xl bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/15 dark:to-neutral-900 border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white">Trust Score</p>
                    <p className="text-xs text-neutral-500">Lenders see your full picture</p>
                  </div>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 leading-relaxed">
                  Your 0–100 score shows lenders your full track record  payments made, loans completed, how long you've been on the platform.
                </p>
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
                  Pay on time → Score rises → Better terms
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          HOW IT WORKS  4 Steps
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-3">
              From request to funded
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto">
              Four steps. No credit check. No weeks of waiting.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                n: '01', title: 'Request a Loan',
                body: 'Tell us how much you need and why. Takes two minutes. No credit check.',
                icon: CreditCard,
              },
              {
                n: '02', title: 'Get Vouched',
                body: 'Invite friends, family, or community members to vouch for you. Each vouch raises your tier and opens more lenders.',
                icon: Users,
              },
              {
                n: '03', title: 'Get Matched',
                body: 'We match you with lenders whose tier policies fit your current standing. Or invite someone you know personally.',
                icon: Building2,
              },
              {
                n: '04', title: 'Repay & Grow',
                body: 'Make payments on time  auto-pay available. Your trust score builds. Lenders trust you more. The cycle rewards the trustworthy.',
                icon: TrendingUp,
              },
            ].map((step, i, arr) => (
              <div key={step.n} className="relative">
                <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 h-full">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                    <step.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="text-3xl font-display font-black text-neutral-100 dark:text-neutral-800 mb-2">{step.n}</div>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{step.body}</p>
                </div>
                {i < arr.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-5 h-5 text-neutral-300 dark:text-neutral-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          TWO WAYS TO GET FUNDED
      ══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-3">
              Two ways to get funded
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto">
              Matched to a verified business lender, or invite someone you already know.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-primary-100 dark:border-primary-900/30 bg-gradient-to-br from-primary-50 to-white dark:from-primary-950/30 dark:to-neutral-900 p-8">
              <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-5">
                <Building2 className="w-7 h-7 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-xl font-display font-bold text-neutral-900 dark:text-white mb-3">Business Lenders</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-5 text-sm leading-relaxed">
                We automatically match your request with verified business lenders whose tier policies match your current standing. Their loan limits are set per-tier  the higher your tier, the more they'll offer.
              </p>
              <ul className="space-y-2.5 mb-6">
                {['Automatic matching by your tier', 'Multiple lenders may compete for you', 'Clear terms and rates upfront', 'Auto-pay and smart payment scheduling'].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
                    <CheckCircle className="w-4 h-4 text-primary-500 dark:text-primary-400 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup">
                <Button className="w-full sm:w-auto">Get Matched <ArrowRight className="w-4 h-4 ml-1.5" /></Button>
              </Link>
            </div>

            <div className="rounded-2xl border border-green-100 dark:border-green-900/30 bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-neutral-900 p-8">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-5">
                <Heart className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-display font-bold text-neutral-900 dark:text-white mb-3">Friends & Family</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-5 text-sm leading-relaxed">
                Invite someone you trust to fund your loan directly. They don't need a Feyza account. We track everything, send reminders, and keep your relationship clean  because mixing money and relationships should come with a safety net.
              </p>
              <ul className="space-y-2.5 mb-6">
                {['No account needed for your lender', 'Email invite system', 'Clear payment tracking for both sides', 'Preserve the relationship  we handle the awkward part'].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
                    <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <Link href="/loans/new">
                <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
                  Invite a Lender <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FEATURES STRIP
      ══════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-neutral-50 dark:bg-neutral-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-neutral-900 dark:text-white">Built to help you succeed</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Calendar, title: 'SmartSchedule™', body: 'Payment dates built around your payday  not random calendar dates. Never pay during rent week again.', color: 'primary' },
              { icon: Zap, title: 'Auto-Pay', body: 'Connect your bank. Payments happen automatically on due dates. Never miss, never stress.', color: 'blue' },
              { icon: Clock, title: 'Payment Reminders', body: 'Email reminders before every payment. Full visibility into upcoming, completed, and remaining amounts.', color: 'amber' },
              { icon: Shield, title: 'Manual Payments', body: 'Prefer Cash App, Venmo, or bank transfer? Upload proof. We track and confirm everything.', color: 'green' },
              { icon: TrendingUp, title: 'Live Trust Score', body: 'Watch your score move in real time. See exactly what improves it and what doesn\'t.', color: 'purple' },
              { icon: Users, title: 'Guest Access', body: 'Borrowed without an account? You can still track your loan, make payments, and build your history.', color: 'neutral' },
            ].map((f) => {
              const colorMap: Record<string, string> = {
                primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
                blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
                green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                neutral: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
              };
              return (
                <div key={f.title} className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                  <div className={`w-10 h-10 rounded-xl ${colorMap[f.color]} flex items-center justify-center mb-3`}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-neutral-900 dark:text-white mb-1.5">{f.title}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FINAL CTA  The Close
      ══════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-neutral-950 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/8 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative">
          <p className="text-xs font-bold tracking-[0.3em] text-neutral-500 uppercase mb-4">The Bottom Line</p>
          <h2 className="font-display font-black text-white leading-[1.05] mb-6 tracking-tight"
            style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4rem)' }}>
            You are not
            <br />
            your credit score.
            <br />
            <span className="text-green-400">You never were.</span>
          </h2>
          <p className="text-neutral-400 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop letting a 1989 algorithm decide your financial future. Build trust with your community. Prove yourself with your actions. Unlock the lending you actually deserve.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link href="/auth/signup">
              <Button size="lg" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold text-base px-8">
                Get Started — It's Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/how-vouching-works">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-neutral-700 text-neutral-300 hover:bg-neutral-900 text-base px-8">
                Learn How It Works
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-neutral-600 text-sm">
            {['No credit check', 'Start at any tier', 'Community-backed', 'Free to join'].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
