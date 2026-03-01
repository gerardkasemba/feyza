import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Feyza features: trust scores, community vouching, loan tracking, payments, and verification. Everything you need to borrow or lend with confidence.',
  openGraph: {
    title: 'Features | Feyza - Borrow & Lend with Trust',
    description: 'Trust scores, vouching, loan management, and more on Feyza.',
    url: '/features',
  },
  alternates: { canonical: '/features' },
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
