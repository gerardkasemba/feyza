'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Button, Badge } from '@/components/ui';
import {
  ChevronDown,
  Search,
  HelpCircle,
  Users,
  CreditCard,
  Shield,
  Building2,
  MessageCircle,
} from 'lucide-react';

const faqCategories = [
  {
    id: 'general',
    icon: HelpCircle,
    title: 'General',
    questions: [
      {
        q: 'What is Feyza?',
        a: 'Feyza is a peer-to-peer lending platform that connects borrowers with individual and business lenders. We make it easy to request loans, get matched with lenders, and manage repayments—all in one secure platform.',
      },
      {
        q: 'Is Feyza available in my country?',
        a: 'Currently, Feyza operates primarily in the United States. We\'re working on expanding to more countries. Check with individual lenders for their specific service areas.',
      },
      {
        q: 'How is Feyza different from traditional banks?',
        a: 'Unlike banks, Feyza connects you directly with lenders who set their own terms. This often means faster approval, more flexible terms, and the ability to borrow from people you know or verified business lenders.',
      },
    ],
  },
  {
    id: 'borrowers',
    icon: Users,
    title: 'For Borrowers',
    questions: [
      {
        q: 'How do I request a loan?',
        a: 'Simply create an account, verify your identity, and connect your bank account. Then, submit a loan request specifying the amount you need, your preferred terms, and the purpose. Our matching system will find lenders who fit your criteria.',
      },
      {
        q: 'What are borrower tiers?',
        a: 'Borrower tiers represent your lending reputation. You start at Tier 1 with lower limits, and as you successfully repay loans, you move up tiers. Higher tiers unlock larger loan amounts and better terms.',
      },
      {
        q: 'Is there a credit check?',
        a: 'Feyza doesn\'t perform traditional credit checks. Instead, your borrowing limit is based on your tier level, which is determined by your payment history on our platform.',
      },
      {
        q: 'What happens if I miss a payment?',
        a: 'Missing payments affects your borrower rating and may result in late fees (depending on the lender\'s terms). Multiple missed payments can lead to account restrictions. We recommend setting up auto-pay to avoid this.',
      },
      {
        q: 'Can I pay off my loan early?',
        a: 'Yes! You can make extra payments or pay off your loan early at any time without penalties. Early repayment can help improve your borrower rating.',
      },
    ],
  },
  {
    id: 'payments',
    icon: CreditCard,
    title: 'Payments',
    questions: [
      {
        q: 'How do payments work?',
        a: 'Payments are processed through secure ACH bank transfers via Dwolla. You can set up auto-pay for automatic deductions or make manual payments through your dashboard.',
      },
      {
        q: 'What is auto-pay?',
        a: 'Auto-pay automatically deducts your payment from your connected bank account on the due date. This ensures you never miss a payment and helps maintain your borrower rating.',
      },
      {
        q: 'How long do transfers take?',
        a: 'ACH transfers typically take 1-3 business days to process. We recommend scheduling payments a few days before the due date to account for processing time.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'Currently, we accept payments via linked bank accounts (ACH transfers). We\'re working on adding more payment options in the future.',
      },
    ],
  },
  {
    id: 'lenders',
    icon: Building2,
    title: 'For Lenders',
    questions: [
      {
        q: 'How do I become a lender?',
        a: 'To become a business lender, submit an application through our business registration page. We\'ll verify your business credentials and, once approved, you can set your lending preferences and start accepting loans.',
      },
      {
        q: 'What are the fees for lenders?',
        a: 'Feyza charges a 2.9% platform fee on each repayment received. There are no upfront costs, monthly fees, or hidden charges. You only pay when you get paid.',
      },
      {
        q: 'Can I set my own interest rates?',
        a: 'Yes! As a lender, you have full control over your interest rates, loan amounts, term lengths, and other preferences. You can even offer interest-free loans if you choose.',
      },
      {
        q: 'How does auto-accept work?',
        a: 'Auto-accept automatically approves loan requests that match your specified criteria (amount range, borrower tier, location, etc.). This saves time and ensures you don\'t miss opportunities.',
      },
    ],
  },
  {
    id: 'security',
    icon: Shield,
    title: 'Security',
    questions: [
      {
        q: 'Is my financial information secure?',
        a: 'Absolutely. We use bank-level encryption (256-bit SSL) to protect your data. Bank connections are handled through Plaid, a trusted financial data platform used by major banks and apps.',
      },
      {
        q: 'How is my bank account protected?',
        a: 'We never store your bank credentials. Plaid creates a secure, tokenized connection to your bank. We can only initiate transfers you\'ve authorized.',
      },
      {
        q: 'What if I suspect fraud?',
        a: 'Contact our support team immediately at support@feyza.app. We have fraud monitoring systems in place and will investigate any suspicious activity promptly.',
      },
    ],
  },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('general');
  const [openQuestions, setOpenQuestions] = useState<string[]>([]);

  const toggleQuestion = (id: string) => {
    setOpenQuestions((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    );
  };

  const filteredCategories = faqCategories.map((cat) => ({
    ...cat,
    questions: cat.questions.filter(
      (q) =>
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.questions.length > 0);

  const currentCategory = searchQuery
    ? filteredCategories
    : faqCategories.filter((cat) => cat.id === activeCategory);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
      <Navbar />

      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            FAQ
          </Badge>
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
            Find answers to common questions about Feyza
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Category Sidebar */}
            {!searchQuery && (
              <div className="lg:col-span-1">
                <div className="sticky top-24 space-y-2">
                  {faqCategories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                          activeCategory === cat.id
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {cat.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Questions */}
            <div className={searchQuery ? 'lg:col-span-4' : 'lg:col-span-3'}>
              {currentCategory.map((category) => (
                <div key={category.id} className="mb-8">
                  {searchQuery && (
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                      <category.icon className="w-5 h-5 text-green-600" />
                      {category.title}
                    </h2>
                  )}
                  <div className="space-y-4">
                    {category.questions.map((item, i) => {
                      const questionId = `${category.id}-${i}`;
                      const isOpen = openQuestions.includes(questionId);
                      return (
                        <div
                          key={i}
                          className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
                        >
                          <button
                            onClick={() => toggleQuestion(questionId)}
                            className="w-full flex items-center justify-between px-6 py-4 text-left"
                          >
                            <span className="font-medium text-neutral-900 dark:text-white pr-4">
                              {item.q}
                            </span>
                            <ChevronDown
                              className={`w-5 h-5 text-neutral-400 flex-shrink-0 transition-transform ${
                                isOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          {isOpen && (
                            <div className="px-6 pb-4">
                              <p className="text-neutral-600 dark:text-neutral-400">
                                {item.a}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {searchQuery && filteredCategories.length === 0 && (
                <div className="text-center py-12">
                  <HelpCircle className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                    No results found
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                    Try searching with different keywords
                  </p>
                  <Button onClick={() => setSearchQuery('')} variant="outline">
                    Clear Search
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Still Need Help */}
      <section className="py-16 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <MessageCircle className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
            Still have questions?
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white">
                Contact Support
              </Button>
            </Link>
            <Link href="/help">
              <Button size="lg" variant="outline">
                Browse Help Center
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
