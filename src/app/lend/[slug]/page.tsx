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
  Tag,
  Share2,
  Twitter,
  Facebook,
  Linkedin,
  Copy,
  Check,
  // Loan Type Icons
  Briefcase,
  Home,
  Car,
  GraduationCap,
  Heart,
  Stethoscope,
  Plane,
  ShoppingBag,
  Wrench,
  Baby,
  Wallet,
  PiggyBank,
  Gift,
  Package,
  Sparkles,
  LucideIcon,
} from 'lucide-react';

// Loan Type Icon Mapping
const LOAN_TYPE_ICONS: Record<string, LucideIcon> = {
  'business': Briefcase,
  'commercial': Briefcase,
  'personal': Wallet,
  'home': Home,
  'mortgage': Home,
  'housing': Home,
  'car': Car,
  'auto': Car,
  'vehicle': Car,
  'education': GraduationCap,
  'school': GraduationCap,
  'tuition': GraduationCap,
  'medical': Stethoscope,
  'health': Heart,
  'emergency': Zap,
  'travel': Plane,
  'vacation': Plane,
  'shopping': ShoppingBag,
  'retail': ShoppingBag,
  'repair': Wrench,
  'maintenance': Wrench,
  'baby': Baby,
  'family': Baby,
  'childcare': Baby,
  'wedding': Gift,
  'gift': Gift,
  'savings': PiggyBank,
  'debt': CreditCard,
  'consolidation': CreditCard,
  'other': Package,
  'general': Package,
};

// Helper to get icon for loan type
const getLoanTypeIcon = (loanType: LoanType): LucideIcon => {
  const slug = loanType.slug?.toLowerCase() || '';
  const name = loanType.name?.toLowerCase() || '';
  
  // Check slug first
  for (const [key, icon] of Object.entries(LOAN_TYPE_ICONS)) {
    if (slug.includes(key) || name.includes(key)) {
      return icon;
    }
  }
  
  // Default icons based on common patterns
  if (slug.includes('loan') || name.includes('loan')) return Wallet;
  if (slug.includes('fund') || name.includes('fund')) return Sparkles;
  
  return Package; // Default fallback
};

interface LenderPreferences {
  min_amount: number;
  max_amount: number;
  interest_rate: number;
  interest_type: 'simple' | 'compound';
  min_term_weeks: number;
  max_term_weeks: number;
  first_time_borrower_limit?: number;
  countries?: string[];
  states?: string[];
}

interface LoanType {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

interface Country {
  code: string;
  name: string;
}

interface State {
  code: string;
  name: string;
}

export default function PublicLenderPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [lender, setLender] = useState<BusinessProfile | null>(null);
  const [lenderPrefs, setLenderPrefs] = useState<LenderPreferences | null>(null);
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  // Share button state
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

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
        .select('min_amount, max_amount, interest_rate, interest_type, min_term_weeks, max_term_weeks, first_time_borrower_limit, countries, states')
        .eq('business_id', business.id)
        .single();

      if (prefs) setLenderPrefs(prefs);

      // Fetch loan types this lender offers
      const { data: businessLoanTypes } = await supabase
        .from('business_loan_types')
        .select(`
          loan_type:loan_types(id, name, slug, description, icon)
        `)
        .eq('business_id', business.id)
        .eq('is_active', true);

      if (businessLoanTypes) {
        const types = businessLoanTypes
          .map((blt: any) => blt.loan_type)
          .filter((lt: any) => lt !== null);
        setLoanTypes(types);
      }

      // Fetch countries
      const { data: countriesData } = await supabase
        .from('countries')
        .select('code, name')
        .eq('is_active', true);
      
      if (countriesData) {
        setCountries(countriesData);
      }

      // Fetch states
      const { data: statesData } = await supabase
        .from('states')
        .select('code, name')
        .eq('is_active', true);
      
      if (statesData) {
        setStates(statesData);
      }

      setLoading(false);
    };

    fetchLender();
  }, [slug]);

  const handleRequestLoan = () => {
    sessionStorage.setItem('preferred_lender_slug', slug);
    
    if (!user) {
      router.push('/apply/' + slug);
      return;
    }
    
    if (!user.is_verified) {
      router.push('/apply/' + slug);
      return;
    }
    
    router.push('/loans/new?lender=' + slug);
  };

  // Share handlers
  const handleShare = () => {
    const url = canonicalUrl;
    const title = socialTitle;
    const text = socialDescription;

    if (navigator.share) {
      // Use native share on mobile
      navigator.share({
        title,
        text,
        url,
      }).catch(console.error);
    } else {
      // Show custom share menu on desktop
      setShowShareMenu(!showShareMenu);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(canonicalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterDescription)}&url=${encodeURIComponent(canonicalUrl)}`;
    window.open(url, '_blank');
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`;
    window.open(url, '_blank');
  };

  const handleLinkedInShare = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonicalUrl)}`;
    window.open(url, '_blank');
  };

  const handleWhatsAppShare = () => {
    const text = `${socialDescription} ${canonicalUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const getCountryName = (code: string) => {
    const country = countries.find(c => c.code === code);
    return country?.name || code;
  };

  const getStateName = (code: string) => {
    const state = states.find(s => s.code === code);
    return state?.name || code;
  };

  // Prepare SEO and Social Media data
  const minAmount = lenderPrefs?.min_amount || (lender as any)?.min_loan_amount || 50;
  const maxAmount = lenderPrefs?.max_amount || (lender as any)?.max_loan_amount || 5000;
  const interestRate = lenderPrefs?.interest_rate || (lender as any)?.default_interest_rate || 0;
  
  const businessName = lender?.business_name || '';
  const tagline = lender?.tagline || '';
  const description = (lender as any)?.description || '';
  const businessType = getBusinessTypeLabel((lender as any)?.business_type || '');
  const state = (lender as any)?.state || '';
  const logoUrl = (lender as any)?.logo_url || '';
  
  // DYNAMIC OG IMAGE ENDPOINT
  const shareImage = `https://feyza.app/api/og/lender/${slug}`;
  
  // Generate SEO-friendly title and descriptions
  const pageTitle = `${businessName} - Verified Lender on Feyza | Get Loans Up to ${formatCurrency(maxAmount)}`;
  
  // SOCIAL MEDIA OPTIMIZED METADATA - THIRD PERSON (SHAREABLE BY ANYONE)
  const socialTitle = `${businessName} is offering loans on Feyza 💰 | No hidden fees`;
  
  const socialDescription = lenderPrefs 
    ? `💰 Borrow $${minAmount.toLocaleString()} to $${maxAmount.toLocaleString()} from ${businessName} on Feyza! No hidden fees, fast approval, and ${interestRate === 0 ? '0% interest' : `only ${interestRate}% interest`}. Apply now →` 
    : `💰 ${businessName} is offering loans on Feyza! No hidden fees, fair rates, and fast funding. Apply now →`;
  
  const metaDescription = `${businessName} offers loans from ${formatCurrency(minAmount)} to ${formatCurrency(maxAmount)} at ${interestRate === 0 ? 'interest-free' : `${interestRate}%`} interest. ${tagline} Fast approval, transparent terms, no hidden fees. Apply now on Feyza!`;
  
  const twitterDescription = `💰 ${businessName} offers $${minAmount.toLocaleString()}-$${maxAmount.toLocaleString()} loans on Feyza. ${interestRate === 0 ? '0% interest' : `${interestRate}% interest`}, no hidden fees!`;
  
  const canonicalUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/lend/${slug}`
    : `https://feyza.app/lend/${slug}`;
  
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

  // Click outside to close share menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showShareMenu && !(e.target as Element).closest('.share-menu-container')) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showShareMenu]);

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading Lender Profile - Feyza</title>
          <meta name="description" content="Loading lender information on Feyza." />
          <meta property="og:title" content="Loading Lender Profile - Feyza" />
          <meta property="og:description" content="Loading lender information on Feyza." />
          <meta property="og:image" content="https://feyza.app/default-share-image.jpg" />
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

  const servingCountries = lenderPrefs?.countries || [];
  const servingStates = lenderPrefs?.states || [];

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>{pageTitle}</title>
        <meta name="title" content={socialTitle} />
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content={`${businessName}, loan, personal loan, business loan, ${businessType.toLowerCase()}, fast loan, online loan, Feyza, peer-to-peer lending, ${state} loans`} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph / Facebook / LinkedIn / WhatsApp */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={socialTitle} />
        <meta property="og:description" content={socialDescription} />
        <meta property="og:image" content={shareImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={`${businessName} - Lending on Feyza with no hidden fees`} />
        <meta property="og:site_name" content="Feyza" />
        <meta property="og:locale" content="en_US" />
        
        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@feyza" />
        <meta name="twitter:creator" content="@feyza" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={socialTitle} />
        <meta name="twitter:description" content={twitterDescription} />
        <meta name="twitter:image" content={shareImage} />
        <meta name="twitter:image:alt" content={`${businessName} - Lending on Feyza`} />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <meta name="author" content={businessName} />
        <meta name="theme-color" content="#059669" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FinancialService",
            "name": businessName,
            "description": metaDescription,
            "url": canonicalUrl,
            "logo": logoUrl || shareImage,
            "image": shareImage,
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
              }
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "5",
              "reviewCount": "1"
            }
          })}
        </script>
      </Head>

      {/* Breadcrumb Schema */}
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

      <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
        <Navbar user={user} />

        <main className="flex-1">
          {/* Hero Section */}
          <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 min-w-0">
                  <div className="flex items-start gap-6">
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

          {/* Loan Terms Section */}
          <div className="bg-neutral-50 dark:bg-neutral-900/50 py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
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

                <div className="h-full bg-white dark:bg-neutral-800 rounded-2xl p-5 text-center border border-neutral-200 dark:border-neutral-700 flex flex-col">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">Approval Time</p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white">Fast</p>
                  <p className="text-xs text-neutral-400 mt-auto">Usually &lt; 24 hours</p>
                </div>

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

                {/* Loan Types Offered - WITH LUCIDE ICONS */}
                {loanTypes.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                      <Tag className="w-5 h-5 text-green-600" />
                      Loan Types Offered
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {loanTypes.map((lt) => {
                        const IconComponent = getLoanTypeIcon(lt);
                        return (
                          <div
                            key={lt.id}
                            className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-green-300 dark:hover:border-green-700 transition-all hover:shadow-md"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <IconComponent className="w-4 h-4 text-green-600 dark:text-green-400" />
                              </div>
                              <h3 className="font-medium text-neutral-900 dark:text-white">
                                {lt.name}
                              </h3>
                            </div>
                            {lt.description && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 pl-10">
                                {lt.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Service Areas */}
                {(servingCountries.length > 0 || servingStates.length > 0) && (
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-600" />
                      Service Areas
                    </h2>
                    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
                      {servingCountries.length > 0 && (
                        <div className="mb-4">
                          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Countries
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {servingCountries.map((code) => (
                              <span
                                key={code}
                                className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                              >
                                {getCountryName(code)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {servingStates.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            States / Regions
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {servingStates.map((code) => (
                              <span
                                key={code}
                                className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-sm"
                              >
                                {getStateName(code)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* How It Works */}
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-6">
                    How It Works
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr">
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

              {/* Right Column - WITH SHARE BUTTON */}
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
                    {loanTypes.length > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">Loan types</span>
                        <span className="font-medium text-neutral-900 dark:text-white">{loanTypes.length} available</span>
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

                {/* ENHANCED SHARE BUTTON SECTION */}
                <Card className="p-5 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-blue-600" />
                      Share this lender
                    </h3>
                    
                    {/* Share Button Container */}
                    <div className="relative share-menu-container">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShare}
                        className="flex items-center gap-2 bg-white dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </Button>

                      {/* Custom Share Menu (Desktop) */}
                      {showShareMenu && !navigator.share && (
                        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden z-50">
                          <div className="p-2">
                            <button
                              onClick={handleCopyLink}
                              className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                            >
                              {copied ? (
                                <Check className="w-5 h-5 text-green-600" />
                              ) : (
                                <Copy className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                              )}
                              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                                {copied ? 'Link copied!' : 'Copy link'}
                              </span>
                            </button>
                            
                            <button
                              onClick={handleTwitterShare}
                              className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                            >
                              <Twitter className="w-5 h-5 text-[#1DA1F2]" />
                              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                                Share on X (Twitter)
                              </span>
                            </button>
                            
                            <button
                              onClick={handleFacebookShare}
                              className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                            >
                              <Facebook className="w-5 h-5 text-[#4267B2]" />
                              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                                Share on Facebook
                              </span>
                            </button>
                            
                            <button
                              onClick={handleLinkedInShare}
                              className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                            >
                              <Linkedin className="w-5 h-5 text-[#0077B5]" />
                              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                                Share on LinkedIn
                              </span>
                            </button>

                            <button
                              onClick={handleWhatsAppShare}
                              className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                            >
                              <svg className="w-5 h-5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                              </svg>
                              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                                Share on WhatsApp
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    Help others discover trusted lending with no hidden fees
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