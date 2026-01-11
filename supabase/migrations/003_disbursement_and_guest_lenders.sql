-- Migration: Add disbursement methods, enhanced pickup info, and business profile completion
-- Run this after the base schema

-- Add disbursement method columns to loans table
-- Include 'paypal' as a valid disbursement method
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS disbursement_method TEXT CHECK (disbursement_method IN ('paypal', 'mobile_money', 'cash_pickup', 'bank_transfer'));

-- Mobile Money fields
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS mobile_money_provider TEXT; -- M-Pesa, Airtel, etc.
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS mobile_money_phone TEXT;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS mobile_money_name TEXT;

-- Cash Pickup fields  
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS pickup_person_phone TEXT;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS pickup_person_id_type TEXT; -- National ID, Passport, etc.
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS pickup_person_id_number TEXT;

-- Bank Transfer fields
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS bank_swift_code TEXT;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS bank_branch TEXT;

-- Add cancelled_at and cancelled_reason for loan cancellation
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- Add profile_completed field to business_profiles
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS paypal_email TEXT;
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS paypal_connected BOOLEAN DEFAULT FALSE;

-- Add lender_interest_rate for personal loans (lender sets this, not borrower)
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS lender_interest_rate DECIMAL(5, 2);
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS lender_interest_type TEXT CHECK (lender_interest_type IN ('simple', 'compound'));
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS interest_set_by_lender BOOLEAN DEFAULT FALSE;

-- Guest lender tracking table (for personal lenders without accounts)
CREATE TABLE IF NOT EXISTS public.guest_lenders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  paypal_email TEXT,
  paypal_connected BOOLEAN DEFAULT FALSE,
  -- Track their loans
  total_loans INTEGER DEFAULT 0,
  total_amount_lent DECIMAL(12, 2) DEFAULT 0,
  -- Token for accessing their dashboard
  access_token TEXT UNIQUE,
  access_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link loans to guest lenders
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS guest_lender_id UUID REFERENCES public.guest_lenders(id) ON DELETE SET NULL;

-- Create index for guest lenders
CREATE INDEX IF NOT EXISTS idx_guest_lenders_email ON public.guest_lenders(email);
CREATE INDEX IF NOT EXISTS idx_guest_lenders_token ON public.guest_lenders(access_token);
CREATE INDEX IF NOT EXISTS idx_loans_guest_lender ON public.loans(guest_lender_id);

-- RLS for guest_lenders (service role only for most operations)
ALTER TABLE public.guest_lenders ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage guest lenders
CREATE POLICY "Service role can manage guest lenders"
ON public.guest_lenders FOR ALL
USING (true);

-- Update loans policy to include guest lenders
DROP POLICY IF EXISTS "Users can view loans they're involved in" ON public.loans;
CREATE POLICY "Users can view loans they're involved in"
ON public.loans FOR SELECT
USING (
  auth.uid() = borrower_id OR 
  auth.uid() = lender_id OR 
  auth.uid() IN (SELECT user_id FROM business_profiles WHERE id = business_lender_id)
);

-- Comments
COMMENT ON COLUMN public.loans.disbursement_method IS 'How the borrower wants to receive money: mobile_money, cash_pickup, or bank_transfer';
COMMENT ON COLUMN public.loans.lender_interest_rate IS 'Interest rate set by personal lender (overrides borrower-suggested rate)';
COMMENT ON TABLE public.guest_lenders IS 'Tracks personal lenders who dont have accounts but lend through invites';
