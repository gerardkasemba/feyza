'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('admin_page');

import React, { useEffect, useState } from 'react';
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
  Briefcase,
  MapPin,
  CreditCard,
  ExternalLink,
  AlertCircle,
  Camera,
  Shield,
} from 'lucide-react';

interface PendingBusiness {
  id: string;
  business_name: string;
  business_type: string;
  contact_email: string;
  contact_phone?: string;
  website_url?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  ein_tax_id?: string;
  years_in_business?: number;
  verification_status: string;
  created_at: string;
  owner?: { id: string; full_name: string; email: string } | null;
}

interface PendingUser {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  date_of_birth?: string;
  verification_status: string;
  verification_submitted_at?: string;
  verified_at?: string;
  reverification_required?: boolean;
  verification_count?: number;
  // Identity
  id_type?: string;
  id_number?: string;
  id_front_url?: string;
  id_back_url?: string;
  id_document_url?: string;
  id_expiry?: string;
  id_expiry_date?: string;
  // Selfie
  selfie_url?: string;
  selfie_verified?: boolean;
  // Employment
  employment_status?: string;
  employer_name?: string;
  job_title?: string;
  employer_address?: string;
  employment_start_date?: string;
  employment_document_url?: string;
  monthly_income?: number;
  monthly_income_range?: string;
  // Address
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  address_document_url?: string;
  address_document_type?: string;
  // SSN
  ssn_last4?: string;
  created_at: string;
  pending_loan_requests?: {
    id: string;
    amount: number;
    purpose: string;
    description?: string;
    term_months: number;
    business_lender?: { id: string; business_name: string } | null;
  }[];
}

type Tab = 'users' | 'businesses';

export default function VerificationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingBusinesses, setPendingBusinesses] = useState<PendingBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<PendingBusiness | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchVerifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/verifications');
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to fetch verifications');
        return;
      }
      
      setPendingUsers(data.users || []);
      setPendingBusinesses(data.businesses || []);
    } catch (err: unknown) {
      log.error('Error fetching verifications:', err);
      setError((err as Error).message || 'Failed to fetch verifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const handleAction = async (type: 'user' | 'business', id: string, action: 'approve' | 'reject', reason?: string) => {
    setProcessing(id);
    
    try {
      const response = await fetch('/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, action, reason })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        alert(data.error || 'Failed to process verification');
        return;
      }
      
      // Remove from list
      if (type === 'user') {
        setPendingUsers(pendingUsers.filter(u => u.id !== id));
        setSelectedUser(null);
      } else {
        setPendingBusinesses(pendingBusinesses.filter(b => b.id !== id));
        setSelectedBusiness(null);
      }
    } catch (err: unknown) {
      log.error('Error processing verification:', err);
      alert((err as Error).message || 'Failed to process verification');
    } finally {
      setProcessing(null);
    }
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

  const totalPending = pendingUsers.length + pendingBusinesses.length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <ClipboardCheck className="w-7 h-7 text-emerald-500" />
            Pending Verifications
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {totalPending} total pending ({pendingUsers.length} users, {pendingBusinesses.length} businesses)
          </p>
        </div>
        <button
          onClick={fetchVerifications}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-700">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Borrowers / Users
            {pendingUsers.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">
                {pendingUsers.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('businesses')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'businesses'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Business Lenders
            {pendingBusinesses.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                {pendingBusinesses.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <>
          {pendingUsers.length === 0 ? (
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">All caught up!</h3>
              <p className="text-neutral-500 dark:text-neutral-400">No pending user verifications.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-neutral-900 dark:text-white truncate">{user.full_name}</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    {user.id_type && (
                      <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                        <CreditCard className="w-4 h-4 text-neutral-400" />
                        <span>{user.id_type.replace(/_/g, ' ')}: {user.id_number}</span>
                      </div>
                    )}
                    {user.employer_name && (
                      <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                        <Briefcase className="w-4 h-4 text-neutral-400" />
                        <span className="truncate">{user.employer_name}</span>
                      </div>
                    )}
                    {user.city && (
                      <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                        <MapPin className="w-4 h-4 text-neutral-400" />
                        <span>{user.city}, {user.country}</span>
                      </div>
                    )}
                    {user.pending_loan_requests && user.pending_loan_requests.length > 0 && (
                      <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                          Pending Loan: ${user.pending_loan_requests[0].amount.toLocaleString()} 
                          {user.pending_loan_requests[0].business_lender?.business_name && 
                            ` with ${user.pending_loan_requests[0].business_lender.business_name}`}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                      <Calendar className="w-4 h-4 text-neutral-400" />
                      <span>Submitted {user.verification_submitted_at ? format(new Date(user.verification_submitted_at), 'MMM d, yyyy') : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Review
                    </button>
                    <button
                      onClick={() => handleAction('user', user.id, 'approve')}
                      disabled={processing === user.id}
                      className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {processing === user.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleAction('user', user.id, 'reject')}
                      disabled={processing === user.id}
                      className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 text-red-700 dark:text-red-300 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Businesses Tab */}
      {activeTab === 'businesses' && (
        <>
          {pendingBusinesses.length === 0 ? (
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">All caught up!</h3>
              <p className="text-neutral-500 dark:text-neutral-400">No pending business verifications.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingBusinesses.map((business) => (
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
                    {business.ein_tax_id && (
                      <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                        <FileText className="w-4 h-4 text-neutral-400" />
                        <span>EIN: {business.ein_tax_id}</span>
                      </div>
                    )}
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
                      onClick={() => handleAction('business', business.id, 'approve')}
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
                      onClick={() => handleAction('business', business.id, 'reject')}
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
        </>
      )}

      {/* User Review Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Review User Verification</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* User Info */}
              <div>
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">Personal Information</h3>
                <div className="bg-neutral-50 dark:bg-neutral-700/30 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Name</span>
                    <span className="font-medium text-neutral-900 dark:text-white">{selectedUser.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Email</span>
                    <span className="font-medium text-neutral-900 dark:text-white">{selectedUser.email}</span>
                  </div>
                  {selectedUser.phone_number && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">Phone</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedUser.phone_number}</span>
                    </div>
                  )}
                  {selectedUser.date_of_birth && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">Date of Birth</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedUser.date_of_birth}</span>
                    </div>
                  )}
                  {selectedUser.ssn_last4 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">SSN (Last 4)</span>
                      <span className="font-medium text-neutral-900 dark:text-white">••• {selectedUser.ssn_last4}</span>
                    </div>
                  )}
                  {selectedUser.verification_submitted_at && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">Submitted</span>
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {format(new Date(selectedUser.verification_submitted_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ID Verification */}
              <div>
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">Identity Document</h3>
                <div className="bg-neutral-50 dark:bg-neutral-700/30 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">ID Type</span>
                    <span className="font-medium text-neutral-900 dark:text-white capitalize">{selectedUser.id_type?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">ID Number</span>
                    <span className="font-medium text-neutral-900 dark:text-white">{selectedUser.id_number}</span>
                  </div>
                  {(selectedUser.id_expiry_date || selectedUser.id_expiry) && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">Expiry</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedUser.id_expiry || selectedUser.id_expiry_date}</span>
                    </div>
                  )}
                  {/* ID Images */}
                  <div className="pt-2 grid grid-cols-2 gap-3">
                    {(selectedUser.id_front_url || selectedUser.id_document_url) && (
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">Front</p>
                        <a
                          href={selectedUser.id_front_url || selectedUser.id_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img 
                            src={selectedUser.id_front_url || selectedUser.id_document_url} 
                            alt="ID Front" 
                            className="w-full h-24 object-cover rounded-lg border border-neutral-200 dark:border-neutral-600 hover:opacity-80 transition-opacity"
                          />
                        </a>
                      </div>
                    )}
                    {selectedUser.id_back_url && (
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">Back</p>
                        <a
                          href={selectedUser.id_back_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img 
                            src={selectedUser.id_back_url} 
                            alt="ID Back" 
                            className="w-full h-24 object-cover rounded-lg border border-neutral-200 dark:border-neutral-600 hover:opacity-80 transition-opacity"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Selfie Verification */}
              {selectedUser.selfie_url && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">Selfie Verification</h3>
                  <div className="bg-neutral-50 dark:bg-neutral-700/30 rounded-xl p-4">
                    <a
                      href={selectedUser.selfie_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img 
                        src={selectedUser.selfie_url} 
                        alt="Selfie with ID" 
                        className="w-full h-48 object-cover rounded-lg border border-neutral-200 dark:border-neutral-600 hover:opacity-80 transition-opacity"
                      />
                    </a>
                    <p className="text-xs text-neutral-500 mt-2 text-center">Click to view full size</p>
                    {selectedUser.reverification_required && (
                      <div className="mt-3 p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        Re-verification submission
                      </div>
                    )}
                    {selectedUser.verification_count && selectedUser.verification_count > 1 && (
                      <p className="text-xs text-neutral-500 mt-2 text-center">
                        Verified {selectedUser.verification_count} times
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Employment */}
              <div>
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">Employment</h3>
                <div className="bg-neutral-50 dark:bg-neutral-700/30 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Status</span>
                    <span className="font-medium text-neutral-900 dark:text-white capitalize">{selectedUser.employment_status?.replace(/_/g, ' ')}</span>
                  </div>
                  {selectedUser.employer_name && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">Employer</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedUser.employer_name}</span>
                    </div>
                  )}
                  {selectedUser.job_title && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">Job Title</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedUser.job_title}</span>
                    </div>
                  )}
                  {selectedUser.employment_start_date && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">Since</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedUser.employment_start_date}</span>
                    </div>
                  )}
                  {(selectedUser.monthly_income || selectedUser.monthly_income_range) && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">Monthly Income</span>
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {selectedUser.monthly_income 
                          ? `$${selectedUser.monthly_income.toLocaleString()}`
                          : `$${selectedUser.monthly_income_range?.replace('-', ' - $')}/mo`
                        }
                      </span>
                    </div>
                  )}
                  {selectedUser.employment_document_url && (
                    <div className="pt-2">
                      <a
                        href={selectedUser.employment_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img 
                          src={selectedUser.employment_document_url} 
                          alt="Employment Proof" 
                          className="w-full h-24 object-cover rounded-lg border border-neutral-200 dark:border-neutral-600 hover:opacity-80 transition-opacity"
                        />
                      </a>
                      <p className="text-xs text-neutral-500 mt-1">Employment proof document</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">Address</h3>
                <div className="bg-neutral-50 dark:bg-neutral-700/30 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Address</span>
                    <span className="font-medium text-neutral-900 dark:text-white text-right">
                      {selectedUser.address_line1}
                      {selectedUser.address_line2 && <><br />{selectedUser.address_line2}</>}
                      <br />
                      {selectedUser.city}, {selectedUser.state_province} {selectedUser.postal_code}
                      <br />
                      {selectedUser.country}
                    </span>
                  </div>
                  {selectedUser.address_document_type && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">Proof Type</span>
                      <span className="font-medium text-neutral-900 dark:text-white capitalize">{selectedUser.address_document_type.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  {selectedUser.address_document_url && (
                    <div className="pt-2">
                      <a
                        href={selectedUser.address_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img 
                          src={selectedUser.address_document_url} 
                          alt="Address Proof" 
                          className="w-full h-24 object-cover rounded-lg border border-neutral-200 dark:border-neutral-600 hover:opacity-80 transition-opacity"
                        />
                      </a>
                      <p className="text-xs text-neutral-500 mt-1">Address proof document</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pending Loan */}
              {selectedUser.pending_loan_requests && selectedUser.pending_loan_requests.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">Pending Loan Request</h3>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-amber-700 dark:text-amber-400">Amount</span>
                      <span className="font-bold text-amber-800 dark:text-amber-300">
                        ${selectedUser.pending_loan_requests[0].amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-700 dark:text-amber-400">Purpose</span>
                      <span className="font-medium text-amber-800 dark:text-amber-300">
                        {selectedUser.pending_loan_requests[0].purpose}
                      </span>
                    </div>
                    {selectedUser.pending_loan_requests[0].term_months && (
                      <div className="flex justify-between mt-2">
                        <span className="text-amber-700 dark:text-amber-400">Term</span>
                        <span className="font-medium text-amber-800 dark:text-amber-300">
                          {selectedUser.pending_loan_requests[0].term_months} months
                        </span>
                      </div>
                    )}
                    {selectedUser.pending_loan_requests[0].business_lender?.business_name && (
                      <div className="flex justify-between mt-2">
                        <span className="text-amber-700 dark:text-amber-400">Lender</span>
                        <span className="font-medium text-amber-800 dark:text-amber-300">
                          {selectedUser.pending_loan_requests[0].business_lender.business_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* All Documents Gallery */}
              <div>
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">All Uploaded Documents</h3>
                <div className="bg-neutral-50 dark:bg-neutral-700/30 rounded-xl p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {/* ID Front */}
                    {(selectedUser.id_front_url || selectedUser.id_document_url) && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">ID Front</p>
                        <a
                          href={selectedUser.id_front_url || selectedUser.id_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block group"
                        >
                          <img 
                            src={selectedUser.id_front_url || selectedUser.id_document_url} 
                            alt="ID Front" 
                            className="w-full h-28 object-cover rounded-lg border-2 border-neutral-200 dark:border-neutral-600 group-hover:border-emerald-500 transition-colors"
                          />
                        </a>
                      </div>
                    )}
                    
                    {/* ID Back */}
                    {selectedUser.id_back_url && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">ID Back</p>
                        <a
                          href={selectedUser.id_back_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block group"
                        >
                          <img 
                            src={selectedUser.id_back_url} 
                            alt="ID Back" 
                            className="w-full h-28 object-cover rounded-lg border-2 border-neutral-200 dark:border-neutral-600 group-hover:border-emerald-500 transition-colors"
                          />
                        </a>
                      </div>
                    )}
                    
                    {/* Selfie */}
                    {selectedUser.selfie_url && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Selfie with ID</p>
                        <a
                          href={selectedUser.selfie_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block group"
                        >
                          <img 
                            src={selectedUser.selfie_url} 
                            alt="Selfie" 
                            className="w-full h-28 object-cover rounded-lg border-2 border-neutral-200 dark:border-neutral-600 group-hover:border-emerald-500 transition-colors"
                          />
                        </a>
                      </div>
                    )}
                    
                    {/* Employment Document */}
                    {selectedUser.employment_document_url && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Employment Proof</p>
                        <a
                          href={selectedUser.employment_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block group"
                        >
                          <img 
                            src={selectedUser.employment_document_url} 
                            alt="Employment" 
                            className="w-full h-28 object-cover rounded-lg border-2 border-neutral-200 dark:border-neutral-600 group-hover:border-emerald-500 transition-colors"
                          />
                        </a>
                      </div>
                    )}
                    
                    {/* Address Document */}
                    {selectedUser.address_document_url && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Address Proof</p>
                        <a
                          href={selectedUser.address_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block group"
                        >
                          <img 
                            src={selectedUser.address_document_url} 
                            alt="Address" 
                            className="w-full h-28 object-cover rounded-lg border-2 border-neutral-200 dark:border-neutral-600 group-hover:border-emerald-500 transition-colors"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                  
                  {/* No documents message */}
                  {!selectedUser.id_front_url && !selectedUser.id_document_url && !selectedUser.id_back_url && 
                   !selectedUser.selfie_url && !selectedUser.employment_document_url && !selectedUser.address_document_url && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">
                      No documents uploaded
                    </p>
                  )}
                  
                  <p className="text-xs text-neutral-500 mt-3 text-center">Click any image to view full size</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleAction('user', selectedUser.id, 'approve')}
                  disabled={processing === selectedUser.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {processing === selectedUser.id ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  Approve
                </button>
                <button
                  onClick={() => handleAction('user', selectedUser.id, 'reject')}
                  disabled={processing === selectedUser.id}
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

      {/* Business Review Modal */}
      {selectedBusiness && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Review Business Application</h2>
                <button
                  onClick={() => setSelectedBusiness(null)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
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
                  {selectedBusiness.ein_tax_id && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">EIN/Tax ID</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedBusiness.ein_tax_id}</span>
                    </div>
                  )}
                  {selectedBusiness.years_in_business && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">Years in Business</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{selectedBusiness.years_in_business}</span>
                    </div>
                  )}
                </div>
              </div>

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
                  {selectedBusiness.website_url && (
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-neutral-400" />
                      <a href={selectedBusiness.website_url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                        {selectedBusiness.website_url}
                      </a>
                    </div>
                  )}
                  {(selectedBusiness.location || selectedBusiness.city) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-neutral-400 shrink-0" />
                      <span className="text-neutral-900 dark:text-white">
                        {selectedBusiness.location || `${selectedBusiness.city}, ${selectedBusiness.state || ''} ${selectedBusiness.country || ''}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">Owner Information</h3>
                <div className="bg-neutral-50 dark:bg-neutral-700/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">{selectedBusiness.owner?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{selectedBusiness.owner?.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleAction('business', selectedBusiness.id, 'approve')}
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
                  onClick={() => handleAction('business', selectedBusiness.id, 'reject')}
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
