'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Search,
  Filter,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  User,
  Building2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface Loan {
  id: string;
  amount: number;
  currency: string;
  status: string;
  interest_rate: number;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
  loan_type: string;
  repayment_frequency: string;
  total_installments: number;
  created_at: string;
  borrower?: { full_name: string; email: string };
  lender?: { full_name: string };
  business_lender?: { business_name: string };
}

export default function AdminLoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'completed' | 'cancelled' | 'defaulted'>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, completed: 0 });
  const pageSize = 20;
  const supabase = createClient();

  useEffect(() => {
    fetchLoans();
  }, [page, filter, search]);

  const fetchLoans = async () => {
    setLoading(true);

    let query = supabase
      .from('loans')
      .select(`
        *,
        borrower:users!borrower_id(full_name, email),
        lender:users!lender_id(full_name),
        business_lender:business_profiles!business_lender_id(business_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    if (search) {
      // Search in related tables is complex, so we'll filter client-side for now
    }

    const { data, count, error } = await query;

    if (!error) {
      let filtered = data || [];
      if (search) {
        filtered = filtered.filter(loan => 
          loan.borrower?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          loan.borrower?.email?.toLowerCase().includes(search.toLowerCase())
        );
      }
      setLoans(filtered);
      setTotalCount(count || 0);
    }

    // Fetch stats
    const [active, pending, completed] = await Promise.all([
      supabase.from('loans').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('loans').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('loans').select('id', { count: 'exact' }).eq('status', 'completed'),
    ]);

    setStats({
      total: count || 0,
      active: active.count || 0,
      pending: pending.count || 0,
      completed: completed.count || 0,
    });

    setLoading(false);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
      active: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
      completed: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
      cancelled: 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300',
      defaulted: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
    };
    return styles[status] || styles.pending;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-3 h-3" />;
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      case 'defaulted': return <AlertCircle className="w-3 h-3" />;
      default: return <XCircle className="w-3 h-3" />;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-emerald-500" />
            Loans
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Manage all loans on the platform
          </p>
        </div>
        <button
          onClick={fetchLoans}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium text-neutral-700 dark:text-neutral-200"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Loans</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Active</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Pending</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Completed</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.completed}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by borrower name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-neutral-900 dark:text-white placeholder-neutral-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-neutral-400" />
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value as any); setPage(1); }}
            className="px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="defaulted">Defaulted</option>
          </select>
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-neutral-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Borrower</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Lender</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Progress</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Created</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {loans.map((loan) => {
                  const progress = loan.total_amount > 0 ? (loan.amount_paid / loan.total_amount) * 100 : 0;
                  return (
                    <tr key={loan.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white text-sm">
                              {loan.borrower?.full_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{loan.borrower?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {loan.business_lender ? (
                            <>
                              <Building2 className="w-4 h-4 text-blue-500" />
                              <span className="text-sm text-neutral-900 dark:text-white">{loan.business_lender.business_name}</span>
                            </>
                          ) : loan.lender ? (
                            <span className="text-sm text-neutral-900 dark:text-white">{loan.lender.full_name}</span>
                          ) : (
                            <span className="text-sm text-neutral-400">Pending</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {formatCurrency(loan.amount, loan.currency)}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {loan.interest_rate}% interest
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getStatusBadge(loan.status)}`}>
                          {getStatusIcon(loan.status)}
                          {loan.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="w-24">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-neutral-500 dark:text-neutral-400">{progress.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-neutral-600 dark:text-neutral-300">
                        {format(new Date(loan.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedLoan(loan)}
                            className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/admin/payments?loan_id=${loan.id}`}
                            className="p-2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="View Payments"
                          >
                            <DollarSign className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {loans.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-500 dark:text-neutral-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No loans found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
            </button>
            <span className="px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
            </button>
          </div>
        </div>
      )}

      {/* Loan Detail Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Loan Details</h2>
                <button
                  onClick={() => setSelectedLoan(null)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Status</span>
                <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full ${getStatusBadge(selectedLoan.status)}`}>
                  {getStatusIcon(selectedLoan.status)}
                  {selectedLoan.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Amount</p>
                  <p className="text-xl font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(selectedLoan.amount, selectedLoan.currency)}
                  </p>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Total (with interest)</p>
                  <p className="text-xl font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(selectedLoan.total_amount, selectedLoan.currency)}
                  </p>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Paid</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(selectedLoan.amount_paid, selectedLoan.currency)}
                  </p>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Remaining</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(selectedLoan.amount_remaining, selectedLoan.currency)}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Interest Rate</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{selectedLoan.interest_rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Loan Type</span>
                  <span className="font-medium text-neutral-900 dark:text-white capitalize">{selectedLoan.loan_type || 'Personal'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Frequency</span>
                  <span className="font-medium text-neutral-900 dark:text-white capitalize">{selectedLoan.repayment_frequency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Installments</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{selectedLoan.total_installments}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Link
                  href={`/admin/payments?loan_id=${selectedLoan.id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium"
                >
                  <DollarSign className="w-5 h-5" />
                  View Payments
                </Link>
                <button
                  onClick={() => setSelectedLoan(null)}
                  className="px-4 py-3 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200 rounded-lg transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
