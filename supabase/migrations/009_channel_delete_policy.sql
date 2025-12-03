-- Migration: Add DELETE policy for channels
-- Allows owners, directors, and admins to delete channels

DROP POLICY IF EXISTS "Admins can delete channels" ON channels;
CREATE POLICY "Admins can delete channels"
    ON channels FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM hub_members hm
            WHERE hm.hub_id = channels.hub_id
            AND hm.user_id = auth.uid()
            AND hm.role IN ('owner', 'director', 'admin')
        )
        -- Don't allow deleting group channels directly (they should be deleted with the group)
        AND channels.group_id IS NULL
    );
