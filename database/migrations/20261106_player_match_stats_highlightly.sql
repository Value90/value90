-- Align player match statistics with the fields Value90 will import from Highlightly.
-- The owner requested removal of these two obsolete statistics. Dropping these
-- columns also removes any historical values stored in them.
ALTER TABLE public.player_match_stats
  DROP COLUMN IF EXISTS clearances,
  DROP COLUMN IF EXISTS goal_errors;
