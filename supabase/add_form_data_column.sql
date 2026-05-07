-- =============================================
-- Migration: Add form_data column to service_requests
-- =============================================

-- Add the JSONB column to store dynamic form data based on document type
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}'::jsonb;
