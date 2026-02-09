-- Migration: Enhanced KYC with Selfie Verification and Periodic Re-verification
-- This adds support for:
-- 1. Selfie with ID verification
-- 2. Front and back of ID documents
-- 3. SSN last 4 digits (for US users)
-- 4. Job title and income range
-- 5. Date of birth and phone verification
-- 6. Periodic re-verification (every 3 months)

-- Personal Information
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ssn_last4 TEXT; -- Last 4 digits only, for US users

-- Enhanced ID Document fields
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS id_front_url TEXT; -- Front of ID
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS id_back_url TEXT; -- Back of ID (for DL/National ID)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS id_expiry DATE; -- Renamed from id_expiry_date for consistency

-- Selfie Verification
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS selfie_url TEXT; -- Selfie holding ID
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS selfie_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS selfie_verified_at TIMESTAMPTZ;

-- Enhanced Employment fields
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS monthly_income_range TEXT; -- Range like '2500-5000'

-- Re-verification tracking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ; -- When verification was approved
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reverification_required BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reverification_due_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0; -- How many times verified

-- Privacy consent
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;

-- Create storage bucket for KYC documents if not exists
-- Run this in Supabase Dashboard > Storage > New bucket
-- Name: kyc-documents
-- Public: No (private)
-- File size limit: 10MB
-- Allowed MIME types: image/jpeg, image/png, application/pdf

-- Create index for re-verification queries
CREATE INDEX IF NOT EXISTS idx_users_reverification_due ON public.users(reverification_due_at) 
WHERE verification_status = 'verified' AND reverification_due_at IS NOT NULL;

-- Create index for verified_at to find users needing re-verification
CREATE INDEX IF NOT EXISTS idx_users_verified_at ON public.users(verified_at) 
WHERE verification_status = 'verified';

-- Function to check if user needs re-verification (every 3 months)
CREATE OR REPLACE FUNCTION check_reverification_needed()
RETURNS TRIGGER AS $$
BEGIN
  -- When verification is approved, set the re-verification due date
  IF NEW.verification_status = 'verified' AND OLD.verification_status != 'verified' THEN
    NEW.verified_at = NOW();
    NEW.reverification_due_at = NOW() + INTERVAL '3 months';
    NEW.verification_count = COALESCE(OLD.verification_count, 0) + 1;
    NEW.reverification_required = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for re-verification tracking
DROP TRIGGER IF EXISTS trigger_check_reverification ON public.users;
CREATE TRIGGER trigger_check_reverification
  BEFORE UPDATE OF verification_status ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION check_reverification_needed();

-- Function to mark users needing re-verification (run daily via cron)
CREATE OR REPLACE FUNCTION mark_users_for_reverification()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.users
  SET 
    reverification_required = TRUE,
    verification_status = 'pending'
  WHERE 
    verification_status = 'verified'
    AND verified_at < NOW() - INTERVAL '3 months'
    AND reverification_required = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON COLUMN public.users.selfie_url IS 'URL to selfie photo holding ID document';
COMMENT ON COLUMN public.users.verified_at IS 'Timestamp when user was last verified';
COMMENT ON COLUMN public.users.reverification_due_at IS 'When the next re-verification is due (3 months after verified_at)';
COMMENT ON COLUMN public.users.reverification_required IS 'True if user needs to re-verify';
COMMENT ON COLUMN public.users.verification_count IS 'Number of times user has completed verification';
COMMENT ON COLUMN public.users.ssn_last4 IS 'Last 4 digits of SSN for US users (encrypted at rest)';
COMMENT ON COLUMN public.users.monthly_income_range IS 'Income range like 0-1000, 1000-2500, etc.';

-- RLS Policies for KYC documents storage bucket
-- Run these in Supabase Dashboard > Storage > kyc-documents > Policies

-- Policy: Users can upload their own KYC documents
-- CREATE POLICY "Users can upload own KYC docs"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy: Users can view their own KYC documents
-- CREATE POLICY "Users can view own KYC docs"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy: Admins can view all KYC documents
-- CREATE POLICY "Admins can view all KYC docs"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (
--   bucket_id = 'kyc-documents' 
--   AND EXISTS (
--     SELECT 1 FROM public.users 
--     WHERE id = auth.uid() 
--     AND role IN ('admin', 'super_admin')
--   )
-- );
