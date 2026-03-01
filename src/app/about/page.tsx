'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Button, Badge } from '@/components/ui';
import {
  Users,
  Shield,
  FileText,
  Zap,
  Heart,
  Globe,
  Target,
  ArrowRight,
  CheckCircle,
  Linkedin,
  MapPin,
  Award,
} from 'lucide-react';

const team = [
  {
    name: 'Gerard Kasemba',
    role: 'Co-Founder, Developer & CEO',
    links: [
      { href: 'https://www.linkedin.com/in/gerard-kasemba-9374a367/', label: 'LinkedIn', icon: Linkedin },
      { href: 'https://x.com/MzeeGerard', label: 'X', icon: null },
    ],
  },
  {
    name: 'Dorcas Sami',
    role: 'Co-Founder & CFO',
    links: [
      { href: 'https://www.linkedin.com/in/dorcas-sami-829229309/', label: 'LinkedIn', icon: Linkedin },
    ],
  },
];

const differentPoints = [
  {
    icon: Users,
    title: 'Community-Based Trust',
    description: 'Instead of relying only on traditional credit scores, Feyza introduces a trust model: vouching systems, reputation tiers, behavioral scoring, and transparent repayment history. Trust is earned, visible, and measurable.',
  },
  {
    icon: Globe,
    title: 'Diaspora-Backed Micro-Lending',
    description: 'We enable structured lending between diaspora supporters, African entrepreneurs, and community members—with proper documentation, repayment tracking, and accountability.',
  },
  {
    icon: FileText,
    title: 'Structured & Transparent Agreements',
    description: 'Every loan on Feyza includes clear terms, repayment schedule, defined interest, and a digital agreement. No confusion. No hidden rules.',
  },
  {
    icon: Zap,
    title: 'Technology with Purpose',
    description: 'We integrate secure payment rails, bank connections, mobile money support (where applicable), and automated repayment tracking. Our goal is not just to move money—but to build financial dignity.',
  },
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
          <h1 className="text-7xl md:text-7xl lg:text-6xl font-bold text-white mb-6">
            Community-Powered Lending
            <span className="block text-green-200">Built on Trust</span>
          </h1>
          <p className="text-xl text-green-100 max-w-3xl mx-auto">
            Feyza is a community-powered lending platform built on trust, accountability, and real human relationships.
          </p>
          <p className="text-lg text-green-200/90 max-w-3xl mx-auto mt-4">
            We believe access to capital should not depend solely on a credit score, paperwork, or geography. Around the world—especially across Africa and the diaspora—trust has always been currency. Feyza turns that trust into a structured, transparent financial system.
          </p>
        </div>
      </section>

      {/* Why We Exist */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="mb-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Why We Exist
          </Badge>
          <h2 className="text-3xl md:text-7xl font-bold text-neutral-900 dark:text-white mb-6">
            Bridging the Gap
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-300 mb-6">
            Millions of entrepreneurs and individuals have strong character, strong communities, and strong ideas—but limited access to traditional banking.
          </p>
          <p className="text-lg text-neutral-600 dark:text-neutral-300 mb-6">
            At the same time, members of the diaspora want to support businesses and people back home, but lack:
          </p>
          <ul className="space-y-2 text-lg text-neutral-600 dark:text-neutral-300 mb-8">
            {['Transparency', 'Security', 'Structured repayment systems', 'Legal clarity'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xl font-medium text-neutral-900 dark:text-white">
            Feyza bridges that gap.
          </p>
          <p className="text-lg text-neutral-600 dark:text-neutral-300 mt-4">
            We combine technology, community validation, and structured agreements to make lending safer, smarter, and more human.
          </p>
        </div>
      </section>

      {/* What Makes Feyza Different */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              What Makes Us Different
            </Badge>
            <h2 className="text-3xl md:text-7xl font-bold text-neutral-900 dark:text-white mb-4">
              What Makes Feyza Different
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {differentPoints.map((point, i) => {
              const Icon = point.icon;
              return (
                <div
                  key={i}
                  className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                        {i + 1}. {point.title}
                      </h3>
                      <p className="text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed">
                        {point.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <Badge className="mb-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Our Vision
              </Badge>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
                Where We&apos;re Headed
              </h2>
              <p className="text-neutral-600 dark:text-neutral-300 mb-4">
                We envision a future where:
              </p>
              <ul className="space-y-2 text-neutral-600 dark:text-neutral-300">
                {[
                  'A young entrepreneur in Kinshasa can raise capital from Boston.',
                  'A lender in New York can confidently support a business in Nairobi.',
                  'Trust becomes transferable.',
                  'Reputation becomes an asset.',
                  'Community becomes financial infrastructure.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-neutral-600 dark:text-neutral-300 mt-6 italic">
                Feyza is not just another fintech platform. It is a step toward rebuilding financial systems around relationships, accountability, and shared growth.
              </p>
            </div>
            <div>
              <Badge className="mb-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Our Mission
              </Badge>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
                Why We Build
              </h2>
              <ul className="space-y-3 text-lg text-neutral-600 dark:text-neutral-300">
                <li className="flex items-start gap-2">
                  <Target className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  To unlock capital through trust.
                </li>
                <li className="flex items-start gap-2">
                  <Heart className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  To empower entrepreneurs through community.
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  To create financial systems that are human before they are institutional.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Our Team
            </Badge>
            <h2 className="text-3xl md:text-7xl font-bold text-neutral-900 dark:text-white mb-4">
              Two People. One Mission.
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300">
              There are only two people working on Feyza—and we&apos;re just getting started.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {team.map((member) => (
              <div
                key={member.name}
                className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700"
              >
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  {member.name}
                </h3>
                <p className="text-green-600 dark:text-green-400 text-sm mb-4">
                  {member.role}
                </p>
                <div className="flex flex-wrap gap-3">
                  {member.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-green-600 dark:hover:text-green-400"
                    >
                      {link.icon ? <link.icon className="w-4 h-4" /> : null}
                      {link.label === 'X' ? (
                        <span className="font-mono">X</span>
                      ) : (
                        link.label
                      )}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder's Story - Gerard */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="mb-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Founder&apos;s Story
          </Badge>
          <h2 className="text-3xl md:text-7xl font-bold text-neutral-900 dark:text-white mb-2">
            Gerard B. Kasemba
          </h2>
          <p className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-sm mb-8">
            <MapPin className="w-4 h-4" />
            Kongolo, Katanga   Democratic Republic of Congo
          </p>
          <div className="prose prose-neutral dark:prose-invert prose-lg max-w-none">
            <p className="text-neutral-600 dark:text-neutral-300 mb-6">
              I was born in Kongolo, in the great Katanga region of the Democratic Republic of Congo.
            </p>
            <p className="text-neutral-600 dark:text-neutral-300 mb-6">
              As a child, I experienced loss early—I lost someone who meant the world to me. That kind of loss changes how you see life. It forces you to grow faster. It forces you to understand responsibility before you are ready.
            </p>
            <p className="text-neutral-600 dark:text-neutral-300 mb-6">
              I watched my mother raise us with relentless strength. She worked hard—harder than anyone I knew. But even with all her effort, she did not have the support system she deserved. She did not lack character. She did not lack discipline. She lacked access. She lacked structure. She lacked opportunity.
            </p>
            <p className="text-neutral-600 dark:text-neutral-300 mb-6">
              That stayed with me.
            </p>
            <p className="text-neutral-600 dark:text-neutral-300 mb-6">
              At 15 years old, I moved to the United States. To me, America was not just a new country—it was a responsibility. I understood that this opportunity was not something to take lightly. It was something to use.
            </p>
            <p className="text-neutral-600 dark:text-neutral-300 mb-6">
              Not only to build a life for myself.
              <br />
              Not only to contribute to America.
              <br />
              But to build bridges back home to Congo, and to Africa as a whole.
            </p>
            <p className="text-neutral-600 dark:text-neutral-300 mb-6">
              I have always believed that opportunity is meaningless if it ends with you.
            </p>
            <p className="text-neutral-600 dark:text-neutral-300 mb-6">
              The difference between struggle and progress is often not talent—it is access. Access to capital. Access to systems. Access to structured support.
            </p>
            <p className="text-neutral-600 dark:text-neutral-300 mb-6">
              My journey has been about learning how systems work—technology systems, financial systems, institutional systems and asking one question:
            </p>
            <p className="text-neutral-600 dark:text-neutral-300 mb-6 font-medium">
              How can these systems serve the people I grew up watching struggle?
            </p>
            <p className="text-neutral-600 dark:text-neutral-300 mb-6">
              Feyza is part of that answer.
            </p>
            <p className="text-neutral-600 dark:text-neutral-300 mb-6">
              It is my attempt to build structured trust. To create systems that protect relationships. To connect diaspora strength with African ambition. To turn opportunity into infrastructure.
            </p>
            <p className="text-neutral-900 dark:text-white font-medium">
              I come from Kongolo.
              <br />
              I was raised by resilience.
              <br />
              And I am building for something bigger than myself.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl p-12 text-center text-white">
            <Award className="w-16 h-16 mx-auto mb-6 opacity-90" />
            <h2 className="text-3xl font-bold mb-4">Join Our Mission</h2>
            <p className="text-green-100 mb-8 text-lg max-w-2xl mx-auto">
              Whether you&apos;re looking to borrow, lend, or join our community—we&apos;d love to have you be part of Feyza.
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
