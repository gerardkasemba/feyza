import type { MetadataRoute } from 'next';
import { createServiceRoleClientDirect } from '@/lib/supabase/server';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://feyza.app';

/** Public routes we want indexed. Auth, dashboard, and app pages are excluded. */
const staticRoutes: { url: string; lastModified?: Date; changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'; priority?: number }[] = [
  { url: '', changeFrequency: 'weekly', priority: 1 },
  { url: '/borrow', changeFrequency: 'weekly', priority: 0.9 },
  { url: '/how-vouching-works', changeFrequency: 'monthly', priority: 0.8 },
  { url: '/for-business', changeFrequency: 'monthly', priority: 0.8 },
  { url: '/features', changeFrequency: 'monthly', priority: 0.7 },
  { url: '/faq', changeFrequency: 'monthly', priority: 0.7 },
  { url: '/pricing', changeFrequency: 'monthly', priority: 0.7 },
  { url: '/about', changeFrequency: 'monthly', priority: 0.6 },
  { url: '/contact', changeFrequency: 'monthly', priority: 0.6 },
  { url: '/help', changeFrequency: 'monthly', priority: 0.6 },
  { url: '/terms', changeFrequency: 'yearly', priority: 0.4 },
  { url: '/privacy', changeFrequency: 'yearly', priority: 0.4 },
  { url: '/apply', changeFrequency: 'weekly', priority: 0.7 },
  { url: '/loan-status', changeFrequency: 'monthly', priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map(({ url, lastModified, changeFrequency, priority }) => ({
    url: `${baseUrl}${url || '/'}`,
    lastModified: lastModified ?? new Date(),
    changeFrequency,
    priority: priority ?? 0.5,
  }));

  // Dynamic lender pages (public business profiles)
  let lenderEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = createServiceRoleClientDirect();
    const { data: lenders } = await supabase
      .from('business_profiles')
      .select('slug')
      .in('verification_status', ['verified', 'approved']);
    type Row = { slug: string | null };
    const rows = (lenders || []) as Row[];
    const withSlug = (l: Row): l is Row & { slug: string } => Boolean(l.slug);
    lenderEntries = rows
      .filter(withSlug)
      .map((l) => ({
        url: `${baseUrl}/lend/${l.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    const applyEntries: MetadataRoute.Sitemap = rows
      .filter(withSlug)
      .map((l) => ({
        url: `${baseUrl}/apply/${l.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    lenderEntries = [...lenderEntries, ...applyEntries];
  } catch {
    // Sitemap still works with static entries only
  }

  return [...staticEntries, ...lenderEntries];
}
