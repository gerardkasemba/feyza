import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Feyza Terms of Service. Read the terms and conditions for using our lending platform.',
  openGraph: { title: 'Terms of Service | Feyza', url: '/terms' },
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
