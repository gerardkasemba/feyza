import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Navbar, Footer } from '@/components/layout';
import { Button, Card, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { StatsCard } from '@/components/dashboard';
import { DashboardBorrowingLimit } from '@/components/dashboard/DashboardBorrowingLimit';
import { LoanCard } from '@/components/loans';
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
} from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Try to fetch user profile, handle case where table doesn't exist
  let profile = null;
  try {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = data;
  } catch (error) {
    console.log('Users table may not exist yet');
  }

  // Try to fetch loans, handle case where table doesn't exist
  let borrowedLoans: any[] = [];
  let lentLoans: any[] = [];
  
  try {
    const { data } = await supabase
      .from('loans')
      .select('*')
      .eq('borrower_id', user.id)
      .order('created_at', { ascending: false });
    borrowedLoans = data || [];
  } catch (error) {
    console.log('Loans table may not exist yet');
  }

  // Get loans where user is lender (individual)
  try {
    const { data } = await supabase
      .from('loans')
      .select('*')
      .eq('lender_id', user.id)
      .order('created_at', { ascending: false });
    lentLoans = data || [];
  } catch (error) {
    console.log('Loans table may not exist yet');
  }

  // Also get loans from user's business profile
  let businessProfile = null;
  try {
    const { data: bp } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    businessProfile = bp;
    
    if (businessProfile) {
      const { data: businessLoans } = await supabase
        .from('loans')
        .select('*')
        .eq('business_lender_id', businessProfile.id)
        .order('created_at', { ascending: false });
      lentLoans = [...lentLoans, ...(businessLoans || [])];
    }
  } catch (error) {
    // No business profile
  }

  const activeLoansAsBorrower = borrowedLoans.filter((l) => l.status === 'active');
  const activeLoansAsLender = lentLoans.filter((l) => l.status === 'active');
  const pendingLoans = borrowedLoans.filter((l) => l.status === 'pending');

  const totalBorrowed = activeLoansAsBorrower.reduce((sum, l) => sum + (l.amount_remaining || 0), 0);
  const totalLent = activeLoansAsLender.reduce((sum, l) => sum + (l.amount_remaining || 0), 0);

  // Helper function to get Monday of current week
  const getMonday = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  // Helper function to get Saturday of current week  
  const getSaturday = (date: Date) => {
    const monday = getMonday(date);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    return saturday;
  };

  // Calculate due this week (payments user needs to make as borrower)
  // Week is Monday to Saturday
  let dueThisWeekCount = 0;
  let dueThisWeekAmount = 0;
  let dueThisWeekPayments: { amount: number; due_date: string }[] = [];
  try {
    const today = new Date();
    const monday = getMonday(today);
    monday.setHours(0, 0, 0, 0);
    const saturday = getSaturday(today);
    saturday.setHours(23, 59, 59, 999);
    
    // Format dates as YYYY-MM-DD for database query
    const mondayStr = monday.toISOString().split('T')[0];
    const saturdayStr = saturday.toISOString().split('T')[0];
    
    // Get unpaid payments due this week for borrowed loans
    const borrowerLoanIds = activeLoansAsBorrower.map(l => l.id);
    if (borrowerLoanIds.length > 0) {
      const { data: schedules, error } = await supabase
        .from('payment_schedule')
        .select('id, amount, due_date')
        .in('loan_id', borrowerLoanIds)
        .eq('is_paid', false)
        .gte('due_date', mondayStr)
        .lte('due_date', saturdayStr + 'T23:59:59');
      
      if (error) {
        console.log('Error fetching borrower schedules:', error);
      }
      
      dueThisWeekPayments = schedules || [];
      dueThisWeekCount = schedules?.length || 0;
      dueThisWeekAmount = schedules?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
    }
  } catch (error) {
    console.log('Error calculating due this week:', error);
  }

  // Calculate expected this week (payments lender expects to receive)
  let expectedThisWeekCount = 0;
  let expectedThisWeekAmount = 0;
  let expectedThisWeekPayments: { amount: number; due_date: string }[] = [];
  try {
    const today = new Date();
    const monday = getMonday(today);
    monday.setHours(0, 0, 0, 0);
    const saturday = getSaturday(today);
    saturday.setHours(23, 59, 59, 999);
    
    const mondayStr = monday.toISOString().split('T')[0];
    const saturdayStr = saturday.toISOString().split('T')[0];
    
    const lenderLoanIds = activeLoansAsLender.map(l => l.id);
    if (lenderLoanIds.length > 0) {
      const { data: schedules, error } = await supabase
        .from('payment_schedule')
        .select('id, amount, due_date')
        .in('loan_id', lenderLoanIds)
        .eq('is_paid', false)
        .gte('due_date', mondayStr)
        .lte('due_date', saturdayStr + 'T23:59:59');
      
      if (error) {
        console.log('Error fetching lender schedules:', error);
      }
      
      expectedThisWeekPayments = schedules || [];
      expectedThisWeekCount = schedules?.length || 0;
      expectedThisWeekAmount = schedules?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
    }
  } catch (error) {
    console.log('Error calculating expected this week:', error);
  }

  const userProfile = profile || {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || 'User',
    user_type: user.user_metadata?.user_type || 'individual',
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Navbar user={userProfile} />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-900">
                Welcome back, {userProfile.full_name?.split(' ')[0]} 👋
              </h1>
              <p className="text-neutral-500 mt-1">Here&apos;s your loan overview</p>
            </div>
            <Link href="/loans/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Request Loan
              </Button>
            </Link>
          </div>

          {/* Verification Banner for Individual Users */}
          {userProfile.user_type === 'individual' && profile?.verification_status !== 'verified' && (
            <div className={`mb-6 p-4 rounded-xl border ${
              profile?.verification_status === 'submitted' 
                ? 'bg-blue-50 border-blue-200'
                : profile?.verification_status === 'rejected'
                ? 'bg-red-50 border-red-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  profile?.verification_status === 'submitted'
                    ? 'bg-blue-100'
                    : profile?.verification_status === 'rejected'
                    ? 'bg-red-100'
                    : 'bg-yellow-100'
                }`}>
                  <Shield className={`w-5 h-5 ${
                    profile?.verification_status === 'submitted'
                      ? 'text-blue-600'
                      : profile?.verification_status === 'rejected'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }`} />
                </div>
                <div className="flex-1">
                  {profile?.verification_status === 'submitted' ? (
                    <>
                      <h3 className="font-semibold text-blue-800 mb-1">Verification In Progress</h3>
                      <p className="text-sm text-blue-700">
                        Your documents are being reviewed. This usually takes 1-2 business days.
                      </p>
                    </>
                  ) : profile?.verification_status === 'rejected' ? (
                    <>
                      <h3 className="font-semibold text-red-800 mb-1">Verification Rejected</h3>
                      <p className="text-sm text-red-700 mb-3">
                        {profile?.verification_notes || 'Your verification was rejected. Please resubmit with valid documents.'}
                      </p>
                      <Link href="/verify">
                        <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                          Resubmit Verification
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold text-yellow-800 mb-1">Complete Your Verification</h3>
                      <p className="text-sm text-yellow-700 mb-3">
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
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700 font-medium">
                  ✓ Your identity is verified - You can now request loans from businesses
                </span>
              </div>
            </div>
          )}

          {/* Stats Grid with Borrowing Limit */}
          <div className="grid lg:grid-cols-4 gap-4 mb-8">
            <div className="lg:col-span-3">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  value={dueThisWeekCount > 0 ? formatCurrency(dueThisWeekAmount) : '0'}
                  subtitle={dueThisWeekCount > 0 ? `${dueThisWeekCount} payment${dueThisWeekCount !== 1 ? 's' : ''} to make` : 'No payments due'}
                  icon={AlertCircle}
                  highlight={dueThisWeekCount > 0}
                />
                <StatsCard
                  title="Expected This Week"
                  value={expectedThisWeekCount > 0 ? formatCurrency(expectedThisWeekAmount) : '0'}
                  subtitle={expectedThisWeekCount > 0 ? `${expectedThisWeekCount} payment${expectedThisWeekCount !== 1 ? 's' : ''} incoming` : 'No payments expected'}
                  icon={Clock}
                />
              </div>
            </div>
            <div className="lg:col-span-1">
              <DashboardBorrowingLimit />
            </div>
          </div>

          {/* Loans Tabs */}
          <Tabs defaultValue="borrowed" className="mb-8">
            <TabsList className="mb-6">
              <TabsTrigger value="borrowed">Borrowed</TabsTrigger>
              <TabsTrigger value="lent">Lent</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
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
              {pendingLoans.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingLoans.map((loan) => (
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
                  title="No pending requests"
                  description="All your loan requests have been processed"
                />
              )}
            </TabsContent>
          </Tabs>

          {/* Quick Actions */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/loans/new">
              <Card hover className="group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary-100 rounded-xl group-hover:bg-primary-200 transition-colors">
                    <Plus className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900">Request a Loan</h3>
                    <p className="text-sm text-neutral-500">From business or personal network</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 transition-colors" />
                </div>
              </Card>
            </Link>

            <Link href="/loans">
              <Card hover className="group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900">View All Loans</h3>
                    <p className="text-sm text-neutral-500">See your complete history</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </Card>
            </Link>

            {userProfile.user_type === 'business' && (
              <Link href="/business">
                <Card hover className="group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent-100 rounded-xl group-hover:bg-accent-200 transition-colors">
                      <TrendingUp className="w-6 h-6 text-accent-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-neutral-900">Business Dashboard</h3>
                      <p className="text-sm text-neutral-500">Manage your lending business</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-accent-600 transition-colors" />
                  </div>
                </Card>
              </Link>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
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
      <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
      <h3 className="font-semibold text-neutral-900 mb-2">{title}</h3>
      <p className="text-neutral-500 mb-6">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button>{actionLabel}</Button>
        </Link>
      )}
    </Card>
  );
}
