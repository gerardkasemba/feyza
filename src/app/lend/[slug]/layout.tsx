import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return { title: 'Lender' };

  const supabase = await createServiceRoleClient();
  const { data: business } = await supabase
    .from('business_profiles')
    .select('business_name, tagline, description')
    .eq('slug', slug)
    .single();

  if (!business) {
    return {
      title: 'Lender Not Found',
      robots: { index: false, follow: false },
    };
  }

  const name = business.business_name || 'Lender';
  const description =
    business.tagline ||
    business.description ||
    `Borrow from ${name} on Feyza. Trusted business lender with transparent rates and terms.`;

  const canonical = `/lend/${slug}`;
  return {
    title: `${name} | Lend with Feyza`,
    description,
    openGraph: {
      title: `${name} | Feyza - Borrow from a Trusted Lender`,
      description,
      url: canonical,
      images: [{ url: `/api/og/lender/${slug}`, width: 1200, height: 630, alt: `${name} on Feyza` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | Feyza`,
      description,
    },
    alternates: { canonical },
  };
}

export default function LenderSlugLayout({ children }: Props) {
  return children;
}
