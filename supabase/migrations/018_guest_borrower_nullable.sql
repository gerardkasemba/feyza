-- ===========================================
-- LOANTRACK: Allow Guest Borrowers (nullable borrower_id)
-- Run this in Supabase SQL Editor
-- ===========================================

-- Make borrower_id nullable to support guest borrowers who don't have accounts
ALTER TABLE public.loans ALTER COLUMN borrower_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN public.loans.borrower_id IS 'May be NULL for guest borrowers. Use borrower_invite_email for guest identification.';

-- Update RLS policy to handle guest borrowers
-- First, drop existing policies that reference borrower_id
DROP POLICY IF EXISTS "Users can view loans they are part of" ON public.loans;
DROP POLICY IF EXISTS "Users can update loans they own" ON public.loans;
DROP POLICY IF EXISTS "Borrowers can view their loans" ON public.loans;
DROP POLICY IF EXISTS "Lenders can view their loans" ON public.loans;

-- Create new policies that handle both registered and guest borrowers
CREATE POLICY "Users can view loans they are part of"
ON public.loans FOR SELECT
USING (
  -- Registered borrower
  borrower_id = auth.uid() OR
  -- Registered lender
  lender_id = auth.uid() OR
  -- Business lender
  business_lender_id IN (
    SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
  ) OR
  -- Guest borrower (via email match)
  borrower_invite_email = (SELECT email FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Users can update their loans"
ON public.loans FOR UPDATE
USING (
  borrower_id = auth.uid() OR
  lender_id = auth.uid() OR
  business_lender_id IN (
    SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
  )
);

-- Service role can do everything (for API operations)
DROP POLICY IF EXISTS "Service role full access" ON public.loans;
CREATE POLICY "Service role full access"
ON public.loans FOR ALL
USING (true)
WITH CHECK (true);

-- ===========================================
-- Also ensure borrower_invite_email column exists
-- ===========================================
DO $$ 
BEGIN
  -- Add borrower_invite_email if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'borrower_invite_email') THEN
    ALTER TABLE public.loans ADD COLUMN borrower_invite_email TEXT;
  END IF;
  
  -- Add borrower_access_token if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'borrower_access_token') THEN
    ALTER TABLE public.loans ADD COLUMN borrower_access_token TEXT;
  END IF;
  
  -- Add borrower_access_token_expires if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'borrower_access_token_expires') THEN
    ALTER TABLE public.loans ADD COLUMN borrower_access_token_expires TIMESTAMPTZ;
  END IF;
  
  -- Add borrower_payment_method if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'borrower_payment_method') THEN
    ALTER TABLE public.loans ADD COLUMN borrower_payment_method TEXT 
      CHECK (borrower_payment_method IN ('paypal', 'cashapp', 'venmo'));
  END IF;
  
  -- Add borrower_payment_username if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'borrower_payment_username') THEN
    ALTER TABLE public.loans ADD COLUMN borrower_payment_username TEXT;
  END IF;
END $$;

-- Create index for guest borrower lookups
CREATE INDEX IF NOT EXISTS idx_loans_borrower_invite_email ON public.loans(borrower_invite_email);
CREATE INDEX IF NOT EXISTS idx_loans_borrower_access_token ON public.loans(borrower_access_token);

-- ===========================================
-- Add helpful comments
-- ===========================================
COMMENT ON COLUMN public.loans.borrower_invite_email IS 'Email address for guest borrowers (no account required)';
COMMENT ON COLUMN public.loans.borrower_access_token IS 'Access token for guest borrowers to view their loan';
COMMENT ON COLUMN public.loans.borrower_access_token_expires IS 'Expiry date for borrower access token';
COMMENT ON COLUMN public.loans.borrower_payment_method IS 'Payment method selected by guest borrower';
COMMENT ON COLUMN public.loans.borrower_payment_username IS 'Payment username/email for guest borrower';
