-- Supabase release hardening for Solvix.
-- Goal: least-privilege grants, enforced RLS, safe storage buckets, and stricter community post limits.

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;

-- Public profile data can be read by visitors, but only owners can create/update their own row.
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_self" ON public.profiles;

CREATE POLICY "profiles_select_all"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "profiles_insert_self"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = id);

CREATE POLICY "profiles_update_self"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = id);

-- Public content tables: visitors can read, authenticated owners can write their own content.
REVOKE ALL ON public.projects FROM anon, authenticated;
GRANT SELECT ON public.projects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_all" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;

CREATE POLICY "projects_select_all"
  ON public.projects
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "projects_insert_own"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY "projects_update_own"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY "projects_delete_own"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

REVOKE UPDATE (likes_count) ON public.projects FROM authenticated;

REVOKE ALL ON public.questions FROM anon, authenticated;
GRANT SELECT ON public.questions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "questions_select_all" ON public.questions;
DROP POLICY IF EXISTS "questions_insert_own" ON public.questions;
DROP POLICY IF EXISTS "questions_update_own" ON public.questions;
DROP POLICY IF EXISTS "questions_delete_own" ON public.questions;

CREATE POLICY "questions_select_all"
  ON public.questions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "questions_insert_own"
  ON public.questions
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY "questions_update_own"
  ON public.questions
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY "questions_delete_own"
  ON public.questions
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

REVOKE ALL ON public.answers FROM anon, authenticated;
GRANT SELECT ON public.answers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.answers TO authenticated;
GRANT ALL ON public.answers TO service_role;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "answers_select_all" ON public.answers;
DROP POLICY IF EXISTS "answers_insert_own" ON public.answers;
DROP POLICY IF EXISTS "answers_update_own" ON public.answers;
DROP POLICY IF EXISTS "answers_delete_own" ON public.answers;

CREATE POLICY "answers_select_all"
  ON public.answers
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "answers_insert_own"
  ON public.answers
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY "answers_update_own"
  ON public.answers
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY "answers_delete_own"
  ON public.answers
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

REVOKE ALL ON public.comments FROM anon, authenticated;
GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_all" ON public.comments;
DROP POLICY IF EXISTS "comments_insert_own" ON public.comments;
DROP POLICY IF EXISTS "comments_update_own" ON public.comments;
DROP POLICY IF EXISTS "comments_delete_own" ON public.comments;

CREATE POLICY "comments_select_all"
  ON public.comments
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "comments_insert_own"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY "comments_update_own"
  ON public.comments
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY "comments_delete_own"
  ON public.comments
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

-- Private relationship tables: no anonymous row access.
REVOKE ALL ON public.likes FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.likes TO authenticated;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes_select_all" ON public.likes;
DROP POLICY IF EXISTS "likes_select_own" ON public.likes;
DROP POLICY IF EXISTS likes_select_own ON public.likes;
DROP POLICY IF EXISTS "likes_insert_own" ON public.likes;
DROP POLICY IF EXISTS "likes_delete_own" ON public.likes;

CREATE POLICY "likes_select_own"
  ON public.likes
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY "likes_insert_own"
  ON public.likes
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY "likes_delete_own"
  ON public.likes
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

REVOKE ALL ON public.saved_projects FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.saved_projects TO authenticated;
GRANT ALL ON public.saved_projects TO service_role;
ALTER TABLE public.saved_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_projects FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_select_own" ON public.saved_projects;
DROP POLICY IF EXISTS "saved_insert_own" ON public.saved_projects;
DROP POLICY IF EXISTS "saved_delete_own" ON public.saved_projects;

CREATE POLICY "saved_select_own"
  ON public.saved_projects
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY "saved_insert_own"
  ON public.saved_projects
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY "saved_delete_own"
  ON public.saved_projects
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

-- Learning progress is private per user.
REVOKE ALL ON public.learning_progress FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_progress TO authenticated;
GRANT ALL ON public.learning_progress TO service_role;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "learning_progress_select_own" ON public.learning_progress;
DROP POLICY IF EXISTS "learning_progress_insert_own" ON public.learning_progress;
DROP POLICY IF EXISTS "learning_progress_update_own" ON public.learning_progress;
DROP POLICY IF EXISTS "learning_progress_delete_own" ON public.learning_progress;

CREATE POLICY "learning_progress_select_own"
  ON public.learning_progress
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY "learning_progress_insert_own"
  ON public.learning_progress
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY "learning_progress_update_own"
  ON public.learning_progress
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

CREATE POLICY "learning_progress_delete_own"
  ON public.learning_progress
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

-- Community posts: public visible feed, authenticated human-only authoring, 200 character limit.
ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS community_posts_body_check;
ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS community_posts_body_length;
ALTER TABLE public.community_posts
  ADD CONSTRAINT community_posts_body_length CHECK (length(btrim(body)) BETWEEN 1 AND 200);

ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS community_posts_tags_limit;
ALTER TABLE public.community_posts
  ADD CONSTRAINT community_posts_tags_limit CHECK (cardinality(tags) <= 8);

REVOKE ALL ON public.community_posts FROM anon, authenticated;
GRANT SELECT ON public.community_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_posts_select_visible" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_insert_own_human" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_update_own_human" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_delete_own" ON public.community_posts;

CREATE POLICY "community_posts_select_visible"
  ON public.community_posts
  FOR SELECT
  TO anon, authenticated
  USING (is_removed = false);

CREATE POLICY "community_posts_insert_own_human"
  ON public.community_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND (select auth.uid()) = user_id
    AND source_type = 'human'
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
    AND is_removed = false
  )
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND (select auth.uid()) = user_id
    AND source_type = 'human'
    AND is_removed = false
  );

CREATE POLICY "community_posts_delete_own"
  ON public.community_posts
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

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
  IF current_user_id IS NULL OR NEW.user_id <> current_user_id THEN
    RAISE EXCEPTION 'Community posts require the authenticated owner.';
  END IF;

  NEW.body := btrim(NEW.body);
  NEW.updated_at := now();
  NEW.source_type := 'human';

  IF NEW.body IS NULL OR length(NEW.body) < 1 OR length(NEW.body) > 200 THEN
    RAISE EXCEPTION 'Tweet text must be between 1 and 200 characters.';
  END IF;

  IF NEW.image_url IS NOT NULL AND NEW.image_url !~* '^https://' THEN
    RAISE EXCEPTION 'Tweet images must use https URLs.';
  END IF;

  IF cardinality(NEW.tags) > 8 THEN
    RAISE EXCEPTION 'Use at most 8 tags.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.user_id := OLD.user_id;
    NEW.created_at := OLD.created_at;
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

DROP TRIGGER IF EXISTS enforce_community_post_safety ON public.community_posts;
CREATE TRIGGER enforce_community_post_safety
  BEFORE INSERT OR UPDATE ON public.community_posts
  FOR EACH ROW
  EXECUTE FUNCTION app_private.enforce_community_post_safety();

-- Ensure storage buckets used by the app exist and are owner-scoped for writes.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-images',
  'project-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;

CREATE POLICY "avatars_public_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (select auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (select auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND (select auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (select auth.uid())::text = (storage.foldername(name))[1]);

-- Keep private helper functions unavailable to frontend roles.
REVOKE EXECUTE ON FUNCTION app_private.normalize_username(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.username_is_reserved(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.is_platform_admin(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.safe_profile_username(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.enforce_profile_username_rules() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.enforce_community_post_safety() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_project_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
