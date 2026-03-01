'use client';

import { Button } from '@/components/ui';
import { LoanTimeline } from '@/components/loans';
import { Download } from 'lucide-react';
import { Loan, PaymentScheduleItem } from '@/types';
import { downloadICalFile } from '@/lib/calendar';
import { formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui';

interface TimelineTabProps {
  loan: Loan;
  schedule: PaymentScheduleItem[];
  otherPartyName: string;
}

export function TimelineTab({ loan, schedule, otherPartyName }: TimelineTabProps) {
  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">Repayment timeline</h2>
        {schedule.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const unpaidPayments = schedule
                .filter((p) => !p.is_paid)
                .map((p) => ({
                  id: p.id,
                  title: `💰 Feyza Payment Due - ${formatCurrency(p.amount, loan.currency)}`,
                  amount: p.amount,
                  currency: loan.currency,
                  dueDate: p.due_date,
                  lenderName: otherPartyName,
                  description: `Loan repayment for ${loan.purpose || 'personal loan'}`,
                }));
              downloadICalFile(unpaidPayments, loan.purpose);
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Add to Calendar
          </Button>
        )}
      </div>

      <LoanTimeline schedule={schedule} currency={loan.currency} />
    </Card>
  );
}
