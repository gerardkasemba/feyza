'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, Badge, Progress, Avatar } from '@/components/ui';
import { formatCurrency, formatDate, getLoanProgress } from '@/lib/utils';
import { Loan, LoanStatus } from '@/types';
import { ArrowRight, Calendar, AlertCircle, CheckCircle, AtSign, XCircle, Loader2 } from 'lucide-react';

interface LoanCardProps {
  loan: Loan;
  role: 'borrower' | 'lender';
}

export function LoanCard({ loan, role }: LoanCardProps) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const amountPaid = Number(loan.amount_paid) || 0;
  const totalAmount = Number(loan.total_amount) || Number(loan.amount) || 0;
  const progress = getLoanProgress(amountPaid, totalAmount);
  const otherParty = role === 'borrower' ? loan.lender : loan.borrower;
  const isPersonalLoan = loan.lender_type === 'personal';

  // Cancellable states for the borrower:
  //   • pending / pending_funds  → lender not yet involved or not funded
  //   • active + !funds_sent      → lender accepted but hasn't sent money yet
  const awaitingFunds = loan.status === 'active' && !loan.funds_sent;
  const canCancelInline =
    role === 'borrower' &&
    !cancelled &&
    (loan.status === 'pending' || loan.status === 'pending_funds' || awaitingFunds);

  // Display name
  let otherPartyName: string;
  let isUsername = false;

  if (otherParty) {
    if ('business_name' in otherParty) {
      otherPartyName = otherParty.business_name;
    } else if (isPersonalLoan && otherParty.username) {
      otherPartyName = `~${otherParty.username}`;
      isUsername = true;
    } else {
      otherPartyName = otherParty.full_name;
    }
  } else if (role === 'borrower') {
    if (isPersonalLoan && loan.invite_username) {
      otherPartyName = `~${loan.invite_username}`;
      isUsername = true;
    } else if (loan.invite_accepted) {
      otherPartyName = loan.invite_email || 'Your Lender';
    } else {
      otherPartyName = loan.invite_email || 'Pending acceptance';
    }
  } else {
    otherPartyName = loan.borrower_name || loan.borrower_invite_email || 'Borrower';
  }

  const statusLabels: Record<LoanStatus, string> = {
    pending: loan.invite_accepted ? 'Setting up terms' : 'Pending Acceptance',
    pending_funds: 'Awaiting Funds',
    pending_disbursement: 'Processing',
    active: 'Active',
    completed: 'Completed',
    declined: 'Declined',
    cancelled: 'Cancelled',
    defaulted: 'Defaulted',
  };

  const statusVariants: Record<LoanStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'warning',
    pending_funds: 'warning',
    pending_disbursement: 'info',
    active: 'success',
    completed: 'info',
    declined: 'danger',
    cancelled: 'default',
    defaulted: 'danger',
  };

  const needsPayment = loan.status === 'active' && !loan.funds_sent && role === 'lender';

  async function handleCancel(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setCancelling(true);
    setShowConfirm(false);
    try {
      const res = await fetch(`/api/loans/${loan.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by borrower' }),
      });
      if (res.ok) setCancelled(true);
    } catch {
      // silent — user can try from the detail page
    } finally {
      setCancelling(false);
    }
  }

  if (cancelled) {
    return (
      <Card className="bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 opacity-60">
        <div className="flex items-center gap-3 py-2">
          <XCircle className="w-5 h-5 text-neutral-400" />
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              {formatCurrency(loan.amount, loan.currency)} request cancelled
            </p>
            <p className="text-xs text-neutral-400">{loan.purpose || 'Loan request'}</p>
          </div>
        </div>
      </Card>
    );
  }

  const cardContent = (
    <Card hover={!showConfirm} className="group bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar name={otherPartyName.replace('~', '')} size="md" />
          <div>
            <p className="font-medium text-neutral-900 dark:text-white flex items-center gap-1">
              {isUsername && <AtSign className="w-4 h-4 text-primary-500 dark:text-primary-400" />}
              {otherPartyName}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {role === 'borrower' ? 'Lender' : 'Borrower'}
            </p>
          </div>
        </div>
        <Badge variant={statusVariants[loan.status]}>
          {statusLabels[loan.status]}
        </Badge>
      </div>

      {/* Amount + purpose */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span className="text-2xl font-bold text-neutral-900 dark:text-white">
            {formatCurrency(loan.amount, loan.currency)}
          </span>
          <span className="text-sm text-neutral-500 dark:text-neutral-400 shrink-0">
            {role === 'borrower' ? 'borrowed' : 'lent'}
          </span>
        </div>
        {loan.purpose ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">{loan.purpose}</p>
        ) : (
          <p className="text-sm text-neutral-400 dark:text-neutral-500 italic">No purpose stated</p>
        )}
      </div>

      {/* Status hint for pending-style states */}
      {(() => {
        let hint = '';
        if (loan.status === 'pending') {
          if (!loan.invite_accepted && role === 'borrower') hint = 'Lender will accept or decline your request.';
          else if (loan.invite_accepted) hint = 'Terms are being set. You’ll get a link to sign.';
        } else if (loan.status === 'pending_funds') {
          hint = role === 'borrower' ? 'Lender will send funds after setup.' : 'Complete setup, then send funds to the borrower.';
        } else if (loan.status === 'pending_disbursement') {
          hint = 'Transfer is being processed.';
        }
        return hint ? <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">{hint}</p> : null;
      })()}

      {/* Lender action needed */}
      {needsPayment && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-medium">Action needed</span>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Send funds to the borrower to start the loan.</p>
            </div>
          </div>
        </div>
      )}

      {/* Borrower: waiting for lender to send money */}
      {awaitingFunds && role === 'borrower' && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-medium">Waiting for funds</span>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">Lender will send the money to you next.</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress (funded active loans) — clarify "funds received/sent" vs "repaid" */}
      {loan.status === 'active' && loan.funds_sent && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{role === 'borrower' ? 'Funds received' : 'Funds sent'}</span>
          </div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-neutral-500 dark:text-neutral-400">
              {role === 'borrower' ? 'You\'ve repaid' : 'Borrower repaid'}
            </span>
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {formatCurrency(amountPaid, loan.currency)} of {formatCurrency(totalAmount, loan.currency)}
            </span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {/* ── Inline cancel (borrower only) ── */}
      {canCancelInline && (
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
          {!showConfirm ? (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true); }}
              className="flex items-center gap-1.5 text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              {awaitingFunds ? 'Cancel — lender hasn\'t paid yet' : 'Cancel request'}
            </button>
          ) : (
            <div
              className="flex items-center justify-between gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                {awaitingFunds
                  ? 'Cancel this loan before funds arrive?'
                  : 'Cancel this request?'}
              </p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(false); }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Keep it
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60"
                >
                  {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                  Yes, cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer — always show "View details" so the card is clearly clickable */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-700 mt-4">
        <div className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>Started {formatDate(loan.created_at)}</span>
        </div>
        <span className="flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400">
          View details
          <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </Card>
  );

  return (
    <Link href={`/loans/${loan.id}`} onClick={(e) => showConfirm && e.preventDefault()}>
      {cardContent}
    </Link>
  );
}
