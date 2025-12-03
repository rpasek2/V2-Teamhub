-- Migration: Marketplace Hub Linking
-- Allows hubs to share their marketplaces with other hubs

-- Table to store hub linking requests and active links
CREATE TABLE IF NOT EXISTS marketplace_hub_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    target_hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'rejected'
    requested_by UUID NOT NULL REFERENCES profiles(id), -- User who initiated the link
    approved_by UUID REFERENCES profiles(id), -- User who approved (null if pending/rejected)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique link requests (no duplicates in either direction)
    UNIQUE(requester_hub_id, target_hub_id),
    -- Prevent self-linking
    CHECK (requester_hub_id != target_hub_id)
);

-- Enable RLS
ALTER TABLE marketplace_hub_links ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_hub_links_requester ON marketplace_hub_links(requester_hub_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_hub_links_target ON marketplace_hub_links(target_hub_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_hub_links_status ON marketplace_hub_links(status);

-- RLS Policies

-- Hub owners can view link requests involving their hub
DROP POLICY IF EXISTS "Hub owners can view marketplace links" ON marketplace_hub_links;
CREATE POLICY "Hub owners can view marketplace links"
    ON marketplace_hub_links FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM hub_members hm
            WHERE (hm.hub_id = marketplace_hub_links.requester_hub_id OR hm.hub_id = marketplace_hub_links.target_hub_id)
            AND hm.user_id = auth.uid()
            AND hm.role = 'owner'
        )
    );

-- Hub owners can create link requests from their hub
DROP POLICY IF EXISTS "Hub owners can create marketplace link requests" ON marketplace_hub_links;
CREATE POLICY "Hub owners can create marketplace link requests"
    ON marketplace_hub_links FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM hub_members hm
            WHERE hm.hub_id = marketplace_hub_links.requester_hub_id
            AND hm.user_id = auth.uid()
            AND hm.role = 'owner'
        )
        AND requested_by = auth.uid()
    );

-- Hub owners can update links involving their hub (approve/reject)
DROP POLICY IF EXISTS "Hub owners can update marketplace links" ON marketplace_hub_links;
CREATE POLICY "Hub owners can update marketplace links"
    ON marketplace_hub_links FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM hub_members hm
            WHERE (hm.hub_id = marketplace_hub_links.requester_hub_id OR hm.hub_id = marketplace_hub_links.target_hub_id)
            AND hm.user_id = auth.uid()
            AND hm.role = 'owner'
        )
    );

-- Hub owners can delete/cancel links
DROP POLICY IF EXISTS "Hub owners can delete marketplace links" ON marketplace_hub_links;
CREATE POLICY "Hub owners can delete marketplace links"
    ON marketplace_hub_links FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM hub_members hm
            WHERE (hm.hub_id = marketplace_hub_links.requester_hub_id OR hm.hub_id = marketplace_hub_links.target_hub_id)
            AND hm.user_id = auth.uid()
            AND hm.role = 'owner'
        )
    );

-- Function to get all linked hub IDs for a given hub (including the hub itself)
CREATE OR REPLACE FUNCTION get_linked_marketplace_hubs(hub_uuid UUID)
RETURNS TABLE(hub_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT hub_uuid as hub_id
    UNION
    SELECT mhl.target_hub_id as hub_id
    FROM marketplace_hub_links mhl
    WHERE mhl.requester_hub_id = hub_uuid AND mhl.status = 'active'
    UNION
    SELECT mhl.requester_hub_id as hub_id
    FROM marketplace_hub_links mhl
    WHERE mhl.target_hub_id = hub_uuid AND mhl.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update marketplace_items SELECT policy to include linked hubs
DROP POLICY IF EXISTS "Hub members can view marketplace items" ON marketplace_items;
CREATE POLICY "Hub members can view marketplace items"
    ON marketplace_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM hub_members hm
            WHERE hm.user_id = auth.uid()
            AND (
                -- User is member of the item's hub
                hm.hub_id = marketplace_items.hub_id
                OR
                -- User's hub is linked to the item's hub
                EXISTS (
                    SELECT 1 FROM marketplace_hub_links mhl
                    WHERE mhl.status = 'active'
                    AND (
                        (mhl.requester_hub_id = hm.hub_id AND mhl.target_hub_id = marketplace_items.hub_id)
                        OR
                        (mhl.target_hub_id = hm.hub_id AND mhl.requester_hub_id = marketplace_items.hub_id)
                    )
                )
            )
        )
    );
