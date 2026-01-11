-- Migration: Lender Preferences & Auto-Matching System
-- Run this in your Supabase SQL Editor

-- =====================================================
-- LENDER PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.lender_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  
  -- One of user_id or business_id must be set
  CONSTRAINT lender_type_check CHECK (
    (user_id IS NOT NULL AND business_id IS NULL) OR 
    (user_id IS NULL AND business_id IS NOT NULL)
  ),
  
  -- Lending Preferences
  is_active BOOLEAN DEFAULT TRUE, -- Are they accepting new loans?
  auto_accept BOOLEAN DEFAULT FALSE, -- Auto-accept matching loans?
  
  -- Amount Range
  min_amount DECIMAL(12, 2) DEFAULT 50,
  max_amount DECIMAL(12, 2) DEFAULT 5000,
  preferred_currency TEXT DEFAULT 'USD',
  
  -- Interest Rate
  interest_rate DECIMAL(5, 2) DEFAULT 10, -- Annual %
  interest_type TEXT DEFAULT 'simple' CHECK (interest_type IN ('simple', 'compound')),
  
  -- Geographic Preferences (JSON array of country codes)
  countries JSONB DEFAULT '[]'::jsonb, -- e.g., ["KE", "UG", "TZ", "NG"]
  
  -- Borrower Requirements
  min_borrower_rating TEXT DEFAULT 'neutral' 
    CHECK (min_borrower_rating IN ('great', 'good', 'neutral', 'poor', 'bad', 'worst')),
  require_verified_borrower BOOLEAN DEFAULT FALSE,
  
  -- Loan Terms
  min_term_weeks INTEGER DEFAULT 1,
  max_term_weeks INTEGER DEFAULT 52,
  
  -- Capital Pool (how much they have available to lend)
  capital_pool DECIMAL(12, 2) DEFAULT 0,
  capital_reserved DECIMAL(12, 2) DEFAULT 0, -- Amount in pending matches
  
  -- Notification Preferences
  notify_on_match BOOLEAN DEFAULT TRUE,
  notify_email BOOLEAN DEFAULT TRUE,
  notify_sms BOOLEAN DEFAULT FALSE,
  
  -- Stats for scoring
  total_loans_funded INTEGER DEFAULT 0,
  total_amount_funded DECIMAL(12, 2) DEFAULT 0,
  acceptance_rate DECIMAL(5, 2) DEFAULT 100, -- % of offered loans accepted
  avg_response_time_hours DECIMAL(10, 2), -- Average time to respond
  last_loan_assigned_at TIMESTAMPTZ, -- For rotation scoring
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint - one preference per lender
  UNIQUE(user_id),
  UNIQUE(business_id)
);

-- =====================================================
-- LOAN MATCHES TABLE (Track matching attempts)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.loan_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  
  -- Lender (one of these)
  lender_user_id UUID REFERENCES public.users(id),
  lender_business_id UUID REFERENCES public.business_profiles(id),
  
  -- Match Details
  match_score DECIMAL(5, 2), -- 0-100 score
  match_rank INTEGER, -- 1, 2, 3... in order of preference
  
  -- Status: pending, accepted, declined, expired, auto_accepted
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'auto_accepted', 'skipped')),
  
  -- Timing
  offered_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  responded_at TIMESTAMPTZ,
  
  -- Auto-accept
  was_auto_accepted BOOLEAN DEFAULT FALSE,
  
  -- Reason for decline/skip (optional)
  decline_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_lender_prefs_user_id ON public.lender_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_lender_prefs_business_id ON public.lender_preferences(business_id);
CREATE INDEX IF NOT EXISTS idx_lender_prefs_active ON public.lender_preferences(is_active);
CREATE INDEX IF NOT EXISTS idx_lender_prefs_countries ON public.lender_preferences USING GIN (countries);

CREATE INDEX IF NOT EXISTS idx_loan_matches_loan_id ON public.loan_matches(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_matches_lender_user ON public.loan_matches(lender_user_id);
CREATE INDEX IF NOT EXISTS idx_loan_matches_lender_business ON public.loan_matches(lender_business_id);
CREATE INDEX IF NOT EXISTS idx_loan_matches_status ON public.loan_matches(status);

-- =====================================================
-- ADD MATCHING FIELDS TO LOANS TABLE
-- =====================================================

ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS match_status TEXT 
  DEFAULT 'pending' CHECK (match_status IN ('pending', 'matching', 'matched', 'no_match', 'manual'));
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS match_attempts INTEGER DEFAULT 0;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS current_match_id UUID REFERENCES public.loan_matches(id);

-- =====================================================
-- FUNCTION: Calculate Match Score
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_match_score(
  p_lender_prefs lender_preferences,
  p_loan loans,
  p_borrower_rating TEXT,
  p_borrower_verified BOOLEAN
) RETURNS DECIMAL AS $$
DECLARE
  fit_score DECIMAL := 0;
  capacity_score DECIMAL := 0;
  rotation_score DECIMAL := 0;
  performance_score DECIMAL := 0;
  total_score DECIMAL := 0;
  rating_rank INTEGER;
  min_rating_rank INTEGER;
  days_since_last_loan DECIMAL;
  available_capital DECIMAL;
BEGIN
  -- Rating rank mapping (higher = better)
  rating_rank := CASE p_borrower_rating
    WHEN 'great' THEN 6
    WHEN 'good' THEN 5
    WHEN 'neutral' THEN 4
    WHEN 'poor' THEN 3
    WHEN 'bad' THEN 2
    WHEN 'worst' THEN 1
    ELSE 4
  END;
  
  min_rating_rank := CASE p_lender_prefs.min_borrower_rating
    WHEN 'great' THEN 6
    WHEN 'good' THEN 5
    WHEN 'neutral' THEN 4
    WHEN 'poor' THEN 3
    WHEN 'bad' THEN 2
    WHEN 'worst' THEN 1
    ELSE 4
  END;
  
  -- 1. FIT SCORE (35%) - How well does request match preferences?
  -- Amount fit (0-100)
  IF p_loan.amount >= p_lender_prefs.min_amount AND p_loan.amount <= p_lender_prefs.max_amount THEN
    fit_score := fit_score + 40;
  ELSE
    RETURN 0; -- Disqualify if outside range
  END IF;
  
  -- Rating fit (0-30)
  IF rating_rank >= min_rating_rank THEN
    fit_score := fit_score + 30;
  ELSE
    RETURN 0; -- Disqualify if below min rating
  END IF;
  
  -- Verification fit (0-30)
  IF p_lender_prefs.require_verified_borrower AND NOT COALESCE(p_borrower_verified, FALSE) THEN
    RETURN 0; -- Disqualify if verification required but not verified
  END IF;
  fit_score := fit_score + 30;
  
  -- 2. CAPACITY SCORE (25%) - Do they have the capital?
  available_capital := COALESCE(p_lender_prefs.capital_pool, 0) - COALESCE(p_lender_prefs.capital_reserved, 0);
  IF available_capital >= p_loan.amount THEN
    capacity_score := 100;
  ELSIF available_capital > 0 THEN
    capacity_score := (available_capital / p_loan.amount) * 100;
  ELSE
    RETURN 0; -- Disqualify if no capital
  END IF;
  
  -- 3. ROTATION SCORE (25%) - Fair rotation for idle lenders
  IF p_lender_prefs.last_loan_assigned_at IS NULL THEN
    rotation_score := 100; -- Never had a loan, highest priority
  ELSE
    days_since_last_loan := EXTRACT(EPOCH FROM (NOW() - p_lender_prefs.last_loan_assigned_at)) / 86400;
    rotation_score := LEAST(100, days_since_last_loan * 10); -- 10 points per day, max 100
  END IF;
  
  -- 4. PERFORMANCE SCORE (15%) - Good lenders get rewarded
  performance_score := COALESCE(p_lender_prefs.acceptance_rate, 100);
  
  -- Calculate weighted total
  total_score := (fit_score * 0.35) + (capacity_score * 0.25) + (rotation_score * 0.25) + (performance_score * 0.15);
  
  RETURN ROUND(total_score, 2);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Find Matching Lenders
-- =====================================================

CREATE OR REPLACE FUNCTION find_matching_lenders(
  p_loan_id UUID,
  p_limit INTEGER DEFAULT 5
) RETURNS TABLE (
  lender_user_id UUID,
  lender_business_id UUID,
  match_score DECIMAL,
  auto_accept BOOLEAN,
  interest_rate DECIMAL,
  lender_name TEXT
) AS $$
DECLARE
  v_loan loans%ROWTYPE;
  v_borrower_rating TEXT;
  v_borrower_verified BOOLEAN;
  v_recipient_country TEXT;
BEGIN
  -- Get loan details
  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id;
  
  IF v_loan IS NULL THEN
    RETURN;
  END IF;
  
  -- Get borrower details
  SELECT 
    COALESCE(u.borrower_rating, 'neutral'),
    COALESCE(u.verification_status = 'verified', FALSE)
  INTO v_borrower_rating, v_borrower_verified
  FROM users u WHERE u.id = v_loan.borrower_id;
  
  -- Get recipient country from loan
  v_recipient_country := COALESCE(v_loan.recipient_country, 'XX');
  
  -- Find matching lenders
  RETURN QUERY
  SELECT 
    lp.user_id AS lender_user_id,
    lp.business_id AS lender_business_id,
    calculate_match_score(lp, v_loan, v_borrower_rating, v_borrower_verified) AS match_score,
    lp.auto_accept,
    lp.interest_rate,
    COALESCE(u.full_name, bp.business_name, 'Unknown') AS lender_name
  FROM lender_preferences lp
  LEFT JOIN users u ON lp.user_id = u.id
  LEFT JOIN business_profiles bp ON lp.business_id = bp.id
  WHERE 
    lp.is_active = TRUE
    AND (
      lp.countries = '[]'::jsonb -- Empty = all countries
      OR lp.countries ? v_recipient_country -- Contains country code
    )
    AND calculate_match_score(lp, v_loan, v_borrower_rating, v_borrower_verified) > 0
  ORDER BY match_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Update timestamps
-- =====================================================

CREATE OR REPLACE FUNCTION update_lender_prefs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lender_prefs_timestamp ON lender_preferences;
CREATE TRIGGER trigger_lender_prefs_timestamp
  BEFORE UPDATE ON lender_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_lender_prefs_timestamp();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.lender_preferences IS 'Lender settings for auto-matching system';
COMMENT ON TABLE public.loan_matches IS 'Track loan matching attempts and responses';
COMMENT ON FUNCTION calculate_match_score IS 'Calculate match score between lender and loan request';
COMMENT ON FUNCTION find_matching_lenders IS 'Find and rank matching lenders for a loan';
