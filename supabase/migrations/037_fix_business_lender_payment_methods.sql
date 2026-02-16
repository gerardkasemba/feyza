-- Migration: Fix Business Lender Payment Methods
-- Issue: When a user has both a personal account and a business account,
-- the system should use the business payment methods for business loans,
-- not the user's personal payment methods.

-- ===========================================
-- HELPER FUNCTION: Get Lender Dwolla Info
-- ===========================================

-- This function returns the correct Dwolla information for a lender
-- based on whether the loan is from a personal lender or business lender
CREATE OR REPLACE FUNCTION get_lender_dwolla_info(p_loan_id UUID)
RETURNS TABLE (
  dwolla_customer_url TEXT,
  dwolla_customer_id TEXT,
  dwolla_funding_source_url TEXT,
  dwolla_funding_source_id TEXT,
  bank_name TEXT,
  bank_account_mask TEXT,
  bank_account_type TEXT,
  bank_connected BOOLEAN
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

  -- If business lender, return business Dwolla info
  IF v_loan.business_lender_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      bp.dwolla_customer_url,
      bp.dwolla_customer_id,
      bp.dwolla_funding_source_url,
      bp.dwolla_funding_source_id,
      bp.bank_name,
      bp.bank_account_mask,
      bp.bank_account_type,
      bp.bank_connected
    FROM business_profiles bp
    WHERE bp.id = v_loan.business_lender_id;
    
  -- Otherwise, return personal lender Dwolla info
  ELSIF v_loan.lender_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      u.dwolla_customer_url,
      u.dwolla_customer_id,
      u.dwolla_funding_source_url,
      u.dwolla_funding_source_id,
      u.bank_name,
      u.bank_account_mask,
      u.bank_account_type,
      u.bank_connected
    FROM users u
    WHERE u.id = v_loan.lender_id;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- COMMENTS
-- ===========================================

COMMENT ON FUNCTION get_lender_dwolla_info(UUID) IS 
'Returns the correct Dwolla/bank information for a loan lender. 
If the loan is from a business lender, returns business Dwolla info.
If the loan is from a personal lender, returns personal Dwolla info.
This ensures business loans use business payment methods, not personal.';

-- ===========================================
-- INDEX OPTIMIZATION
-- ===========================================

-- Add indexes to improve performance of Dwolla lookups
CREATE INDEX IF NOT EXISTS idx_business_profiles_dwolla_funding 
  ON business_profiles(dwolla_funding_source_url) 
  WHERE dwolla_funding_source_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_dwolla_funding 
  ON users(dwolla_funding_source_url) 
  WHERE dwolla_funding_source_url IS NOT NULL;

-- ===========================================
-- DATA MIGRATION (FIX EXISTING LOANS)
-- ===========================================

-- Update any existing loans that have incorrect lender Dwolla info
-- This will fix loans where a business lender's personal account info
-- was incorrectly stored instead of the business account info

UPDATE loans l
SET 
  lender_dwolla_customer_url = bp.dwolla_customer_url,
  lender_dwolla_customer_id = bp.dwolla_customer_id,
  lender_dwolla_funding_source_url = bp.dwolla_funding_source_url,
  lender_dwolla_funding_source_id = bp.dwolla_funding_source_id,
  lender_bank_name = bp.bank_name,
  lender_bank_account_mask = bp.bank_account_mask,
  lender_bank_connected = bp.bank_connected
FROM business_profiles bp
WHERE 
  l.business_lender_id IS NOT NULL
  AND l.business_lender_id = bp.id
  AND bp.dwolla_funding_source_url IS NOT NULL
  AND (
    l.lender_dwolla_funding_source_url IS NULL
    OR l.lender_dwolla_funding_source_url != bp.dwolla_funding_source_url
  );

-- ===========================================
-- AUTO-PAY VERIFICATION
-- ===========================================

-- The auto-pay cron job (/api/cron/auto-pay) uses loan.lender_dwolla_funding_source_url
-- This migration ensures that field contains the BUSINESS funding source for business loans
-- and PERSONAL funding source for personal loans

COMMENT ON COLUMN loans.lender_dwolla_funding_source_url IS 
'Dwolla funding source URL for loan repayments. 
Auto-pay cron uses this field to send payments to the correct account.
For business loans: should be business_profiles.dwolla_funding_source_url
For personal loans: should be users.dwolla_funding_source_url';

-- Verify auto-pay will work correctly
DO $$
DECLARE
  v_business_loans_fixed INTEGER;
  v_personal_loans_ok INTEGER;
  v_loans_ready_for_autopay INTEGER;
BEGIN
  -- Count business loans fixed
  SELECT COUNT(*) INTO v_business_loans_fixed
  FROM loans l
  INNER JOIN business_profiles bp ON l.business_lender_id = bp.id
  WHERE 
    l.business_lender_id IS NOT NULL
    AND bp.dwolla_funding_source_url IS NOT NULL
    AND l.lender_dwolla_funding_source_url = bp.dwolla_funding_source_url;
  
  -- Count personal loans (should already be correct)
  SELECT COUNT(*) INTO v_personal_loans_ok
  FROM loans l
  INNER JOIN users u ON l.lender_id = u.id
  WHERE 
    l.lender_id IS NOT NULL
    AND l.business_lender_id IS NULL
    AND u.dwolla_funding_source_url IS NOT NULL
    AND l.lender_dwolla_funding_source_url = u.dwolla_funding_source_url;
  
  -- Count total loans ready for auto-pay
  SELECT COUNT(*) INTO v_loans_ready_for_autopay
  FROM loans
  WHERE 
    status = 'active'
    AND lender_dwolla_funding_source_url IS NOT NULL
    AND borrower_dwolla_funding_source_url IS NOT NULL;
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'AUTO-PAY MIGRATION RESULTS:';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Business loans fixed: %', v_business_loans_fixed;
  RAISE NOTICE 'Personal loans verified: %', v_personal_loans_ok;
  RAISE NOTICE 'Total loans ready for auto-pay: %', v_loans_ready_for_autopay;
  RAISE NOTICE '';
  RAISE NOTICE 'Auto-pay will now use:';
  RAISE NOTICE '  - Business bank accounts for business loans';
  RAISE NOTICE '  - Personal bank accounts for personal loans';
  RAISE NOTICE '===========================================';
END $$;
