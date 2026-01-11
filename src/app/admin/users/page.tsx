'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Mail,
  Shield,
  User as UserIcon,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  user_type: 'individual' | 'business';
  verification_status?: string;
  is_admin?: boolean;
  is_suspended?: boolean;
  borrower_rating?: string;
  created_at: string;
  total_payments_made?: number;
  total_borrowed?: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'individual' | 'business' | 'admin'>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    fetchUsers();
  }, [page, filter, search]);

  const fetchUsers = async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (filter === 'individual') {
      query = query.eq('user_type', 'individual');
    } else if (filter === 'business') {
      query = query.eq('user_type', 'business');
    } else if (filter === 'admin') {
      query = query.eq('is_admin', true);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
      setTotalCount(count || 0);
    }

    setLoading(false);
  };

  const toggleUserSuspension = async (userId: string, currentStatus: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('users')
      .update({ is_suspended: !currentStatus })
      .eq('id', userId);

    if (!error) {
      setUsers(users.map(u =>
        u.id === userId ? { ...u, is_suspended: !currentStatus } : u
      ));
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('users')
      .update({ is_admin: !currentStatus })
      .eq('id', userId);

    if (!error) {
      setUsers(users.map(u =>
        u.id === userId ? { ...u, is_admin: !currentStatus } : u
      ));
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Users</h1>
        <p className="text-neutral-500">Manage all users on the platform</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search users..."
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
              <option value="all">All Users</option>
              <option value="individual">Individuals</option>
              <option value="business">Businesses</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">User</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Type</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Rating</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">Joined</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-neutral-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-10 bg-neutral-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          user.is_admin ? 'bg-amber-100' : 'bg-primary-100'
                        }`}>
                          {user.is_admin ? (
                            <Shield className="w-5 h-5 text-amber-600" />
                          ) : user.user_type === 'business' ? (
                            <Building2 className="w-5 h-5 text-primary-600" />
                          ) : (
                            <UserIcon className="w-5 h-5 text-primary-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900">{user.full_name || 'Unknown'}</p>
                          <p className="text-sm text-neutral-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.user_type === 'business'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {user.user_type || 'individual'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {user.is_suspended ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 w-fit">
                            Suspended
                          </span>
                        ) : user.verification_status === 'verified' ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 w-fit flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-neutral-100 text-neutral-700 w-fit">
                            {user.verification_status || 'Unverified'}
                          </span>
                        )}
                        {user.is_admin && (
                          <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 w-fit">
                            Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.borrower_rating === 'great' ? 'bg-green-100 text-green-700' :
                        user.borrower_rating === 'good' ? 'bg-blue-100 text-blue-700' :
                        user.borrower_rating === 'poor' ? 'bg-yellow-100 text-yellow-700' :
                        user.borrower_rating === 'bad' ? 'bg-orange-100 text-orange-700' :
                        user.borrower_rating === 'worst' ? 'bg-red-100 text-red-700' :
                        'bg-neutral-100 text-neutral-700'
                      }`}>
                        {user.borrower_rating || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                          className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleUserSuspension(user.id, user.is_suspended || false)}
                          className={`p-2 rounded-lg ${
                            user.is_suspended
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={user.is_suspended ? 'Unsuspend' : 'Suspend'}
                        >
                          {user.is_suspended ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => toggleAdminStatus(user.id, user.is_admin || false)}
                          className={`p-2 rounded-lg ${
                            user.is_admin
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-neutral-500 hover:bg-neutral-100'
                          }`}
                          title={user.is_admin ? 'Remove Admin' : 'Make Admin'}
                        >
                          <Shield className="w-4 h-4" />
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
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} users
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

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                selectedUser.is_admin ? 'bg-amber-100' : 'bg-primary-100'
              }`}>
                {selectedUser.is_admin ? (
                  <Shield className="w-8 h-8 text-amber-600" />
                ) : (
                  <UserIcon className="w-8 h-8 text-primary-600" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900">{selectedUser.full_name}</h2>
                <p className="text-neutral-500">{selectedUser.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">User ID</p>
                  <p className="font-mono text-sm truncate">{selectedUser.id}</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">Type</p>
                  <p className="font-medium">{selectedUser.user_type}</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">Phone</p>
                  <p className="font-medium">{selectedUser.phone || 'Not set'}</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">Rating</p>
                  <p className="font-medium">{selectedUser.borrower_rating || 'N/A'}</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">Verification</p>
                  <p className="font-medium">{selectedUser.verification_status || 'Pending'}</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">Joined</p>
                  <p className="font-medium">{formatDate(selectedUser.created_at)}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    toggleUserSuspension(selectedUser.id, selectedUser.is_suspended || false);
                    setShowUserModal(false);
                  }}
                  className={`flex-1 py-2 rounded-lg font-medium ${
                    selectedUser.is_suspended
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {selectedUser.is_suspended ? 'Unsuspend User' : 'Suspend User'}
                </button>
                <button
                  onClick={() => setShowUserModal(false)}
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
