import type { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://feyza.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/dashboard',
          '/settings',
          '/notifications',
          '/admin/',
          '/verify',
          '/verify/',
          '/loans/',      // app loan detail (private)
          '/lender/',     // lender dashboard (private)
          '/business/',   // business dashboard (private)
          '/vouch/',
          '/invite/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/dashboard',
          '/settings',
          '/notifications',
          '/admin/',
          '/verify',
          '/verify/',
          '/loans/',
          '/lender/',
          '/business/',
          '/vouch/',
          '/invite/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
