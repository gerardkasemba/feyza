'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('new_page');

import React, { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import { LoanRequestForm, LoanRequestFormData } from '@/components/loans/LoanRequestForm';
import { createClient } from '@/lib/supabase/client';
import { onLoanCreatedForBusiness } from '@/lib/business/borrower-trust-service';
import { BusinessProfile, User } from '@/types';
import { generateInviteToken, calculateRepaymentSchedule, toDateString } from '@/lib/utils';
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  Building,
  AlertCircle,
  Loader2,
  Camera,
  Shield,
  CreditCard,
} from 'lucide-react';
import { usePlaidLink } from 'react-plaid-link';

interface BankInfo {
  dwolla_customer_url?: string;
  dwolla_customer_id?: string;
  dwolla_funding_source_url?: string;
  dwolla_funding_source_id?: string;
  bank_name?: string;
  account_mask?: string;
}

function PageShell({
  user,
  title,
  subtitle,
  children,
}: {
  user: User | null;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
      <Navbar user={user} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6">
          <div className="mb-5">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{title}</h1>
            <h2 className="sr-only">Request details</h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{subtitle}</p>
            ) : null}
          </div>

          <div className="space-y-4">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function AppTopBar({ lenderSlug }: { lenderSlug?: string | null }) {
  const backHref = useMemo(() => '/dashboard', []);
  return (
    <div className="flex items-center justify-between">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium
          text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white
          hover:bg-white dark:hover:bg-neutral-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      {lenderSlug ? (
        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
          Direct lender
        </span>
      ) : null}
    </div>
  );
}

function Banner({
  tone = 'neutral',
  icon: Icon,
  title,
  badge,
  children,
  actions,
}: {
  tone?: 'neutral' | 'warning' | 'danger' | 'success' | 'info';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const toneStyles: Record<string, string> = {
    neutral:
      'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950',
    info:
      'border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-900/15',
    success:
      'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-900/15',
    warning:
      'border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-900/15',
    danger:
      'border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-900/15',
  };

  const iconWrap: Record<string, string> = {
    neutral: 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200',
    info: 'bg-blue-100/70 dark:bg-blue-900/25 text-blue-700 dark:text-blue-200',
    success: 'bg-emerald-100/70 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-200',
    warning: 'bg-amber-100/70 dark:bg-amber-900/25 text-amber-800 dark:text-amber-200',
    danger: 'bg-red-100/70 dark:bg-red-900/25 text-red-700 dark:text-red-200',
  };

  return (
    <div className={['rounded-2xl border p-4 shadow-sm', toneStyles[tone]].join(' ')}>
      <div className="flex items-start gap-3">
        <div className={['w-11 h-11 rounded-2xl grid place-items-center border border-black/5 dark:border-white/5', iconWrap[tone]].join(' ')}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">{title}</h2>
            {badge ? (
              <span className="rounded-full border border-black/10 dark:border-white/10 px-2 py-0.5 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">
                {badge}
              </span>
            ) : null}
          </div>

          {children ? (
            <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{children}</div>
          ) : null}

          {actions ? <div className="mt-3">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-900 grid place-items-center border border-black/5 dark:border-white/5">
              <Icon className="w-5 h-5 text-neutral-700 dark:text-neutral-200" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">{title}</h2>
              {subtitle ? (
                <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</p>
              ) : null}
            </div>
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </Card>
  );
}

function NewLoanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lenderSlug = searchParams.get('lender');

  const [user, setUser] = useState<any>(null);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [preferredLender, setPreferredLender] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bank connection
  const [bankConnected, setBankConnected] = useState(false);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [connectingBank, setConnectingBank] = useState(false);

  // Provider enablement
  const [isDwollaEnabled, setIsDwollaEnabled] = useState(false);

  // Verification
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [needsReverification, setNeedsReverification] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        const redirectUrl = lenderSlug ? `/loans/new?lender=${lenderSlug}` : '/loans/new';
        router.push(`/auth/signin?redirect=${encodeURIComponent(redirectUrl)}`);
        return;
      }

      const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();

      const userData =
        profile || ({
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || 'User',
          user_type: authUser.user_metadata?.user_type || 'individual',
        } as any);

      setUser(userData);

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

      if (userData.verification_status === 'verified' && userData.verified_at) {
        const verifiedAt = new Date(userData.verified_at);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        if (verifiedAt < threeMonthsAgo || userData.reverification_required) {
          setNeedsReverification(true);
        }
      }

      const { data: businessData } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('is_verified', true)
        .eq('profile_completed', true);

      setBusinesses(businessData || []);

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

          const isUserVerified = userData.is_verified || userData.verification_status === 'verified';
          if (!isUserVerified) setVerificationRequired(true);
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [router, lenderSlug]);

  useEffect(() => {
    const supabase = createClient();

    const checkPaymentProviders = async () => {
      try {
        const { data: providers } = await supabase
          .from('payment_providers')
          .select('slug')
          .eq('is_enabled', true);

        setIsDwollaEnabled((providers || []).some((p) => p.slug === 'dwolla'));
      } catch (err) {
        log.error('Failed to check payment providers:', err);
      }
    };

    checkPaymentProviders();

    const channel = supabase
      .channel('loans_new_payment_providers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_providers' }, () => {
        checkPaymentProviders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLinkToken = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/plaid/link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (data.link_token) setLinkToken(data.link_token);
    } catch (err) {
      log.error('Error fetching link token:', err);
    }
  }, [user]);

  const onPlaidSuccess = useCallback(
    async (publicToken: string, metadata: any) => {
      if (!user) return;

      setConnectingBank(true);
      try {
        const response = await fetch('/api/plaid/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token: publicToken,
            account_id: (metadata.accounts as any[])?.[0].id,
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
        log.error('Error exchanging token:', err);
        alert('Failed to connect bank account');
      } finally {
        setConnectingBank(false);
      }
    },
    [user]
  );

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
  });

  const handleConnectBank = async () => {
    if (!linkToken) await fetchLinkToken();
    if (plaidReady) openPlaid();
  };

  useEffect(() => {
    if (user && !linkToken && !bankConnected) fetchLinkToken();
  }, [user, linkToken, bankConnected, fetchLinkToken]);

  const handleSubmit = async (data: LoanRequestFormData) => {
    const supabase = createClient();

    const inviteToken = data.lenderType === 'personal' ? generateInviteToken() : null;
    const interestRate = data.lenderType === 'business' ? (data.interestRate || 0) : 0;
    const interestType = data.interestType || 'simple';

    // FLAT-RATE formula — consistent with accept route, matching engine and DB constraint
    // (check_total_interest requires total_interest = amount * (interest_rate / 100) when uses_apr_calculation = false)
    // For personal loans the lender sets their own rate at acceptance time, so we start at 0.
    let totalInterest = 0;
    if (interestRate > 0) {
      totalInterest = Math.round(data.amount * (interestRate / 100) * 100) / 100;
    }

    const totalAmount = data.amount + totalInterest;
    const repaymentAmount = totalAmount / data.totalInstallments;

    const schedule = calculateRepaymentSchedule({
      amount: data.amount,
      repaymentAmount,
      totalInstallments: data.totalInstallments,
      startDate: data.startDate,
      frequency: data.repaymentFrequency,
      interestRate,
      interestType,
    });

    const targetLenderId = preferredLender?.id || null;

    // Optional: trust validation (kept as-is)
    if (data.lenderType === 'business' && targetLenderId) {
      try {
        const trustResponse = await fetch(`/api/borrower/trust?business_id=${targetLenderId}`);
        if (trustResponse.ok) {
          const trustData = await trustResponse.json();

          if (!trustData.canBorrow) throw new Error(trustData.reason || 'Not eligible to borrow from this lender.');
          if (data.amount > trustData.maxAmount) {
            const message = trustData.isGraduated
              ? `Amount exceeds the maximum of $${trustData.maxAmount} for this lender.`
              : `As a new borrower with ${trustData.businessName}, you can borrow up to $${trustData.maxAmount}. Complete ${trustData.loansUntilGraduation} more loan(s) to unlock more.`;
            throw new Error(message);
          }
        }
      } catch (error: unknown) {
        if ((error as Error).message) throw error;
        log.error('Failed to check trust level:', error);
      }
    }

    let invitedLenderInfo: { id: string; email: string; full_name: string } | null = null;
    if (data.lenderType === 'personal' && data.inviteUsername) {
      try {
        const { data: invitedUser, error: lookupError } = await supabase
          .from('users')
          .select('id, email, full_name')
          .eq('username', data.inviteUsername)
          .single();

        if (invitedUser && !lookupError) invitedLenderInfo = invitedUser;
      } catch (error) {
        log.error('Failed to look up invited user by username:', error);
      }
    }

    const loanData: Record<string, unknown> = {
      borrower_id: user.id,
      lender_type: data.lenderType,
      business_lender_id: targetLenderId,
      loan_type_id: data.loanTypeId || null,

      invite_email: data.lenderType === 'personal' ? invitedLenderInfo?.email || data.inviteEmail || null : null,
      invite_phone: data.lenderType === 'personal' ? data.invitePhone : null,
      invite_username: data.lenderType === 'personal' ? data.inviteUsername : null,

      lender_id: invitedLenderInfo?.id || null,
      invite_token: invitedLenderInfo ? null : inviteToken,
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
      uses_apr_calculation: false,

      amount_paid: 0,
      amount_remaining: Math.round(totalAmount * 100) / 100,

      borrower_name: user.full_name,
      auto_pay_enabled: true,
    };

    if (bankInfo) {
      loanData.borrower_dwolla_customer_url = bankInfo.dwolla_customer_url;
      loanData.borrower_dwolla_customer_id = bankInfo.dwolla_customer_id;
      loanData.borrower_dwolla_funding_source_url = bankInfo.dwolla_funding_source_url;
      loanData.borrower_dwolla_funding_source_id = bankInfo.dwolla_funding_source_id;
      loanData.borrower_bank_name = bankInfo.bank_name;
      loanData.borrower_bank_account_mask = bankInfo.account_mask;
      loanData.borrower_bank_connected = true;
    }

    const { data: loan, error } = await supabase.from('loans').insert(loanData).select().single();
    if (error) throw error;

    // Update borrower_business_trust when a business loan is created
    // (replaces tr_update_trust_on_loan_create DB trigger)
    if (targetLenderId && loanData.lender_type === 'business') {
      onLoanCreatedForBusiness(supabase as any, user.id, targetLenderId as string, Number(data.amount))
        .catch(err => console.error('[LoanNew] onLoanCreatedForBusiness error:', err));
    }

    // NOTE: If your table doesn't have notifications.data, this insert will fail (you saw PGRST204).
    // Keep your original behavior, but you may want to remove "data" or add the column in DB.
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
      due_date: toDateString(item.dueDate),
      amount: item.amount,
      principal_amount: item.principalAmount,
      interest_amount: item.interestAmount,
      is_paid: false,
    }));

    await supabase.from('payment_schedule').insert(scheduleItems);

    // Routing / notifications kept as your original (trimmed only where UI-related)
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

        if (matchResult.status === 'auto_accepted') router.push(`/loans/${loan.id}?matched=true`);
        else if (matchResult.status === 'pending_acceptance') router.push(`/loans/${loan.id}?matching=true`);
        else router.push(`/loans/${loan.id}?no_match=true`);
      }
    } else {
      if (invitedLenderInfo) {
        await fetch('/api/notifications/loan-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail: invitedLenderInfo.email,
            toName: invitedLenderInfo.full_name,
            borrowerName: user.full_name,
            amount: data.amount,
            currency: data.currency,
            loanId: loan.id,
            isExistingUser: true,
          }),
        });

        await supabase.from('notifications').insert({
          user_id: invitedLenderInfo.id,
          type: 'loan_request',
          title: 'New Loan Request',
          message: `${user.full_name} is requesting to borrow $${data.amount.toLocaleString()} from you.`,
          data: { loan_id: loan.id, borrower_name: user.full_name, amount: data.amount },
          is_read: false,
        });
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
      }

      router.push(`/loans/${loan.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-neutral-50 dark:bg-neutral-950">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300 shadow-sm">
          Loading…
        </div>
      </div>
    );
  }

  const isBlocked = needsReverification || (verificationRequired && !!preferredLender);

  return (
    <PageShell
      user={user}
      title="New loan request"
      subtitle={preferredLender ? `Request a loan from ${preferredLender.business_name}` : 'Create a request and choose how you want to receive funds.'}
    >
      <AppTopBar lenderSlug={lenderSlug} />

      {/* Direct lender banner */}
      {preferredLender ? (
        <Banner
          tone="info"
          icon={Building2}
          title={preferredLender.business_name}
          badge="Verified lender"
          actions={
            <div className="flex items-center gap-2">
              {preferredLender.logo_url ? (
                <img
                  src={preferredLender.logo_url}
                  alt={preferredLender.business_name}
                  className="h-9 w-9 rounded-xl object-cover border border-black/5 dark:border-white/10"
                />
              ) : (
                <div className="h-9 w-9 rounded-xl grid place-items-center bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/10">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                </div>
              )}
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                Sent directly to this lender
              </span>
            </div>
          }
        >
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Your request will be reviewed by this lender.
          </p>
        </Banner>
      ) : null}

      {/* Blocks */}
      {needsReverification ? (
        <Banner
          tone="danger"
          icon={Camera}
          title="Re-verification required"
          badge="Restricted"
          actions={
            <Link href="/verify" className="block">
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                <Camera className="w-4 h-4 mr-2" />
                Complete re-verification
              </Button>
            </Link>
          }
        >
          <p className="text-sm">
            Your verification has expired. Please upload a new selfie to continue.
          </p>
          <ul className="mt-2 space-y-1 text-sm text-red-800 dark:text-red-200">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Takes about a minute
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Keeps your account secure
            </li>
          </ul>
        </Banner>
      ) : null}

      {verificationRequired && preferredLender && !needsReverification ? (
        <Banner
          tone="warning"
          icon={Shield}
          title="Identity verification required"
          badge="Before borrowing"
          actions={
            <Link
              href={`/verify?redirect=${encodeURIComponent(`/loans/new?lender=${lenderSlug}`)}`}
              className="block"
            >
              <Button className="w-full">
                Verify my identity
              </Button>
            </Link>
          }
        >
          <p className="text-sm">
            To borrow from <span className="font-semibold">{preferredLender.business_name}</span>, you must verify first.
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900 dark:text-amber-200">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Secure & encrypted
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Under 5 minutes
            </li>
          </ul>
        </Banner>
      ) : null}

      {/* ACH / bank connect */}
      {!isBlocked && isDwollaEnabled ? (
        <SectionCard
          title="Bank account (ACH)"
          subtitle="Connect your bank to receive funds via ACH (typically 1–3 business days)."
          icon={Building}
          right={bankConnected ? <Badge variant="success">Connected</Badge> : <Badge>Optional</Badge>}
        >
          {bankConnected && bankInfo ? (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-900/15 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-white dark:bg-neutral-950 border border-black/5 dark:border-white/10 grid place-items-center">
                    <Building className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {bankInfo.bank_name || 'Connected bank'}
                      </p>
                      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Account ••••{bankInfo.account_mask || '—'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConnectBank}
                  disabled={connectingBank || !plaidReady}
                  className="rounded-xl"
                >
                  {connectingBank ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    'Change'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 p-3">
              <div className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  Not connected yet. Connect once and reuse for future loans.
                </p>
              </div>
              <Button
                onClick={handleConnectBank}
                disabled={connectingBank || !plaidReady}
                className="mt-3 w-full rounded-xl"
              >
                {connectingBank ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting…
                  </>
                ) : (
                  <>
                    <Building className="w-4 h-4 mr-2" />
                    Connect bank
                  </>
                )}
              </Button>
            </div>
          )}
        </SectionCard>
      ) : null}

      {/* Form */}
      {!isBlocked ? (
        <SectionCard
          title="Loan details"
          subtitle="Fill out the request. You can review everything before submitting."
          icon={CreditCard}
        >
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
        </SectionCard>
      ) : null}
    </PageShell>
  );
}

export default function NewLoanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center bg-neutral-50 dark:bg-neutral-950">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300 shadow-sm">
            Loading…
          </div>
        </div>
      }
    >
      <NewLoanContent />
    </Suspense>
  );
}
