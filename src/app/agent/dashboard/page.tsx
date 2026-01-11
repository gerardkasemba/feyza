'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import {
  Building2,
  LogOut,
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  Smartphone,
  Building,
  Banknote,
  RefreshCw,
  Search,
  Filter,
  ChevronRight,
  User,
  MapPin,
} from 'lucide-react';

interface Agent {
  id: string;
  email: string;
  full_name: string;
  role: string;
  country?: string;
}

interface Disbursement {
  id: string;
  loan_id: string;
  amount: number;
  currency: string;
  disbursement_method: string;
  recipient_name: string;
  recipient_phone?: string;
  recipient_country?: string;
  status: string;
  pickup_code?: string;
  pickup_location?: string;
  created_at: string;
  loan?: {
    borrower?: {
      full_name: string;
      email: string;
    };
  };
}

export default function AgentDashboardPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    processing: 0,
    ready_for_pickup: 0,
    completed: 0,
    failed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAuth();
    fetchDisbursements();
  }, [statusFilter, methodFilter]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/agent/auth');
      if (!response.ok) {
        router.push('/agent/login');
        return;
      }
      const data = await response.json();
      setAgent(data.agent);
    } catch (error) {
      router.push('/agent/login');
    }
  };

  const fetchDisbursements = async () => {
    try {
      setRefreshing(true);
      let url = '/api/agent/disbursements?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (methodFilter) url += `method=${methodFilter}&`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setDisbursements(data.disbursements || []);
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error('Failed to fetch disbursements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/agent/auth', { method: 'DELETE' });
    router.push('/agent/login');
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'success' | 'warning' | 'danger'; label: string }> = {
      pending: { variant: 'danger', label: '🔴 Needs Action' },
      processing: { variant: 'warning', label: '🟡 Processing' },
      ready_for_pickup: { variant: 'warning', label: '🟠 Awaiting Pickup' },
      completed: { variant: 'success', label: '✅ Completed' },
      failed: { variant: 'danger', label: '❌ Failed' },
      on_hold: { variant: 'default', label: '⏸️ On Hold' },
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'mobile_money':
        return <Smartphone className="w-4 h-4" />;
      case 'bank_transfer':
        return <Building className="w-4 h-4" />;
      case 'cash_pickup':
        return <Banknote className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const filteredDisbursements = disbursements.filter(d => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      d.recipient_name.toLowerCase().includes(search) ||
      d.loan?.borrower?.full_name?.toLowerCase().includes(search) ||
      d.pickup_code?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h1 className="font-bold text-neutral-900">Agent Dashboard</h1>
                <p className="text-xs text-neutral-500">{agent?.full_name} • {agent?.country || 'All Regions'}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card 
            className={`cursor-pointer transition-all ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'pending' ? '' : 'pending')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.pending}</p>
                <p className="text-xs text-neutral-500">Pending</p>
              </div>
            </div>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${statusFilter === 'processing' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'processing' ? '' : 'processing')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.processing}</p>
                <p className="text-xs text-neutral-500">Processing</p>
              </div>
            </div>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${statusFilter === 'ready_for_pickup' ? 'ring-2 ring-orange-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'ready_for_pickup' ? '' : 'ready_for_pickup')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Banknote className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.ready_for_pickup}</p>
                <p className="text-xs text-neutral-500">Ready</p>
              </div>
            </div>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${statusFilter === 'completed' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'completed' ? '' : 'completed')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.completed}</p>
                <p className="text-xs text-neutral-500">Completed</p>
              </div>
            </div>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${statusFilter === 'failed' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'failed' ? '' : 'failed')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.failed}</p>
                <p className="text-xs text-neutral-500">Failed</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by recipient, borrower, or pickup code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Methods</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash_pickup">Cash Pickup</option>
          </select>

          <Button 
            variant="outline" 
            onClick={() => fetchDisbursements()}
            loading={refreshing}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Disbursements List */}
        <div className="space-y-4">
          {filteredDisbursements.length === 0 ? (
            <Card className="text-center py-12">
              <Package className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">No disbursements found</p>
              {(statusFilter || methodFilter || searchQuery) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => {
                    setStatusFilter('');
                    setMethodFilter('');
                    setSearchQuery('');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </Card>
          ) : (
            filteredDisbursements.map((d) => (
              <Link key={d.id} href={`/agent/disbursements/${d.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        d.disbursement_method === 'mobile_money' ? 'bg-purple-100 text-purple-600' :
                        d.disbursement_method === 'bank_transfer' ? 'bg-blue-100 text-blue-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {getMethodIcon(d.disbursement_method)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-neutral-900">{d.recipient_name}</p>
                          {getStatusBadge(d.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-neutral-500 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {d.loan?.borrower?.full_name || 'Unknown borrower'}
                          </span>
                          {d.recipient_country && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {d.recipient_country}
                            </span>
                          )}
                          {d.pickup_code && (
                            <span className="font-mono bg-neutral-100 px-2 py-0.5 rounded">
                              {d.pickup_code}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-lg font-bold text-neutral-900">
                          {formatCurrency(d.amount, d.currency)}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {new Date(d.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-400" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
