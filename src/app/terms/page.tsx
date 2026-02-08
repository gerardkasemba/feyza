'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { FileText, Calendar } from 'lucide-react';

export default function TermsPage() {
  const lastUpdated = 'January 15, 2024';

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
      <Navbar />

      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            Terms of Service
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
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-8">
              <p className="text-amber-800 dark:text-amber-300 m-0">
                By using Feyza, you agree to these terms. Please read them carefully before creating an account or using our services.
              </p>
            </div>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              By accessing or using Feyza's platform, website, or services, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you may not use our services.
            </p>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">2. Eligibility</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              To use Feyza, you must:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Be at least 18 years of age</li>
              <li>Have a valid bank account in a supported country</li>
              <li>Provide accurate and complete registration information</li>
              <li>Not be prohibited from using financial services under applicable law</li>
            </ul>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">3. Account Responsibilities</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
              <li>Keeping your account information accurate and up-to-date</li>
            </ul>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">4. Platform Services</h2>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">4.1 For Borrowers</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              As a borrower, you agree to:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Provide truthful information in loan requests</li>
              <li>Repay loans according to agreed-upon terms</li>
              <li>Maintain sufficient funds for scheduled payments</li>
              <li>Communicate promptly if you cannot make a payment</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">4.2 For Lenders</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              As a lender, you agree to:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Comply with all applicable lending laws and regulations</li>
              <li>Provide accurate information about your lending terms</li>
              <li>Fund approved loans within the specified timeframe</li>
              <li>Not engage in predatory lending practices</li>
            </ul>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">5. Fees and Payments</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              <strong>Borrowers:</strong> Using Feyza is free for borrowers. You are only responsible for repaying the loan amount plus any interest agreed upon with your lender.
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              <strong>Lenders:</strong> Feyza charges a platform fee of 2.9% on each repayment received. This fee is automatically deducted from payments before they are deposited to your account.
            </p>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">6. Loan Agreements</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Feyza facilitates connections between borrowers and lenders but is not a party to any loan agreement. The terms of each loan, including interest rates, repayment schedules, and consequences of default, are between the borrower and lender.
            </p>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">7. Prohibited Activities</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              You may not use Feyza to:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Engage in fraud, money laundering, or other illegal activities</li>
              <li>Misrepresent your identity or provide false information</li>
              <li>Interfere with the platform's operation or security</li>
              <li>Harass, threaten, or harm other users</li>
              <li>Use automated systems to access the platform without permission</li>
              <li>Circumvent any rate limits or security measures</li>
            </ul>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">8. Intellectual Property</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Feyza and its content, features, and functionality are owned by Feyza and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our written permission.
            </p>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Feyza is provided "as is" without warranties of any kind. We do not guarantee:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>That borrowers will repay their loans</li>
              <li>That lenders will fund approved requests</li>
              <li>Uninterrupted or error-free service</li>
              <li>The accuracy of information provided by other users</li>
            </ul>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">10. Limitation of Liability</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              To the maximum extent permitted by law, Feyza shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or other intangible losses resulting from:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Your use or inability to use the service</li>
              <li>Any conduct or content of other users</li>
              <li>Unauthorized access to your account or data</li>
              <li>Default on loans by borrowers</li>
            </ul>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">11. Indemnification</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              You agree to indemnify and hold harmless Feyza, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the platform or violation of these terms.
            </p>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">12. Account Termination</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We may suspend or terminate your account at any time for violations of these terms or for any other reason. You may close your account at any time, subject to any outstanding loan obligations.
            </p>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">13. Dispute Resolution</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Any disputes arising from these terms or your use of Feyza shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. You agree to waive your right to participate in class actions.
            </p>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">14. Governing Law</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              These terms shall be governed by the laws of the State of Delaware, without regard to conflict of law principles.
            </p>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">15. Changes to Terms</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We may modify these terms at any time. We'll notify you of material changes via email or through the platform. Continued use after changes constitutes acceptance of the updated terms.
            </p>

            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4">16. Contact</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              If you have questions about these terms, contact us at:
            </p>
            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-6">
              <p className="text-neutral-900 dark:text-white font-medium mb-2">Feyza Legal Team</p>
              <p className="text-neutral-600 dark:text-neutral-400">
                Email: legal@feyza.app<br />
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
