-- ===========================================
-- LOANTRACK: Loan Requests Table Migration
-- Run this in Supabase SQL Editor
-- ===========================================

-- Create loan_requests table for guest loan requests
CREATE TABLE IF NOT EXISTS public.loan_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Loan details
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  purpose TEXT NOT NULL,
  description TEXT,
  
  -- Borrower info (may not have account)
  borrower_name TEXT NOT NULL,
  borrower_email TEXT NOT NULL,
  borrower_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Borrower's receive payment method
  borrower_payment_method TEXT CHECK (borrower_payment_method IN ('paypal', 'cashapp', 'venmo')),
  borrower_payment_username TEXT,
  
  -- Proposed repayment schedule (from borrower)
  proposed_frequency TEXT DEFAULT 'monthly' CHECK (proposed_frequency IN ('weekly', 'biweekly', 'monthly')),
  proposed_installments INTEGER DEFAULT 1,
  proposed_payment_amount DECIMAL(12, 2),
  
  -- Access
  access_token TEXT,
  access_token_expires TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  
  -- When accepted
  accepted_by_email TEXT,
  accepted_by_name TEXT,
  accepted_at TIMESTAMPTZ,
  loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if table already exists (for existing installations)
DO $$ 
BEGIN
  -- Add proposed_frequency if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loan_requests' AND column_name = 'proposed_frequency') THEN
    ALTER TABLE public.loan_requests ADD COLUMN proposed_frequency TEXT DEFAULT 'monthly' 
      CHECK (proposed_frequency IN ('weekly', 'biweekly', 'monthly'));
  END IF;
  
  -- Add proposed_installments if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loan_requests' AND column_name = 'proposed_installments') THEN
    ALTER TABLE public.loan_requests ADD COLUMN proposed_installments INTEGER DEFAULT 1;
  END IF;
  
  -- Add proposed_payment_amount if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loan_requests' AND column_name = 'proposed_payment_amount') THEN
    ALTER TABLE public.loan_requests ADD COLUMN proposed_payment_amount DECIMAL(12, 2);
  END IF;
  
  -- Add borrower_payment_method if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loan_requests' AND column_name = 'borrower_payment_method') THEN
    ALTER TABLE public.loan_requests ADD COLUMN borrower_payment_method TEXT;
  END IF;
  
  -- Add borrower_payment_username if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loan_requests' AND column_name = 'borrower_payment_username') THEN
    ALTER TABLE public.loan_requests ADD COLUMN borrower_payment_username TEXT;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view pending loan requests" ON public.loan_requests;
DROP POLICY IF EXISTS "Borrowers can view own requests" ON public.loan_requests;
DROP POLICY IF EXISTS "Service role has full access to loan_requests" ON public.loan_requests;

-- Policy: Anyone can view pending loan requests (for discovery)
CREATE POLICY "Anyone can view pending loan requests"
ON public.loan_requests FOR SELECT
USING (status = 'pending');

-- Policy: Borrower can view their own requests
CREATE POLICY "Borrowers can view own requests"
ON public.loan_requests FOR SELECT
USING (
  borrower_user_id = auth.uid() OR
  borrower_email = (SELECT email FROM public.users WHERE id = auth.uid())
);

-- Policy: Service role can do everything
CREATE POLICY "Service role has full access to loan_requests"
ON public.loan_requests FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_loan_requests_status ON public.loan_requests(status);
CREATE INDEX IF NOT EXISTS idx_loan_requests_borrower_email ON public.loan_requests(borrower_email);
CREATE INDEX IF NOT EXISTS idx_loan_requests_access_token ON public.loan_requests(access_token);
CREATE INDEX IF NOT EXISTS idx_loan_requests_created_at ON public.loan_requests(created_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_loan_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_loan_requests_updated_at ON public.loan_requests;
CREATE TRIGGER update_loan_requests_updated_at
BEFORE UPDATE ON public.loan_requests
FOR EACH ROW EXECUTE FUNCTION update_loan_requests_updated_at();

-- ===========================================
-- Add helpful comments
-- ===========================================

COMMENT ON TABLE public.loan_requests IS 'Guest loan requests - allows anyone to request a loan without an account';
COMMENT ON COLUMN public.loan_requests.access_token IS 'Token for borrower to access their request';
COMMENT ON COLUMN public.loan_requests.loan_id IS 'Reference to actual loan once request is accepted';
COMMENT ON COLUMN public.loan_requests.proposed_frequency IS 'Borrower proposed payment frequency';
COMMENT ON COLUMN public.loan_requests.proposed_installments IS 'Borrower proposed number of payments';
COMMENT ON COLUMN public.loan_requests.proposed_payment_amount IS 'Borrower proposed payment amount';
