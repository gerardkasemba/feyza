-- ===========================================
-- FEYZA: Link Loans to Loan Requests
-- Run this in Supabase SQL Editor
-- ===========================================

-- Add loan_request_id column to loans table if it doesn't exist
DO $$ 
BEGIN
  -- Add loan_request_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'loan_request_id') THEN
    ALTER TABLE public.loans ADD COLUMN loan_request_id UUID REFERENCES public.loan_requests(id) ON DELETE SET NULL;
  END IF;

  -- Add borrower_name if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'borrower_name') THEN
    ALTER TABLE public.loans ADD COLUMN borrower_name TEXT;
  END IF;

  -- Add borrower_dwolla_customer_url if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'borrower_dwolla_customer_url') THEN
    ALTER TABLE public.loans ADD COLUMN borrower_dwolla_customer_url TEXT;
  END IF;

  -- Add borrower_dwolla_customer_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'borrower_dwolla_customer_id') THEN
    ALTER TABLE public.loans ADD COLUMN borrower_dwolla_customer_id TEXT;
  END IF;

  -- Add borrower_dwolla_funding_source_url if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'borrower_dwolla_funding_source_url') THEN
    ALTER TABLE public.loans ADD COLUMN borrower_dwolla_funding_source_url TEXT;
  END IF;

  -- Add borrower_dwolla_funding_source_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'borrower_dwolla_funding_source_id') THEN
    ALTER TABLE public.loans ADD COLUMN borrower_dwolla_funding_source_id TEXT;
  END IF;

  -- Add borrower_bank_name if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'borrower_bank_name') THEN
    ALTER TABLE public.loans ADD COLUMN borrower_bank_name TEXT;
  END IF;

  -- Add borrower_bank_account_mask if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'borrower_bank_account_mask') THEN
    ALTER TABLE public.loans ADD COLUMN borrower_bank_account_mask TEXT;
  END IF;

  -- Add borrower_bank_connected if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'borrower_bank_connected') THEN
    ALTER TABLE public.loans ADD COLUMN borrower_bank_connected BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create index for loan_request_id lookups
CREATE INDEX IF NOT EXISTS idx_loans_loan_request_id ON public.loans(loan_request_id);

-- Add comments
COMMENT ON COLUMN public.loans.loan_request_id IS 'Reference to the original loan request that created this loan';
COMMENT ON COLUMN public.loans.borrower_name IS 'Full name of the borrower';
COMMENT ON COLUMN public.loans.borrower_bank_connected IS 'Whether borrower has connected their bank via Plaid/Dwolla';
