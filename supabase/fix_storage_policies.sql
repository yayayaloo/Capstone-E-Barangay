-- Fix: Ensure admin can read all uploaded resident requirement files from storage
-- Run this in Supabase SQL Editor if admins cannot view uploaded files

-- =============================================
-- 1. Ensure helper functions exist first
-- =============================================

CREATE OR REPLACE FUNCTION public.is_recent_profile(profile_id_text TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    valid_uuid UUID;
BEGIN
    BEGIN
        valid_uuid := profile_id_text::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
        RETURN false;
    END;

    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = valid_uuid 
        AND created_at > (NOW() - INTERVAL '1 hour')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure the is_admin function exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- 2. Ensure the bucket exists
-- =============================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resident-requirements', 'resident-requirements', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('resident-profile-pictures', 'resident-profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Drop all existing storage policies for these buckets to avoid duplicates
DROP POLICY IF EXISTS "Residents can upload their own requirements" ON storage.objects;
DROP POLICY IF EXISTS "Residents can view their own requirements" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all requirements" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete requirements" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Residents can upload own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Residents can update own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete profile pictures" ON storage.objects;

-- 1. Residents can upload files to their own folder
CREATE POLICY "Residents can upload their own requirements" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'resident-requirements' 
    AND (
      auth.uid()::text = (string_to_array(name, '/'))[1]
      OR 
      (auth.role() = 'anon' AND public.is_recent_profile((string_to_array(name, '/'))[1]))
    )
  );

-- 2. Residents can view only their own uploaded files
CREATE POLICY "Residents can view their own requirements" 
  ON storage.objects FOR SELECT 
  USING (
    bucket_id = 'resident-requirements' 
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- 3. Admins can view ALL uploaded files (this is critical for admin viewing to work)
CREATE POLICY "Admins can view all requirements" 
  ON storage.objects FOR SELECT 
  USING (
    bucket_id = 'resident-requirements' 
    AND public.is_admin()
  );

-- 4. Admins can delete files if needed
CREATE POLICY "Admins can delete requirements" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'resident-requirements' 
    AND public.is_admin()
  );

-- Policies for resident profile pictures bucket
CREATE POLICY "Anyone can view profile pictures" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'resident-profile-pictures');

CREATE POLICY "Residents can upload own profile picture" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'resident-profile-pictures' 
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Residents can update own profile picture" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'resident-profile-pictures' 
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Admins can delete profile pictures" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'resident-profile-pictures' 
    AND public.is_admin()
  );
