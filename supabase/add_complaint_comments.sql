-- =============================================
-- Migration: Add Resident Complaints Comments (Discussion Channel)
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create complaint_comments table
CREATE TABLE IF NOT EXISTS public.complaint_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create indices for faster queries
CREATE INDEX IF NOT EXISTS idx_complaint_comments_complaint ON public.complaint_comments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_comments_created ON public.complaint_comments(created_at ASC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.complaint_comments ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Select Policy
-- Admins can view all comments. Residents can only view comments for complaints they submitted.
DROP POLICY IF EXISTS "Users can view comments on accessible complaints" ON public.complaint_comments;
CREATE POLICY "Users can view comments on accessible complaints" ON public.complaint_comments
    FOR SELECT
    USING (
        is_admin() 
        OR EXISTS (
            SELECT 1 FROM public.complaints 
            WHERE public.complaints.id = complaint_comments.complaint_id 
            AND public.complaints.resident_id = auth.uid()
        )
    );

-- 5. Create RLS Insert Policy
-- Admins can post comments on any complaint. Residents can only post comments on their own complaints.
DROP POLICY IF EXISTS "Users can post comments on accessible complaints" ON public.complaint_comments;
CREATE POLICY "Users can post comments on accessible complaints" ON public.complaint_comments
    FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND (
            is_admin()
            OR EXISTS (
                SELECT 1 FROM public.complaints 
                WHERE public.complaints.id = complaint_id 
                AND public.complaints.resident_id = auth.uid()
            )
        )
    );
