import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return { title: 'Apply for a Loan' };

  const supabase = await createServiceRoleClient();
  const { data: business } = await supabase
    .from('business_profiles')
    .select('business_name, tagline')
    .eq('slug', slug)
    .single();

  if (!business) {
    return {
      title: 'Apply for a Loan | Feyza',
      robots: { index: false, follow: false },
    };
  }

  const name = business.business_name || 'this lender';
  const description =
    business.tagline || `Apply for a loan with ${name} on Feyza. Quick application and transparent terms.`;

  return {
    title: `Apply with ${name} | Feyza`,
    description,
    openGraph: {
      title: `Apply with ${name} | Feyza`,
      description,
      url: `/apply/${slug}`,
    },
    alternates: { canonical: `/apply/${slug}` },
  };
}

export default function ApplySlugLayout({ children }: Props) {
  return children;
}
