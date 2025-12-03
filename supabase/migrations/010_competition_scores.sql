-- Migration: Create competition_scores table
-- Stores individual gymnast scores for competition events

CREATE TABLE IF NOT EXISTS competition_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    gymnast_profile_id UUID NOT NULL REFERENCES gymnast_profiles(id) ON DELETE CASCADE,
    event TEXT NOT NULL,  -- 'vault', 'bars', 'beam', 'floor', 'pommel', 'rings', 'pbars', 'highbar'
    score DECIMAL(5,3),   -- e.g., 9.500 for WAG, 14.250 for MAG
    placement INTEGER,    -- 1, 2, 3, etc. (nullable - entered manually)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),

    UNIQUE(competition_id, gymnast_profile_id, event)
);

-- Enable RLS
ALTER TABLE competition_scores ENABLE ROW LEVEL SECURITY;

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_competition_scores_competition_id ON competition_scores(competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_scores_gymnast_profile_id ON competition_scores(gymnast_profile_id);

-- RLS Policies

-- Anyone in the hub can view scores
DROP POLICY IF EXISTS "Hub members can view competition scores" ON competition_scores;
CREATE POLICY "Hub members can view competition scores"
    ON competition_scores FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN hub_members hm ON hm.hub_id = c.hub_id
            WHERE c.id = competition_scores.competition_id
            AND hm.user_id = auth.uid()
        )
    );

-- Staff can insert scores
DROP POLICY IF EXISTS "Staff can insert competition scores" ON competition_scores;
CREATE POLICY "Staff can insert competition scores"
    ON competition_scores FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN hub_members hm ON hm.hub_id = c.hub_id
            WHERE c.id = competition_scores.competition_id
            AND hm.user_id = auth.uid()
            AND hm.role IN ('owner', 'director', 'admin', 'coach')
        )
    );

-- Staff can update scores
DROP POLICY IF EXISTS "Staff can update competition scores" ON competition_scores;
CREATE POLICY "Staff can update competition scores"
    ON competition_scores FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN hub_members hm ON hm.hub_id = c.hub_id
            WHERE c.id = competition_scores.competition_id
            AND hm.user_id = auth.uid()
            AND hm.role IN ('owner', 'director', 'admin', 'coach')
        )
    );

-- Staff can delete scores
DROP POLICY IF EXISTS "Staff can delete competition scores" ON competition_scores;
CREATE POLICY "Staff can delete competition scores"
    ON competition_scores FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN hub_members hm ON hm.hub_id = c.hub_id
            WHERE c.id = competition_scores.competition_id
            AND hm.user_id = auth.uid()
            AND hm.role IN ('owner', 'director', 'admin', 'coach')
        )
    );
