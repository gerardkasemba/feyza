import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/ui';
import './globals.css';

// Base URL for your site - update this with your actual domain
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://feyza.app';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#059669' }, // emerald-600
    { media: '(prefers-color-scheme: dark)', color: '#10b981' },  // emerald-500
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Feyza - Borrow & Lend with Trust',
    template: '%s | Feyza',
  },
  description: 'Feyza makes lending between friends, family, and trusted businesses simple, transparent, and secure. Borrow from people you trust or businesses that care.',
  keywords: [
    'peer to peer lending',
    'personal loans',
    'business loans',
    'community lending',
    'fintech',
    'loan tracking',
    'money lending app',
    'borrow money',
    'lend money',
    'feyza',
    'feza',
    'trust-based lending',
    'informal lending',
    'loan management',
    'payment tracking',
    'debt management',
    'financial wellness',
    'alternative lending',
    'social lending',
    'micro lending',
  ],
  authors: [{ name: 'Feyza Team' }],
  creator: 'Feyza',
  publisher: 'Feyza',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  
  // Open Graph for Facebook, LinkedIn, etc.
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    title: 'Feyza - Borrow & Lend with Trust',
    description: 'Borrow from people you trust or businesses that care. Simple, transparent lending between friends, family, and verified businesses.',
    siteName: 'Feyza',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Feyza - Modern lending platform for people and businesses',
      },
      {
        url: '/og-image.png',
        width: 1200,
        height: 1200,
        alt: 'Feyza - Modern lending platform for people and businesses',
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'Feyza - Borrow & Lend with Trust',
    description: 'Borrow from people you trust or businesses that care. Simple, transparent lending between friends, family, and verified businesses.',
    creator: '@feyza_app',
    site: '@feyza_app',
  },
  
  // Additional SEO
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // App Icons
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'apple-touch-icon-precomposed',
        url: '/apple-touch-icon-precomposed.png',
      },
    ],
  },
  
  // Manifest for PWA
  manifest: '/site.webmanifest',
  
  // Apple specific
  appleWebApp: {
    title: 'Feyza',
    statusBarStyle: 'default',
  },
  
  // Additional meta tags
  other: {
    'application-name': 'Feyza',
    'msapplication-TileColor': '#059669',
    'msapplication-config': '/browserconfig.xml',
    'fb:app_id': 'YOUR_FACEBOOK_APP_ID', // Add your Facebook App ID if you have one
  },
};

// Script to prevent flash of wrong theme
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('feyza-theme');
      if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        
        {/* Structured Data for better SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FinancialService',
              'name': 'Feyza',
              'description': 'Peer-to-peer lending platform connecting borrowers with trusted individuals and verified businesses.',
              'url': baseUrl,
              'logo': `${baseUrl}/logo.svg`,
              'sameAs': [
                'https://twitter.com/feyza_app',
                'https://www.facebook.com/feyzaapp',
                'https://www.linkedin.com/company/feyza',
                'https://www.instagram.com/feyza_app',
              ],
              'contactPoint': {
                '@type': 'ContactPoint',
                'contactType': 'customer service',
                'availableLanguage': ['English'],
              },
              'aggregateRating': {
                '@type': 'AggregateRating',
                'ratingValue': '4.8',
                'ratingCount': '150',
                'bestRating': '5',
                'worstRating': '1',
              },
              'offers': {
                '@type': 'Offer',
                'category': 'FinancialService',
              },
            }),
          }}
        />
        
        {/* Additional structured data for loan service */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Service',
              'serviceType': 'Personal & Business Lending',
              'provider': {
                '@type': 'Organization',
                'name': 'Feyza',
              },
              'areaServed': {
                '@type': 'Country',
                'name': 'Worldwide',
              },
              'hasOfferCatalog': {
                '@type': 'OfferCatalog',
                'name': 'Lending Services',
                'itemListElement': [
                  {
                    '@type': 'Offer',
                    'itemOffered': {
                      '@type': 'Service',
                      'name': 'Personal Loans',
                      'description': 'Borrow from friends, family, and trusted contacts',
                    },
                  },
                  {
                    '@type': 'Offer',
                    'itemOffered': {
                      '@type': 'Service',
                      'name': 'Business Loans',
                      'description': 'Borrow from verified businesses with transparent terms',
                    },
                  },
                  {
                    '@type': 'Offer',
                    'itemOffered': {
                      '@type': 'Service',
                      'name': 'Loan Management',
                      'description': 'Track payments, set reminders, and manage your loans',
                    },
                  },
                ],
              },
            }),
          }}
        />
        
        {/* Additional meta tags for better mobile experience */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* Security headers (inspired by Next.js best practices) */}
        <meta httpEquiv="x-ua-compatible" content="ie=edge" />
      </head>
      <body className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}