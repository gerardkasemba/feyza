-- ===========================================
-- LOANTRACK: Payment Schedule Reminder Columns
-- Run this in Supabase SQL Editor
-- ===========================================

-- Add reminder tracking columns to payment_schedule if they don't exist
DO $$ 
BEGIN
  -- Add last_manual_reminder_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payment_schedule' AND column_name = 'last_manual_reminder_at') THEN
    ALTER TABLE public.payment_schedule ADD COLUMN last_manual_reminder_at TIMESTAMPTZ;
  END IF;
  
  -- Add manual_reminder_count if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payment_schedule' AND column_name = 'manual_reminder_count') THEN
    ALTER TABLE public.payment_schedule ADD COLUMN manual_reminder_count INTEGER DEFAULT 0;
  END IF;
  
  -- Add reminder_sent_at if it doesn't exist (for automated reminders)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payment_schedule' AND column_name = 'reminder_sent_at') THEN
    ALTER TABLE public.payment_schedule ADD COLUMN reminder_sent_at TIMESTAMPTZ;
  END IF;
  
  -- Add overdue_reminder_sent_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payment_schedule' AND column_name = 'overdue_reminder_sent_at') THEN
    ALTER TABLE public.payment_schedule ADD COLUMN overdue_reminder_sent_at TIMESTAMPTZ;
  END IF;
END $$;

-- ===========================================
-- Add helpful comments
-- ===========================================

COMMENT ON COLUMN public.payment_schedule.last_manual_reminder_at IS 'Timestamp of last manual reminder sent by lender';
COMMENT ON COLUMN public.payment_schedule.manual_reminder_count IS 'Number of manual reminders sent for this payment (max 3)';
COMMENT ON COLUMN public.payment_schedule.reminder_sent_at IS 'Timestamp of last automated reminder sent';
COMMENT ON COLUMN public.payment_schedule.overdue_reminder_sent_at IS 'Timestamp of last overdue reminder sent';
