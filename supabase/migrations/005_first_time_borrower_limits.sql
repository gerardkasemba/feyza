-- Migration: Add first-time borrower settings to lender_preferences
-- Run this in your Supabase SQL editor

-- Add new columns to lender_preferences table
ALTER TABLE lender_preferences
ADD COLUMN IF NOT EXISTS first_time_borrower_limit DECIMAL(12,2) DEFAULT 500,
ADD COLUMN IF NOT EXISTS allow_first_time_borrowers BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN lender_preferences.first_time_borrower_limit IS 'Maximum loan amount for first-time borrowers (users with no completed loans)';
COMMENT ON COLUMN lender_preferences.allow_first_time_borrowers IS 'Whether to accept loan requests from first-time borrowers';

-- Update the find_matching_lenders function to consider first-time borrower limits
CREATE OR REPLACE FUNCTION find_matching_lenders(p_loan_id UUID, p_limit INT DEFAULT 5)
RETURNS TABLE (
  lender_user_id UUID,
  lender_business_id UUID,
  match_score INT,
  auto_accept BOOLEAN,
  interest_rate DECIMAL,
  lender_name TEXT
) AS $$
DECLARE
  v_loan RECORD;
  v_borrower_completed_loans INT;
  v_is_first_time BOOLEAN;
BEGIN
  -- Get loan details
  SELECT l.*, u.borrower_rating, u.verification_status
  INTO v_loan
  FROM loans l
  JOIN users u ON u.id = l.borrower_id
  WHERE l.id = p_loan_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Count borrower's completed loans
  SELECT COUNT(*) INTO v_borrower_completed_loans
  FROM loans
  WHERE borrower_id = v_loan.borrower_id
  AND status = 'completed';

  v_is_first_time := v_borrower_completed_loans = 0;

  RETURN QUERY
  SELECT 
    lp.user_id AS lender_user_id,
    lp.business_id AS lender_business_id,
    -- Calculate match score
    CASE
      WHEN lp.auto_accept THEN 100
      ELSE 80
    END +
    CASE
      WHEN v_loan.borrower_rating IN ('great', 'good') THEN 10
      ELSE 0
    END AS match_score,
    lp.auto_accept,
    lp.interest_rate,
    COALESCE(bp.business_name, u.full_name, 'Unknown Lender') AS lender_name
  FROM lender_preferences lp
  LEFT JOIN business_profiles bp ON bp.id = lp.business_id
  LEFT JOIN users u ON u.id = lp.user_id
  WHERE 
    -- Must be active
    lp.is_active = true
    -- Must have enough capital
    AND (lp.capital_pool - COALESCE(lp.capital_reserved, 0)) >= v_loan.amount
    -- Amount within range
    AND lp.min_amount <= v_loan.amount
    AND lp.max_amount >= v_loan.amount
    -- Check first-time borrower limits
    AND (
      -- If not first time, use regular max_amount
      NOT v_is_first_time
      OR (
        -- If first time, check if lender allows first-timers
        lp.allow_first_time_borrowers = true
        -- And check first_time_borrower_limit
        AND COALESCE(lp.first_time_borrower_limit, lp.max_amount) >= v_loan.amount
      )
    )
    -- Term range check
    AND lp.min_term_weeks <= COALESCE(v_loan.term_weeks, 12)
    AND lp.max_term_weeks >= COALESCE(v_loan.term_weeks, 12)
    -- Borrower rating check
    AND (
      lp.min_borrower_rating = 'worst'
      OR (lp.min_borrower_rating = 'bad' AND v_loan.borrower_rating IN ('bad', 'poor', 'neutral', 'good', 'great'))
      OR (lp.min_borrower_rating = 'poor' AND v_loan.borrower_rating IN ('poor', 'neutral', 'good', 'great'))
      OR (lp.min_borrower_rating = 'neutral' AND v_loan.borrower_rating IN ('neutral', 'good', 'great'))
      OR (lp.min_borrower_rating = 'good' AND v_loan.borrower_rating IN ('good', 'great'))
      OR (lp.min_borrower_rating = 'great' AND v_loan.borrower_rating = 'great')
    )
    -- Country check (if specified)
    AND (
      lp.countries IS NULL 
      OR array_length(lp.countries, 1) IS NULL
      OR v_loan.country = ANY(lp.countries)
    )
    -- Verification check
    AND (
      lp.require_verified_borrower = false 
      OR v_loan.verification_status = 'verified'
    )
  ORDER BY match_score DESC, lp.interest_rate ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create a helper function to check if a user is a first-time borrower
CREATE OR REPLACE FUNCTION is_first_time_borrower(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_completed_loans INT;
BEGIN
  SELECT COUNT(*) INTO v_completed_loans
  FROM loans
  WHERE borrower_id = p_user_id
  AND status = 'completed';
  
  RETURN v_completed_loans = 0;
END;
$$ LANGUAGE plpgsql;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_lender_prefs_first_time 
ON lender_preferences(allow_first_time_borrowers, first_time_borrower_limit)
WHERE is_active = true;
