-- Migration: Trust Score & Social Vouching System
-- The foundation for Feyza's revolutionary credit alternative

-- ============================================
-- TRUST SCORES
-- ============================================

-- Main trust score table (current score for each user)
CREATE TABLE IF NOT EXISTS trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Overall score (0-100)
  score INTEGER NOT NULL DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  score_grade TEXT NOT NULL DEFAULT 'C', -- A+, A, A-, B+, B, B-, C+, C, C-, D, F
  score_label TEXT NOT NULL DEFAULT 'Building Trust', -- Human readable
  
  -- Component scores (each 0-100, weighted to calculate final)
  payment_score INTEGER DEFAULT 50,      -- 40% weight
  completion_score INTEGER DEFAULT 50,   -- 25% weight
  social_score INTEGER DEFAULT 50,       -- 15% weight
  verification_score INTEGER DEFAULT 0,  -- 10% weight
  tenure_score INTEGER DEFAULT 0,        -- 10% weight
  
  -- Stats used for calculation
  total_loans INTEGER DEFAULT 0,
  completed_loans INTEGER DEFAULT 0,
  active_loans INTEGER DEFAULT 0,
  defaulted_loans INTEGER DEFAULT 0,
  
  total_payments INTEGER DEFAULT 0,
  ontime_payments INTEGER DEFAULT 0,
  early_payments INTEGER DEFAULT 0,
  late_payments INTEGER DEFAULT 0,
  missed_payments INTEGER DEFAULT 0,
  
  total_amount_borrowed DECIMAL(12, 2) DEFAULT 0,
  total_amount_repaid DECIMAL(12, 2) DEFAULT 0,
  
  current_streak INTEGER DEFAULT 0, -- Consecutive on-time payments
  best_streak INTEGER DEFAULT 0,
  
  -- Vouch stats
  vouches_received INTEGER DEFAULT 0,
  vouches_given INTEGER DEFAULT 0,
  vouch_defaults INTEGER DEFAULT 0, -- Times someone you vouched for defaulted
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Trust score history (track changes over time)
CREATE TABLE IF NOT EXISTS trust_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  score INTEGER NOT NULL,
  score_grade TEXT NOT NULL,
  
  -- What caused the change
  change_amount INTEGER, -- +5, -10, etc.
  change_reason TEXT,
  
  -- Snapshot of component scores at this time
  payment_score INTEGER,
  completion_score INTEGER,
  social_score INTEGER,
  verification_score INTEGER,
  tenure_score INTEGER,
  
  -- Related entities
  related_loan_id UUID REFERENCES loans(id),
  related_payment_id UUID,
  related_vouch_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust score events (granular log of what affects score)
CREATE TABLE IF NOT EXISTS trust_score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL,
  -- Types: 'payment_ontime', 'payment_early', 'payment_late', 'payment_missed',
  --        'loan_completed', 'loan_defaulted', 'vouch_received', 'vouch_given',
  --        'vouchee_defaulted', 'verification_completed', 'streak_milestone'
  
  score_impact INTEGER NOT NULL DEFAULT 0, -- How much this affected score
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- Related entities
  loan_id UUID REFERENCES loans(id),
  payment_id UUID,
  other_user_id UUID REFERENCES users(id), -- For vouch events
  vouch_id UUID,
  
  -- Additional data
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SOCIAL VOUCHING
-- ============================================

-- Vouches (when one user vouches for another)
CREATE TABLE IF NOT EXISTS vouches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who is vouching for whom
  voucher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Person giving vouch
  vouchee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Person receiving vouch
  
  -- Type of vouch
  vouch_type TEXT NOT NULL DEFAULT 'character',
  -- 'character' = "I trust this person" (no financial commitment)
  -- 'guarantee' = "I'll cover X% if they default" (skin in the game)
  -- 'employment' = "This person works with/for me"
  -- 'family' = "This is my family member"
  
  -- Relationship details
  relationship TEXT NOT NULL, -- 'family', 'friend', 'colleague', 'neighbor', 'business', 'other'
  relationship_details TEXT, -- More specific: 'brother', 'college roommate', etc.
  known_years INTEGER, -- How many years they've known each other
  known_since DATE, -- When they met
  
  -- Personal message
  message TEXT, -- "Maria is one of the most reliable people I know..."
  
  -- For guarantee vouches
  guarantee_percentage INTEGER DEFAULT 0 CHECK (guarantee_percentage >= 0 AND guarantee_percentage <= 100),
  guarantee_max_amount DECIMAL(12, 2) DEFAULT 0,
  guarantee_used DECIMAL(12, 2) DEFAULT 0, -- How much has been claimed
  
  -- Vouch strength (calculated based on voucher's score, relationship, etc.)
  vouch_strength INTEGER DEFAULT 0, -- 0-100
  trust_score_boost INTEGER DEFAULT 0, -- How much this boosts vouchee's score
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'revoked', 'expired', 'claimed'
  
  -- Tracking effectiveness
  loans_active INTEGER DEFAULT 0, -- Loans taken while this vouch is active
  loans_completed INTEGER DEFAULT 0, -- Successfully completed
  loans_defaulted INTEGER DEFAULT 0, -- Defaults that occurred
  
  -- Visibility
  is_public BOOLEAN DEFAULT TRUE, -- Show on profile?
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional expiration
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  
  -- Prevent duplicate active vouches
  UNIQUE(voucher_id, vouchee_id) -- One active vouch per pair
);

-- Vouch requests (asking someone to vouch for you)
CREATE TABLE IF NOT EXISTS vouch_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Who they're asking (can be existing user or email invite)
  requested_user_id UUID REFERENCES users(id),
  requested_email TEXT,
  requested_name TEXT, -- Name for display if not a user yet
  
  -- Request details
  message TEXT, -- Personal message with the request
  suggested_relationship TEXT, -- What relationship to suggest
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired', 'cancelled'
  
  -- Response
  response_message TEXT, -- If they decline, why
  responded_at TIMESTAMPTZ,
  
  -- For accepted requests, link to the vouch
  vouch_id UUID REFERENCES vouches(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Invite token for non-users
  invite_token TEXT UNIQUE
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_trust_scores_user ON trust_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_scores_score ON trust_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_trust_scores_grade ON trust_scores(score_grade);

CREATE INDEX IF NOT EXISTS idx_trust_score_history_user ON trust_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_score_history_created ON trust_score_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trust_score_events_user ON trust_score_events(user_id);
CREATE INDEX IF NOT EXISTS idx_trust_score_events_type ON trust_score_events(event_type);
CREATE INDEX IF NOT EXISTS idx_trust_score_events_created ON trust_score_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vouches_voucher ON vouches(voucher_id);
CREATE INDEX IF NOT EXISTS idx_vouches_vouchee ON vouches(vouchee_id);
CREATE INDEX IF NOT EXISTS idx_vouches_status ON vouches(status);
CREATE INDEX IF NOT EXISTS idx_vouches_active ON vouches(vouchee_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_vouch_requests_requester ON vouch_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_vouch_requests_requested ON vouch_requests(requested_user_id);
CREATE INDEX IF NOT EXISTS idx_vouch_requests_status ON vouch_requests(status);
CREATE INDEX IF NOT EXISTS idx_vouch_requests_token ON vouch_requests(invite_token);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Calculate trust score grade from numeric score
CREATE OR REPLACE FUNCTION get_trust_grade(score INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN score >= 95 THEN 'A+'
    WHEN score >= 90 THEN 'A'
    WHEN score >= 85 THEN 'A-'
    WHEN score >= 80 THEN 'B+'
    WHEN score >= 75 THEN 'B'
    WHEN score >= 70 THEN 'B-'
    WHEN score >= 65 THEN 'C+'
    WHEN score >= 60 THEN 'C'
    WHEN score >= 55 THEN 'C-'
    WHEN score >= 50 THEN 'D+'
    WHEN score >= 45 THEN 'D'
    WHEN score >= 40 THEN 'D-'
    ELSE 'F'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get label for trust score
CREATE OR REPLACE FUNCTION get_trust_label(score INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN score >= 90 THEN 'Exceptional'
    WHEN score >= 80 THEN 'Excellent'
    WHEN score >= 70 THEN 'Very Good'
    WHEN score >= 60 THEN 'Good'
    WHEN score >= 50 THEN 'Building Trust'
    WHEN score >= 40 THEN 'Developing'
    WHEN score >= 30 THEN 'Needs Improvement'
    ELSE 'New'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate vouch strength based on voucher's score and relationship
CREATE OR REPLACE FUNCTION calculate_vouch_strength(
  voucher_score INTEGER,
  relationship TEXT,
  known_years INTEGER,
  vouch_type TEXT,
  guarantee_percentage INTEGER DEFAULT 0
)
RETURNS INTEGER AS $$
DECLARE
  base_strength INTEGER;
  relationship_multiplier DECIMAL;
  tenure_bonus INTEGER;
  guarantee_bonus INTEGER;
  final_strength INTEGER;
BEGIN
  -- Base strength from voucher's trust score (0-40 points)
  base_strength := (voucher_score * 0.4)::INTEGER;
  
  -- Relationship multiplier
  relationship_multiplier := CASE relationship
    WHEN 'family' THEN 1.3
    WHEN 'colleague' THEN 1.2
    WHEN 'friend' THEN 1.1
    WHEN 'business' THEN 1.15
    WHEN 'neighbor' THEN 1.0
    ELSE 0.9
  END;
  
  -- Tenure bonus (up to 20 points for 10+ years)
  tenure_bonus := LEAST(known_years * 2, 20);
  
  -- Guarantee bonus (up to 20 points for 100% guarantee)
  guarantee_bonus := CASE vouch_type
    WHEN 'guarantee' THEN (guarantee_percentage * 0.2)::INTEGER
    ELSE 0
  END;
  
  -- Calculate final strength (cap at 100)
  final_strength := LEAST(
    (base_strength * relationship_multiplier)::INTEGER + tenure_bonus + guarantee_bonus,
    100
  );
  
  RETURN final_strength;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_trust_score_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.score_grade = get_trust_grade(NEW.score);
  NEW.score_label = get_trust_label(NEW.score);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trust_score_update_timestamp
  BEFORE UPDATE ON trust_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_trust_score_timestamp();

-- Auto-calculate vouch strength when vouch is created/updated
CREATE OR REPLACE FUNCTION calculate_vouch_on_save()
RETURNS TRIGGER AS $$
DECLARE
  voucher_score INTEGER;
BEGIN
  -- Get voucher's trust score
  SELECT score INTO voucher_score
  FROM trust_scores
  WHERE user_id = NEW.voucher_id;
  
  -- Default to 50 if no score yet
  voucher_score := COALESCE(voucher_score, 50);
  
  -- Calculate strength
  NEW.vouch_strength := calculate_vouch_strength(
    voucher_score,
    NEW.relationship,
    COALESCE(NEW.known_years, 0),
    NEW.vouch_type,
    COALESCE(NEW.guarantee_percentage, 0)
  );
  
  -- Calculate trust score boost (strength / 10, so max +10 per vouch)
  NEW.trust_score_boost := (NEW.vouch_strength / 10)::INTEGER;
  
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vouch_calculate_strength
  BEFORE INSERT OR UPDATE ON vouches
  FOR EACH ROW
  EXECUTE FUNCTION calculate_vouch_on_save();

-- Create trust score for new users
CREATE OR REPLACE FUNCTION create_trust_score_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO trust_scores (user_id, score, score_grade, score_label)
  VALUES (NEW.id, 50, 'C', 'Building Trust')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_trust_score_on_user_create
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_trust_score_for_user();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouches ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouch_requests ENABLE ROW LEVEL SECURITY;

-- Trust scores: viewable by anyone, only system can update
CREATE POLICY "Trust scores are viewable by authenticated users"
  ON trust_scores FOR SELECT
  TO authenticated
  USING (true);

-- Trust score history: users can see their own
CREATE POLICY "Users can view their own trust score history"
  ON trust_score_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Trust score events: users can see their own
CREATE POLICY "Users can view their own trust score events"
  ON trust_score_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Vouches: public vouches viewable by all, private only by involved parties
CREATE POLICY "Public vouches are viewable by all"
  ON vouches FOR SELECT
  TO authenticated
  USING (is_public = true OR voucher_id = auth.uid() OR vouchee_id = auth.uid());

CREATE POLICY "Users can create vouches"
  ON vouches FOR INSERT
  TO authenticated
  WITH CHECK (voucher_id = auth.uid());

CREATE POLICY "Vouchers can update their vouches"
  ON vouches FOR UPDATE
  TO authenticated
  USING (voucher_id = auth.uid());

-- Vouch requests: involved parties only + token-based access
-- Note: Token-based access is handled by service_role in API,
-- but we add a permissive policy for flexibility

-- Drop existing policies first (if re-running)
DROP POLICY IF EXISTS "Users can view their vouch requests" ON vouch_requests;
DROP POLICY IF EXISTS "Users can create vouch requests" ON vouch_requests;
DROP POLICY IF EXISTS "Users can update their vouch requests" ON vouch_requests;
DROP POLICY IF EXISTS "Anyone can view vouch requests by token" ON vouch_requests;

-- Policy 1: Authenticated users can view requests involving them
CREATE POLICY "Users can view their vouch requests"
  ON vouch_requests FOR SELECT
  TO authenticated
  USING (
    requester_id = auth.uid() 
    OR requested_user_id = auth.uid()
  );

-- Policy 2: Anyone (even unauthenticated) can view by token
-- This allows the /vouch/accept page to work for non-users
CREATE POLICY "Anyone can view vouch requests by token"
  ON vouch_requests FOR SELECT
  TO anon, authenticated
  USING (
    invite_token IS NOT NULL 
    AND status = 'pending'
  );

-- Policy 3: Authenticated users can create requests
CREATE POLICY "Users can create vouch requests"
  ON vouch_requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Policy 4: Both parties can update (accept/decline)
CREATE POLICY "Users can update their vouch requests"
  ON vouch_requests FOR UPDATE
  TO authenticated
  USING (
    requester_id = auth.uid() 
    OR requested_user_id = auth.uid()
  );

-- ============================================
-- SEED TRUST SCORES FOR EXISTING USERS
-- ============================================

-- Create trust scores for all existing users who don't have one
INSERT INTO trust_scores (user_id, score, score_grade, score_label)
SELECT id, 50, 'C', 'Building Trust'
FROM users
WHERE id NOT IN (SELECT user_id FROM trust_scores)
ON CONFLICT (user_id) DO NOTHING;
