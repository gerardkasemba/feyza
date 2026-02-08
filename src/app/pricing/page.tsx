'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Button, Badge } from '@/components/ui';
import {
  Check,
  X,
  Zap,
  Building2,
  Crown,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

const plans = [
  {
    name: 'Borrower',
    subtitle: 'For individuals',
    price: 'Free',
    period: 'forever',
    description: 'Everything you need to borrow money safely.',
    icon: Zap,
    color: 'blue',
    popular: false,
    features: [
      { text: 'Request loans up to your tier limit', included: true },
      { text: 'Get matched with verified lenders', included: true },
      { text: 'Flexible repayment schedules', included: true },
      { text: 'Auto-pay setup', included: true },
      { text: 'Payment reminders', included: true },
      { text: 'Build borrower reputation', included: true },
      { text: 'Mobile-friendly dashboard', included: true },
      { text: 'Email support', included: true },
    ],
    cta: 'Get Started Free',
    ctaLink: '/auth/signup',
  },
  {
    name: 'Business Lender',
    subtitle: 'For lending businesses',
    price: '$0',
    period: 'to start',
    description: 'Powerful tools to manage your lending business.',
    icon: Building2,
    color: 'green',
    popular: true,
    note: '2.9% platform fee per transaction',
    features: [
      { text: 'Unlimited loan management', included: true },
      { text: 'Custom lending preferences', included: true },
      { text: 'Auto-accept qualified borrowers', included: true },
      { text: 'Public lender profile', included: true },
      { text: 'ACH payment processing', included: true },
      { text: 'Borrower analytics', included: true },
      { text: 'Multi-region support', included: true },
      { text: 'Priority support', included: true },
    ],
    cta: 'Become a Lender',
    ctaLink: '/business/register',
  },
  {
    name: 'Enterprise',
    subtitle: 'For large organizations',
    price: 'Custom',
    period: 'pricing',
    description: 'Tailored solutions for high-volume lenders.',
    icon: Crown,
    color: 'purple',
    popular: false,
    features: [
      { text: 'Everything in Business Lender', included: true },
      { text: 'Custom fee structures', included: true },
      { text: 'API access', included: true },
      { text: 'White-label options', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'SLA guarantees', included: true },
      { text: 'Phone & Slack support', included: true },
    ],
    cta: 'Contact Sales',
    ctaLink: '/contact',
  },
];

const faqs = [
  {
    q: 'Are there any hidden fees for borrowers?',
    a: 'No! Borrowing on Feyza is completely free. You only pay back the loan amount plus any interest set by your lender.',
  },
  {
    q: 'How does the 2.9% platform fee work?',
    a: 'The 2.9% fee is deducted from each repayment received by lenders. There are no upfront costs or monthly fees.',
  },
  {
    q: 'Can I try before committing?',
    a: 'Absolutely! Both borrowers and lenders can create accounts for free and explore the platform before transacting.',
  },
  {
    q: 'What payment methods are supported?',
    a: 'We use Dwolla for secure ACH bank transfers. Both parties connect their bank accounts through our secure Plaid integration.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
      <Navbar />

      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Simple Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-6">
            Transparent, Fair Pricing
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Free for borrowers. Fair rates for lenders. No hidden fees, ever.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 -mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isPopular = plan.popular;
              return (
                <div
                  key={plan.name}
                  className={`relative bg-white dark:bg-neutral-800 rounded-3xl p-8 border-2 ${
                    isPopular
                      ? 'border-green-500 shadow-xl'
                      : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-green-600 text-white border-0 px-4">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    plan.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    plan.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                    'bg-purple-100 dark:bg-purple-900/30'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      plan.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                      plan.color === 'green' ? 'text-green-600 dark:text-green-400' :
                      'text-purple-600 dark:text-purple-400'
                    }`} />
                  </div>

                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{plan.name}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{plan.subtitle}</p>

                  <div className="mb-2">
                    <span className="text-4xl font-bold text-neutral-900 dark:text-white">{plan.price}</span>
                    <span className="text-neutral-500 dark:text-neutral-400 ml-2">{plan.period}</span>
                  </div>

                  <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">{plan.description}</p>

                  {plan.note && (
                    <p className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-lg mb-4">
                      {plan.note}
                    </p>
                  )}

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-neutral-300 dark:text-neutral-600 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={feature.included ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-400'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link href={plan.ctaLink}>
                    <Button
                      className={`w-full ${
                        isPopular
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-600'
                      }`}
                      size="lg"
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-neutral-900 dark:text-white mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-green-600" />
                  {faq.q}
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 pl-7">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
            No credit card required. Create your free account today.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white">
                Create Free Account
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline">
                Talk to Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
