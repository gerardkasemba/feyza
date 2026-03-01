'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('useReminderModal');

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loan, PaymentScheduleItem } from '@/types';
import { useToast } from '@/components/ui/Alert';

export function useReminderModal(
  loan: Loan | null,
  setSchedule: (data: PaymentScheduleItem[]) => void
) {
  const { showToast } = useToast();

  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  const handleSendReminder = async (paymentId?: string) => {
    if (!loan) return;

    setSendingReminder(true);
    try {
      const response = await fetch(`/api/loans/${loan.id}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loan_id: loan.id, payment_id: paymentId, message: reminderMessage }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send reminder');
      }

      showToast({ type: 'success', title: 'Reminder Sent', message: 'Payment reminder sent to borrower' });
      setShowReminderModal(false);
      setReminderMessage('');

      const supabase = createClient();
      const { data: scheduleData } = await supabase
        .from('payment_schedule')
        .select('*')
        .eq('loan_id', loan.id)
        .order('due_date', { ascending: true });
      setSchedule(scheduleData || []);
    } catch (error: unknown) {
      log.error('Error sending reminder:', error);
      showToast({ type: 'error', title: 'Failed to Send', message: (error as Error).message || 'Failed to send reminder. Please try again.' });
    } finally {
      setSendingReminder(false);
    }
  };

  return {
    showReminderModal,
    setShowReminderModal,
    reminderMessage,
    setReminderMessage,
    sendingReminder,
    handleSendReminder,
  };
}
