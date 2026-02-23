-- ============================================================
-- Patch 6 Migration: Fix vouch_strength calculation
-- ============================================================
-- The existing DB trigger calculate_vouch_on_save() is a stub
-- that does nothing. Patch 6 computes vouch_strength in
-- application code (VouchService.createVouch), so we only
-- need to ensure existing rows get a sensible default and
-- the stub trigger doesn't overwrite the app-computed value.
--
-- Note: for EXISTING vouches (all 0), we backfill with a
-- formula that approximates the new app logic using known_years
-- and vouch_type. For new vouches the app will write the real value.

-- Step 1: Drop the stub trigger so it no longer fires on INSERT
DROP TRIGGER IF EXISTS vouch_calculate_strength ON vouches;

-- Step 2: Backfill existing vouches with a basic strength estimate
-- (1 = baseline tier_1 character vouch, up to 5 for guarantee + years)
UPDATE vouches
SET vouch_strength = GREATEST(1, LEAST(10,
  1 +
  CASE vouch_type
    WHEN 'guarantee'   THEN 2
    WHEN 'family'      THEN 1
    WHEN 'employment'  THEN 1
    ELSE 0
  END +
  CASE
    WHEN COALESCE(known_years, 0) >= 10 THEN 2
    WHEN COALESCE(known_years, 0) >= 5  THEN 1
    ELSE 0
  END
)),
trust_score_boost = CASE
  WHEN GREATEST(1, LEAST(10, 1 + CASE vouch_type WHEN 'guarantee' THEN 2 WHEN 'family' THEN 1 WHEN 'employment' THEN 1 ELSE 0 END + CASE WHEN COALESCE(known_years,0) >= 10 THEN 2 WHEN COALESCE(known_years,0) >= 5 THEN 1 ELSE 0 END)) >= 9 THEN 12
  WHEN GREATEST(1, LEAST(10, 1 + CASE vouch_type WHEN 'guarantee' THEN 2 WHEN 'family' THEN 1 WHEN 'employment' THEN 1 ELSE 0 END + CASE WHEN COALESCE(known_years,0) >= 10 THEN 2 WHEN COALESCE(known_years,0) >= 5 THEN 1 ELSE 0 END)) >= 7 THEN 8
  WHEN GREATEST(1, LEAST(10, 1 + CASE vouch_type WHEN 'guarantee' THEN 2 WHEN 'family' THEN 1 WHEN 'employment' THEN 1 ELSE 0 END + CASE WHEN COALESCE(known_years,0) >= 10 THEN 2 WHEN COALESCE(known_years,0) >= 5 THEN 1 ELSE 0 END)) >= 4 THEN 5
  ELSE 3
END
WHERE vouch_strength = 0 OR vouch_strength IS NULL;

-- Step 3: Remove the old stub function (safe to drop since trigger is gone)
DROP FUNCTION IF EXISTS calculate_vouch_on_save() CASCADE;

-- Done. New vouches will have vouch_strength written by VouchService.createVouch().
