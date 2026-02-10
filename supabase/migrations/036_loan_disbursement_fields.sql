-- Add disbursement tracking fields to loans table
-- These fields support both ACH and manual payment methods

-- Add receipt URL for manual payments
ALTER TABLE loans ADD COLUMN IF NOT EXISTS disbursement_receipt_url TEXT;

-- Add duration fee fields (for longer repayment periods)
ALTER TABLE loans ADD COLUMN IF NOT EXISTS duration_fee_percent DECIMAL(5,2) DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS duration_fee_amount DECIMAL(12,2) DEFAULT 0;

-- Add comments
COMMENT ON COLUMN loans.disbursement_receipt_url IS 'URL to receipt/screenshot for manual payment confirmation';
COMMENT ON COLUMN loans.duration_fee_percent IS 'Fee percentage based on loan duration (longer = higher)';
COMMENT ON COLUMN loans.duration_fee_amount IS 'Calculated duration fee amount';
