-- Migration: Add Interest Rate Fields
-- Run this if you have an existing database without interest rate fields

-- Add columns to business_profiles
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS default_interest_rate DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS interest_type TEXT DEFAULT 'simple' CHECK (interest_type IN ('simple', 'compound')),
ADD COLUMN IF NOT EXISTS min_loan_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS max_loan_amount DECIMAL(12, 2);

-- Add columns to loans
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS interest_type TEXT DEFAULT 'simple' CHECK (interest_type IN ('simple', 'compound')),
ADD COLUMN IF NOT EXISTS total_interest DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2);

-- Update total_amount for existing loans (set to amount if not set)
UPDATE public.loans 
SET total_amount = amount 
WHERE total_amount IS NULL;

-- Make total_amount NOT NULL after update
ALTER TABLE public.loans 
ALTER COLUMN total_amount SET NOT NULL;

-- Add columns to payment_schedule
ALTER TABLE public.payment_schedule 
ADD COLUMN IF NOT EXISTS principal_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS interest_amount DECIMAL(12, 2) DEFAULT 0;

-- Update existing payment_schedule entries
UPDATE public.payment_schedule 
SET principal_amount = amount, interest_amount = 0 
WHERE principal_amount IS NULL;

-- Make principal_amount NOT NULL after update
ALTER TABLE public.payment_schedule 
ALTER COLUMN principal_amount SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.business_profiles.default_interest_rate IS 'Annual Percentage Rate (APR) e.g., 15.5 = 15.5%';
COMMENT ON COLUMN public.loans.interest_rate IS 'Annual Percentage Rate (APR) applied to this loan';
COMMENT ON COLUMN public.loans.total_interest IS 'Total calculated interest for the loan term';
COMMENT ON COLUMN public.loans.total_amount IS 'Principal + Total Interest (full amount to be repaid)';
