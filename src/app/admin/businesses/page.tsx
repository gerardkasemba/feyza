'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Building2, CheckCircle, XCircle, Clock, MapPin, Globe, 
  Mail, Phone, Users, DollarSign, Calendar, ExternalLink,
  Shield, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';

interface BusinessApplication {
  id: string;
  business_name: string;
  business_type: string;
  business_entity_type?: string;
  description?: string;
  tagline?: string;
  state?: string;
  ein_tax_id?: string;
  years_in_business?: number;
  website_url?: string;
  number_of_employees?: string;
  annual_revenue_range?: string;
  contact_email?: string;
  contact_phone?: string;
  default_interest_rate: number;
  min_loan_amount?: number;
  max_loan_amount?: number;
  verification_status: string;
  profile_completed: boolean;
  created_at: string;
  owner?: {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
  };
}

export default function AdminBusinessApprovalsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<BusinessApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/auth/signin');
        return;
      }
      
      // Get user profile to check admin status
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      // Simple admin check - in production you'd have proper admin roles
      // For now, check if email ends with your admin domain or is specific admin
      const isAdmin = profile?.email?.includes('admin') || 
                      profile?.user_type === 'admin' ||
                      true; // Remove this in production!
      
      if (!isAdmin) {
        router.push('/dashboard');
        return;
      }
      
      setUser(profile);
      await fetchBusinesses('pending');
      setLoading(false);
    };

    fetchData();
  }, [router]);

  const fetchBusinesses = async (status: string) => {
    try {
      const response = await fetch(`/api/admin/business/approve?status=${status}`);
      const data = await response.json();
      setBusinesses(data.businesses || []);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    }
  };

  const handleStatusChange = (status: 'pending' | 'approved' | 'rejected') => {
    setStatusFilter(status);
    fetchBusinesses(status);
  };

  const handleApprove = async (businessId: string) => {
    setProcessingId(businessId);
    try {
      const response = await fetch('/api/admin/business/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          action: 'approve',
          admin_user_id: user?.id,
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        // Remove from current list
        setBusinesses(prev => prev.filter(b => b.id !== businessId));
        alert('Business approved successfully! Email sent to owner.');
      } else {
        alert('Error: ' + (result.error || 'Failed to approve'));
      }
    } catch (error) {
      console.error('Error approving business:', error);
      alert('Failed to approve business');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (businessId: string) => {
    const rejectionNotes = notes[businessId] || '';
    if (!rejectionNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    setProcessingId(businessId);
    try {
      const response = await fetch('/api/admin/business/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          action: 'reject',
          notes: rejectionNotes,
          admin_user_id: user?.id,
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        setBusinesses(prev => prev.filter(b => b.id !== businessId));
        alert('Business rejected. Email sent to owner.');
      } else {
        alert('Error: ' + (result.error || 'Failed to reject'));
      }
    } catch (error) {
      console.error('Error rejecting business:', error);
      alert('Failed to reject business');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          {/* <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-2 inline-block">
            ← Back to Dashboard
          </Link> */}
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Business Applications</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Review and approve business lender applications</p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? status === 'pending' ? 'bg-yellow-500 text-white' :
                    status === 'approved' ? 'bg-green-500 text-white' :
                    'bg-red-500 text-white'
                  : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              {status === 'pending' && <Clock className="w-4 h-4 inline mr-1" />}
              {status === 'approved' && <CheckCircle className="w-4 h-4 inline mr-1" />}
              {status === 'rejected' && <XCircle className="w-4 h-4 inline mr-1" />}
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Business List */}
        {businesses.length === 0 ? (
          <Card className="text-center py-12">
            <Shield className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">
              No {statusFilter} applications
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              {statusFilter === 'pending' 
                ? 'All caught up! No pending applications to review.'
                : `No ${statusFilter} applications found.`}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {businesses.map((business) => (
              <Card key={business.id} className="overflow-hidden">
                {/* Header */}
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(expandedId === business.id ? null : business.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white">{business.business_name}</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {business.business_type} • {business.state || 'No state'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      {formatDate(business.created_at)}
                    </span>
                    {expandedId === business.id ? (
                      <ChevronUp className="w-5 h-5 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === business.id && (
                  <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Business Info */}
                      <div>
                        <h4 className="font-medium text-neutral-900 dark:text-white mb-3">Business Details</h4>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-neutral-500">Entity Type:</span> <span className="text-neutral-900 dark:text-white">{business.business_entity_type || 'Not specified'}</span></p>
                          <p><span className="text-neutral-500">EIN/Tax ID:</span> <span className="text-neutral-900 dark:text-white">{business.ein_tax_id || 'Not provided'}</span></p>
                          <p><span className="text-neutral-500">Years in Business:</span> <span className="text-neutral-900 dark:text-white">{business.years_in_business || 'Not specified'}</span></p>
                          <p><span className="text-neutral-500">Employees:</span> <span className="text-neutral-900 dark:text-white">{business.number_of_employees || 'Not specified'}</span></p>
                          <p><span className="text-neutral-500">Annual Revenue:</span> <span className="text-neutral-900 dark:text-white">{business.annual_revenue_range || 'Not specified'}</span></p>
                          {business.website_url && (
                            <p>
                              <span className="text-neutral-500">Website:</span>{' '}
                              <a href={business.website_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                                {business.website_url} <ExternalLink className="w-3 h-3 inline" />
                              </a>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Lending Terms */}
                      <div>
                        <h4 className="font-medium text-neutral-900 dark:text-white mb-3">Lending Terms</h4>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-neutral-500">Interest Rate:</span> <span className="text-neutral-900 dark:text-white">{business.default_interest_rate}% APR</span></p>
                          <p><span className="text-neutral-500">Loan Range:</span> <span className="text-neutral-900 dark:text-white">{formatCurrency(business.min_loan_amount || 50)} - {formatCurrency(business.max_loan_amount || 5000)}</span></p>
                        </div>

                        <h4 className="font-medium text-neutral-900 dark:text-white mb-3 mt-4">Contact</h4>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-neutral-500">Owner:</span> <span className="text-neutral-900 dark:text-white">{business.owner?.full_name || 'Unknown'}</span></p>
                          <p><span className="text-neutral-500">Email:</span> <span className="text-neutral-900 dark:text-white">{business.contact_email || business.owner?.email}</span></p>
                          {business.contact_phone && (
                            <p><span className="text-neutral-500">Phone:</span> <span className="text-neutral-900 dark:text-white">{business.contact_phone}</span></p>
                          )}
                        </div>
                      </div>
                    </div>

                    {business.description && (
                      <div className="mt-4">
                        <h4 className="font-medium text-neutral-900 dark:text-white mb-2">Description</h4>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">{business.description}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {statusFilter === 'pending' && (
                      <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Notes (required for rejection)
                          </label>
                          <textarea
                            value={notes[business.id] || ''}
                            onChange={(e) => setNotes({ ...notes, [business.id]: e.target.value })}
                            placeholder="Add notes or rejection reason..."
                            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm dark:bg-neutral-800 dark:text-white"
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleApprove(business.id)}
                            loading={processingId === business.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleReject(business.id)}
                            loading={processingId === business.id}
                            className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
