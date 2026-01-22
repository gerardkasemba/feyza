-- Migration: Add Lender Terms/Policies
-- Allows business lenders to set terms and conditions that borrowers see

-- Add terms/policy columns to business_profiles
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS lending_terms TEXT,
ADD COLUMN IF NOT EXISTS lending_terms_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN business_profiles.lending_terms IS 'Terms and conditions that borrowers must agree to when requesting a loan from this business';
COMMENT ON COLUMN business_profiles.lending_terms_updated_at IS 'When the lending terms were last updated';

-- Also add to lender_preferences for individual lenders
ALTER TABLE lender_preferences
ADD COLUMN IF NOT EXISTS lending_terms TEXT,
ADD COLUMN IF NOT EXISTS lending_terms_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN lender_preferences.lending_terms IS 'Terms and conditions for this lender';
