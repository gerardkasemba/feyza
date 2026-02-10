-- QUICK FIX: Run this SQL in Supabase to fix vouch requests
-- This creates the table if missing and fixes RLS policies

-- ============================================
-- 1. CREATE TABLE IF NOT EXISTS
-- ============================================

CREATE TABLE IF NOT EXISTS vouch_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_user_id UUID REFERENCES users(id),
  requested_email TEXT,
  requested_name TEXT,
  message TEXT,
  suggested_relationship TEXT,
  status TEXT DEFAULT 'pending',
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  vouch_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  invite_token TEXT UNIQUE
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_vouch_requests_requester ON vouch_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_vouch_requests_requested ON vouch_requests(requested_user_id);
CREATE INDEX IF NOT EXISTS idx_vouch_requests_status ON vouch_requests(status);
CREATE INDEX IF NOT EXISTS idx_vouch_requests_token ON vouch_requests(invite_token);

-- ============================================
-- 3. ENABLE RLS
-- ============================================

ALTER TABLE vouch_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. DROP OLD POLICIES (if they exist)
-- ============================================

DROP POLICY IF EXISTS "Users can view their vouch requests" ON vouch_requests;
DROP POLICY IF EXISTS "Users can create vouch requests" ON vouch_requests;
DROP POLICY IF EXISTS "Users can update their vouch requests" ON vouch_requests;
DROP POLICY IF EXISTS "Anyone can view vouch requests by token" ON vouch_requests;
DROP POLICY IF EXISTS "Service role full access" ON vouch_requests;

-- ============================================
-- 5. CREATE NEW POLICIES
-- ============================================

-- Allow service role full access (for API endpoints)
CREATE POLICY "Service role full access"
  ON vouch_requests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can view their own requests (as requester or recipient)
CREATE POLICY "Users can view their vouch requests"
  ON vouch_requests FOR SELECT
  TO authenticated
  USING (
    requester_id = auth.uid() 
    OR requested_user_id = auth.uid()
  );

-- Anyone can view pending requests by token (for email invite flow)
-- This allows non-users to see the request before signing up
CREATE POLICY "Anyone can view vouch requests by token"
  ON vouch_requests FOR SELECT
  TO anon, authenticated
  USING (
    invite_token IS NOT NULL 
    AND status = 'pending'
  );

-- Authenticated users can create requests
CREATE POLICY "Users can create vouch requests"
  ON vouch_requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Both requester and recipient can update
CREATE POLICY "Users can update their vouch requests"
  ON vouch_requests FOR UPDATE
  TO authenticated
  USING (
    requester_id = auth.uid() 
    OR requested_user_id = auth.uid()
  );

-- ============================================
-- 6. VERIFY
-- ============================================

-- Check table exists
SELECT 'vouch_requests table exists' as status
FROM information_schema.tables 
WHERE table_name = 'vouch_requests';

-- Check policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'vouch_requests';

-- ============================================
-- DONE! Now test:
-- 1. Go to Dashboard
-- 2. Send a vouch request  
-- 3. Check console for token
-- 4. Visit /vouch/accept?token=YOUR_TOKEN
-- ============================================
