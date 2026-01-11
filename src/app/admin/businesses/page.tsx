'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Ban,
} from 'lucide-react';

interface Business {
  id: string;
  business_name: string;
  contact_email: string;
  contact_phone?: string;
  business_type?: string;
  is_verified: boolean;
  profile_completed: boolean;
  interest_rate_min?: number;
  interest_rate_max?: number;
  max_loan_amount?: number;
  created_at: string;
  owner?: {
    full_name: string;
    email: string;
  };
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'pending' | 'incomplete'>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showModal, setShowModal] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    fetchBusinesses();
  }, [page, filter, search]);

  const fetchBusinesses = async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from('business_profiles')
      .select(`
        *,
        owner:users!user_id(full_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (filter === 'verified') {
      query = query.eq('is_verified', true);
    } else if (filter === 'pending') {
      query = query.eq('is_verified', false).eq('profile_completed', true);
    } else if (filter === 'incomplete') {
      query = query.eq('profile_completed', false);
    }

    if (search) {
      query = query.or(`business_name.ilike.%${search}%,contact_email.ilike.%${search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching businesses:', error);
    } else {
      setBusinesses(data || []);
      setTotalCount(count || 0);
    }

    setLoading(false);
  };

  const toggleVerification = async (businessId: string, currentStatus: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('business_profiles')
      .update({ is_verified: !currentStatus })
      .eq('id', businessId);

    if (!error) {
      setBusinesses(businesses.map(b =>
        b.id === businessId ? { ...b, is_verified: !currentStatus } : b
      ));
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Businesses</h1>
        <p className="text-neutral-500">Manage business lenders on the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-sm text-neutral-500">Total Businesses</p>
          <p className="text-2xl font-bold text-neutral-900">{totalCount}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-sm text-green-600">Verified</p>
          <p className="text-2xl font-bold text-green-700">
            {businesses.filter(b => b.is_verified).length}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
          <p className="text-sm text-yellow-600">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-700">
            {businesses.filter(b => !b.is_verified && b.profile_completed).length}
          </p>
        </div>
        <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4">
          <p className="text-sm text-neutral-600">Incomplete</p>
          <p className="text-2xl font-bold text-neutral-700">
            {businesses.filter(b => !b.profile_completed).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search businesses..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

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
              <option value="all">All Businesses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending Review</option>
              <option value="incomplete">Incomplete</option>
            </select>
          </div>
        </div>
      </div>

      {/* Businesses Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Business</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Owner</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Interest Range</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Max Loan</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Joined</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-6 py-4">
                      <div className="h-10 bg-neutral-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : businesses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                    No businesses found
                  </td>
                </tr>
              ) : (
                businesses.map((business) => (
                  <tr key={business.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900">{business.business_name}</p>
                          <p className="text-sm text-neutral-500">{business.contact_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-neutral-700">{business.owner?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-neutral-500">{business.owner?.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-neutral-700">
                        {business.interest_rate_min || 0}% - {business.interest_rate_max || 0}%
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-neutral-900">
                        {business.max_loan_amount ? formatCurrency(business.max_loan_amount) : 'Not set'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {business.is_verified ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 w-fit flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        ) : business.profile_completed ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 w-fit flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pending Review
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-neutral-100 text-neutral-700 w-fit">
                            Incomplete
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500">
                      {formatDate(business.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedBusiness(business);
                            setShowModal(true);
                          }}
                          className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleVerification(business.id, business.is_verified)}
                          className={`p-2 rounded-lg ${
                            business.is_verified
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={business.is_verified ? 'Revoke Verification' : 'Verify Business'}
                        >
                          {business.is_verified ? <Ban className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200">
          <p className="text-sm text-neutral-500">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} businesses
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

      {/* Business Detail Modal */}
      {showModal && selectedBusiness && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <Building2 className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900">{selectedBusiness.business_name}</h2>
                <p className="text-neutral-500">{selectedBusiness.contact_email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">Business Type</p>
                  <p className="font-medium">{selectedBusiness.business_type || 'Not set'}</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">Phone</p>
                  <p className="font-medium">{selectedBusiness.contact_phone || 'Not set'}</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">Interest Range</p>
                  <p className="font-medium">
                    {selectedBusiness.interest_rate_min || 0}% - {selectedBusiness.interest_rate_max || 0}%
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">Max Loan</p>
                  <p className="font-medium">
                    {selectedBusiness.max_loan_amount ? formatCurrency(selectedBusiness.max_loan_amount) : 'Not set'}
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">Status</p>
                  <p className="font-medium">
                    {selectedBusiness.is_verified ? 'Verified' : 
                     selectedBusiness.profile_completed ? 'Pending Review' : 'Incomplete'}
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">Created</p>
                  <p className="font-medium">{formatDate(selectedBusiness.created_at)}</p>
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded-lg">
                <p className="text-sm text-neutral-500 mb-1">Owner</p>
                <p className="font-medium">{selectedBusiness.owner?.full_name || 'Unknown'}</p>
                <p className="text-sm text-neutral-500">{selectedBusiness.owner?.email}</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    toggleVerification(selectedBusiness.id, selectedBusiness.is_verified);
                    setShowModal(false);
                  }}
                  className={`flex-1 py-2 rounded-lg font-medium ${
                    selectedBusiness.is_verified
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {selectedBusiness.is_verified ? 'Revoke Verification' : 'Verify Business'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
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
