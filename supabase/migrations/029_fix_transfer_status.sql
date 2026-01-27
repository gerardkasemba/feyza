-- =====================================================
-- MIGRATION 029: Fix Transfer Status Values
-- =====================================================
-- 
-- Problem: The transfers table status column uses 'processed' but the
-- check constraint (if applied) only allows 'completed'. Also Dwolla
-- webhook was setting 'processed' instead of 'completed'.
--
-- This migration:
-- 1. Updates any existing 'processed' statuses to 'completed'
-- 2. Drops and recreates the check constraint to include both values
-- =====================================================

-- Step 1: Update any existing 'processed' statuses to 'completed'
UPDATE transfers SET status = 'completed' WHERE status = 'processed';

-- Step 2: Drop existing check constraint if it exists
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS transfers_status_check;

-- Step 3: Add new check constraint that includes 'completed' as the correct value
-- Also keeping 'processed' for backwards compatibility with any code that might set it
ALTER TABLE transfers ADD CONSTRAINT transfers_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'processed', 'failed', 'cancelled'));

-- Step 4: Create a trigger to automatically convert 'processed' to 'completed'
-- This ensures any code that still uses 'processed' will work
CREATE OR REPLACE FUNCTION normalize_transfer_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'processed' THEN
    NEW.status := 'completed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_normalize_transfer_status ON transfers;
CREATE TRIGGER tr_normalize_transfer_status
  BEFORE INSERT OR UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION normalize_transfer_status();

-- Verify the fix
DO $$
DECLARE
  processed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO processed_count FROM transfers WHERE status = 'processed';
  IF processed_count > 0 THEN
    RAISE NOTICE 'Warning: Still have % transfers with status=processed', processed_count;
  ELSE
    RAISE NOTICE 'Success: All transfers now use completed status';
  END IF;
END $$;
