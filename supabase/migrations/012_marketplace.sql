-- Migration: Create marketplace_items table
-- Stores items for sale within a hub's marketplace

CREATE TABLE IF NOT EXISTS marketplace_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0, -- 0 for free items
    category TEXT NOT NULL, -- 'leos', 'warmups', 'grips', 'equipment', 'bags', 'accessories', 'other'
    condition TEXT NOT NULL, -- 'new', 'like_new', 'good', 'fair'
    size TEXT,
    brand TEXT,
    images TEXT[] DEFAULT '{}', -- Array of image URLs
    phone TEXT NOT NULL, -- Required for contact
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'pending', 'sold'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_marketplace_items_hub_id ON marketplace_items(hub_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_seller_id ON marketplace_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_category ON marketplace_items(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_status ON marketplace_items(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_created_at ON marketplace_items(created_at DESC);

-- RLS Policies

-- Anyone in the hub can view active items
DROP POLICY IF EXISTS "Hub members can view marketplace items" ON marketplace_items;
CREATE POLICY "Hub members can view marketplace items"
    ON marketplace_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM hub_members hm
            WHERE hm.hub_id = marketplace_items.hub_id
            AND hm.user_id = auth.uid()
        )
    );

-- Any hub member can create items
DROP POLICY IF EXISTS "Hub members can create marketplace items" ON marketplace_items;
CREATE POLICY "Hub members can create marketplace items"
    ON marketplace_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM hub_members hm
            WHERE hm.hub_id = marketplace_items.hub_id
            AND hm.user_id = auth.uid()
        )
        AND seller_id = auth.uid()
    );

-- Sellers can update their own items
DROP POLICY IF EXISTS "Sellers can update own items" ON marketplace_items;
CREATE POLICY "Sellers can update own items"
    ON marketplace_items FOR UPDATE
    USING (seller_id = auth.uid());

-- Staff can update any item (for moderation)
DROP POLICY IF EXISTS "Staff can update any marketplace item" ON marketplace_items;
CREATE POLICY "Staff can update any marketplace item"
    ON marketplace_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM hub_members hm
            WHERE hm.hub_id = marketplace_items.hub_id
            AND hm.user_id = auth.uid()
            AND hm.role IN ('owner', 'director', 'admin', 'coach')
        )
    );

-- Sellers can delete their own items
DROP POLICY IF EXISTS "Sellers can delete own items" ON marketplace_items;
CREATE POLICY "Sellers can delete own items"
    ON marketplace_items FOR DELETE
    USING (seller_id = auth.uid());

-- Staff can delete any item (for moderation)
DROP POLICY IF EXISTS "Staff can delete any marketplace item" ON marketplace_items;
CREATE POLICY "Staff can delete any marketplace item"
    ON marketplace_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM hub_members hm
            WHERE hm.hub_id = marketplace_items.hub_id
            AND hm.user_id = auth.uid()
            AND hm.role IN ('owner', 'director', 'admin', 'coach')
        )
    );

-- Create storage bucket for marketplace images
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-images', 'marketplace-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for marketplace images
DROP POLICY IF EXISTS "Hub members can upload marketplace images" ON storage.objects;
CREATE POLICY "Hub members can upload marketplace images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'marketplace-images'
        AND auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "Anyone can view marketplace images" ON storage.objects;
CREATE POLICY "Anyone can view marketplace images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'marketplace-images');

DROP POLICY IF EXISTS "Users can delete own marketplace images" ON storage.objects;
CREATE POLICY "Users can delete own marketplace images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'marketplace-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
