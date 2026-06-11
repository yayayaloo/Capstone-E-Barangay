-- Add resident_since column to store when they started living in the barangay (e.g. "Since Birth" or a year)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resident_since TEXT;
