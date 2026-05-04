-- Migration: Add is_rejected column to profiles table
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_rejected BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional: add a comment describing the column
COMMENT ON COLUMN profiles.is_rejected IS 'Set to true when an admin explicitly rejects a resident registration';
