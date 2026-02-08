'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Button, Badge } from '@/components/ui';
import {
  Search,
  BookOpen,
  CreditCard,
  Shield,
  Users,
  Settings,
  HelpCircle,
  ChevronRight,
  MessageCircle,
  Mail,
  FileText,
  Zap,
  Building2,
  Clock,
  ArrowRight,
} from 'lucide-react';

const categories = [
  {
    icon: Users,
    title: 'Getting Started',
    description: 'Learn the basics of using Feyza',
    articles: ['Creating an account', 'Verifying your identity', 'Connecting your bank', 'Understanding loan tiers'],
    color: 'blue',
  },
  {
    icon: CreditCard,
    title: 'Loans & Payments',
    description: 'Everything about borrowing and repaying',
    articles: ['Requesting a loan', 'Understanding interest', 'Setting up auto-pay', 'Making manual payments'],
    color: 'green',
  },
  {
    icon: Building2,
    title: 'For Lenders',
    description: 'Guide for business lenders',
    articles: ['Becoming a lender', 'Setting preferences', 'Managing loans', 'Understanding fees'],
    color: 'purple',
  },
  {
    icon: Shield,
    title: 'Security & Privacy',
    description: 'Keeping your account safe',
    articles: ['Two-factor authentication', 'Password security', 'Data protection', 'Reporting fraud'],
    color: 'rose',
  },
  {
    icon: Settings,
    title: 'Account Settings',
    description: 'Manage your account preferences',
    articles: ['Updating profile', 'Notification settings', 'Changing bank account', 'Closing account'],
    color: 'amber',
  },
  {
    icon: HelpCircle,
    title: 'Troubleshooting',
    description: 'Common issues and solutions',
    articles: ['Payment failed', 'Bank connection issues', 'Account locked', 'Missing funds'],
    color: 'cyan',
  },
];

const popularArticles = [
  { title: 'How to request your first loan', category: 'Getting Started', time: '3 min read' },
  { title: 'Understanding borrower tiers', category: 'Getting Started', time: '5 min read' },
  { title: 'Setting up automatic payments', category: 'Payments', time: '2 min read' },
  { title: 'What happens if I miss a payment?', category: 'Payments', time: '4 min read' },
  { title: 'How to become a verified lender', category: 'For Lenders', time: '6 min read' },
];

const colorClasses: Record<string, { bg: string; icon: string; hover: string }> = {
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', icon: 'text-blue-600 dark:text-blue-400', hover: 'hover:border-blue-300 dark:hover:border-blue-700' },
  green: { bg: 'bg-green-100 dark:bg-green-900/30', icon: 'text-green-600 dark:text-green-400', hover: 'hover:border-green-300 dark:hover:border-green-700' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', icon: 'text-purple-600 dark:text-purple-400', hover: 'hover:border-purple-300 dark:hover:border-purple-700' },
  rose: { bg: 'bg-rose-100 dark:bg-rose-900/30', icon: 'text-rose-600 dark:text-rose-400', hover: 'hover:border-rose-300 dark:hover:border-rose-700' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', icon: 'text-amber-600 dark:text-amber-400', hover: 'hover:border-amber-300 dark:hover:border-amber-700' },
  cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', icon: 'text-cyan-600 dark:text-cyan-400', hover: 'hover:border-cyan-300 dark:hover:border-cyan-700' },
};

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
      <Navbar />

      {/* Hero with Search */}
      <section className="py-16 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            How can we help you?
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
            Search our knowledge base or browse categories below
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-8">
            Browse by Category
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, i) => {
              const Icon = category.icon;
              const colors = colorClasses[category.color];
              return (
                <div
                  key={i}
                  className={`bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700 ${colors.hover} transition-colors cursor-pointer`}
                >
                  <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
                    {category.title}
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                    {category.description}
                  </p>
                  <ul className="space-y-2">
                    {category.articles.map((article, j) => (
                      <li key={j}>
                        <Link
                          href={`/help/${category.title.toLowerCase().replace(/ /g, '-')}/${article.toLowerCase().replace(/ /g, '-')}`}
                          className="flex items-center text-sm text-neutral-600 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400"
                        >
                          <ChevronRight className="w-4 h-4 mr-1" />
                          {article}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="py-16 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-8">
            Popular Articles
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularArticles.map((article, i) => (
              <Link
                key={i}
                href="#"
                className="flex items-start gap-4 bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 hover:border-green-300 dark:hover:border-green-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-medium text-neutral-900 dark:text-white mb-1">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                    <span>{article.category}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.time}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl p-8 md:p-12 text-center text-white">
            <MessageCircle className="w-16 h-16 mx-auto mb-6 opacity-90" />
            <h2 className="text-3xl font-bold mb-4">Still need help?</h2>
            <p className="text-green-100 mb-8 text-lg">
              Our support team is here to assist you with any questions.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/contact">
                <Button size="lg" className="bg-white text-green-700 hover:bg-green-50">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              </Link>
              <Link href="/faq">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  View FAQ
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
