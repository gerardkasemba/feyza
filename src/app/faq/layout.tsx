import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'FAQs about Feyza: borrowing, lending, vouching, trust scores, payments, and account verification.',
  openGraph: {
    title: 'FAQ | Feyza - Borrow & Lend with Trust',
    description: 'Common questions about Feyza lending, vouching, and trust scores.',
    url: '/faq',
  },
  alternates: { canonical: '/faq' },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
