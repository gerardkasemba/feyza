/** Shape returned by GET /api/borrower/[id] and used in loan detail components */
export interface BorrowerRatingData {
  borrower?: {
    id?: string;
    full_name?: string;
    email?: string;
    monthsAsMember?: number;
    isVerified?: boolean;
    verification_status?: string;
  };
  loanHistory?: {
    totalCompleted?: number;
    activeLoans?: number;
    totalBorrowed?: number;
  };
  paymentHistory?: {
    total?: number;
    onTime?: number;
    early?: number;
    late?: number;
    missed?: number;
    totalPayments?: number;
  };
  rating?: {
    overall?: string;
    score?: number;
  };
  recommendation?: string;
  [key: string]: unknown;
}
