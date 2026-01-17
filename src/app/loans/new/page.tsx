'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import { LoanRequestForm, LoanRequestFormData } from '@/components/loans/LoanRequestForm';
import { createClient } from '@/lib/supabase/client';
import { BusinessProfile } from '@/types';
import { generateInviteToken, calculateRepaymentSchedule } from '@/lib/utils';
import { ArrowLeft, Building2, CheckCircle, Building, AlertCircle, Loader2 } from 'lucide-react';
import { usePlaidLink } from 'react-plaid-link';

interface BankInfo {
  dwolla_customer_url?: string;
  dwolla_customer_id?: string;
  dwolla_funding_source_url?: string;
  dwolla_funding_source_id?: string;
  bank_name?: string;
  account_mask?: string;
}

function NewLoanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lenderSlug = searchParams.get('lender');
  
  const [user, setUser] = useState<any>(null);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [preferredLender, setPreferredLender] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Bank connection state
  const [bankConnected, setBankConnected] = useState(false);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [connectingBank, setConnectingBank] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/auth/signin');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      const userData = profile || {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || 'User',
        user_type: authUser.user_metadata?.user_type || 'individual',
      };
      
      setUser(userData);

      // Check if user already has bank connected
      if (userData.dwolla_funding_source_url) {
        setBankConnected(true);
        setBankInfo({
          dwolla_customer_url: userData.dwolla_customer_url,
          dwolla_customer_id: userData.dwolla_customer_id,
          dwolla_funding_source_url: userData.dwolla_funding_source_url,
          dwolla_funding_source_id: userData.dwolla_funding_source_id,
          bank_name: userData.bank_name,
          account_mask: userData.bank_account_mask,
        });
      }

      // Fetch available business lenders
      const { data: businessData } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('is_verified', true)
        .eq('profile_completed', true);

      setBusinesses(businessData || []);

      // If a lender slug is provided, look them up
      if (lenderSlug) {
        const { data: lenderData } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('slug', lenderSlug)
          .eq('is_verified', true)
          .eq('public_profile_enabled', true)
          .single();
        
        if (lenderData) {
          setPreferredLender(lenderData);
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [router, lenderSlug]);

  // Get Plaid link token for bank connection
  const fetchLinkToken = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          userEmail: user.email,
          userName: user.full_name,
        }),
      });
      
      const data = await response.json();
      if (data.link_token) {
        setLinkToken(data.link_token);
      }
    } catch (err) {
      console.error('Error fetching link token:', err);
    }
  }, [user]);

  // Plaid Link success handler
  const onPlaidSuccess = useCallback(async (publicToken: string, metadata: any) => {
    if (!user) return;
    
    setConnectingBank(true);
    try {
      const response = await fetch('/api/plaid/guest-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_token: publicToken,
          account_id: metadata.accounts[0].id,
          user_name: user.full_name,
          user_email: user.email,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setBankConnected(true);
        setBankInfo({
          dwolla_customer_url: data.dwolla_customer_url,
          dwolla_customer_id: data.dwolla_customer_id,
          dwolla_funding_source_url: data.dwolla_funding_source_url,
          dwolla_funding_source_id: data.dwolla_funding_source_id,
          bank_name: data.bank_name,
          account_mask: data.account_mask,
        });

        // Also update user profile with bank info
        const supabase = createClient();
        await supabase
          .from('users')
          .update({
            dwolla_customer_url: data.dwolla_customer_url,
            dwolla_customer_id: data.dwolla_customer_id,
            dwolla_funding_source_url: data.dwolla_funding_source_url,
            dwolla_funding_source_id: data.dwolla_funding_source_id,
            bank_name: data.bank_name,
            bank_account_mask: data.account_mask,
            bank_connected: true,
          })
          .eq('id', user.id);
      } else {
        alert(data.error || 'Failed to connect bank');
      }
    } catch (err) {
      console.error('Error exchanging token:', err);
      alert('Failed to connect bank account');
    } finally {
      setConnectingBank(false);
    }
  }, [user]);

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
  });

  const handleConnectBank = async () => {
    if (!linkToken) {
      await fetchLinkToken();
    }
    if (plaidReady) {
      openPlaid();
    }
  };

  // Fetch link token when user is ready
  useEffect(() => {
    if (user && !linkToken && !bankConnected) {
      fetchLinkToken();
    }
  }, [user, linkToken, bankConnected, fetchLinkToken]);

  const handleSubmit = async (data: LoanRequestFormData) => {
    const supabase = createClient();

    const inviteToken = data.lenderType === 'personal' ? generateInviteToken() : null;
    const interestRate = data.lenderType === 'business' ? (data.interestRate || 0) : 0;
    const interestType = data.interestType || 'simple';
    
    const termMonths = data.totalInstallments * (
      data.repaymentFrequency === 'weekly' ? 0.25 :
      data.repaymentFrequency === 'biweekly' ? 0.5 : 1
    );
    
    let totalInterest = 0;
    if (interestRate > 0) {
      if (interestType === 'simple') {
        totalInterest = data.amount * (interestRate / 100 / 12) * termMonths;
      } else {
        const r = interestRate / 100;
        const t = termMonths / 12;
        totalInterest = data.amount * Math.pow(1 + r / 12, 12 * t) - data.amount;
      }
    }
    
    const totalAmount = data.amount + totalInterest;
    const repaymentAmount = totalAmount / data.totalInstallments;

    const schedule = calculateRepaymentSchedule({
      amount: data.amount,
      repaymentAmount: repaymentAmount,
      totalInstallments: data.totalInstallments,
      startDate: data.startDate,
      frequency: data.repaymentFrequency,
      interestRate: interestRate,
      interestType: interestType,
    });

    const targetLenderId = preferredLender?.id || null;

    // Build loan insert data
    const loanData: any = {
      borrower_id: user.id,
      lender_type: data.lenderType,
      business_lender_id: targetLenderId,
      invite_email: data.lenderType === 'personal' ? data.inviteEmail : null,
      invite_phone: data.lenderType === 'personal' ? data.invitePhone : null,
      invite_token: inviteToken,
      invite_accepted: false,
      amount: data.amount,
      currency: data.currency,
      purpose: data.purpose,
      interest_rate: interestRate,
      interest_type: interestType,
      total_interest: Math.round(totalInterest * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
      repayment_frequency: data.repaymentFrequency,
      repayment_amount: Math.round(repaymentAmount * 100) / 100,
      total_installments: data.totalInstallments,
      start_date: data.startDate,
      disbursement_method: data.disbursementMethod,
      mobile_money_provider: data.mobileMoneyProvider,
      mobile_money_phone: data.mobileMoneyPhone,
      mobile_money_name: data.mobileMoneyName,
      pickup_person_name: data.pickerFullName || data.recipientName,
      pickup_person_location: data.cashPickupLocation,
      pickup_person_phone: data.pickerPhone,
      pickup_person_id_type: data.pickerIdType,
      pickup_person_id_number: data.pickerIdNumber,
      bank_name: data.bankName,
      bank_account_name: data.bankAccountName,
      bank_account_number: data.bankAccountNumber,
      bank_branch: data.bankBranch,
      bank_swift_code: data.bankSwiftCode,
      is_for_recipient: data.isForRecipient === true,
      recipient_name: data.recipientName || null,
      recipient_phone: data.recipientPhone || null,
      recipient_country: data.recipientCountry || null,
      borrower_signed: data.agreementSigned || false,
      borrower_signed_at: data.agreementSigned ? new Date().toISOString() : null,
      status: 'pending',
      match_status: data.lenderType === 'business' ? 'pending' : 'manual',
      amount_paid: 0,
      amount_remaining: Math.round(totalAmount * 100) / 100,
      borrower_name: user.full_name,
      auto_pay_enabled: true,
    };

    // Add borrower's Dwolla info for ACH disbursement
    if (bankInfo) {
      loanData.borrower_dwolla_customer_url = bankInfo.dwolla_customer_url;
      loanData.borrower_dwolla_customer_id = bankInfo.dwolla_customer_id;
      loanData.borrower_dwolla_funding_source_url = bankInfo.dwolla_funding_source_url;
      loanData.borrower_dwolla_funding_source_id = bankInfo.dwolla_funding_source_id;
      loanData.borrower_bank_name = bankInfo.bank_name;
      loanData.borrower_bank_account_mask = bankInfo.account_mask;
      loanData.borrower_bank_connected = true;
    }

    const { data: loan, error } = await supabase
      .from('loans')
      .insert(loanData)
      .select()
      .single();

    if (error) {
      console.error('Error creating loan:', error);
      throw error;
    }

    // Create notification for borrower
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'loan_created',
      title: 'Loan Request Submitted',
      message: `Your loan request for $${data.amount.toLocaleString()} has been submitted.`,
      data: { loan_id: loan.id, amount: data.amount },
      is_read: false,
    });

    const scheduleItems = schedule.map((item) => ({
      loan_id: loan.id,
      due_date: item.dueDate.toISOString(),
      amount: item.amount,
      principal_amount: item.principalAmount,
      interest_amount: item.interestAmount,
      is_paid: false,
    }));

    await supabase.from('payment_schedule').insert(scheduleItems);

    if (data.lenderType === 'business') {
      if (targetLenderId) {
        await fetch('/api/notifications/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'direct_loan_request',
            loanId: loan.id,
            businessId: targetLenderId,
            borrowerName: user.full_name,
            amount: data.amount,
          }),
        });
        router.push(`/loans/${loan.id}?direct=true`);
      } else {
        const matchResponse = await fetch('/api/matching', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loan_id: loan.id }),
        });

        const matchResult = await matchResponse.json();
        
        if (matchResult.status === 'auto_accepted') {
          router.push(`/loans/${loan.id}?matched=true`);
        } else if (matchResult.status === 'pending_acceptance') {
          router.push(`/loans/${loan.id}?matching=true`);
        } else {
          router.push(`/loans/${loan.id}?no_match=true`);
        }
      }
    } else {
      await fetch('/api/invite/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: loan.id,
          lenderType: data.lenderType,
          inviteToken,
          email: data.inviteEmail,
          phone: data.invitePhone,
          borrowerName: user.full_name,
          amount: data.amount,
          currency: data.currency,
          purpose: data.purpose,
        }),
      });

      router.push(`/loans/${loan.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Navbar user={user} />

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>

          {/* Direct Lender Banner */}
          {preferredLender && (
            <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-teal-50 dark:from-primary-900/20 dark:to-teal-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white dark:bg-neutral-800 rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
                  {preferredLender.logo_url ? (
                    <img src={preferredLender.logo_url} alt={preferredLender.business_name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-6 h-6 text-primary-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 dark:text-white">{preferredLender.business_name}</span>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Your loan request will be sent directly to this lender
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bank Connection Card for ACH */}
          <Card className="mb-6">
            <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <Building className="w-5 h-5 text-primary-600" />
              Your Bank Account
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              Connect your bank to receive loan funds directly via ACH transfer (1-3 business days).
            </p>

            {bankConnected && bankInfo ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Building className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-900">{bankInfo.bank_name}</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-sm text-neutral-500">Account ••••{bankInfo.account_mask}</p>
                    </div>
                  </div>
                  <Badge variant="success">Connected</Badge>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Bank not connected</p>
                    <p className="text-sm text-amber-700">
                      Connect your bank to receive loan funds instantly when approved.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleConnectBank}
                  disabled={connectingBank || !plaidReady}
                  className="w-full"
                >
                  {connectingBank ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Building className="w-4 h-4 mr-2" />
                      Connect Bank Account
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <LoanRequestForm 
              businesses={businesses} 
              preferredLender={preferredLender}
              userBankConnected={bankConnected}
              userVerificationStatus={user?.verification_status || 'pending'}
              userBankName={bankInfo?.bank_name}
              userBankAccountMask={bankInfo?.account_mask}
              onSubmit={handleSubmit}
              onConnectBank={handleConnectBank}
              onStartVerification={() => router.push('/verify')}
            />
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function NewLoanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    }>
      <NewLoanContent />
    </Suspense>
  );
}
