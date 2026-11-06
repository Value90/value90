-- Record blind, out-of-sample evaluation runs against an already-trained model.
ALTER TABLE public.own_rating_runs
  ADD COLUMN IF NOT EXISTS evaluation_source_run_id uuid
    REFERENCES public.own_rating_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evaluation_mae numeric(7,4),
  ADD COLUMN IF NOT EXISTS evaluation_rmse numeric(7,4);

CREATE INDEX IF NOT EXISTS own_rating_runs_evaluation_source_idx
  ON public.own_rating_runs (evaluation_source_run_id, created_at DESC)
  WHERE evaluation_source_run_id IS NOT NULL;
