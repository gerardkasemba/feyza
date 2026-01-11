-- Migration: Funds Disbursement Tracking
-- Tracks when lender sends money and when funds are disbursed to recipient

-- Add funds tracking columns to loans table
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS funds_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS funds_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS funds_sent_method TEXT,
ADD COLUMN IF NOT EXISTS funds_sent_reference TEXT,
ADD COLUMN IF NOT EXISTS funds_sent_note TEXT,
ADD COLUMN IF NOT EXISTS funds_disbursed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS funds_disbursed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS funds_disbursed_reference TEXT;

-- Update existing loans to have correct defaults
UPDATE public.loans SET funds_sent = FALSE WHERE funds_sent IS NULL;
UPDATE public.loans SET funds_disbursed = FALSE WHERE funds_disbursed IS NULL;

-- Status flow comments
COMMENT ON COLUMN public.loans.status IS 'Loan status: pending (waiting for lender), pending_funds (diaspora - waiting for lender to send to LoanTrack), pending_disbursement (LoanTrack disbursing to recipient), active (loan in repayment), completed, declined, cancelled';
COMMENT ON COLUMN public.loans.funds_sent IS 'True when lender has sent money (to borrower or LoanTrack)';
COMMENT ON COLUMN public.loans.funds_sent_at IS 'When lender confirmed sending money';
COMMENT ON COLUMN public.loans.funds_disbursed IS 'True when LoanTrack has disbursed to recipient (only for is_for_recipient loans)';
COMMENT ON COLUMN public.loans.funds_disbursed_at IS 'When LoanTrack disbursed to recipient';

-- Index for finding loans pending funds
CREATE INDEX IF NOT EXISTS idx_loans_funds_pending 
ON public.loans(status, funds_sent) 
WHERE status = 'pending_funds' AND funds_sent = FALSE;

-- Index for loans pending disbursement
CREATE INDEX IF NOT EXISTS idx_loans_pending_disbursement
ON public.loans(status, funds_disbursed)
WHERE status = 'pending_disbursement' AND funds_disbursed = FALSE;
