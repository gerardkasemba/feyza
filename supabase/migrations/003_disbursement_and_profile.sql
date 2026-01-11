-- Migration: Add disbursement methods and business profile completion tracking
-- Run this in your Supabase SQL Editor

-- =============================================
-- 1. Add business profile completion tracking
-- =============================================
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- =============================================
-- 2. Enhance loans table for disbursement methods
-- =============================================

-- Disbursement method type
ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS disbursement_method TEXT CHECK (disbursement_method IN ('paypal', 'mobile_money', 'cash_pickup', 'bank_transfer')),

-- Mobile Money fields
ADD COLUMN IF NOT EXISTS mobile_money_provider TEXT, -- M-Pesa, Airtel, MTN, etc.
ADD COLUMN IF NOT EXISTS mobile_money_phone TEXT,
ADD COLUMN IF NOT EXISTS mobile_money_name TEXT,

-- Cash Pickup fields
ADD COLUMN IF NOT EXISTS cash_pickup_location TEXT,
ADD COLUMN IF NOT EXISTS picker_full_name TEXT,
ADD COLUMN IF NOT EXISTS picker_id_type TEXT, -- passport, national_id, drivers_license
ADD COLUMN IF NOT EXISTS picker_id_number TEXT,
ADD COLUMN IF NOT EXISTS picker_phone TEXT,

-- Bank Transfer fields
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_routing_number TEXT,
ADD COLUMN IF NOT EXISTS bank_swift_code TEXT,
ADD COLUMN IF NOT EXISTS bank_branch TEXT,

-- Track if this is for someone else (diaspora)
ADD COLUMN IF NOT EXISTS is_for_recipient BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recipient_name TEXT,
ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
ADD COLUMN IF NOT EXISTS recipient_country TEXT;

-- =============================================
-- 3. Update notification types
-- =============================================
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'reminder', 
  'payment_received', 
  'payment_confirmed', 
  'loan_request', 
  'loan_accepted', 
  'loan_declined',
  'loan_cancelled',
  'contract_signed',
  'paypal_required'
));

-- =============================================
-- 4. Add comments for documentation
-- =============================================
COMMENT ON COLUMN public.loans.disbursement_method IS 'How the borrower wants to receive money: paypal, mobile_money, cash_pickup, bank_transfer';
COMMENT ON COLUMN public.loans.mobile_money_provider IS 'Mobile money provider: M-Pesa, Airtel Money, MTN Mobile Money, Orange Money, etc.';
COMMENT ON COLUMN public.loans.is_for_recipient IS 'True if borrower is getting money for someone else (diaspora use case)';
COMMENT ON COLUMN public.business_profiles.profile_completed IS 'True when business has filled all required information';
