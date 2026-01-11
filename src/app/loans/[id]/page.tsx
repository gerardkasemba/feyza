'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Badge, Progress, Avatar } from '@/components/ui';
import { LoanTimeline, PaymentModal } from '@/components/loans';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getLoanProgress } from '@/lib/utils';
import { Loan, PaymentScheduleItem, LoanStatus } from '@/types';
import { PaymentFormData } from '@/lib/validations';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Banknote,
  UserCheck,
  Building,
  CreditCard,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Bell,
  MessageSquare,
  FileText,
  Download,
} from 'lucide-react';

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<PaymentScheduleItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<PaymentScheduleItem | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Funds sending state
  const [showFundsModal, setShowFundsModal] = useState(false);
  const [fundsSending, setFundsSending] = useState(false);
  const [fundsReference, setFundsReference] = useState('');
  const [fundsPaymentMethod, setFundsPaymentMethod] = useState<'paypal' | 'cashapp' | 'venmo'>('paypal');
  const [fundsProofFile, setFundsProofFile] = useState<File | null>(null);
  const [fundsProofPreview, setFundsProofPreview] = useState<string | null>(null);

  // Reminder state
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [showReminderModal, setShowReminderModal] = useState(false);

  const loanId = params.id as string;

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/auth/signin');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setUser(profile || {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || 'User',
        user_type: authUser.user_metadata?.user_type || 'individual',
      });

      // Fetch loan with relations
      const { data: loanData, error } = await supabase
        .from('loans')
        .select(`
          *,
          borrower:users!borrower_id(*),
          lender:users!lender_id(*),
          business_lender:business_profiles!business_lender_id(*),
          guest_lender:guest_lenders!guest_lender_id(*)
        `)
        .eq('id', loanId)
        .single();

      if (error || !loanData) {
        router.push('/dashboard');
        return;
      }

      // Check if user has access to this loan
      // User can see loan if they are: borrower, lender, or owner of business_lender
      let hasAccess = false;
      
      if (loanData.borrower_id === authUser.id) {
        hasAccess = true;
      } else if (loanData.lender_id === authUser.id) {
        hasAccess = true;
      } else if (loanData.business_lender_id) {
        // Check if user owns this business
        const { data: businessProfile } = await supabase
          .from('business_profiles')
          .select('id')
          .eq('id', loanData.business_lender_id)
          .eq('user_id', authUser.id)
          .single();
        
        if (businessProfile) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        console.log('User does not have access to this loan');
        router.push('/dashboard');
        return;
      }

      // Determine lender info (user, business, or guest)
      const lenderInfo = loanData.lender || loanData.business_lender || loanData.guest_lender;
      
      setLoan({
        ...loanData,
        lender: lenderInfo,
      });

      // Fetch payment schedule
      const { data: scheduleData } = await supabase
        .from('payment_schedule')
        .select('*')
        .eq('loan_id', loanId)
        .order('due_date', { ascending: true });

      setSchedule(scheduleData || []);
      setIsLoading(false);
    };

    fetchData();
  }, [loanId, router]);

  const handleMarkPaid = async (data: PaymentFormData) => {
    if (!selectedScheduleItem || !loan) return;

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: loan.id,
          scheduleId: selectedScheduleItem.id,
          amount: data.amount,
          note: data.note,
          proofUrl: data.proofUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment');
      }

      const result = await response.json();

      // Refresh data
      setLoan({
        ...loan,
        amount_paid: result.loan.amount_paid,
        amount_remaining: result.loan.amount_remaining,
        status: result.loan.status,
      });

      setSchedule(schedule.map((item) =>
        item.id === selectedScheduleItem.id
          ? { ...item, is_paid: true, payment_id: result.payment.id }
          : item
      ));

      setShowPaymentModal(false);
      setSelectedScheduleItem(null);
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Failed to record payment. Please try again.');
    }
  };

  const handleSendReminder = async (paymentId?: string) => {
    if (!loan) return;
    
    setSendingReminder(true);
    try {
      const response = await fetch(`/api/loans/${loan.id}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_id: loan.id,
          payment_id: paymentId,
          message: reminderMessage,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send reminder');
      }

      alert('Reminder sent successfully!');
      setShowReminderModal(false);
      setReminderMessage('');
      
      // Refresh schedule to show updated reminder timestamp
      const supabase = createClient();
      const { data: scheduleData } = await supabase
        .from('payment_schedule')
        .select('*')
        .eq('loan_id', loan.id)
        .order('due_date', { ascending: true });
      setSchedule(scheduleData || []);
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      alert(error.message || 'Failed to send reminder. Please try again.');
    } finally {
      setSendingReminder(false);
    }
  };

  const handleAcceptLoan = async () => {
    if (!loan) return;
    
    try {
      const response = await fetch(`/api/loans/${loan.id}/accept`, {
        method: 'POST',
      });

      if (response.redirected) {
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Error accepting loan:', error);
    }
  };

  const handleDeclineLoan = async () => {
    if (!loan) return;
    
    try {
      const response = await fetch(`/api/loans/${loan.id}/decline`, {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error declining loan:', error);
    }
  };

  const handleCancelLoan = async () => {
    if (!loan) return;
    
    if (!confirm('Are you sure you want to cancel this loan request?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/loans/${loan.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by borrower' }),
      });

      if (response.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error cancelling loan:', error);
    }
  };

  const handleSendFunds = async () => {
    if (!loan) return;
    
    // Require proof of payment
    if (!fundsProofFile) {
      alert('Please upload a screenshot proof of payment');
      return;
    }
    
    setFundsSending(true);
    try {
      const supabase = createClient();
      
      // Upload proof image to Supabase Storage
      const fileExt = fundsProofFile.name.split('.').pop();
      const fileName = `${loan.id}_${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('loan-documents')
        .upload(filePath, fundsProofFile);
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        // Continue anyway - the API will work without the proof URL
      }
      
      // Get public URL for the proof
      let proofUrl = null;
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('loan-documents')
          .getPublicUrl(filePath);
        proofUrl = publicUrl;
      }
      
      const response = await fetch(`/api/loans/${loan.id}/funds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: fundsPaymentMethod,
          reference: fundsReference,
          proof_url: proofUrl,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update loan state
        setLoan({
          ...loan,
          funds_sent: true,
          funds_sent_at: new Date().toISOString(),
          funds_sent_method: fundsPaymentMethod,
          status: result.status || 'active',
        } as any);
        setShowFundsModal(false);
        setFundsReference('');
        setFundsProofFile(null);
        setFundsProofPreview(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to confirm funds sent');
      }
    } catch (error) {
      console.error('Error sending funds:', error);
      alert('Failed to confirm funds sent');
    } finally {
      setFundsSending(false);
    }
  };

  if (isLoading || !loan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  const isBorrower = loan.borrower_id === user?.id;
  // Check if user is lender (either direct or via business)
  const isLender = loan.lender_id === user?.id || 
    (loan.business_lender && (loan.business_lender as any).user_id === user?.id);
  const progress = getLoanProgress(loan.amount_paid, loan.amount);
  
  const otherParty = isBorrower ? loan.lender : loan.borrower;
  const otherPartyName = otherParty 
    ? ('business_name' in otherParty ? otherParty.business_name : otherParty.full_name)
    : loan.invite_email || 'Pending acceptance';

  // Extended status config with pending_funds and pending_disbursement
  const statusConfig: Record<string, { color: 'default' | 'success' | 'warning' | 'danger' | 'info'; icon: any; label: string }> = {
    pending: { color: 'warning', icon: Clock, label: 'Pending' },
    pending_funds: { color: 'warning', icon: Clock, label: 'Awaiting Funds' },
    pending_disbursement: { color: 'info', icon: Clock, label: 'Disbursing' },
    active: { color: 'success', icon: CheckCircle, label: 'Active' },
    completed: { color: 'info', icon: CheckCircle, label: 'Completed' },
    declined: { color: 'danger', icon: XCircle, label: 'Declined' },
    cancelled: { color: 'default', icon: XCircle, label: 'Cancelled' },
  };

  const { color: statusColor, icon: StatusIcon, label: statusLabel } = statusConfig[loan.status] || statusConfig.pending;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Navbar user={user} />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>

          {/* Loan Header */}
          <Card className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <Avatar name={otherPartyName} size="lg" />
                <div>
                  <h1 className="text-2xl font-display font-bold text-neutral-900">
                    {otherPartyName}
                  </h1>
                  <p className="text-neutral-500">
                    {isBorrower ? 'Lender' : 'Borrower'} • {loan.lender_type === 'business' ? 'Business' : 'Personal'}
                  </p>
                </div>
              </div>
              <Badge variant={statusColor} size="md">
                <StatusIcon className="w-4 h-4 mr-1" />
                {statusLabel}
              </Badge>
            </div>

            {/* Lender Payment Section - Show when lender hasn't sent payment yet */}
            {loan.status === 'active' && !loan.funds_sent && isLender && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Banknote className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-800">Action Required: Send Payment to Borrower</h3>
                </div>
                
                <p className="text-yellow-700 text-sm mb-4">
                  Please send <strong>{formatCurrency(loan.amount, loan.currency)}</strong> to <strong>{(loan.borrower as any)?.full_name || 'the borrower'}</strong>
                </p>
                
                {/* Show ONLY borrower's preferred payment method */}
                {(() => {
                  const borrower = loan.borrower as any;
                  const preferred = borrower?.preferred_payment_method;
                  
                  // Determine which method to show
                  let methodToShow = preferred;
                  if (!methodToShow) {
                    // Fallback: show first available method
                    if (borrower?.paypal_email) methodToShow = 'paypal';
                    else if (borrower?.cashapp_username) methodToShow = 'cashapp';
                    else if (borrower?.venmo_username) methodToShow = 'venmo';
                  }
                  
                  if (!methodToShow) {
                    return (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <p className="text-red-700 text-sm">
                          ⚠️ Borrower hasn't set up any payment methods yet. Please contact them to add PayPal, Cash App, or Venmo in Settings.
                        </p>
                      </div>
                    );
                  }
                  
                  const methodConfigs: Record<string, { bg: string, hoverBg: string, icon: React.ReactNode, name: string, value: string | undefined, getLink: (amount: number) => string }> = {
                    paypal: {
                      bg: 'bg-[#0070ba]',
                      hoverBg: 'hover:bg-[#003087]',
                      icon: <CreditCard className="w-6 h-6 text-white" />,
                      name: 'PayPal',
                      value: borrower?.paypal_email,
                      getLink: (amount) => `https://www.paypal.com/paypalme/${borrower?.paypal_email?.split('@')[0]}/${amount}`,
                    },
                    cashapp: {
                      bg: 'bg-[#00D632]',
                      hoverBg: 'hover:bg-[#00B82B]',
                      icon: <span className="text-white font-bold text-2xl">$</span>,
                      name: 'Cash App',
                      value: borrower?.cashapp_username,
                      getLink: (amount) => `https://cash.app/${borrower?.cashapp_username}/${amount}`,
                    },
                    venmo: {
                      bg: 'bg-[#3D95CE]',
                      hoverBg: 'hover:bg-[#2B7AB5]',
                      icon: <span className="text-white font-bold text-2xl">V</span>,
                      name: 'Venmo',
                      value: borrower?.venmo_username,
                      getLink: (amount) => `https://venmo.com/${borrower?.venmo_username?.replace('@', '')}?txn=pay&amount=${amount}&note=Loan%20from%20LoanTrack`,
                    },
                  };
                  
                  const config = methodConfigs[methodToShow];
                  if (!config || !config.value) {
                    return (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <p className="text-red-700 text-sm">
                          ⚠️ Borrower's preferred payment method ({methodToShow}) is not set up. Please contact them.
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="mb-4">
                      <div className={`${config.bg} rounded-xl p-4 text-white`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                              {config.icon}
                            </div>
                            <div>
                              <p className="text-white/80 text-sm">Send via {config.name}</p>
                              <p className="font-bold text-xl">{config.value}</p>
                            </div>
                          </div>
                          <a
                            href={config.getLink(loan.amount)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-6 py-3 bg-white text-neutral-900 rounded-lg font-semibold hover:bg-neutral-100 transition-colors flex items-center gap-2`}
                          >
                            Open {config.name} <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Confirm Payment Button */}
                {((loan.borrower as any)?.paypal_email || (loan.borrower as any)?.cashapp_username || (loan.borrower as any)?.venmo_username) && (
                  <Button
                    onClick={() => setShowFundsModal(true)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    I've Sent the Payment - Upload Proof
                  </Button>
                )}
              </div>
            )}

            {/* Borrower Waiting Section - Show when borrower is waiting for payment */}
            {loan.status === 'active' && !loan.funds_sent && isBorrower && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">Waiting for Lender Payment</h3>
                </div>
                <p className="text-blue-700 text-sm mb-3">
                  Your loan has been approved! The lender will send <strong>{formatCurrency(loan.amount, loan.currency)}</strong> to you. 
                  You'll be notified once the payment is sent.
                </p>
                
                {/* Show borrower's payment methods */}
                <div className="bg-white/60 rounded-lg p-3 text-sm">
                  <p className="font-medium text-blue-800 mb-2">Your payment methods:</p>
                  <div className="space-y-1 text-blue-700">
                    {(loan.borrower as any)?.paypal_email && (
                      <p>PayPal: {(loan.borrower as any).paypal_email}</p>
                    )}
                    {(loan.borrower as any)?.cashapp_username && (
                      <p>Cash App: {(loan.borrower as any).cashapp_username}</p>
                    )}
                    {(loan.borrower as any)?.venmo_username && (
                      <p>Venmo: {(loan.borrower as any).venmo_username}</p>
                    )}
                    {!(loan.borrower as any)?.paypal_email && !(loan.borrower as any)?.cashapp_username && !(loan.borrower as any)?.venmo_username && (
                      <p className="text-amber-600">⚠️ No payment methods set up. <a href="/settings?tab=payments" className="underline">Add one now →</a></p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Sent Confirmation */}
            {loan.status === 'active' && loan.funds_sent && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">
                    {isLender ? 'Payment Sent!' : 'Payment Received!'}
                  </span>
                </div>
                <p className="text-green-700 text-sm">
                  {isLender 
                    ? `You sent ${formatCurrency(loan.amount, loan.currency)} to ${(loan.borrower as any)?.full_name || 'the borrower'}. Repayments begin ${formatDate(loan.start_date)}.`
                    : `The lender sent you ${formatCurrency(loan.amount, loan.currency)}. Your repayment schedule starts ${formatDate(loan.start_date)}.`
                  }
                </p>
              </div>
            )}

            {/* Loan Amount & Progress */}
            <div className="bg-neutral-50 rounded-2xl p-6 mb-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Principal</p>
                  <p className="text-3xl font-bold text-neutral-900">
                    {formatCurrency(loan.amount, loan.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Paid</p>
                  <p className="text-3xl font-bold text-primary-600">
                    {formatCurrency(loan.amount_paid, loan.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Remaining</p>
                  <p className="text-3xl font-bold text-neutral-700">
                    {formatCurrency(loan.amount_remaining, loan.currency)}
                  </p>
                </div>
              </div>

              {/* Interest Information */}
              {loan.interest_rate > 0 && (
                <div className="mt-4 pt-4 border-t border-neutral-200 grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-500">Interest Rate</p>
                    <p className="font-semibold text-neutral-900">{loan.interest_rate}% APR ({loan.interest_type})</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Total Interest</p>
                    <p className="font-semibold text-orange-600">{formatCurrency(loan.total_interest, loan.currency)}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Total to Repay</p>
                    <p className="font-semibold text-neutral-900">{formatCurrency(loan.total_amount, loan.currency)}</p>
                  </div>
                </div>
              )}
              
              {loan.status === 'active' && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-500">Progress</span>
                    <span className="font-medium text-neutral-700">{progress}%</span>
                  </div>
                  <Progress value={progress} size="lg" />
                </div>
              )}
            </div>

            {/* Loan Details */}
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              {loan.purpose && (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-neutral-400 mt-0.5" />
                  <div>
                    <p className="text-neutral-500">Purpose</p>
                    <p className="text-neutral-900">{loan.purpose}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-neutral-400 mt-0.5" />
                <div>
                  <p className="text-neutral-500">Repayment Schedule</p>
                  <p className="text-neutral-900">
                    {formatCurrency(loan.repayment_amount, loan.currency)} / {loan.repayment_frequency}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-neutral-400 mt-0.5" />
                <div>
                  <p className="text-neutral-500">Start Date</p>
                  <p className="text-neutral-900">{formatDate(loan.start_date)}</p>
                </div>
              </div>
              {loan.pickup_person_name && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-neutral-400 mt-0.5" />
                  <div>
                    <p className="text-neutral-500">Pickup Person</p>
                    <p className="text-neutral-900">
                      {loan.pickup_person_name}
                      {loan.pickup_person_location && ` (${loan.pickup_person_location})`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Payment Timeline */}
          {loan.status === 'active' && (
            <Card>
              <h2 className="text-lg font-display font-semibold text-neutral-900 mb-6">
                Repayment Timeline
              </h2>
              <LoanTimeline
                schedule={schedule}
                currency={loan.currency}
                onMarkPaid={isBorrower ? (item) => {
                  setSelectedScheduleItem(item);
                  setShowPaymentModal(true);
                } : undefined}
              />
            </Card>
          )}

          {/* Lender Reminder Section */}
          {loan.status === 'active' && isLender && loan.funds_sent && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Bell className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900">Payment Reminders</h2>
                    <p className="text-sm text-neutral-500">Send reminders to the borrower</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowReminderModal(true)}
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Send Reminder
                </Button>
              </div>

              {/* Upcoming payments with reminder status */}
              <div className="space-y-3">
                {schedule.filter(s => !s.is_paid).slice(0, 3).map((payment) => {
                  const dueDate = new Date(payment.due_date);
                  const today = new Date();
                  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = daysUntilDue < 0;
                  
                  return (
                    <div 
                      key={payment.id} 
                      className={`p-4 rounded-xl border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-neutral-50 border-neutral-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-neutral-900">
                            {formatCurrency(payment.amount, loan.currency)}
                          </p>
                          <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-neutral-500'}`}>
                            {isOverdue 
                              ? `⚠️ ${Math.abs(daysUntilDue)} days overdue`
                              : daysUntilDue === 0 
                                ? 'Due today'
                                : `Due in ${daysUntilDue} days`
                            } • {formatDate(payment.due_date)}
                          </p>
                        </div>
                        <div className="text-right">
                          {payment.reminder_sent_at || (payment as any).last_manual_reminder_at ? (
                            <div className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Reminder sent
                              <span className="text-neutral-400 ml-1">
                                {formatDate(payment.reminder_sent_at || (payment as any).last_manual_reminder_at)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400">No reminder sent</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {schedule.filter(s => !s.is_paid).length === 0 && (
                <p className="text-center text-neutral-500 py-4">All payments have been made! 🎉</p>
              )}
            </Card>
          )}

          {/* Signed Agreement Section - Visible to Lender */}
          {isLender && (loan.borrower_signed || loan.lender_signed) && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900">Loan Agreement</h2>
                    <p className="text-sm text-neutral-500">Signed contract for this loan</p>
                  </div>
                </div>
                <a
                  href={`/api/contracts?loanId=${loan.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  View Contract
                </a>
              </div>

              <div className="space-y-3">
                {/* Borrower Signature */}
                <div className={`p-4 rounded-xl border ${
                  loan.borrower_signed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {loan.borrower_signed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-neutral-400" />
                      )}
                      <div>
                        <p className="font-medium text-neutral-900">
                          Borrower: {(loan.borrower as any)?.full_name || 'Unknown'}
                        </p>
                        {loan.borrower_signed && loan.borrower_signed_at && (
                          <p className="text-sm text-green-600">
                            Signed on {formatDate(loan.borrower_signed_at)}
                          </p>
                        )}
                        {!loan.borrower_signed && (
                          <p className="text-sm text-neutral-500">Not yet signed</p>
                        )}
                      </div>
                    </div>
                    {loan.borrower_signed && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        ✓ Signed
                      </span>
                    )}
                  </div>
                </div>

                {/* Lender Signature */}
                <div className={`p-4 rounded-xl border ${
                  loan.lender_signed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {loan.lender_signed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-neutral-400" />
                      )}
                      <div>
                        <p className="font-medium text-neutral-900">
                          Lender: {(loan.lender as any)?.full_name || (loan.business_lender as any)?.business_name || 'You'}
                        </p>
                        {loan.lender_signed && loan.lender_signed_at && (
                          <p className="text-sm text-green-600">
                            Signed on {formatDate(loan.lender_signed_at)}
                          </p>
                        )}
                        {!loan.lender_signed && (
                          <p className="text-sm text-neutral-500">Not yet signed</p>
                        )}
                      </div>
                    </div>
                    {loan.lender_signed && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        ✓ Signed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-neutral-500 mt-4">
                💡 Click "View Contract" to open the full loan agreement in a new tab. You can print or save it as PDF from your browser.
              </p>
            </Card>
          )}

          {/* Pending Actions */}
          {loan.status === 'pending' && (
            <Card className="bg-yellow-50 border-yellow-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900">Awaiting Response</h3>
                  <p className="text-sm text-neutral-600">
                    {isBorrower
                      ? 'Waiting for your lender to accept this loan request.'
                      : 'This loan request is waiting for your response.'}
                  </p>
                </div>
                {isLender && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleDeclineLoan}>
                      Decline
                    </Button>
                    <Button className="flex-1 sm:flex-none" onClick={handleAcceptLoan}>
                      Accept
                    </Button>
                  </div>
                )}
                {isBorrower && (
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={handleCancelLoan}
                  >
                    Cancel Request
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Completed Status */}
          {loan.status === 'completed' && (
            <Card className="bg-green-50 border-green-200">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900">Loan Completed! 🎉</h3>
                  <p className="text-sm text-neutral-600">
                    This loan has been fully repaid. Great job!
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>

      <Footer />

      {/* Payment Modal - Borrower repaying Lender */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedScheduleItem(null);
        }}
        scheduleItem={selectedScheduleItem}
        currency={loan.currency}
        lenderPayPalEmail={
          (loan.lender as any)?.paypal_email || 
          (loan.business_lender as any)?.paypal_email ||
          (loan as any).guest_lender?.paypal_email
        }
        lenderName={
          (loan.lender as any)?.full_name || 
          (loan.business_lender as any)?.business_name ||
          (loan as any).guest_lender?.full_name ||
          'Lender'
        }
        lenderPaymentInfo={{
          paypal_email: (loan.lender as any)?.paypal_email || (loan.business_lender as any)?.paypal_email || (loan.business_lender as any)?.contact_email || (loan as any).guest_lender?.paypal_email,
          cashapp_username: (loan.lender as any)?.cashapp_username || (loan.business_lender as any)?.cashapp_username,
          venmo_username: (loan.lender as any)?.venmo_username || (loan.business_lender as any)?.venmo_username,
          preferred_payment_method: (loan.lender as any)?.preferred_payment_method || (loan.business_lender as any)?.preferred_payment_method,
        }}
        onSubmit={handleMarkPaid}
      />

      {/* Payment Confirmation Modal - Lender confirms they sent payment with proof */}
      {showFundsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 my-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Confirm Payment Sent</h2>
            </div>

            <div className="bg-neutral-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-neutral-600 mb-2">Amount sent:</p>
              <p className="text-2xl font-bold text-neutral-900">
                {formatCurrency(loan.amount, loan.currency)}
              </p>
              <p className="text-sm text-neutral-500 mt-2">
                To: {(loan.borrower as any)?.full_name || 'Borrower'}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Payment Method Used *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(loan.borrower as any)?.paypal_email && (
                    <button
                      type="button"
                      onClick={() => setFundsPaymentMethod('paypal')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        fundsPaymentMethod === 'paypal' 
                          ? 'border-[#0070ba] bg-[#0070ba]/10' 
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="w-8 h-8 bg-[#0070ba] rounded mx-auto mb-1 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-medium">PayPal</span>
                    </button>
                  )}
                  {(loan.borrower as any)?.cashapp_username && (
                    <button
                      type="button"
                      onClick={() => setFundsPaymentMethod('cashapp')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        fundsPaymentMethod === 'cashapp' 
                          ? 'border-[#00D632] bg-[#00D632]/10' 
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="w-8 h-8 bg-[#00D632] rounded mx-auto mb-1 flex items-center justify-center">
                        <span className="text-white font-bold">$</span>
                      </div>
                      <span className="text-xs font-medium">Cash App</span>
                    </button>
                  )}
                  {(loan.borrower as any)?.venmo_username && (
                    <button
                      type="button"
                      onClick={() => setFundsPaymentMethod('venmo')}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        fundsPaymentMethod === 'venmo' 
                          ? 'border-[#3D95CE] bg-[#3D95CE]/10' 
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="w-8 h-8 bg-[#3D95CE] rounded mx-auto mb-1 flex items-center justify-center">
                        <span className="text-white font-bold">V</span>
                      </div>
                      <span className="text-xs font-medium">Venmo</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Transaction ID */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Transaction ID / Reference (optional)
                </label>
                <input
                  type="text"
                  value={fundsReference}
                  onChange={(e) => setFundsReference(e.target.value)}
                  placeholder="e.g., 5TY12345ABC678901"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Proof of Payment Upload */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Screenshot Proof of Payment *
                </label>
                <p className="text-xs text-neutral-500 mb-2">
                  Upload a screenshot showing the completed payment
                </p>
                
                {fundsProofPreview ? (
                  <div className="relative">
                    <img 
                      src={fundsProofPreview} 
                      alt="Payment proof" 
                      className="w-full h-48 object-cover rounded-lg border border-neutral-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFundsProofFile(null);
                        setFundsProofPreview(null);
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50/50 transition-colors">
                    <div className="flex flex-col items-center">
                      <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                      <span className="text-sm text-neutral-500">Click to upload screenshot</span>
                      <span className="text-xs text-neutral-400 mt-1">PNG, JPG up to 5MB</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFundsProofFile(file);
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            setFundsProofPreview(e.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Important:</strong> Screenshot proof is required. The borrower will be able to see this proof to confirm receipt.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowFundsModal(false);
                  setFundsProofFile(null);
                  setFundsProofPreview(null);
                  setFundsReference('');
                }}
                className="flex-1"
                disabled={fundsSending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendFunds}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={fundsSending || !fundsProofFile}
              >
                {fundsSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Bell className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Send Payment Reminder</h2>
            </div>

            <p className="text-neutral-600 mb-4">
              Send a reminder email to <strong>{(loan?.borrower as any)?.full_name || 'the borrower'}</strong> about their upcoming payment.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Add a personal message (optional)
              </label>
              <textarea
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                placeholder="e.g., Just a friendly reminder about your upcoming payment..."
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> The borrower will receive an email with the payment details and your message.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowReminderModal(false);
                  setReminderMessage('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600"
                onClick={() => handleSendReminder()}
                disabled={sendingReminder}
              >
                {sendingReminder ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Reminder
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
