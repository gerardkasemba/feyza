import type { Metadata } from 'next';
import { ToastProvider } from '@/components/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'LoanTrack - Simple Loan Tracking',
  description: 'Track loans between friends, family, and businesses. No banks required.',
  keywords: ['loan tracking', 'personal loans', 'community lending', 'fintech'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
