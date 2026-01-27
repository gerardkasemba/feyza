import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Navbar, Footer } from '@/components/layout';
import { Button, Card, Badge } from '@/components/ui';
import { StatsCard } from '@/components/dashboard';
import { LoanCard } from '@/components/loans';
import { PendingLoanCard } from '@/components/business/PendingLoanCard';
import { LendingTermsCard } from '@/components/business/LendingTermsCard';
import { BusinessLoanTypesCard } from '@/components/business/BusinessLoanTypesCard'; // Add this import
import { BusinessDashboardClient } from '@/components/realtime';
import { formatCurrency } from '@/lib/utils';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Settings,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Zap,
  Share2,
  Copy,
  ExternalLink
} from 'lucide-react';

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
  const [profileResult, businessProfileResult] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase
      .from('business_profiles')
      .select('*, slug, public_profile_enabled, verification_status, logo_url, lending_terms, lending_terms_updated_at')
      .eq('user_id', user.id)
      .single(),
  ]);

  const profile = profileResult.data;
  const businessProfile = businessProfileResult.data;

  // If no business profile, redirect to setup
  if (!businessProfile) {
    redirect('/business/setup');
  }

  // Fetch business loans and lender preferences in parallel
  const [loansResult, prefsResult] = await Promise.all([
    supabase
      .from('loans')
      .select('*, borrower:users!borrower_id(*)')
      .eq('business_lender_id', businessProfile.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('lender_preferences')
      .select('id, is_active, capital_pool, min_amount, max_amount, interest_rate')
      .eq('business_id', businessProfile.id)
      .single(),
  ]);

  const businessLoans = loansResult.data || [];
  const hasLenderPrefs = !!prefsResult.data;
  const lenderPrefs = prefsResult.data ? {
    min_amount: prefsResult.data.min_amount || 50,
    max_amount: prefsResult.data.max_amount || 5000,
    interest_rate: prefsResult.data.interest_rate || 0,
  } : null;

  // Check if profile is incomplete
  const isProfileIncomplete = !businessProfile.profile_completed || !profile?.bank_connected;

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
                    {!profile?.bank_connected 
                      ? 'Connect your bank account via Plaid to receive loan repayments from borrowers.'
                      : 'Please complete your business profile to start receiving loan requests.'}
                  </p>
                  <Link href="/business/settings?tab=payments">
                    <Button size="sm">
                      {!profile?.bank_connected ? (
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
                    Configure your lending preferences to automatically receive matching loan requests from borrowers. 
                    Set your loan amount range, interest rate, and countries you serve.
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

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center overflow-hidden">
                {businessProfile.logo_url ? (
                  <img src={businessProfile.logo_url} alt={businessProfile.business_name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
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
                <p className="text-neutral-500 dark:text-neutral-400">{businessProfile.business_type}</p>
              </div>
            </div>
            <div className="flex gap-3">
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

          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Total Lent"
              value={formatCurrency(totalLent)}
              subtitle="Active loans"
              icon={DollarSign}
            />
            <StatsCard
              title="Collected"
              value={formatCurrency(totalCollected)}
              subtitle="Repayments received"
              icon={TrendingUp}
            />
            <StatsCard
              title="Active Borrowers"
              value={activeLoans.length}
              subtitle="Current loans"
              icon={Users}
            />
            <StatsCard
              title="Pending Requests"
              value={pendingRequests.length}
              subtitle="Awaiting approval"
              icon={Clock}
            />
          </div>

          {/* Loan Types & Terms */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <LendingTermsCard 
              businessId={businessProfile.id} 
              initialTerms={businessProfile.lending_terms}
            />
            <BusinessLoanTypesCard 
              businessId={businessProfile.id}
              // Optional: If you have initial loan types from your database, pass them here
              // initialLoanTypes={loanTypesFromDB}
              // initialSelectedIds={selectedLoanTypeIdsFromDB}
            />
          </div>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-display font-semibold text-neutral-900 dark:text-white mb-4">
                Pending Loan Requests
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingRequests.map((loan) => (
                  <PendingLoanCard key={loan.id} loan={loan} />
                ))}
              </div>
            </div>
          )}

          {/* Active Loans */}
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