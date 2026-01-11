-- ===========================================
-- LOANTRACK: Payment Methods & Proof Migration
-- Run this in Supabase SQL Editor
-- ===========================================

-- 1. Add Cash App, Venmo, and preferred method columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS cashapp_username TEXT,
ADD COLUMN IF NOT EXISTS venmo_username TEXT,
ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT;

-- 2. Add PayPal, Cash App, Venmo, and preferred method columns to business_profiles table
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS paypal_email TEXT,
ADD COLUMN IF NOT EXISTS cashapp_username TEXT,
ADD COLUMN IF NOT EXISTS venmo_username TEXT,
ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT;

-- 3. Add proof URL column to loans table
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS funds_sent_proof_url TEXT;

-- 4. Add helpful comments
COMMENT ON COLUMN public.users.cashapp_username IS 'User Cash App username (e.g., $johndoe)';
COMMENT ON COLUMN public.users.venmo_username IS 'User Venmo username (e.g., @johndoe)';
COMMENT ON COLUMN public.users.preferred_payment_method IS 'User preferred payment method: paypal, cashapp, or venmo';
COMMENT ON COLUMN public.business_profiles.cashapp_username IS 'Business Cash App username';
COMMENT ON COLUMN public.business_profiles.venmo_username IS 'Business Venmo username';
COMMENT ON COLUMN public.business_profiles.preferred_payment_method IS 'Business preferred payment method';
COMMENT ON COLUMN public.loans.funds_sent_proof_url IS 'URL to screenshot proof of payment';

-- 5. Add constraint for preferred_payment_method values
ALTER TABLE public.users 
ADD CONSTRAINT users_preferred_payment_method_check 
CHECK (preferred_payment_method IS NULL OR preferred_payment_method IN ('paypal', 'cashapp', 'venmo'));

ALTER TABLE public.business_profiles 
ADD CONSTRAINT business_preferred_payment_method_check 
CHECK (preferred_payment_method IS NULL OR preferred_payment_method IN ('paypal', 'cashapp', 'venmo'));

-- 6. Create storage bucket for payment proofs (run in Supabase dashboard or via API)
-- Note: You may need to create this bucket manually in Supabase Storage UI
-- Bucket name: loan-documents
-- Public access: true (so proof can be viewed in emails)

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- Check users have new columns:
-- SELECT id, full_name, paypal_email, cashapp_username, venmo_username, preferred_payment_method FROM users LIMIT 5;

-- Check business_profiles have new columns:
-- SELECT id, business_name, paypal_email, cashapp_username, venmo_username, preferred_payment_method FROM business_profiles LIMIT 5;

-- Check loans have proof column:
-- SELECT id, funds_sent, funds_sent_method, funds_sent_proof_url FROM loans WHERE funds_sent = true LIMIT 5;
