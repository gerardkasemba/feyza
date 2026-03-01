'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loan, PaymentScheduleItem, UserProfile } from '@/types';
import { useToast } from '@/components/ui/Alert';

export function useLoanData(loanId: string) {
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = createClient();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<PaymentScheduleItem[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const LOAN_SELECT = `
    *,
    borrower:users!borrower_id(
      *,
      payment_methods:user_payment_methods(
        id,
        account_identifier,
        account_name,
        is_active,
        is_default,
        payment_provider:payment_providers(id, name, slug)
      )
    ),
    lender:users!lender_id(*),
    business_lender:business_profiles!business_lender_id(*)
  `;

  const refetchLoan = useCallback(async () => {
    if (!loanId) return;
    const { data } = await supabase
      .from('loans')
      .select(LOAN_SELECT)
      .eq('id', loanId)
      .single();
    if (data) setLoan(data as Loan);
  }, [loanId, supabase]);

  const refetchSchedule = useCallback(async () => {
    if (!loanId) return;
    const { data } = await supabase
      .from('payment_schedule')
      .select('*')
      .eq('loan_id', loanId)
      .order('due_date', { ascending: true });
    if (data) setSchedule(data);
  }, [loanId, supabase]);

  // Initial load
  useEffect(() => {
    const fetchData = async () => {
      const supa = createClient();
      const { data: { user: authUser } } = await supa.auth.getUser();

      if (!authUser) {
        router.push('/auth/signin');
        return;
      }

      const { data: profile } = await supa
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setUser(
        profile || {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || 'User',
          user_type: authUser.user_metadata?.user_type || 'individual',
        }
      );

      const { data: loanData, error } = await supa
        .from('loans')
        .select(LOAN_SELECT)
        .eq('id', loanId)
        .single();

      if (error || !loanData) {
        router.push('/dashboard');
        return;
      }

      // Access check
      let hasAccess = false;
      if (loanData.borrower_id === authUser.id) hasAccess = true;
      else if (loanData.lender_id === authUser.id) hasAccess = true;
      else if (loanData.business_lender_id) {
        const { data: bp } = await supa
          .from('business_profiles')
          .select('id')
          .eq('id', loanData.business_lender_id)
          .eq('user_id', authUser.id)
          .single();
        if (bp) hasAccess = true;
      }

      if (!hasAccess) {
        router.push('/dashboard');
        return;
      }

      const lenderInfo = loanData.lender || loanData.business_lender;
      setLoan({ ...(loanData as any), lender: lenderInfo });

      const { data: scheduleData } = await supa
        .from('payment_schedule')
        .select('*')
        .eq('loan_id', loanId)
        .order('due_date', { ascending: true });

      setSchedule(scheduleData || []);
      setIsLoading(false);
    };

    fetchData();
  }, [loanId, router]);

  // Realtime subscriptions
  useEffect(() => {
    if (!loanId) return;
    const channels: ReturnType<typeof supabase.channel>[] = [];

    const loanChannel = supabase
      .channel(`loan-detail-${loanId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'loans', filter: `id=eq.${loanId}` },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;

          if (newData.status !== oldData?.status) {
            if (newData.status === 'active') {
              showToast({ type: 'success', title: 'Loan Active!', message: 'The loan is now active' });
            } else if (newData.status === 'completed') {
              showToast({ type: 'success', title: '🎉 Loan Completed!', message: 'Congratulations! The loan has been fully repaid' });
            } else if (newData.status === 'declined') {
              showToast({ type: 'warning', title: 'Loan Declined', message: 'The loan request was declined' });
            }
          }

          if (newData.disbursement_status !== oldData?.disbursement_status) {
            if (newData.disbursement_status === 'completed') {
              showToast({ type: 'success', title: 'Funds Transferred!', message: 'Funds have been successfully deposited' });
            } else if (newData.disbursement_status === 'processing') {
              showToast({ type: 'info', title: 'Transfer Processing', message: 'Funds are being transferred to your bank' });
            }
          }

          refetchLoan();
        }
      )
      .subscribe();
    channels.push(loanChannel);

    const scheduleChannel = supabase
      .channel(`loan-schedule-${loanId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_schedule', filter: `loan_id=eq.${loanId}` },
        (payload) => {
          const newData = payload.new as any;
          if (payload.eventType === 'UPDATE' && newData?.is_paid && newData?.status === 'confirmed') {
            showToast({ type: 'success', title: 'Payment Confirmed!', message: 'The payment has been confirmed' });
          }
          refetchSchedule();
          refetchLoan();
        }
      )
      .subscribe();
    channels.push(scheduleChannel);

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [loanId, supabase, refetchLoan, refetchSchedule, showToast]);

  return { loan, setLoan, schedule, setSchedule, user, isLoading, refetchLoan, refetchSchedule };
}
