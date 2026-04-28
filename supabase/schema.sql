-- =============================================
-- E-Barangay Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    first_name TEXT,
    middle_name TEXT,
    last_name TEXT,
    suffix TEXT,
    gender TEXT CHECK (gender IN ('Male', 'Female')),
    relationship_status TEXT,
    id_document_url TEXT,
    email TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'resident' CHECK (role IN ('resident', 'admin')),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    resident_id_number TEXT UNIQUE,
    resident_qr_id TEXT UNIQUE DEFAULT gen_random_uuid(),
    sectors TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Service Requests table
CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    purpose TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'completed', 'rejected')),
    notes TEXT,
    qr_code_ref TEXT UNIQUE,
    attachment_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('community_event', 'important', 'emergency', 'general')),
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. QR Verifications log
CREATE TABLE IF NOT EXISTS qr_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_ref TEXT NOT NULL,
    document_type TEXT NOT NULL,
    holder_name TEXT NOT NULL,
    is_valid BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    performed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_service_requests_resident ON service_requests(resident_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_verifications_ref ON qr_verifications(document_ref);

-- =============================================
-- Enable Row Level Security (RLS)
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- Helper function: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- PROFILES policies
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (is_admin());

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
    ON profiles FOR UPDATE
    USING (is_admin());

-- SERVICE_REQUESTS policies
CREATE POLICY "Residents can view own requests"
    ON service_requests FOR SELECT
    USING (auth.uid() = resident_id);

CREATE POLICY "Admins can view all requests"
    ON service_requests FOR SELECT
    USING (is_admin());

CREATE POLICY "Residents can create requests"
    ON service_requests FOR INSERT
    WITH CHECK (auth.uid() = resident_id);

CREATE POLICY "Admins can update any request"
    ON service_requests FOR UPDATE
    USING (is_admin());

-- ANNOUNCEMENTS policies
CREATE POLICY "Authenticated users can view announcements"
    ON announcements FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can create announcements"
    ON announcements FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update announcements"
    ON announcements FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete announcements"
    ON announcements FOR DELETE
    USING (is_admin());

-- QR_VERIFICATIONS policies
CREATE POLICY "Admins can view verifications"
    ON qr_verifications FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can create verifications"
    ON qr_verifications FOR INSERT
    WITH CHECK (is_admin());

-- AUDIT_LOGS policies
CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can create audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (is_admin());

-- FEEDBACK policies
CREATE POLICY "Admins can view feedback"
    ON feedback FOR SELECT
    USING (is_admin());

CREATE POLICY "Residents can create feedback"
    ON feedback FOR INSERT
    WITH CHECK (auth.uid() = resident_id);

-- =============================================
-- Auto-update updated_at trigger
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER service_requests_updated_at
    BEFORE UPDATE ON service_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- Seed data (optional - for testing)
-- =============================================

-- Sample announcements will be inserted by admin users through the app

-- =============================================
-- Verification Function (Bypasses RLS for secure QR lookups)
-- =============================================
CREATE OR REPLACE FUNCTION verify_document_qr(qr_code_string TEXT)
RETURNS jsonb AS $$
DECLARE
    found_request RECORD;
    found_profile RECORD;
BEGIN
    -- Check if it's a resident profile QR (by id or resident_qr_id)
    SELECT p.id, p.full_name, p.resident_id_number, p.is_verified 
    INTO found_profile
    FROM profiles p
    WHERE p.id::text = qr_code_string
       OR p.resident_qr_id = qr_code_string;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'isValid', found_profile.is_verified,
            'type', 'Barangay Identification',
            'details', jsonb_build_object(
                'Holder Name', found_profile.full_name,
                'Resident ID', COALESCE(found_profile.resident_id_number, 'Pending'),
                'Verification Status', CASE WHEN found_profile.is_verified THEN 'Verified Resident' ELSE 'Unverified' END
            ),
            'message', CASE WHEN found_profile.is_verified THEN 'Valid Resident ID recognized.' ELSE 'Resident account is not yet verified.' END
        );
    END IF;

    -- Check if it's a service request / document
    SELECT sr.id, sr.document_type, sr.purpose, sr.status, sr.created_at, p.full_name as holder_name
    INTO found_request
    FROM service_requests sr
    JOIN profiles p ON p.id = sr.resident_id
    WHERE sr.qr_code_ref = qr_code_string;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'isValid', found_request.status IN ('completed', 'ready'),
            'type', found_request.document_type,
            'details', jsonb_build_object(
                'Holder Name', found_request.holder_name,
                'Purpose', COALESCE(found_request.purpose, 'N/A'),
                'Status', INITCAP(found_request.status),
                'Date Issued', TO_CHAR(found_request.created_at, 'YYYY-MM-DD')
            ),
            'message', CASE WHEN found_request.status IN ('completed', 'ready') THEN 'Valid official barangay document recognized.' ELSE 'Document is not yet fully processed or approved.' END
        );
    END IF;

    -- Not found
    RETURN jsonb_build_object(
        'isValid', false,
        'message', 'QR Code is not recognized by the E-Barangay system.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- QR Verification Logging Function
-- Allows any authenticated user to log scan results (bypasses RLS)
-- =============================================
CREATE OR REPLACE FUNCTION log_qr_verification(
    p_document_ref TEXT,
    p_document_type TEXT,
    p_holder_name TEXT,
    p_is_valid BOOLEAN,
    p_verified_by UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO qr_verifications (document_ref, document_type, holder_name, is_valid, verified_by)
    VALUES (p_document_ref, p_document_type, p_holder_name, p_is_valid, COALESCE(p_verified_by, auth.uid()));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- =============================================
-- Public Statistics Function
-- =============================================
CREATE OR REPLACE FUNCTION get_public_stats()
RETURNS json AS $$
DECLARE
    res_count INT;
    req_count INT;
BEGIN
    SELECT count(*) INTO res_count FROM profiles WHERE role = 'resident';
    SELECT count(*) INTO req_count FROM service_requests;
    
    RETURN json_build_object(
        'residents', res_count,
        'requests', req_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- Auth Hook for Automatic Profile Creation
-- =============================================
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
    COALESCE(new.raw_user_meta_data->>'role', 'resident'),
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

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================
-- Storage Buckets & Policies
-- =============================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resident-requirements', 'resident-requirements', false)
ON CONFLICT (id) DO NOTHING;

-- Helper function to safely check if a folder name is a recently created profile ID
CREATE OR REPLACE FUNCTION is_recent_profile(profile_id_text TEXT)
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
        SELECT 1 FROM profiles 
        WHERE id = valid_uuid 
        AND created_at > (NOW() - INTERVAL '1 hour')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC to update profile details immediately after signup without requiring an active session
CREATE OR REPLACE FUNCTION complete_registration(
    p_user_id UUID,
    p_id_document_url TEXT,
    p_sectors TEXT[]
)
RETURNS void AS $$
BEGIN
    UPDATE profiles 
    SET 
        id_document_url = p_id_document_url,
        sectors = p_sectors
    WHERE id = p_user_id 
    AND created_at > (NOW() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing policy if any (for idempotency when running in SQL editor)
DROP POLICY IF EXISTS "Residents can upload their own requirements" ON storage.objects;

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

CREATE POLICY "Residents can view their own requirements" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'resident-requirements' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Admins can view all requirements" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'resident-requirements' AND is_admin());
