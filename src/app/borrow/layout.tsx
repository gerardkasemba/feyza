import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Request a Loan | Borrow from Friends, Family & Trusted Lenders',
  description:
    'Apply for a personal or business loan on Feyza. No credit check. Get matched with trusted lenders or borrow from people you know. Fast, secure, and transparent.',
  keywords: [
    'request a loan',
    'apply for loan',
    'personal loan',
    'business loan',
    'borrow money',
    'no credit check loan',
    'peer to peer lending',
    'Feyza',
  ],
  openGraph: {
    title: 'Request a Loan | Feyza - Borrow & Lend with Trust',
    description:
      'Apply for a loan on Feyza. Borrow from friends, family, or get matched with verified business lenders. No credit check. Simple and secure.',
    url: '/borrow',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Request a Loan | Feyza',
    description: 'Borrow from people you trust or get matched with verified lenders. No credit check.',
  },
  alternates: { canonical: '/borrow' },
};

export default function BorrowLayout({ children }: { children: React.ReactNode }) {
  return children;
}
