-- ===========================================
-- LOANTRACK: Admin & Timezone Migration
-- Run this in Supabase SQL Editor
-- ===========================================

-- Add admin and suspension columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Add helpful comments
COMMENT ON COLUMN public.users.is_admin IS 'Whether user has admin access';
COMMENT ON COLUMN public.users.is_suspended IS 'Whether user account is suspended';
COMMENT ON COLUMN public.users.timezone IS 'User timezone for due dates and reminders';

-- Create index for admin lookup
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin) WHERE is_admin = true;

-- ===========================================
-- SET INITIAL ADMIN (update with your email)
-- ===========================================

-- Uncomment and run this to make a user admin:
-- UPDATE public.users SET is_admin = true WHERE email = 'your-email@example.com';

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- Check users table has new columns:
-- SELECT id, email, is_admin, is_suspended, timezone FROM users LIMIT 5;

-- Find all admins:
-- SELECT * FROM users WHERE is_admin = true;
