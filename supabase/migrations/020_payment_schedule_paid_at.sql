-- Add paid_at column to payment_schedule if it doesn't exist
ALTER TABLE payment_schedule
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
