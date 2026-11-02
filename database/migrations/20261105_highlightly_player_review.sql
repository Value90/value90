-- Preserve player match details until an administrator reviews the identity.
-- Run once in the SQL Editor of the new Value90 Supabase project.

ALTER TABLE public.external_player_mappings
  ADD COLUMN IF NOT EXISTS minutes_played integer,
  ADD COLUMN IF NOT EXISTS substitute_in_minute integer,
  ADD COLUMN IF NOT EXISTS substitute_out_minute integer,
  ADD COLUMN IF NOT EXISTS review_decision text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'external_player_mappings_minutes_played_check'
      AND conrelid = 'public.external_player_mappings'::regclass
  ) THEN
    ALTER TABLE public.external_player_mappings
      ADD CONSTRAINT external_player_mappings_minutes_played_check
      CHECK (minutes_played IS NULL OR minutes_played BETWEEN 0 AND 130);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'external_player_mappings_substitute_minutes_check'
      AND conrelid = 'public.external_player_mappings'::regclass
  ) THEN
    ALTER TABLE public.external_player_mappings
      ADD CONSTRAINT external_player_mappings_substitute_minutes_check
      CHECK (
        (substitute_in_minute IS NULL OR substitute_in_minute BETWEEN 0 AND 130)
        AND (substitute_out_minute IS NULL OR substitute_out_minute BETWEEN 0 AND 130)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'external_player_mappings_review_decision_check'
      AND conrelid = 'public.external_player_mappings'::regclass
  ) THEN
    ALTER TABLE public.external_player_mappings
      ADD CONSTRAINT external_player_mappings_review_decision_check
      CHECK (review_decision IS NULL OR review_decision IN ('matched_existing', 'confirmed_new'));
  END IF;
END $$;

COMMENT ON COLUMN public.external_player_mappings.minutes_played IS
  'Provider minutes held for manual player review; copied to participations after identity resolution.';
COMMENT ON COLUMN public.external_player_mappings.review_decision IS
  'Administrator resolution: matched_existing or confirmed_new.';

-- Profiles created by the recent Highlightly import are provisional. Keep their
-- existing player_id so the review UI can show/edit the provisional record, but
-- stop treating the external identity as trusted until it is explicitly reviewed.
UPDATE public.external_player_mappings AS mapping
SET status = 'pending', review_decision = NULL, reviewed_at = NULL, updated_at = now()
FROM public.players AS player
WHERE mapping.provider = 'highlightly'
  AND mapping.player_id = player.id
  AND mapping.status = 'linked'
  AND mapping.review_decision IS NULL
  AND player.created_at >= now() - interval '7 days';
