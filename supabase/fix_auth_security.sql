-- =============================================
-- Authentication Security Fix: Privilege Escalation Prevention
-- Run this script in the Supabase SQL Editor
-- =============================================

-- 1. Redefine public.handle_new_user() to force role to 'resident' on trigger
-- Added SET search_path = public to prevent search path hijacking (SECURITY DEFINER requirement)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, email, role,
    first_name, middle_name, last_name, suffix,
    gender, relationship_status, address, phone, birthdate
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Resident'),
    new.email,
    'resident', -- SECURITY: Hardcode new signups to 'resident' to prevent user role injection from raw_user_meta_data
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'middle_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'suffix',
    new.raw_user_meta_data->>'gender',
    new.raw_user_meta_data->>'relationship_status',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'phone',
    CASE WHEN new.raw_user_meta_data->>'birthdate' IS NOT NULL AND new.raw_user_meta_data->>'birthdate' != ''
      THEN (new.raw_user_meta_data->>'birthdate')::date
      ELSE NULL
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Prevent residents from modifying their own 'role' column via database updates
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow admins to modify roles
    IF NEW.role IS DISTINCT FROM OLD.role AND NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        NEW.role = OLD.role; -- Revert the role change if the updater is not an admin
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists to prevent duplicate triggers
DROP TRIGGER IF EXISTS check_profile_role_update ON public.profiles;

-- Create trigger to protect role column from unauthorized updates
CREATE TRIGGER check_profile_role_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();
