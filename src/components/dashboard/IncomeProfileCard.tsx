'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { 
  Wallet, ChevronDown, ChevronUp, Edit2, Save, X, 
  DollarSign, Home, Car, Zap, Phone, Loader2,
  TrendingUp, PiggyBank, AlertCircle, CheckCircle,
  HelpCircle
} from 'lucide-react';

interface FinancialProfile {
  pay_frequency: string;
  pay_amount: number;
  pay_day_of_week?: number;
  pay_day_of_month?: number;
  second_pay_day_of_month?: number;
  rent_mortgage: number;
  utilities: number;
  transportation: number;
  insurance: number;
  groceries: number;
  phone: number;
  subscriptions: number;
  childcare: number;
  other_bills: number;
  existing_debt_payments: number;
  monthly_income: number;
  monthly_expenses: number;
  disposable_income: number;
  comfort_level: string;
  is_complete: boolean;
}

const PAY_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'semimonthly', label: 'Twice a Month' },
  { value: 'monthly', label: 'Monthly' },
];

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

export function IncomeProfileCard() {
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [featureAvailable, setFeatureAvailable] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    pay_frequency: 'biweekly',
    pay_amount: '',
    pay_day_of_week: '5',
    pay_day_of_month: '1',
    second_pay_day_of_month: '15',
    rent_mortgage: '',
    utilities: '',
    transportation: '',
    insurance: '',
    groceries: '',
    phone: '',
    subscriptions: '',
    childcare: '',
    other_bills: '',
    existing_debt_payments: '',
    comfort_level: 'balanced',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/financial-profile');
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setProfile(data);
          setFormData({
            pay_frequency: data.pay_frequency || 'biweekly',
            pay_amount: data.pay_amount?.toString() || '',
            pay_day_of_week: data.pay_day_of_week?.toString() || '5',
            pay_day_of_month: data.pay_day_of_month?.toString() || '1',
            second_pay_day_of_month: data.second_pay_day_of_month?.toString() || '15',
            rent_mortgage: data.rent_mortgage?.toString() || '',
            utilities: data.utilities?.toString() || '',
            transportation: data.transportation?.toString() || '',
            insurance: data.insurance?.toString() || '',
            groceries: data.groceries?.toString() || '',
            phone: data.phone?.toString() || '',
            subscriptions: data.subscriptions?.toString() || '',
            childcare: data.childcare?.toString() || '',
            other_bills: data.other_bills?.toString() || '',
            existing_debt_payments: data.existing_debt_payments?.toString() || '',
            comfort_level: data.comfort_level || 'balanced',
          });
        }
      } else if (response.status === 503) {
        // Feature not available (table doesn't exist)
        setFeatureAvailable(false);
      }
    } catch (err) {
      console.error('Failed to fetch financial profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate pay amount
    if (!formData.pay_amount || parseFloat(formData.pay_amount) <= 0) {
      setError('Please enter your pay amount');
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await fetch('/api/financial-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }
      
      setProfile(data);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
    if (profile) {
      setFormData({
        pay_frequency: profile.pay_frequency || 'biweekly',
        pay_amount: profile.pay_amount?.toString() || '',
        pay_day_of_week: profile.pay_day_of_week?.toString() || '5',
        pay_day_of_month: profile.pay_day_of_month?.toString() || '1',
        second_pay_day_of_month: profile.second_pay_day_of_month?.toString() || '15',
        rent_mortgage: profile.rent_mortgage?.toString() || '',
        utilities: profile.utilities?.toString() || '',
        transportation: profile.transportation?.toString() || '',
        insurance: profile.insurance?.toString() || '',
        groceries: profile.groceries?.toString() || '',
        phone: profile.phone?.toString() || '',
        subscriptions: profile.subscriptions?.toString() || '',
        childcare: profile.childcare?.toString() || '',
        other_bills: profile.other_bills?.toString() || '',
        existing_debt_payments: profile.existing_debt_payments?.toString() || '',
        comfort_level: profile.comfort_level || 'balanced',
      });
    }
  };

  const getFrequencyLabel = (freq: string) => {
    return PAY_FREQUENCIES.find(f => f.value === freq)?.label || freq;
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
        </div>
      </Card>
    );
  }

  // Feature not available yet (migration not run)
  if (!featureAvailable) {
    return (
      <Card className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900/20 dark:to-neutral-800/20 border-neutral-200 dark:border-neutral-700">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center flex-shrink-0">
            <Wallet className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-neutral-600 dark:text-neutral-400">Smart Repayments</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">
              Coming soon! Get personalized loan repayment suggestions based on your income.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // No profile yet - show setup prompt
  if (!profile) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Wallet className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-orange-900 dark:text-orange-100">Set Up Smart Repayments</h3>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
              Tell us about your income to get personalized loan repayment suggestions.
            </p>
          </div>
        </div>
        
        <Button 
          onClick={() => { setEditing(true); setExpanded(true); }}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        >
          <PiggyBank className="w-4 h-4 mr-2" />
          Set Up Income Profile
        </Button>
        
        {editing && expanded && renderEditForm()}
      </Card>
    );
  }

  // Has profile - show summary with expand option
  return (
    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="font-semibold text-orange-900 dark:text-orange-100">Income Profile</h3>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              {getFrequencyLabel(profile.pay_frequency)} • {formatCurrency(profile.pay_amount)}/paycheck
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowHelp(!showHelp)}
          className="p-1 text-orange-500 hover:text-orange-700 dark:hover:text-orange-300"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Help tooltip */}
      {showHelp && (
        <div className="mb-3 p-3 bg-white dark:bg-neutral-800 rounded-lg text-xs text-neutral-600 dark:text-neutral-400">
          Your income profile helps us suggest loan repayments that fit your budget. 
          We calculate how much you can comfortably afford after your regular bills.
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="mb-3 p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400">
          <CheckCircle className="w-4 h-4" />
          Profile updated!
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white dark:bg-neutral-800/50 rounded-lg p-2 text-center">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Monthly Income</p>
          <p className="font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(profile.monthly_income)}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-800/50 rounded-lg p-2 text-center">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Bills</p>
          <p className="font-semibold text-red-500 dark:text-red-400">
            {formatCurrency(profile.monthly_expenses)}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-800/50 rounded-lg p-2 text-center">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Disposable</p>
          <p className="font-semibold text-amber-600 dark:text-amber-400">
            {formatCurrency(profile.disposable_income)}
          </p>
        </div>
      </div>

      {/* Expand/Edit buttons */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setExpanded(!expanded)}
          className="flex-1 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300"
        >
          {expanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
          {expanded ? 'Hide Details' : 'Show Details'}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => { setEditing(true); setExpanded(true); }}
          className="border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Expanded Details */}
      {expanded && !editing && (
        <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-800 space-y-3">
          <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200">Monthly Expenses</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {profile.rent_mortgage > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                  <Home className="w-3 h-3" /> Rent/Mortgage
                </span>
                <span className="text-neutral-900 dark:text-white">{formatCurrency(profile.rent_mortgage)}</span>
              </div>
            )}
            {profile.utilities > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Utilities
                </span>
                <span className="text-neutral-900 dark:text-white">{formatCurrency(profile.utilities)}</span>
              </div>
            )}
            {profile.transportation > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                  <Car className="w-3 h-3" /> Transportation
                </span>
                <span className="text-neutral-900 dark:text-white">{formatCurrency(profile.transportation)}</span>
              </div>
            )}
            {profile.phone > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone
                </span>
                <span className="text-neutral-900 dark:text-white">{formatCurrency(profile.phone)}</span>
              </div>
            )}
            {profile.groceries > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Groceries</span>
                <span className="text-neutral-900 dark:text-white">{formatCurrency(profile.groceries)}</span>
              </div>
            )}
            {profile.insurance > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Insurance</span>
                <span className="text-neutral-900 dark:text-white">{formatCurrency(profile.insurance)}</span>
              </div>
            )}
            {profile.subscriptions > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Subscriptions</span>
                <span className="text-neutral-900 dark:text-white">{formatCurrency(profile.subscriptions)}</span>
              </div>
            )}
            {profile.childcare > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Childcare</span>
                <span className="text-neutral-900 dark:text-white">{formatCurrency(profile.childcare)}</span>
              </div>
            )}
            {profile.other_bills > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Other Bills</span>
                <span className="text-neutral-900 dark:text-white">{formatCurrency(profile.other_bills)}</span>
              </div>
            )}
            {profile.existing_debt_payments > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Other Debt</span>
                <span className="text-neutral-900 dark:text-white">{formatCurrency(profile.existing_debt_payments)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Form */}
      {expanded && editing && renderEditForm()}
    </Card>
  );

  function renderEditForm() {
    return (
      <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-800 space-y-4">
        {error && (
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Income Section */}
        <div>
          <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Income
          </h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">How often are you paid?</label>
                <Select
                  options={PAY_FREQUENCIES}
                  value={formData.pay_frequency}
                  onChange={(e) => setFormData({ ...formData, pay_frequency: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Pay per paycheck (after taxes)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.pay_amount}
                  onChange={(e) => setFormData({ ...formData, pay_amount: e.target.value })}
                  className="pl-6"
                />
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              </div>
            </div>
            
            {/* Pay day based on frequency */}
            {(formData.pay_frequency === 'weekly' || formData.pay_frequency === 'biweekly') && (
              <div>
                <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">What day do you get paid?</label>
                <Select
                  options={DAYS_OF_WEEK}
                  value={formData.pay_day_of_week}
                  onChange={(e) => setFormData({ ...formData, pay_day_of_week: e.target.value })}
                />
              </div>
            )}
            
            {formData.pay_frequency === 'monthly' && (
              <div>
                <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Day of month you get paid</label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="1"
                  value={formData.pay_day_of_month}
                  onChange={(e) => setFormData({ ...formData, pay_day_of_month: e.target.value })}
                />
              </div>
            )}
            
            {formData.pay_frequency === 'semimonthly' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">First pay day</label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="1"
                    value={formData.pay_day_of_month}
                    onChange={(e) => setFormData({ ...formData, pay_day_of_month: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Second pay day</label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="15"
                    value={formData.second_pay_day_of_month}
                    onChange={(e) => setFormData({ ...formData, second_pay_day_of_month: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Expenses Section */}
        <div>
          <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-3 flex items-center gap-2">
            <Home className="w-4 h-4" />
            Monthly Expenses
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Rent/Mortgage</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.rent_mortgage}
                onChange={(e) => setFormData({ ...formData, rent_mortgage: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Utilities</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.utilities}
                onChange={(e) => setFormData({ ...formData, utilities: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Transportation</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.transportation}
                onChange={(e) => setFormData({ ...formData, transportation: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Groceries</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.groceries}
                onChange={(e) => setFormData({ ...formData, groceries: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Insurance</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.insurance}
                onChange={(e) => setFormData({ ...formData, insurance: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Phone</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Subscriptions</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.subscriptions}
                onChange={(e) => setFormData({ ...formData, subscriptions: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Childcare</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.childcare}
                onChange={(e) => setFormData({ ...formData, childcare: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Other Bills</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.other_bills}
                onChange={(e) => setFormData({ ...formData, other_bills: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">Other Loan Payments</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.existing_debt_payments}
                onChange={(e) => setFormData({ ...formData, existing_debt_payments: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={handleSave} 
            loading={saving}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Profile
          </Button>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-300"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }
}