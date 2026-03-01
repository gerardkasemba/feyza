import { Loan, PaymentScheduleItem, User } from '@/types';

export interface LoanDetailSharedProps {
  loan: Loan;
  user: User | null;
  isBorrower: boolean;
  isLender: boolean;
  schedule: PaymentScheduleItem[];
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (date: string | null | undefined) => string;
}
