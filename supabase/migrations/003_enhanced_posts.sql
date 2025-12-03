-- Migration: Enhanced Posts System for Groups
-- Run this in Supabase SQL Editor

-- 1. Add attachments column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]';

-- 2. Add pinned column for pinning posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- 3. Poll responses table
CREATE TABLE IF NOT EXISTS poll_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    option_indices integer[] NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(post_id, user_id)
);

-- 4. Sign-up responses table
CREATE TABLE IF NOT EXISTS signup_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    slot_index integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(post_id, user_id, slot_index)
);

-- 5. RSVP responses table
CREATE TABLE IF NOT EXISTS rsvp_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('going', 'not_going', 'maybe')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(post_id, user_id)
);

-- 6. Survey responses table
CREATE TABLE IF NOT EXISTS survey_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    answers jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(post_id, user_id)
);

-- 7. Enable RLS on new tables
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE signup_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for poll_responses
CREATE POLICY "Users can view poll responses for posts they can see"
    ON poll_responses FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own poll responses"
    ON poll_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own poll responses"
    ON poll_responses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own poll responses"
    ON poll_responses FOR DELETE
    USING (auth.uid() = user_id);

-- 9. RLS Policies for signup_responses
CREATE POLICY "Users can view signup responses for posts they can see"
    ON signup_responses FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own signup responses"
    ON signup_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own signup responses"
    ON signup_responses FOR DELETE
    USING (auth.uid() = user_id);

-- 10. RLS Policies for rsvp_responses
CREATE POLICY "Users can view rsvp responses for posts they can see"
    ON rsvp_responses FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own rsvp responses"
    ON rsvp_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rsvp responses"
    ON rsvp_responses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rsvp responses"
    ON rsvp_responses FOR DELETE
    USING (auth.uid() = user_id);

-- 11. RLS Policies for survey_responses
CREATE POLICY "Users can view survey responses for posts they can see"
    ON survey_responses FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own survey responses"
    ON survey_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own survey responses"
    ON survey_responses FOR DELETE
    USING (auth.uid() = user_id);

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_poll_responses_post_id ON poll_responses(post_id);
CREATE INDEX IF NOT EXISTS idx_signup_responses_post_id ON signup_responses(post_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_post_id ON rsvp_responses(post_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_post_id ON survey_responses(post_id);
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON posts(is_pinned) WHERE is_pinned = true;
