'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Badge, Avatar } from '@/components/ui';
import { useToast } from '@/components/ui/Alert';
import { formatCurrency, formatDate, getLoanProgress } from '@/lib/utils';
import { usePlatformFee } from '@/components/FeeBreakdown';
import {
  ArrowLeft, Calendar, Clock, CheckCircle, XCircle, AlertCircle,
  Banknote, Building, CreditCard, ExternalLink, Bell, FileText,
  X, Share2, RefreshCw, User, Info,
} from 'lucide-react';

import {
  OverviewTab, TimelineTab, PaymentsTab, TermsTab, AgreementTab,
  RemindersTab, BorrowerProfileTab, FundsModal, ReminderModal,
  ManualPaymentModal, VouchModal, LoanConfirmDialogs, TransferBanner,
} from './components';

import {
  useLoanData, useTransferStatus, useLoanActions, useFundsModal,
  useReminderModal, useManualPaymentModal, useBorrowerRating,
  useLoanNotifications, usePaymentProviders,
} from './hooks';

type TabKey = 'overview' | 'timeline' | 'payments' | 'terms' | 'agreement' | 'reminders' | 'borrower-profile';

function TabButton({ active, onClick, icon: Icon, label, badge }: {
  active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; badge?: string | number;
}) {
  return (
    <button type="button" onClick={onClick} className={[
      'relative inline-flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium transition-all border active:scale-95 min-w-[70px] sm:min-w-0 justify-center sm:justify-start',
      active
        ? 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white shadow-sm'
        : 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60',
    ].join(' ')}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
      {badge !== undefined && (
        <span className={`ml-0.5 sm:ml-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium ${active ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

const statusConfig: Record<string, { color: 'default' | 'success' | 'warning' | 'danger' | 'info'; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  pending: { color: 'warning', icon: Clock, label: 'Pending' },
  pending_funds: { color: 'warning', icon: Clock, label: 'Awaiting Funds' },
  pending_disbursement: { color: 'info', icon: Clock, label: 'Disbursing' },
  active: { color: 'success', icon: CheckCircle, label: 'Active' },
  completed: { color: 'info', icon: CheckCircle, label: 'Completed' },
  declined: { color: 'danger', icon: XCircle, label: 'Declined' },
  cancelled: { color: 'default', icon: XCircle, label: 'Cancelled' },
};

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const loanId = params.id as string;

  const [tab, setTab] = useState<TabKey>('overview');
  const [termsExpanded, setTermsExpanded] = useState(false);

  const { loan, setLoan, schedule, setSchedule, user, isLoading, refetchLoan, refetchSchedule } = useLoanData(loanId);
  const { isDwollaEnabled } = usePaymentProviders();
  const { transferStatus, fetchTransferStatus } = useTransferStatus(loanId, loan, isDwollaEnabled);
  const { minimizedNotifications, toggleNotification } = useLoanNotifications(loanId);
  const { settings: feeSettings, loading: feeLoading, calculateFee } = usePlatformFee();

  const isBorrower = loan?.borrower_id === user?.id;
  const isLender = loan?.lender_id === user?.id || (loan?.business_lender && (loan.business_lender as any).user_id === user?.id);
  const progressTotal = (loan?.total_amount && loan.total_amount > 0) ? loan.total_amount : (loan?.amount || 0);
  const progress = getLoanProgress(loan?.amount_paid || 0, progressTotal);

  const otherParty = isBorrower ? loan?.lender : loan?.borrower;
  const isPersonalLoan = loan?.lender_type === 'personal';
  let otherPartyName = 'Loading...';
  if (otherParty) {
    if ('business_name' in (otherParty as any)) otherPartyName = (otherParty as any).business_name;
    else if (isPersonalLoan && (otherParty as any).username) otherPartyName = `~${(otherParty as any).username}`;
    else otherPartyName = (otherParty as any).full_name;
  } else if (loan && isBorrower && isPersonalLoan && (loan as any).invite_username) {
    otherPartyName = `~${(loan as any).invite_username}`;
  } else if (loan && isBorrower) {
    otherPartyName = (loan as any).invite_email || 'Pending acceptance';
  } else if (loan) {
    otherPartyName = (loan as any).borrower_name || 'Borrower';
  }

  const { color: statusColor, icon: StatusIcon, label: statusLabel } = statusConfig[loan?.status || 'pending'] || statusConfig.pending;
  const paidCount = schedule.filter((s) => s.is_paid).length;
  const unpaidCount = schedule.filter((s) => !s.is_paid).length;
  const hasTermsTab = !!(loan?.business_lender_id && (loan.business_lender as any)?.lending_terms);
  const hasAgreementTab = !!(isLender && ((loan as any)?.borrower_signed || (loan as any)?.lender_signed));
  const hasRemindersTab = !!(loan?.status === 'active' && isLender && loan?.funds_sent);
  const nextPayment = useMemo(() => schedule.find((s) => !s.is_paid), [schedule]);

  useEffect(() => {
    if (tab === 'terms' && !hasTermsTab) setTab('overview');
    if (tab === 'agreement' && !hasAgreementTab) setTab('overview');
    if (tab === 'reminders' && !hasRemindersTab) setTab('overview');
  }, [hasTermsTab, hasAgreementTab, hasRemindersTab]);

  const {
    processingPayment, showDeclineDialog, setShowDeclineDialog, showCancelDialog, setShowCancelDialog,
    paymentConfirmDialog, setPaymentConfirmDialog, handleAcceptLoan, handleDeclineLoan, executeDeclineLoan,
    handleCancelLoan, executeCancelLoan, handleProcessPayment, executeProcessPayment,
  } = useLoanActions({ loan, user, schedule, setLoan, setSchedule, refetchLoan, refetchSchedule });

  const {
    showFundsModal, setShowFundsModal, fundsSending, fundsReference, setFundsReference,
    fundsPaymentMethod, setFundsPaymentMethod, fundsProofFile, setFundsProofFile,
    fundsProofPreview, setFundsProofPreview, handleSendFunds,
  } = useFundsModal(loan, setLoan);

  const {
    showReminderModal, setShowReminderModal, reminderMessage, setReminderMessage,
    sendingReminder, handleSendReminder,
  } = useReminderModal(loan, setSchedule);

  const {
    showManualPaymentModal, setShowManualPaymentModal, manualPaymentMethod, setManualPaymentMethod,
    manualPaymentReference, setManualPaymentReference, manualPaymentProofFile, setManualPaymentProofFile,
    manualPaymentProofPreview, setManualPaymentProofPreview, submittingManualPayment,
    handleOpenManualPayment, handleSubmitManualPayment,
  } = useManualPaymentModal({ loan, user, schedule, setLoan, refetchLoan, refetchSchedule, feeSettings, calculateFee });

  const {
    borrowerRatingData, loadingBorrowerRating, hasVouchedForBorrower, vouchingForBorrower,
    showVouchModal, setShowVouchModal, vouchMessage, setVouchMessage, handleVouchForBorrower,
  } = useBorrowerRating(loan, user, !!isLender);

  if (isLoading || !loan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="animate-pulse text-neutral-500 dark:text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <Navbar user={user} />
      <main className="flex-1 pb-safe">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">

          {/* Top bar */}
          <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <div className="flex items-center gap-2">
              {loan.status === 'active' && (
                <Button variant="outline" size="sm" className="px-2 sm:px-3 text-amber-600 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/20"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/loans/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loan_id: loan.id }) });
                      const data = await res.json();
                      if (data.reconciled) showToast({ type: 'success', title: 'Balance corrected', message: `Updated to ${data.now.status}` });
                      await refetchLoan(); await refetchSchedule();
                    } catch { showToast({ type: 'error', title: 'Recalculation failed', message: 'Please try again' }); }
                  }} title="Recalculate balance from payment history">
                  <RefreshCw className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Recalculate</span>
                </Button>
              )}
              <Button variant="outline" size="sm" className="px-2 sm:px-3" onClick={async () => { await refetchLoan(); await refetchSchedule(); await fetchTransferStatus(); }}>
                <RefreshCw className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Refresh</span>
              </Button>
              {loan.lender_type === 'personal' && (loan as any).borrower_token && (
                <Button size="sm" className="px-2 sm:px-3" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/loan-request/${loan.id}`); showToast({ type: 'success', title: 'Link Copied!', message: 'Share this link with someone who can help' }); }}>
                  <Share2 className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Share</span>
                </Button>
              )}
            </div>
          </div>

          {/* Header card */}
          <Card className="mb-4 sm:mb-6 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Avatar name={otherPartyName} size="lg" className="w-12 h-12 sm:w-14 sm:h-14" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white truncate">{otherPartyName}</h1>
                      <Badge variant={statusColor} size="md"><StatusIcon className="w-4 h-4 mr-1" />{statusLabel}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{isBorrower ? 'Lender' : 'Borrower'} • {loan.lender_type === 'business' ? 'Business' : 'Personal'}</p>
                      {isLender && loan?.borrower_id && (
                        <button onClick={() => setTab('borrower-profile')} className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">View Profile</button>
                      )}
                    </div>
                    {loan.created_at && <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Requested {formatDate(loan.created_at)}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full lg:w-auto">
                  {[
                    { label: 'Principal', value: formatCurrency(loan.amount, loan.currency), cls: 'text-neutral-900 dark:text-white' },
                    { label: 'Paid', value: formatCurrency(loan.amount_paid, loan.currency), cls: 'text-primary-600 dark:text-primary-400' },
                    { label: 'Remaining', value: formatCurrency(loan.amount_remaining, loan.currency), cls: 'text-neutral-800 dark:text-neutral-200' },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="rounded-xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 sm:p-4">
                      <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
                      <p className={`text-sm sm:text-lg font-bold truncate ${cls}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fee info */}
              {loan.status === 'active' && feeSettings?.enabled && !feeLoading && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-200">Platform Fee Information</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        {isBorrower
                          ? `A platform fee is applied to each payment. The lender receives the net amount after fees.`
                          : `A platform fee of ${feeSettings.type === 'fixed' ? formatCurrency(feeSettings.fixed_amount, loan.currency) : feeSettings.type === 'combined' ? `${feeSettings.percentage}% + ${formatCurrency(feeSettings.fixed_amount, loan.currency)}` : `${feeSettings.percentage}%`} is deducted from each payment you receive.`}
                        {feeSettings.min_fee > 0 && ` Minimum fee: ${formatCurrency(feeSettings.min_fee, loan.currency)}.`}
                        {feeSettings.max_fee > 0 && ` Maximum fee: ${formatCurrency(feeSettings.max_fee, loan.currency)}.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* No match */}
              {loan.match_status === 'no_match' && !loan.lender_id && !loan.business_lender_id && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-orange-800 dark:text-orange-300">No Matching Lenders Found</h3>
                      <p className="text-orange-700 dark:text-orange-400 text-sm mt-1">
                        {loan.lender_type === 'business' ? `We couldn't find a business lender for your ${formatCurrency(loan.amount, loan.currency)} request at this time.` : `We couldn't automatically match your ${formatCurrency(loan.amount, loan.currency)} loan request.`}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-4">
                        {loan.lender_type === 'personal' && (loan as any).borrower_token && (
                          <Button size="sm" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/loan-request/${loan.id}`); showToast({ type: 'success', title: 'Link Copied!', message: 'Share this link with someone who can help' }); }}>
                            <Share2 className="w-4 h-4 mr-2" />Copy Share Link
                          </Button>
                        )}
                        <Button size="sm" variant={loan.lender_type === 'personal' ? 'outline' : 'default'} onClick={() => router.push('/loans/new')}>Try Different Amount</Button>
                        <Button variant="outline" size="sm" onClick={() => { fetch('/api/matching', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loan_id: loan.id }) }).then(() => window.location.reload()); }}>
                          <RefreshCw className="w-4 h-4 mr-2" />Retry Matching
                        </Button>
                        {isBorrower && (
                          <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30" onClick={handleCancelLoan}>
                            <X className="w-4 h-4 mr-2" />Cancel Request
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transfer banner */}
              <TransferBanner
                transferStatus={transferStatus}
                loan={loan}
                isBorrower={!!isBorrower}
                isDwollaEnabled={isDwollaEnabled}
                minimizedNotifications={minimizedNotifications}
                toggleNotification={toggleNotification}
                fetchTransferStatus={fetchTransferStatus}
              />

              {/* Pending action */}
              {loan.status === 'pending' && loan.match_status !== 'no_match' && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30"><Clock className="w-5 h-5 text-amber-700 dark:text-amber-300" /></div>
                      <div>
                        <p className="font-semibold text-amber-900 dark:text-amber-200">{isBorrower ? 'Awaiting lender response' : 'Loan request pending your review'}</p>
                        <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
                          {isBorrower ? (loan.lender_type === 'personal' ? `Your loan request has been sent to ${(loan as any).invite_username ? `~${(loan as any).invite_username}` : (loan as any).invite_email || 'the lender'}. They will receive an email to accept or decline.` : "Your loan request is being reviewed by the lender. You'll be notified once they respond.") : `${(loan.borrower as any)?.full_name || 'A borrower'} has requested a loan of ${formatCurrency(loan.amount, loan.currency)}.`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isLender ? (
                        <>
                          {/* Warn lender if they have no payment method configured */}
                          {!((user as any)?.bank_connected || (user as any)?.paypal_email || (user as any)?.cashapp_username || (user as any)?.venmo_username || (user as any)?.zelle_email || (user as any)?.preferred_payment_method) && (
                            <div className="w-full mb-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                              <span>⚠️</span>
                              <span>Connect a <button className="underline font-medium" onClick={() => router.push('/settings?tab=payment')}>payment method</button> before accepting.</span>
                            </div>
                          )}
                          <Button variant="outline" onClick={handleDeclineLoan}><XCircle className="w-4 h-4 mr-2" />Decline</Button>
                          <Button onClick={handleAcceptLoan}><CheckCircle className="w-4 h-4 mr-2" />Accept</Button>
                        </>
                      ) : (
                        <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30" onClick={handleCancelLoan}>Cancel Request</Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-pay: only show when ACH/Dwolla is used (auto-pay applies to bank transfers) */}
              {loan.status === 'active' && (loan as any).auto_pay_enabled && isDwollaEnabled && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <h3 className="font-semibold text-green-900 dark:text-green-300">✅ Auto-Pay Enabled</h3>
                      <p className="text-sm text-green-700 dark:text-green-400">{isBorrower ? 'Payments will be automatically deducted from your bank on each due date.' : 'Payments will be automatically deposited to your bank on each due date.'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Lender fund section */}
              {loan.status === 'active' && !loan.funds_sent && isLender && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Banknote className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">Action Required: Fund This Loan</h3>
                  </div>
                  <p className="text-yellow-700 dark:text-yellow-400 text-sm mb-4">Send <strong>{formatCurrency(loan.amount, loan.currency)}</strong> to <strong>{(loan.borrower as any)?.full_name || 'the borrower'}</strong></p>
                  {/* Lender must have a payment method to fund */}
                  {!isDwollaEnabled && !((user as any)?.bank_connected || (user as any)?.paypal_email || (user as any)?.cashapp_username || (user as any)?.venmo_username || (user as any)?.zelle_email || (user as any)?.preferred_payment_method) && (
                    <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                      <span>⚠️</span>
                      <span>You need to <button className="underline font-medium" onClick={() => router.push('/settings?tab=payment')}>connect a payment method</button> before you can fund this loan.</span>
                    </div>
                  )}
                  {isDwollaEnabled && !(user as any)?.bank_connected && !(user as any)?.dwolla_funding_source_url && (
                    <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                      <span>⚠️</span>
                      <span>You need to <button className="underline font-medium" onClick={() => router.push('/settings?tab=payment')}>connect your bank account</button> to fund via ACH transfer.</span>
                    </div>
                  )}
                  {(() => {
                    const borrowerBankConnected = (loan as any).borrower_bank_connected || (loan as any).borrower_dwolla_funding_source_url || (loan.borrower as any)?.dwolla_funding_source_url;
                    const borrowerBankName = (loan as any).borrower_bank_name || (loan.borrower as any)?.bank_name;
                    const borrowerBankMask = (loan as any).borrower_bank_account_mask || (loan.borrower as any)?.bank_account_mask;
                    if (isDwollaEnabled && borrowerBankConnected) {
                      return (
                        <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center"><Building className="w-5 h-5 text-white" /></div>
                            <div>
                              <p className="font-medium text-green-800 dark:text-green-300">Borrower's Bank Connected ✓</p>
                              <p className="text-sm text-green-700 dark:text-green-400">{borrowerBankName || 'Bank account'}{borrowerBankMask && ` (••••${borrowerBankMask})`}</p>
                            </div>
                          </div>
                          <Button onClick={() => router.push(`/loans/${loan.id}/fund`)} className="w-full bg-green-600 hover:bg-green-700">
                            <Banknote className="w-4 h-4 mr-2" />Fund This Loan
                          </Button>
                        </div>
                      );
                    }
                    const borrower = loan.borrower as unknown as Record<string, unknown>;
                    const paymentMethods = (borrower?.payment_methods as { is_active: boolean; is_default: boolean; account_identifier?: string; account_name?: string; payment_provider?: { slug: string } }[]) || [];
                    const hasNewMethod = paymentMethods.some((m) => m.is_active && ['paypal','cashapp','venmo','zelle'].includes(m.payment_provider?.slug ?? ''));
                    const hasLegacyMethod = borrower?.paypal_email || borrower?.cashapp_username || borrower?.venmo_username || borrower?.zelle_email || borrower?.zelle_phone;
                    if (hasNewMethod || hasLegacyMethod) {
                      let methodToShow: string | null = null;
                      let methodData: typeof paymentMethods[0] | null = null;
                      if (hasNewMethod) {
                        const sel = paymentMethods.find((m) => m.is_default && m.is_active) || paymentMethods.find((m) => m.is_active);
                        if (sel?.payment_provider?.slug) { methodToShow = sel.payment_provider.slug; methodData = sel; }
                      }
                      if (!methodToShow) {
                        methodToShow = (borrower?.preferred_payment_method as string) || null;
                        if (!methodToShow) {
                          if (borrower?.paypal_email) methodToShow = 'paypal';
                          else if (borrower?.cashapp_username) methodToShow = 'cashapp';
                          else if (borrower?.venmo_username) methodToShow = 'venmo';
                          else if (borrower?.zelle_email || borrower?.zelle_phone) methodToShow = 'zelle';
                        }
                      }
                      const methodConfigs: Record<string, any> = {
                        paypal: { bg: 'bg-[#0070ba]', icon: <CreditCard className="w-6 h-6 text-white" />, name: 'PayPal', value: methodData?.account_identifier || borrower?.paypal_email, getLink: (amt: number) => `https://paypal.me/${((borrower?.paypal_email as string)?.includes('@') ? (borrower?.paypal_email as string)?.split('@')[0] : borrower?.paypal_email as string)}/${amt.toFixed(2)}` },
                        cashapp: { bg: 'bg-[#00D632]', icon: <span className="text-white font-bold text-2xl">$</span>, name: 'Cash App', value: methodData?.account_identifier || borrower?.cashapp_username, getLink: (amt: number) => `https://cash.app/$${(borrower?.cashapp_username as string | undefined)?.replace(/^\$/, '').trim()}/${amt.toFixed(2)}` },
                        venmo: { bg: 'bg-[#3D95CE]', icon: <span className="text-white font-bold text-2xl">V</span>, name: 'Venmo', value: methodData?.account_identifier || borrower?.venmo_username, getLink: (amt: number) => `https://venmo.com/${(borrower?.venmo_username as string | undefined)?.replace(/^@/, '').trim()}?txn=pay&amount=${amt.toFixed(2)}&note=${encodeURIComponent(`Loan Disbursement - ${loan.purpose || 'Feyza'}`)}` },
                        zelle: { bg: 'bg-[#6D1ED4]', icon: <span className="text-white font-bold text-2xl">Z</span>, name: 'Zelle', value: methodData?.account_identifier || borrower?.zelle_email || borrower?.zelle_phone, accountName: methodData?.account_name, getLink: () => '' },
                      };
                      if (methodToShow && methodConfigs[methodToShow]?.value) {
                        const config = methodConfigs[methodToShow];
                        return (
                          <>
                            <div className="mb-4">
                              <div className={`${config.bg} rounded-xl p-4 text-white`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">{config.icon}</div>
                                    <div><p className="text-white/80 text-sm">Send via {config.name}</p><p className="font-bold text-xl">{config.value}</p></div>
                                  </div>
                                  {config.getLink(loan.amount) ? (
                                    <a href={config.getLink(loan.amount)} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white text-neutral-900 rounded-lg font-semibold hover:bg-neutral-100 flex items-center gap-2">Open {config.name} <ExternalLink className="w-4 h-4" /></a>
                                  ) : (
                                    <div className="text-white/80 text-xs text-right">
                                      {methodToShow === 'zelle' && config.accountName && <div className="font-semibold mb-1">{config.accountName}</div>}
                                      {methodToShow === 'zelle' && (borrower?.zelle_email || methodData?.account_identifier?.includes?.('@')) && <div className="mb-0.5">📧 {String(borrower?.zelle_email || methodData?.account_identifier || '')}</div>}
                                      {methodToShow === 'zelle' && borrower?.zelle_phone && <div className="mb-1">📱 {String(borrower?.zelle_phone || '')}</div>}
                                      <div className="text-[10px] opacity-70">Open your bank app</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button onClick={() => setShowFundsModal(true)} className="w-full bg-green-600 hover:bg-green-700">
                              <CheckCircle className="w-4 h-4 mr-2" />I've Sent the Payment - Upload Proof
                            </Button>
                          </>
                        );
                      }
                    }
                    // Only show "connect bank" when we actually expect ACH. For manual payment or when Dwolla is off, allow upload proof.
                    const disbursementMethod = (loan as any).disbursement_method || (loan as any).funds_sent_method;
                    const isAchExpected = isDwollaEnabled && (!disbursementMethod || disbursementMethod === 'bank_transfer' || disbursementMethod === 'ach');
                    if (isAchExpected) {
                      return <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3"><p className="text-orange-700 dark:text-orange-400 text-sm">⚠️ Borrower needs to connect their bank account to receive funds. They can do this in Settings.</p></div>;
                    }
                    return (
                      <>
                        <p className="text-yellow-700 dark:text-yellow-400 text-sm mb-3">Send <strong>{formatCurrency(loan.amount, loan.currency)}</strong> to the borrower using your agreed method (e.g. PayPal, Cash App, Zelle, Venmo), then confirm below.</p>
                        <Button onClick={() => setShowFundsModal(true)} className="w-full bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" />I've Sent the Payment - Upload Proof
                        </Button>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Borrower waiting */}
              {loan.status === 'active' && !loan.funds_sent && isBorrower && (() => {
                // Determine how the lender will send funds
                const disbursementMethod = (loan as any).disbursement_method || (loan as any).funds_sent_method;
                const isAchTransfer = isDwollaEnabled && (
                  !disbursementMethod || disbursementMethod === 'bank_transfer' || disbursementMethod === 'ach'
                );

                // Manual payment labels for non-ACH methods
                const manualMethodLabel: Record<string, string> = {
                  cashapp: 'Cash App',
                  venmo: 'Venmo',
                  zelle: 'Zelle',
                  paypal: 'PayPal',
                  mobile_money: 'Mobile Money',
                  cash_pickup: 'Cash Pickup',
                };
                const methodLabel = disbursementMethod ? (manualMethodLabel[disbursementMethod] || disbursementMethod) : null;

                return (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-blue-800 dark:text-blue-300">Waiting for Lender to Send Funds</h3>
                    </div>

                    {isAchTransfer ? (
                      <>
                        <p className="text-blue-700 dark:text-blue-400 text-sm mb-3">
                          Your loan has been approved! The lender will send <strong>{formatCurrency(loan.amount, loan.currency)}</strong> to you via ACH bank transfer.
                        </p>
                        <div className="bg-white/60 dark:bg-white/10 rounded-lg p-3 text-sm">
                          <p className="font-medium text-blue-800 dark:text-blue-300 mb-2">Your receiving account:</p>
                          {(() => {
                            const bankConnected = (loan as any).borrower_bank_connected || (loan as any).borrower_dwolla_funding_source_url || (loan.borrower as any)?.dwolla_funding_source_url;
                            const bankName = (loan as any).borrower_bank_name || (loan.borrower as any)?.bank_name;
                            const bankMask = (loan as any).borrower_bank_account_mask || (loan.borrower as any)?.bank_account_mask;
                            if (bankConnected) return (
                              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                <Building className="w-4 h-4" />
                                <span>{bankName || 'Bank Account'} {bankMask && `(••••${bankMask})`}</span>
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              </div>
                            );
                            return <p className="text-amber-600 dark:text-amber-400">⚠️ No bank account connected. <Link href="/settings" className="underline">Connect your bank →</Link></p>;
                          })()}
                        </div>
                      </>
                    ) : (
                      <p className="text-blue-700 dark:text-blue-400 text-sm">
                        Your loan has been approved! The lender will send <strong>{formatCurrency(loan.amount, loan.currency)}</strong> to you
                        {methodLabel ? <> via <strong>{methodLabel}</strong></> : ' shortly'}.
                        {' '}You will be notified once the funds are on their way.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </Card>

          {/* Tabs */}
          <div className="sticky top-0 sm:top-[64px] z-30 -mx-3 sm:mx-0 mb-4 sm:mb-6">
            <div className="sm:rounded-2xl border-b sm:border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-lg shadow-sm px-2 sm:px-3 py-1.5 sm:py-2">
              <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} icon={FileText} label="Overview" />
                <TabButton active={tab === 'timeline'} onClick={() => setTab('timeline')} icon={Calendar} label="Timeline" badge={schedule.length > 0 ? schedule.length : undefined} />
                <TabButton active={tab === 'payments'} onClick={() => setTab('payments')} icon={CreditCard} label="Payments" badge={unpaidCount > 0 ? unpaidCount : undefined} />
                {hasTermsTab && <TabButton active={tab === 'terms'} onClick={() => setTab('terms')} icon={FileText} label="Terms" />}
                {hasAgreementTab && <TabButton active={tab === 'agreement'} onClick={() => setTab('agreement')} icon={FileText} label="Agreement" />}
                {hasRemindersTab && <TabButton active={tab === 'reminders'} onClick={() => setTab('reminders')} icon={Bell} label="Reminders" />}
                {isLender && <TabButton active={tab === 'borrower-profile'} onClick={() => setTab('borrower-profile')} icon={User} label="Profile" />}
              </div>
            </div>
          </div>

          {/* Tab content */}
          <div className="min-h-[400px]">
            {tab === 'overview' && <OverviewTab loan={loan} schedule={schedule} isBorrower={!!isBorrower} isLender={!!isLender} statusColor={statusColor} StatusIcon={StatusIcon} statusLabel={statusLabel} progress={progress} paidCount={paidCount} nextPayment={nextPayment} borrowerRatingData={borrowerRatingData} loadingBorrowerRating={loadingBorrowerRating} isDwollaEnabled={isDwollaEnabled} otherPartyName={otherPartyName} hasVouchedForBorrower={!!hasVouchedForBorrower} onProcessPayment={handleProcessPayment} onOpenManualPayment={handleOpenManualPayment} onOpenFundsModal={() => setShowFundsModal(true)} onOpenReminderModal={() => setShowReminderModal(true)} onOpenVouchModal={() => setShowVouchModal(true)} />}
            {tab === 'timeline' && <TimelineTab loan={loan} schedule={schedule} otherPartyName={otherPartyName} />}
            {tab === 'payments' && <PaymentsTab loan={loan} schedule={schedule} isBorrower={isBorrower} isDwollaEnabled={isDwollaEnabled} nextPayment={nextPayment} processingPayment={processingPayment} feeSettings={feeSettings} feeLoading={feeLoading} calculateFee={calculateFee} onProcessPayment={handleProcessPayment} onOpenManualPayment={handleOpenManualPayment} />}
            {tab === 'terms' && hasTermsTab && <TermsTab loan={loan} termsExpanded={termsExpanded} setTermsExpanded={setTermsExpanded} />}
            {tab === 'agreement' && hasAgreementTab && <AgreementTab loan={loan} />}
            {tab === 'reminders' && hasRemindersTab && <RemindersTab loan={loan} schedule={schedule} isLender={isLender} processingPayment={processingPayment} onSendReminder={() => setShowReminderModal(true)} onProcessPayment={handleProcessPayment} />}
            {tab === 'borrower-profile' && isLender && <BorrowerProfileTab loan={loan} borrowerRatingData={borrowerRatingData} loadingBorrowerRating={loadingBorrowerRating} hasVouchedForBorrower={!!hasVouchedForBorrower} onOpenVouchModal={() => setShowVouchModal(true)} formatCurrency={formatCurrency} />}
          </div>
        </div>
      </main>
      <Footer />

      {showFundsModal && <FundsModal loan={loan} fundsPaymentMethod={fundsPaymentMethod} setFundsPaymentMethod={setFundsPaymentMethod} fundsReference={fundsReference} setFundsReference={setFundsReference} fundsProofFile={fundsProofFile} setFundsProofFile={setFundsProofFile} fundsProofPreview={fundsProofPreview} setFundsProofPreview={setFundsProofPreview} fundsSending={fundsSending} onClose={() => setShowFundsModal(false)} onConfirm={handleSendFunds} />}
      {showReminderModal && <ReminderModal loan={loan} reminderMessage={reminderMessage} setReminderMessage={setReminderMessage} sendingReminder={sendingReminder} onClose={() => setShowReminderModal(false)} onSend={() => handleSendReminder()} />}
      {showManualPaymentModal && <ManualPaymentModal loan={loan} nextPayment={nextPayment} manualPaymentMethod={manualPaymentMethod} setManualPaymentMethod={setManualPaymentMethod} manualPaymentReference={manualPaymentReference} setManualPaymentReference={setManualPaymentReference} manualPaymentProofFile={manualPaymentProofFile} setManualPaymentProofFile={setManualPaymentProofFile} manualPaymentProofPreview={manualPaymentProofPreview} setManualPaymentProofPreview={setManualPaymentProofPreview} submittingManualPayment={submittingManualPayment} feeSettings={feeSettings} calculateFee={calculateFee} onClose={() => setShowManualPaymentModal(false)} onSubmit={handleSubmitManualPayment} />}
      {showVouchModal && <VouchModal loan={loan} vouchMessage={vouchMessage} setVouchMessage={setVouchMessage} vouchingForBorrower={vouchingForBorrower} onClose={() => setShowVouchModal(false)} onVouch={handleVouchForBorrower} />}
      <LoanConfirmDialogs paymentConfirmDialog={paymentConfirmDialog} showDeclineDialog={showDeclineDialog} showCancelDialog={showCancelDialog} processingPayment={processingPayment} onClosePaymentDialog={() => setPaymentConfirmDialog({ isOpen: false, paymentId: null, isBorrower: false })} onConfirmPayment={executeProcessPayment} onCloseDeclineDialog={() => setShowDeclineDialog(false)} onConfirmDecline={executeDeclineLoan} onCloseCancelDialog={() => setShowCancelDialog(false)} onConfirmCancel={executeCancelLoan} />
    </div>
  );
}
