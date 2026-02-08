'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Badge } from '@/components/ui';
import { Shield, Calendar } from 'lucide-react';

export default function PrivacyPage() {
  const lastUpdated = 'January 15, 2024';

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
      <Navbar />

      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            Privacy Policy
          </h1>
          <div className="flex items-center justify-center gap-2 text-neutral-600 dark:text-neutral-400">
            <Calendar className="w-4 h-4" />
            <span>Last updated: {lastUpdated}</span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-8">
              <p className="text-green-800 dark:text-green-300 m-0">
                At Feyza, we take your privacy seriously. This policy explains how we collect, use, and protect your personal information.
              </p>
            </div>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">1. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">Personal Information</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              When you create an account, we collect:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Full name and email address</li>
              <li>Phone number (optional)</li>
              <li>Physical address</li>
              <li>Date of birth (for identity verification)</li>
              <li>Government-issued ID (for verification purposes)</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">Financial Information</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              To facilitate loans and payments, we collect:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Bank account information (through Plaid)</li>
              <li>Transaction history related to loans</li>
              <li>Payment history and amounts</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">Usage Information</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We automatically collect:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>IP address and device information</li>
              <li>Browser type and version</li>
              <li>Pages visited and features used</li>
              <li>Time and date of access</li>
            </ul>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">2. How We Use Your Information</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We use your information to:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Create and manage your account</li>
              <li>Process loan requests and payments</li>
              <li>Match borrowers with appropriate lenders</li>
              <li>Verify your identity and prevent fraud</li>
              <li>Send important notifications about your loans</li>
              <li>Improve our services and user experience</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">3. Information Sharing</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We may share your information with:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li><strong>Lenders/Borrowers:</strong> Limited information necessary to facilitate loans</li>
              <li><strong>Service Providers:</strong> Companies that help us operate (Plaid, Dwolla, etc.)</li>
              <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
            </ul>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We never sell your personal information to third parties.
            </p>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">4. Data Security</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We implement industry-standard security measures:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>256-bit SSL encryption for all data transmission</li>
              <li>Encrypted storage for sensitive data</li>
              <li>Regular security audits and penetration testing</li>
              <li>Multi-factor authentication options</li>
              <li>Strict access controls for employee data access</li>
            </ul>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">5. Your Rights</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data (subject to legal requirements)</li>
              <li>Opt-out of marketing communications</li>
              <li>Export your data in a portable format</li>
            </ul>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">6. Cookies and Tracking</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Keep you logged in</li>
              <li>Remember your preferences</li>
              <li>Analyze site usage and performance</li>
              <li>Prevent fraud</li>
            </ul>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              You can control cookies through your browser settings, but some features may not work properly without them.
            </p>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">7. Data Retention</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We retain your information for as long as your account is active or as needed to provide services. We may retain certain information for legal, regulatory, or business purposes even after account closure.
            </p>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">8. Children's Privacy</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Feyza is not intended for users under 18 years of age. We do not knowingly collect information from children.
            </p>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">9. Changes to This Policy</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We may update this privacy policy from time to time. We'll notify you of significant changes via email or through the platform. Continued use after changes constitutes acceptance of the updated policy.
            </p>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">10. Contact Us</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              If you have questions about this privacy policy or your data, contact us at:
            </p>
            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-6">
              <p className="text-neutral-900 dark:text-white font-medium mb-2">Feyza Privacy Team</p>
              <p className="text-neutral-600 dark:text-neutral-400">
                Email: privacy@feyza.app<br />
                Address: 123 Finance St, New York, NY 10001
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
