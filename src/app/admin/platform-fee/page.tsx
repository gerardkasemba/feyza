'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '@/components/ui';
import { 
  DollarSign, 
  Percent, 
  Save, 
  AlertCircle, 
  CheckCircle,
  RefreshCw,
  Settings,
  Calculator,
  HelpCircle,
  Info,
  ArrowLeft,
  Wallet,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface PlatformFeeSettings {
  enabled: boolean;
  type: 'fixed' | 'percentage';
  fixed_amount: number;
  percentage: number;
  min_fee: number;
  max_fee: number;
  fee_label: string;
  fee_description: string;
}

type TabType = 'settings' | 'calculator' | 'help';

export default function AdminPlatformFeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [settings, setSettings] = useState<PlatformFeeSettings>({
    enabled: true,
    type: 'fixed',
    fixed_amount: 1.50,
    percentage: 2.5,
    min_fee: 0.50,
    max_fee: 25.00,
    fee_label: 'Feyza Service Fee',
    fee_description: 'Platform processing fee',
  });

  // Test calculation
  const [testAmount, setTestAmount] = useState('50');

  useEffect(() => {
    async function checkAdminAndFetch() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);

      try {
        const res = await fetch('/api/admin/platform-fee');
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }

      setLoading(false);
    }

    checkAdminAndFetch();
  }, [router]);

  // Calculate fee
  const calculateFee = (amount: number) => {
    if (!settings.enabled || amount <= 0) {
      return { platformFee: 0, netAmount: amount };
    }

    let fee: number;
    if (settings.type === 'fixed') {
      fee = settings.fixed_amount;
    } else {
      fee = amount * (settings.percentage / 100);
      if (settings.min_fee && fee < settings.min_fee) fee = settings.min_fee;
      if (settings.max_fee && fee > settings.max_fee) fee = settings.max_fee;
    }

    fee = Math.round(fee * 100) / 100;
    return {
      platformFee: fee,
      netAmount: Math.round((amount - fee) * 100) / 100,
    };
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/platform-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        if (data.settings) setSettings(data.settings);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabs = [
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
    { id: 'calculator' as TabType, label: 'Calculator', icon: Calculator },
    { id: 'help' as TabType, label: 'Help', icon: HelpCircle },
  ];

  const testCalc = calculateFee(parseFloat(testAmount) || 0);

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          {/* <Link 
            href="/admin" 
            className="inline-flex items-center text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Admin
          </Link> */}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                <Wallet className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                  Platform Fees
                </h1>
                <p className="text-sm text-neutral-500">
                  Manage transaction fees
                </p>
              </div>
            </div>
            
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge variant={settings.enabled ? 'success' : 'default'}>
                {settings.enabled ? 'Active' : 'Off'}
              </Badge>
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {settings.type === 'fixed' 
                  ? `$${settings.fixed_amount.toFixed(2)}`
                  : `${settings.percentage}%`
                }
              </span>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <>
              {/* Enable Toggle */}
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-neutral-900 dark:text-white">
                      Enable Platform Fee
                    </h3>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      Charge fees on loan repayments
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer dark:bg-neutral-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </Card>

              {/* Fee Type Selection */}
              <Card className="p-4">
                <h3 className="font-medium text-neutral-900 dark:text-white mb-3">
                  Fee Type
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, type: 'fixed' })}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      settings.type === 'fixed'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className={`w-4 h-4 ${
                        settings.type === 'fixed' ? 'text-primary-600' : 'text-neutral-400'
                      }`} />
                      <span className={`font-medium text-sm ${
                        settings.type === 'fixed' ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300'
                      }`}>
                        Fixed Amount
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">Same fee every time</p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, type: 'percentage' })}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      settings.type === 'percentage'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Percent className={`w-4 h-4 ${
                        settings.type === 'percentage' ? 'text-primary-600' : 'text-neutral-400'
                      }`} />
                      <span className={`font-medium text-sm ${
                        settings.type === 'percentage' ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300'
                      }`}>
                        Percentage
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">Scales with amount</p>
                  </button>
                </div>
              </Card>

              {/* Fee Amount */}
              <Card className="p-4">
                <h3 className="font-medium text-neutral-900 dark:text-white mb-3">
                  {settings.type === 'fixed' ? 'Fee Amount' : 'Percentage & Limits'}
                </h3>
                
                {settings.type === 'fixed' ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.fixed_amount}
                      onChange={(e) => setSettings({ ...settings, fixed_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-lg font-medium"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={settings.percentage}
                        onChange={(e) => setSettings({ ...settings, percentage: parseFloat(e.target.value) || 0 })}
                        className="w-full pr-10 pl-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-lg font-medium"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">%</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">Min Fee</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={settings.min_fee}
                            onChange={(e) => setSettings({ ...settings, min_fee: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-7 pr-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">Max Fee</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={settings.max_fee}
                            onChange={(e) => setSettings({ ...settings, max_fee: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-7 pr-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Labels */}
              <Card className="p-4">
                <h3 className="font-medium text-neutral-900 dark:text-white mb-3">
                  Display Labels
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Fee Name</label>
                    <input
                      type="text"
                      value={settings.fee_label}
                      onChange={(e) => setSettings({ ...settings, fee_label: e.target.value })}
                      placeholder="e.g., Feyza Service Fee"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Description (tooltip)</label>
                    <input
                      type="text"
                      value={settings.fee_description}
                      onChange={(e) => setSettings({ ...settings, fee_description: e.target.value })}
                      placeholder="e.g., Platform processing fee"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
              </Card>

              {/* Save Button */}
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}

          {/* Calculator Tab */}
          {activeTab === 'calculator' && (
            <Card className="p-5">
              <h3 className="font-medium text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary-600" />
                Fee Calculator
              </h3>
              
              <div className="mb-5">
                <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                  Enter payment amount to test
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-lg font-medium">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xl font-semibold"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {parseFloat(testAmount) > 0 && (
                <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600 dark:text-neutral-400">Payment Amount</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      ${parseFloat(testAmount).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600 dark:text-neutral-400">{settings.fee_label}</span>
                    <span className="font-semibold text-orange-600">
                      -${testCalc.platformFee.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">
                        Lender Receives
                      </span>
                      <span className="text-xl font-bold text-green-600">
                        ${testCalc.netAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick test amounts */}
              <div className="mt-4">
                <p className="text-xs text-neutral-500 mb-2">Quick test amounts:</p>
                <div className="flex flex-wrap gap-2">
                  {['25', '50', '100', '250', '500', '1000'].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setTestAmount(amt)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        testAmount === amt
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Help Tab */}
          {activeTab === 'help' && (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg h-fit">
                    <Info className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-neutral-900 dark:text-white mb-1">
                      How Platform Fees Work
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Fees are charged on loan <strong>repayments only</strong>. 
                      When a borrower makes a payment, the fee is automatically deducted 
                      and kept in Feyza's Master Account.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-medium text-neutral-900 dark:text-white mb-3">
                  Fee Types Explained
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <DollarSign className="w-5 h-5 text-primary-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-neutral-900 dark:text-white">Fixed Amount</p>
                      <p className="text-xs text-neutral-500">
                        Same fee charged regardless of payment size. Best for consistent pricing.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <Percent className="w-5 h-5 text-primary-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-neutral-900 dark:text-white">Percentage</p>
                      <p className="text-xs text-neutral-500">
                        Fee scales with payment amount. Use min/max to set bounds.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-medium text-neutral-900 dark:text-white mb-3">
                  Example Flow
                </h3>
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-medium text-blue-600">1</div>
                    <span className="text-neutral-600 dark:text-neutral-400">Borrower pays <strong>$50.00</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xs font-medium text-orange-600">2</div>
                    <span className="text-neutral-600 dark:text-neutral-400">Feyza keeps <strong>$1.50</strong> fee</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xs font-medium text-green-600">3</div>
                    <span className="text-neutral-600 dark:text-neutral-400">Lender receives <strong>$48.50</strong></span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">
                      Important Notes
                    </p>
                    <ul className="text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
                      <li>Disbursements (lender → borrower) are free</li>
                      <li>Changes apply to new transactions only</li>
                      <li>Fees accumulate in your Dwolla balance</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
