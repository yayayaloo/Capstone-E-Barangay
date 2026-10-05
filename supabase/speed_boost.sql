-- =============================================
-- E-Barangay Database Performance Boost
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Make is_admin() STABLE so PostgreSQL caches the result for the entire query
--    instead of re-executing it for every single row scanned by RLS policies!
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid()) AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Optimize Composite Indexes for Admin & Resident queries
CREATE INDEX IF NOT EXISTS idx_service_requests_status_created ON public.service_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role_created ON public.profiles(role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role_verified ON public.profiles(role, is_verified);
CREATE INDEX IF NOT EXISTS idx_complaints_archived_created ON public.complaints(is_archived, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blotter_archived_created ON public.blotter_reports(is_archived, created_at DESC);
