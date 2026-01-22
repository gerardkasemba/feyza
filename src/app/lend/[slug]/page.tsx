'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Head from 'next/head';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { BusinessProfile } from '@/types';
import {
  Building2,
  MapPin,
  Globe,
  Calendar,
  DollarSign,
  Percent,
  Shield,
  CheckCircle,
  ArrowRight,
  Clock,
  ExternalLink,
  Mail,
  Phone,
  Zap,
  CreditCard,
  FileText,
  TrendingUp,
  Award,
} from 'lucide-react';

interface LenderPreferences {
  min_amount: number;
  max_amount: number;
  interest_rate: number;
  interest_type: 'simple' | 'compound';
  min_term_weeks: number;
  max_term_weeks: number;
  first_time_borrower_limit?: number;
}

export default function PublicLenderPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [lender, setLender] = useState<BusinessProfile | null>(null);
  const [lenderPrefs, setLenderPrefs] = useState<LenderPreferences | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchLender = async () => {
      const supabase = createClient();

      // Get current user (optional)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        setUser(profile);
      }

      // Fetch lender by slug
      const { data: business, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('slug', slug)
        .eq('public_profile_enabled', true)
        .eq('verification_status', 'approved')
        .single();

      if (error || !business) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLender(business);

      // Fetch lender preferences for loan terms
      const { data: prefs } = await supabase
        .from('lender_preferences')
        .select('min_amount, max_amount, interest_rate, interest_type, min_term_weeks, max_term_weeks, first_time_borrower_limit')
        .eq('business_id', business.id)
        .single();

      if (prefs) setLenderPrefs(prefs);

      setLoading(false);
    };

    fetchLender();
  }, [slug]);

  const handleRequestLoan = () => {
    sessionStorage.setItem('preferred_lender_slug', slug);
    router.push('/loans/new?lender=' + slug);
  };

  // Prepare SEO data
  const minAmount = lenderPrefs?.min_amount || (lender as any)?.min_loan_amount || 50;
  const maxAmount = lenderPrefs?.max_amount || (lender as any)?.max_loan_amount || 5000;
  const interestRate = lenderPrefs?.interest_rate || (lender as any)?.default_interest_rate || 0;
  
  const businessName = lender?.business_name || '';
  const tagline = lender?.tagline || '';
  const description = (lender as any)?.description || '';
  const businessType = getBusinessTypeLabel((lender as any)?.business_type || '');
  const state = (lender as any)?.state || '';
  
  // Generate SEO-friendly title and descriptions
  const pageTitle = `${businessName} - Verified Lender on Feyza | Get Loans Up to ${formatCurrency(maxAmount)}`;
  const metaDescription = `${tagline} ${businessName} offers loans from ${formatCurrency(minAmount)} to ${formatCurrency(maxAmount)} at ${interestRate === 0 ? 'interest-free' : `${interestRate}%`} interest. Fast approval, transparent terms. Apply now!`;
  const ogDescription = `Need a loan? ${businessName} provides fast, fair loans on Feyza. Apply online in minutes. Verified lender with ${interestRate === 0 ? 'interest-free' : `${interestRate}%`} rates!`;
  
  const canonicalUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/lend/${slug}`
    : `https://feyza.app/lend/${slug}`;
  
  const shareImage = (lender as any)?.logo_url || '/default-share-image.jpg';
  
  // Helper function for business type
  function getBusinessTypeLabel(type: string) {
    const types: Record<string, string> = {
      microfinance: 'Microfinance Institution',
      credit_union: 'Credit Union',
      community_lender: 'CDFI',
      fintech: 'FinTech Lender',
      peer_lending: 'Peer-to-Peer Platform',
      payday_lender: 'Licensed Lender',
      investment_club: 'Investment Club',
      other: 'Lending Company',
    };
    return types[type] || type;
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading Lender Profile - Feyza</title>
          <meta name="description" content="Loading lender information on Feyza peer-to-peer lending platform." />
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-neutral-500">Loading lender profile...</p>
          </div>
        </div>
      </>
    );
  }

  if (notFound || !lender) {
    return (
      <>
        <Head>
          <title>Lender Not Found - Feyza</title>
          <meta name="description" content="The lender profile you're looking for doesn't exist or isn't publicly available on Feyza." />
          <meta name="robots" content="noindex, follow" />
        </Head>
        <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
          <Navbar user={user} />
          <main className="flex-1 flex items-center justify-center p-4">
            <Card className="max-w-md text-center p-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                <Building2 className="w-10 h-10 text-neutral-400" />
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Lender Not Found</h1>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                This lender profile doesn't exist or isn't publicly available.
              </p>
              <Link href="/loans/new">
                <Button size="lg">Browse All Lenders</Button>
              </Link>
            </Card>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>{pageTitle}</title>
        <meta name="title" content={pageTitle} />
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content={`${businessName}, loan, personal loan, business loan, ${businessType.toLowerCase()}, fast loan, online loan, Feyza, peer-to-peer lending, ${state} loans`} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={shareImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={`${businessName} - Verified Lender on Feyza`} />
        <meta property="og:site_name" content="Feyza" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={canonicalUrl} />
        <meta property="twitter:title" content={pageTitle} />
        <meta property="twitter:description" content={ogDescription} />
        <meta property="twitter:image" content={shareImage} />
        <meta property="twitter:image:alt" content={`${businessName} - Verified Lender on Feyza`} />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <meta name="author" content={businessName} />
        
        {/* Structured Data / Schema.org */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FinancialService",
            "name": businessName,
            "description": tagline,
            "url": canonicalUrl,
            "logo": shareImage,
            "sameAs": (lender as any)?.website_url ? [(lender as any).website_url] : [],
            "address": {
              "@type": "PostalAddress",
              "addressRegion": state,
              "addressCountry": "US"
            },
            "offers": {
              "@type": "Offer",
              "priceSpecification": {
                "@type": "UnitPriceSpecification",
                "priceCurrency": "USD",
                "minPrice": minAmount,
                "maxPrice": maxAmount
              },
              "eligibleRegion": {
                "@type": "Country",
                "name": "United States"
              }
            },
            "areaServed": {
              "@type": "State",
              "name": state || "United States"
            }
          })}
        </script>

        {/* Additional structured data for business */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": businessName,
            "description": tagline,
            "url": canonicalUrl,
            "logo": shareImage,
            "sameAs": (lender as any)?.website_url ? [(lender as any).website_url] : []
          })}
        </script>
      </Head>

      <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
        <Navbar user={user} />

        {/* Add breadcrumb schema markup */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [{
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://feyza.app"
            }, {
              "@type": "ListItem",
              "position": 2,
              "name": "Lenders",
              "item": "https://feyza.app/lenders"
            }, {
              "@type": "ListItem",
              "position": 3,
              "name": businessName,
              "item": canonicalUrl
            }]
          })}
        </script>

        <main className="flex-1">
          {/* Hero Section (grid-based for stable layout) */}
          <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left */}
                <div className="lg:col-span-8 min-w-0">
                  <div className="flex items-start gap-6">
                    {/* Logo */}
                    <div className="w-24 h-24 rounded-2xl flex-shrink-0 overflow-hidden bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700">
                      {lender.logo_url ? (
                        <img
                          src={lender.logo_url}
                          alt={`${businessName} logo`}
                          className="w-full h-full object-cover"
                          loading="eager"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600">
                          <span className="text-white text-3xl font-bold">
                            {businessName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white break-words">
                          {businessName}
                        </h1>
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Verified
                        </Badge>
                      </div>

                      {tagline && (
                        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
                          {tagline}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-4 h-4" />
                          {businessType}
                        </span>
                        {state && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            {state}, USA
                          </span>
                        )}
                        {(lender as any).years_in_business && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {(lender as any).years_in_business}+ years
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className="lg:col-span-4">
                  <div className="bg-gradient-to-br from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 rounded-2xl p-6 text-white dark:text-green-50 shadow-xl">
                    <h3 className="text-lg font-semibold mb-2 dark:text-green-100">Ready to borrow?</h3>
                    <p className="text-green-100 dark:text-green-200 text-sm mb-4">
                      Get funds quickly with fair rates and no hidden fees.
                    </p>
                    <Button
                      size="lg"
                      className="w-full bg-white dark:bg-green-50 text-green-700 dark:text-green-800 hover:bg-green-50 dark:hover:bg-green-100 font-semibold"
                      onClick={handleRequestLoan}
                    >
                      Request a Loan
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loan Terms Section (equal-height cards) */}
          <div className="bg-neutral-50 dark:bg-neutral-900/50 py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
                {/* Loan Amount */}
                <div className="h-full bg-white dark:bg-neutral-800 rounded-2xl p-5 text-center border border-neutral-200 dark:border-neutral-700 flex flex-col">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">Loan Range</p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(minAmount)}
                  </p>
                  <p className="text-xs text-neutral-400 mt-auto">to {formatCurrency(maxAmount)}</p>
                </div>

                {/* Interest Rate */}
                <div className="h-full bg-white dark:bg-neutral-800 rounded-2xl p-5 text-center border border-neutral-200 dark:border-neutral-700 flex flex-col">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Percent className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">Interest Rate</p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white">
                    {interestRate === 0 ? 'Interest Free' : `${interestRate}%`}
                  </p>
                  <p className="text-xs text-neutral-400 capitalize mt-auto">{(lenderPrefs?.interest_type || 'simple')} interest</p>
                </div>

                {/* Fast Approval */}
                <div className="h-full bg-white dark:bg-neutral-800 rounded-2xl p-5 text-center border border-neutral-200 dark:border-neutral-700 flex flex-col">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">Approval Time</p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white">Fast</p>
                  <p className="text-xs text-neutral-400 mt-auto">Usually &lt; 24 hours</p>
                </div>

                {/* No Hidden Fees */}
                <div className="h-full bg-white dark:bg-neutral-800 rounded-2xl p-5 text-center border border-neutral-200 dark:border-neutral-700 flex flex-col">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">Hidden Fees</p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white">None</p>
                  <p className="text-xs text-neutral-400 mt-auto">Transparent pricing</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column */}
              <div className="lg:col-span-8 space-y-8 min-w-0">
                {/* About */}
                {description && (
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
                      About {businessName}
                    </h2>
                    <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {description}
                    </p>
                  </div>
                )}

                {/* How It Works (equal height, no fragile connector line) */}
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-6">
                    How It Works
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr">
                    {/* Step 1 */}
                    <div className="h-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/30 p-5">
                      <div className="flex flex-col items-center text-center h-full">
                        <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                          <FileText className="w-7 h-7 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold mb-3">
                          1
                        </span>
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">Submit Request</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-auto">
                          Fill out the loan request form with your desired amount and terms.
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="h-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/30 p-5">
                      <div className="flex flex-col items-center text-center h-full">
                        <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                          <Clock className="w-7 h-7 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold mb-3">
                          2
                        </span>
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">Quick Review</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-auto">
                          {businessName} reviews your request, typically within 24 hours.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="h-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/30 p-5">
                      <div className="flex flex-col items-center text-center h-full">
                        <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                          <CreditCard className="w-7 h-7 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold mb-3">
                          3
                        </span>
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">Receive Funds</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-auto">
                          Once approved, funds are sent directly to your account.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Why Choose */}
                <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
                    Why Choose {businessName}?
                  </h2>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">Verified Lender</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Identity and business verified</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">Fast Decisions</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Quick approval process</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">Transparent Terms</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">No hidden fees or surprises</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">Build Credit</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Improve your borrowing tier</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (sticky whole column) */}
              <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6 self-start">
                {/* Apply Now Card */}
                <Card className="p-6">
                  <div className="text-center pb-4 border-b border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Borrow up to</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(maxAmount)}
                    </p>
                    {interestRate === 0 ? (
                      <Badge className="mt-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                        Interest Free!
                      </Badge>
                    ) : (
                      <p className="text-sm text-neutral-500 mt-1">at {interestRate}% APR</p>
                    )}
                  </div>

                  <div className="py-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-500 dark:text-neutral-400">Min. amount</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(minAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-500 dark:text-neutral-400">Interest type</span>
                      <span className="font-medium text-neutral-900 dark:text-white capitalize">{lenderPrefs?.interest_type || 'simple'}</span>
                    </div>
                    {lenderPrefs?.first_time_borrower_limit && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">First-time limit</span>
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {formatCurrency(lenderPrefs.first_time_borrower_limit)}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    size="lg"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleRequestLoan}
                  >
                    Apply Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <p className="text-xs text-center text-neutral-400 mt-3">
                    No impact on your credit score
                  </p>
                </Card>

                {/* Contact Info */}
                {((lender as any).contact_email || (lender as any).contact_phone || (lender as any).website_url) && (
                  <Card className="p-6">
                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Contact</h3>

                    <div className="space-y-3">
                      {(lender as any).contact_email && (
                        <a
                          href={`mailto:${(lender as any).contact_email}`}
                          className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                          {(lender as any).contact_email}
                        </a>
                      )}

                      {(lender as any).contact_phone && (
                        <a
                          href={`tel:${(lender as any).contact_phone}`}
                          className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          {(lender as any).contact_phone}
                        </a>
                      )}

                      {(lender as any).website_url && (
                        <a
                          href={(lender as any).website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        >
                          <Globe className="w-4 h-4" />
                          Visit Website
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </Card>
                )}

                {/* Trust Badge */}
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-300 text-sm">Verified by Feyza</p>
                    <p className="text-xs text-green-600 dark:text-green-400">Licensed & trusted lender</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}