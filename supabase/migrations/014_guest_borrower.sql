-- ===========================================
-- LOANTRACK: Guest Borrower Access Migration
-- Run this in Supabase SQL Editor
-- ===========================================

-- Add guest borrower fields to loans table
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS borrower_invite_email TEXT,
ADD COLUMN IF NOT EXISTS borrower_access_token TEXT,
ADD COLUMN IF NOT EXISTS borrower_access_token_expires TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS borrower_payment_method TEXT CHECK (borrower_payment_method IN ('paypal', 'cashapp', 'venmo')),
ADD COLUMN IF NOT EXISTS borrower_payment_username TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_loans_borrower_invite_email ON public.loans(borrower_invite_email);
CREATE INDEX IF NOT EXISTS idx_loans_borrower_access_token ON public.loans(borrower_access_token);

-- Add helpful comments
COMMENT ON COLUMN public.loans.borrower_invite_email IS 'Email used to invite guest borrower';
COMMENT ON COLUMN public.loans.borrower_access_token IS 'Secure token for guest borrower access';
COMMENT ON COLUMN public.loans.borrower_access_token_expires IS 'Expiry time for borrower access token';
COMMENT ON COLUMN public.loans.borrower_payment_method IS 'Borrower preferred payment method (paypal/cashapp/venmo)';
COMMENT ON COLUMN public.loans.borrower_payment_username IS 'Borrower payment username/email';

-- Add payment method fields to business_profiles if not exists
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS paypal_email TEXT,
ADD COLUMN IF NOT EXISTS cashapp_username TEXT,
ADD COLUMN IF NOT EXISTS venmo_username TEXT,
ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT CHECK (preferred_payment_method IN ('paypal', 'cashapp', 'venmo'));

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- Check loans table has new columns:
-- SELECT id, borrower_invite_email, borrower_access_token, borrower_payment_method FROM loans LIMIT 5;

-- Check business_profiles has payment columns:
-- SELECT id, business_name, paypal_email, cashapp_username, venmo_username FROM business_profiles LIMIT 5;
