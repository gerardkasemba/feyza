'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  RefreshCw,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  DollarSign,
  Percent,
  Calendar,
  Building2,
  Users,
  Zap,
  Heart,
  BookOpen,
} from 'lucide-react';

interface LoanType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  min_amount: number;
  max_amount: number;
  min_interest_rate: number;
  max_interest_rate: number;
  max_term_months: number;
  is_active: boolean;
  requires_business_lender: boolean;
  display_order: number;
  created_at: string;
}

const iconOptions = [
  { value: 'users', label: 'Personal', icon: Users },
  { value: 'building', label: 'Business', icon: Building2 },
  { value: 'zap', label: 'Emergency', icon: Zap },
  { value: 'heart', label: 'Medical', icon: Heart },
  { value: 'book', label: 'Education', icon: BookOpen },
  { value: 'file', label: 'Document', icon: FileText },
];

// Default loan types for when table doesn't exist
const defaultLoanTypes: LoanType[] = [
  { id: 'default-1', name: 'Personal Loan', slug: 'personal-loan', description: 'Loans between friends and family', icon: 'users', min_amount: 50, max_amount: 5000, min_interest_rate: 0, max_interest_rate: 15, max_term_months: 24, is_active: true, requires_business_lender: false, display_order: 1, created_at: '' },
  { id: 'default-2', name: 'Business Micro-Loan', slug: 'business-micro-loan', description: 'Small loans from verified business lenders', icon: 'building', min_amount: 100, max_amount: 2000, min_interest_rate: 5, max_interest_rate: 25, max_term_months: 12, is_active: true, requires_business_lender: true, display_order: 2, created_at: '' },
  { id: 'default-3', name: 'Emergency Loan', slug: 'emergency-loan', description: 'Quick loans for urgent needs', icon: 'zap', min_amount: 25, max_amount: 500, min_interest_rate: 0, max_interest_rate: 10, max_term_months: 3, is_active: true, requires_business_lender: false, display_order: 3, created_at: '' },
];

export default function LoanTypesPage() {
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<LoanType | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const fetchLoanTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loan_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching loan types:', error);
        setLoanTypes(defaultLoanTypes);
      } else if (data && data.length > 0) {
        setLoanTypes(data);
      } else {
        setLoanTypes(defaultLoanTypes);
      }
    } catch (err) {
      console.error('Error:', err);
      setLoanTypes(defaultLoanTypes);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLoanTypes();
  }, []);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  };

  const handleSave = async () => {
    if (!editingType) return;
    
    if (editingType.id.startsWith('default-')) {
      alert('Cannot modify default loan types. Please run the migration first to create the loan_types table.');
      return;
    }

    if (!editingType.name.trim()) {
      alert('Name is required');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        // Create new loan type
        const { error } = await supabase
          .from('loan_types')
          .insert({
            name: editingType.name,
            slug: editingType.slug || generateSlug(editingType.name),
            description: editingType.description,
            icon: editingType.icon,
            min_amount: editingType.min_amount,
            max_amount: editingType.max_amount,
            min_interest_rate: editingType.min_interest_rate,
            max_interest_rate: editingType.max_interest_rate,
            max_term_months: editingType.max_term_months,
            is_active: editingType.is_active,
            requires_business_lender: editingType.requires_business_lender,
            display_order: loanTypes.length + 1,
          });

        if (error) throw error;
      } else {
        // Update existing
        const { error } = await supabase
          .from('loan_types')
          .update({
            name: editingType.name,
            slug: editingType.slug,
            description: editingType.description,
            icon: editingType.icon,
            min_amount: editingType.min_amount,
            max_amount: editingType.max_amount,
            min_interest_rate: editingType.min_interest_rate,
            max_interest_rate: editingType.max_interest_rate,
            max_term_months: editingType.max_term_months,
            is_active: editingType.is_active,
            requires_business_lender: editingType.requires_business_lender,
          })
          .eq('id', editingType.id);

        if (error) throw error;
      }

      await fetchLoanTypes();
      setEditingType(null);
      setIsNew(false);
    } catch (err: any) {
      console.error('Error saving loan type:', err);
      alert('Failed to save loan type: ' + err.message);
    }
    setSaving(false);
  };

  const toggleActive = async (loanType: LoanType) => {
    if (loanType.id.startsWith('default-')) {
      alert('Cannot modify default loan types. Please run the migration first.');
      return;
    }

    try {
      await supabase
        .from('loan_types')
        .update({ is_active: !loanType.is_active })
        .eq('id', loanType.id);
      await fetchLoanTypes();
    } catch (err) {
      console.error('Error toggling active:', err);
    }
  };

  const handleDelete = async (loanType: LoanType) => {
    if (loanType.id.startsWith('default-')) {
      alert('Cannot delete default loan types.');
      return;
    }

    if (!confirm(`Delete "${loanType.name}"? This cannot be undone.`)) return;

    try {
      await supabase.from('loan_types').delete().eq('id', loanType.id);
      await fetchLoanTypes();
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const startNew = () => {
    setEditingType({
      id: '',
      name: '',
      slug: '',
      description: '',
      icon: 'users',
      min_amount: 50,
      max_amount: 5000,
      min_interest_rate: 0,
      max_interest_rate: 15,
      max_term_months: 12,
      is_active: true,
      requires_business_lender: false,
      display_order: loanTypes.length + 1,
      created_at: '',
    });
    setIsNew(true);
  };

  const getIcon = (iconName: string | null) => {
    const found = iconOptions.find(o => o.value === iconName);
    return found?.icon || FileText;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-48" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
            ))}
          </div>
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
            <FileText className="w-7 h-7 text-emerald-500" />
            Loan Types
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Configure available loan types and their parameters
          </p>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Loan Type
        </button>
      </div>

      {/* Loan Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loanTypes.map((loanType) => {
          const Icon = getIcon(loanType.icon);
          return (
            <div
              key={loanType.id}
              className={`bg-white dark:bg-neutral-800 rounded-xl border ${
                loanType.is_active
                  ? 'border-neutral-200 dark:border-neutral-700'
                  : 'border-neutral-200 dark:border-neutral-700 opacity-60'
              } overflow-hidden`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      loanType.is_active
                        ? 'bg-emerald-100 dark:bg-emerald-500/20'
                        : 'bg-neutral-100 dark:bg-neutral-700'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        loanType.is_active
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-neutral-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white">{loanType.name}</h3>
                      {loanType.requires_business_lender && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          Business Only
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(loanType)}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    {loanType.is_active ? (
                      <ToggleRight className="w-8 h-8 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>

                {loanType.description && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4 line-clamp-2">
                    {loanType.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      Amount Range
                    </span>
                    <span className="text-neutral-900 dark:text-white font-medium">
                      {formatCurrency(loanType.min_amount)} - {formatCurrency(loanType.max_amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5" />
                      Interest Rate
                    </span>
                    <span className="text-neutral-900 dark:text-white font-medium">
                      {loanType.min_interest_rate}% - {loanType.max_interest_rate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Max Term
                    </span>
                    <span className="text-neutral-900 dark:text-white font-medium">
                      {loanType.max_term_months} months
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <button
                    onClick={() => { setEditingType(loanType); setIsNew(false); }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(loanType)}
                    className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">Usage</p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              Loan types appear in the loan request form. Borrowers can select a type to help categorize their loan.
              "Business Only" types require a verified business lender to fund the loan.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  {isNew ? 'Add Loan Type' : 'Edit Loan Type'}
                </h2>
                <button
                  onClick={() => { setEditingType(null); setIsNew(false); }}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={editingType.name}
                  onChange={(e) => setEditingType({
                    ...editingType,
                    name: e.target.value,
                    slug: generateSlug(e.target.value),
                  })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
                  placeholder="e.g., Personal Loan"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Description
                </label>
                <textarea
                  value={editingType.description || ''}
                  onChange={(e) => setEditingType({ ...editingType, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
                  placeholder="Brief description of this loan type"
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {iconOptions.map(({ value, label, icon: IconComponent }) => (
                    <button
                      key={value}
                      onClick={() => setEditingType({ ...editingType, icon: value })}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors ${
                        editingType.icon === value
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Min Amount
                  </label>
                  <input
                    type="number"
                    value={editingType.min_amount}
                    onChange={(e) => setEditingType({ ...editingType, min_amount: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Max Amount
                  </label>
                  <input
                    type="number"
                    value={editingType.max_amount}
                    onChange={(e) => setEditingType({ ...editingType, max_amount: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Interest Rate Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Min Interest %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingType.min_interest_rate}
                    onChange={(e) => setEditingType({ ...editingType, min_interest_rate: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Max Interest %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingType.max_interest_rate}
                    onChange={(e) => setEditingType({ ...editingType, max_interest_rate: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Max Term */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Max Term (months)
                </label>
                <input
                  type="number"
                  value={editingType.max_term_months}
                  onChange={(e) => setEditingType({ ...editingType, max_term_months: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">Active</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Show in loan request form</p>
                  </div>
                  <button
                    onClick={() => setEditingType({ ...editingType, is_active: !editingType.is_active })}
                    className="text-neutral-400"
                  >
                    {editingType.is_active ? (
                      <ToggleRight className="w-10 h-10 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-10 h-10" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">Business Lender Required</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Only verified businesses can fund</p>
                  </div>
                  <button
                    onClick={() => setEditingType({ ...editingType, requires_business_lender: !editingType.requires_business_lender })}
                    className="text-neutral-400"
                  >
                    {editingType.requires_business_lender ? (
                      <ToggleRight className="w-10 h-10 text-blue-500" />
                    ) : (
                      <ToggleLeft className="w-10 h-10" />
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {isNew ? 'Create' : 'Save Changes'}
                </button>
                <button
                  onClick={() => { setEditingType(null); setIsNew(false); }}
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
