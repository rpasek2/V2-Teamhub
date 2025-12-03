-- Migration: Post Reactions System
-- Run this in Supabase SQL Editor

-- 1. Create post_reactions table
CREATE TABLE IF NOT EXISTS post_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'heart', 'celebrate')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(post_id, user_id)
);

-- 2. Add foreign key to profiles for joining
ALTER TABLE post_reactions
ADD CONSTRAINT post_reactions_user_id_fkey_profiles
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. Enable RLS
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view all reactions"
    ON post_reactions FOR SELECT
    USING (true);

CREATE POLICY "Users can add their own reactions"
    ON post_reactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
    ON post_reactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
    ON post_reactions FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Index for performance
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON post_reactions(user_id);
