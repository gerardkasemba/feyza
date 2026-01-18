-- Platform Settings table for configurable fees and other settings
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Insert default platform fee settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('platform_fee', '{
    "enabled": true,
    "type": "fixed",
    "fixed_amount": 1.50,
    "percentage": 2.5,
    "min_fee": 0.50,
    "max_fee": 25.00,
    "fee_label": "Feyza Service Fee",
    "fee_description": "Platform processing fee"
  }'::jsonb, 'Platform fee configuration for all transactions')
ON CONFLICT (key) DO NOTHING;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(key);

-- Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for displaying fees)
CREATE POLICY "Anyone can view platform settings"
ON platform_settings FOR SELECT
TO authenticated, anon
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update platform settings"
ON platform_settings FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);

-- Only admins can insert settings
CREATE POLICY "Admins can insert platform settings"
ON platform_settings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
);

-- Add fee tracking columns to transfers table
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS fee_type TEXT;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(10,2);
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2);

-- Add fee tracking to payment_schedule
ALTER TABLE payment_schedule ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0;

-- Create a function to get current platform fee settings
CREATE OR REPLACE FUNCTION get_platform_fee_settings()
RETURNS JSONB AS $$
BEGIN
  RETURN (SELECT value FROM platform_settings WHERE key = 'platform_fee');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to all
GRANT EXECUTE ON FUNCTION get_platform_fee_settings() TO authenticated, anon;
