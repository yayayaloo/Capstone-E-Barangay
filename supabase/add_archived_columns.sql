-- =============================================
-- Migration: Add is_archived columns & restrict delete policies
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Add is_archived column to blotter_reports
ALTER TABLE blotter_reports ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- 2. Add is_archived column to complaints
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- 3. Drop DELETE policies to block hard deletion
DROP POLICY IF EXISTS "Admins can delete blotter reports" ON blotter_reports;
DROP POLICY IF EXISTS "Admins can delete complaints" ON complaints;

-- 4. Update complaints SELECT policy for residents to hide archived ones
DROP POLICY IF EXISTS "Residents can view own complaints" ON complaints;
CREATE POLICY "Residents can view own complaints" ON complaints FOR SELECT
    USING (auth.uid() = resident_id AND is_archived = false);
