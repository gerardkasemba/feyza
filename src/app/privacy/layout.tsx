import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Feyza Privacy Policy. How we collect, use, and protect your data.',
  openGraph: { title: 'Privacy Policy | Feyza', url: '/privacy' },
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
