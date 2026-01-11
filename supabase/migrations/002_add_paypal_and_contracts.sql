-- Migration: Add PayPal Integration and Contract Fields
-- Run this if you have an existing database

-- Add PayPal columns to users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS paypal_email TEXT,
ADD COLUMN IF NOT EXISTS paypal_payer_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS paypal_connected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_reminders BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER DEFAULT 3;

-- Add contract columns to loans
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS contract_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS contract_url TEXT,
ADD COLUMN IF NOT EXISTS borrower_signed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS borrower_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS borrower_signature_ip TEXT,
ADD COLUMN IF NOT EXISTS lender_signed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS lender_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lender_signature_ip TEXT,
ADD COLUMN IF NOT EXISTS auto_payment_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_payment_reminder_sent BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN public.users.paypal_email IS 'PayPal account email for payments';
COMMENT ON COLUMN public.users.paypal_connected IS 'Whether user has connected their PayPal';
COMMENT ON COLUMN public.users.email_reminders IS 'Whether to send email reminders for payments';
COMMENT ON COLUMN public.users.reminder_days_before IS 'Days before due date to send reminder';

COMMENT ON COLUMN public.loans.contract_generated IS 'Whether contract PDF has been generated';
COMMENT ON COLUMN public.loans.borrower_signed IS 'Whether borrower has signed the contract';
COMMENT ON COLUMN public.loans.lender_signed IS 'Whether lender has signed the contract';
COMMENT ON COLUMN public.loans.auto_payment_enabled IS 'Whether automatic PayPal payments are enabled';
