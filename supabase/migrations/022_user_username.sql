-- Add username field to users table for unique identifiers (~username)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Add constraint: username must be lowercase, alphanumeric, underscores only, 3-20 chars
ALTER TABLE users ADD CONSTRAINT username_format 
  CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');

-- Add invite_username column to loans table for friend/family loans
ALTER TABLE loans ADD COLUMN IF NOT EXISTS invite_username TEXT;
