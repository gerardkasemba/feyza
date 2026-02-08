-- Migration: Pending Loan Requests for Pre-Signup Applications
-- This table stores loan requests from users who haven't completed verification yet

-- Create the pending_loan_requests table
CREATE TABLE IF NOT EXISTS pending_loan_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_lender_id UUID REFERENCES business_profiles(id) ON DELETE SET NULL,
    personal_lender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Loan details
    amount DECIMAL(12, 2) NOT NULL,
    purpose TEXT NOT NULL,
    description TEXT,
    term_months INTEGER NOT NULL DEFAULT 3,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'awaiting_verification' 
        CHECK (status IN ('awaiting_verification', 'verification_approved', 'loan_created', 'cancelled', 'expired')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Unique constraint per user per lender
    UNIQUE(user_id, business_lender_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_loans_user ON pending_loan_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_loans_status ON pending_loan_requests(status);
CREATE INDEX IF NOT EXISTS idx_pending_loans_business_lender ON pending_loan_requests(business_lender_id);
CREATE INDEX IF NOT EXISTS idx_pending_loans_created ON pending_loan_requests(created_at);

-- Enable RLS
ALTER TABLE pending_loan_requests ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own pending requests" ON pending_loan_requests;
CREATE POLICY "Users can view their own pending requests"
    ON pending_loan_requests FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create pending requests" ON pending_loan_requests;
CREATE POLICY "Users can create pending requests"
    ON pending_loan_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pending requests" ON pending_loan_requests;
CREATE POLICY "Users can update their own pending requests"
    ON pending_loan_requests FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all pending requests" ON pending_loan_requests;
CREATE POLICY "Admins can view all pending requests"
    ON pending_loan_requests FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
    ));

DROP POLICY IF EXISTS "Admins can update all pending requests" ON pending_loan_requests;
CREATE POLICY "Admins can update all pending requests"
    ON pending_loan_requests FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
    ));

-- Function to process pending loan requests after user verification
CREATE OR REPLACE FUNCTION process_pending_loan_after_verification()
RETURNS TRIGGER AS $$
DECLARE
    pending_record RECORD;
    new_loan_id UUID;
BEGIN
    -- Only proceed if user was just verified (verification_status changed to 'verified')
    IF NEW.verification_status = 'verified' AND (OLD.verification_status IS NULL OR OLD.verification_status != 'verified') THEN
        -- Find any pending loan requests for this user
        FOR pending_record IN 
            SELECT * FROM pending_loan_requests 
            WHERE user_id = NEW.id 
            AND status = 'awaiting_verification'
        LOOP
            -- Create the actual loan
            INSERT INTO loans (
                borrower_id,
                business_lender_id,
                lender_id,
                amount,
                purpose,
                description,
                term_months,
                status,
                match_status,
                currency,
                created_at
            ) VALUES (
                NEW.id,
                pending_record.business_lender_id,
                pending_record.personal_lender_id,
                pending_record.amount,
                pending_record.purpose,
                pending_record.description,
                pending_record.term_months,
                'pending',
                'pending',
                'USD',
                NOW()
            ) RETURNING id INTO new_loan_id;
            
            -- Update the pending request status
            UPDATE pending_loan_requests 
            SET status = 'loan_created',
                processed_at = NOW(),
                updated_at = NOW()
            WHERE id = pending_record.id;
            
            -- Notify the lender about the new loan request
            IF pending_record.business_lender_id IS NOT NULL THEN
                INSERT INTO notifications (
                    user_id,
                    type,
                    title,
                    message,
                    data
                )
                SELECT 
                    bp.user_id,
                    'new_loan_request',
                    'New Loan Request',
                    format('A verified borrower has requested a loan of $%s', pending_record.amount),
                    jsonb_build_object(
                        'loan_id', new_loan_id,
                        'amount', pending_record.amount,
                        'borrower_name', NEW.full_name
                    )
                FROM business_profiles bp
                WHERE bp.id = pending_record.business_lender_id;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic loan creation after verification
DROP TRIGGER IF EXISTS trigger_process_pending_loans ON users;
CREATE TRIGGER trigger_process_pending_loans
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION process_pending_loan_after_verification();

-- Add verification fields to users table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'verification_submitted_at') THEN
        ALTER TABLE users ADD COLUMN verification_submitted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

COMMENT ON TABLE pending_loan_requests IS 'Stores loan requests from users who apply before completing verification. Automatically converted to actual loans when user is verified.';
