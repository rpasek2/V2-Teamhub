-- Add events column to competition_gymnasts table
-- This stores an array of events the gymnast is competing in at this competition
-- Events are stored as text array: ['vault', 'bars', 'beam', 'floor'] for WAG
-- or ['floor', 'pommel', 'rings', 'vault', 'pbars', 'highbar'] for MAG

ALTER TABLE competition_gymnasts
ADD COLUMN IF NOT EXISTS events text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN competition_gymnasts.events IS 'Array of events the gymnast is competing in. Valid values: vault, bars, beam, floor (WAG) or floor, pommel, rings, vault, pbars, highbar (MAG)';
