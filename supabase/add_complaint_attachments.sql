-- =============================================
-- Migration: Add attachment_url to complaints table
-- Run this in Supabase SQL Editor
-- =============================================

ALTER TABLE complaints ADD COLUMN IF NOT EXISTS attachment_url TEXT;
