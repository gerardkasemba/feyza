-- Migration: Add Zelle and Manual Payment Method Support for Business Profiles
-- This ensures all payment methods (Zelle, Cash App, Venmo, PayPal) use business details

-- ===========================================
-- ADD ZELLE FIELDS TO BUSINESS_PROFILES
-- ===========================================

-- Zelle requires: email OR phone + full name
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS zelle_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS zelle_name VARCHAR(255);

-- Add helpful comments
COMMENT ON COLUMN business_profiles.zelle_email IS 'Business Zelle email address';
COMMENT ON COLUMN business_profiles.zelle_phone IS 'Business Zelle phone number (alternative to email)';
COMMENT ON COLUMN business_profiles.zelle_name IS 'Full business name for Zelle transfers';

-- ===========================================
-- UPDATE PREFERRED PAYMENT METHOD CONSTRAINT
-- ===========================================

-- Drop old constraint
ALTER TABLE business_profiles 
DROP CONSTRAINT IF EXISTS business_preferred_payment_method_check;

ALTER TABLE business_profiles 
DROP CONSTRAINT IF EXISTS business_profiles_preferred_payment_method_check;

-- Add new constraint with Zelle
ALTER TABLE business_profiles 
ADD CONSTRAINT business_profiles_preferred_payment_method_check 
CHECK (
  preferred_payment_method IS NULL 
  OR preferred_payment_method IN ('paypal', 'cashapp', 'venmo', 'zelle')
);

-- ===========================================
-- ADD INDEXES FOR PAYMENT LOOKUPS
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_business_profiles_cashapp 
ON business_profiles(cashapp_username) 
WHERE cashapp_username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_business_profiles_venmo 
ON business_profiles(venmo_username) 
WHERE venmo_username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_business_profiles_zelle_email 
ON business_profiles(zelle_email) 
WHERE zelle_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_business_profiles_zelle_phone 
ON business_profiles(zelle_phone) 
WHERE zelle_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_business_profiles_paypal 
ON business_profiles(paypal_email) 
WHERE paypal_email IS NOT NULL;

-- ===========================================
-- HELPER FUNCTION: Get Payment Methods for Loan
-- ===========================================

-- This function returns the correct payment method details based on loan type
CREATE OR REPLACE FUNCTION get_loan_payment_methods(p_loan_id UUID)
RETURNS TABLE (
  -- PayPal
  paypal_email TEXT,
  paypal_connected BOOLEAN,
  -- Cash App
  cashapp_username TEXT,
  -- Venmo
  venmo_username TEXT,
  -- Zelle
  zelle_email TEXT,
  zelle_phone TEXT,
  zelle_name TEXT,
  -- Preferred method
  preferred_payment_method TEXT,
  -- Source (for debugging)
  source TEXT
) AS $$
DECLARE
  v_loan RECORD;
BEGIN
  -- Get the loan details
  SELECT 
    lender_id,
    business_lender_id
  INTO v_loan
  FROM loans
  WHERE id = p_loan_id;

  -- If business lender, return business payment methods
  IF v_loan.business_lender_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      bp.paypal_email,
      bp.paypal_connected,
      bp.cashapp_username,
      bp.venmo_username,
      bp.zelle_email,
      bp.zelle_phone,
      bp.zelle_name,
      bp.preferred_payment_method,
      'business'::TEXT as source
    FROM business_profiles bp
    WHERE bp.id = v_loan.business_lender_id;
    
  -- Otherwise, return personal lender payment methods
  ELSIF v_loan.lender_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      u.paypal_email,
      u.paypal_connected,
      u.cashapp_username,
      u.venmo_username,
      NULL::TEXT as zelle_email,  -- Users table doesn't have Zelle yet
      NULL::TEXT as zelle_phone,
      u.full_name as zelle_name,  -- Use user's full name for Zelle
      u.preferred_payment_method,
      'personal'::TEXT as source
    FROM users u
    WHERE u.id = v_loan.lender_id;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMMENTS
-- ===========================================

COMMENT ON FUNCTION get_loan_payment_methods(UUID) IS 
'Returns the correct payment method details for a loan lender.
If business loan: returns business payment methods (PayPal, Cash App, Venmo, Zelle)
If personal loan: returns personal payment methods
This ensures borrowers send payments to the correct account.';

-- ===========================================
-- ADD ZELLE TO USERS TABLE (OPTIONAL)
-- ===========================================

-- For completeness, add Zelle support to users table too
ALTER TABLE users
ADD COLUMN IF NOT EXISTS zelle_email TEXT,
ADD COLUMN IF NOT EXISTS zelle_phone VARCHAR(20);

COMMENT ON COLUMN users.zelle_email IS 'Personal Zelle email address';
COMMENT ON COLUMN users.zelle_phone IS 'Personal Zelle phone number (alternative to email)';

-- Update users preferred_payment_method constraint to include Zelle
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_preferred_payment_method_check;

ALTER TABLE users 
ADD CONSTRAINT users_preferred_payment_method_check 
CHECK (
  preferred_payment_method IS NULL 
  OR preferred_payment_method IN ('paypal', 'cashapp', 'venmo', 'zelle')
);

-- ===========================================
-- DATA MIGRATION
-- ===========================================

-- Auto-populate zelle_name with business_name for existing businesses
UPDATE business_profiles
SET zelle_name = business_name
WHERE zelle_name IS NULL 
  AND business_name IS NOT NULL;

-- Log completion
DO $$
DECLARE
  v_business_count INTEGER;
  v_user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_business_count FROM business_profiles WHERE zelle_name IS NOT NULL;
  SELECT COUNT(*) INTO v_user_count FROM users WHERE full_name IS NOT NULL;
  
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  - % business profiles have Zelle names', v_business_count;
  RAISE NOTICE '  - % users ready for Zelle', v_user_count;
  RAISE NOTICE '  - Added Zelle fields to business_profiles and users tables';
  RAISE NOTICE '  - Created get_loan_payment_methods() function';
END $$;
