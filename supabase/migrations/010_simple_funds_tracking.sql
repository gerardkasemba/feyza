-- ===========================================
-- LOANTRACK: Simple Funds Tracking
-- Run this in Supabase SQL Editor
-- ===========================================

-- 1. Add funds tracking columns to loans table
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS funds_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS funds_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS funds_sent_method TEXT DEFAULT 'paypal',
ADD COLUMN IF NOT EXISTS funds_sent_reference TEXT;

-- 2. Update existing active loans to have funds_sent = true
-- (Assuming if a loan is already active, the lender already paid)
UPDATE public.loans 
SET funds_sent = TRUE, funds_sent_at = created_at 
WHERE status = 'active' AND funds_sent IS NULL;

-- 3. Set default for new loans
UPDATE public.loans SET funds_sent = FALSE WHERE funds_sent IS NULL;

-- 4. Add helpful comments
COMMENT ON COLUMN public.loans.funds_sent IS 'Whether lender has sent PayPal payment to borrower';
COMMENT ON COLUMN public.loans.funds_sent_at IS 'When lender confirmed payment sent';
COMMENT ON COLUMN public.loans.funds_sent_method IS 'Payment method used (always paypal for now)';
COMMENT ON COLUMN public.loans.funds_sent_reference IS 'PayPal transaction ID';

-- 5. Create index for finding loans awaiting payment
CREATE INDEX IF NOT EXISTS idx_loans_awaiting_payment 
ON public.loans(status, funds_sent) 
WHERE status = 'active' AND funds_sent = FALSE;

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- Check active loans and their payment status:
-- SELECT id, status, funds_sent, funds_sent_at, amount, currency 
-- FROM loans 
-- WHERE status = 'active' 
-- ORDER BY created_at DESC;
