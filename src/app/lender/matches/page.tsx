'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import { 
  Target, 
  Clock, 
  DollarSign, 
  User, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Inbox,
  Loader2
} from 'lucide-react';
import { formatCurrency, formatRelativeDate } from '@/lib/utils';

interface LoanMatch {
  id: string;
  loan_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  match_score: number;
  expires_at: string;
  created_at: string;
  lender_user_id?: string;
  lender_business_id?: string;
  loan: {
    id: string;
    amount: number;
    currency: string;
    purpose?: string;
    repayment_frequency: string;
    total_installments: number;
    borrower?: {
      full_name: string;
      borrower_rating?: string;
    };
  } | null;
}

export default function PendingMatchesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [matches, setMatches] = useState<LoanMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    loadData();
  }, [filter]);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    setUser(profile);

    // Get business profile if exists
    const { data: business } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    console.log('[Matches] User:', user.id, 'Business:', business?.id);

    // Build query for matches
    let matchQuery = supabase
      .from('loan_matches')
      .select('id, loan_id, status, match_score, expires_at, created_at, lender_user_id, lender_business_id')
      .order('created_at', { ascending: false });

    // Filter by lender (user or business)
    if (business?.id) {
      matchQuery = matchQuery.or(`lender_user_id.eq.${user.id},lender_business_id.eq.${business.id}`);
    } else {
      matchQuery = matchQuery.eq('lender_user_id', user.id);
    }

    // Filter by status
    if (filter === 'pending') {
      matchQuery = matchQuery.eq('status', 'pending');
    }

    const { data: matchesData, error } = await matchQuery.limit(50);

    console.log('[Matches] Raw matches:', matchesData?.length, 'Error:', error);

    if (error) {
      console.error('Error loading matches:', error);
      setMatches([]);
    } else if (matchesData && matchesData.length > 0) {
      // Fetch loan details separately
      const loanIds = matchesData.map(m => m.loan_id).filter(Boolean);
      
      if (loanIds.length > 0) {
        const { data: loansData, error: loansError } = await supabase
          .from('loans')
          .select('id, amount, currency, purpose, repayment_frequency, total_installments, lender_id, business_lender_id, borrower_id')
          .in('id', loanIds);
        
        console.log('[Matches] Loans data:', loansData?.length, 'Error:', loansError);
        
        // Get borrower details
        const borrowerIds = [...new Set(loansData?.map(l => l.borrower_id).filter(Boolean) || [])];
        let borrowersMap: Record<string, any> = {};
        
        if (borrowerIds.length > 0) {
          const { data: borrowersData } = await supabase
            .from('users')
            .select('id, full_name, borrower_rating')
            .in('id', borrowerIds);
          
          borrowersMap = (borrowersData || []).reduce((acc, b) => {
            acc[b.id] = b;
            return acc;
          }, {} as Record<string, any>);
        }
        
        // Merge loan data into matches, filtering out loans that already have a lender assigned
        const enrichedMatches = matchesData
          .map(match => {
            const loan = loansData?.find(l => l.id === match.loan_id);
            if (!loan) return null;
            
            // Filter out if loan already has a lender (means it was already matched/accepted)
            if (loan.lender_id || loan.business_lender_id) {
              console.log('[Matches] Filtering out match', match.id, '- loan already has lender');
              return null;
            }
            
            return {
              ...match,
              loan: {
                ...loan,
                borrower: borrowersMap[loan.borrower_id] || null
              }
            };
          })
          .filter(Boolean);
        
        console.log('[Matches] Enriched matches:', enrichedMatches.length);
        setMatches(enrichedMatches as LoanMatch[]);
      } else {
        setMatches([]);
      }
    } else {
      setMatches([]);
    }

    setLoading(false);
  }

  const getStatusBadge = (match: LoanMatch) => {
    const isExpired = new Date(match.expires_at) < new Date();
    
    if (match.status === 'pending' && isExpired) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    
    switch (match.status) {
      case 'pending':
        return <Badge variant="warning">Awaiting Response</Badge>;
      case 'accepted':
        return <Badge variant="success">Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive">Declined</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge>{match.status}</Badge>;
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  const pendingCount = matches.filter(m => m.status === 'pending' && new Date(m.expires_at) > new Date()).length;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <Navbar user={user} />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                <Target className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                Loan Matches
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                {pendingCount > 0 
                  ? `${pendingCount} pending match${pendingCount > 1 ? 'es' : ''} awaiting your response`
                  : 'Review and respond to matched loan requests'
                }
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadData()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              Pending {pendingCount > 0 && `(${pendingCount})`}
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              All Matches
            </button>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : matches.length === 0 ? (
            /* Empty State */
            <Card className="text-center py-16">
              <Inbox className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                {filter === 'pending' ? 'No pending matches' : 'No matches yet'}
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mb-6">
                {filter === 'pending' 
                  ? 'You have no loan requests awaiting your response. When borrowers match with your preferences, they\'ll appear here.'
                  : 'When borrowers match with your lending preferences, their requests will appear here for you to review.'
                }
              </p>
              <Link href="/lender/preferences">
                <Button variant="outline">
                  Review Lending Preferences
                </Button>
              </Link>
            </Card>
          ) : (
            /* Matches List */
            <div className="space-y-4">
              {matches.map((match) => {
                const isExpired = new Date(match.expires_at) < new Date();
                const isPending = match.status === 'pending' && !isExpired;
                
                return (
                  <Card 
                    key={match.id}
                    className={`transition-all ${
                      isPending 
                        ? '' 
                        : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Amount */}
                      <div className="flex-shrink-0">
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                          isPending 
                            ? 'bg-yellow-100 dark:bg-yellow-900/30' 
                            : 'bg-neutral-100 dark:bg-neutral-800'
                        }`}>
                          <DollarSign className={`w-8 h-8 ${
                            isPending 
                              ? 'text-yellow-600 dark:text-yellow-400' 
                              : 'text-neutral-400'
                          }`} />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-2xl font-bold text-neutral-900 dark:text-white">
                            {formatCurrency(match.loan?.amount || 0, match.loan?.currency || 'USD')}
                          </span>
                          <span className='text-md'>{getStatusBadge(match)}</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {match.loan?.borrower?.full_name || 'Anonymous'}
                          </span>
                          {match.loan?.borrower?.borrower_rating && (
                            <Badge variant="outline" className="text-xs mx-2">
                              {match.loan.borrower.borrower_rating}
                            </Badge>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {match.loan?.total_installments} {match.loan?.repayment_frequency} payments
                          </span>
                        </div>

                        {match.loan?.purpose && (
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 truncate">
                            Purpose: {match.loan.purpose}
                          </p>
                        )}

                        {/* Time Remaining for Pending */}
                        {isPending && (
                          <div className="flex items-center gap-2 mt-2 text-sm">
                            <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                            <span className="text-yellow-700 dark:text-yellow-300 font-medium">
                              {getTimeRemaining(match.expires_at)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      <div className="flex-shrink-0">
                        {isPending ? (
                          <Link href={`/lender/matches/${match.id}`}>
                            <Button>
                              Review & Respond
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/lender/matches/${match.id}`}>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Help Text */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">How matching works</p>
                <p className="text-blue-700 dark:text-blue-400">
                  When a borrower's request matches your lending preferences, you'll receive an email and see it here. 
                  You have 24 hours to accept or decline. If you don't respond, the request will be offered to another lender.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
