-- Create admin_emails table to track all emails sent from admin panel
CREATE TABLE IF NOT EXISTS admin_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Email content
  email_type VARCHAR(50) NOT NULL, -- newsletter, announcement, personal, marketing, support, other
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- Recipients
  recipient_type VARCHAR(50) NOT NULL, -- all, individual, group, custom
  recipient_ids UUID[] NOT NULL, -- Array of user IDs who received the email
  recipient_count INTEGER NOT NULL DEFAULT 0,
  
  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  
  -- Metadata
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_emails_status ON admin_emails(status);
CREATE INDEX IF NOT EXISTS idx_admin_emails_email_type ON admin_emails(email_type);
CREATE INDEX IF NOT EXISTS idx_admin_emails_sent_by ON admin_emails(sent_by);
CREATE INDEX IF NOT EXISTS idx_admin_emails_created_at ON admin_emails(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_admin_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_emails_updated_at
BEFORE UPDATE ON admin_emails
FOR EACH ROW
EXECUTE FUNCTION update_admin_emails_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE admin_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view email history
CREATE POLICY admin_emails_select_policy ON admin_emails
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.user_type = 'admin'
    )
  );

-- Policy: Only admins can insert emails
CREATE POLICY admin_emails_insert_policy ON admin_emails
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.user_type = 'admin'
    )
  );

-- Policy: Only admins can update emails
CREATE POLICY admin_emails_update_policy ON admin_emails
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.user_type = 'admin'
    )
  );

COMMENT ON TABLE admin_emails IS 'Stores all emails sent through the admin email management system';
COMMENT ON COLUMN admin_emails.email_type IS 'Type of email: newsletter, announcement, personal, marketing, support, other';
COMMENT ON COLUMN admin_emails.recipient_type IS 'How recipients were selected: all, individual, group, custom';
COMMENT ON COLUMN admin_emails.recipient_ids IS 'Array of user IDs who received this email';
COMMENT ON COLUMN admin_emails.status IS 'Email send status: pending, sent, failed';
