-- =============================================
-- Migration: Secure DB Roles & Service Requests
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Modify the signup trigger handle_new_user() to hardcode default role to 'resident'
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
    'resident', -- Hardcode to 'resident' to prevent user metadata role spoofing
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Prevent residents from modifying their own 'role' column via database updates
CREATE OR REPLACE FUNCTION protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role AND NOT is_admin() THEN
        NEW.role = OLD.role; -- Revert the role change if the updater is not an admin
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS check_profile_role_update ON profiles;
CREATE TRIGGER check_profile_role_update
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION protect_profile_role();

-- 3. Modify the service requests insert policy to enforce verification and force 'pending' status
DROP POLICY IF EXISTS "Residents can create requests" ON service_requests;
CREATE POLICY "Residents can create requests" ON service_requests FOR INSERT 
WITH CHECK (
    auth.uid() = resident_id 
    AND status = 'pending' -- Prevent spoofing completed status
    AND EXISTS (           -- Prevent unverified requests
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_verified = true
    )
);
