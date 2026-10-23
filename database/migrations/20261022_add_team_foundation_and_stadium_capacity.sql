-- Run this migration in the Supabase SQL editor before deploying the
-- application changes that read and write these optional team details.
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS foundation_year integer,
  ADD COLUMN IF NOT EXISTS stadium_capacity integer;

ALTER TABLE public.teams
  DROP CONSTRAINT IF EXISTS teams_foundation_year_range,
  ADD CONSTRAINT teams_foundation_year_range
    CHECK (foundation_year IS NULL OR foundation_year BETWEEN 1800 AND 2100),
  DROP CONSTRAINT IF EXISTS teams_stadium_capacity_nonnegative,
  ADD CONSTRAINT teams_stadium_capacity_nonnegative
    CHECK (stadium_capacity IS NULL OR stadium_capacity >= 0);

COMMENT ON COLUMN public.teams.foundation_year IS 'Verified founding year of the club or national football association';
COMMENT ON COLUMN public.teams.stadium_capacity IS 'Published capacity of the stadium recorded in teams.stadium, in seats';
