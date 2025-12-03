-- Drop existing table if needed to recreate with new schema
DROP TABLE IF EXISTS gymnast_profiles CASCADE;

-- Create gymnast_profiles table
CREATE TABLE gymnast_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    gymnast_id TEXT NOT NULL,

    -- Basic Information
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
    level TEXT,

    -- Member ID Information
    member_id TEXT,
    member_id_type TEXT CHECK (member_id_type IN ('USAG', 'AAU', 'Other')),

    -- Sizes
    tshirt_size TEXT CHECK (tshirt_size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL')),
    leo_size TEXT CHECK (leo_size IN ('XS', 'S', 'M', 'L', 'XL', 'AS', 'AM', 'AL', 'AXL')),

    -- Guardian Information (stored as JSONB)
    guardian_1 JSONB,
    guardian_2 JSONB,

    -- Medical Information (stored as JSONB)
    medical_info JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    -- Each gymnast gets a unique ID within their hub
    CONSTRAINT unique_gymnast_id_per_hub UNIQUE (hub_id, gymnast_id),
    -- Prevent duplicate gymnasts based on name and DOB within a hub
    CONSTRAINT unique_gymnast_name_dob_hub UNIQUE (hub_id, first_name, last_name, date_of_birth)
);

-- Create indexes for faster lookups
CREATE INDEX idx_gymnast_profiles_user_id ON gymnast_profiles(user_id);
CREATE INDEX idx_gymnast_profiles_hub_id ON gymnast_profiles(hub_id);
CREATE INDEX idx_gymnast_profiles_user_hub ON gymnast_profiles(user_id, hub_id);
CREATE INDEX idx_gymnast_profiles_gymnast_id ON gymnast_profiles(hub_id, gymnast_id);

-- Function to auto-generate gymnast_id for each hub
CREATE OR REPLACE FUNCTION set_gymnast_id()
RETURNS TRIGGER AS $$
DECLARE
    hub_slug TEXT;
    hub_code TEXT;
    next_number INTEGER;
BEGIN
    -- Get the hub's slug
    SELECT slug INTO hub_slug FROM hubs WHERE id = NEW.hub_id;

    -- Create hub code from slug (first 3 characters, uppercase)
    hub_code := UPPER(LEFT(hub_slug, 3));

    -- Get the next sequential number for this hub by counting existing gymnasts
    SELECT COUNT(*) + 1
    INTO next_number
    FROM gymnast_profiles
    WHERE hub_id = NEW.hub_id;

    -- Format as HUB-00001
    NEW.gymnast_id := hub_code || '-' || LPAD(next_number::TEXT, 5, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set gymnast_id before insert
CREATE TRIGGER set_gymnast_id_trigger
    BEFORE INSERT ON gymnast_profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_gymnast_id();

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_gymnast_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gymnast_profiles_updated_at
    BEFORE UPDATE ON gymnast_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_gymnast_profiles_updated_at();

-- Row Level Security Policies
ALTER TABLE gymnast_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view gymnast profiles in their hub
CREATE POLICY "enable_select_for_hub_members"
ON gymnast_profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM hub_members
        WHERE hub_members.hub_id = gymnast_profiles.hub_id
        AND hub_members.user_id = auth.uid()
    )
);

-- Allow hub staff (owner, admin, director, coach) to insert gymnast profiles
CREATE POLICY "enable_insert_for_hub_staff"
ON gymnast_profiles FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM hub_members
        WHERE hub_members.hub_id = gymnast_profiles.hub_id
        AND hub_members.user_id = auth.uid()
        AND hub_members.role IN ('owner', 'admin', 'director', 'coach')
    )
);

-- Allow hub staff and the gymnast themselves to update profiles
CREATE POLICY "enable_update_for_hub_staff_and_self"
ON gymnast_profiles FOR UPDATE
USING (
    -- Hub staff can update
    EXISTS (
        SELECT 1 FROM hub_members
        WHERE hub_members.hub_id = gymnast_profiles.hub_id
        AND hub_members.user_id = auth.uid()
        AND hub_members.role IN ('owner', 'admin', 'director', 'coach')
    )
    OR
    -- User can update their own profile
    gymnast_profiles.user_id = auth.uid()
);

-- Only hub staff can delete profiles
CREATE POLICY "enable_delete_for_hub_staff"
ON gymnast_profiles FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM hub_members
        WHERE hub_members.hub_id = gymnast_profiles.hub_id
        AND hub_members.user_id = auth.uid()
        AND hub_members.role IN ('owner', 'admin', 'director', 'coach')
    )
);

-- Add comments for documentation
COMMENT ON TABLE gymnast_profiles IS 'Stores detailed profile information for gymnasts including guardians and medical information';
COMMENT ON COLUMN gymnast_profiles.gymnast_id IS 'Auto-generated hub-specific ID for each gymnast (e.g., ABC-00001, XYZ-00042)';
COMMENT ON COLUMN gymnast_profiles.guardian_1 IS 'Primary guardian information stored as JSON: {first_name, last_name, email, phone}';
COMMENT ON COLUMN gymnast_profiles.guardian_2 IS 'Secondary guardian information stored as JSON: {first_name, last_name, email, phone}';
COMMENT ON COLUMN gymnast_profiles.medical_info IS 'Medical information stored as JSON: {allergies, medications, conditions, notes}';
