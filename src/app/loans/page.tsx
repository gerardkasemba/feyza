import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Navbar, Footer } from '@/components/layout';
import { Button, Card, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { LoanCard } from '@/components/loans';
import { Plus, FileText } from 'lucide-react';

export default async function LoansPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Fetch user profile
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

  // Fetch all loans
  let borrowedLoans: any[] = [];
  let lentLoans: any[] = [];

  try {
    const { data } = await supabase
      .from('loans')
      .select('*, lender:users!lender_id(full_name), business_lender:business_profiles!business_lender_id(business_name), invite_accepted, invite_email')
      .eq('borrower_id', user.id)
      .order('created_at', { ascending: false });
    borrowedLoans = data || [];
  } catch (error) {
    console.log('Loans table may not exist yet');
  }

  // Fetch loans where user is the individual lender
  try {
    const { data } = await supabase
      .from('loans')
      .select('*, borrower:users!borrower_id(full_name), invite_accepted, borrower_invite_email')
      .eq('lender_id', user.id)
      .order('created_at', { ascending: false });
    lentLoans = data || [];
  } catch (error) {
    console.log('Loans table may not exist yet');
  }

  // Also check if user has a business and fetch those loans
  try {
    const { data: businessProfile } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (businessProfile) {
      const { data: businessLoans } = await supabase
        .from('loans')
        .select('*, borrower:users!borrower_id(full_name), invite_accepted, borrower_invite_email')
        .eq('business_lender_id', businessProfile.id)
        .order('created_at', { ascending: false });
      
      if (businessLoans && businessLoans.length > 0) {
        lentLoans = [...lentLoans, ...businessLoans];
      }
    }
  } catch (error) {
    console.log('Business loans check failed');
  }

  const userProfile = profile || {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || 'User',
    user_type: user.user_metadata?.user_type || 'individual',
  };

  const allLoans = [...borrowedLoans, ...lentLoans].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Navbar user={userProfile} />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-900">My Loans</h1>
              <p className="text-neutral-500 mt-1">Manage all your loans in one place</p>
            </div>
            <Link href="/loans/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Request Loan
              </Button>
            </Link>
          </div>

          {/* Loans Tabs */}
          <Tabs defaultValue="all">
            <TabsList className="mb-6">
              <TabsTrigger value="all">All ({allLoans.length})</TabsTrigger>
              <TabsTrigger value="borrowed">Borrowed ({borrowedLoans.length})</TabsTrigger>
              <TabsTrigger value="lent">Lent ({lentLoans.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              {allLoans.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allLoans.map((loan) => (
                    <LoanCard
                      key={loan.id}
                      loan={loan}
                      role={loan.borrower_id === user.id ? 'borrower' : 'lender'}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}
            </TabsContent>

            <TabsContent value="borrowed">
              {borrowedLoans.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {borrowedLoans.map((loan) => (
                    <LoanCard key={loan.id} loan={loan} role="borrower" />
                  ))}
                </div>
              ) : (
                <EmptyState message="You haven't borrowed any money yet" />
              )}
            </TabsContent>

            <TabsContent value="lent">
              {lentLoans.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lentLoans.map((loan) => (
                    <LoanCard key={loan.id} loan={loan} role="lender" />
                  ))}
                </div>
              ) : (
                <EmptyState message="You haven't lent any money yet" />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function EmptyState({ message = "You don't have any loans yet" }: { message?: string }) {
  return (
    <Card className="text-center py-12">
      <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
      <h3 className="font-semibold text-neutral-900 mb-2">No loans found</h3>
      <p className="text-neutral-500 mb-6">{message}</p>
      <Link href="/loans/new">
        <Button>Request a Loan</Button>
      </Link>
    </Card>
  );
}
