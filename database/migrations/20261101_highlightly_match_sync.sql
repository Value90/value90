-- Highlightly fixture identity and idempotent lineup/result synchronization.
-- Apply this migration in the Supabase SQL editor before using the integration.

CREATE TABLE IF NOT EXISTS public.external_team_mappings (
  provider text NOT NULL DEFAULT 'highlightly',
  external_team_id bigint NOT NULL,
  team_id bigint NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, external_team_id),
  UNIQUE (provider, team_id)
);

CREATE TABLE IF NOT EXISTS public.external_match_mappings (
  provider text NOT NULL DEFAULT 'highlightly',
  external_match_id bigint NOT NULL,
  match_id bigint NOT NULL UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE,
  lineup_synced_at timestamptz,
  final_synced_at timestamptz,
  next_result_sync_at timestamptz,
  next_lineup_sync_at timestamptz,
  result_attempts integer NOT NULL DEFAULT 0,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, external_match_id)
);

CREATE TABLE IF NOT EXISTS public.external_match_import_runs (
  provider text NOT NULL DEFAULT 'highlightly',
  scope text NOT NULL,
  season_year integer NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  imported_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (provider, scope, season_year)
);

CREATE INDEX IF NOT EXISTS external_match_mappings_pending_lineup_idx
  ON public.external_match_mappings (lineup_synced_at)
  WHERE lineup_synced_at IS NULL;
CREATE INDEX IF NOT EXISTS external_match_mappings_pending_final_idx
  ON public.external_match_mappings (final_synced_at)
  WHERE final_synced_at IS NULL;

CREATE TABLE IF NOT EXISTS public.external_player_mappings (
  provider text NOT NULL DEFAULT 'highlightly',
  external_player_key text NOT NULL,
  external_player_id bigint,
  player_id bigint REFERENCES public.players(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'linked')),
  source_name text NOT NULL,
  team_id bigint NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id bigint NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  shirt_number integer,
  position_id bigint REFERENCES public.positions(id) ON DELETE SET NULL,
  match_id bigint NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  is_starting_xi boolean NOT NULL DEFAULT false,
  captain boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, external_player_key, match_id)
);

CREATE INDEX IF NOT EXISTS external_player_mappings_pending_idx
  ON public.external_player_mappings (created_at DESC)
  WHERE status = 'pending';

ALTER TABLE public.external_team_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_match_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_match_import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_player_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS external_team_mappings_admin_access ON public.external_team_mappings;
CREATE POLICY external_team_mappings_admin_access ON public.external_team_mappings
  FOR ALL TO authenticated USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'pastues@icloud.com') WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'pastues@icloud.com');
DROP POLICY IF EXISTS external_match_mappings_admin_access ON public.external_match_mappings;
CREATE POLICY external_match_mappings_admin_access ON public.external_match_mappings
  FOR ALL TO authenticated USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'pastues@icloud.com') WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'pastues@icloud.com');
DROP POLICY IF EXISTS external_match_import_runs_admin_access ON public.external_match_import_runs;
CREATE POLICY external_match_import_runs_admin_access ON public.external_match_import_runs
  FOR ALL TO authenticated USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'pastues@icloud.com') WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'pastues@icloud.com');
DROP POLICY IF EXISTS external_player_mappings_admin_access ON public.external_player_mappings;
CREATE POLICY external_player_mappings_admin_access ON public.external_player_mappings
  FOR ALL TO authenticated USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'pastues@icloud.com') WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'pastues@icloud.com');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_team_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_match_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_match_import_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_player_mappings TO authenticated;
GRANT ALL ON public.external_team_mappings, public.external_match_mappings,
  public.external_match_import_runs, public.external_player_mappings TO service_role;

