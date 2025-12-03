-- Migration: Direct Messages Support
-- Adds DM channel type and participant tracking

-- 1. Add dm_participant_ids to channels for tracking DM participants
-- This is an array of exactly 2 user IDs for DM channels
ALTER TABLE channels ADD COLUMN IF NOT EXISTS dm_participant_ids uuid[] DEFAULT NULL;

-- 2. Add index for finding DM channels by participants
CREATE INDEX IF NOT EXISTS idx_channels_dm_participants ON channels USING GIN (dm_participant_ids);

-- 3. Update channels RLS to include DM channels
DROP POLICY IF EXISTS "Users can view their channels" ON channels;
CREATE POLICY "Users can view their channels"
    ON channels FOR SELECT
    USING (
        -- Must be a hub member
        EXISTS (
            SELECT 1 FROM hub_members hm
            WHERE hm.hub_id = channels.hub_id
            AND hm.user_id = auth.uid()
        )
        AND (
            -- Hub-wide channel (no group, no DM)
            (channels.group_id IS NULL AND channels.dm_participant_ids IS NULL)
            OR
            -- Group channel - check group membership
            (channels.group_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM group_members gm
                WHERE gm.group_id = channels.group_id
                AND gm.user_id = auth.uid()
            ))
            OR
            -- DM channel - user must be a participant
            (channels.dm_participant_ids IS NOT NULL AND auth.uid() = ANY(channels.dm_participant_ids))
        )
    );

-- 4. Update messages RLS to include DM channels
DROP POLICY IF EXISTS "Users can view messages in their channels" ON messages;
CREATE POLICY "Users can view messages in their channels"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = messages.channel_id
            AND (
                -- Hub channel (public)
                (c.group_id IS NULL AND c.dm_participant_ids IS NULL AND EXISTS (
                    SELECT 1 FROM hub_members hm
                    WHERE hm.hub_id = c.hub_id
                    AND hm.user_id = auth.uid()
                ))
                OR
                -- Group channel
                (c.group_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM group_members gm
                    WHERE gm.group_id = c.group_id
                    AND gm.user_id = auth.uid()
                ))
                OR
                -- DM channel
                (c.dm_participant_ids IS NOT NULL AND auth.uid() = ANY(c.dm_participant_ids))
            )
        )
    );

DROP POLICY IF EXISTS "Users can send messages to their channels" ON messages;
CREATE POLICY "Users can send messages to their channels"
    ON messages FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = messages.channel_id
            AND (
                -- Hub channel (public)
                (c.group_id IS NULL AND c.dm_participant_ids IS NULL AND EXISTS (
                    SELECT 1 FROM hub_members hm
                    WHERE hm.hub_id = c.hub_id
                    AND hm.user_id = auth.uid()
                ))
                OR
                -- Group channel
                (c.group_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM group_members gm
                    WHERE gm.group_id = c.group_id
                    AND gm.user_id = auth.uid()
                ))
                OR
                -- DM channel
                (c.dm_participant_ids IS NOT NULL AND auth.uid() = ANY(c.dm_participant_ids))
            )
        )
    );

-- 5. Policy for creating DM channels
DROP POLICY IF EXISTS "Users can create DM channels" ON channels;
CREATE POLICY "Users can create DM channels"
    ON channels FOR INSERT
    WITH CHECK (
        -- User must be hub member
        EXISTS (
            SELECT 1 FROM hub_members hm
            WHERE hm.hub_id = channels.hub_id
            AND hm.user_id = auth.uid()
        )
        AND (
            -- Regular channel creation (admins only)
            (channels.dm_participant_ids IS NULL AND EXISTS (
                SELECT 1 FROM hub_members hm
                WHERE hm.hub_id = channels.hub_id
                AND hm.user_id = auth.uid()
                AND hm.role IN ('owner', 'director', 'admin')
            ))
            OR
            -- DM channel - user must be one of the participants
            (channels.dm_participant_ids IS NOT NULL AND auth.uid() = ANY(channels.dm_participant_ids))
        )
    );

-- 6. Function to get or create a DM channel between two users
CREATE OR REPLACE FUNCTION get_or_create_dm_channel(
    p_hub_id uuid,
    p_user1_id uuid,
    p_user2_id uuid
) RETURNS uuid AS $$
DECLARE
    v_channel_id uuid;
    v_participants uuid[];
BEGIN
    -- Sort participant IDs to ensure consistent ordering
    IF p_user1_id < p_user2_id THEN
        v_participants := ARRAY[p_user1_id, p_user2_id];
    ELSE
        v_participants := ARRAY[p_user2_id, p_user1_id];
    END IF;

    -- Try to find existing DM channel
    SELECT id INTO v_channel_id
    FROM channels
    WHERE hub_id = p_hub_id
    AND dm_participant_ids = v_participants
    LIMIT 1;

    -- If not found, create one
    IF v_channel_id IS NULL THEN
        INSERT INTO channels (hub_id, name, type, dm_participant_ids, created_by)
        VALUES (p_hub_id, 'DM', 'private', v_participants, p_user1_id)
        RETURNING id INTO v_channel_id;
    END IF;

    RETURN v_channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
