'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Search,
  Filter,
  Eye,
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Globe,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  FileText,
  Shield,
} from 'lucide-react';

interface Business {
  id: string;
  business_name: string;
  business_type: string;
  contact_email: string;
  contact_phone?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  is_verified: boolean;
  verification_status?: string;
  total_loans_funded?: number;
  total_amount_funded?: number;
  created_at: string;
  user_id?: string;
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const pageSize = 20;
  const supabase = createClient();

  useEffect(() => {
    fetchBusinesses();
  }, [page, filter, search]);

  const fetchBusinesses = async () => {
    setLoading(true);

    try {
      let query = supabase
        .from('business_profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (filter === 'verified') {
        query = query.eq('is_verified', true);
      } else if (filter === 'pending') {
        query = query.eq('is_verified', false);
      }

      if (search) {
        query = query.or(`business_name.ilike.%${search}%,contact_email.ilike.%${search}%`);
      }

      const { data, count, error } = await query;

      if (error) {
        console.error('Error fetching businesses:', error);
        setBusinesses([]);
      } else {
        setBusinesses(data || []);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error('Error in fetchBusinesses:', err);
      setBusinesses([]);
    }
    setLoading(false);
  };

  const handleVerify = async (businessId: string) => {
    const { error } = await supabase
      .from('business_profiles')
      .update({ is_verified: true, verification_status: 'approved' })
      .eq('id', businessId);

    if (!error) {
      fetchBusinesses();
    }
  };

  const handleReject = async (businessId: string) => {
    if (!confirm('Reject this business verification?')) return;
    
    const { error } = await supabase
      .from('business_profiles')
      .update({ is_verified: false, verification_status: 'rejected' })
      .eq('id', businessId);

    if (!error) {
      fetchBusinesses();
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <Building2 className="w-7 h-7 text-emerald-500" />
            Businesses
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {totalCount} registered businesses
          </p>
        </div>
        <button
          onClick={fetchBusinesses}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium text-neutral-700 dark:text-neutral-200"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Total</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">{totalCount}</p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Verified</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {businesses.filter(b => b.is_verified).length}
          </p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Pending</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {businesses.filter(b => !b.is_verified).length}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
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
            <option value="all">All Businesses</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Businesses Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-neutral-400" />
          </div>
        ) : businesses.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No businesses found</h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              {search ? 'Try adjusting your search.' : 'No businesses have registered yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Business</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Contact</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Loans</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Funded</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {businesses.map((business) => (
                  <tr key={business.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">{business.business_name}</p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">{business.business_type || 'Business'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-neutral-900 dark:text-white">{business.contact_email}</p>
                      {business.contact_phone && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{business.contact_phone}</p>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {business.is_verified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs rounded-full">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-neutral-900 dark:text-white">
                      {business.total_loans_funded || 0}
                    </td>
                    <td className="py-4 px-4 text-sm font-medium text-neutral-900 dark:text-white">
                      {formatCurrency(business.total_amount_funded || 0)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedBusiness(business)}
                          className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!business.is_verified && (
                          <>
                            <button
                              onClick={() => handleVerify(business.id)}
                              className="p-2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title="Verify"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(business.id)}
                              className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* Business Detail Modal */}
      {selectedBusiness && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Business Details</h2>
                <button
                  onClick={() => setSelectedBusiness(null)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-neutral-900 dark:text-white">{selectedBusiness.business_name}</p>
                  <p className="text-neutral-500 dark:text-neutral-400">{selectedBusiness.business_type || 'Business'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                  <Mail className="w-5 h-5 text-neutral-400" />
                  <span className="text-neutral-900 dark:text-white">{selectedBusiness.contact_email}</span>
                </div>
                {selectedBusiness.contact_phone && (
                  <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                    <Phone className="w-5 h-5 text-neutral-400" />
                    <span className="text-neutral-900 dark:text-white">{selectedBusiness.contact_phone}</span>
                  </div>
                )}
                {selectedBusiness.website && (
                  <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                    <Globe className="w-5 h-5 text-neutral-400" />
                    <a href={selectedBusiness.website} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                      {selectedBusiness.website}
                    </a>
                  </div>
                )}
                {selectedBusiness.city && (
                  <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                    <MapPin className="w-5 h-5 text-neutral-400" />
                    <span className="text-neutral-900 dark:text-white">
                      {selectedBusiness.city}{selectedBusiness.country ? `, ${selectedBusiness.country}` : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg text-center">
                  <FileText className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">{selectedBusiness.total_loans_funded || 0}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Loans Funded</p>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg text-center">
                  <DollarSign className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(selectedBusiness.total_amount_funded || 0)}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Funded</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {!selectedBusiness.is_verified ? (
                  <>
                    <button
                      onClick={() => {
                        handleVerify(selectedBusiness.id);
                        setSelectedBusiness(null);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Verify Business
                    </button>
                    <button
                      onClick={() => {
                        handleReject(selectedBusiness.id);
                        setSelectedBusiness(null);
                      }}
                      className="px-4 py-3 bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 text-red-700 dark:text-red-300 rounded-lg transition-colors font-medium"
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg">
                    <Shield className="w-5 h-5" />
                    Verified Business
                  </div>
                )}
                <button
                  onClick={() => setSelectedBusiness(null)}
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
