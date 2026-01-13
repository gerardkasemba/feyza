-- Migration: Enhanced Business Profiles for better verification
-- Run this in your Supabase SQL editor

-- Add new columns to business_profiles table
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS ein_tax_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS state VARCHAR(50),
ADD COLUMN IF NOT EXISTS business_entity_type VARCHAR(50), -- LLC, Corporation, Sole Proprietor, Partnership
ADD COLUMN IF NOT EXISTS years_in_business INTEGER,
ADD COLUMN IF NOT EXISTS website_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS number_of_employees VARCHAR(50),
ADD COLUMN IF NOT EXISTS annual_revenue_range VARCHAR(50),
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS public_profile_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tagline VARCHAR(200),
ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

-- Add comments for documentation
COMMENT ON COLUMN business_profiles.ein_tax_id IS 'Business EIN or Tax ID number';
COMMENT ON COLUMN business_profiles.state IS 'US state where business is registered';
COMMENT ON COLUMN business_profiles.business_entity_type IS 'Legal entity type: LLC, Corporation, Sole Proprietor, Partnership, Non-Profit';
COMMENT ON COLUMN business_profiles.years_in_business IS 'Number of years the business has been operating';
COMMENT ON COLUMN business_profiles.slug IS 'URL-friendly unique identifier for public profile';
COMMENT ON COLUMN business_profiles.public_profile_enabled IS 'Whether the lender profile is publicly visible';
COMMENT ON COLUMN business_profiles.verification_status IS 'Admin verification status: pending, approved, rejected';

-- Create index for slug lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_profiles_slug ON business_profiles(slug) WHERE slug IS NOT NULL;

-- Create index for public profiles
CREATE INDEX IF NOT EXISTS idx_business_profiles_public ON business_profiles(public_profile_enabled, verification_status) 
WHERE public_profile_enabled = true AND verification_status = 'approved';

-- Function to generate slug from business name
CREATE OR REPLACE FUNCTION generate_business_slug(business_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(business_name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- Limit to 50 chars
  base_slug := substring(base_slug, 1, 50);
  
  final_slug := base_slug;
  
  -- Check if slug exists and add number if needed
  WHILE EXISTS (SELECT 1 FROM business_profiles WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug on insert
CREATE OR REPLACE FUNCTION set_business_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_business_slug(NEW.business_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_business_profiles_slug ON business_profiles;
CREATE TRIGGER tr_business_profiles_slug
  BEFORE INSERT ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_business_slug();

-- Update existing rows to have slugs
UPDATE business_profiles 
SET slug = generate_business_slug(business_name)
WHERE slug IS NULL;

-- Function to sync business_profiles to lender_preferences
CREATE OR REPLACE FUNCTION sync_business_to_lender_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if lender_preferences exists for this business
  IF EXISTS (SELECT 1 FROM lender_preferences WHERE business_id = NEW.id) THEN
    -- Update existing preferences
    UPDATE lender_preferences
    SET
      interest_rate = COALESCE(NEW.default_interest_rate, interest_rate),
      interest_type = COALESCE(NEW.interest_type, interest_type),
      min_amount = COALESCE(NEW.min_loan_amount, min_amount),
      max_amount = COALESCE(NEW.max_loan_amount, max_amount),
      is_active = (NEW.is_verified AND NEW.profile_completed AND NEW.verification_status = 'approved'),
      updated_at = NOW()
    WHERE business_id = NEW.id;
  ELSE
    -- Create new lender_preferences record (only business_id, not user_id per constraint)
    INSERT INTO lender_preferences (
      business_id,
      is_active,
      interest_rate,
      interest_type,
      min_amount,
      max_amount,
      auto_accept,
      preferred_currency,
      min_borrower_rating,
      require_verified_borrower,
      min_term_weeks,
      max_term_weeks,
      capital_pool,
      notify_on_match,
      notify_email,
      first_time_borrower_limit,
      allow_first_time_borrowers
    ) VALUES (
      NEW.id,
      false, -- Not active until approved
      COALESCE(NEW.default_interest_rate, 10),
      COALESCE(NEW.interest_type, 'simple'),
      COALESCE(NEW.min_loan_amount, 50),
      COALESCE(NEW.max_loan_amount, 5000),
      false,
      'USD',
      'neutral',
      false,
      1,
      52,
      0,
      true,
      true,
      500,
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_business_lender_prefs ON business_profiles;
CREATE TRIGGER tr_sync_business_lender_prefs
  AFTER INSERT OR UPDATE ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_business_to_lender_preferences();

-- US States table for dropdown
CREATE TABLE IF NOT EXISTS us_states (
  code VARCHAR(2) PRIMARY KEY,
  name VARCHAR(50) NOT NULL
);

INSERT INTO us_states (code, name) VALUES
  ('AL', 'Alabama'), ('AK', 'Alaska'), ('AZ', 'Arizona'), ('AR', 'Arkansas'),
  ('CA', 'California'), ('CO', 'Colorado'), ('CT', 'Connecticut'), ('DE', 'Delaware'),
  ('FL', 'Florida'), ('GA', 'Georgia'), ('HI', 'Hawaii'), ('ID', 'Idaho'),
  ('IL', 'Illinois'), ('IN', 'Indiana'), ('IA', 'Iowa'), ('KS', 'Kansas'),
  ('KY', 'Kentucky'), ('LA', 'Louisiana'), ('ME', 'Maine'), ('MD', 'Maryland'),
  ('MA', 'Massachusetts'), ('MI', 'Michigan'), ('MN', 'Minnesota'), ('MS', 'Mississippi'),
  ('MO', 'Missouri'), ('MT', 'Montana'), ('NE', 'Nebraska'), ('NV', 'Nevada'),
  ('NH', 'New Hampshire'), ('NJ', 'New Jersey'), ('NM', 'New Mexico'), ('NY', 'New York'),
  ('NC', 'North Carolina'), ('ND', 'North Dakota'), ('OH', 'Ohio'), ('OK', 'Oklahoma'),
  ('OR', 'Oregon'), ('PA', 'Pennsylvania'), ('RI', 'Rhode Island'), ('SC', 'South Carolina'),
  ('SD', 'South Dakota'), ('TN', 'Tennessee'), ('TX', 'Texas'), ('UT', 'Utah'),
  ('VT', 'Vermont'), ('VA', 'Virginia'), ('WA', 'Washington'), ('WV', 'West Virginia'),
  ('WI', 'Wisconsin'), ('WY', 'Wyoming'), ('DC', 'District of Columbia')
ON CONFLICT (code) DO NOTHING;
