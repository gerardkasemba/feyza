-- ===========================================
-- LOANTRACK: Reminder Tracking Migration
-- Run this in Supabase SQL Editor
-- ===========================================

-- Add reminder tracking columns to payment_schedule table
ALTER TABLE public.payment_schedule 
ADD COLUMN IF NOT EXISTS last_manual_reminder_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS manual_reminder_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS overdue_reminder_sent_at TIMESTAMPTZ;

-- Add helpful comments
COMMENT ON COLUMN public.payment_schedule.last_manual_reminder_at IS 'When lender last manually sent a reminder';
COMMENT ON COLUMN public.payment_schedule.manual_reminder_count IS 'Number of manual reminders sent by lender';
COMMENT ON COLUMN public.payment_schedule.overdue_reminder_sent_at IS 'When overdue reminder was sent';

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- Check payment_schedule has new columns:
-- SELECT id, loan_id, due_date, reminder_sent_at, last_manual_reminder_at, manual_reminder_count FROM payment_schedule LIMIT 5;
