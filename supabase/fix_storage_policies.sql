-- Ensure storage buckets exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resident-requirements', 'resident-requirements', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('resident-profile-pictures', 'resident-profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Drop ALL existing storage policies first to avoid "policy already exists" error
DROP POLICY IF EXISTS "Allow registration upload to resident-requirements" ON storage.objects;
DROP POLICY IF EXISTS "Residents can upload their own requirements" ON storage.objects;
DROP POLICY IF EXISTS "Residents can view their own requirements" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all requirements" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete requirements" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Residents can upload own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Residents can update own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete profile pictures" ON storage.objects;

-- 1. Allow ID upload during registration and resident portal
CREATE POLICY "Allow registration upload to resident-requirements" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'resident-requirements');

-- 2. Allow residents to view their own uploaded files
CREATE POLICY "Residents can view their own requirements" 
  ON storage.objects FOR SELECT 
  USING (
    bucket_id = 'resident-requirements' 
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- 3. Allow Admins to view ALL requirement files
CREATE POLICY "Admins can view all requirements" 
  ON storage.objects FOR SELECT 
  USING (
    bucket_id = 'resident-requirements' 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Allow Admins to delete requirement files
CREATE POLICY "Admins can delete requirements" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'resident-requirements' 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Policies for Profile Pictures bucket
CREATE POLICY "Anyone can view profile pictures" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'resident-profile-pictures');

CREATE POLICY "Residents can upload own profile picture" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'resident-profile-pictures');

CREATE POLICY "Residents can update own profile picture" 
  ON storage.objects FOR UPDATE 
  USING (bucket_id = 'resident-profile-pictures');

CREATE POLICY "Admins can delete profile pictures" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'resident-profile-pictures' 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
