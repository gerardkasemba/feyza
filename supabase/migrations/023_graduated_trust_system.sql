-- Migration: Graduated Trust System for Business Lenders
-- Borrowers must complete 3 loans at first_time_borrower_amount before graduating to higher amounts

-- Add first_time_borrower_amount to business_profiles
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS first_time_borrower_amount DECIMAL(12,2) DEFAULT 50;

COMMENT ON COLUMN business_profiles.first_time_borrower_amount IS 'Maximum loan amount for new borrowers. Must complete 3 loans at this amount before graduating to higher amounts.';

-- Create borrower_business_trust table to track per-relationship trust
CREATE TABLE IF NOT EXISTS borrower_business_trust (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Trust tracking
  completed_loan_count INTEGER DEFAULT 0,
  total_amount_borrowed DECIMAL(12,2) DEFAULT 0,
  total_amount_repaid DECIMAL(12,2) DEFAULT 0,
  
  -- Graduation status
  has_graduated BOOLEAN DEFAULT false,
  graduated_at TIMESTAMPTZ,
  
  -- Default tracking
  has_defaulted BOOLEAN DEFAULT false,
  default_count INTEGER DEFAULT 0,
  last_default_at TIMESTAMPTZ,
  
  -- Late payment tracking
  late_payment_count INTEGER DEFAULT 0,
  on_time_payment_count INTEGER DEFAULT 0,
  
  -- Current status
  trust_status TEXT DEFAULT 'new' CHECK (trust_status IN ('new', 'building', 'graduated', 'suspended', 'banned')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint - one record per borrower-business pair
  UNIQUE(borrower_id, business_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_borrower_business_trust_borrower ON borrower_business_trust(borrower_id);
CREATE INDEX IF NOT EXISTS idx_borrower_business_trust_business ON borrower_business_trust(business_id);
CREATE INDEX IF NOT EXISTS idx_borrower_business_trust_status ON borrower_business_trust(trust_status);
CREATE INDEX IF NOT EXISTS idx_borrower_business_trust_graduated ON borrower_business_trust(has_graduated);

-- Function to get or create borrower-business trust record
CREATE OR REPLACE FUNCTION get_or_create_borrower_trust(
  p_borrower_id UUID,
  p_business_id UUID
)
RETURNS borrower_business_trust AS $$
DECLARE
  v_trust borrower_business_trust;
BEGIN
  -- Try to get existing record
  SELECT * INTO v_trust
  FROM borrower_business_trust
  WHERE borrower_id = p_borrower_id AND business_id = p_business_id;
  
  -- If not found, create new record
  IF NOT FOUND THEN
    INSERT INTO borrower_business_trust (borrower_id, business_id)
    VALUES (p_borrower_id, p_business_id)
    RETURNING * INTO v_trust;
  END IF;
  
  RETURN v_trust;
END;
$$ LANGUAGE plpgsql;

-- Function to get max allowed loan amount for a borrower with a business
CREATE OR REPLACE FUNCTION get_max_loan_amount_for_borrower(
  p_borrower_id UUID,
  p_business_id UUID
)
RETURNS TABLE (
  max_amount DECIMAL,
  is_graduated BOOLEAN,
  completed_loans INTEGER,
  loans_until_graduation INTEGER,
  trust_status TEXT,
  first_time_amount DECIMAL,
  standard_max_amount DECIMAL
) AS $$
DECLARE
  v_trust borrower_business_trust;
  v_business business_profiles;
  v_first_time_amount DECIMAL;
  v_max_amount DECIMAL;
  v_loans_until_grad INTEGER;
BEGIN
  -- Get business settings
  SELECT * INTO v_business
  FROM business_profiles
  WHERE id = p_business_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  v_first_time_amount := COALESCE(v_business.first_time_borrower_amount, 50);
  v_max_amount := COALESCE(v_business.max_loan_amount, 5000);
  
  -- Get or create trust record
  SELECT * INTO v_trust
  FROM borrower_business_trust
  WHERE borrower_id = p_borrower_id AND business_id = p_business_id;
  
  -- If no trust record exists, this is a new relationship
  IF NOT FOUND THEN
    v_loans_until_grad := 3;
    RETURN QUERY SELECT 
      v_first_time_amount,
      false,
      0,
      v_loans_until_grad,
      'new'::TEXT,
      v_first_time_amount,
      v_max_amount;
    RETURN;
  END IF;
  
  -- Check if borrower is banned or suspended
  IF v_trust.trust_status IN ('banned', 'suspended') THEN
    RETURN QUERY SELECT 
      0::DECIMAL,
      false,
      v_trust.completed_loan_count,
      0,
      v_trust.trust_status,
      v_first_time_amount,
      v_max_amount;
    RETURN;
  END IF;
  
  -- Calculate loans until graduation
  v_loans_until_grad := GREATEST(0, 3 - v_trust.completed_loan_count);
  
  -- If graduated, return standard max amount
  IF v_trust.has_graduated THEN
    RETURN QUERY SELECT 
      v_max_amount,
      true,
      v_trust.completed_loan_count,
      0,
      v_trust.trust_status,
      v_first_time_amount,
      v_max_amount;
    RETURN;
  END IF;
  
  -- Not graduated yet, return first-time amount
  RETURN QUERY SELECT 
    v_first_time_amount,
    false,
    v_trust.completed_loan_count,
    v_loans_until_grad,
    v_trust.trust_status,
    v_first_time_amount,
    v_max_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to update trust after loan completion
CREATE OR REPLACE FUNCTION update_borrower_trust_on_completion(
  p_borrower_id UUID,
  p_business_id UUID,
  p_loan_amount DECIMAL
)
RETURNS borrower_business_trust AS $$
DECLARE
  v_trust borrower_business_trust;
  v_business business_profiles;
  v_first_time_amount DECIMAL;
BEGIN
  -- Get business settings
  SELECT * INTO v_business
  FROM business_profiles
  WHERE id = p_business_id;
  
  v_first_time_amount := COALESCE(v_business.first_time_borrower_amount, 50);
  
  -- Get or create trust record
  v_trust := get_or_create_borrower_trust(p_borrower_id, p_business_id);
  
  -- Update trust record
  UPDATE borrower_business_trust
  SET 
    completed_loan_count = completed_loan_count + 1,
    total_amount_repaid = total_amount_repaid + p_loan_amount,
    trust_status = CASE 
      WHEN completed_loan_count + 1 >= 3 THEN 'graduated'
      ELSE 'building'
    END,
    has_graduated = CASE 
      WHEN completed_loan_count + 1 >= 3 THEN true
      ELSE false
    END,
    graduated_at = CASE 
      WHEN completed_loan_count + 1 >= 3 AND NOT has_graduated THEN NOW()
      ELSE graduated_at
    END,
    updated_at = NOW()
  WHERE borrower_id = p_borrower_id AND business_id = p_business_id
  RETURNING * INTO v_trust;
  
  RETURN v_trust;
END;
$$ LANGUAGE plpgsql;

-- Function to reset trust on default
CREATE OR REPLACE FUNCTION reset_borrower_trust_on_default(
  p_borrower_id UUID,
  p_business_id UUID
)
RETURNS borrower_business_trust AS $$
DECLARE
  v_trust borrower_business_trust;
BEGIN
  -- Get or create trust record
  v_trust := get_or_create_borrower_trust(p_borrower_id, p_business_id);
  
  -- Reset trust (but keep history)
  UPDATE borrower_business_trust
  SET 
    has_graduated = false,
    graduated_at = NULL,
    trust_status = 'new', -- Reset to new, they start over
    completed_loan_count = 0, -- Reset completed count
    has_defaulted = true,
    default_count = default_count + 1,
    last_default_at = NOW(),
    updated_at = NOW()
  WHERE borrower_id = p_borrower_id AND business_id = p_business_id
  RETURNING * INTO v_trust;
  
  RETURN v_trust;
END;
$$ LANGUAGE plpgsql;

-- Function to ban a borrower from a business
CREATE OR REPLACE FUNCTION ban_borrower_from_business(
  p_borrower_id UUID,
  p_business_id UUID
)
RETURNS borrower_business_trust AS $$
DECLARE
  v_trust borrower_business_trust;
BEGIN
  v_trust := get_or_create_borrower_trust(p_borrower_id, p_business_id);
  
  UPDATE borrower_business_trust
  SET 
    trust_status = 'banned',
    has_graduated = false,
    updated_at = NOW()
  WHERE borrower_id = p_borrower_id AND business_id = p_business_id
  RETURNING * INTO v_trust;
  
  RETURN v_trust;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update trust when loan is completed
CREATE OR REPLACE FUNCTION trigger_update_trust_on_loan_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Only for business lenders
    IF NEW.business_lender_id IS NOT NULL THEN
      PERFORM update_borrower_trust_on_completion(
        NEW.borrower_id,
        NEW.business_lender_id,
        NEW.amount
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_trust_on_loan_complete ON loans;
CREATE TRIGGER tr_update_trust_on_loan_complete
  AFTER UPDATE ON loans
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_trust_on_loan_complete();

-- Trigger to update trust when a new loan is created (track total borrowed)
CREATE OR REPLACE FUNCTION trigger_update_trust_on_loan_create()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for business lenders
  IF NEW.business_lender_id IS NOT NULL THEN
    -- Get or create trust record and update total_amount_borrowed
    PERFORM get_or_create_borrower_trust(NEW.borrower_id, NEW.business_lender_id);
    
    UPDATE borrower_business_trust
    SET 
      total_amount_borrowed = total_amount_borrowed + NEW.amount,
      trust_status = CASE 
        WHEN trust_status = 'new' THEN 'building'
        ELSE trust_status
      END,
      updated_at = NOW()
    WHERE borrower_id = NEW.borrower_id AND business_id = NEW.business_lender_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_trust_on_loan_create ON loans;
CREATE TRIGGER tr_update_trust_on_loan_create
  AFTER INSERT ON loans
  FOR EACH ROW
  WHEN (NEW.status IN ('active', 'pending_disbursement'))
  EXECUTE FUNCTION trigger_update_trust_on_loan_create();

-- Update existing lender_preferences to sync first_time_borrower_limit with business profile
CREATE OR REPLACE FUNCTION sync_first_time_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync to lender_preferences if it exists
  UPDATE lender_preferences
  SET first_time_borrower_limit = NEW.first_time_borrower_amount,
      updated_at = NOW()
  WHERE business_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_first_time_amount ON business_profiles;
CREATE TRIGGER tr_sync_first_time_amount
  AFTER UPDATE OF first_time_borrower_amount ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_first_time_amount();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_borrower_trust_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_borrower_trust_updated_at ON borrower_business_trust;
CREATE TRIGGER tr_borrower_trust_updated_at
  BEFORE UPDATE ON borrower_business_trust
  FOR EACH ROW
  EXECUTE FUNCTION update_borrower_trust_timestamp();

-- Comments for documentation
COMMENT ON TABLE borrower_business_trust IS 'Tracks trust relationship between borrowers and business lenders. Borrowers must complete 3 loans at first_time_borrower_amount before they can borrow larger amounts.';
COMMENT ON COLUMN borrower_business_trust.completed_loan_count IS 'Number of loans fully repaid to this business';
COMMENT ON COLUMN borrower_business_trust.has_graduated IS 'True if borrower has completed 3+ loans and can borrow higher amounts';
COMMENT ON COLUMN borrower_business_trust.trust_status IS 'Current status: new (0 loans), building (1-2 loans), graduated (3+ loans), suspended (temp restriction), banned (permanent)';
