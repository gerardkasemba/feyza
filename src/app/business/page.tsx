import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Navbar, Footer } from '@/components/layout';
import { Button, Card, Badge } from '@/components/ui';
import { StatsCard } from '@/components/dashboard';
import { LoanCard } from '@/components/loans';
import { PendingLoanCard } from '@/components/business/PendingLoanCard';
import { LendingTermsCard } from '@/components/business/LendingTermsCard';
import { PaymentMissingBanner } from '@/components/business/PaymentMissingBanner';
// Import the real-time wrapper
import { BusinessDashboardClient } from '@/components/realtime/RealtimePageWrapper';
import { formatCurrency } from '@/lib/utils';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Settings,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Zap,
  Target,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { BusinessLoanTypesCard } from '@/components/business/BusinessLoanTypesCard';

// Use ISR for better performance
export const revalidate = 30;

export default async function BusinessPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Fetch all data in parallel for better performance
  const [profileResult, businessProfileResult, paymentProvidersResult] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase
      .from('business_profiles')
      .select('*, slug, public_profile_enabled, verification_status, logo_url, lending_terms, lending_terms_updated_at')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('payment_providers')
      .select('slug')
      .eq('is_enabled', true),
  ]);

  const profile = profileResult.data;
  const businessProfile = businessProfileResult.data;
  const isDwollaEnabled = (paymentProvidersResult.data || []).some((p) => p.slug === 'dwolla');

  // If no business profile, redirect to setup
  if (!businessProfile) {
    redirect('/business/setup');
  }

  // Fetch business loans, lender preferences, and pending matches in parallel
  const [loansResult, prefsResult, matchesResult] = await Promise.all([
    supabase
      .from('loans')
      .select('*, borrower:users!borrower_id(*)')
      .eq('business_lender_id', businessProfile.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('lender_preferences')
      .select('id, is_active, capital_pool, capital_reserved, min_amount, max_amount, interest_rate')
      .eq('business_id', businessProfile.id)
      .single(),
    supabase
      .from('loan_matches')
      .select(`
        id, status, expires_at, created_at, loan_id
      `)
      .eq('lender_business_id', businessProfile.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const businessLoans = loansResult.data || [];
  let pendingMatches: unknown[] = [];
  
  // If we have matches, fetch the loan details separately and filter out already-matched loans
  if (matchesResult.data && matchesResult.data.length > 0) {
    const loanIds = matchesResult.data.map((m) => m.loan_id);
    const { data: loansData } = await supabase
      .from('loans')
      .select('id, amount, currency, purpose, lender_id, business_lender_id, borrower:users!borrower_id(full_name)')
      .in('id', loanIds);
    
    // Merge loan data into matches, filtering out loans that already have a lender
    pendingMatches = matchesResult.data
      .map((match: any) => {
        const loan = loansData?.find((l) => l.id === match.loan_id);
        // Filter out if loan already has a lender assigned
        if (!loan || loan.lender_id || loan.business_lender_id) {
          return null;
        }
        return {
          ...match,
          loan
        };
      })
      .filter(Boolean);
  }
  
  const hasLenderPrefs = !!prefsResult.data;

  // Check if profile is incomplete
  // Only require bank connection if Dwolla is enabled
  const isProfileIncomplete = !businessProfile.profile_completed || (isDwollaEnabled && !profile?.bank_connected);

  const userProfile = profile || {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || 'User',
    user_type: user.user_metadata?.user_type || 'business',
  };

  const activeLoans = businessLoans.filter(l => l.status === 'active');
  const pendingRequests = businessLoans.filter(l => l.status === 'pending');
  const totalLent = activeLoans.reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalCollected = activeLoans.reduce((sum, l) => sum + (l.amount_paid || 0), 0);

  // Calculate capital pool status
  const lenderPrefs = prefsResult.data;
  const capitalPool = Number(lenderPrefs?.capital_pool || 0);
  const capitalReserved = Number(lenderPrefs?.capital_reserved || 0);
  const capitalAvailable = capitalPool - capitalReserved;
  const capitalStatus = capitalAvailable >= 0 
    ? (capitalAvailable > 100 ? '🟢 GOOD' : '🟡 LOW')
    : '🔴 FROZEN';

  // Return the page wrapped with real-time functionality
  return (
    <BusinessDashboardClient userId={user.id}>
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900">
        <Navbar user={userProfile} />

        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Profile Incomplete Banner */}
            {isProfileIncomplete && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Complete Your Business Profile</h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                      {isDwollaEnabled && !profile?.bank_connected 
                        ? 'Connect your bank account via Plaid to receive loan repayments from borrowers.'
                        : 'Please complete your business profile to start receiving loan requests.'}
                    </p>
                    <Link href="/business/settings?tab=payments">
                      <Button size="sm">
                        {isDwollaEnabled && !profile?.bank_connected ? (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Connect Bank Account
                          </>
                        ) : (
                          <>
                            <Settings className="w-4 h-4 mr-2" />
                            Complete Profile
                          </>
                        )}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method Missing Banner */}
            <PaymentMissingBanner 
              businessProfile={businessProfile} 
              isDwollaEnabled={isDwollaEnabled}
            />

            {/* Auto-Match Setup Prompt */}
            {!isProfileIncomplete && !hasLenderPrefs && (
              <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Set Up Auto-Matching</h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                      Auto-Match sends you loan requests that fit your amount, rate, and Trust Tier rules. 
                      Set your preferences and tier policies to start receiving matches.
                    </p>
                    <Link href="/lender/preferences">
                      <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white">
                        <Zap className="w-4 h-4 mr-2" />
                        Configure Auto-Match
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Header - App-style mobile + Desktop layout */}
            <div className="mb-8">
              {/* Mobile (app-like) */}
              <div className="md:hidden">
                {/* Top row: logo + name + quick status */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                    {businessProfile.logo_url ? (
                      <img
                        src={businessProfile.logo_url}
                        alt={businessProfile.business_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h1 className="text-xl font-display font-bold text-neutral-900 dark:text-white truncate">
                        {businessProfile.business_name}
                      </h1>

                      {/* Status chips (avoid overflowing) */}
                      <div className="flex items-center gap-2 shrink-0">
                        {businessProfile.is_verified && (
                          <Badge variant="success" size="sm">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        {businessProfile.verification_status === 'pending' && (
                          <Badge variant="warning" size="sm">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                      Manage your lending capital, matches, and loan requests.
                    </p>
                  </div>
                </div>

                {/* Actions: horizontal scroll like an app */}
                <div className="-mx-4 px-4 mt-4">
                  <div
                    className="
                      flex gap-2 overflow-x-auto pb-2
                      snap-x snap-mandatory
                      [-webkit-overflow-scrolling:touch]
                    "
                  >
                    <div className="snap-start shrink-0">
                      <Link href="/business/analytics">
                        <Button
                          variant="outline"
                          className="
                            h-11 px-4 rounded-2xl
                            border-primary-500 text-primary-600 hover:bg-primary-50
                            dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-900/20
                          "
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Analytics
                        </Button>
                      </Link>
                    </div>

                    <div className="snap-start shrink-0">
                      <Link href="/lender/preferences">
                        <Button
                          className="
                            h-11 px-4 rounded-2xl
                            bg-gradient-to-r from-yellow-500 to-orange-500
                            hover:from-yellow-600 hover:to-orange-600
                          "
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Auto-Match
                        </Button>
                      </Link>
                    </div>

                    <div className="snap-start shrink-0">
                      <Link href="/business/settings">
                        <Button variant="outline" className="h-11 px-4 rounded-2xl">
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Optional scroll hint */}
                  <div className="flex justify-center mt-1">
                    <div className="h-1.5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                </div>
              </div>

              {/* Desktop / Tablet */}
              <div className="hidden md:flex md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                    {businessProfile.logo_url ? (
                      <img
                        src={businessProfile.logo_url}
                        alt={businessProfile.business_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white truncate">
                        {businessProfile.business_name}
                      </h1>

                      {businessProfile.is_verified && (
                        <Badge variant="success" size="sm">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}

                      {businessProfile.verification_status === 'pending' && (
                        <Badge variant="warning" size="sm">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>

                    <p className="text-neutral-500 dark:text-neutral-400">Manage your lending capital, matches, and loan requests.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link href="/business/analytics">
                    <Button
                      variant="outline"
                      className="border-primary-500 text-primary-600 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-900/20"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Analytics
                    </Button>
                  </Link>

                  <Link href="/lender/preferences">
                    <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                      <Zap className="w-4 h-4 mr-2" />
                      Auto-Match Settings
                    </Button>
                  </Link>

                  <Link href="/business/settings">
                    <Button variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      Business Settings
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats - Mobile app style + Desktop grid */}
            <div className="mb-8">
              {/* Mobile: horizontal snap carousel */}
              <div className="sm:hidden -mx-4 px-4">
                <div
                  className="
                    flex gap-3 overflow-x-auto pb-3
                    snap-x snap-mandatory
                    [-webkit-overflow-scrolling:touch]
                  "
                >
                  {/* Capital Pool Status */}
                  <div className="snap-start shrink-0 w-[85%]">
                    <Card
                      className={`p-4 rounded-2xl ${
                        capitalAvailable < 0
                          ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                          : capitalAvailable < 100
                          ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                          : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                            capitalAvailable < 0
                              ? 'bg-red-100 dark:bg-red-900/30'
                              : capitalAvailable < 100
                              ? 'bg-yellow-100 dark:bg-yellow-900/30'
                              : 'bg-green-100 dark:bg-green-900/30'
                          }`}
                        >
                          <DollarSign
                            className={`w-5 h-5 ${
                              capitalAvailable < 0
                                ? 'text-red-600 dark:text-red-400'
                                : capitalAvailable < 100
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-green-600 dark:text-green-400'
                            }`}
                          />
                        </div>

                        <Badge
                          variant={capitalAvailable < 0 ? 'danger' : capitalAvailable < 100 ? 'warning' : 'success'}
                          size="sm"
                        >
                          {capitalStatus}
                        </Badge>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                          Capital Available
                        </div>
                        <div
                          className={`text-2xl font-bold tracking-tight ${
                            capitalAvailable < 0
                              ? 'text-red-700 dark:text-red-300'
                              : capitalAvailable < 100
                              ? 'text-yellow-700 dark:text-yellow-300'
                              : 'text-green-700 dark:text-green-300'
                          }`}
                        >
                          {formatCurrency(capitalAvailable)}
                        </div>

                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                          Pool: {formatCurrency(capitalPool)} · Reserved: {formatCurrency(capitalReserved)}
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Reserved = amount committed to active loans.</p>

                        {capitalAvailable < 0 && (
                          <Link href="/lender/preferences" className="block mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-xs border-red-300 text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-xl"
                            >
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Recharge Pool
                            </Button>
                          </Link>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Stat cards (mobile: bigger, app-like) */}
                  <div className="snap-start shrink-0 w-[72%]">
                    <StatsCard
                      title="Total Lent"
                      value={formatCurrency(totalLent)}
                      subtitle="Active loans"
                      icon={DollarSign}
                      className="rounded-2xl"
                    />
                  </div>

                  <div className="snap-start shrink-0 w-[72%]">
                    <StatsCard
                      title="Collected"
                      value={formatCurrency(totalCollected)}
                      subtitle="Repayments received"
                      icon={TrendingUp}
                      className="rounded-2xl"
                    />
                  </div>

                  <div className="snap-start shrink-0 w-[72%]">
                    <StatsCard
                      title="Active Borrowers"
                      value={activeLoans.length}
                      subtitle="Current loans"
                      icon={Users}
                      className="rounded-2xl"
                    />
                  </div>

                  <div className="snap-start shrink-0 w-[72%]">
                    <StatsCard
                      title="Pending Matches"
                      value={pendingMatches.length}
                      subtitle={pendingMatches.length > 0 ? 'Action needed!' : 'No matches'}
                      icon={Target}
                      highlight={pendingMatches.length > 0}
                      className="rounded-2xl"
                    />
                  </div>
                </div>

                {/* Optional: subtle scroll hint */}
                <div className="flex justify-center mt-1">
                  <div className="h-1.5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                </div>
              </div>

              {/* Tablet/Desktop: grid layout */}
              <div className="hidden sm:grid grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Capital Pool Status */}
                <Card
                  className={`p-4 ${
                    capitalAvailable < 0
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                      : capitalAvailable < 100
                      ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                      : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        capitalAvailable < 0
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : capitalAvailable < 100
                          ? 'bg-yellow-100 dark:bg-yellow-900/30'
                          : 'bg-green-100 dark:bg-green-900/30'
                      }`}
                    >
                      <DollarSign
                        className={`w-5 h-5 ${
                          capitalAvailable < 0
                            ? 'text-red-600 dark:text-red-400'
                            : capitalAvailable < 100
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      />
                    </div>

                    <Badge
                      variant={capitalAvailable < 0 ? 'danger' : capitalAvailable < 100 ? 'warning' : 'success'}
                      size="sm"
                    >
                      {capitalStatus}
                    </Badge>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                      Capital Available
                    </div>
                    <div
                      className={`text-xl font-bold ${
                        capitalAvailable < 0
                          ? 'text-red-700 dark:text-red-300'
                          : capitalAvailable < 100
                          ? 'text-yellow-700 dark:text-yellow-300'
                          : 'text-green-700 dark:text-green-300'
                      }`}
                    >
                      {formatCurrency(capitalAvailable)}
                    </div>

                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      Pool: {formatCurrency(capitalPool)} · Reserved: {formatCurrency(capitalReserved)}
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Reserved = amount committed to active loans.</p>

                    {capitalAvailable < 0 && (
                      <Link href="/lender/preferences">
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 text-xs border-red-300 text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                        >
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Recharge Pool
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>

                <StatsCard title="Total Lent" value={formatCurrency(totalLent)} subtitle="Active loans" icon={DollarSign} />
                <StatsCard title="Collected" value={formatCurrency(totalCollected)} subtitle="Repayments received" icon={TrendingUp} />
                <StatsCard title="Active Borrowers" value={activeLoans.length} subtitle="Current loans" icon={Users} />
                <StatsCard
                  title="Pending Matches"
                  value={pendingMatches.length}
                  subtitle={pendingMatches.length > 0 ? 'Action needed!' : 'No matches'}
                  icon={Target}
                  highlight={pendingMatches.length > 0}
                />
              </div>
            </div>

            {/* Loan Types & Terms */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <LendingTermsCard 
                businessId={businessProfile.id} 
                initialTerms={businessProfile.lending_terms}
              />
              <BusinessLoanTypesCard
                businessId={businessProfile.id}
              />
            </div>

            {/* Pending Matches - NEW LOAN OPPORTUNITIES */}
            {pendingMatches.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">
                        New Loan Matches
                      </h2>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Borrowers auto-matched to your criteria (review & accept).
                      </p>
                    </div>
                  </div>
                  <Link href="/lender/matches">
                    <Button variant="outline" size="sm">
                      View All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingMatches.map((match: any) => (
                    <Link key={match.id} href={`/lender/matches/${match.id}`}>
                      <Card hover className="">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="warning">
                            <Clock className="w-3 h-3 mr-1" />
                            Awaiting Response
                          </Badge>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {new Date(match.expires_at) > new Date() 
                              ? `${Math.ceil((new Date(match.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))}h left`
                              : 'Expired'
                            }
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                          {formatCurrency(match.loan?.amount || 0, match.loan?.currency || 'USD')}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                          From: {match.loan?.borrower?.full_name || (match.loan as { borrower_name?: string })?.borrower_name || 'Borrower'}
                        </p>
                        {match.loan?.purpose && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                            {match.loan.purpose}
                          </p>
                        )}
                        <Button className="w-full mt-4" size="sm">
                          Review & Respond
                        </Button>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white mb-1">
                  Pending Loan Requests
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Direct requests to your business.</p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingRequests.map((loan) => (
                    <PendingLoanCard key={loan.id} loan={loan} />
                  ))}
                </div>
              </div>
            )}

            {/* Active Loans - These will update automatically */}
            <div>
              <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white mb-4">
                Active Loans
              </h2>
              {activeLoans.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeLoans.map((loan) => (
                    <LoanCard key={loan.id} loan={loan} role="lender" />
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <Users className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">No active loans</h3>
                  <p className="text-neutral-500 dark:text-neutral-400">
                    When borrowers request loans from your business, they'll appear here
                  </p>
                </Card>
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </BusinessDashboardClient>
  );
}