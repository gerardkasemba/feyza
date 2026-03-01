import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help & Support',
  description: 'Feyza help center. Guides for borrowing, lending, vouching, and managing your account.',
  openGraph: { title: 'Help | Feyza', url: '/help' },
  alternates: { canonical: '/help' },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
