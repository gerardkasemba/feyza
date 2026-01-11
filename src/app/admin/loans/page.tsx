'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  DollarSign,
} from 'lucide-react';

interface Loan {
  id: string;
  amount: number;
  amount_paid: number;
  amount_remaining: number;
  currency: string;
  interest_rate: number;
  status: string;
  purpose?: string;
  created_at: string;
  borrower: {
    full_name: string;
    email: string;
  };
  lender?: {
    full_name: string;
  };
  business_lender?: {
    business_name: string;
  };
}

export default function AdminLoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'completed' | 'declined'>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    fetchLoans();
  }, [page, filter, search]);

  const fetchLoans = async () => {
    setLoading(true);
    const supabase = createClient();

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

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching loans:', error);
    } else {
      setLoans(data || []);
      setTotalCount(count || 0);
    }

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
      active: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      pending_funds: { color: 'bg-blue-100 text-blue-700', icon: DollarSign },
      completed: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
      declined: { color: 'bg-red-100 text-red-700', icon: XCircle },
      cancelled: { color: 'bg-neutral-100 text-neutral-700', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 w-fit ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Loans</h1>
        <p className="text-neutral-500">View and manage all loans on the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-sm text-neutral-500">Total Loans</p>
          <p className="text-2xl font-bold text-neutral-900">{totalCount}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-sm text-green-600">Active</p>
          <p className="text-2xl font-bold text-green-700">
            {loans.filter(l => l.status === 'active').length}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
          <p className="text-sm text-yellow-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-700">
            {loans.filter(l => l.status === 'pending').length}
          </p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <p className="text-sm text-blue-600">Completed</p>
          <p className="text-2xl font-bold text-blue-700">
            {loans.filter(l => l.status === 'completed').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by borrower or lender..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-neutral-400" />
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Loans</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Loan ID</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Borrower</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Lender</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Amount</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Progress</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Date</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-6 py-4">
                      <div className="h-10 bg-neutral-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-neutral-500">
                    No loans found
                  </td>
                </tr>
              ) : (
                loans.map((loan) => {
                  const progress = loan.amount > 0 
                    ? ((loan.amount_paid || 0) / loan.amount) * 100 
                    : 0;

                  return (
                    <tr key={loan.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-neutral-600">
                          {loan.id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-neutral-900">
                            {loan.borrower?.full_name || 'Unknown'}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {loan.borrower?.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-neutral-700">
                          {loan.lender?.full_name || loan.business_lender?.business_name || 'Personal'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-neutral-900">
                          {formatCurrency(loan.amount, loan.currency)}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {loan.interest_rate}% interest
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-24">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-neutral-500">{Math.round(progress)}%</span>
                          </div>
                          <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(loan.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-500">
                        {formatDate(loan.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedLoan(loan);
                              setShowLoanModal(true);
                            }}
                            className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/loans/${loan.id}`}
                            target="_blank"
                            className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg"
                            title="Open Loan Page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200">
          <p className="text-sm text-neutral-500">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} loans
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-lg border border-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-neutral-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loan Detail Modal */}
      {showLoanModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-neutral-900">Loan Details</h2>
              {getStatusBadge(selectedLoan.status)}
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-primary-50 rounded-xl text-center">
                <p className="text-sm text-primary-600">Loan Amount</p>
                <p className="text-3xl font-bold text-primary-700">
                  {formatCurrency(selectedLoan.amount, selectedLoan.currency)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">Paid</p>
                  <p className="font-medium text-green-600">
                    {formatCurrency(selectedLoan.amount_paid || 0, selectedLoan.currency)}
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">Remaining</p>
                  <p className="font-medium text-amber-600">
                    {formatCurrency(selectedLoan.amount_remaining || 0, selectedLoan.currency)}
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">Interest Rate</p>
                  <p className="font-medium">{selectedLoan.interest_rate}%</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">Created</p>
                  <p className="font-medium">{formatDate(selectedLoan.created_at)}</p>
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded-lg">
                <p className="text-sm text-neutral-500 mb-1">Borrower</p>
                <p className="font-medium">{selectedLoan.borrower?.full_name}</p>
                <p className="text-sm text-neutral-500">{selectedLoan.borrower?.email}</p>
              </div>

              <div className="p-3 bg-neutral-50 rounded-lg">
                <p className="text-sm text-neutral-500 mb-1">Lender</p>
                <p className="font-medium">
                  {selectedLoan.lender?.full_name || selectedLoan.business_lender?.business_name || 'Personal Loan'}
                </p>
              </div>

              {selectedLoan.purpose && (
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500 mb-1">Purpose</p>
                  <p className="text-neutral-700">{selectedLoan.purpose}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Link
                  href={`/loans/${selectedLoan.id}`}
                  target="_blank"
                  className="flex-1 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 text-center"
                >
                  View Full Page
                </Link>
                <button
                  onClick={() => setShowLoanModal(false)}
                  className="flex-1 py-2 border border-neutral-200 rounded-lg font-medium hover:bg-neutral-50"
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
