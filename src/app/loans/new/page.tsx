'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { LoanRequestForm, LoanRequestFormData } from '@/components/loans/LoanRequestForm';
import { createClient } from '@/lib/supabase/client';
import { BusinessProfile } from '@/types';
import { generateInviteToken, calculateRepaymentSchedule } from '@/lib/utils';
import { ArrowLeft, CreditCard, AlertCircle } from 'lucide-react';

export default function NewLoanPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPayPalPrompt, setShowPayPalPrompt] = useState(false);

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
        paypal_connected: false,
      };
      
      setUser(userData);

      // Fetch available business lenders (only those with completed profiles and PayPal)
      const { data: businessData } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('is_verified', true)
        .eq('profile_completed', true);

      setBusinesses(businessData || []);
      setIsLoading(false);
    };

    fetchData();
  }, [router]);

  const handleConnectPayPal = () => {
    // Redirect to settings page for PayPal connection
    router.push('/settings?tab=payments');
  };

  const handleSubmit = async (data: LoanRequestFormData) => {
    const supabase = createClient();

    // Generate invite token for personal loans
    const inviteToken = data.lenderType === 'personal' ? generateInviteToken() : null;

    // For personal loans, interest is set by lender, so use 0 initially
    // For auto-match, interest will be set by matched lender
    const interestRate = data.lenderType === 'business' ? (data.interestRate || 0) : 0;
    const interestType = data.interestType || 'simple';
    
    // Calculate term in months
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

    // Calculate repayment schedule
    const schedule = calculateRepaymentSchedule({
      amount: data.amount,
      repaymentAmount: repaymentAmount,
      totalInstallments: data.totalInstallments,
      startDate: data.startDate,
      frequency: data.repaymentFrequency,
      interestRate: interestRate,
      interestType: interestType,
    });

    // Create the loan
    console.log('Creating loan with disbursement info:', {
      isForRecipient: data.isForRecipient,
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      recipientCountry: data.recipientCountry,
      disbursementMethod: data.disbursementMethod,
    });

    const { data: loan, error } = await supabase
      .from('loans')
      .insert({
        borrower_id: user.id,
        lender_type: data.lenderType,
        business_lender_id: null, // Will be set by matching engine
        invite_email: data.lenderType === 'personal' ? data.inviteEmail : null,
        invite_phone: data.lenderType === 'personal' ? data.invitePhone : null,
        invite_token: inviteToken,
        invite_accepted: false,
        amount: data.amount,
        currency: data.currency,
        purpose: data.purpose,
        // Interest fields (lender will set these)
        interest_rate: interestRate,
        interest_type: interestType,
        total_interest: Math.round(totalInterest * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
        // Repayment
        repayment_frequency: data.repaymentFrequency,
        repayment_amount: Math.round(repaymentAmount * 100) / 100,
        total_installments: data.totalInstallments,
        start_date: data.startDate,
        // Disbursement method
        disbursement_method: data.disbursementMethod,
        // Mobile Money
        mobile_money_provider: data.mobileMoneyProvider,
        mobile_money_phone: data.mobileMoneyPhone,
        mobile_money_name: data.mobileMoneyName,
        // Cash Pickup
        pickup_person_name: data.pickerFullName || data.recipientName,
        pickup_person_location: data.cashPickupLocation,
        pickup_person_phone: data.pickerPhone,
        pickup_person_id_type: data.pickerIdType,
        pickup_person_id_number: data.pickerIdNumber,
        // Bank Transfer
        bank_name: data.bankName,
        bank_account_name: data.bankAccountName,
        bank_account_number: data.bankAccountNumber,
        bank_branch: data.bankBranch,
        bank_swift_code: data.bankSwiftCode,
        // Recipient (borrowing for someone else)
        is_for_recipient: data.isForRecipient === true,
        recipient_name: data.recipientName || null,
        recipient_phone: data.recipientPhone || null,
        recipient_country: data.recipientCountry || null,
        // Borrower signed the agreement
        borrower_signed: data.agreementSigned || false,
        borrower_signed_at: data.agreementSigned ? new Date().toISOString() : null,
        // Status
        status: 'pending',
        match_status: data.lenderType === 'business' ? 'pending' : 'manual',
        amount_paid: 0,
        amount_remaining: Math.round(totalAmount * 100) / 100,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating loan:', error);
      throw error;
    }

    // Create payment schedule items
    const scheduleItems = schedule.map((item) => ({
      loan_id: loan.id,
      due_date: item.dueDate.toISOString(),
      amount: item.amount,
      principal_amount: item.principalAmount,
      interest_amount: item.interestAmount,
      is_paid: false,
    }));

    await supabase.from('payment_schedule').insert(scheduleItems);

    // Handle based on lender type
    if (data.lenderType === 'business') {
      // Business lender = auto-matching
      const matchResponse = await fetch('/api/matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loan_id: loan.id }),
      });

      const matchResult = await matchResponse.json();
      
      if (matchResult.status === 'auto_accepted') {
        // Loan was instantly matched!
        router.push(`/loans/${loan.id}?matched=true`);
      } else if (matchResult.status === 'pending_acceptance') {
        // Loan is waiting for lender response
        router.push(`/loans/${loan.id}?matching=true`);
      } else {
        // No matching lenders found
        router.push(`/loans/${loan.id}?no_match=true`);
      }
    } else {
      // Personal lender - send invite email
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

          <Card>
            <LoanRequestForm 
              businesses={businesses} 
              userPayPalConnected={user?.paypal_connected || false}
              userVerificationStatus={user?.verification_status || 'pending'}
              userPaypalEmail={user?.paypal_email}
              userCashappUsername={user?.cashapp_username}
              userVenmoUsername={user?.venmo_username}
              userPreferredPaymentMethod={user?.preferred_payment_method}
              onSubmit={handleSubmit}
              onConnectPayPal={handleConnectPayPal}
              onStartVerification={() => router.push('/verify')}
            />
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
