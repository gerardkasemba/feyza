-- Migration: Ensure loans table has amount tracking columns
-- These columns track payment progress

-- Add amount_paid if it doesn't exist (tracks total paid so far)
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12, 2) DEFAULT 0;

-- Add amount_remaining if it doesn't exist (tracks remaining balance)
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS amount_remaining DECIMAL(12, 2);

-- Update amount_remaining to match amount if it's null
UPDATE public.loans 
SET amount_remaining = amount 
WHERE amount_remaining IS NULL;

-- Add total_amount if missing (principal + interest)
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2);

-- Update total_amount based on interest
UPDATE public.loans 
SET total_amount = amount + COALESCE(
  (amount * COALESCE(interest_rate, 0) / 100 * COALESCE(term_months, 1) / 12), 
  0
)
WHERE total_amount IS NULL;

-- Add completed_at timestamp
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_loans_amount_paid ON public.loans(amount_paid);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);

-- Comments
COMMENT ON COLUMN public.loans.amount_paid IS 'Total amount paid so far';
COMMENT ON COLUMN public.loans.amount_remaining IS 'Remaining balance to be paid';
COMMENT ON COLUMN public.loans.total_amount IS 'Total amount including interest';
COMMENT ON COLUMN public.loans.completed_at IS 'Timestamp when loan was fully paid';

-- Function to recalculate loan amounts from payment_schedule
-- Run this to sync existing loans with their payment schedules
CREATE OR REPLACE FUNCTION sync_loan_amounts()
RETURNS void AS $$
DECLARE
  loan_record RECORD;
  paid_total DECIMAL(12, 2);
BEGIN
  FOR loan_record IN SELECT id, amount FROM public.loans WHERE status = 'active' LOOP
    SELECT COALESCE(SUM(amount), 0) INTO paid_total
    FROM public.payment_schedule
    WHERE loan_id = loan_record.id AND is_paid = true;
    
    UPDATE public.loans
    SET 
      amount_paid = paid_total,
      amount_remaining = GREATEST(0, loan_record.amount - paid_total),
      status = CASE WHEN paid_total >= loan_record.amount THEN 'completed' ELSE status END,
      completed_at = CASE WHEN paid_total >= loan_record.amount THEN NOW() ELSE completed_at END
    WHERE id = loan_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Uncomment to run the sync:
-- SELECT sync_loan_amounts();
