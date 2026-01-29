'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Search,
  Filter,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Shield,
  User as UserIcon,
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  Star,
  Unlock,
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
  is_blocked?: boolean;
  borrower_rating?: string;
  created_at: string;
  total_payments_made?: number;
  total_borrowed?: number;
  borrowing_tier?: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'individual' | 'business' | 'admin' | 'blocked'>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const pageSize = 20;
  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, [page, filter, search]);

  const fetchUsers = async () => {
    setLoading(true);

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
    } else if (filter === 'blocked') {
      query = query.eq('is_blocked', true);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, count, error } = await query;

    if (!error) {
      setUsers(data || []);
      setTotalCount(count || 0);
    }

    setLoading(false);
  };

  const toggleUserSuspension = async (userId: string, currentStatus: boolean) => {
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
    if (!confirm(`${currentStatus ? 'Remove' : 'Grant'} admin privileges?`)) return;
    
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

  const unblockUser = async (userId: string) => {
    if (!confirm('Unblock this user?')) return;
    
    const { error } = await supabase
      .from('users')
      .update({ 
        is_blocked: false,
        blocked_at: null,
        blocked_reason: null,
        borrower_rating: 'neutral',
      })
      .eq('id', userId);

    if (!error) {
      fetchUsers();
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const getRatingBadge = (rating?: string) => {
    const colors: Record<string, string> = {
      great: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
      good: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
      neutral: 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300',
      poor: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
      bad: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300',
      worst: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
    };
    return colors[rating || 'neutral'] || colors.neutral;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <UserIcon className="w-7 h-7 text-emerald-500" />
            Users
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {totalCount} total users
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium text-neutral-700 dark:text-neutral-200"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
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
            <option value="all">All Users</option>
            <option value="individual">Individuals</option>
            <option value="business">Business</option>
            <option value="admin">Admins</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
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
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">User</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Rating</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Joined</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          user.is_admin 
                            ? 'bg-purple-100 dark:bg-purple-500/20' 
                            : user.user_type === 'business'
                            ? 'bg-blue-100 dark:bg-blue-500/20'
                            : 'bg-neutral-100 dark:bg-neutral-700'
                        }`}>
                          {user.is_admin ? (
                            <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          ) : user.user_type === 'business' ? (
                            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <UserIcon className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">{user.full_name || 'Unknown'}</p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.user_type === 'business'
                          ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                          : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                      }`}>
                        {user.user_type || 'individual'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full capitalize ${getRatingBadge(user.borrower_rating)}`}>
                        {user.borrower_rating || 'neutral'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {user.is_blocked && (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 text-xs rounded-full">
                            Blocked
                          </span>
                        )}
                        {user.is_suspended && (
                          <span className="px-2 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs rounded-full">
                            Suspended
                          </span>
                        )}
                        {user.is_admin && (
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                            Admin
                          </span>
                        )}
                        {!user.is_blocked && !user.is_suspended && !user.is_admin && (
                          <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-neutral-600 dark:text-neutral-300">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {user.is_blocked && (
                          <button
                            onClick={() => unblockUser(user.id)}
                            className="p-2 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="Unblock"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => toggleUserSuspension(user.id, !!user.is_suspended)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.is_suspended
                              ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                              : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                          }`}
                          title={user.is_suspended ? 'Unsuspend' : 'Suspend'}
                        >
                          {user.is_suspended ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => toggleAdminStatus(user.id, !!user.is_admin)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.is_admin
                              ? 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10'
                              : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                          }`}
                          title={user.is_admin ? 'Remove Admin' : 'Make Admin'}
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-500 dark:text-neutral-400">
                      <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No users found</p>
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

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">User Details</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  selectedUser.is_admin 
                    ? 'bg-purple-100 dark:bg-purple-500/20' 
                    : 'bg-neutral-100 dark:bg-neutral-700'
                }`}>
                  {selectedUser.is_admin ? (
                    <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <UserIcon className="w-8 h-8 text-neutral-500 dark:text-neutral-400" />
                  )}
                </div>
                <div>
                  <p className="text-xl font-semibold text-neutral-900 dark:text-white">{selectedUser.full_name}</p>
                  <p className="text-neutral-500 dark:text-neutral-400">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">User Type</p>
                  <p className="font-semibold text-neutral-900 dark:text-white capitalize">{selectedUser.user_type || 'Individual'}</p>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Rating</p>
                  <p className="font-semibold text-neutral-900 dark:text-white capitalize">{selectedUser.borrower_rating || 'Neutral'}</p>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Borrowing Tier</p>
                  <p className="font-semibold text-neutral-900 dark:text-white">Tier {selectedUser.borrowing_tier || 1}</p>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Payments</p>
                  <p className="font-semibold text-neutral-900 dark:text-white">{selectedUser.total_payments_made || 0}</p>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg col-span-2">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Joined</p>
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    {format(new Date(selectedUser.created_at), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    toggleUserSuspension(selectedUser.id, !!selectedUser.is_suspended);
                    setSelectedUser(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium ${
                    selectedUser.is_suspended
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                >
                  {selectedUser.is_suspended ? <CheckCircle className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                  {selectedUser.is_suspended ? 'Unsuspend' : 'Suspend'}
                </button>
                <button
                  onClick={() => setSelectedUser(null)}
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
