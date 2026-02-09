-- Migration: Add manual_payment column to payment_schedule
-- This tracks whether a payment was manually marked as paid (vs automated)

ALTER TABLE public.payment_schedule 
ADD COLUMN IF NOT EXISTS manual_payment BOOLEAN DEFAULT FALSE;

-- Also add some useful columns if missing
ALTER TABLE public.payment_schedule 
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE public.payment_schedule 
ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE public.payment_schedule 
ADD COLUMN IF NOT EXISTS payment_reference TEXT;

ALTER TABLE public.payment_schedule 
ADD COLUMN IF NOT EXISTS marked_paid_by UUID REFERENCES public.users(id);

-- Comments
COMMENT ON COLUMN public.payment_schedule.manual_payment IS 'True if payment was manually marked as paid';
COMMENT ON COLUMN public.payment_schedule.paid_at IS 'Timestamp when payment was made/recorded';
COMMENT ON COLUMN public.payment_schedule.payment_method IS 'Method used: cash, bank_transfer, paypal, etc.';
COMMENT ON COLUMN public.payment_schedule.payment_reference IS 'Reference number or transaction ID';
COMMENT ON COLUMN public.payment_schedule.marked_paid_by IS 'User who marked this payment as paid';
