-- Migration: Update loans status check constraint
-- Add new statuses: pending_funds, pending_disbursement

-- Drop the existing constraint
ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_status_check;

-- Add the updated constraint with new statuses
ALTER TABLE public.loans ADD CONSTRAINT loans_status_check 
CHECK (status IN ('pending', 'pending_funds', 'pending_disbursement', 'active', 'completed', 'declined', 'cancelled'));

-- Add comment explaining the statuses
COMMENT ON COLUMN public.loans.status IS 'Loan status: pending (waiting for lender), pending_funds (diaspora loan - waiting for lender to send to LoanTrack), pending_disbursement (LoanTrack disbursing to recipient), active (loan in repayment), completed, declined, cancelled';
