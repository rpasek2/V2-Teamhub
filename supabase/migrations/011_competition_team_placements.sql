-- Migration: Create competition_team_placements table
-- Stores team placement info for each level/gender/event combination

CREATE TABLE IF NOT EXISTS competition_team_placements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    level TEXT NOT NULL,           -- 'Level 7', 'Gold', etc.
    gender TEXT NOT NULL,          -- 'Female', 'Male'
    event TEXT NOT NULL,           -- 'vault', 'bars', etc. or 'all_around' for team AA
    placement INTEGER,             -- 1, 2, 3, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(competition_id, level, gender, event)
);

-- Enable RLS
ALTER TABLE competition_team_placements ENABLE ROW LEVEL SECURITY;

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_competition_team_placements_competition_id ON competition_team_placements(competition_id);

-- RLS Policies

-- Anyone in the hub can view team placements
DROP POLICY IF EXISTS "Hub members can view team placements" ON competition_team_placements;
CREATE POLICY "Hub members can view team placements"
    ON competition_team_placements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN hub_members hm ON hm.hub_id = c.hub_id
            WHERE c.id = competition_team_placements.competition_id
            AND hm.user_id = auth.uid()
        )
    );

-- Staff can insert team placements
DROP POLICY IF EXISTS "Staff can insert team placements" ON competition_team_placements;
CREATE POLICY "Staff can insert team placements"
    ON competition_team_placements FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN hub_members hm ON hm.hub_id = c.hub_id
            WHERE c.id = competition_team_placements.competition_id
            AND hm.user_id = auth.uid()
            AND hm.role IN ('owner', 'director', 'admin', 'coach')
        )
    );

-- Staff can update team placements
DROP POLICY IF EXISTS "Staff can update team placements" ON competition_team_placements;
CREATE POLICY "Staff can update team placements"
    ON competition_team_placements FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN hub_members hm ON hm.hub_id = c.hub_id
            WHERE c.id = competition_team_placements.competition_id
            AND hm.user_id = auth.uid()
            AND hm.role IN ('owner', 'director', 'admin', 'coach')
        )
    );

-- Staff can delete team placements
DROP POLICY IF EXISTS "Staff can delete team placements" ON competition_team_placements;
CREATE POLICY "Staff can delete team placements"
    ON competition_team_placements FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN hub_members hm ON hm.hub_id = c.hub_id
            WHERE c.id = competition_team_placements.competition_id
            AND hm.user_id = auth.uid()
            AND hm.role IN ('owner', 'director', 'admin', 'coach')
        )
    );
