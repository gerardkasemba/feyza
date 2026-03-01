import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Feyza. Support, partnerships, and general inquiries.',
  openGraph: { title: 'Contact | Feyza', url: '/contact' },
  alternates: { canonical: '/contact' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
