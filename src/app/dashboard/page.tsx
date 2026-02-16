import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Navbar, Footer } from '@/components/layout';
import { Button, Card, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { StatsCard, BorrowerTrustCard, IncomeProfileCard, DashboardClient } from '@/components/dashboard';
import { TrustScoreCard, VouchRequestCard } from '@/components/trust-score';
import { DashboardBorrowingLimit } from '@/components/dashboard/DashboardBorrowingLimit';
import { LoanCard } from '@/components/loans';
import { PaymentSetupBanner } from '@/components/payments';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  FileText,
  ArrowRight,
  Shield,
  CheckCircle,
  Building2,
  RefreshCw,
  AlertTriangle,
  Camera,
} from 'lucide-react';

// Use ISR with revalidation for better performance
export const revalidate = 30; // Revalidate every 30 seconds

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Fetch all data in parallel for better performance
  const [
    profileResult,
    borrowedLoansResult,
    lentLoansResult,
    businessProfileResult,
  ] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase
      .from('loans')
      .select(`
        *,
        lender:users!lender_id(id, full_name, email, username),
        business_lender:business_profiles!business_lender_id(id, business_name)
      `)
      .eq('borrower_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('loans')
      .select(`
        *,
        borrower:users!borrower_id(id, full_name, email, username)
      `)
      .eq('lender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('business_profiles')
      .select('id, business_name, profile_completed, is_verified, verification_status, slug, public_profile_enabled')
      .eq('user_id', user.id)
      .single(),
  ]);

  const profile = profileResult.data;
  let borrowedLoans = borrowedLoansResult.data || [];
  let lentLoans = lentLoansResult.data || [];
  const businessProfile = businessProfileResult.data;

  // Fetch business loans if user has a business profile
  if (businessProfile) {
    const { data: businessLoans } = await supabase
      .from('loans')
      .select(`
        *,
        borrower:users!borrower_id(id, full_name, email, username)
      `)
      .eq('business_lender_id', businessProfile.id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    // Merge and deduplicate loans
    const existingIds = new Set(lentLoans.map(l => l.id));
    const uniqueBusinessLoans = (businessLoans || []).filter(l => !existingIds.has(l.id));
    lentLoans = [...lentLoans, ...uniqueBusinessLoans];
  }

  const activeLoansAsBorrower = borrowedLoans.filter((l) => l.status === 'active');
  const activeLoansAsLender = lentLoans.filter((l) => l.status === 'active');
  const pendingLoansAsBorrower = borrowedLoans.filter((l) => l.status === 'pending');
  const pendingLoansAsLender = lentLoans.filter((l) => l.status === 'pending');

  const totalBorrowed = activeLoansAsBorrower.reduce((sum, l) => sum + (l.amount_remaining || 0), 0);
  const totalLent = activeLoansAsLender.reduce((sum, l) => sum + (l.amount_remaining || 0), 0);
  const totalPendingCount = pendingLoansAsBorrower.length + pendingLoansAsLender.length;

  // Check if re-verification is needed (every 3 months)
  const needsReverification = (() => {
    if (profile?.verification_status !== 'verified') return false;
    if (profile?.reverification_required) return true;
    if (!profile?.verified_at) return false;
    
    const verifiedAt = new Date(profile.verified_at);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    return verifiedAt < threeMonthsAgo;
  })();

  // Calculate days until re-verification is due (or days overdue)
  const reverificationDaysInfo = (() => {
    if (!profile?.verified_at) return null;
    
    const verifiedAt = new Date(profile.verified_at);
    const dueDate = new Date(verifiedAt);
    dueDate.setMonth(dueDate.getMonth() + 3);
    
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      dueDate,
      daysRemaining: diffDays,
      isOverdue: diffDays < 0,
      isWarning: diffDays <= 14 && diffDays > 0, // Warning when 2 weeks or less
    };
  })();

  // Account restrictions when re-verification is needed
  const accountRestricted = needsReverification;

  // Helper function to get Monday of current week
  const getMonday = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  // Helper function to get Saturday of current week  
  const getSaturday = (date: Date) => {
    const monday = getMonday(date);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    return saturday;
  };

  // Calculate payments due this week in parallel
  const today = new Date();
  const monday = getMonday(today);
  monday.setHours(0, 0, 0, 0);
  const saturday = getSaturday(today);
  saturday.setHours(23, 59, 59, 999);
  const mondayStr = monday.toISOString().split('T')[0];
  const saturdayStr = saturday.toISOString().split('T')[0];

  const borrowerLoanIds = activeLoansAsBorrower.map(l => l.id);
  const lenderLoanIds = activeLoansAsLender.map(l => l.id);

  // Fetch payment schedules in parallel
  const [dueSchedulesResult, expectedSchedulesResult] = await Promise.all([
    borrowerLoanIds.length > 0
      ? supabase
          .from('payment_schedule')
          .select('id, amount, due_date')
          .in('loan_id', borrowerLoanIds)
          .eq('is_paid', false)
          .gte('due_date', mondayStr)
          .lte('due_date', saturdayStr + 'T23:59:59')
      : Promise.resolve({ data: [] }),
    lenderLoanIds.length > 0
      ? supabase
          .from('payment_schedule')
          .select('id, amount, due_date')
          .in('loan_id', lenderLoanIds)
          .eq('is_paid', false)
          .gte('due_date', mondayStr)
          .lte('due_date', saturdayStr + 'T23:59:59')
      : Promise.resolve({ data: [] }),
  ]);

  const dueThisWeekPayments = dueSchedulesResult.data || [];
  const dueThisWeekCount = dueThisWeekPayments.length;
  const dueThisWeekAmount = dueThisWeekPayments.reduce((sum, s) => sum + (s.amount || 0), 0);

  const expectedThisWeekPayments = expectedSchedulesResult.data || [];
  const expectedThisWeekCount = expectedThisWeekPayments.length;
  const expectedThisWeekAmount = expectedThisWeekPayments.reduce((sum, s) => sum + (s.amount || 0), 0);

  const userProfile = profile || {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || 'User',
    user_type: user.user_metadata?.user_type || 'individual',
  };

  return (
    <DashboardClient userId={user.id}>
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900">
        <Navbar user={userProfile} />

        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
                  Welcome back, {userProfile.full_name?.split(' ')[0]} 👋
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">Here&apos;s your loan overview</p>
              </div>
              {accountRestricted ? (
                <Button disabled className="opacity-50 cursor-not-allowed">
                  <Plus className="w-4 h-4 mr-2" />
                  Request Loan
                </Button>
              ) : (
                <Link href="/loans/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Request Loan
                  </Button>
                </Link>
              )}
            </div>

            {/* Re-verification Required Banner - HIGH PRIORITY */}
            {needsReverification && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl animate-pulse-subtle">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-red-800 dark:text-red-300">Re-verification Required</h3>
                      <span className="px-2 py-0.5 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 text-xs font-semibold rounded-full">
                        Account Restricted
                      </span>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-400 mb-1">
                      Your verification expired {reverificationDaysInfo?.isOverdue 
                        ? `${Math.abs(reverificationDaysInfo.daysRemaining)} days ago` 
                        : 'today'}. 
                      Please take a new selfie to continue using Feyza.
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-500 mb-3">
                      <strong>Restricted:</strong> You cannot request new loans or receive disbursements until re-verified.
                    </p>
                    <Link href="/verify">
                      <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                        <Camera className="w-4 h-4 mr-2" />
                        Complete Re-verification Now
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Re-verification Warning Banner (due soon) */}
            {!needsReverification && reverificationDaysInfo?.isWarning && profile?.verification_status === 'verified' && (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
                      Re-verification Due Soon
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
                      Your verification will expire in <strong>{reverificationDaysInfo.daysRemaining} days</strong> 
                      {reverificationDaysInfo.dueDate && ` (${reverificationDaysInfo.dueDate.toLocaleDateString()})`}. 
                      Complete re-verification early to avoid account restrictions.
                    </p>
                    <Link href="/verify">
                      <Button size="sm" variant="outline" className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Re-verify Now
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Banner for Individual Users */}
            {userProfile.user_type === 'individual' && profile?.verification_status !== 'verified' && (
              <div className={`mb-6 p-4 rounded-xl border ${
                profile?.verification_status === 'submitted' 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  : profile?.verification_status === 'rejected'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  profile?.verification_status === 'submitted'
                    ? 'bg-blue-100 dark:bg-blue-900/50'
                    : profile?.verification_status === 'rejected'
                    ? 'bg-red-100 dark:bg-red-900/50'
                    : 'bg-yellow-100 dark:bg-yellow-900/50'
                }`}>
                  <Shield className={`w-5 h-5 ${
                    profile?.verification_status === 'submitted'
                      ? 'text-blue-600'
                      : profile?.verification_status === 'rejected'
                      ? 'text-red-600'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`} />
                </div>
                <div className="flex-1">
                  {profile?.verification_status === 'submitted' ? (
                    <>
                      <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Verification In Progress</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        Your documents are being reviewed. This usually takes 1-2 business days.
                      </p>
                    </>
                  ) : profile?.verification_status === 'rejected' ? (
                    <>
                      <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1">Verification Rejected</h3>
                      <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                        {profile?.verification_notes || 'Your verification was rejected. Please resubmit with valid documents.'}
                      </p>
                      <Link href="/verify">
                        <Button size="sm" variant="outline" className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30">
                          Resubmit Verification
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">Complete Your Verification</h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
                        Verify your identity, employment, and address to start borrowing. This helps lenders trust you.
                      </p>
                      <Link href="/verify">
                        <Button size="sm">
                          <Shield className="w-4 h-4 mr-2" />
                          Start Verification
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Verification Complete Banner */}
          {userProfile.user_type === 'individual' && profile?.verification_status === 'verified' && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                  ✓ Your identity is verified - You can now request loans from businesses
                </span>
              </div>
            </div>
          )}

          {/* Business Profile Banner - Show when user is business type but no profile */}
          {userProfile.user_type === 'business' && !businessProfile && (
            <div className="mb-6 p-4 bg-gradient-to-r from-teal-50 to-primary-50 dark:from-teal-900/20 dark:to-primary-900/20 border border-teal-200 dark:border-teal-800 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-teal-800 dark:text-teal-300 mb-1">Complete Your Business Profile</h3>
                  <p className="text-sm text-teal-700 dark:text-teal-400 mb-3">
                    Set up your business lender profile to start receiving loan requests from verified borrowers.
                  </p>
                  <Link href="/business/setup">
                    <Button size="sm">
                      <Building2 className="w-4 h-4 mr-2" />
                      Complete Setup
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Business Profile Pending Approval Banner */}
          {businessProfile && businessProfile.profile_completed && businessProfile.verification_status === 'pending' && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">Application Under Review</h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Your business profile for <strong>{businessProfile.business_name}</strong> is being reviewed. 
                    This usually takes 1-2 business days. We'll email you once it's approved!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Business Profile Approved Banner */}
          {businessProfile && businessProfile.verification_status === 'approved' && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Left: status */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm text-green-800 dark:text-green-300 font-semibold">
                      Verified & Active
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-400">
                      <strong className="truncate">{businessProfile.business_name}</strong> is verified and active.
                    </div>
                  </div>
                </div>

                {/* Actions: app-like on mobile (full width buttons), inline on desktop */}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-2">
                  <Link href="/lender/preferences" className="w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-11 rounded-2xl border-green-300 text-green-800 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/30"
                    >
                      Lender Settings
                    </Button>
                  </Link>

                  <Link href="/business" className="w-full">
                    <Button size="sm" className="w-full h-11 rounded-2xl">
                      Business Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Business Profile Rejected Banner */}
          {businessProfile && businessProfile.verification_status === 'rejected' && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1">Business Application Not Approved</h3>
                  <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                    Your application for <strong>{businessProfile.business_name}</strong> was not approved. 
                    Please contact support for more information or to resubmit.
                  </p>
                  <a href="mailto:support@feyza.app">
                    <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30">
                      Contact Support
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Smart Payment Setup Banner - Shows only when user has NO payment methods (bank OR manual) */}
          <PaymentSetupBanner
            userId={user.id}
            bankConnected={profile?.bank_connected || false}
            bankName={profile?.bank_name}
            showWhenConnected={false}
          />
          {/* Mobile-first, app-like stats */}
          <div className="mb-6 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
            {/* Primary card (mobile: single compact “overview”) */}
            <div className="sm:hidden">
              <Card className="rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/70 backdrop-blur">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">This week</p>
                      <p className="mt-0.5 text-lg font-semibold text-neutral-900 dark:text-white">
                        {dueThisWeekCount > 0 ? formatCurrency(dueThisWeekAmount) : formatCurrency(0)}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        Due • {dueThisWeekCount > 0 ? `${dueThisWeekCount} payment${dueThisWeekCount !== 1 ? 's' : ''}` : 'None'}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Incoming</p>
                      <p className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-white">
                        {expectedThisWeekCount > 0 ? formatCurrency(expectedThisWeekAmount) : formatCurrency(0)}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        {expectedThisWeekCount > 0
                          ? `${expectedThisWeekCount} payment${expectedThisWeekCount !== 1 ? 's' : ''}`
                          : 'None'}
                      </p>
                    </div>
                  </div>

                  {/* tiny “status” row */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Borrowed: <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(totalBorrowed)}</span>
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Lent: <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(totalLent)}</span>
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Desktop/tablet: keep the normal 4 cards */}
            <div className="hidden sm:contents">
              <StatsCard
                title="Total Borrowed"
                value={formatCurrency(totalBorrowed)}
                subtitle={`${activeLoansAsBorrower.length} active loan${activeLoansAsBorrower.length !== 1 ? 's' : ''}`}
                icon={TrendingDown}
              />
              <StatsCard
                title="Total Lent"
                value={formatCurrency(totalLent)}
                subtitle={`${activeLoansAsLender.length} active loan${activeLoansAsLender.length !== 1 ? 's' : ''}`}
                icon={TrendingUp}
              />
              <StatsCard
                title="Due This Week"
                value={dueThisWeekCount > 0 ? formatCurrency(dueThisWeekAmount) : formatCurrency(0)}
                subtitle={dueThisWeekCount > 0 ? `${dueThisWeekCount} payment${dueThisWeekCount !== 1 ? 's' : ''} to make` : 'No payments due'}
                icon={AlertCircle}
                highlight={dueThisWeekCount > 0}
              />
              <StatsCard
                title="Expected This Week"
                value={expectedThisWeekCount > 0 ? formatCurrency(expectedThisWeekAmount) : formatCurrency(0)}
                subtitle={expectedThisWeekCount > 0 ? `${expectedThisWeekCount} payment${expectedThisWeekCount !== 1 ? 's' : ''} incoming` : 'No payments expected'}
                icon={Clock}
              />
            </div>
          </div>

          {/* Borrowing Limit, Trust Level & Income Profile Row */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <DashboardBorrowingLimit />
            <div data-tutorial="trust-score">
              <TrustScoreCard showDetails={false} showVouches={true} className="lg:col-span-1" />
            </div>
            <IncomeProfileCard />
          </div>

          {/* Business Trust Card (for business lender relationships) */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div data-tutorial="business-trust">
              <BorrowerTrustCard userId={userProfile.id} />
            </div>
            <div data-tutorial="vouch-request">
              <VouchRequestCard compact={true} />
            </div>
          </div>

          {/* Loans Tabs */}
          <div data-tutorial="loans-tabs">
          <Tabs defaultValue="borrowed" className="mb-8">
            <TabsList className="mb-6">
              <TabsTrigger value="borrowed" className="relative">
                Borrowed
                {activeLoansAsBorrower.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                    {activeLoansAsBorrower.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="lent" className="relative">
                Lent
                {activeLoansAsLender.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                    {activeLoansAsLender.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending" className="relative">
                Pending
                {totalPendingCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                    {totalPendingCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="borrowed">
              {activeLoansAsBorrower.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeLoansAsBorrower.map((loan) => (
                    <LoanCard
                      key={loan.id}
                      loan={{
                        ...loan,
                        lender: loan.lender || loan.business_lender,
                      }}
                      role="borrower"
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No active loans"
                  description="You don't have any active loans as a borrower"
                  actionLabel="Request a Loan"
                  actionHref="/loans/new"
                />
              )}
            </TabsContent>

            <TabsContent value="lent">
              {activeLoansAsLender.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeLoansAsLender.map((loan) => (
                    <LoanCard key={loan.id} loan={loan} role="lender" />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No loans lent"
                  description="You haven't lent any money yet"
                />
              )}
            </TabsContent>

            <TabsContent value="pending">
              {totalPendingCount > 0 ? (
                <div className="space-y-6">
                  {/* Pending requests you sent (as borrower) */}
                  {pendingLoansAsBorrower.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-neutral-500 mb-3">
                        Requests You Sent ({pendingLoansAsBorrower.length})
                      </h3>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingLoansAsBorrower.map((loan) => (
                          <LoanCard
                            key={loan.id}
                            loan={{
                              ...loan,
                              lender: loan.lender || loan.business_lender,
                            }}
                            role="borrower"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending requests you received (as lender) */}
                  {pendingLoansAsLender.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-neutral-500 mb-3">
                        Requests You Received ({pendingLoansAsLender.length})
                      </h3>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingLoansAsLender.map((loan) => (
                          <LoanCard
                            key={loan.id}
                            loan={loan}
                            role="lender"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  title="No pending requests"
                  description="All your loan requests have been processed"
                />
              )}
            </TabsContent>
          </Tabs>
          </div>

          {/* Quick Actions */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/loans/new">
              <Card hover className="group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 transition-colors">
                    <Plus className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900 dark:text-white">Request a Loan</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">From business or personal network</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
                </div>
              </Card>
            </Link>

            <Link href="/loans">
              <Card hover className="group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900 dark:text-white">View All Loans</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">See your complete history</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </div>
              </Card>
            </Link>

            {userProfile.user_type === 'business' && (
              <Link href="/business">
                <Card hover className="group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent-100 dark:bg-accent-900/30 rounded-xl group-hover:bg-accent-200 dark:group-hover:bg-accent-900/50 transition-colors">
                      <TrendingUp className="w-6 h-6 text-accent-600 dark:text-accent-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-neutral-900 dark:text-white">Business Dashboard</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Manage your lending business</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors" />
                  </div>
                </Card>
              </Link>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  </DashboardClient>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <Card className="text-center py-12">
      <FileText className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
      <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">{title}</h3>
      <p className="text-neutral-500 dark:text-neutral-400 mb-6">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button>{actionLabel}</Button>
        </Link>
      )}
    </Card>
  );
}
