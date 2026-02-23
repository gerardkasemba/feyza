'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Head from 'next/head';
import { Navbar, Footer } from '@/components/layout';
import { Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { BusinessProfile } from '@/types';
import {
  Building2, MapPin, Globe, Calendar, DollarSign, Percent, Shield, CheckCircle,
  ArrowRight, Clock, ExternalLink, Mail, Phone, Zap, CreditCard, FileText,
  TrendingUp, Award, Tag, Share2, Twitter, Facebook, Linkedin, Copy, Check,
  Briefcase, Home, Car, GraduationCap, Heart, Stethoscope, Plane, ShoppingBag,
  Wrench, Baby, Wallet, PiggyBank, Gift, Package, Sparkles, LucideIcon,
  ChevronUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TierPolicy {
  tier_id: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4';
  max_loan_amount: number;
  interest_rate: number;
  is_active: boolean;
}

interface LenderPreferences {
  min_amount: number;
  interest_rate: number;
  interest_type: 'simple' | 'compound';
  min_term_weeks: number;
  max_term_weeks: number;
  first_time_borrower_limit?: number;
  countries?: string[];
  states?: string[];
}

interface LoanType { id: string; name: string; slug: string; description?: string; }
interface Country { code: string; name: string; }
interface State { code: string; name: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIER_META = {
  tier_1: { label: 'Low Trust',         number: 1, color: 'text-neutral-500',  bg: 'bg-neutral-50 dark:bg-neutral-800',  border: 'border-neutral-200 dark:border-neutral-700' },
  tier_2: { label: 'Building Trust',    number: 2, color: 'text-blue-600',     bg: 'bg-blue-50 dark:bg-blue-900/20',     border: 'border-blue-200 dark:border-blue-800' },
  tier_3: { label: 'Established Trust', number: 3, color: 'text-amber-600',    bg: 'bg-amber-50 dark:bg-amber-900/20',   border: 'border-amber-200 dark:border-amber-800' },
  tier_4: { label: 'High Trust',        number: 4, color: 'text-green-600',    bg: 'bg-green-50 dark:bg-green-900/20',   border: 'border-green-200 dark:border-green-800' },
};

const LOAN_TYPE_ICONS: Record<string, LucideIcon> = {
  business: Briefcase, commercial: Briefcase, personal: Wallet,
  home: Home, mortgage: Home, housing: Home, car: Car, auto: Car, vehicle: Car,
  education: GraduationCap, school: GraduationCap, tuition: GraduationCap,
  medical: Stethoscope, health: Heart, emergency: Zap, travel: Plane, vacation: Plane,
  shopping: ShoppingBag, retail: ShoppingBag, repair: Wrench, maintenance: Wrench,
  baby: Baby, family: Baby, childcare: Baby, wedding: Gift, gift: Gift,
  savings: PiggyBank, debt: CreditCard, consolidation: CreditCard, other: Package, general: Package,
};

const getLoanTypeIcon = (lt: LoanType): LucideIcon => {
  const s = (lt.slug || '').toLowerCase(), n = (lt.name || '').toLowerCase();
  for (const [k, icon] of Object.entries(LOAN_TYPE_ICONS)) if (s.includes(k) || n.includes(k)) return icon;
  return Package;
};

const BUSINESS_TYPES: Record<string, string> = {
  microfinance: 'Microfinance', credit_union: 'Credit Union', community_lender: 'CDFI',
  fintech: 'FinTech Lender', peer_lending: 'P2P Platform', payday_lender: 'Licensed Lender',
  investment_club: 'Investment Club', other: 'Lender',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PublicLenderPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [lender, setLender] = useState<BusinessProfile | null>(null);
  const [lenderPrefs, setLenderPrefs] = useState<LenderPreferences | null>(null);
  const [tierPolicies, setTierPolicies] = useState<TierPolicy[]>([]);
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: p } = await supabase.from('users').select('*').eq('id', authUser.id).single();
        setUser(p);
      }
      const { data: biz, error } = await supabase.from('business_profiles').select('*')
        .eq('slug', slug).eq('public_profile_enabled', true).eq('verification_status', 'approved').single();
      if (error || !biz) { setNotFound(true); setLoading(false); return; }
      setLender(biz);

      const { data: prefs } = await supabase.from('lender_preferences')
        .select('min_amount, interest_rate, interest_type, min_term_weeks, max_term_weeks, first_time_borrower_limit, countries, states')
        .eq('business_id', biz.id).single();
      if (prefs) setLenderPrefs(prefs);

      // Fetch per-tier policies using business owner's user_id
      if (biz.user_id) {
        const { data: policies } = await supabase.from('lender_tier_policies')
          .select('tier_id, max_loan_amount, interest_rate, is_active')
          .eq('lender_id', biz.user_id)
          .eq('is_active', true)
          .order('tier_id');
        if (policies) setTierPolicies(policies as TierPolicy[]);
      }

      const { data: blt } = await supabase.from('business_loan_types')
        .select('loan_type:loan_types(id,name,slug,description)').eq('business_id', biz.id).eq('is_active', true);
      if (blt) setLoanTypes(blt.map((r: any) => r.loan_type).filter(Boolean));
      const { data: cd } = await supabase.from('countries').select('code,name').eq('is_active', true);
      if (cd) setCountries(cd);
      const { data: sd } = await supabase.from('states').select('code,name').eq('is_active', true);
      if (sd) setStates(sd);
      setLoading(false);
    };
    run();
  }, [slug]);

  const handleRequestLoan = () => {
    sessionStorage.setItem('preferred_lender_slug', slug);
    if (!user || !user.is_verified) { router.push('/apply/' + slug); return; }
    router.push('/loans/new?lender=' + slug);
  };

  const canonicalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/lend/${slug}` : `https://feyza.app/lend/${slug}`;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (showShareMenu && !(e.target as Element).closest('.share-menu-container')) setShowShareMenu(false);
    };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, [showShareMenu]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-500 text-sm">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (notFound || !lender) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
        <Navbar user={user} />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-sm text-center">
            <div className="w-16 h-16 mx-auto mb-5 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-neutral-400" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Lender not found</h1>
            <p className="text-neutral-500 text-sm mb-6">This profile doesn't exist or isn't publicly available.</p>
            <Link href="/loans/new"><Button>Browse lenders</Button></Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ─── Derived values ────────────────────────────────────────────────────────

  const businessName = lender.business_name || '';
  const tagline = (lender as any).tagline || '';
  const description = (lender as any).description || '';
  const businessType = BUSINESS_TYPES[(lender as any).business_type || ''] || 'Lender';
  const stateStr = (lender as any).state || '';

  // For display: tier_4 max = the ceiling; tier_1 max = starting point for new borrowers
  const tier1Policy = tierPolicies.find(p => p.tier_id === 'tier_1');
  const tier4Policy = tierPolicies.find(p => p.tier_id === 'tier_4');
  const activePolicies = tierPolicies.filter(p => p.is_active);

  // The "borrow up to" displayed in hero = highest tier max available
  const heroMaxAmount = tier4Policy?.max_loan_amount
    ?? (activePolicies.length ? Math.max(...activePolicies.map(p => p.max_loan_amount)) : 0)
    ?? 0;

  // Starting amount for new borrowers (tier_1 or first_time_borrower_limit)
  const startingAmount = tier1Policy?.max_loan_amount
    ?? lenderPrefs?.first_time_borrower_limit
    ?? 0;

  // Interest rate: prefer tier_1 rate for hero display (what most new borrowers will see)
  const displayRate = tier1Policy?.interest_rate
    ?? lenderPrefs?.interest_rate
    ?? (lender as any)?.default_interest_rate
    ?? 0;
  const interestTypeLabel = lenderPrefs?.interest_type ?? 'simple';
  const minAmount = lenderPrefs?.min_amount || 50;

  const servingCountries = lenderPrefs?.countries || [];
  const servingStates = lenderPrefs?.states || [];

  const shareDesc = `Borrow up to ${formatCurrency(heroMaxAmount)} from ${businessName} on Feyza. ${displayRate === 0 ? '0% interest' : `${displayRate}% interest`}, no hidden fees.`;
  const openShare = (url: string) => window.open(url, '_blank');
  const handleCopyLink = () => { navigator.clipboard.writeText(canonicalUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const getCountryName = (c: string) => countries.find(x => x.code === c)?.name || c;
  const getStateName = (s: string) => states.find(x => x.code === s)?.name || s;

  const TIER_KEYS: TierPolicy['tier_id'][] = ['tier_1', 'tier_2', 'tier_3', 'tier_4'];

  return (
    <>
      <Head>
        <title>{businessName} – Verified Lender on Feyza</title>
        <meta name="description" content={shareDesc} />
        <meta property="og:title" content={`${businessName} is lending on Feyza`} />
        <meta property="og:description" content={shareDesc} />
        <meta property="og:image" content={`/api/og/lender/${slug}`} />
        <meta property="og:url" content={canonicalUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={canonicalUrl} />
        <meta name="robots" content="index, follow, max-image-preview:large" />
      </Head>

      <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
        <Navbar user={user} />

        {/* ════════════════════ HERO ════════════════════ */}
        <section className="relative bg-neutral-950 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="absolute top-0 right-0 w-[600px] h-[500px] bg-green-500/8 rounded-full blur-[100px] pointer-events-none translate-x-1/3 -translate-y-1/4" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-0">
            <div className="grid lg:grid-cols-12 gap-8 items-end">

              {/* Identity */}
              <div className="lg:col-span-7">
                <div className="flex items-center gap-2 mb-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/15 border border-green-500/20 text-green-400 text-xs font-semibold tracking-wide">
                    <CheckCircle className="w-3 h-3" /> Verified Lender
                  </span>
                  <span className="text-neutral-600 text-xs">{businessType}</span>
                  {stateStr && <span className="flex items-center gap-1 text-neutral-600 text-xs"><MapPin className="w-3 h-3" />{stateStr}</span>}
                </div>

                <div className="flex items-center gap-5 mb-5">
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
                      {lender.logo_url ? (
                        <img src={lender.logo_url} alt={businessName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-700">
                          <span className="text-white text-3xl font-bold">{businessName[0]?.toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-green-400/15 blur-xl -z-10 scale-125" />
                  </div>
                  <div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">{businessName}</h1>
                  </div>
                </div>

                {tagline && <p className="text-lg text-neutral-300 leading-relaxed max-w-lg mb-8">{tagline}</p>}

                {/* Hero inline stats */}
                <div className="flex flex-wrap gap-6 pb-14">
                  {startingAmount > 0 && (
                    <div>
                      <p className="text-[11px] text-neutral-500 uppercase tracking-widest font-medium mb-0.5">Starting limit</p>
                      <p className="text-xl font-bold text-white">{formatCurrency(startingAmount)}</p>
                    </div>
                  )}
                  {heroMaxAmount > 0 && startingAmount !== heroMaxAmount && (
                    <>
                      <div className="flex items-end text-neutral-700 font-light text-lg pb-0.5">→</div>
                      <div>
                        <p className="text-[11px] text-neutral-500 uppercase tracking-widest font-medium mb-0.5">Up to</p>
                        <p className="text-xl font-bold text-green-400">{formatCurrency(heroMaxAmount)}</p>
                      </div>
                    </>
                  )}
                  {displayRate === 0 ? (
                    <>
                      <div className="w-px bg-neutral-800" />
                      <div>
                        <p className="text-[11px] text-neutral-500 uppercase tracking-widest font-medium mb-0.5">Rate</p>
                        <p className="text-xl font-bold text-green-400">Interest free</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-px bg-neutral-800" />
                      <div>
                        <p className="text-[11px] text-neutral-500 uppercase tracking-widest font-medium mb-0.5">From</p>
                        <p className="text-xl font-bold text-white">{displayRate}% {interestTypeLabel}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Floating CTA card — bleeds into body */}
              <div className="lg:col-span-5 pb-0">
                <div className="bg-white dark:bg-neutral-900 rounded-t-2xl px-6 pt-6 pb-0 shadow-2xl">
                  <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Borrow up to</p>
                  <p className="text-5xl font-extrabold text-neutral-900 dark:text-white tracking-tight mb-2">
                    {heroMaxAmount > 0 ? formatCurrency(heroMaxAmount) : '—'}
                  </p>

                  {displayRate === 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold">
                      <Sparkles className="w-3 h-3" /> Interest free
                    </span>
                  ) : (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5 capitalize">
                      {displayRate}% {interestTypeLabel} interest
                    </p>
                  )}

                  {/* Compact tier table in card */}
                  {activePolicies.length > 0 && (
                    <div className="grid grid-cols-4 gap-1 mb-5">
                      {TIER_KEYS.map(tid => {
                        const pol = tierPolicies.find(p => p.tier_id === tid);
                        const meta = TIER_META[tid];
                        if (!pol) return (
                          <div key={tid} className="flex flex-col items-center py-2 px-1 rounded-xl bg-neutral-50 dark:bg-neutral-800 opacity-40">
                            <span className="text-[9px] text-neutral-400 font-semibold tracking-wide uppercase">T{meta.number}</span>
                            <span className="text-xs text-neutral-400 mt-0.5">—</span>
                          </div>
                        );
                        return (
                          <div key={tid} className={`flex flex-col items-center py-2 px-1 rounded-xl ${meta.bg} border ${meta.border}`}>
                            <span className={`text-[9px] font-bold tracking-wide uppercase ${meta.color}`}>T{meta.number}</span>
                            <span className="text-xs font-bold text-neutral-900 dark:text-white mt-0.5">{formatCurrency(pol.max_loan_amount)}</span>
                            {pol.interest_rate !== displayRate && (
                              <span className="text-[9px] text-neutral-500">{pol.interest_rate}%</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Button
                    size="lg"
                    className="w-full mb-4 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-600/25 text-base"
                    onClick={handleRequestLoan}
                  >
                    Apply Now — it's free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <p className="text-xs text-center text-neutral-400 pb-5">
                    No credit check · No hidden fees · Secure
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ════════════════════ BODY ════════════════════ */}
        <main className="flex-1 bg-white dark:bg-neutral-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="grid lg:grid-cols-12 gap-10 items-start">

              {/* LEFT */}
              <div className="lg:col-span-7 space-y-14">

                {/* About */}
                {description && (
                  <section>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">About {businessName}</h2>
                    <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-[15px]">{description}</p>
                  </section>
                )}

                {/* Tier limits table */}
                {activePolicies.length > 0 && (
                  <section>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                      What you can borrow
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
                      Limits depend on your Trust Tier — the higher your tier, the more you unlock.
                    </p>
                    <div className="rounded-2xl overflow-hidden border border-neutral-100 dark:border-neutral-800">
                      <div className="bg-neutral-950 px-5 py-3 grid grid-cols-12 gap-4">
                        <div className="col-span-5 text-xs font-bold text-neutral-400 uppercase tracking-widest">Tier</div>
                        <div className="col-span-4 text-xs font-bold text-neutral-400 uppercase tracking-widest text-right">Max loan</div>
                        <div className="col-span-3 text-xs font-bold text-neutral-400 uppercase tracking-widest text-right">Rate</div>
                      </div>
                      {TIER_KEYS.map((tid, i) => {
                        const pol = tierPolicies.find(p => p.tier_id === tid);
                        const meta = TIER_META[tid];
                        const isLast = i === TIER_KEYS.length - 1;
                        return (
                          <div key={tid}
                            className={`grid grid-cols-12 gap-4 px-5 py-4 items-center bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors ${!isLast ? 'border-b border-neutral-100 dark:border-neutral-800' : ''} ${!pol ? 'opacity-50' : ''}`}>
                            <div className="col-span-5 flex items-center gap-2.5">
                              <div className={`w-6 h-6 rounded-full ${meta.bg} border ${meta.border} flex items-center justify-center flex-shrink-0`}>
                                <span className={`text-[10px] font-bold ${meta.color}`}>{meta.number}</span>
                              </div>
                              <div>
                                <p className="font-medium text-sm text-neutral-900 dark:text-white">{meta.label}</p>
                                <p className="text-[11px] text-neutral-400">Tier {meta.number}</p>
                              </div>
                            </div>
                            <div className="col-span-4 text-right">
                              {pol ? (
                                <span className={`font-bold text-sm ${tid === 'tier_4' ? 'text-green-600 dark:text-green-400' : 'text-neutral-900 dark:text-white'}`}>
                                  {formatCurrency(pol.max_loan_amount)}
                                </span>
                              ) : (
                                <span className="text-sm text-neutral-400">Not available</span>
                              )}
                            </div>
                            <div className="col-span-3 text-right">
                              {pol ? (
                                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                  {pol.interest_rate === 0 ? <span className="text-green-600 dark:text-green-400 font-semibold">Free</span> : `${pol.interest_rate}%`}
                                </span>
                              ) : (
                                <span className="text-sm text-neutral-400">—</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-neutral-400 mt-3">
                      Your tier is based on your trust standing on Feyza. New borrowers start at Tier 1.
                    </p>
                  </section>
                )}

                {/* How it works */}
                <section>
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-8">How it works</h2>
                  <div className="space-y-0">
                    {[
                      { icon: FileText, n: '01', title: 'Submit your request', body: 'Fill out the loan form with the amount you need and your preferred repayment schedule.' },
                      { icon: Clock, n: '02', title: 'Fast review', body: `${businessName} typically responds within 24 hours — often faster.` },
                      { icon: CreditCard, n: '03', title: 'Receive your funds', body: 'Once approved, money is sent directly to your linked account.' },
                      { icon: TrendingUp, n: '04', title: 'Build your history', body: 'Your trust standing on Feyza grows over time, unlocking higher limits and better rates.' },
                    ].map(({ icon: Icon, n, title, body }, i, arr) => (
                      <div key={n} className="flex gap-5 relative">
                        {i < arr.length - 1 && (
                          <div className="absolute left-5 top-11 bottom-0 w-px bg-neutral-100 dark:bg-neutral-800" />
                        )}
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center shadow-sm z-10">
                          <Icon className="w-4.5 h-4.5 text-white dark:text-neutral-900" />
                        </div>
                        <div className="pb-10">
                          <p className="text-[10px] text-neutral-400 font-bold tracking-[0.2em] uppercase mb-0.5">{n}</p>
                          <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">{title}</h3>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Loan Types */}
                {loanTypes.length > 0 && (
                  <section>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-5 flex items-center gap-2">
                      <Tag className="w-5 h-5 text-green-600" /> Loan types
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {loanTypes.map((lt) => {
                        const Icon = getLoanTypeIcon(lt);
                        return (
                          <div key={lt.id}
                            className="group flex items-start gap-3 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-green-200 dark:hover:border-green-800 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-all">
                            <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-green-100 transition-colors">
                              <Icon className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-neutral-900 dark:text-white">{lt.name}</p>
                              {lt.description && (
                                <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{lt.description}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Service Areas */}
                {(servingCountries.length > 0 || servingStates.length > 0) && (
                  <section>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-500" /> Where they lend
                    </h2>
                    <div className="p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-4">
                      {servingCountries.length > 0 && (
                        <div>
                          <p className="text-[11px] text-neutral-400 font-bold uppercase tracking-widest mb-2.5">Countries</p>
                          <div className="flex flex-wrap gap-2">
                            {servingCountries.map(c => (
                              <span key={c} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">{getCountryName(c)}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {servingStates.length > 0 && (
                        <div>
                          <p className="text-[11px] text-neutral-400 font-bold uppercase tracking-widest mb-2.5">States</p>
                          <div className="flex flex-wrap gap-2">
                            {servingStates.map(s => (
                              <span key={s} className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">{getStateName(s)}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Why choose */}
                <section className="rounded-2xl overflow-hidden border border-neutral-100 dark:border-neutral-800">
                  <div className="bg-neutral-950 px-6 py-4">
                    <h2 className="text-lg font-bold text-white">Why choose {businessName}?</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 divide-x divide-y divide-neutral-100 dark:divide-neutral-800">
                    {[
                      { icon: CheckCircle, title: 'Verified lender', sub: 'Identity & business verified by Feyza' },
                      { icon: Zap, title: 'Fast decisions', sub: 'Typical approval in under 24 hours' },
                      { icon: Shield, title: 'Transparent terms', sub: 'No hidden fees or surprise charges' },
                      { icon: TrendingUp, title: 'Grow your limit', sub: 'Build your history on Feyza to unlock higher tiers' },
                    ].map(({ icon: Icon, title, sub }) => (
                      <div key={title} className="flex items-start gap-3.5 px-6 py-5 bg-white dark:bg-neutral-900 hover:bg-green-50/40 dark:hover:bg-green-900/10 transition-colors">
                        <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-neutral-900 dark:text-white">{title}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">{sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* RIGHT SIDEBAR */}
              <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6 self-start">

                {/* Desktop apply CTA */}
                <div className="hidden lg:block rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                  <Button size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold" onClick={handleRequestLoan}>
                    Apply Now <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <p className="text-xs text-center text-neutral-400 mt-2.5">No credit check · No hidden fees</p>
                </div>

                {/* Contact */}
                {((lender as any).contact_email || (lender as any).contact_phone || (lender as any).website_url) && (
                  <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Contact</p>
                    <div className="space-y-3">
                      {(lender as any).contact_email && (
                        <a href={`mailto:${(lender as any).contact_email}`} className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400 hover:text-green-600 transition-colors">
                          <Mail className="w-4 h-4 flex-shrink-0" /><span className="truncate">{(lender as any).contact_email}</span>
                        </a>
                      )}
                      {(lender as any).contact_phone && (
                        <a href={`tel:${(lender as any).contact_phone}`} className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400 hover:text-green-600 transition-colors">
                          <Phone className="w-4 h-4 flex-shrink-0" />{(lender as any).contact_phone}
                        </a>
                      )}
                      {(lender as any).website_url && (
                        <a href={(lender as any).website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400 hover:text-green-600 transition-colors">
                          <Globe className="w-4 h-4 flex-shrink-0" />Visit website<ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Share */}
                <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Share</p>
                    <div className="relative share-menu-container">
                      <button
                        onClick={() => { if (navigator.share) { navigator.share({ title: `${businessName} on Feyza`, text: shareDesc, url: canonicalUrl }).catch(() => {}); } else setShowShareMenu(!showShareMenu); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-400 hover:border-green-400 hover:text-green-600 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Share link
                      </button>
                      {showShareMenu && (
                        <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden z-50">
                          {[
                            { icon: copied ? Check : Copy, label: copied ? 'Copied!' : 'Copy link', action: handleCopyLink, color: '' },
                            { icon: Twitter, label: 'Share on X', action: () => openShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareDesc)}&url=${encodeURIComponent(canonicalUrl)}`), color: 'text-sky-500' },
                            { icon: Facebook, label: 'Facebook', action: () => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`), color: 'text-blue-600' },
                            { icon: Linkedin, label: 'LinkedIn', action: () => openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonicalUrl)}`), color: 'text-blue-700' },
                          ].map(({ icon: Icon, label, action, color }) => (
                            <button key={label} onClick={action} className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                              <Icon className={`w-4 h-4 ${color || 'text-neutral-500'}`} />
                              <span className="text-sm text-neutral-700 dark:text-neutral-300">{label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400">Help others find fair, transparent lending.</p>
                </div>

                {/* Trust badge */}
                <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900">
                  <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-green-600/20">
                    <Award className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-green-900 dark:text-green-300 text-sm">Verified by Feyza</p>
                    <p className="text-xs text-green-700 dark:text-green-500">Identity & business confirmed</p>
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
