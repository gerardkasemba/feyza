-- ===========================================
-- LOANTRACK: Add New Loan Statuses
-- Run this in Supabase SQL Editor
-- ===========================================

-- Drop the existing constraint and add new one with more statuses
ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_status_check;

ALTER TABLE public.loans ADD CONSTRAINT loans_status_check 
CHECK (status IN (
  'pending',           -- Initial state, waiting for terms
  'pending_signature', -- Terms set, waiting for borrower to accept
  'pending_funds',     -- Both signed, waiting for disbursement
  'active',            -- Loan is active, payments being made
  'completed',         -- Fully paid
  'declined',          -- Borrower or lender declined
  'cancelled'          -- Cancelled by either party
));

-- Add comment
COMMENT ON COLUMN public.loans.status IS 'Loan status: pending → pending_signature → pending_funds → active → completed';
