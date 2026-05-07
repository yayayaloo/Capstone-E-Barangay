-- Performance Optimization Indexes
-- Run these in the Supabase SQL Editor to make sorting and filtering lighting fast

-- 1. Index for fetching recent requests (used heavily in Admin and Resident Dashboard)
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_resident_id ON service_requests(resident_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);

-- 2. Index for Resident Profiles (used for fetching and verifying residents)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- 3. Index for Announcements (used on the landing page and dashboards)
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON announcements(published_at DESC);

-- 4. Index for Audit Logs (avoids full table scans when admins view logs)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 5. Index for Complaints and Blotters
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blotter_reports_created_at ON blotter_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_resident_id ON complaints(resident_id);
