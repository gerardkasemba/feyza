import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Feyza',
  description:
    'Feyza is a trust-based lending platform connecting borrowers with friends, family, and verified business lenders. Learn our story and mission.',
  openGraph: {
    title: 'About Us | Feyza - Borrow & Lend with Trust',
    description: 'Our mission: make lending simple, transparent, and trust-based.',
    url: '/about',
  },
  alternates: { canonical: '/about' },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
