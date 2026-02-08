'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Button, Badge } from '@/components/ui';
import {
  Heart,
  Users,
  Shield,
  Zap,
  Globe,
  Target,
  Award,
  ArrowRight,
  CheckCircle,
  Linkedin,
  Twitter,
} from 'lucide-react';

const values = [
  {
    icon: Heart,
    title: 'People First',
    description: 'We believe everyone deserves access to fair financial services, regardless of their credit history.',
  },
  {
    icon: Shield,
    title: 'Trust & Security',
    description: 'Your security is our priority. We use bank-level encryption and never compromise on protecting your data.',
  },
  {
    icon: Zap,
    title: 'Simplicity',
    description: 'Finance shouldn\'t be complicated. We make borrowing and lending as simple as sending a message.',
  },
  {
    icon: Globe,
    title: 'Accessibility',
    description: 'We\'re building a platform that works for everyone, everywhere, on any device.',
  },
];

const stats = [
  { value: '$5M+', label: 'Loans Facilitated' },
  { value: '10,000+', label: 'Happy Users' },
  { value: '95%', label: 'Repayment Rate' },
  { value: '50+', label: 'States Served' },
];

const team = [
  {
    name: 'Sarah Chen',
    role: 'CEO & Co-Founder',
    bio: 'Former fintech executive with 15 years in consumer lending.',
    image: 'SC',
  },
  {
    name: 'Marcus Johnson',
    role: 'CTO & Co-Founder',
    bio: 'Engineering leader from Stripe and Square.',
    image: 'MJ',
  },
  {
    name: 'Emily Rodriguez',
    role: 'Head of Operations',
    bio: 'Previously scaled operations at multiple fintech startups.',
    image: 'ER',
  },
  {
    name: 'David Kim',
    role: 'Head of Product',
    bio: 'Product leader focused on user-centric financial tools.',
    image: 'DK',
  },
];

const milestones = [
  { year: '2022', event: 'Feyza founded with a mission to democratize lending' },
  { year: '2023', event: 'Launched platform and processed first $1M in loans' },
  { year: '2023', event: 'Expanded to business lenders nationwide' },
  { year: '2024', event: 'Reached 10,000 users and $5M in facilitated loans' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
      <Navbar />

      {/* Hero */}
      <section className="relative py-20 bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-6 bg-white/20 text-white border-0">
            About Feyza
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Making Lending
            <span className="block text-green-200">Human Again</span>
          </h1>
          <p className="text-xl text-green-100 max-w-3xl mx-auto mb-8">
            We're on a mission to create a fairer, more accessible financial system where anyone can borrow or lend money with confidence.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Our Mission
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-6">
                Democratizing Access to Capital
              </h2>
              <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-6">
                Traditional lending is broken. Credit scores don't tell the whole story, and millions of people are locked out of fair financial services.
              </p>
              <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
                Feyza is different. We connect people directly—borrowers with lenders who understand their needs. Our reputation-based system rewards responsible behavior, creating opportunities for everyone to build their financial future.
              </p>
              <div className="flex flex-wrap gap-4">
                {['No credit score required', 'Build your reputation', 'Transparent terms'].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-neutral-700 dark:text-neutral-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, i) => (
                <div key={i} className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-neutral-600 dark:text-neutral-400 text-sm">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Our Values
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              What We Stand For
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              These principles guide everything we do at Feyza.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, i) => {
              const Icon = value.icon;
              return (
                <div key={i} className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700 text-center">
                  <div className="w-14 h-14 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-7 h-7 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                    {value.title}
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Our Team
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Meet the People Behind Feyza
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              We're a diverse team of finance, technology, and design experts united by a common goal.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, i) => (
              <div key={i} className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">{member.image}</span>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {member.name}
                </h3>
                <p className="text-green-600 dark:text-green-400 text-sm mb-2">
                  {member.role}
                </p>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
                  {member.bio}
                </p>
                <div className="flex justify-center gap-3">
                  <a href="#" className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a href="#" className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                    <Twitter className="w-5 h-5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Our Journey
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Key Milestones
            </h2>
          </div>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-green-200 dark:bg-green-800" />
            <div className="space-y-8">
              {milestones.map((milestone, i) => (
                <div key={i} className="relative flex gap-6">
                  <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 z-10">
                    <span className="text-white font-bold text-sm">{milestone.year}</span>
                  </div>
                  <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 flex-1">
                    <p className="text-neutral-900 dark:text-white font-medium">
                      {milestone.event}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl p-12 text-center text-white">
            <Award className="w-16 h-16 mx-auto mb-6 opacity-90" />
            <h2 className="text-3xl font-bold mb-4">Join Our Mission</h2>
            <p className="text-green-100 mb-8 text-lg max-w-2xl mx-auto">
              Whether you're looking to borrow, lend, or join our team—we'd love to have you be part of the Feyza community.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/auth/signup">
                <Button size="lg" className="bg-white text-green-700 hover:bg-green-50">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Contact Us
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
