import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How Vouching Works | Vouch Without Risking Your Money',
  description:
    'Feyza vouching is not co-signing. Support someone with your reputation, not your wallet. Learn how community vouching builds trust and unlocks loans without putting your money at risk.',
  keywords: [
    'vouching',
    'vouch for someone',
    'co-signing vs vouching',
    'trust-based lending',
    'community vouching',
    'Feyza vouching',
  ],
  openGraph: {
    title: 'How Vouching Works | Feyza - Stake Reputation, Not Cash',
    description:
      'Support someone without risking your money. Feyza vouching uses reputation, not co-signing. Learn how it works.',
    url: '/how-vouching-works',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How Vouching Works | Feyza',
    description: 'Vouch for someone with your reputation, not your wallet. No co-signing risk.',
  },
  alternates: { canonical: '/how-vouching-works' },
};

export default function HowVouchingWorksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
