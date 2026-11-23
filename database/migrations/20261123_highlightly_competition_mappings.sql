-- Links each Value90 competition to its Highlightly league identifier.
CREATE TABLE IF NOT EXISTS public.external_competition_mappings (
  provider text NOT NULL DEFAULT 'highlightly',
  external_competition_id bigint NOT NULL,
  competition_id bigint NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  external_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, external_competition_id),
  UNIQUE (provider, competition_id)
);

ALTER TABLE public.external_competition_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS external_competition_mappings_admin_access ON public.external_competition_mappings;
CREATE POLICY external_competition_mappings_admin_access ON public.external_competition_mappings
  FOR ALL TO authenticated
  USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'pastues@icloud.com')
  WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'pastues@icloud.com');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_competition_mappings TO authenticated;
GRANT ALL ON public.external_competition_mappings TO service_role;
