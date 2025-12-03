-- Migration: Add unique constraints to gymnast_profiles table
-- Run this in Supabase SQL Editor

-- Prevent duplicate gymnast_id within a hub (already exists)
-- ALTER TABLE gymnast_profiles
-- ADD CONSTRAINT unique_gymnast_id_per_hub UNIQUE (hub_id, gymnast_id);

-- Prevent duplicate gymnasts based on name and DOB within a hub
ALTER TABLE gymnast_profiles
ADD CONSTRAINT unique_gymnast_name_dob_hub UNIQUE (hub_id, first_name, last_name, date_of_birth);
