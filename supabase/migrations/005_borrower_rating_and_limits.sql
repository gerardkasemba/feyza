-- Migration: Add borrower rating system and borrowing limits
-- Run this in your Supabase SQL Editor

-- =====================================================
-- BORROWER RATING SYSTEM
-- =====================================================

-- Rating: great, good, neutral, poor, bad, worst
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS borrower_rating TEXT DEFAULT 'neutral' CHECK (borrower_rating IN ('great', 'good', 'neutral', 'poor', 'bad', 'worst'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS borrower_rating_updated_at TIMESTAMPTZ;

-- Payment statistics for calculating rating
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_loans_completed INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_payments_made INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS payments_on_time INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS payments_early INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS payments_late INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS payments_missed INTEGER DEFAULT 0;

-- =====================================================
-- BORROWING LIMITS & POWER SYSTEM
-- =====================================================

-- Borrowing tier: 1 = $150, 2 = $300, 3 = $600, 4 = $1200, 5 = $2000, 6 = unlimited
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS borrowing_tier INTEGER DEFAULT 1;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS max_borrowing_amount DECIMAL(12, 2) DEFAULT 150.00;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS loans_at_current_tier INTEGER DEFAULT 0; -- How many loans completed at this tier
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_amount_borrowed DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_amount_repaid DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_outstanding_amount DECIMAL(12, 2) DEFAULT 0;

-- Track individual payment timing for rating calculation
ALTER TABLE public.payment_schedule ADD COLUMN IF NOT EXISTS paid_days_diff INTEGER; -- negative = early, 0 = on time, positive = late
ALTER TABLE public.payment_schedule ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE public.payment_schedule ADD COLUMN IF NOT EXISTS overdue_reminder_sent_at TIMESTAMPTZ;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_borrower_rating ON public.users(borrower_rating);
CREATE INDEX IF NOT EXISTS idx_users_borrowing_tier ON public.users(borrowing_tier);
CREATE INDEX IF NOT EXISTS idx_payment_schedule_status ON public.payment_schedule(status);
CREATE INDEX IF NOT EXISTS idx_payment_schedule_due_date ON public.payment_schedule(due_date);

-- =====================================================
-- FUNCTION: Calculate borrower rating
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_borrower_rating(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  total_payments INTEGER;
  on_time_count INTEGER;
  early_count INTEGER;
  late_count INTEGER;
  missed_count INTEGER;
  on_time_ratio DECIMAL;
  early_ratio DECIMAL;
  late_ratio DECIMAL;
  missed_ratio DECIMAL;
  rating TEXT;
BEGIN
  -- Get user's payment stats
  SELECT 
    COALESCE(total_payments_made, 0),
    COALESCE(payments_on_time, 0),
    COALESCE(payments_early, 0),
    COALESCE(payments_late, 0),
    COALESCE(payments_missed, 0)
  INTO total_payments, on_time_count, early_count, late_count, missed_count
  FROM users WHERE id = user_id_param;

  -- If no payments yet, return neutral
  IF total_payments = 0 THEN
    RETURN 'neutral';
  END IF;

  -- Calculate ratios
  on_time_ratio := on_time_count::DECIMAL / total_payments;
  early_ratio := early_count::DECIMAL / total_payments;
  late_ratio := late_count::DECIMAL / total_payments;
  missed_ratio := missed_count::DECIMAL / total_payments;

  -- Determine rating
  -- Great: Mostly early payments (>50% early)
  IF early_ratio > 0.5 THEN
    rating := 'great';
  -- Good: Mostly on-time or early (>80% on-time + early)
  ELSIF (on_time_ratio + early_ratio) > 0.8 THEN
    rating := 'good';
  -- Poor: Mix of paid and missed (30-50% late or missed)
  ELSIF (late_ratio + missed_ratio) BETWEEN 0.3 AND 0.5 THEN
    rating := 'poor';
  -- Bad: Mostly late (>50% late but some payments)
  ELSIF late_ratio > 0.5 THEN
    rating := 'bad';
  -- Worst: Never pays (>70% missed)
  ELSIF missed_ratio > 0.7 THEN
    rating := 'worst';
  -- Neutral: New or mixed
  ELSE
    rating := 'neutral';
  END IF;

  -- Update user rating
  UPDATE users 
  SET borrower_rating = rating, borrower_rating_updated_at = NOW()
  WHERE id = user_id_param;

  RETURN rating;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Calculate max borrowing amount
-- =====================================================

CREATE OR REPLACE FUNCTION get_max_borrowing_amount(user_id_param UUID)
RETURNS DECIMAL AS $$
DECLARE
  user_record RECORD;
  tier_amount DECIMAL;
BEGIN
  SELECT * INTO user_record FROM users WHERE id = user_id_param;
  
  -- Tier amounts: 1=$150, 2=$300, 3=$600, 4=$1200, 5=$2000, 6=unlimited (return 999999)
  CASE user_record.borrowing_tier
    WHEN 1 THEN tier_amount := 150;
    WHEN 2 THEN tier_amount := 300;
    WHEN 3 THEN tier_amount := 600;
    WHEN 4 THEN tier_amount := 1200;
    WHEN 5 THEN tier_amount := 2000;
    WHEN 6 THEN tier_amount := 999999; -- Unlimited
    ELSE tier_amount := 150;
  END CASE;

  RETURN tier_amount;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Check if user can borrow
-- =====================================================

CREATE OR REPLACE FUNCTION can_user_borrow(user_id_param UUID, requested_amount DECIMAL)
RETURNS TABLE(can_borrow BOOLEAN, reason TEXT, max_allowed DECIMAL) AS $$
DECLARE
  user_record RECORD;
  active_loans_amount DECIMAL;
  max_amount DECIMAL;
  required_paid_percentage DECIMAL;
BEGIN
  SELECT * INTO user_record FROM users WHERE id = user_id_param;
  
  -- Get current outstanding amount from active loans
  SELECT COALESCE(SUM(amount_remaining), 0) INTO active_loans_amount
  FROM loans 
  WHERE borrower_id = user_id_param AND status = 'active';

  -- Get max borrowing amount for user's tier
  max_amount := get_max_borrowing_amount(user_id_param);

  -- Rule: If user has tier 6 (unlimited) but has loans >= $2000, must pay 75% first
  IF user_record.borrowing_tier >= 5 AND active_loans_amount >= 2000 THEN
    -- Check if they've paid at least 75%
    SELECT COALESCE(
      (SELECT SUM(l.amount_paid) / SUM(l.amount) 
       FROM loans l 
       WHERE l.borrower_id = user_id_param AND l.status = 'active'),
      0
    ) INTO required_paid_percentage;
    
    IF required_paid_percentage < 0.75 THEN
      RETURN QUERY SELECT FALSE, 'You must pay at least 75% of your current loans before applying for a new one.', 0::DECIMAL;
      RETURN;
    END IF;
  END IF;

  -- Check if requested amount exceeds tier limit
  IF requested_amount > max_amount THEN
    RETURN QUERY SELECT FALSE, 'Requested amount exceeds your current borrowing limit.', max_amount;
    RETURN;
  END IF;

  -- Check if total would exceed limit (for lower tiers)
  IF user_record.borrowing_tier < 6 AND (active_loans_amount + requested_amount) > max_amount THEN
    RETURN QUERY SELECT FALSE, 'Total outstanding amount would exceed your borrowing limit.', max_amount - active_loans_amount;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, 'OK', max_amount;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Upgrade borrowing tier
-- =====================================================

CREATE OR REPLACE FUNCTION check_and_upgrade_borrowing_tier(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  user_record RECORD;
  new_tier INTEGER;
  loans_needed INTEGER;
BEGIN
  SELECT * INTO user_record FROM users WHERE id = user_id_param;
  
  new_tier := user_record.borrowing_tier;
  
  -- Tier upgrades require 3 fully paid loans at current tier
  -- Except tier 5->6 requires paying off a $2000 loan
  IF user_record.loans_at_current_tier >= 3 THEN
    IF user_record.borrowing_tier < 5 THEN
      -- Double the tier
      new_tier := user_record.borrowing_tier + 1;
      
      -- Update user
      UPDATE users SET 
        borrowing_tier = new_tier,
        max_borrowing_amount = get_max_borrowing_amount(user_id_param),
        loans_at_current_tier = 0
      WHERE id = user_id_param;
    END IF;
  END IF;

  -- Special case: Tier 5 -> 6 (unlimited) requires completing a $2000 loan
  IF user_record.borrowing_tier = 5 THEN
    IF EXISTS (
      SELECT 1 FROM loans 
      WHERE borrower_id = user_id_param 
      AND amount >= 2000 
      AND status = 'completed'
    ) THEN
      UPDATE users SET 
        borrowing_tier = 6,
        max_borrowing_amount = 999999,
        loans_at_current_tier = 0
      WHERE id = user_id_param;
      new_tier := 6;
    END IF;
  END IF;

  RETURN new_tier;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN public.users.borrower_rating IS 'Rating based on payment behavior: great, good, neutral, poor, bad, worst';
COMMENT ON COLUMN public.users.borrowing_tier IS 'Borrowing tier: 1=$150, 2=$300, 3=$600, 4=$1200, 5=$2000, 6=unlimited';
COMMENT ON COLUMN public.users.loans_at_current_tier IS 'Number of loans completed at current tier (need 3 to upgrade)';
COMMENT ON FUNCTION calculate_borrower_rating IS 'Calculates and updates borrower rating based on payment history';
COMMENT ON FUNCTION can_user_borrow IS 'Checks if user can borrow a specific amount based on tier and outstanding loans';
