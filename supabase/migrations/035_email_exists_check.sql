-- Migration: Add function to check if email exists in auth.users
-- This is needed because public.users only contains confirmed users,
-- but auth.users contains ALL users including unconfirmed ones

-- Create a secure function to check if email exists in auth.users
-- This function uses SECURITY DEFINER to access auth schema
CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- Check in auth.users table (includes unconfirmed users)
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE LOWER(email) = LOWER(email_to_check)
  ) INTO user_exists;
  
  RETURN user_exists;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.check_email_exists IS 'Securely checks if an email exists in auth.users table (includes unconfirmed users)';
