-- =====================================================
-- MIGRATION 030: Auto-Match Tracking
-- =====================================================
-- 
-- Adds a column to track whether a loan was auto-matched
-- This helps distinguish between:
-- - Loans where lender manually accepted
-- - Loans where lender was auto-assigned based on preferences
--
-- For auto-matched loans, lender_signed should only be true
-- after the lender explicitly reviews and funds the loan.
-- =====================================================

-- Add auto_matched column to loans table
ALTER TABLE loans ADD COLUMN IF NOT EXISTS auto_matched BOOLEAN DEFAULT FALSE;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_loans_auto_matched ON loans(auto_matched);

-- Add a comment explaining the column
COMMENT ON COLUMN loans.auto_matched IS 'True if loan was assigned via auto-matching system rather than manual acceptance';
