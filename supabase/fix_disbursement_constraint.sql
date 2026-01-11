-- Fix for disbursement_method constraint
-- Run this in your Supabase SQL Editor if you already have the column

-- First, drop the existing constraint
ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_disbursement_method_check;

-- Add the updated constraint that includes 'paypal'
ALTER TABLE public.loans ADD CONSTRAINT loans_disbursement_method_check 
  CHECK (disbursement_method IN ('paypal', 'mobile_money', 'cash_pickup', 'bank_transfer'));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.loans'::regclass 
AND conname LIKE '%disbursement%';
