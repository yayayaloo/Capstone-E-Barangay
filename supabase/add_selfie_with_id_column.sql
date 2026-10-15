-- Migration: Add selfie_with_id_url column to profiles table
-- This column stores the storage path for the resident's photo holding their valid ID beside their face
-- Used for identity verification alongside the existing id_document_url

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS selfie_with_id_url TEXT DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN profiles.selfie_with_id_url IS 'Storage path for resident selfie holding their valid ID for identity verification';
