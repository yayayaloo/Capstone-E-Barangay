-- =============================================
-- Migration: Fix Complaints CHECK constraint & Audit Log Foreign Key
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Remove check constraint on complaint_type to allow custom type entries
ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_complaint_type_check;

-- 2. Modify audit logs foreign key to SET NULL instead of CASCADE on admin profile delete
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_performed_by_fkey;
ALTER TABLE audit_logs ALTER COLUMN performed_by DROP NOT NULL;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_performed_by_fkey 
    FOREIGN KEY (performed_by) REFERENCES profiles(id) ON DELETE SET NULL;
