import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lend as a Business | Become a Feyza Lender',
  description:
    'Lend to qualified borrowers on Feyza. Set your rates, choose loan types, and grow your portfolio. Verified business lenders get access to our borrower network and trust-based matching.',
  keywords: [
    'business lending',
    'become a lender',
    'lend money',
    'peer to peer lending business',
    'Feyza for business',
    'lending platform',
  ],
  openGraph: {
    title: 'For Business | Feyza - Lend to Qualified Borrowers',
    description: 'Join Feyza as a business lender. Set your terms, get matched with borrowers, and grow your lending portfolio.',
    url: '/for-business',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'For Business | Feyza Lending',
    description: 'Lend to qualified borrowers. Set your rates and get matched on Feyza.',
  },
  alternates: { canonical: '/for-business' },
};

export default function ForBusinessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
