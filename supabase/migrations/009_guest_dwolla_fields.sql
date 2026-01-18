-- Migration: Add guest Dwolla fields directly to loans and loan_requests
-- This allows guests to connect banks without needing auth accounts

-- Add borrower Dwolla fields to loan_requests (for guest borrowers)
ALTER TABLE loan_requests
ADD COLUMN IF NOT EXISTS borrower_dwolla_customer_url TEXT,
ADD COLUMN IF NOT EXISTS borrower_dwolla_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS borrower_dwolla_funding_source_url TEXT,
ADD COLUMN IF NOT EXISTS borrower_dwolla_funding_source_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS borrower_plaid_access_token TEXT,
ADD COLUMN IF NOT EXISTS borrower_bank_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS borrower_bank_account_mask VARCHAR(10),
ADD COLUMN IF NOT EXISTS borrower_bank_account_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS borrower_bank_connected BOOLEAN DEFAULT false;

-- Add lender Dwolla fields to loans (for guest lenders who accept loans)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS lender_dwolla_customer_url TEXT,
ADD COLUMN IF NOT EXISTS lender_dwolla_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS lender_dwolla_funding_source_url TEXT,
ADD COLUMN IF NOT EXISTS lender_dwolla_funding_source_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS lender_bank_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS lender_bank_account_mask VARCHAR(10),
ADD COLUMN IF NOT EXISTS lender_bank_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lender_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS lender_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS disbursement_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS disbursement_transfer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMPTZ;

-- Add borrower Dwolla fields to loans (copied from loan_request or set directly)
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS borrower_dwolla_customer_url TEXT,
ADD COLUMN IF NOT EXISTS borrower_dwolla_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS borrower_dwolla_funding_source_url TEXT,
ADD COLUMN IF NOT EXISTS borrower_dwolla_funding_source_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS borrower_bank_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS borrower_bank_account_mask VARCHAR(10),
ADD COLUMN IF NOT EXISTS borrower_bank_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS borrower_name VARCHAR(255);

-- Add missing loan status/tracking columns
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS invite_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invite_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lender_signed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lender_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_pay_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ;

-- Index for finding loans with bank connections
CREATE INDEX IF NOT EXISTS idx_loans_lender_bank ON loans(lender_bank_connected) WHERE lender_bank_connected = true;
CREATE INDEX IF NOT EXISTS idx_loans_borrower_bank ON loans(borrower_bank_connected) WHERE borrower_bank_connected = true;
