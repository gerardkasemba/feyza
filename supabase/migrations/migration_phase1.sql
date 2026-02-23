-- =============================================================
-- PHASE 1: SIMPLE TRUST TIER SYSTEM
-- Run this once in Supabase SQL Editor
-- =============================================================

-- -------------------------------------------------------------
-- 1. ADD COLUMNS TO users TABLE
-- -------------------------------------------------------------

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS trust_tier          VARCHAR(20)       DEFAULT 'tier_1',
  ADD COLUMN IF NOT EXISTS trust_tier_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vouch_count         INTEGER           DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_vouches_count INTEGER          DEFAULT 0,
  -- kyc_verified_at mirrors verified_at but is the Phase 1 canonical KYC field
  ADD COLUMN IF NOT EXISTS kyc_verified_at     TIMESTAMPTZ;

-- Backfill kyc_verified_at from verified_at for all already-verified users
UPDATE users
SET kyc_verified_at = verified_at
WHERE verification_status = 'verified'
  AND verified_at IS NOT NULL
  AND kyc_verified_at IS NULL;

-- -------------------------------------------------------------
-- 2. ADD COLUMNS TO loans TABLE
-- -------------------------------------------------------------

ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS borrower_trust_tier    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS borrower_vouch_count   INTEGER,
  ADD COLUMN IF NOT EXISTS was_first_time_borrower BOOLEAN DEFAULT FALSE;

-- -------------------------------------------------------------
-- 3. CREATE trust_tiers REFERENCE TABLE
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS trust_tiers (
  tier_id      VARCHAR(20)  PRIMARY KEY,
  tier_name    VARCHAR(50)  NOT NULL,
  tier_number  INTEGER      NOT NULL,
  min_vouches  INTEGER      NOT NULL,
  max_vouches  INTEGER      NOT NULL,
  description  TEXT
);

INSERT INTO trust_tiers (tier_id, tier_name, tier_number, min_vouches, max_vouches, description)
VALUES
  ('tier_1', 'Low Trust',         1,  0,   2,   '0–2 vouches'),
  ('tier_2', 'Building Trust',    2,  3,   5,   '3–5 vouches'),
  ('tier_3', 'Established Trust', 3,  6,  10,   '6–10 vouches'),
  ('tier_4', 'High Trust',        4, 11, 999,   '11+ vouches')
ON CONFLICT (tier_id) DO NOTHING;

-- -------------------------------------------------------------
-- 4. CREATE lender_tier_policies TABLE
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lender_tier_policies (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier_id         VARCHAR(20)  NOT NULL REFERENCES trust_tiers(tier_id),
  interest_rate   DECIMAL(5,2) NOT NULL,
  max_loan_amount INTEGER      NOT NULL,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (lender_id, tier_id)
);

-- updated_at trigger (matches pattern used across the rest of the schema)
CREATE OR REPLACE FUNCTION update_lender_tier_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lender_tier_policies_updated_at ON lender_tier_policies;
CREATE TRIGGER update_lender_tier_policies_updated_at
  BEFORE UPDATE ON lender_tier_policies
  FOR EACH ROW EXECUTE FUNCTION update_lender_tier_policies_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lender_tier_policies_lender ON lender_tier_policies(lender_id);
CREATE INDEX IF NOT EXISTS idx_lender_tier_policies_tier   ON lender_tier_policies(tier_id);
CREATE INDEX IF NOT EXISTS idx_lender_tier_policies_active ON lender_tier_policies(tier_id, is_active) WHERE is_active = TRUE;

-- -------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- -------------------------------------------------------------

-- trust_tiers: public read, no writes from clients
ALTER TABLE trust_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trust_tiers_read" ON trust_tiers;
CREATE POLICY "trust_tiers_read" ON trust_tiers
  FOR SELECT USING (TRUE);

-- lender_tier_policies: lenders manage their own, everyone can read active rows
ALTER TABLE lender_tier_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ltp_lender_manage" ON lender_tier_policies;
CREATE POLICY "ltp_lender_manage" ON lender_tier_policies
  FOR ALL USING (auth.uid() = lender_id);

DROP POLICY IF EXISTS "ltp_borrower_read" ON lender_tier_policies;
CREATE POLICY "ltp_borrower_read" ON lender_tier_policies
  FOR SELECT USING (is_active = TRUE);

-- -------------------------------------------------------------
-- 6. FIX notifications TYPE CONSTRAINT
--    The existing constraint is missing many types the code already uses.
-- -------------------------------------------------------------

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type = ANY (ARRAY[
      'reminder',
      'payment_received',
      'payment_confirmed',
      'payment_confirmation_needed',
      'payment_disputed',
      'payment_reminder',
      'payment_retry_success',
      'payment_retry_failed',
      'loan_request',
      'loan_accepted',
      'loan_declined',
      'loan_cancelled',
      'loan_created',
      'loan_match_offer',
      'contract_signed',
      'paypal_required',
      'bank_required',
      'funds_sent',
      'funds_disbursed',
      'transfer_completed',
      'transfer_failed',
      'account_blocked',
      'vouch_received'
    ])
  );

-- -------------------------------------------------------------
-- 7. INDEXES on users for new columns
-- -------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_users_trust_tier  ON users(trust_tier);
CREATE INDEX IF NOT EXISTS idx_users_vouch_count ON users(vouch_count);
