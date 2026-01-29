'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import {
  Percent,
  Save,
  RefreshCw,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  History,
  Calculator,
  Edit,
  X,
  Hash,
  Layers,
} from 'lucide-react';

interface FeeConfig {
  id: string;
  fee_type: string;
  fee_name: string;
  fee_mode: 'percentage' | 'flat' | 'combined';
  fee_percentage: number;
  flat_fee: number;
  min_fee: number;
  max_fee: number | null;
  applies_to: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FeeHistory {
  id: string;
  fee_type: string;
  old_mode: string;
  new_mode: string;
  old_percentage: number;
  new_percentage: number;
  old_flat_fee: number;
  new_flat_fee: number;
  changed_at: string;
}

// Default fee configurations for when table doesn't exist
const defaultFees: FeeConfig[] = [
  { id: 'default-1', fee_type: 'platform_fee', fee_name: 'Platform Fee', fee_mode: 'percentage', fee_percentage: 2.5, flat_fee: 0, min_fee: 0.50, max_fee: null, applies_to: 'disbursement', description: 'Fee charged on loan disbursement', is_active: true, created_at: '', updated_at: '' },
  { id: 'default-2', fee_type: 'late_fee', fee_name: 'Late Payment Fee', fee_mode: 'percentage', fee_percentage: 5.0, flat_fee: 0, min_fee: 1.00, max_fee: 25.00, applies_to: 'late_payment', description: 'Fee charged when payment is overdue', is_active: true, created_at: '', updated_at: '' },
  { id: 'default-3', fee_type: 'processing_fee', fee_name: 'Processing Fee', fee_mode: 'flat', fee_percentage: 0, flat_fee: 1.50, min_fee: 0, max_fee: 5.00, applies_to: 'all_transactions', description: 'Fixed fee per transaction', is_active: false, created_at: '', updated_at: '' },
];

export default function PlatformFeePage() {
  const [feeConfigs, setFeeConfigs] = useState<FeeConfig[]>([]);
  const [feeHistory, setFeeHistory] = useState<FeeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [editingFee, setEditingFee] = useState<FeeConfig | null>(null);
  const [calcAmount, setCalcAmount] = useState(500);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);

    try {
      // Fetch fee configs
      const { data: configs, error } = await supabase
        .from('fee_configurations')
        .select('*')
        .order('fee_type', { ascending: true });

      if (error) {
        console.error('Error fetching fees:', error);
        setFeeConfigs(defaultFees);
      } else if (configs && configs.length > 0) {
        setFeeConfigs(configs);
      } else {
        setFeeConfigs(defaultFees);
      }

      // Fetch fee history
      const { data: history } = await supabase
        .from('fee_change_history')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(10);
      setFeeHistory(history || []);

      // Calculate total revenue
      const { data: transfers } = await supabase
        .from('transfers')
        .select('platform_fee')
        .eq('status', 'completed');
      const revenue = (transfers || []).reduce((sum, t) => sum + (t.platform_fee || 0), 0);
      setTotalRevenue(revenue);
    } catch (err) {
      console.error('Error fetching data:', err);
      setFeeConfigs(defaultFees);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveFee = async () => {
    if (!editingFee) return;
    
    if (editingFee.id.startsWith('default-')) {
      alert('Cannot modify default fees. Please run the migration first to create the fee_configurations table.');
      return;
    }

    setSaving(editingFee.id);
    try {
      // Get current fee for history
      const currentFee = feeConfigs.find(f => f.id === editingFee.id);
      
      const { error } = await supabase
        .from('fee_configurations')
        .update({ 
          fee_mode: editingFee.fee_mode,
          fee_percentage: editingFee.fee_percentage,
          flat_fee: editingFee.flat_fee,
          min_fee: editingFee.min_fee,
          max_fee: editingFee.max_fee,
          is_active: editingFee.is_active,
        })
        .eq('id', editingFee.id);

      if (error) throw error;

      // Also update the platform_settings table to keep in sync and clear server cache
      // This ensures the API returns fresh data
      if (editingFee.fee_type === 'platform_fee') {
        await fetch('/api/admin/platform-fee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: editingFee.is_active,
            type: editingFee.fee_mode === 'flat' ? 'fixed' : editingFee.fee_mode,
            fixed_amount: editingFee.flat_fee,
            percentage: editingFee.fee_percentage,
            min_fee: editingFee.min_fee,
            max_fee: editingFee.max_fee,
            fee_label: editingFee.fee_name,
            fee_description: editingFee.description,
          }),
        });
      }

      // Log history (ignore if table doesn't exist or fails)
      if (currentFee) {
        try {
          await supabase.from('fee_change_history').insert({
            fee_id: editingFee.id,
            fee_type: editingFee.fee_type,
            old_mode: currentFee.fee_mode,
            new_mode: editingFee.fee_mode,
            old_percentage: currentFee.fee_percentage,
            new_percentage: editingFee.fee_percentage,
            old_flat_fee: currentFee.flat_fee,
            new_flat_fee: editingFee.flat_fee,
          });
        } catch (historyErr) {
          // Ignore if history logging fails
          console.log('Fee history logging skipped:', historyErr);
        }
      }

      await fetchData();
      setEditingFee(null);
    } catch (err) {
      console.error('Error saving fee:', err);
      alert('Failed to save fee configuration');
    }
    setSaving(null);
  };

  const toggleFeeActive = async (fee: FeeConfig) => {
    if (fee.id.startsWith('default-')) {
      alert('Cannot modify default fees. Please run the migration first.');
      return;
    }

    try {
      await supabase
        .from('fee_configurations')
        .update({ is_active: !fee.is_active })
        .eq('id', fee.id);
      await fetchData();
    } catch (err) {
      console.error('Error toggling fee:', err);
    }
  };

  const calculateFee = (amount: number, fee: FeeConfig) => {
    let calculated = 0;
    
    if (fee.fee_mode === 'flat') {
      calculated = fee.flat_fee || 0;
    } else if (fee.fee_mode === 'combined') {
      calculated = (amount * (fee.fee_percentage || 0) / 100) + (fee.flat_fee || 0);
    } else {
      // percentage mode
      calculated = amount * (fee.fee_percentage || 0) / 100;
    }
    
    if (fee.min_fee && calculated < fee.min_fee) calculated = fee.min_fee;
    if (fee.max_fee && calculated > fee.max_fee) calculated = fee.max_fee;
    
    return calculated;
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'flat': return <DollarSign className="w-4 h-4" />;
      case 'combined': return <Layers className="w-4 h-4" />;
      default: return <Percent className="w-4 h-4" />;
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'flat': return 'Fixed Amount';
      case 'combined': return 'Percentage + Fixed';
      default: return 'Percentage';
    }
  };

  const formatFeeDisplay = (fee: FeeConfig) => {
    switch (fee.fee_mode) {
      case 'flat':
        return formatCurrency(fee.flat_fee || 0);
      case 'combined':
        return `${fee.fee_percentage}% + ${formatCurrency(fee.flat_fee || 0)}`;
      default:
        return `${fee.fee_percentage}%`;
    }
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
            <Percent className="w-7 h-7 text-emerald-500" />
            Platform Fees
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Configure fee types, modes (percentage, fixed, or combined), and limits
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium text-neutral-700 dark:text-neutral-200"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Total Revenue</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
              <Percent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Active Platform Fee</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white">
            {formatFeeDisplay(feeConfigs.find(f => f.fee_type === 'platform_fee') || defaultFees[0])}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Fee Configurations</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900 dark:text-white">
            {feeConfigs.filter(f => f.is_active).length} / {feeConfigs.length}
          </p>
        </div>
      </div>

      {/* Fee Configurations */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Fee Configurations</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Click on a fee to edit its mode, rate, and limits
          </p>
        </div>
        <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
          {feeConfigs.map((fee) => (
            <div key={fee.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${
                    fee.is_active 
                      ? 'bg-emerald-100 dark:bg-emerald-500/20' 
                      : 'bg-neutral-100 dark:bg-neutral-700'
                  }`}>
                    {getModeIcon(fee.fee_mode)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      {fee.fee_name}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {fee.description || `Applies to: ${fee.applies_to.replace(/_/g, ' ')}`}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        fee.fee_mode === 'percentage' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' :
                        fee.fee_mode === 'flat' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                        'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                      }`}>
                        {getModeIcon(fee.fee_mode)}
                        {getModeLabel(fee.fee_mode)}
                      </span>
                      {fee.min_fee > 0 && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          Min: {formatCurrency(fee.min_fee)}
                        </span>
                      )}
                      {fee.max_fee && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          Max: {formatCurrency(fee.max_fee)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                      {formatFeeDisplay(fee)}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      On {formatCurrency(500)}: {formatCurrency(calculateFee(500, fee))}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingFee({...fee})}
                      className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => toggleFeeActive(fee)}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                        fee.is_active
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/30'
                          : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                      }`}
                    >
                      {fee.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fee Calculator */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Fee Calculator
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Loan Amount
          </label>
          <input
            type="number"
            value={calcAmount}
            onChange={(e) => setCalcAmount(Number(e.target.value))}
            className="w-full max-w-xs px-4 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {feeConfigs.filter(f => f.is_active).map((fee) => {
            const calculatedFee = calculateFee(calcAmount, fee);
            return (
              <div key={fee.id} className="p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{fee.fee_name}</p>
                <p className="text-xl font-bold text-neutral-900 dark:text-white">
                  {formatCurrency(calculatedFee)}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {formatFeeDisplay(fee)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fee History */}
      {feeHistory.length > 0 && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent Changes
          </h2>
          <div className="space-y-3">
            {feeHistory.map((change) => (
              <div key={change.id} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white capitalize">
                    {change.fee_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {change.old_mode} → {change.new_mode}
                    {change.old_percentage !== change.new_percentage && (
                      <span className="ml-2">{change.old_percentage}% → {change.new_percentage}%</span>
                    )}
                    {change.old_flat_fee !== change.new_flat_fee && (
                      <span className="ml-2">{formatCurrency(change.old_flat_fee)} → {formatCurrency(change.new_flat_fee)}</span>
                    )}
                  </p>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {new Date(change.changed_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">Fee Modes Explained</p>
            <ul className="text-sm text-blue-700 dark:text-blue-400 mt-2 space-y-1">
              <li><strong>Percentage:</strong> Fee = Amount × Rate% (e.g., $500 × 2.5% = $12.50)</li>
              <li><strong>Fixed Amount:</strong> Fee = Fixed Rate (e.g., always $1.50)</li>
              <li><strong>Combined:</strong> Fee = (Amount × Rate%) + Fixed (e.g., $500 × 1% + $0.50 = $5.50)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingFee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  Edit {editingFee.fee_name}
                </h2>
                <button
                  onClick={() => setEditingFee(null)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Fee Mode */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Fee Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['percentage', 'flat', 'combined'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setEditingFee({...editingFee, fee_mode: mode})}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                        editingFee.fee_mode === mode
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                      }`}
                    >
                      {getModeIcon(mode)}
                      <span className="text-sm font-medium text-neutral-900 dark:text-white">
                        {getModeLabel(mode)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Percentage Rate - shown for percentage and combined */}
              {(editingFee.fee_mode === 'percentage' || editingFee.fee_mode === 'combined') && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Percentage Rate
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={editingFee.fee_percentage}
                      onChange={(e) => setEditingFee({...editingFee, fee_percentage: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 pr-12 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                      %
                    </span>
                  </div>
                </div>
              )}

              {/* Fixed Amount - shown for flat and combined */}
              {(editingFee.fee_mode === 'flat' || editingFee.fee_mode === 'combined') && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Fixed Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingFee.flat_fee}
                      onChange={(e) => setEditingFee({...editingFee, flat_fee: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 pl-8 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Min/Max Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Minimum Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingFee.min_fee}
                      onChange={(e) => setEditingFee({...editingFee, min_fee: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 pl-8 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Maximum Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingFee.max_fee || ''}
                      onChange={(e) => setEditingFee({...editingFee, max_fee: e.target.value ? Number(e.target.value) : null})}
                      placeholder="No limit"
                      className="w-full px-4 py-2.5 pl-8 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Preview</p>
                <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {formatFeeDisplay(editingFee)}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  On a $500 loan: {formatCurrency(calculateFee(500, editingFee))}
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">Fee Status</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Enable or disable this fee</p>
                </div>
                <button
                  onClick={() => setEditingFee({...editingFee, is_active: !editingFee.is_active})}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    editingFee.is_active
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  {editingFee.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveFee}
                  disabled={saving === editingFee.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {saving === editingFee.id ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingFee(null)}
                  className="px-4 py-3 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
