-- ===========================================
-- LOANTRACK: Complete Disbursement Flow Fix
-- Run this in Supabase SQL Editor
-- ===========================================

-- 1. Update status constraint to allow new statuses
ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_status_check;
ALTER TABLE public.loans ADD CONSTRAINT loans_status_check 
CHECK (status IN ('pending', 'pending_funds', 'pending_disbursement', 'active', 'completed', 'declined', 'cancelled'));

-- 2. Add funds tracking columns
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS funds_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS funds_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS funds_sent_method TEXT,
ADD COLUMN IF NOT EXISTS funds_sent_reference TEXT,
ADD COLUMN IF NOT EXISTS funds_sent_note TEXT,
ADD COLUMN IF NOT EXISTS funds_disbursed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS funds_disbursed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS funds_disbursed_reference TEXT;

-- 3. Set defaults for existing loans
UPDATE public.loans SET funds_sent = FALSE WHERE funds_sent IS NULL;
UPDATE public.loans SET funds_disbursed = FALSE WHERE funds_disbursed IS NULL;

-- 4. Fix any loans stuck in pending_disbursement that should be active
-- (If disbursement is completed but loan wasn't updated)
UPDATE public.loans l
SET status = 'active', funds_disbursed = TRUE, funds_disbursed_at = NOW()
FROM public.disbursements d
WHERE l.id = d.loan_id 
  AND d.status = 'completed' 
  AND l.status = 'pending_disbursement';

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_loans_funds_pending 
ON public.loans(status, funds_sent) 
WHERE status = 'pending_funds' AND funds_sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_loans_pending_disbursement
ON public.loans(status, funds_disbursed)
WHERE status = 'pending_disbursement' AND funds_disbursed = FALSE;

-- 6. Add comments
COMMENT ON COLUMN public.loans.status IS 'pending → pending_funds (diaspora) → pending_disbursement → active → completed';
COMMENT ON COLUMN public.loans.funds_sent IS 'Lender has sent money to borrower or LoanTrack';
COMMENT ON COLUMN public.loans.funds_disbursed IS 'LoanTrack has sent money to recipient (diaspora loans only)';

-- ===========================================
-- VERIFICATION QUERIES (run these to check)
-- ===========================================

-- Check loans by status
-- SELECT status, COUNT(*) FROM loans GROUP BY status;

-- Check diaspora loans
-- SELECT id, status, funds_sent, funds_disbursed, recipient_name FROM loans WHERE is_for_recipient = true;

-- Check disbursements
-- SELECT d.id, d.status, d.recipient_name, l.status as loan_status 
-- FROM disbursements d 
-- JOIN loans l ON d.loan_id = l.id;
