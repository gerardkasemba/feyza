'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  User as UserIcon,
  Building2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';

interface PendingUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  user_type: 'individual' | 'business';
  verification_status?: string;
  dwolla_customer_url?: string;
  dwolla_customer_id?: string;
  created_at: string;
  updated_at?: string;
  // Documents submitted
  id_document_url?: string;
  address_document_url?: string;
}

interface PendingBusiness {
  id: string;
  business_name: string;
  business_type: string;
  contact_email: string;
  ein_tax_id?: string;
  verification_status?: string;
  is_verified: boolean;
  created_at: string;
  user: {
    id: string;
    email: string;
    full_name: string;
  };
}

type TabType = 'users' | 'businesses';

export default function AdminVerificationPage() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingBusinesses, setPendingBusinesses] = useState<PendingBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingVerifications();
  }, [activeTab]);

  const fetchPendingVerifications = async () => {
    setLoading(true);
    const supabase = createClient();

    if (activeTab === 'users') {
      // Fetch users with pending verification (documents submitted, awaiting review)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('verification_status', ['pending', 'submitted', 'document_pending', 'retry'])
        .order('created_at', { ascending: false });

      if (!error) {
        setPendingUsers(data || []);
      }
    } else {
      // Fetch businesses with pending verification
      const { data, error } = await supabase
        .from('business_profiles')
        .select(`
          *,
          user:users!user_id(id, email, full_name)
        `)
        .eq('is_verified', false)
        .eq('profile_completed', true)
        .order('created_at', { ascending: false });

      if (!error) {
        setPendingBusinesses(data || []);
      }
    }

    setLoading(false);
  };

  const approveUser = async (userId: string) => {
    setActionLoading(userId);
    const supabase = createClient();
    
    const { error } = await supabase
      .from('users')
      .update({ 
        verification_status: 'verified',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (!error) {
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
    }
    setActionLoading(null);
  };

  const rejectUser = async (userId: string, reason?: string) => {
    setActionLoading(userId);
    const supabase = createClient();
    
    const { error } = await supabase
      .from('users')
      .update({ 
        verification_status: 'rejected',
        verification_rejection_reason: reason || 'Documents did not meet requirements',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (!error) {
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
    }
    setActionLoading(null);
  };

  const approveBusiness = async (businessId: string) => {
    setActionLoading(businessId);
    
    try {
      const response = await fetch('/api/admin/business/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, action: 'approve' }),
      });

      if (response.ok) {
        setPendingBusinesses(pendingBusinesses.filter(b => b.id !== businessId));
      }
    } catch (error) {
      console.error('Error approving business:', error);
    }
    
    setActionLoading(null);
  };

  const rejectBusiness = async (businessId: string, reason?: string) => {
    setActionLoading(businessId);
    
    try {
      const response = await fetch('/api/admin/business/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, action: 'reject', reason }),
      });

      if (response.ok) {
        setPendingBusinesses(pendingBusinesses.filter(b => b.id !== businessId));
      }
    } catch (error) {
      console.error('Error rejecting business:', error);
    }
    
    setActionLoading(null);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending':
      case 'submitted':
      case 'document_pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Pending Review
          </span>
        );
      case 'retry':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
            <AlertCircle className="w-3 h-3" />
            Needs Retry
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Verified
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 text-neutral-800 rounded-full text-xs font-medium">
            Not Started
          </span>
        );
    }
  };

  const filteredUsers = pendingUsers.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredBusinesses = pendingBusinesses.filter(b =>
    b.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.contact_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Pending Verifications</h1>
        <p className="text-neutral-500 mt-1">Review and approve user and business verification requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <UserIcon className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-yellow-700">Pending User Verifications</p>
              <p className="text-2xl font-bold text-yellow-900">{pendingUsers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-700">Pending Business Verifications</p>
              <p className="text-2xl font-bold text-blue-900">{pendingBusinesses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'users'
              ? 'bg-primary-500 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          Users ({pendingUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('businesses')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'businesses'
              ? 'bg-primary-500 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          Businesses ({pendingBusinesses.length})
        </button>
      </div>

      {/* Search and Refresh */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          onClick={fetchPendingVerifications}
          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : activeTab === 'users' ? (
        /* Users Table */
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">No pending user verifications</p>
              <p className="text-sm">All user verification requests have been processed</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Dwolla</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-neutral-500" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900">{user.full_name || 'No name'}</p>
                          <p className="text-sm text-neutral-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(user.verification_status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {user.dwolla_customer_id ? (
                        <a
                          href={`https://dashboard-sandbox.dwolla.com/customers/${user.dwolla_customer_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                        >
                          View in Dwolla
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-neutral-400">Not created</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => approveUser(user.id)}
                          disabled={actionLoading === user.id}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          {actionLoading === user.id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => rejectUser(user.id)}
                          disabled={actionLoading === user.id}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* Businesses Table */
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {filteredBusinesses.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">No pending business verifications</p>
              <p className="text-sm">All business verification requests have been processed</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Business</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Owner</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">EIN</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Submitted</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredBusinesses.map((business) => (
                  <tr key={business.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900">{business.business_name}</p>
                          <p className="text-sm text-neutral-500">{business.business_type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-neutral-900">{business.user?.full_name}</p>
                      <p className="text-xs text-neutral-500">{business.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-700">
                      {business.ein_tax_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500">
                      {formatDate(business.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => approveBusiness(business.id)}
                          disabled={actionLoading === business.id}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          {actionLoading === business.id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => rejectBusiness(business.id)}
                          disabled={actionLoading === business.id}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
