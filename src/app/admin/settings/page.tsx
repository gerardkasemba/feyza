'use client';

import React, { useState } from 'react';
import {
  Settings,
  Globe,
  Bell,
  Shield,
  Database,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [testingCron, setTestingCron] = useState(false);
  const [cronResult, setCronResult] = useState<{ success: boolean; message: string } | null>(null);

  const testPaymentReminders = async () => {
    setTestingCron(true);
    setCronResult(null);

    try {
      const response = await fetch('/api/cron/payment-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setCronResult({
          success: true,
          message: `Sent ${data.remindersSent || 0} reminders, ${data.overdueRemindersSent || 0} overdue notifications`,
        });
      } else {
        setCronResult({
          success: false,
          message: data.error || 'Failed to run payment reminders',
        });
      }
    } catch (error) {
      setCronResult({
        success: false,
        message: 'Network error',
      });
    } finally {
      setTestingCron(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="text-neutral-500">Platform configuration and tools</p>
      </div>

      <div className="grid gap-6">
        {/* Cron Jobs */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-xl">
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-neutral-900">Scheduled Jobs</h2>
              <p className="text-sm text-neutral-500">Manage automated tasks</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
              <div>
                <p className="font-medium text-neutral-900">Payment Reminders</p>
                <p className="text-sm text-neutral-500">
                  Send reminders for upcoming and overdue payments
                </p>
              </div>
              <button
                onClick={testPaymentReminders}
                disabled={testingCron}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2"
              >
                {testingCron ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  'Run Now'
                )}
              </button>
            </div>

            {cronResult && (
              <div className={`p-4 rounded-xl flex items-center gap-3 ${
                cronResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {cronResult.success ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                {cronResult.message}
              </div>
            )}
          </div>
        </div>

        {/* Platform Settings */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Settings className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-neutral-900">Platform Settings</h2>
              <p className="text-sm text-neutral-500">Configure platform behavior</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-neutral-50 rounded-xl">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-neutral-900">Maintenance Mode</p>
                  <p className="text-sm text-neutral-500">
                    Disable user access during maintenance
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
            </div>

            <div className="p-4 bg-neutral-50 rounded-xl">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-neutral-900">New User Registration</p>
                  <p className="text-sm text-neutral-500">
                    Allow new users to sign up
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
            </div>

            <div className="p-4 bg-neutral-50 rounded-xl">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-neutral-900">Business Registration</p>
                  <p className="text-sm text-neutral-500">
                    Allow new business lender applications
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-100 rounded-xl">
              <Bell className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-neutral-900">Email Settings</h2>
              <p className="text-sm text-neutral-500">Configure email notifications</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-neutral-50 rounded-xl">
              <p className="font-medium text-neutral-900 mb-2">Email Provider</p>
              <p className="text-sm text-neutral-500 mb-3">
                Current: <span className="font-mono bg-neutral-200 px-2 py-0.5 rounded">Resend</span>
              </p>
              <div className="text-sm text-neutral-600">
                <p>• Payment reminders: Enabled</p>
                <p>• Loan notifications: Enabled</p>
                <p>• Welcome emails: Enabled</p>
              </div>
            </div>
          </div>
        </div>

        {/* Database Info */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Database className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-neutral-900">Database</h2>
              <p className="text-sm text-neutral-500">Database information</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-neutral-50 rounded-xl">
              <p className="font-medium text-neutral-900 mb-2">Provider</p>
              <p className="text-sm text-neutral-500">
                <span className="font-mono bg-neutral-200 px-2 py-0.5 rounded">Supabase (PostgreSQL)</span>
              </p>
            </div>

            <div className="p-4 bg-neutral-50 rounded-xl">
              <p className="font-medium text-neutral-900 mb-2">Connection Status</p>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* API Info */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-100 rounded-xl">
              <Globe className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-semibold text-neutral-900">API Endpoints</h2>
              <p className="text-sm text-neutral-500">Available API routes</p>
            </div>
          </div>

          <div className="space-y-2 font-mono text-sm">
            <p className="p-2 bg-neutral-50 rounded">POST /api/cron/payment-reminders</p>
            <p className="p-2 bg-neutral-50 rounded">POST /api/loans/create</p>
            <p className="p-2 bg-neutral-50 rounded">POST /api/payments/create</p>
            <p className="p-2 bg-neutral-50 rounded">POST /api/matching</p>
            <p className="p-2 bg-neutral-50 rounded">POST /api/loans/[id]/remind</p>
          </div>
        </div>
      </div>
    </div>
  );
}
