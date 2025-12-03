-- Migration: Add foreign key relationships to profiles for response tables
-- This allows Supabase to automatically join with profiles table
-- Run this in Supabase SQL Editor

-- Add FK constraint from poll_responses to profiles (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'poll_responses_user_id_fkey_profiles') THEN
        ALTER TABLE poll_responses
        ADD CONSTRAINT poll_responses_user_id_fkey_profiles
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add FK constraint from signup_responses to profiles (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'signup_responses_user_id_fkey_profiles') THEN
        ALTER TABLE signup_responses
        ADD CONSTRAINT signup_responses_user_id_fkey_profiles
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add FK constraint from rsvp_responses to profiles (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rsvp_responses_user_id_fkey_profiles') THEN
        ALTER TABLE rsvp_responses
        ADD CONSTRAINT rsvp_responses_user_id_fkey_profiles
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add FK constraint from survey_responses to profiles (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'survey_responses_user_id_fkey_profiles') THEN
        ALTER TABLE survey_responses
        ADD CONSTRAINT survey_responses_user_id_fkey_profiles
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;
