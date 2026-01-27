'use client';

import React from 'react';
import Link from 'next/link';
import { Card, Badge, Progress, Avatar } from '@/components/ui';
import { formatCurrency, formatDate, getLoanProgress } from '@/lib/utils';
import { Loan, LoanStatus } from '@/types';
import { ArrowRight, Calendar, AlertCircle, CheckCircle, AtSign } from 'lucide-react';

interface LoanCardProps {
  loan: Loan;
  role: 'borrower' | 'lender';
}

export function LoanCard({ loan, role }: LoanCardProps) {
  const progress = getLoanProgress(loan.amount_paid, loan.amount);
  const otherParty = role === 'borrower' ? loan.lender : loan.borrower;
  const isPersonalLoan = loan.lender_type === 'personal';
  
  // Determine other party name with better fallbacks
  let otherPartyName: string;
  let isUsername = false;
  
  if (otherParty) {
    // Check if it's a business (has business_name) or user
    if ('business_name' in otherParty) {
      otherPartyName = otherParty.business_name;
    } else if (isPersonalLoan && otherParty.username) {
      // Only show username for personal loans
      otherPartyName = `~${otherParty.username}`;
      isUsername = true;
    } else {
      otherPartyName = otherParty.full_name;
    }
  } else if (role === 'borrower') {
    // For borrower viewing lender - prefer username over email for personal loans
    if (isPersonalLoan && loan.invite_username) {
      otherPartyName = `~${loan.invite_username}`;
      isUsername = true;
    } else if (loan.invite_accepted) {
      otherPartyName = loan.invite_email || 'Your Lender';
    } else {
      otherPartyName = loan.invite_email || 'Pending acceptance';
    }
  } else {
    // For lender looking at borrower (when borrower not joined)
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
  };

  const statusVariants: Record<LoanStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'warning',
    pending_funds: 'warning',
    pending_disbursement: 'info',
    active: 'success',
    completed: 'info',
    declined: 'danger',
    cancelled: 'default',
  };

  // Check if lender needs to send payment
  const needsPayment = loan.status === 'active' && !loan.funds_sent && role === 'lender';
  const awaitingPayment = loan.status === 'active' && !loan.funds_sent && role === 'borrower';

  return (
    <Link href={`/loans/${loan.id}`}>
      <Card hover className="group bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
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

        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-2xl font-bold text-neutral-900 dark:text-white">
              {formatCurrency(loan.amount, loan.currency)}
            </span>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {role === 'borrower' ? 'borrowed' : 'lent'}
            </span>
          </div>
          {loan.purpose && (
            <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-1">{loan.purpose}</p>
          )}
        </div>

        {/* Action needed indicator */}
        {needsPayment && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-300">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Action needed: Send Payment</span>
            </div>
          </div>
        )}

        {awaitingPayment && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Waiting for lender's payment</span>
            </div>
          </div>
        )}

        {/* Payment confirmed */}
        {loan.status === 'active' && loan.funds_sent && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-2">
              <CheckCircle className="w-4 h-4" />
              <span>Payment sent</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-neutral-500 dark:text-neutral-400">Repaid</span>
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {formatCurrency(loan.amount_paid, loan.currency)} of {formatCurrency(loan.total_amount || loan.amount, loan.currency)}
              </span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-700">
          <div className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(loan.created_at)}</span>
          </div>
          <span className="flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
            View details
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </Card>
    </Link>
  );
}