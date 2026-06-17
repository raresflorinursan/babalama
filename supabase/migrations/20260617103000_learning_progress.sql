-- Persist learning progress for the Solvix learning path.

CREATE TABLE IF NOT EXISTS public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  quiz_answer INTEGER,
  quiz_correct BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);

CREATE INDEX IF NOT EXISTS learning_progress_user_id_idx ON public.learning_progress(user_id);
CREATE INDEX IF NOT EXISTS learning_progress_module_id_idx ON public.learning_progress(module_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_progress TO authenticated;
GRANT ALL ON public.learning_progress TO service_role;

ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "learning_progress_select_own" ON public.learning_progress;
DROP POLICY IF EXISTS "learning_progress_insert_own" ON public.learning_progress;
DROP POLICY IF EXISTS "learning_progress_update_own" ON public.learning_progress;
DROP POLICY IF EXISTS "learning_progress_delete_own" ON public.learning_progress;

CREATE POLICY "learning_progress_select_own"
  ON public.learning_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "learning_progress_insert_own"
  ON public.learning_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "learning_progress_update_own"
  ON public.learning_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "learning_progress_delete_own"
  ON public.learning_progress
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS learning_progress_updated_at ON public.learning_progress;
CREATE TRIGGER learning_progress_updated_at
  BEFORE UPDATE ON public.learning_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
