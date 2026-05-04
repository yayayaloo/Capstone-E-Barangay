-- Run this script in your Supabase SQL Editor to enable checking for existing emails
-- This function allows unauthenticated users (during registration) to check if an email exists
-- without giving them permission to read the entire profiles table.

CREATE OR REPLACE FUNCTION public.check_email_exists(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.profiles WHERE email = p_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Example usage:
-- SELECT check_email_exists('test@example.com');
