-- Migration: Add KYC/verification fields for individual users
-- Run this in your Supabase SQL Editor

-- Add verification fields to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'submitted', 'verified', 'rejected'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Identity proof
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS id_type TEXT; -- national_id, passport, drivers_license
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS id_document_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS id_expiry_date DATE;

-- Employment proof
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employment_status TEXT; -- employed, self_employed, contractor
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employer_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employer_address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employment_start_date DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employment_document_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS monthly_income DECIMAL(12, 2);

-- Address proof
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS state_province TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address_document_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address_document_type TEXT; -- utility_bill, bank_statement, lease_agreement

-- Terms acceptance
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Create index for verification status
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON public.users(verification_status);

-- Comments
COMMENT ON COLUMN public.users.verification_status IS 'KYC verification status: pending, submitted, verified, rejected';
COMMENT ON COLUMN public.users.id_document_url IS 'URL to uploaded ID document (stored in Supabase Storage)';
COMMENT ON COLUMN public.users.employment_document_url IS 'URL to employment proof document';
COMMENT ON COLUMN public.users.address_document_url IS 'URL to address proof document';
