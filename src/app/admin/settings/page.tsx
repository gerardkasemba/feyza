'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('admin_page');

import React, { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS } from '@/hooks/platformSettings';
import {
  Settings,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Mail,
  Bell,
  Shield,
  Globe,
  Database,
  Zap,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface SettingGroup {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
  settings: SettingConfig[];
}

interface SettingConfig {
  key: string;
  label: string;
  description: string;
  type: 'boolean' | 'number' | 'string' | 'select';
  options?: { value: string; label: string }[];
}

const settingGroups: SettingGroup[] = [
  {
    key: 'email',
    label: 'Email Settings',
    icon: Mail,
    description: 'Configure outgoing email notifications',
    settings: [
      { key: 'email_notifications_enabled', label: 'Email Notifications', description: 'Enable email notifications for all users', type: 'boolean' },
      { key: 'email_from_name', label: 'From Name', description: 'Sender name for outgoing emails', type: 'string' },
      { key: 'email_from_address', label: 'From Address', description: 'Sender email address', type: 'string' },
    ],
  },
  {
    key: 'reminders',
    label: 'Payment Reminders',
    icon: Bell,
    description: 'Configure payment reminder notifications',
    settings: [
      { key: 'reminder_enabled', label: 'Reminders Enabled', description: 'Send payment reminders to borrowers', type: 'boolean' },
      { key: 'reminder_days_before', label: 'Days Before', description: 'Days before due date to send reminder', type: 'number' },
      { key: 'overdue_reminder_frequency', label: 'Overdue Frequency', description: 'How often to remind about overdue payments', type: 'select', options: [
        { value: 'daily', label: 'Daily' },
        { value: 'every_3_days', label: 'Every 3 days' },
        { value: 'weekly', label: 'Weekly' },
      ]},
    ],
  },
  {
    key: 'security',
    label: 'Security',
    icon: Shield,
    description: 'Configure security and authentication settings',
    settings: [
      { key: 'max_login_attempts', label: 'Max Login Attempts', description: 'Lock account after this many failed attempts', type: 'number' },
      { key: 'session_timeout_hours', label: 'Session Timeout (hours)', description: 'Auto logout after inactivity', type: 'number' },
      { key: 'require_email_verification', label: 'Require Email Verification', description: 'New users must verify email', type: 'boolean' },
    ],
  },
  {
    key: 'platform',
    label: 'Platform',
    icon: Globe,
    description: 'Configure platform-wide settings',
    settings: [
      { key: 'maintenance_mode', label: 'Maintenance Mode', description: 'Disable platform access for non-admins', type: 'boolean' },
      { key: 'allow_new_registrations', label: 'Allow Registrations', description: 'Allow new user registrations', type: 'boolean' },
      { key: 'allow_business_registrations', label: 'Allow Business Signups', description: 'Allow new business lender registrations', type: 'boolean' },
    ],
  },
  {
    key: 'loans',
    label: 'Loan Settings',
    icon: Database,
    description: 'Configure loan limits and behavior',
    settings: [
      { key: 'max_active_loans_per_user', label: 'Max Active Loans', description: 'Maximum concurrent loans per borrower', type: 'number' },
      { key: 'min_days_between_loans', label: 'Days Between Loans', description: 'Minimum days between loan requests', type: 'number' },
      { key: 'auto_matching_enabled', label: 'Auto Matching', description: 'Automatically match loans with lenders', type: 'boolean' },
      { key: 'default_loan_currency', label: 'Default Currency', description: 'Default currency for new loans', type: 'select', options: [
        { value: 'USD', label: 'USD ($)' },
        { value: 'GBP', label: 'GBP (£)' },
        { value: 'EUR', label: 'EUR (€)' },
        { value: 'CAD', label: 'CAD (C$)' },
      ]},
    ],
  },
  {
    key: 'payments',
    label: 'Payment Settings',
    icon: Zap,
    description: 'Configure payment processing and retry behavior',
    settings: [
      { key: 'auto_pay_enabled', label: 'Auto-Pay', description: 'Enable automatic payment processing', type: 'boolean' },
      { key: 'payment_retry_max_attempts', label: 'Max Retry Attempts', description: 'Retries before blocking borrower', type: 'number' },
      { key: 'payment_retry_interval_hours', label: 'Retry Interval (hours)', description: 'Hours between payment retries', type: 'number' },
      { key: 'restriction_period_days', label: 'Restriction Period (days)', description: 'Days borrower is blocked after default', type: 'number' },
    ],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({ ...DEFAULT_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (data.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      }
    } catch (err) {
      log.error('Error fetching settings:', err);
    }
    setLoading(false);
    setHasChanges(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, value: unknown) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Use API endpoint to save settings
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSaved(true);
      setHasChanges(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      log.error('Error saving settings:', err);
      alert((err as Error).message || 'Failed to save settings. The platform_settings table may not exist. Please run the migration first.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-48" />
          <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <Settings className="w-7 h-7 text-emerald-500" />
            Settings
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Configure platform settings and behavior
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSettings}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium text-neutral-700 dark:text-neutral-200"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              saved
                ? 'bg-emerald-500 text-white'
                : hasChanges
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed'
            } disabled:opacity-50`}
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
              You have unsaved changes. Click "Save Changes" to apply them.
            </p>
          </div>
        </div>
      )}

      {/* Settings Groups */}
      <div className="space-y-6">
        {settingGroups.map((group) => (
          <div
            key={group.key}
            className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
          >
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                  <group.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {group.label}
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {group.description}
                  </p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {group.settings.map((setting) => (
                <div key={setting.key} className="p-4 flex items-center justify-between">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-neutral-900 dark:text-white">{setting.label}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{setting.description}</p>
                  </div>
                  <div className="shrink-0">
                    {setting.type === 'boolean' && (
                      <button
                        onClick={() => handleChange(setting.key, !settings[setting.key])}
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                      >
                        {settings[setting.key] ? (
                          <ToggleRight className="w-10 h-10 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-10 h-10" />
                        )}
                      </button>
                    )}
                    {setting.type === 'number' && (
                      <input
                        type="number"
                        value={settings[setting.key] ?? ''}
                        onChange={(e) => handleChange(setting.key, Number(e.target.value))}
                        className="w-24 px-3 py-2 text-right bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
                      />
                    )}
                    {setting.type === 'string' && (
                      <input
                        type="text"
                        value={settings[setting.key] ?? ''}
                        onChange={(e) => handleChange(setting.key, e.target.value)}
                        className="w-48 px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
                      />
                    )}
                    {setting.type === 'select' && setting.options && (
                      <select
                        value={settings[setting.key] ?? ''}
                        onChange={(e) => handleChange(setting.key, e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
                      >
                        {setting.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Warning */}
      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">Important</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Changes to these settings take effect immediately after saving. Be careful when modifying
              payment and security settings as they can affect active users and transactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
