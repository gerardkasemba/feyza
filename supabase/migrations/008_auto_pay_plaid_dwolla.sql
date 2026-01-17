-- Migration: Add auto-pay and Plaid/Dwolla fields
-- Run this in Supabase SQL Editor

-- Add auto-pay flag to loans table
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS auto_pay_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ;

-- Add transfer_id to payment_schedule to track Dwolla transfers
ALTER TABLE payment_schedule
ADD COLUMN IF NOT EXISTS transfer_id VARCHAR(255);

-- Add Plaid/Dwolla fields to users table if not exists
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

-- Add same fields to business_profiles for business lenders
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

-- Create transfers table if not exists
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
  dwolla_transfer_id VARCHAR(255),
  dwolla_transfer_url TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('disbursement', 'repayment')),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  source_user_id UUID REFERENCES users(id),
  destination_user_id UUID REFERENCES users(id),
  failure_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for transfers table
CREATE INDEX IF NOT EXISTS idx_transfers_loan_id ON transfers(loan_id);
CREATE INDEX IF NOT EXISTS idx_transfers_dwolla_id ON transfers(dwolla_transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_type ON transfers(type);

-- Enable RLS on transfers
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- RLS policies for transfers
DROP POLICY IF EXISTS "Users can view their own transfers" ON transfers;
CREATE POLICY "Users can view their own transfers"
  ON transfers FOR SELECT
  USING (
    source_user_id = auth.uid() OR 
    destination_user_id = auth.uid() OR
    loan_id IN (
      SELECT id FROM loans WHERE borrower_id = auth.uid() OR lender_id = auth.uid()
    )
  );

-- Index for payment schedule auto-pay queries
CREATE INDEX IF NOT EXISTS idx_payment_schedule_due_unpaid 
  ON payment_schedule(due_date, is_paid) 
  WHERE is_paid = false;

-- Add index on users for bank connection status
CREATE INDEX IF NOT EXISTS idx_users_bank_connected ON users(bank_connected) WHERE bank_connected = true;

-- Update function for transfers updated_at
CREATE OR REPLACE FUNCTION update_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for transfers updated_at
DROP TRIGGER IF EXISTS transfers_updated_at ON transfers;
CREATE TRIGGER transfers_updated_at
  BEFORE UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_transfers_updated_at();

-- OPTIONAL: Remove old payment method columns (run after confirming Plaid/Dwolla works)
-- Uncomment and run these after testing:
-- 
-- ALTER TABLE users
--   DROP COLUMN IF EXISTS paypal_email,
--   DROP COLUMN IF EXISTS cashapp_username,
--   DROP COLUMN IF EXISTS venmo_username,
--   DROP COLUMN IF EXISTS preferred_payment_method;
-- 
-- ALTER TABLE loans
--   DROP COLUMN IF EXISTS lender_paypal_email,
--   DROP COLUMN IF EXISTS lender_cashapp_username,
--   DROP COLUMN IF EXISTS lender_venmo_username,
--   DROP COLUMN IF EXISTS lender_preferred_payment_method,
--   DROP COLUMN IF EXISTS borrower_payment_method,
--   DROP COLUMN IF EXISTS borrower_payment_username;
