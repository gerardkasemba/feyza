-- =====================================================
-- MIGRATION: Plaid + Dwolla Integration
-- Removes PayPal/CashApp/Venmo, adds bank account fields
-- =====================================================

-- 1. Add Plaid/Dwolla columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS plaid_access_token TEXT,
ADD COLUMN IF NOT EXISTS plaid_item_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS plaid_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS dwolla_customer_url TEXT,
ADD COLUMN IF NOT EXISTS dwolla_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS dwolla_funding_source_url TEXT,
ADD COLUMN IF NOT EXISTS dwolla_funding_source_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS bank_account_mask VARCHAR(10),
ADD COLUMN IF NOT EXISTS bank_account_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS bank_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bank_connected_at TIMESTAMPTZ;

-- 2. Add Plaid/Dwolla columns to business_profiles table
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS plaid_access_token TEXT,
ADD COLUMN IF NOT EXISTS plaid_item_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS plaid_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS dwolla_customer_url TEXT,
ADD COLUMN IF NOT EXISTS dwolla_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS dwolla_funding_source_url TEXT,
ADD COLUMN IF NOT EXISTS dwolla_funding_source_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS bank_account_mask VARCHAR(10),
ADD COLUMN IF NOT EXISTS bank_account_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS bank_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bank_connected_at TIMESTAMPTZ;

-- 3. Create transfers table to track Dwolla transfers
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
  dwolla_transfer_id VARCHAR(255),
  dwolla_transfer_url TEXT,
  type VARCHAR(50) NOT NULL, -- 'disbursement', 'repayment'
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processed', 'failed', 'cancelled'
  source_user_id UUID REFERENCES users(id),
  destination_user_id UUID REFERENCES users(id),
  failure_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add disbursement tracking to loans table
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS disbursement_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
ADD COLUMN IF NOT EXISTS disbursement_transfer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMPTZ;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transfers_loan_id ON transfers(loan_id);
CREATE INDEX IF NOT EXISTS idx_transfers_dwolla_id ON transfers(dwolla_transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_users_dwolla_customer ON users(dwolla_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_bank_connected ON users(bank_connected);

-- 6. Drop old PayPal/CashApp/Venmo columns (OPTIONAL - run separately after confirming migration)
-- Uncomment these when ready:
-- ALTER TABLE users DROP COLUMN IF EXISTS paypal_email;
-- ALTER TABLE users DROP COLUMN IF EXISTS paypal_connected;
-- ALTER TABLE users DROP COLUMN IF EXISTS paypal_connected_at;
-- ALTER TABLE users DROP COLUMN IF EXISTS cashapp_username;
-- ALTER TABLE users DROP COLUMN IF EXISTS venmo_username;
-- ALTER TABLE users DROP COLUMN IF EXISTS preferred_payment_method;

-- ALTER TABLE business_profiles DROP COLUMN IF EXISTS paypal_email;
-- ALTER TABLE business_profiles DROP COLUMN IF EXISTS paypal_connected;
-- ALTER TABLE business_profiles DROP COLUMN IF EXISTS cashapp_username;
-- ALTER TABLE business_profiles DROP COLUMN IF EXISTS venmo_username;

-- 7. Update RLS policies for transfers table
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transfers"
ON transfers FOR SELECT
USING (
  source_user_id = auth.uid() OR 
  destination_user_id = auth.uid()
);

CREATE POLICY "Service role can manage transfers"
ON transfers FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');
