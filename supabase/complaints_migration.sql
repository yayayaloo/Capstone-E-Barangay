-- =============================================
-- Complaints Module Migration
-- Run this in Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    complaint_type TEXT NOT NULL CHECK (complaint_type IN ('Noise Disturbance', 'Property Dispute', 'Public Disturbance', 'Vandalism', 'Illegal Structures', 'Waste Disposal', 'Others')),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    respondent_name TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Received' CHECK (status IN ('Received', 'Under Investigation', 'Resolved', 'Dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_resident ON complaints(resident_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_date ON complaints(created_at DESC);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Residents can only view their own complaints
DROP POLICY IF EXISTS "Residents can view own complaints" ON complaints;
CREATE POLICY "Residents can view own complaints"
    ON complaints FOR SELECT
    USING (auth.uid() = resident_id);

-- Only verified residents can submit complaints
DROP POLICY IF EXISTS "Verified residents can insert complaints" ON complaints;
CREATE POLICY "Verified residents can insert complaints"
    ON complaints FOR INSERT
    WITH CHECK (
        auth.uid() = resident_id AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_verified = true
        )
    );

-- Admins can view all complaints
DROP POLICY IF EXISTS "Admins can view all complaints" ON complaints;
CREATE POLICY "Admins can view all complaints"
    ON complaints FOR SELECT
    USING (is_admin());

-- Admins can update complaints (status + admin_notes)
DROP POLICY IF EXISTS "Admins can update complaints" ON complaints;
CREATE POLICY "Admins can update complaints"
    ON complaints FOR UPDATE
    USING (is_admin());

-- Admins can delete complaints
DROP POLICY IF EXISTS "Admins can delete complaints" ON complaints;
CREATE POLICY "Admins can delete complaints"
    ON complaints FOR DELETE
    USING (is_admin());

-- Auto-update updated_at
DROP TRIGGER IF EXISTS complaints_updated_at ON complaints;
CREATE TRIGGER complaints_updated_at
    BEFORE UPDATE ON complaints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
