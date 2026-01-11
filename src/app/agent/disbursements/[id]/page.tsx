'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  User,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Smartphone,
  Building,
  Banknote,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Camera,
  Send,
  XCircle,
  Pause,
  History,
} from 'lucide-react';

interface Disbursement {
  id: string;
  loan_id: string;
  amount: number;
  currency: string;
  local_amount?: number;
  local_currency?: string;
  exchange_rate?: number;
  disbursement_method: string;
  // Mobile Money
  mobile_provider?: string;
  mobile_number?: string;
  mobile_name?: string;
  // Bank
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_branch?: string;
  // Cash
  pickup_location?: string;
  pickup_code?: string;
  pickup_expires_at?: string;
  // Recipient
  recipient_name: string;
  recipient_phone?: string;
  recipient_id_type?: string;
  recipient_id_number?: string;
  recipient_country?: string;
  // Status
  status: string;
  recipient_verified: boolean;
  recipient_verified_at?: string;
  verification_notes?: string;
  completed_at?: string;
  completion_proof_url?: string;
  completion_notes?: string;
  created_at: string;
  // Loan info
  loan?: {
    id: string;
    amount: number;
    currency: string;
    purpose?: string;
    borrower?: {
      id: string;
      email: string;
      full_name: string;
      phone?: string;
    };
  };
  history?: Array<{
    id: string;
    action: string;
    notes?: string;
    created_at: string;
    metadata?: any;
  }>;
}

export default function DisbursementDetailPage() {
  const router = useRouter();
  const params = useParams();
  const disbursementId = params.id as string;

  const [disbursement, setDisbursement] = useState<Disbursement | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState<string | null>(null);

  useEffect(() => {
    fetchDisbursement();
  }, [disbursementId]);

  const fetchDisbursement = async () => {
    try {
      const response = await fetch(`/api/agent/disbursements/${disbursementId}`);
      if (!response.ok) {
        router.push('/agent/dashboard');
        return;
      }
      const data = await response.json();
      setDisbursement(data.disbursement);
    } catch (error) {
      console.error('Failed to fetch disbursement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, requireNotes = false) => {
    if (requireNotes && !notes.trim()) {
      setShowNotesModal(action);
      return;
    }

    setActionLoading(action);
    try {
      const response = await fetch(`/api/agent/disbursements/${disbursementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes.trim() || undefined }),
      });

      if (response.ok) {
        await fetchDisbursement();
        setNotes('');
        setShowNotesModal(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert('Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'success' | 'warning' | 'danger'; label: string; icon: any }> = {
      pending: { variant: 'warning', label: 'Pending', icon: Clock },
      processing: { variant: 'default', label: 'Processing', icon: Clock },
      ready_for_pickup: { variant: 'warning', label: 'Ready for Pickup', icon: Banknote },
      completed: { variant: 'success', label: 'Completed', icon: CheckCircle },
      failed: { variant: 'danger', label: 'Failed', icon: XCircle },
      on_hold: { variant: 'default', label: 'On Hold', icon: Pause },
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <Badge variant={c.variant} className="text-base px-4 py-2">
        <Icon className="w-4 h-4 mr-2" />
        {c.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!disbursement) {
    return null;
  }

  const isEditable = !['completed', 'failed'].includes(disbursement.status);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/agent/dashboard" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900">
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
            {getStatusBadge(disbursement.status)}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Amount Card */}
        <Card className="mb-6 bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <div className="text-center">
            <p className="text-primary-100">Amount to Disburse</p>
            <p className="text-4xl font-bold mt-2">
              {formatCurrency(disbursement.amount, disbursement.currency)}
            </p>
            {disbursement.local_amount && (
              <p className="text-primary-200 mt-2">
                ≈ {formatCurrency(disbursement.local_amount, disbursement.local_currency || '')}
                {disbursement.exchange_rate && ` (Rate: ${disbursement.exchange_rate})`}
              </p>
            )}
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Recipient Info */}
          <Card>
            <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Recipient Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-neutral-500">Name</span>
                <span className="font-medium">{disbursement.recipient_name}</span>
              </div>
              {disbursement.recipient_phone && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Phone</span>
                  <span className="font-medium">{disbursement.recipient_phone}</span>
                </div>
              )}
              {disbursement.recipient_country && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Country</span>
                  <span className="font-medium">{disbursement.recipient_country}</span>
                </div>
              )}
              {disbursement.recipient_id_type && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">ID Type</span>
                  <span className="font-medium">{disbursement.recipient_id_type}</span>
                </div>
              )}
              {disbursement.recipient_id_number && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">ID Number</span>
                  <span className="font-mono">{disbursement.recipient_id_number}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-neutral-500">Verified</span>
                {disbursement.recipient_verified ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Verified
                  </span>
                ) : (
                  <span className="text-yellow-600">Not Verified</span>
                )}
              </div>
            </div>
          </Card>

          {/* Disbursement Method */}
          <Card>
            <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              {disbursement.disbursement_method === 'mobile_money' && <Smartphone className="w-5 h-5" />}
              {disbursement.disbursement_method === 'bank_transfer' && <Building className="w-5 h-5" />}
              {disbursement.disbursement_method === 'cash_pickup' && <Banknote className="w-5 h-5" />}
              {disbursement.disbursement_method === 'mobile_money' && 'Mobile Money'}
              {disbursement.disbursement_method === 'bank_transfer' && 'Bank Transfer'}
              {disbursement.disbursement_method === 'cash_pickup' && 'Cash Pickup'}
            </h3>
            
            {disbursement.disbursement_method === 'mobile_money' && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Provider</span>
                  <span className="font-medium">{disbursement.mobile_provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Number</span>
                  <span className="font-mono">{disbursement.mobile_number}</span>
                </div>
                {disbursement.mobile_name && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Name on Account</span>
                    <span className="font-medium">{disbursement.mobile_name}</span>
                  </div>
                )}
              </div>
            )}

            {disbursement.disbursement_method === 'bank_transfer' && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Bank</span>
                  <span className="font-medium">{disbursement.bank_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Account Name</span>
                  <span className="font-medium">{disbursement.bank_account_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Account Number</span>
                  <span className="font-mono">{disbursement.bank_account_number}</span>
                </div>
                {disbursement.bank_branch && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Branch</span>
                    <span className="font-medium">{disbursement.bank_branch}</span>
                  </div>
                )}
              </div>
            )}

            {disbursement.disbursement_method === 'cash_pickup' && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Location</span>
                  <span className="font-medium">{disbursement.pickup_location}</span>
                </div>
                <div className="pt-3 mt-3 border-t">
                  <p className="text-neutral-500 text-sm mb-2">Pickup Code</p>
                  <div className="bg-neutral-100 p-4 rounded-xl text-center">
                    <span className="text-3xl font-bold font-mono tracking-widest">
                      {disbursement.pickup_code}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Borrower Info */}
        <Card className="mb-6">
          <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Borrower (Diaspora)
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-neutral-500" />
              </div>
              <div>
                <p className="font-medium">{disbursement.loan?.borrower?.full_name || 'Unknown'}</p>
                <p className="text-sm text-neutral-500">{disbursement.loan?.borrower?.email}</p>
              </div>
            </div>
            {disbursement.loan?.borrower?.phone && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-neutral-500" />
                </div>
                <div>
                  <p className="font-medium">{disbursement.loan?.borrower?.phone}</p>
                  <p className="text-sm text-neutral-500">Phone</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Actions */}
        {isEditable && (
          <Card className="mb-6">
            <h3 className="font-semibold text-neutral-900 mb-4">Actions</h3>
            <div className="flex flex-wrap gap-3">
              {disbursement.status === 'pending' && (
                <Button
                  onClick={() => handleAction('assign')}
                  loading={actionLoading === 'assign'}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Assign to Me & Start Processing
                </Button>
              )}

              {!disbursement.recipient_verified && disbursement.status !== 'pending' && (
                <Button
                  variant="outline"
                  onClick={() => handleAction('verify', true)}
                  loading={actionLoading === 'verify'}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify Recipient
                </Button>
              )}

              {disbursement.status === 'processing' && disbursement.disbursement_method === 'cash_pickup' && (
                <Button
                  onClick={() => handleAction('ready_for_pickup')}
                  loading={actionLoading === 'ready_for_pickup'}
                >
                  <Banknote className="w-4 h-4 mr-2" />
                  Mark Ready for Pickup
                </Button>
              )}

              {['processing', 'ready_for_pickup'].includes(disbursement.status) && (
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleAction('complete', true)}
                  loading={actionLoading === 'complete'}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Complete Disbursement
                </Button>
              )}

              {isEditable && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleAction('hold', true)}
                    loading={actionLoading === 'hold'}
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Put on Hold
                  </Button>

                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleAction('fail', true)}
                    loading={actionLoading === 'fail'}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Mark as Failed
                  </Button>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Notes Modal */}
        {showNotesModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <h3 className="font-semibold text-neutral-900 mb-4">Add Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter notes for this action..."
                className="w-full p-3 border border-neutral-200 rounded-xl min-h-[100px] focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowNotesModal(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => handleAction(showNotesModal)}
                  loading={actionLoading === showNotesModal}
                >
                  Confirm
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* History */}
        {disbursement.history && disbursement.history.length > 0 && (
          <Card>
            <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <History className="w-5 h-5" />
              Activity History
            </h3>
            <div className="space-y-4">
              {disbursement.history.map((h, i) => (
                <div key={h.id} className="flex gap-4">
                  <div className="relative">
                    <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center">
                      <Clock className="w-4 h-4 text-neutral-500" />
                    </div>
                    {i < disbursement.history!.length - 1 && (
                      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-full bg-neutral-200" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-medium text-neutral-900 capitalize">{h.action.replace('_', ' ')}</p>
                    {h.notes && <p className="text-sm text-neutral-500 mt-1">{h.notes}</p>}
                    <p className="text-xs text-neutral-400 mt-1">
                      {new Date(h.created_at).toLocaleString()}
                      {h.metadata?.agent_name && ` • ${h.metadata.agent_name}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
