-- Migration: Payment Retry & Borrower Blocking System
-- Description: Adds retry tracking for failed payments and borrower blocking for defaults

-- ============================================
-- 1. ADD RETRY TRACKING TO PAYMENT_SCHEDULE
-- ============================================

-- Retry count (max 3 before blocking)
ALTER TABLE payment_schedule ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- When was the last retry attempted
ALTER TABLE payment_schedule ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ;

-- When should we retry next (null if no retry scheduled)
ALTER TABLE payment_schedule ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- History of retry attempts: [{attempted_at, error, provider_response}]
ALTER TABLE payment_schedule ADD COLUMN IF NOT EXISTS retry_history JSONB DEFAULT '[]';

-- Mark if this payment caused borrower to be blocked
ALTER TABLE payment_schedule ADD COLUMN IF NOT EXISTS caused_block BOOLEAN DEFAULT FALSE;

-- ============================================
-- 2. ADD BLOCKING FIELDS TO USERS TABLE
-- ============================================

-- Is the borrower currently blocked from requesting loans
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- When were they blocked
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

-- Why were they blocked
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- When did they clear their debt (starts 90-day restriction)
ALTER TABLE users ADD COLUMN IF NOT EXISTS debt_cleared_at TIMESTAMPTZ;

-- When does the 90-day restriction end
ALTER TABLE users ADD COLUMN IF NOT EXISTS restriction_ends_at TIMESTAMPTZ;

-- Lifetime count of defaults (for lender visibility)
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_count INTEGER DEFAULT 0;

-- Previous rating before default (to potentially restore partial progress)
ALTER TABLE users ADD COLUMN IF NOT EXISTS pre_default_rating TEXT;

-- ============================================
-- 3. CREATE BORROWER_BLOCKS TABLE FOR HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS borrower_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  loan_id UUID REFERENCES loans(id),
  payment_id UUID REFERENCES payment_schedule(id),
  
  -- Block details
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_reason TEXT NOT NULL,
  total_debt_at_block DECIMAL(12,2),
  
  -- Resolution
  debt_cleared_at TIMESTAMPTZ,
  restriction_ends_at TIMESTAMPTZ,
  restriction_lifted_at TIMESTAMPTZ,
  
  -- Status: active, debt_cleared, restriction_ended
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_borrower_blocks_user_id ON borrower_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_borrower_blocks_status ON borrower_blocks(status);

-- ============================================
-- 4. CREATE PAYMENT_RETRY_LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payment_retry_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payment_schedule(id),
  loan_id UUID NOT NULL REFERENCES loans(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Retry details
  retry_number INTEGER NOT NULL, -- 1, 2, or 3
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Result
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  provider_response JSONB,
  
  -- Next steps
  next_retry_at TIMESTAMPTZ,
  will_block_on_failure BOOLEAN DEFAULT FALSE, -- true if this is retry #3
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_retry_log_payment_id ON payment_retry_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_retry_log_user_id ON payment_retry_log(user_id);

-- ============================================
-- 5. ADD TRIGGER TO UPDATE updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_borrower_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS borrower_blocks_updated_at ON borrower_blocks;
CREATE TRIGGER borrower_blocks_updated_at
  BEFORE UPDATE ON borrower_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_borrower_blocks_updated_at();

-- ============================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN payment_schedule.retry_count IS 'Number of retry attempts (max 3 before blocking borrower)';
COMMENT ON COLUMN payment_schedule.next_retry_at IS 'Scheduled time for next retry attempt (3 days after last failure)';
COMMENT ON COLUMN payment_schedule.retry_history IS 'JSON array of retry attempt details';
COMMENT ON COLUMN payment_schedule.caused_block IS 'True if this payment failure caused the borrower to be blocked';

COMMENT ON COLUMN users.is_blocked IS 'True if borrower is blocked from requesting new loans';
COMMENT ON COLUMN users.blocked_at IS 'When the borrower was blocked';
COMMENT ON COLUMN users.debt_cleared_at IS 'When the borrower cleared their debt (starts 90-day restriction)';
COMMENT ON COLUMN users.restriction_ends_at IS 'When the 90-day post-default restriction ends';
COMMENT ON COLUMN users.default_count IS 'Lifetime count of payment defaults';
COMMENT ON COLUMN users.pre_default_rating IS 'Borrower rating before the default occurred';

COMMENT ON TABLE borrower_blocks IS 'History of borrower blocks due to payment defaults';
COMMENT ON TABLE payment_retry_log IS 'Log of all payment retry attempts';
