-- =============================================
-- E-Barangay Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. Table Definitions
-- =============================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
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
    birthdate DATE,
    role TEXT NOT NULL DEFAULT 'resident' CHECK (role IN ('resident', 'admin')),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_rejected BOOLEAN NOT NULL DEFAULT false,
    resident_id_number TEXT UNIQUE,
    resident_qr_id TEXT UNIQUE DEFAULT gen_random_uuid(),
    sectors TEXT[] NOT NULL DEFAULT '{}',
    resident_since TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.profiles.is_rejected IS 'Set to true when an admin explicitly rejects a resident registration';

-- Service Requests table
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    purpose TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'completed', 'rejected')),
    notes TEXT,
    qr_code_ref TEXT UNIQUE,
    attachment_url TEXT,
    issued_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    form_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('community_event', 'important', 'emergency', 'general')),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Complaints table
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    complaint_type TEXT NOT NULL, -- Dropped check constraint to allow custom types (e.g. specifying 'Others')
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    respondent_name TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Received' CHECK (status IN ('Received', 'Under Investigation', 'Resolved', 'Dismissed')),
    admin_notes TEXT,
    attachment_url TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Complaint Comments table
CREATE TABLE IF NOT EXISTS public.complaint_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blotter Reports table
CREATE TABLE IF NOT EXISTS public.blotter_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complainant TEXT NOT NULL,
    respondent TEXT NOT NULL,
    incident_details TEXT NOT NULL,
    incident_date TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Ongoing', 'Resolved', 'Referred')),
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- QR Verifications log
CREATE TABLE IF NOT EXISTS public.qr_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_ref TEXT NOT NULL,
    document_type TEXT NOT NULL,
    holder_name TEXT NOT NULL,
    is_valid BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Nullable to prevent cascades on profile delete
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 2. Performance Indices
-- =============================================
CREATE INDEX IF NOT EXISTS idx_profiles_qr_id ON public.profiles(resident_qr_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_resident ON public.service_requests(resident_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON public.announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_verifications_ref ON public.qr_verifications(document_ref);
CREATE INDEX IF NOT EXISTS idx_complaints_resident ON public.complaints(resident_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_date ON public.complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaint_comments_complaint ON public.complaint_comments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_comments_created ON public.complaint_comments(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_blotter_reports_status ON public.blotter_reports(status);
CREATE INDEX IF NOT EXISTS idx_blotter_reports_date ON public.blotter_reports(incident_date DESC);

-- =============================================
-- 3. Enable Row Level Security (RLS)
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blotter_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. Helper and Verification Functions
-- =============================================

-- Helper function: check if user is admin (SECURITY DEFINER with explicit search path)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Verification Function (Bypasses RLS for secure QR lookups, requires authentication)
CREATE OR REPLACE FUNCTION public.verify_document_qr(qr_code_string TEXT)
RETURNS jsonb AS $$
DECLARE
    found_profile RECORD;
    found_request RECORD;
BEGIN
    -- SECURITY: Require authentication to prevent unauthenticated enumeration of PII
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object(
            'isValid', false,
            'message', 'Authentication required to verify QR codes.'
        );
    END IF;

    -- Check if it's a resident profile QR (by id or resident_qr_id)
    SELECT p.id, p.full_name, p.resident_id_number, p.is_verified 
    INTO found_profile
    FROM public.profiles p
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
    SELECT sr.id, sr.document_type, sr.purpose, sr.status, sr.created_at, sr.expires_at, p.full_name as holder_name
    INTO found_request
    FROM public.service_requests sr
    JOIN public.profiles p ON p.id = sr.resident_id
    WHERE sr.qr_code_ref = qr_code_string;

    IF FOUND THEN
        DECLARE
            v_is_valid BOOLEAN;
            v_message TEXT;
        BEGIN
            v_is_valid := found_request.status IN ('completed', 'ready');
            
            -- Expiration check
            IF v_is_valid AND found_request.expires_at IS NOT NULL AND found_request.expires_at < NOW() THEN
                v_is_valid := false;
                v_message := 'Document has expired.';
            ELSIF v_is_valid THEN
                v_message := 'Valid official barangay document recognized.';
            ELSE
                v_message := 'Document status is ' || INITCAP(found_request.status) || '.';
            END IF;

            RETURN jsonb_build_object(
                'isValid', v_is_valid,
                'type', found_request.document_type,
                'details', jsonb_build_object(
                    'Holder Name', found_request.holder_name,
                    'Purpose', COALESCE(found_request.purpose, 'N/A'),
                    'Status', INITCAP(found_request.status),
                    'Date Issued', TO_CHAR(found_request.created_at, 'YYYY-MM-DD'),
                    'Expires At', COALESCE(TO_CHAR(found_request.expires_at, 'YYYY-MM-DD'), 'N/A')
                ),
                'message', v_message
            );
        END;
    END IF;

    -- Not found
    RETURN jsonb_build_object(
        'isValid', false,
        'message', 'QR Code is not recognized by the E-Barangay system.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- QR Verification Logging Function (Requires auth, forces verified_by to actual user ID to prevent spoofing)
CREATE OR REPLACE FUNCTION public.log_qr_verification(
    p_document_ref TEXT,
    p_document_type TEXT,
    p_holder_name TEXT,
    p_is_valid BOOLEAN,
    p_verified_by UUID DEFAULT NULL -- Note: ignore client input, force auth.uid()
)
RETURNS void AS $$
BEGIN
    -- SECURITY: Require authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required to log QR verifications.';
    END IF;

    -- Force insertion using authenticated user's ID
    INSERT INTO public.qr_verifications (document_ref, document_type, holder_name, is_valid, verified_by)
    VALUES (p_document_ref, p_document_type, p_holder_name, p_is_valid, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Public Statistics Function
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS json AS $$
DECLARE
    res_count INT;
    req_count INT;
Logins INT;
BEGIN
    SELECT count(*) INTO res_count FROM public.profiles WHERE role = 'resident';
    SELECT count(*) INTO req_count FROM public.service_requests;
    
    RETURN json_build_object(
        'residents', res_count,
        'requests', req_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- 5. RLS Policies
-- =============================================

-- PROFILES policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    USING (public.is_admin());

-- SERVICE_REQUESTS policies
CREATE POLICY "Residents can view own requests"
    ON public.service_requests FOR SELECT
    USING (auth.uid() = resident_id);

CREATE POLICY "Admins can view all requests"
    ON public.service_requests FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Residents can create requests"
    ON public.service_requests FOR INSERT
    WITH CHECK (
        auth.uid() = resident_id 
        AND status = 'pending' -- Force client side submission to pending
        AND EXISTS (           -- Restrict non-verified residents from requesting online
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_verified = true
        )
    );

CREATE POLICY "Admins can update any request"
    ON public.service_requests FOR UPDATE
    USING (public.is_admin());

-- ANNOUNCEMENTS policies
CREATE POLICY "Authenticated users can view announcements"
    ON public.announcements FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can create announcements"
    ON public.announcements FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update announcements"
    ON public.announcements FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Admins can delete announcements"
    ON public.announcements FOR DELETE
    USING (public.is_admin());

-- COMPLAINTS policies
CREATE POLICY "Residents can view own complaints"
    ON public.complaints FOR SELECT
    USING (auth.uid() = resident_id AND is_archived = false);

CREATE POLICY "Verified residents can insert complaints"
    ON public.complaints FOR INSERT
    WITH CHECK (
        auth.uid() = resident_id AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_verified = true
        )
    );

CREATE POLICY "Admins can view all complaints"
    ON public.complaints FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admins can update complaints"
    ON public.complaints FOR UPDATE
    USING (public.is_admin());

-- COMPLAINT_COMMENTS policies
CREATE POLICY "Users can view comments on accessible complaints"
    ON public.complaint_comments FOR SELECT
    USING (
        public.is_admin() 
        OR EXISTS (
            SELECT 1 FROM public.complaints 
            WHERE public.complaints.id = complaint_comments.complaint_id 
            AND public.complaints.resident_id = auth.uid()
        )
    );

CREATE POLICY "Users can post comments on accessible complaints"
    ON public.complaint_comments FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND (
            public.is_admin()
            OR EXISTS (
                SELECT 1 FROM public.complaints 
                WHERE public.complaints.id = complaint_id 
                AND public.complaints.resident_id = auth.uid()
            )
        )
    );

-- BLOTTER_REPORTS policies
CREATE POLICY "Admins can view blotter reports"
    ON public.blotter_reports FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admins can insert blotter reports"
    ON public.blotter_reports FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update blotter reports"
    ON public.blotter_reports FOR UPDATE
    USING (public.is_admin());

-- QR_VERIFICATIONS policies
CREATE POLICY "Admins can view verifications"
    ON public.qr_verifications FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admins can create verifications"
    ON public.qr_verifications FOR INSERT
    WITH CHECK (public.is_admin());

-- AUDIT_LOGS policies
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admins can create audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (public.is_admin());

-- FEEDBACK policies
CREATE POLICY "Admins can view feedback"
    ON public.feedback FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Residents can create feedback"
    ON public.feedback FOR INSERT
    WITH CHECK (auth.uid() = resident_id);

-- =============================================
-- 6. Trigger Functions & Triggers
-- =============================================

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER service_requests_updated_at
    BEFORE UPDATE ON public.service_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER complaints_updated_at
    BEFORE UPDATE ON public.complaints
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER blotter_reports_updated_at
    BEFORE UPDATE ON public.blotter_reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Prevent residents from modifying their own 'role' column via database updates
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

CREATE TRIGGER check_profile_role_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- Auth Hook for Automatic Profile Creation (Role is hardcoded to resident to prevent injection)
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
    'resident', -- SECURITY: Hardcode role to prevent privilege escalation from raw metadata role injection
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

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================
-- 7. Storage Buckets & Policies
-- =============================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resident-requirements', 'resident-requirements', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('resident-profile-pictures', 'resident-profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Helper function to safely check if a folder name is a recently created profile ID
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

-- RPC to update profile details immediately after signup without requiring an active session
CREATE OR REPLACE FUNCTION public.complete_registration(
    p_user_id UUID,
    p_id_document_url TEXT,
    p_sectors TEXT[]
)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles 
    SET 
        id_document_url = p_id_document_url,
        sectors = p_sectors
    WHERE id = p_user_id 
    AND created_at > (NOW() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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

-- 3. Admins can view ALL uploaded files
CREATE POLICY "Admins can view all requirements" 
  ON storage.objects FOR SELECT 
  USING (
    bucket_id = 'resident-requirements' 
    AND public.is_admin()
  );

-- 4. Admins can delete files
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
