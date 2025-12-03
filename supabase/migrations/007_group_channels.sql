-- Migration: Group Channels System
-- Links groups to channels and manages channel membership

-- 1. Add group_id to channels table to link channels to groups
ALTER TABLE channels ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id) ON DELETE CASCADE;

-- 2. Create channel_members table to track who has access to which channels
CREATE TABLE IF NOT EXISTS channel_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id uuid REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    added_at timestamptz DEFAULT now(),
    UNIQUE(channel_id, user_id)
);

-- 3. Enable RLS on channel_members
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for channel_members
DROP POLICY IF EXISTS "Users can view channels they are members of" ON channel_members;
CREATE POLICY "Users can view channels they are members of"
    ON channel_members FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage channel members" ON channel_members;
CREATE POLICY "Admins can manage channel members"
    ON channel_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM channels c
            JOIN hub_members hm ON hm.hub_id = c.hub_id
            WHERE c.id = channel_members.channel_id
            AND hm.user_id = auth.uid()
            AND hm.role IN ('owner', 'director', 'admin')
        )
    );

-- 5. Update channels RLS to allow viewing channels user is member of
-- For hub-wide channels: any hub member can view
-- For group channels: only group members can view (not via channel_members to avoid recursion)
DROP POLICY IF EXISTS "Users can view their channels" ON channels;
CREATE POLICY "Users can view their channels"
    ON channels FOR SELECT
    USING (
        -- User is a member of the hub AND either:
        -- 1. Channel is hub-wide (no group_id), OR
        -- 2. User is a member of the channel's group
        EXISTS (
            SELECT 1 FROM hub_members hm
            WHERE hm.hub_id = channels.hub_id
            AND hm.user_id = auth.uid()
        )
        AND (
            -- Hub-wide channel (no group)
            channels.group_id IS NULL
            OR
            -- Group channel - check group membership directly (avoid channel_members recursion)
            EXISTS (
                SELECT 1 FROM group_members gm
                WHERE gm.group_id = channels.group_id
                AND gm.user_id = auth.uid()
            )
        )
    );

-- 6. Update messages RLS to check channel membership
DROP POLICY IF EXISTS "Users can view messages in their channels" ON messages;
CREATE POLICY "Users can view messages in their channels"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = messages.channel_id
            AND (
                -- Public hub channel
                EXISTS (
                    SELECT 1 FROM hub_members hm
                    WHERE hm.hub_id = c.hub_id
                    AND hm.user_id = auth.uid()
                    AND c.group_id IS NULL
                )
                OR
                -- Group channel - must be group member
                EXISTS (
                    SELECT 1 FROM group_members gm
                    WHERE gm.group_id = c.group_id
                    AND gm.user_id = auth.uid()
                )
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
                -- Public hub channel
                EXISTS (
                    SELECT 1 FROM hub_members hm
                    WHERE hm.hub_id = c.hub_id
                    AND hm.user_id = auth.uid()
                    AND c.group_id IS NULL
                )
                OR
                -- Group channel - must be group member
                EXISTS (
                    SELECT 1 FROM group_members gm
                    WHERE gm.group_id = c.group_id
                    AND gm.user_id = auth.uid()
                )
            )
        )
    );

-- 7. Index for performance
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_group_id ON channels(group_id);

-- 8. Function to create a channel when a group is created
CREATE OR REPLACE FUNCTION create_group_channel()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO channels (hub_id, name, type, group_id, created_by)
    VALUES (NEW.hub_id, NEW.name, 'private', NEW.id, NEW.created_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Trigger to auto-create channel on group creation
DROP TRIGGER IF EXISTS on_group_created ON groups;
CREATE TRIGGER on_group_created
    AFTER INSERT ON groups
    FOR EACH ROW
    EXECUTE FUNCTION create_group_channel();

-- 10. Function to sync group membership to channel membership
CREATE OR REPLACE FUNCTION sync_group_channel_membership()
RETURNS TRIGGER AS $$
DECLARE
    channel_uuid uuid;
BEGIN
    -- Find the channel for this group
    SELECT id INTO channel_uuid FROM channels WHERE group_id = COALESCE(NEW.group_id, OLD.group_id) LIMIT 1;

    IF channel_uuid IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Add user to channel when they join the group
        INSERT INTO channel_members (channel_id, user_id)
        VALUES (channel_uuid, NEW.user_id)
        ON CONFLICT (channel_id, user_id) DO NOTHING;
    ELSIF TG_OP = 'DELETE' THEN
        -- Remove user from channel when they leave the group
        DELETE FROM channel_members
        WHERE channel_id = channel_uuid AND user_id = OLD.user_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Trigger to sync membership
DROP TRIGGER IF EXISTS on_group_member_change ON group_members;
CREATE TRIGGER on_group_member_change
    AFTER INSERT OR DELETE ON group_members
    FOR EACH ROW
    EXECUTE FUNCTION sync_group_channel_membership();

-- 12. Backfill: Create channels for existing groups that don't have one
INSERT INTO channels (hub_id, name, type, group_id, created_by)
SELECT g.hub_id, g.name, 'private', g.id, g.created_by
FROM groups g
WHERE NOT EXISTS (
    SELECT 1 FROM channels c WHERE c.group_id = g.id
);

-- 13. Backfill: Add existing group members to their group channels
INSERT INTO channel_members (channel_id, user_id)
SELECT c.id, gm.user_id
FROM channels c
JOIN group_members gm ON gm.group_id = c.group_id
WHERE c.group_id IS NOT NULL
ON CONFLICT (channel_id, user_id) DO NOTHING;
