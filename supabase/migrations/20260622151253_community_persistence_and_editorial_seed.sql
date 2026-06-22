-- Persist the Solvix community feed and real user interactions.
-- Editorial seed posts are transparent and belong to the platform owner.

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS is_editorial BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed_key TEXT,
  ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_posts_seed_key_key'
      AND conrelid = 'public.community_posts'::regclass
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT community_posts_seed_key_key UNIQUE (seed_key);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_posts_counts_nonnegative'
      AND conrelid = 'public.community_posts'::regclass
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT community_posts_counts_nonnegative
      CHECK (like_count >= 0 AND comment_count >= 0 AND share_count >= 0);
  END IF;
END
$$;

DROP POLICY IF EXISTS "community_posts_insert_own_human" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_update_own_human" ON public.community_posts;

CREATE POLICY "community_posts_insert_own_human"
  ON public.community_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND (select auth.uid()) = user_id
    AND source_type = 'human'
    AND is_editorial = false
    AND is_removed = false
  );

CREATE POLICY "community_posts_update_own_human"
  ON public.community_posts
  FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) IS NOT NULL
    AND (select auth.uid()) = user_id
    AND source_type = 'human'
    AND is_editorial = false
    AND is_removed = false
  )
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND (select auth.uid()) = user_id
    AND source_type = 'human'
    AND is_editorial = false
    AND is_removed = false
  );

CREATE OR REPLACE FUNCTION app_private.enforce_community_post_safety()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  posts_last_minute INTEGER;
  posts_last_hour INTEGER;
BEGIN
  IF TG_OP = 'UPDATE' AND pg_trigger_depth() > 1 THEN
    NEW.user_id := OLD.user_id;
    NEW.body := OLD.body;
    NEW.image_url := OLD.image_url;
    NEW.tags := OLD.tags;
    NEW.category := OLD.category;
    NEW.source_type := OLD.source_type;
    NEW.is_editorial := OLD.is_editorial;
    NEW.seed_key := OLD.seed_key;
    NEW.is_removed := OLD.is_removed;
    NEW.removed_at := OLD.removed_at;
    NEW.created_at := OLD.created_at;
    NEW.updated_at := OLD.updated_at;
    RETURN NEW;
  END IF;

  IF current_user_id IS NULL OR NEW.user_id <> current_user_id THEN
    RAISE EXCEPTION 'Community posts require the authenticated owner.';
  END IF;

  NEW.body := btrim(NEW.body);
  NEW.updated_at := now();

  IF TG_OP = 'UPDATE' THEN
    NEW.user_id := OLD.user_id;
    NEW.source_type := OLD.source_type;
    NEW.is_editorial := OLD.is_editorial;
    NEW.seed_key := OLD.seed_key;
    NEW.is_removed := OLD.is_removed;
    NEW.removed_at := OLD.removed_at;
    NEW.like_count := OLD.like_count;
    NEW.comment_count := OLD.comment_count;
    NEW.share_count := OLD.share_count;
    NEW.created_at := OLD.created_at;
  ELSE
    NEW.source_type := 'human';
    NEW.is_editorial := false;
    NEW.seed_key := NULL;
    NEW.like_count := 0;
    NEW.comment_count := 0;
    NEW.share_count := 0;
  END IF;

  IF NEW.body IS NULL OR length(NEW.body) < 1 OR length(NEW.body) > 200 THEN
    RAISE EXCEPTION 'Tweet text must be between 1 and 200 characters.';
  END IF;

  IF NEW.image_url IS NOT NULL AND NEW.image_url !~* '^https://' THEN
    RAISE EXCEPTION 'Tweet images must use https URLs.';
  END IF;

  IF cardinality(NEW.tags) > 8 THEN
    RAISE EXCEPTION 'Tweets support at most 8 tags.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO posts_last_minute
  FROM public.community_posts
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '1 minute';

  IF posts_last_minute >= 3 THEN
    RAISE EXCEPTION 'Posting too fast. Please wait a moment.';
  END IF;

  SELECT count(*) INTO posts_last_hour
  FROM public.community_posts
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '1 hour';

  IF posts_last_hour >= 30 THEN
    RAISE EXCEPTION 'Hourly post limit reached.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION app_private.enforce_community_post_safety() FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.community_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 300),
  source_type TEXT NOT NULL DEFAULT 'human' CHECK (source_type = 'human'),
  is_removed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_post_comments_post_created_idx
  ON public.community_post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS community_post_comments_user_idx
  ON public.community_post_comments(user_id);

REVOKE ALL ON public.community_post_comments FROM anon, authenticated;
GRANT SELECT ON public.community_post_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_post_comments TO authenticated;
GRANT ALL ON public.community_post_comments TO service_role;
ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_comments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_post_comments_select_visible" ON public.community_post_comments;
DROP POLICY IF EXISTS "community_post_comments_insert_own" ON public.community_post_comments;
DROP POLICY IF EXISTS "community_post_comments_update_own" ON public.community_post_comments;
DROP POLICY IF EXISTS "community_post_comments_delete_own" ON public.community_post_comments;

CREATE POLICY "community_post_comments_select_visible"
  ON public.community_post_comments
  FOR SELECT
  TO anon, authenticated
  USING (is_removed = false);

CREATE POLICY "community_post_comments_insert_own"
  ON public.community_post_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND (select auth.uid()) = user_id
    AND source_type = 'human'
    AND is_removed = false
  );

CREATE POLICY "community_post_comments_update_own"
  ON public.community_post_comments
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id AND is_removed = false)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id AND source_type = 'human' AND is_removed = false);

CREATE POLICY "community_post_comments_delete_own"
  ON public.community_post_comments
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.community_post_likes (
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS community_post_likes_user_idx
  ON public.community_post_likes(user_id);

REVOKE ALL ON public.community_post_likes FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_post_likes TO authenticated;
GRANT ALL ON public.community_post_likes TO service_role;
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_likes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_post_likes_select_own" ON public.community_post_likes;
DROP POLICY IF EXISTS "community_post_likes_insert_own" ON public.community_post_likes;
DROP POLICY IF EXISTS "community_post_likes_delete_own" ON public.community_post_likes;

CREATE POLICY "community_post_likes_select_own"
  ON public.community_post_likes
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY "community_post_likes_insert_own"
  ON public.community_post_likes
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY "community_post_likes_delete_own"
  ON public.community_post_likes
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION app_private.enforce_community_comment_safety()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  comments_last_minute INTEGER;
  comments_last_hour INTEGER;
BEGIN
  IF current_user_id IS NULL OR NEW.user_id <> current_user_id THEN
    RAISE EXCEPTION 'Comments require the authenticated owner.';
  END IF;

  NEW.body := btrim(NEW.body);
  NEW.updated_at := now();

  IF TG_OP = 'UPDATE' THEN
    NEW.post_id := OLD.post_id;
    NEW.user_id := OLD.user_id;
    NEW.source_type := OLD.source_type;
    NEW.is_removed := OLD.is_removed;
    NEW.created_at := OLD.created_at;
  ELSE
    NEW.source_type := 'human';
    NEW.is_removed := false;
  END IF;

  IF NEW.body IS NULL OR length(NEW.body) < 1 OR length(NEW.body) > 300 THEN
    RAISE EXCEPTION 'Comment text must be between 1 and 300 characters.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO comments_last_minute
  FROM public.community_post_comments
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '1 minute';

  IF comments_last_minute >= 5 THEN
    RAISE EXCEPTION 'Commenting too fast. Please wait a moment.';
  END IF;

  SELECT count(*) INTO comments_last_hour
  FROM public.community_post_comments
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '1 hour';

  IF comments_last_hour >= 60 THEN
    RAISE EXCEPTION 'Hourly comment limit reached.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_community_comment_safety ON public.community_post_comments;
CREATE TRIGGER enforce_community_comment_safety
  BEFORE INSERT OR UPDATE ON public.community_post_comments
  FOR EACH ROW
  EXECUTE FUNCTION app_private.enforce_community_comment_safety();

CREATE OR REPLACE FUNCTION app_private.sync_community_post_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_post_id UUID := coalesce(NEW.post_id, OLD.post_id);
BEGIN
  UPDATE public.community_posts
  SET like_count = (
    SELECT count(*) FROM public.community_post_likes WHERE post_id = target_post_id
  )
  WHERE id = target_post_id;
  RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_community_post_like_count ON public.community_post_likes;
CREATE TRIGGER sync_community_post_like_count
  AFTER INSERT OR DELETE ON public.community_post_likes
  FOR EACH ROW
  EXECUTE FUNCTION app_private.sync_community_post_like_count();

CREATE OR REPLACE FUNCTION app_private.sync_community_post_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_post_id UUID := coalesce(NEW.post_id, OLD.post_id);
BEGIN
  UPDATE public.community_posts
  SET comment_count = (
    SELECT count(*)
    FROM public.community_post_comments
    WHERE post_id = target_post_id AND is_removed = false
  )
  WHERE id = target_post_id;
  RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_community_post_comment_count ON public.community_post_comments;
CREATE TRIGGER sync_community_post_comment_count
  AFTER INSERT OR DELETE OR UPDATE OF is_removed ON public.community_post_comments
  FOR EACH ROW
  EXECUTE FUNCTION app_private.sync_community_post_comment_count();

REVOKE EXECUTE ON FUNCTION app_private.enforce_community_comment_safety() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.sync_community_post_like_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.sync_community_post_comment_count() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.community_posts DISABLE TRIGGER enforce_community_post_safety;

WITH owner_account AS (
  SELECT user_id
  FROM app_private.platform_admins
  WHERE role = 'owner'
  ORDER BY created_at ASC
  LIMIT 1
), seed(seed_key, body, tags, category, created_at) AS (
  VALUES
    ('editorial_welcome', 'Willkommen bei Solvix. Hier teilen wir Coding-Learnings, KI-Workflows und ehrliche Einblicke in den Aufbau digitaler Produkte. #Solvix', ARRAY['Solvix','BuildInPublic'], 'Allgemein', now() - interval '9 hours'),
    ('editorial_coding', 'Coding wird leichter, sobald du nicht mehr nur Syntax lernst: Nimm ein echtes Problem und baue jeden Tag eine kleine Lösung. #Coding', ARRAY['Coding','Learning'], 'Coding', now() - interval '8 hours'),
    ('editorial_ai', 'Ein guter KI-Workflow hat ein klares Ziel, verlässliche Daten und überprüfbare Ergebnisse. Das Modell allein ist noch kein System. #KI', ARRAY['KI','Automation'], 'KI', now() - interval '7 hours'),
    ('editorial_api', 'APIs sind Verträge zwischen Software-Systemen. Verstehe Request, Response und Fehlercodes, bevor du die nächste Integration baust. #APIs', ARRAY['APIs','Coding'], 'Coding', now() - interval '6 hours'),
    ('editorial_saas', 'Ein gutes SaaS startet nicht mit möglichst vielen Features, sondern mit einem wiederkehrenden Problem, für dessen Lösung Kunden zahlen. #SaaS', ARRAY['SaaS','MVP'], 'SaaS', now() - interval '5 hours'),
    ('editorial_projects', 'Projektidee: Baue ein Dashboard, das Daten aus einer öffentlichen API lädt, filtert und verständlich visualisiert. #Projekt', ARRAY['Projekt','APIs'], 'Projekte', now() - interval '4 hours'),
    ('editorial_question', 'Welche kleine Aufgabe in deinem Alltag würdest du als Erstes automatisieren, wenn du heute eine API und einen KI-Agenten kombinierst? #Frage', ARRAY['Frage','Automation'], 'Fragen', now() - interval '3 hours'),
    ('editorial_security', 'Frontend-API-Keys sind nur mit sauberem RLS sicher. Service-Role-Keys gehören niemals in Browser-Code oder öffentliche Repositories. #Security', ARRAY['Security','Supabase'], 'Coding', now() - interval '2 hours'),
    ('editorial_shipping', 'Ein MVP muss nicht alles können. Es muss einen Kernablauf zuverlässig lösen und dir echtes Nutzerfeedback liefern. #BuildInPublic', ARRAY['BuildInPublic','MVP'], 'Projekte', now() - interval '1 hour'),
    ('editorial_community', 'Teile heute ein Learning aus deinem aktuellen Projekt. Konkrete Erfahrungen helfen anderen Buildern mehr als perfekte Theorie. #Community', ARRAY['Community','Learning'], 'Allgemein', now() - interval '15 minutes')
)
INSERT INTO public.community_posts (
  user_id, body, tags, category, source_type, is_editorial, seed_key, created_at, updated_at
)
SELECT owner_account.user_id, seed.body, seed.tags, seed.category, 'human', true, seed.seed_key, seed.created_at, seed.created_at
FROM owner_account
CROSS JOIN seed
ON CONFLICT (seed_key) DO UPDATE
SET body = EXCLUDED.body,
    tags = EXCLUDED.tags,
    category = EXCLUDED.category,
    is_editorial = true,
    updated_at = EXCLUDED.updated_at;

ALTER TABLE public.community_posts ENABLE TRIGGER enforce_community_post_safety;
