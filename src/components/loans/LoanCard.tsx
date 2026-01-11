'use client';

import React from 'react';
import Link from 'next/link';
import { Card, Badge, Progress, Avatar } from '@/components/ui';
import { formatCurrency, formatDate, getLoanProgress } from '@/lib/utils';
import { Loan, LoanStatus } from '@/types';
import { ArrowRight, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

interface LoanCardProps {
  loan: Loan;
  role: 'borrower' | 'lender';
}

export function LoanCard({ loan, role }: LoanCardProps) {
  const progress = getLoanProgress(loan.amount_paid, loan.amount);
  const otherParty = role === 'borrower' ? loan.lender : loan.borrower;
  
  // Determine other party name with better fallbacks
  let otherPartyName: string;
  if (otherParty) {
    otherPartyName = 'business_name' in otherParty ? otherParty.business_name : otherParty.full_name;
  } else if (role === 'borrower') {
    // For borrower, check if invite was accepted
    if (loan.invite_accepted) {
      otherPartyName = loan.invite_email || 'Your Lender';
    } else {
      otherPartyName = loan.invite_email || 'Pending acceptance';
    }
  } else {
    // For lender looking at borrower
    otherPartyName = loan.borrower_invite_email || 'Borrower';
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
      <Card hover className="group">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar name={otherPartyName} size="md" />
            <div>
              <p className="font-medium text-neutral-900">{otherPartyName}</p>
              <p className="text-sm text-neutral-500">
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
            <span className="text-2xl font-bold text-neutral-900">
              {formatCurrency(loan.amount, loan.currency)}
            </span>
            <span className="text-sm text-neutral-500">
              {role === 'borrower' ? 'borrowed' : 'lent'}
            </span>
          </div>
          {loan.purpose && (
            <p className="text-sm text-neutral-600 line-clamp-1">{loan.purpose}</p>
          )}
        </div>

        {/* Action needed indicator */}
        {needsPayment && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 text-sm text-yellow-800">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Action needed: Send PayPal payment</span>
            </div>
          </div>
        )}

        {awaitingPayment && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Waiting for lender's payment</span>
            </div>
          </div>
        )}

        {/* Payment confirmed */}
        {loan.status === 'active' && loan.funds_sent && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
              <CheckCircle className="w-4 h-4" />
              <span>Payment sent</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-neutral-500">Repaid</span>
              <span className="font-medium text-neutral-700">
                {formatCurrency(loan.amount_paid, loan.currency)} of {formatCurrency(loan.total_amount || loan.amount, loan.currency)}
              </span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
          <div className="flex items-center gap-1 text-sm text-neutral-500">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(loan.created_at)}</span>
          </div>
          <span className="flex items-center gap-1 text-sm font-medium text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
            View details
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </Card>
    </Link>
  );
}
