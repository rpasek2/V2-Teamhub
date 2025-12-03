-- Migration: Add rsvp_enabled column to events table
-- Run this in Supabase SQL Editor

ALTER TABLE events
ADD COLUMN IF NOT EXISTS rsvp_enabled boolean DEFAULT true;

-- Verify the column was added
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'events' AND column_name = 'rsvp_enabled';
