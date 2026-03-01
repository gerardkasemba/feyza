import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Apply for a Loan',
  description: 'Start your loan application on Feyza. Quick form to get matched with lenders or apply with a specific business.',
  openGraph: { title: 'Apply for a Loan | Feyza', url: '/apply' },
  alternates: { canonical: '/apply' },
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
