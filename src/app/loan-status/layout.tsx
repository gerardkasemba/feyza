import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Check Loan Status',
  description: 'Check the status of your Feyza loan application. Enter your email to see pending, accepted, or declined requests.',
  openGraph: { title: 'Loan Status | Feyza', url: '/loan-status' },
  alternates: { canonical: '/loan-status' },
};

export default function LoanStatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
