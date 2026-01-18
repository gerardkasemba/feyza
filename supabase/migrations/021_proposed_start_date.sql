-- Add proposed_start_date column to loan_requests
ALTER TABLE loan_requests
ADD COLUMN IF NOT EXISTS proposed_start_date DATE;

-- Add status column to payment_schedule if it doesn't exist (for missed payments)
ALTER TABLE payment_schedule
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Add notes column to payment_schedule for failure reasons
ALTER TABLE payment_schedule
ADD COLUMN IF NOT EXISTS notes TEXT;
