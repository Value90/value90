-- Preserve provider box-score statistics while a historical player identity is
-- waiting for manual review. The resolver copies them to player_match_stats.

ALTER TABLE public.external_player_mappings
  ADD COLUMN IF NOT EXISTS source_statistics jsonb;

COMMENT ON COLUMN public.external_player_mappings.source_statistics IS
  'Highlightly player match statistics staged until an administrator resolves the player identity.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_player_mappings TO authenticated;
GRANT ALL ON public.external_player_mappings TO service_role;
