'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { Navbar, Footer } from '@/components/layout';
import { PathTo100Explainer } from '@/components/trust-score';
import {
  ArrowRight,
  Shield,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Heart,
  TrendingDown,
  Clock,
  HelpCircle,
  Ban,
  ThumbsUp,
  Scale,
  Percent,
} from 'lucide-react';

export default function HowVouchingWorksPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
      <Navbar user={null} />

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full mb-6">
            <Users className="w-4 h-4 text-white" />
            <span className="text-sm font-semibold text-white">Community Vouching System</span>
          </div>
          
          <h1 className="text-4xl sm:text-7xl lg:text-6xl font-display font-bold text-white mb-6">
            Vouching ≠ Co-Signing
          </h1>
          <p className="text-xl sm:text-2xl text-white/90 max-w-3xl mx-auto">
            Support someone without risking your money.
            <br />
            <strong className="text-white">Stake reputation, not cash.</strong>
          </p>
        </div>
      </section>

      {/* THE CRITICAL DIFFERENCE */}
      <section className="py-20 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              The Critical Difference
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              This is NOT like co-signing a bank loan
            </p>
          </div>

          {/* Side by Side */}
          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Co-Signing (Bad) */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-8 border-2 border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center">
                  <Ban className="w-7 h-7 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">Bank Co-Signing</h3>
                  <p className="text-sm text-red-600 dark:text-red-400 font-semibold">What banks do (scary)</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">Legally liable for debt</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">You owe the money if they don't pay</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">Can be sued</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Courts, lawyers, collections</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">Destroys credit score</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Shows on your credit report</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">Wage garnishment</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Money taken from paycheck</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-100 dark:bg-red-900/40 rounded-xl p-4 mt-6">
                <p className="font-bold text-red-700 dark:text-red-400 text-center">
                  📊 Result: 95% say NO
                </p>
              </div>
            </div>

            {/* Vouching (Good) */}
            <div className="bg-gradient-to-br from-green-50 to-primary-50 dark:from-green-900/20 dark:to-primary-900/20 rounded-2xl p-8 border-2 border-green-400 dark:border-green-600">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center">
                  <Heart className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">Feyza Vouching</h3>
                  <p className="text-sm text-green-600 dark:text-green-400 font-semibold">How we do it (safe)</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">NO legal liability</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">You don't owe money, period</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">Cannot be sued</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">No courts, no lawyers</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">No credit impact</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Never shows on credit report</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">No wage garnishment</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Your money stays yours</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-100 dark:bg-green-900/40 rounded-xl p-4 mt-6">
                <p className="font-bold text-green-700 dark:text-green-400 text-center">
                  ✨ Result: 60-70% say YES
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT FITS IN TRUST SCORE */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              Vouching = 15% of Trust Score
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400">
              Important but not everything. Payment history matters more.
            </p>
          </div>

          {/* Trust Score Breakdown */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 mb-8">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-6 text-center">
              Trust Score Components (0-100)
            </h3>
            <div className="space-y-4">
              {[
                { component: 'Payment History', weight: 40, color: 'primary', description: 'Pay on time = score goes up' },
                { component: 'Completion', weight: 25, color: 'amber', description: 'Finish loans successfully' },
                { component: 'Community Vouches', weight: 15, color: 'green', description: 'People vouch for you' },
                { component: 'Verification', weight: 10, color: 'blue', description: 'ID verified' },
                { component: 'Platform Tenure', weight: 10, color: 'purple', description: 'Time as member' },
              ].map((item) => {
                const bgColors = {
                  primary: 'bg-primary-500',
                  amber: 'bg-amber-500',
                  green: 'bg-green-500',
                  blue: 'bg-blue-500',
                  purple: 'bg-purple-500',
                };

                return (
                  <div key={item.component}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-semibold text-neutral-900 dark:text-white">{item.component}</span>
                        <span className="text-sm text-neutral-600 dark:text-neutral-400 ml-2">- {item.description}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-neutral-900 dark:text-white">{item.weight}%</span>
                      </div>
                    </div>
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${bgColors[item.color as keyof typeof bgColors]}`}
                        style={{ width: `${item.weight}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Point */}
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-2xl border border-primary-200 dark:border-primary-800 p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/40 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">
                  Important: Vouching Doesn't Replace Everything
                </h3>
                <p className="text-neutral-700 dark:text-neutral-300 mb-4">
                  Vouching helps, but it's only 15% of your trust score. You still need to:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Percent className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
                    <span className="text-neutral-700 dark:text-neutral-300"><strong>Make payments on time</strong> (40% of score)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Percent className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
                    <span className="text-neutral-700 dark:text-neutral-300"><strong>Complete loans successfully</strong> (25% of score)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Percent className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
                    <span className="text-neutral-700 dark:text-neutral-300"><strong>Work through graduated limits</strong> set by lenders</span>
                  </li>
                </ul>
                <p className="text-neutral-700 dark:text-neutral-300 mt-4">
                  Think of vouching as a <strong>boost</strong>, not a replacement for proving yourself.
                </p>
              </div>
            </div>
          </div>

          {/* Path to 100 — educate on how to reach full trust score */}
          <div className="mt-12 max-w-2xl">
            <PathTo100Explainer variant="full" />
          </div>
        </div>
      </section>

      {/* WHAT YOU'RE COMMITTING TO */}
      <section className="py-20 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              When You Vouch, You're Saying...
            </h2>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <ThumbsUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                    "I know this person and believe they'll repay"
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    You're making a character judgment based on your personal knowledge of them.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                    "I stake my reputation on their trustworthiness"
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Your platform standing reflects your judgment. If they default, your trust score drops.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                    "I understand there are consequences if they default"
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Platform reputation affected. But NO financial loss, lawsuits, or credit damage.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* What You're NOT Saying */}
          <div className="mt-8 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 p-8">
            <h3 className="text-2xl font-bold text-red-900 dark:text-red-400 mb-6 flex items-center gap-3">
              <XCircle className="w-7 h-7" />
              What You're NOT Saying
            </h3>
            <div className="space-y-3">
              {[
                '"I will pay their debt if they don\'t"',
                '"I accept legal responsibility"',
                '"You can sue me or garnish my wages"',
                '"This affects my credit report"',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                  <p className="text-neutral-700 dark:text-neutral-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* IF THEY DEFAULT */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              If They Don't Repay (Honest Truth)
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400">
              Here's exactly what happens to you as a voucher
            </p>
          </div>

          {/* Platform Consequences */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 mb-8">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-3">
              <TrendingDown className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              Platform Consequences
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                <span className="text-neutral-700 dark:text-neutral-300">Trust score drops <strong>50 points</strong> (e.g., 750 → 700)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                <span className="text-neutral-700 dark:text-neutral-300">Can't vouch for others for <strong>12 months</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                <span className="text-neutral-700 dark:text-neutral-300">Your borrowing limit reduced by <strong>20%</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                <span className="text-neutral-700 dark:text-neutral-300">Profile shows you vouched for someone who defaulted</span>
              </li>
            </ul>
          </div>

          {/* Recovery Path */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 p-8 mb-8">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-3">
              <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
              You Can Recover
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span className="text-neutral-700 dark:text-neutral-300">After 12 months, vouching suspension lifts</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span className="text-neutral-700 dark:text-neutral-300">Make on-time payments on your own loans to rebuild score</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <span className="text-neutral-700 dark:text-neutral-300">After 24 months of good behavior, full privileges restored</span>
              </div>
            </div>
          </div>

          {/* What Does NOT Happen */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border-2 border-primary-200 dark:border-primary-800 p-8">
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6 text-center">
              ✅ What Does NOT Happen
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                'No debt owed',
                'No lawsuits',
                'No wage garnishment',
                'No credit impact',
                'No collection calls',
                'No asset seizure',
                'No bankruptcy risk',
                'No financial loss',
                'No legal contracts',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHO TO VOUCH FOR */}
      <section className="py-20 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              Who Should You Vouch For?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Good Candidates */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                Good Candidates
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold mt-0.5">✓</span>
                  <span className="text-neutral-700 dark:text-neutral-300">You know them well personally</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold mt-0.5">✓</span>
                  <span className="text-neutral-700 dark:text-neutral-300">History of keeping commitments</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold mt-0.5">✓</span>
                  <span className="text-neutral-700 dark:text-neutral-300">Stable income source</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold mt-0.5">✓</span>
                  <span className="text-neutral-700 dark:text-neutral-300">Clear repayment plan</span>
                </li>
              </ul>
            </div>

            {/* Red Flags */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-red-200 dark:border-red-800 p-6">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                Red Flags
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 font-bold mt-0.5">✗</span>
                  <span className="text-neutral-700 dark:text-neutral-300">You barely know them</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 font-bold mt-0.5">✗</span>
                  <span className="text-neutral-700 dark:text-neutral-300">History of not repaying debts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 font-bold mt-0.5">✗</span>
                  <span className="text-neutral-700 dark:text-neutral-300">No stable income</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 font-bold mt-0.5">✗</span>
                  <span className="text-neutral-700 dark:text-neutral-300">They pressure you to vouch</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Decision Framework */}
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-2xl border border-primary-200 dark:border-primary-800 p-8">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <Scale className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              Ask Yourself
            </h3>
            <div className="space-y-3">
              <p className="text-neutral-700 dark:text-neutral-300 flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
                <span><strong>Would I lend them money myself?</strong> If no, don't vouch.</span>
              </p>
              <p className="text-neutral-700 dark:text-neutral-300 flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
                <span><strong>Do I trust their character?</strong> Not their luck, but their integrity.</span>
              </p>
              <p className="text-neutral-700 dark:text-neutral-300 flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
                <span><strong>Am I okay with platform consequences?</strong> 50-point drop, 12-month suspension manageable?</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-6">
            Ready to Vouch or Get Vouched?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Help someone you trust or build your own trust score
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="w-full sm:w-auto bg-white text-primary-700 hover:bg-primary-50 font-semibold">
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/faq">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
              >
                More Questions?
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}