-- Fix the sync_business_to_lender_preferences trigger
-- Replace is_verified with verification_status check

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
      -- Fixed: use verification_status instead of is_verified
      is_active = (COALESCE(NEW.profile_completed, false) AND NEW.verification_status = 'approved'),
      updated_at = NOW()
    WHERE business_id = NEW.id;
  ELSE
    -- Create new lender_preferences record
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
      COALESCE(NEW.max_loan_amount, 50000),
      false,
      'USD',
      0,
      true,
      1,
      52,
      0,
      true,
      true,
      COALESCE(NEW.min_loan_amount, 500),
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS tr_sync_business_lender_prefs ON business_profiles;
CREATE TRIGGER tr_sync_business_lender_prefs
  AFTER INSERT OR UPDATE ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_business_to_lender_preferences();

-- Fix the get_lenders_for_loan_type function
-- Replace bp.is_verified with bp.verification_status = 'approved'
CREATE OR REPLACE FUNCTION get_lenders_for_loan_type(p_loan_type_id UUID)
RETURNS TABLE (
  business_id UUID,
  business_name TEXT,
  min_amount DECIMAL,
  max_amount DECIMAL,
  interest_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id AS business_id,
    bp.business_name,
    COALESCE(blt.min_amount, bp.min_loan_amount) AS min_amount,
    COALESCE(blt.max_amount, bp.max_loan_amount) AS max_amount,
    COALESCE(blt.interest_rate, bp.default_interest_rate) AS interest_rate
  FROM business_loan_types blt
  JOIN business_profiles bp ON bp.id = blt.business_id
  WHERE blt.loan_type_id = p_loan_type_id
    AND blt.is_active = true
    AND bp.verification_status = 'approved'  -- Fixed: was bp.is_verified = true
    AND bp.profile_completed = true
  ORDER BY bp.business_name;
END;
$$ LANGUAGE plpgsql;
