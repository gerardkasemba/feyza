'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('admin_page');

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Ban,
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  DollarSign,
  ArrowRight,
  Unlock,
  Eye,
  Filter,
} from 'lucide-react';

interface BlockedUser {
  id: string;
  full_name: string;
  email: string;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  debt_cleared_at: string | null;
  restriction_ends_at: string | null;
  default_count: number;
  borrower_rating: string;
  created_at: string;
}

interface BlockRecord {
  id: string;
  user_id: string;
  loan_id: string;
  blocked_at: string;
  blocked_reason: string;
  total_debt_at_block: number;
  debt_cleared_at: string | null;
  restriction_ends_at: string | null;
  restriction_lifted_at: string | null;
  status: string;
  user?: { full_name: string; email: string };
  loan?: { amount: number; currency: string };
}

type FilterStatus = 'all' | 'active' | 'restriction' | 'cleared';

export default function BlockedBorrowersPage() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockHistory, setBlockHistory] = useState<BlockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedUser, setSelectedUser] = useState<BlockedUser | null>(null);
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch blocked users
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('is_blocked', true)
      .order('blocked_at', { ascending: false });

    // Fetch block history
    const { data: history } = await supabase
      .from('borrower_blocks')
      .select(`
        *,
        user:users(full_name, email),
        loan:loans(amount, currency)
      `)
      .order('blocked_at', { ascending: false })
      .limit(50);

    setBlockedUsers(users || []);
    setBlockHistory(history || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUnblock = async (userId: string) => {
    if (!confirm('Are you sure you want to unblock this user? They will be able to request loans immediately.')) {
      return;
    }

    setUnblocking(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_blocked: false,
          blocked_at: null,
          blocked_reason: null,
          debt_cleared_at: null,
          restriction_ends_at: null,
          borrower_rating: 'neutral',
        })
        .eq('id', userId);

      if (error) throw error;

      // Update block record
      await supabase
        .from('borrower_blocks')
        .update({
          status: 'admin_unblocked',
          restriction_lifted_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      await fetchData();
    } catch (err) {
      log.error('Error unblocking user:', err);
      alert('Failed to unblock user');
    }
    setUnblocking(null);
  };

  const filteredUsers = blockedUsers.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return !user.debt_cleared_at;
    if (filterStatus === 'restriction') return user.debt_cleared_at && user.restriction_ends_at;
    if (filterStatus === 'cleared') return false; // They wouldn't be blocked

    return true;
  });

  const getStatusBadge = (user: BlockedUser) => {
    if (!user.debt_cleared_at) {
      return (
        <span className="px-2 py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 text-xs rounded-full flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Outstanding Debt
        </span>
      );
    }
    if (user.restriction_ends_at) {
      const endsAt = new Date(user.restriction_ends_at);
      if (endsAt > new Date()) {
        return (
          <span className="px-2 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            In Restriction
          </span>
        );
      }
    }
    return (
      <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs rounded-full flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        Ready to Unblock
      </span>
    );
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
            <Ban className="w-7 h-7 text-red-500" />
            Blocked Borrowers
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Manage borrowers who have defaulted on payments
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg">
              <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{blockedUsers.length}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Blocked</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {blockedUsers.filter(u => !u.debt_cleared_at).length}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">With Debt</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {blockedUsers.filter(u => u.debt_cleared_at && u.restriction_ends_at && new Date(u.restriction_ends_at) > new Date()).length}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">In Restriction</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {blockHistory.filter(b => b.status === 'restriction_ended' || b.status === 'admin_unblocked').length}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Restored</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-neutral-900 dark:text-white placeholder-neutral-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-neutral-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white"
          >
            <option value="all">All Blocked</option>
            <option value="active">Outstanding Debt</option>
            <option value="restriction">In Restriction</option>
          </select>
        </div>
      </div>

      {/* Blocked Users List */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">User</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Blocked Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Restriction Ends</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Defaults</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">{user.full_name || 'Unknown'}</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {getStatusBadge(user)}
                  </td>
                  <td className="py-4 px-4 text-sm text-neutral-600 dark:text-neutral-300">
                    {user.blocked_at ? format(new Date(user.blocked_at), 'MMM d, yyyy') : '-'}
                  </td>
                  <td className="py-4 px-4 text-sm text-neutral-600 dark:text-neutral-300">
                    {user.restriction_ends_at ? (
                      <div>
                        <p>{format(new Date(user.restriction_ends_at), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-neutral-400">
                          {formatDistanceToNow(new Date(user.restriction_ends_at), { addSuffix: true })}
                        </p>
                      </div>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm rounded-full">
                      {user.default_count || 0}x
                    </span>
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
                      <button
                        onClick={() => handleUnblock(user.id)}
                        disabled={unblocking === user.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {unblocking === user.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )}
                        Unblock
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500 dark:text-neutral-400">
                    <Ban className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No blocked borrowers found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Block History */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Block History</h2>
        <div className="space-y-3">
          {blockHistory.slice(0, 10).map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  record.status === 'active' 
                    ? 'bg-red-100 dark:bg-red-500/20' 
                    : record.status === 'debt_cleared' 
                    ? 'bg-amber-100 dark:bg-amber-500/20'
                    : 'bg-emerald-100 dark:bg-emerald-500/20'
                }`}>
                  {record.status === 'active' ? (
                    <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
                  ) : record.status === 'debt_cleared' ? (
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {record.user?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {record.blocked_reason || 'Payment default'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-neutral-900 dark:text-white">
                  {formatCurrency(record.total_debt_at_block || 0, record.loan?.currency)}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {format(new Date(record.blocked_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          ))}
          {blockHistory.length === 0 && (
            <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">
              No block history yet
            </p>
          )}
        </div>
      </div>

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
                  <span className="text-2xl text-neutral-400">&times;</span>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-neutral-900 dark:text-white">{selectedUser.full_name}</p>
                  <p className="text-neutral-500 dark:text-neutral-400">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedUser)}</div>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Rating</p>
                  <p className="font-semibold text-neutral-900 dark:text-white capitalize">{selectedUser.borrower_rating || 'N/A'}</p>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Blocked At</p>
                  <p className="font-semibold text-neutral-900 dark:text-white">
                    {selectedUser.blocked_at ? format(new Date(selectedUser.blocked_at), 'MMM d, yyyy h:mm a') : '-'}
                  </p>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Defaults</p>
                  <p className="font-semibold text-neutral-900 dark:text-white">{selectedUser.default_count || 0}</p>
                </div>
              </div>

              {selectedUser.blocked_reason && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">Block Reason</p>
                  <p className="text-red-700 dark:text-red-300 mt-1">{selectedUser.blocked_reason}</p>
                </div>
              )}

              {selectedUser.restriction_ends_at && (
                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Restriction Period</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-amber-700 dark:text-amber-300">
                      Ends: {format(new Date(selectedUser.restriction_ends_at), 'MMM d, yyyy')}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 text-sm">
                      {formatDistanceToNow(new Date(selectedUser.restriction_ends_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    handleUnblock(selectedUser.id);
                    setSelectedUser(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium"
                >
                  <Unlock className="w-5 h-5" />
                  Unblock User
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
