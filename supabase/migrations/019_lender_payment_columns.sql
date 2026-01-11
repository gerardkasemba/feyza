-- ===========================================
-- LOANTRACK: Guest Lender Payment Info Columns
-- Run this in Supabase SQL Editor
-- ===========================================

-- Add lender payment info columns to loans table (for guest lenders)
DO $$ 
BEGIN
  -- Add lender_paypal_email if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'lender_paypal_email') THEN
    ALTER TABLE public.loans ADD COLUMN lender_paypal_email TEXT;
  END IF;
  
  -- Add lender_cashapp_username if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'lender_cashapp_username') THEN
    ALTER TABLE public.loans ADD COLUMN lender_cashapp_username TEXT;
  END IF;
  
  -- Add lender_venmo_username if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'lender_venmo_username') THEN
    ALTER TABLE public.loans ADD COLUMN lender_venmo_username TEXT;
  END IF;
  
  -- Add lender_preferred_payment_method if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'lender_preferred_payment_method') THEN
    ALTER TABLE public.loans ADD COLUMN lender_preferred_payment_method TEXT;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.loans.lender_paypal_email IS 'PayPal email for guest lender to receive repayments';
COMMENT ON COLUMN public.loans.lender_cashapp_username IS 'Cash App username for guest lender to receive repayments';
COMMENT ON COLUMN public.loans.lender_venmo_username IS 'Venmo username for guest lender to receive repayments';
COMMENT ON COLUMN public.loans.lender_preferred_payment_method IS 'Preferred payment method for guest lender';
