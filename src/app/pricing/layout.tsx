import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing & Fees',
  description:
    'Feyza pricing and platform fees. Transparent costs for borrowers and lenders. No hidden fees.',
  openGraph: {
    title: 'Pricing | Feyza - Transparent Lending Fees',
    description: 'See Feyza platform fees for borrowers and lenders. Transparent pricing.',
    url: '/pricing',
  },
  alternates: { canonical: '/pricing' },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
