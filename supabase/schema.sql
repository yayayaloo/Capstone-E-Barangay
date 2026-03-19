-- =============================================
-- E-Barangay Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'resident' CHECK (role IN ('resident', 'admin')),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    resident_id_number TEXT UNIQUE,
    resident_qr_id TEXT UNIQUE DEFAULT gen_random_uuid(),
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
$$ LANGUAGE sql SECURITY DEFINER;

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
