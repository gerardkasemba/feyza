'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Badge } from '@/components/ui';
import { Shield, Calendar, Lock, Eye, Database, Users } from 'lucide-react';

export default function PrivacyPage() {
  const lastUpdated = 'February 15, 2026';

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
      <Navbar />

      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
            Your privacy and data security are our top priorities
          </p>
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
            
            {/* Introduction */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
              <p className="text-blue-900 dark:text-blue-300 m-0 font-medium">
                At Feyza, we are committed to protecting your privacy and maintaining the security of your personal and financial information. This Privacy Policy explains how we collect, use, share, and protect your data when you use our peer-to-peer lending platform.
              </p>
            </div>

            {/* Table of Contents */}
            <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mt-0 mb-4">Quick Navigation</h3>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <a href="#information-collect" className="text-blue-600 dark:text-blue-400 hover:underline">1. Information We Collect</a>
                <a href="#how-we-use" className="text-blue-600 dark:text-blue-400 hover:underline">2. How We Use Your Information</a>
                <a href="#information-sharing" className="text-blue-600 dark:text-blue-400 hover:underline">3. Information Sharing</a>
                <a href="#data-security" className="text-blue-600 dark:text-blue-400 hover:underline">4. Data Security</a>
                <a href="#your-rights" className="text-blue-600 dark:text-blue-400 hover:underline">5. Your Rights</a>
                <a href="#cookies" className="text-blue-600 dark:text-blue-400 hover:underline">6. Cookies and Tracking</a>
                <a href="#retention" className="text-blue-600 dark:text-blue-400 hover:underline">7. Data Retention</a>
                <a href="#international" className="text-blue-600 dark:text-blue-400 hover:underline">8. International Transfers</a>
                <a href="#childrens-privacy" className="text-blue-600 dark:text-blue-400 hover:underline">9. Children's Privacy</a>
                <a href="#changes" className="text-blue-600 dark:text-blue-400 hover:underline">10. Policy Changes</a>
                <a href="#contact" className="text-blue-600 dark:text-blue-400 hover:underline">11. Contact Us</a>
              </div>
            </div>

            {/* 1. Information We Collect */}
            <h2 id="information-collect" className="text-2xl font-bold text-neutral-900 dark:text-white mt-12 mb-4 flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-600" />
              1. Information We Collect
            </h2>
            
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">1.1 Personal Information</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              When you create an account or use our services, we collect:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li><strong>Identity Information:</strong> Full name, date of birth, email address, phone number, physical address</li>
              <li><strong>Identification Documents:</strong> Government-issued ID, Social Security Number (or tax ID), proof of address</li>
              <li><strong>Profile Information:</strong> Profile photo, bio, borrowing or lending preferences</li>
              <li><strong>Business Information</strong> (for business lenders): Business name, type, registration documents, EIN, business address, authorized representatives</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">1.2 Financial Information</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              To facilitate lending and payments, we collect:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li><strong>Banking Information:</strong> Bank account details, routing numbers (collected securely through Plaid)</li>
              <li><strong>Payment Methods:</strong> PayPal, Venmo, Cash App, Zelle account information for manual payments</li>
              <li><strong>Transaction Data:</strong> Loan amounts, repayment history, payment dates and amounts, interest rates</li>
              <li><strong>Credit Information:</strong> Credit history, income verification, employment status (when provided)</li>
              <li><strong>Capital Management</strong> (for lenders): Capital pool amounts, reserved capital, lending preferences</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">1.3 Platform Activity Data</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We track your activity on Feyza to improve services and prevent fraud:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li><strong>Loan Activity:</strong> Loan requests, applications, approvals, cancellations, repayment schedules</li>
              <li><strong>Trust Score Data:</strong> Payment history, on-time payments, defaults, loan completions, trust score events</li>
              <li><strong>Borrowing Tier:</strong> Current tier, tier progression, loans completed at each tier</li>
              <li><strong>Matching Data:</strong> Auto-match settings, loan preferences, match notifications sent/received</li>
              <li><strong>Vouching Activity:</strong> Vouches given, vouches received, vouch outcomes</li>
              <li><strong>Social Connections:</strong> Trust network, friend connections within platform</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">1.4 Technical Information</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We automatically collect technical data:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li><strong>Device Information:</strong> IP address, browser type and version, device type, operating system</li>
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent, click patterns, session duration</li>
              <li><strong>Location Data:</strong> General location based on IP address (for fraud prevention)</li>
              <li><strong>Communication Data:</strong> Messages between borrowers and lenders, support tickets, feedback</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">1.5 Information from Third Parties</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We may receive information about you from:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li><strong>Identity Verification Services:</strong> To verify your identity and prevent fraud</li>
              <li><strong>Credit Bureaus:</strong> To assess creditworthiness (with your consent)</li>
              <li><strong>Payment Processors:</strong> Plaid (bank verification), Dwolla (payment processing), PayPal, Venmo, etc.</li>
              <li><strong>Social Media:</strong> If you connect your social accounts or share profile information</li>
              <li><strong>Other Users:</strong> Vouches, reviews, or references from other platform users</li>
            </ul>

            {/* 2. How We Use Your Information */}
            <h2 id="how-we-use" className="text-2xl font-bold text-neutral-900 dark:text-white mt-12 mb-4 flex items-center gap-2">
              <Eye className="w-6 h-6 text-blue-600" />
              2. How We Use Your Information
            </h2>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We use your information for the following purposes:
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">2.1 Platform Services</h3>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Create and manage your account</li>
              <li>Process loan requests and applications</li>
              <li>Match borrowers with suitable lenders using our auto-matching algorithm</li>
              <li>Facilitate loan agreements and payment schedules</li>
              <li>Process payments and transfers (via Dwolla, Plaid, or manual payment methods)</li>
              <li>Calculate and update trust scores based on payment history</li>
              <li>Manage borrowing tier progression and lending limits</li>
              <li>Process vouches and maintain trust networks</li>
              <li>Manage capital pools for business lenders</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">2.2 Security and Fraud Prevention</h3>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Verify your identity and prevent impersonation</li>
              <li>Detect and prevent fraudulent activities</li>
              <li>Monitor for suspicious transactions or behavior</li>
              <li>Investigate and resolve disputes</li>
              <li>Enforce our Terms of Service and prevent violations</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">2.3 Communication</h3>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Send transactional notifications (payment due dates, loan status updates)</li>
              <li>Notify you of new loan matches when auto-matching is enabled</li>
              <li>Send trust score updates and tier progression notifications</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Send important platform updates and security alerts</li>
              <li>Send marketing communications (with your consent; you can opt-out)</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">2.4 Platform Improvement</h3>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Analyze usage patterns to improve user experience</li>
              <li>Develop new features and services</li>
              <li>Improve auto-matching algorithms and success rates</li>
              <li>Optimize trust score calculations</li>
              <li>Generate aggregate analytics and statistics</li>
              <li>Conduct research and analysis on lending trends</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">2.5 Legal and Regulatory Compliance</h3>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Comply with applicable laws, regulations, and legal processes</li>
              <li>Respond to government requests and law enforcement</li>
              <li>Maintain records for audit and compliance purposes</li>
              <li>Prevent money laundering and terrorist financing</li>
              <li>Report suspicious activities as required by law</li>
            </ul>

            {/* 3. Information Sharing */}
            <h2 id="information-sharing" className="text-2xl font-bold text-neutral-900 dark:text-white mt-12 mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              3. Information Sharing and Disclosure
            </h2>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We share your information only in the following circumstances:
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">3.1 With Other Users</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              <strong>With Lenders:</strong> When you apply for a loan, lenders can see:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Your name and profile information</li>
              <li>Your trust score and borrowing tier</li>
              <li>Loan purpose and amount requested</li>
              <li>General location (country/state, not exact address)</li>
              <li>Payment history summary (not detailed transaction data)</li>
              <li>Vouches you've received from other users</li>
            </ul>

            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              <strong>With Borrowers:</strong> When you lend money, borrowers can see:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Your name or business name</li>
              <li>Lending terms and preferences</li>
              <li>Payment methods you accept (PayPal, Venmo, Zelle, etc.)</li>
              <li>Your lender profile and history (for transparency)</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">3.2 With Service Providers</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We work with trusted third-party service providers:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li><strong>Plaid:</strong> For secure bank account verification</li>
              <li><strong>Dwolla:</strong> For automated payment processing (ACH transfers)</li>
              <li><strong>Payment Platforms:</strong> PayPal, Venmo, Cash App, Zelle for manual payments</li>
              <li><strong>Identity Verification:</strong> Services to verify your identity and prevent fraud</li>
              <li><strong>Cloud Hosting:</strong> Supabase, AWS, or similar providers for data storage</li>
              <li><strong>Email Services:</strong> For transactional and marketing communications</li>
              <li><strong>Analytics:</strong> To understand platform usage (anonymized data only)</li>
              <li><strong>Customer Support:</strong> Tools to manage support tickets and communications</li>
            </ul>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4 italic">
              All service providers are contractually obligated to protect your data and use it only for specified purposes.
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">3.3 For Legal Reasons</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We may disclose your information when required by law or when necessary to:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Comply with legal obligations, court orders, or government requests</li>
              <li>Investigate potential violations of our Terms of Service</li>
              <li>Protect the rights, property, or safety of Feyza, our users, or the public</li>
              <li>Prevent fraud, security breaches, or other illegal activities</li>
              <li>Respond to claims of illegal content or policy violations</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">3.4 Business Transfers</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              If Feyza is involved in a merger, acquisition, sale of assets, or bankruptcy, your information may be transferred to the new entity. We will notify you of any such change and the choices you have regarding your data.
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">3.5 With Your Consent</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We may share your information for other purposes with your explicit consent.
            </p>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 my-6">
              <p className="text-green-900 dark:text-green-300 m-0 font-medium">
                <strong>Important:</strong> We never sell your personal information to third parties for marketing purposes.
              </p>
            </div>

            {/* 4. Data Security */}
            <h2 id="data-security" className="text-2xl font-bold text-neutral-900 dark:text-white mt-12 mb-4 flex items-center gap-2">
              <Lock className="w-6 h-6 text-blue-600" />
              4. Data Security
            </h2>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We implement comprehensive security measures to protect your data:
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">4.1 Technical Safeguards</h3>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li><strong>Encryption:</strong> 256-bit SSL/TLS encryption for all data transmitted between your device and our servers</li>
              <li><strong>Data Encryption at Rest:</strong> Sensitive data (bank accounts, payment methods, SSNs) encrypted in our database</li>
              <li><strong>Secure Hosting:</strong> Data stored on secure, SOC 2 compliant cloud infrastructure</li>
              <li><strong>Firewall Protection:</strong> Network security to prevent unauthorized access</li>
              <li><strong>Regular Security Audits:</strong> Independent security assessments and penetration testing</li>
              <li><strong>Vulnerability Monitoring:</strong> Continuous monitoring for security threats</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">4.2 Access Controls</h3>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li><strong>Limited Access:</strong> Only authorized personnel can access user data, on a need-to-know basis</li>
              <li><strong>Multi-Factor Authentication:</strong> Required for all employee accounts</li>
              <li><strong>Activity Logging:</strong> All data access is logged and monitored</li>
              <li><strong>Background Checks:</strong> Employees with data access undergo background checks</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">4.3 Account Security</h3>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li><strong>Strong Passwords:</strong> Password requirements enforce security best practices</li>
              <li><strong>Optional 2FA:</strong> Two-factor authentication available for added security</li>
              <li><strong>Session Management:</strong> Automatic logout after inactivity</li>
              <li><strong>Suspicious Activity Alerts:</strong> Notifications for unusual account activity</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">4.4 Payment Security</h3>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li><strong>PCI Compliance:</strong> Payment processing follows PCI-DSS standards</li>
              <li><strong>Tokenization:</strong> Bank account details tokenized and never stored in plain text</li>
              <li><strong>Secure APIs:</strong> Integration with payment providers using encrypted, authenticated connections</li>
            </ul>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 my-6">
              <p className="text-amber-900 dark:text-amber-300 m-0">
                <strong>Your Responsibility:</strong> While we implement strong security measures, you must also protect your account by keeping your password confidential, enabling two-factor authentication, and not sharing your login credentials with anyone.
              </p>
            </div>

            {/* 5. Your Rights */}
            <h2 id="your-rights" className="text-2xl font-bold text-neutral-900 dark:text-white mt-12 mb-4">5. Your Privacy Rights</h2>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              You have the following rights regarding your personal data:
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">5.1 Access and Portability</h3>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Request a copy of all personal data we hold about you</li>
              <li>Export your data in a portable, machine-readable format (CSV, JSON)</li>
              <li>View your account data, loan history, and trust score details through your dashboard</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">5.2 Correction and Update</h3>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Update your profile information, contact details, and preferences at any time</li>
              <li>Request correction of inaccurate or incomplete data</li>
              <li>Update payment methods and banking information</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">5.3 Deletion</h3>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Request deletion of your account and associated data</li>
              <li>Delete specific data points (e.g., remove old addresses)</li>
            </ul>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4 text-sm italic">
              Note: We may retain certain information as required by law (tax records, loan agreements) or for legitimate business purposes (fraud prevention, dispute resolution). Financial transaction records are typically retained for 7 years for tax and regulatory compliance.
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">5.4 Object and Restrict</h3>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Object to processing of your data for marketing purposes</li>
              <li>Opt-out of non-essential communications</li>
              <li>Restrict processing for specific purposes (subject to legal obligations)</li>
              <li>Disable auto-matching features at any time</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">5.5 Marketing Communications</h3>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Opt-out of marketing emails via unsubscribe link in each email</li>
              <li>Manage notification preferences in your account settings</li>
              <li>You will still receive essential service notifications (payment reminders, security alerts)</li>
            </ul>

            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              <strong>To exercise your rights,</strong> contact us at{' '}
              <a href="mailto:privacy@feyza.app" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@feyza.app</a> or through your account settings.
            </p>

            {/* 6. Cookies */}
            <h2 id="cookies" className="text-2xl font-bold text-neutral-900 dark:text-white mt-12 mb-4">6. Cookies and Similar Technologies</h2>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We use cookies, web beacons, and similar tracking technologies to enhance your experience:
            </p>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">6.1 Types of Cookies We Use</h3>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li><strong>Essential Cookies:</strong> Required for login, security, and core platform functionality (cannot be disabled)</li>
              <li><strong>Functional Cookies:</strong> Remember your preferences, language settings, and customizations</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how you use Feyza to improve the platform (anonymized data)</li>
              <li><strong>Security Cookies:</strong> Detect fraudulent activity and protect your account</li>
            </ul>

            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mt-6 mb-3">6.2 Managing Cookies</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              You can control cookies through:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Your browser settings (most browsers allow you to block or delete cookies)</li>
              <li>Our cookie preference center (available in account settings)</li>
              <li>Opting out of analytics cookies (essential cookies will remain active)</li>
            </ul>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4 text-sm italic">
              Note: Disabling certain cookies may limit platform functionality.
            </p>

            {/* 7. Data Retention */}
            <h2 id="retention" className="text-2xl font-bold text-neutral-900 dark:text-white mt-12 mb-4">7. Data Retention</h2>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We retain your data for different periods based on data type and legal requirements:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li><strong>Active Account Data:</strong> Retained while your account is active</li>
              <li><strong>Loan Records:</strong> Retained for 7 years after loan completion (tax and regulatory requirements)</li>
              <li><strong>Payment Transactions:</strong> Retained for 7 years (financial regulations)</li>
              <li><strong>Trust Score History:</strong> Retained for 3 years after account closure (for reference purposes)</li>
              <li><strong>Support Communications:</strong> Retained for 2 years (customer service improvement)</li>
              <li><strong>Marketing Data:</strong> Deleted upon opt-out or account deletion</li>
              <li><strong>Security Logs:</strong> Retained for 1 year (fraud prevention and security)</li>
            </ul>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              After the retention period, data is securely deleted or anonymized. Some aggregate, anonymized data may be retained indefinitely for analytics and research.
            </p>

            {/* 8. International Transfers */}
            <h2 id="international" className="text-2xl font-bold text-neutral-900 dark:text-white mt-12 mb-4">8. International Data Transfers</h2>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Feyza is based in the United States. If you access our platform from outside the US, your data may be transferred to, stored, and processed in the United States and other countries where our service providers operate.
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We ensure appropriate safeguards are in place for international transfers:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>Standard contractual clauses approved by regulatory authorities</li>
              <li>Compliance with applicable data protection laws (GDPR, CCPA, etc.)</li>
              <li>Service providers certified under recognized privacy frameworks</li>
            </ul>

            {/* 9. Children's Privacy */}
            <h2 id="childrens-privacy" className="text-2xl font-bold text-neutral-900 dark:text-white mt-12 mb-4">9. Children's Privacy</h2>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Feyza is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If you are under 18, do not use Feyza or provide any personal information.
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              If we discover that we have collected information from a child under 18, we will delete that information immediately. If you believe we may have information from or about a child, please contact us at{' '}
              <a href="mailto:privacy@feyza.app" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@feyza.app</a>.
            </p>

            {/* 10. Changes to This Policy */}
            <h2 id="changes" className="text-2xl font-bold text-neutral-900 dark:text-white mt-12 mb-4">10. Changes to This Privacy Policy</h2>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors.
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              When we make significant changes:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mb-4">
              <li>We will update the "Last Updated" date at the top of this policy</li>
              <li>We will notify you via email or prominent notice on the platform</li>
              <li>For material changes, we may require you to review and accept the updated policy</li>
            </ul>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Continued use of Feyza after changes indicates your acceptance of the updated policy. We encourage you to review this policy periodically.
            </p>

            {/* 11. Contact Us */}
            <h2 id="contact" className="text-2xl font-bold text-neutral-900 dark:text-white mt-12 mb-4">11. Contact Information</h2>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
            </p>
            
            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-6 mb-8">
              <p className="text-neutral-900 dark:text-white font-semibold mb-4">Feyza Privacy Team</p>
              <div className="space-y-2 text-neutral-600 dark:text-neutral-400">
                <p className="flex items-start gap-2">
                  <span className="font-medium min-w-[80px]">Email:</span>
                  <a href="mailto:privacy@feyza.app" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@feyza.app</a>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-medium min-w-[80px]">Support:</span>
                  <a href="mailto:support@feyza.app" className="text-blue-600 dark:text-blue-400 hover:underline">support@feyza.app</a>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-medium min-w-[80px]">Mail:</span>
                  <span>Feyza, Inc.<br />123 Finance Street<br />New York, NY 10001<br />United States</span>
                </p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mt-8">
              <p className="text-blue-900 dark:text-blue-300 m-0">
                <strong>Response Time:</strong> We typically respond to privacy requests within 30 days. For urgent matters regarding unauthorized account access or data breaches, contact us immediately at{' '}
                <a href="mailto:security@feyza.app" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">security@feyza.app</a>.
              </p>
            </div>

            {/* Footer Link */}
            <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800 text-center">
              <p className="text-neutral-600 dark:text-neutral-400">
                Read our{' '}
                <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Terms of Service
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
