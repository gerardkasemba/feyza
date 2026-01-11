-- Migration: Agent Dashboard and Disbursement Management
-- Run this in your Supabase SQL Editor

-- =====================================================
-- AGENTS TABLE (Company staff who handle disbursements)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id), -- Optional: if agent has a user account
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'agent' CHECK (role IN ('agent', 'supervisor', 'admin')),
  -- Location/Region assignment
  country TEXT,
  region TEXT,
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DISBURSEMENTS TABLE (Track money going to recipients)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  
  -- Disbursement Details
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  local_amount DECIMAL(12, 2), -- Amount in local currency
  local_currency TEXT,
  exchange_rate DECIMAL(12, 6),
  
  -- Method: mobile_money, bank_transfer, cash_pickup
  disbursement_method TEXT NOT NULL,
  
  -- Mobile Money Details
  mobile_provider TEXT,
  mobile_number TEXT,
  mobile_name TEXT,
  
  -- Bank Transfer Details  
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_branch TEXT,
  bank_swift_code TEXT,
  
  -- Cash Pickup Details
  pickup_location TEXT,
  pickup_code TEXT, -- Unique code for recipient to collect cash
  pickup_expires_at TIMESTAMPTZ, -- When pickup code expires (but we hold cash indefinitely)
  
  -- Recipient Details
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT,
  recipient_id_type TEXT,
  recipient_id_number TEXT,
  recipient_country TEXT,
  
  -- Status: pending, processing, ready_for_pickup, completed, failed
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready_for_pickup', 'completed', 'failed', 'on_hold')),
  
  -- Agent handling this disbursement
  assigned_agent_id UUID REFERENCES public.agents(id),
  processed_by_agent_id UUID REFERENCES public.agents(id),
  
  -- Verification
  recipient_verified BOOLEAN DEFAULT FALSE,
  recipient_verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  
  -- Completion
  completed_at TIMESTAMPTZ,
  completion_proof_url TEXT, -- Photo/receipt proof
  completion_notes TEXT,
  
  -- For cash pickup reminders
  last_reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DISBURSEMENT HISTORY (Audit trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.disbursement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disbursement_id UUID NOT NULL REFERENCES public.disbursements(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- created, assigned, verified, processing, completed, failed, reminder_sent
  performed_by UUID, -- agent_id or null for system actions
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_disbursements_loan_id ON public.disbursements(loan_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_status ON public.disbursements(status);
CREATE INDEX IF NOT EXISTS idx_disbursements_assigned_agent ON public.disbursements(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_country ON public.disbursements(recipient_country);
CREATE INDEX IF NOT EXISTS idx_disbursement_history_disbursement_id ON public.disbursement_history(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_agents_email ON public.agents(email);
CREATE INDEX IF NOT EXISTS idx_agents_country ON public.agents(country);

-- =====================================================
-- FUNCTION: Generate pickup code
-- =====================================================

CREATE OR REPLACE FUNCTION generate_pickup_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    code := upper(substr(md5(random()::text), 1, 8));
    
    -- Check if code already exists
    SELECT COUNT(*) INTO exists_count FROM disbursements WHERE pickup_code = code;
    
    -- If unique, return it
    IF exists_count = 0 THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Auto-generate pickup code for cash pickups
-- =====================================================

CREATE OR REPLACE FUNCTION set_pickup_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.disbursement_method = 'cash_pickup' AND NEW.pickup_code IS NULL THEN
    NEW.pickup_code := generate_pickup_code();
    -- Set expiry to 30 days (but we hold cash indefinitely)
    NEW.pickup_expires_at := NOW() + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_pickup_code ON disbursements;
CREATE TRIGGER trigger_set_pickup_code
  BEFORE INSERT ON disbursements
  FOR EACH ROW
  EXECUTE FUNCTION set_pickup_code();

-- =====================================================
-- TRIGGER: Log disbursement changes
-- =====================================================

CREATE OR REPLACE FUNCTION log_disbursement_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO disbursement_history (disbursement_id, action, notes)
    VALUES (NEW.id, 'created', 'Disbursement created');
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO disbursement_history (disbursement_id, action, performed_by, notes)
    VALUES (NEW.id, NEW.status, NEW.processed_by_agent_id, 
            'Status changed from ' || OLD.status || ' to ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_disbursement ON disbursements;
CREATE TRIGGER trigger_log_disbursement
  AFTER INSERT OR UPDATE ON disbursements
  FOR EACH ROW
  EXECUTE FUNCTION log_disbursement_change();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.agents IS 'Company agents who handle local disbursements';
COMMENT ON TABLE public.disbursements IS 'Track money being sent to recipients back home';
COMMENT ON TABLE public.disbursement_history IS 'Audit trail for disbursement actions';
COMMENT ON COLUMN public.disbursements.pickup_code IS 'Unique code for cash pickup - recipient presents this to collect';
COMMENT ON COLUMN public.disbursements.pickup_expires_at IS 'When pickup reminder should be sent, but cash is held indefinitely';
