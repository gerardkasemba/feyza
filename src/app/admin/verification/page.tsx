'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import {
  ClipboardCheck,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  FileText,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface PendingVerification {
  id: string;
  business_name: string;
  business_type: string;
  contact_email: string;
  contact_phone?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  registration_number?: string;
  tax_id?: string;
  created_at: string;
  owner?: { full_name: string; email: string };
  documents?: any[];
}

export default function VerificationPage() {
  const [pending, setPending] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<PendingVerification | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const supabase = createClient();

  const fetchPending = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('business_profiles')
      .select(`
        *,
        owner:users!owner_id(full_name, email)
      `)
      .eq('is_verified', false)
      .order('created_at', { ascending: true });

    setPending(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleVerify = async (businessId: string) => {
    setProcessing(businessId);
    const { error } = await supabase
      .from('business_profiles')
      .update({ is_verified: true, verification_status: 'approved' })
      .eq('id', businessId);

    if (!error) {
      setPending(pending.filter(p => p.id !== businessId));
      setSelectedBusiness(null);
    }
    setProcessing(null);
  };

  const handleReject = async (businessId: string, reason?: string) => {
    setProcessing(businessId);
    const { error } = await supabase
      .from('business_profiles')
      .update({ 
        verification_status: 'rejected',
        rejection_reason: reason || 'Did not meet verification requirements'
      })
      .eq('id', businessId);

    if (!error) {
      setPending(pending.filter(p => p.id !== businessId));
      setSelectedBusiness(null);
    }
    setProcessing(null);
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
            <ClipboardCheck className="w-7 h-7 text-emerald-500" />
            Pending Verification
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {pending.length} business{pending.length !== 1 ? 'es' : ''} awaiting verification
          </p>
        </div>
        <button
          onClick={fetchPending}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium text-neutral-700 dark:text-neutral-200"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Alert if many pending */}
      {pending.length > 5 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <p className="text-amber-800 dark:text-amber-300 font-medium">
              {pending.length} businesses waiting for verification
            </p>
          </div>
        </div>
      )}

      {/* Pending List */}
      {pending.length === 0 ? (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">All caught up!</h3>
          <p className="text-neutral-500 dark:text-neutral-400">No pending verifications at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pending.map((business) => (
            <div
              key={business.id}
              className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-neutral-900 dark:text-white truncate">{business.business_name}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{business.business_type}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <User className="w-4 h-4 text-neutral-400" />
                  <span className="truncate">{business.owner?.full_name || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <Mail className="w-4 h-4 text-neutral-400" />
                  <span className="truncate">{business.contact_email}</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  <span>Applied {format(new Date(business.created_at), 'MMM d, yyyy')}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedBusiness(business)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Review
                </button>
                <button
                  onClick={() => handleVerify(business.id)}
                  disabled={processing === business.id}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {processing === business.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleReject(business.id)}
                  disabled={processing === business.id}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 text-red-700 dark:text-red-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedBusiness && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Review Application</h2>
                <button
                  onClick={() => setSelectedBusiness(null)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Business Info */}
              <div>
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">Business Information</h3>
                <div className="bg-neutral-50 dark:bg-neutral-700/30 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Name</span>
                    <span className="font-medium text-neutral-900 dark:text-white">{selectedBusiness.business_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Type</span>
                    <span className="font-medium text-neutral-900 dark:text-white">{selectedBusiness.business_type}</span>
                  </div>
                  {selectedBusiness.registration_number && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">Registration #</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedBusiness.registration_number}</span>
                    </div>
                  )}
                  {selectedBusiness.tax_id && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">Tax ID</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedBusiness.tax_id}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">Contact Information</h3>
                <div className="bg-neutral-50 dark:bg-neutral-700/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-neutral-400" />
                    <span className="text-neutral-900 dark:text-white">{selectedBusiness.contact_email}</span>
                  </div>
                  {selectedBusiness.contact_phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-neutral-400" />
                      <span className="text-neutral-900 dark:text-white">{selectedBusiness.contact_phone}</span>
                    </div>
                  )}
                  {selectedBusiness.website && (
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-neutral-400" />
                      <a href={selectedBusiness.website} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                        {selectedBusiness.website}
                      </a>
                    </div>
                  )}
                  {selectedBusiness.address && (
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-neutral-400 shrink-0" />
                      <span className="text-neutral-900 dark:text-white">
                        {selectedBusiness.address}
                        {selectedBusiness.city && `, ${selectedBusiness.city}`}
                        {selectedBusiness.country && `, ${selectedBusiness.country}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Owner Info */}
              <div>
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">Owner Information</h3>
                <div className="bg-neutral-50 dark:bg-neutral-700/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">{selectedBusiness.owner?.full_name}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{selectedBusiness.owner?.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleVerify(selectedBusiness.id)}
                  disabled={processing === selectedBusiness.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {processing === selectedBusiness.id ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  Approve
                </button>
                <button
                  onClick={() => handleReject(selectedBusiness.id)}
                  disabled={processing === selectedBusiness.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  <XCircle className="w-5 h-5" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
