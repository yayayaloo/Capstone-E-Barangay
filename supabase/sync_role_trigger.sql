-- ==============================================================================
-- Sync Profiles Role to Auth Users Trigger
-- Run this in the Supabase Dashboard SQL Editor (Dashboard -> SQL Editor)
--
-- This script ensures that any changes to a resident's role in the public.profiles
-- table is automatically written to their auth.users.raw_user_meta_data.
-- This allows our Next.js middleware to check roles in the signed JWT token directly,
-- saving a database query on every page load and request.
-- ==============================================================================

-- 1. Create the trigger function (runs with SECURITY DEFINER privileges to write to auth schema)
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_auth_users()
RETURNS TRIGGER AS $$
BEGIN
    -- Merge the updated role into auth.users.raw_user_meta_data
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Drop the trigger if it already exists
DROP TRIGGER IF EXISTS on_profile_role_updated ON public.profiles;

-- 3. Attach trigger to profiles table for role updates
CREATE TRIGGER on_profile_role_updated
    AFTER UPDATE OF role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_profile_role_to_auth_users();

-- 4. Retroactively sync all existing profiles to auth.users metadata
UPDATE auth.users u
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role)
FROM public.profiles p
WHERE u.id = p.id;
