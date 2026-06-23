# Supabase Queries Applied For Solvix

This file documents the Supabase SQL queries we used for the current Solvix database hardening pass.

Date: 2026-06-17
Live project ref: `ckmdhrrcevyswacszbrf`

## What Was Applied

1. Initial table existence check.
2. Community and safety foundation.
3. Learning progress table.
4. Release hardening for grants and RLS.
5. Storage buckets and storage policies.
6. Final verification checks.

## Important Notes

- Some SQL blocks contain `DROP POLICY IF EXISTS`, `DROP TRIGGER IF EXISTS`, `DROP CONSTRAINT IF EXISTS`, and `REVOKE` statements. Supabase flags these as potentially destructive because they change database objects, but they do not delete user content rows.
- Step 5 is documented as the corrected live-safe version because the first attempt failed on a missing `public.update_project_likes_count()` function.
- The owner/admin user ID currently used is `a87436d3-f228-4145-8e1d-1426a98c0d50`.

## 1. Initial Table Existence Check

```sql
-- Initial existence check.

select
  to_regclass('public.profiles') as profiles,
  to_regclass('public.projects') as projects,
  to_regclass('public.questions') as questions,
  to_regclass('public.community_posts') as community_posts,
  to_regclass('public.learning_progress') as learning_progress;
```

## 2. Community And Safety Foundation

```sql
-- Human-only platform safety layer.
-- Apply this in Supabase before wiring the Community MVP to persisted tweets.

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS app_private.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'moderator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Current Solvix owner account from the active profile route.
-- If this is not your Supabase auth user id, replace it before applying the migration.
INSERT INTO app_private.platform_admins (user_id, role)
VALUES ('a87436d3-f228-4145-8e1d-1426a98c0d50'::uuid, 'owner')
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION app_private.normalize_username(input_username TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT NULLIF(
    trim(both '_' from regexp_replace(lower(coalesce(input_username, '')), '[^a-z0-9_]+', '_', 'g')),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION app_private.username_is_reserved(input_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  normalized TEXT := app_private.normalize_username(input_username);
  brand_key TEXT := regexp_replace(lower(coalesce(input_username, '')), '[^a-z0-9]+', '', 'g');
BEGIN
  RETURN normalized IS NOT NULL AND (
    normalized IN (
      'admin',
      'administrator',
      'ceo',
      'founder',
      'moderator',
      'official',
      'solvix',
      'solvix_ceo',
      'solvixceo',
      'support',
      'team'
    )
    OR normalized LIKE '%solvix%'
    OR normalized LIKE '%sovix%'
    OR brand_key LIKE '%solvix%'
    OR brand_key LIKE '%sovix%'
  );
END;
$$;

CREATE OR REPLACE FUNCTION app_private.is_platform_admin(input_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_private.platform_admins
    WHERE user_id = input_user_id
  );
$$;

CREATE OR REPLACE FUNCTION app_private.safe_profile_username(wanted_username TEXT, input_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  base_username TEXT := app_private.normalize_username(wanted_username);
  candidate TEXT;
  suffix INTEGER := 0;
  suffix_text TEXT;
BEGIN
  IF base_username IS NULL OR length(base_username) < 3 OR app_private.username_is_reserved(base_username) THEN
    base_username := 'creator_' || replace(left(input_user_id::TEXT, 8), '-', '');
  END IF;

  base_username := left(base_username, 24);
  candidate := base_username;

  WHILE EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE username = candidate
      AND id <> input_user_id
  ) LOOP
    suffix := suffix + 1;
    suffix_text := '_' || suffix::TEXT;
    candidate := left(base_username, greatest(1, 24 - length(suffix_text))) || suffix_text;
  END LOOP;

  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.enforce_profile_username_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized TEXT;
BEGIN
  IF NEW.username IS NOT NULL THEN
    normalized := app_private.normalize_username(NEW.username);

    IF normalized IS NULL OR length(normalized) < 3 THEN
      RAISE EXCEPTION 'Username must contain at least 3 valid characters.';
    END IF;

    IF length(normalized) > 24 THEN
      normalized := left(normalized, 24);
    END IF;

    IF app_private.username_is_reserved(normalized) AND NOT app_private.is_platform_admin(NEW.id) THEN
      RAISE EXCEPTION 'Name ist schon vergeben.';
    END IF;

    NEW.username := normalized;
  END IF;

  IF NEW.bio IS NOT NULL AND length(NEW.bio) > 220 THEN
    RAISE EXCEPTION 'Bio may not be longer than 220 characters.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_username_rules ON public.profiles;
CREATE TRIGGER enforce_profile_username_rules
  BEFORE INSERT OR UPDATE OF username, bio ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION app_private.enforce_profile_username_rules();

CREATE OR REPLACE FUNCTION app_private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  wanted_username TEXT;
  generated_username TEXT;
BEGIN
  wanted_username := coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  generated_username := app_private.safe_profile_username(wanted_username, NEW.id);

  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    generated_username,
    coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION app_private.handle_new_user();

CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 500),
  image_url TEXT CHECK (image_url IS NULL OR image_url ~* '^https://'),
  tags TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'Allgemein',
  source_type TEXT NOT NULL DEFAULT 'human' CHECK (source_type = 'human'),
  is_removed BOOLEAN NOT NULL DEFAULT false,
  removed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_posts_user_id_idx ON public.community_posts(user_id);
CREATE INDEX IF NOT EXISTS community_posts_created_at_idx ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_tags_idx ON public.community_posts USING GIN(tags);

GRANT SELECT ON public.community_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_posts_select_visible" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_insert_own_human" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_update_own_human" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_delete_own" ON public.community_posts;

CREATE POLICY "community_posts_select_visible"
  ON public.community_posts
  FOR SELECT
  USING (is_removed = false);

CREATE POLICY "community_posts_insert_own_human"
  ON public.community_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND source_type = 'human' AND is_removed = false);

CREATE POLICY "community_posts_update_own_human"
  ON public.community_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_removed = false)
  WITH CHECK (auth.uid() = user_id AND source_type = 'human' AND is_removed = false);

CREATE POLICY "community_posts_delete_own"
  ON public.community_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

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

  IF NEW.body IS NULL OR length(NEW.body) < 1 OR length(NEW.body) > 500 THEN
    RAISE EXCEPTION 'Tweet text must be between 1 and 500 characters.';
  END IF;

  IF NEW.image_url IS NOT NULL AND NEW.image_url !~* '^https://' THEN
    RAISE EXCEPTION 'Tweet images must use https URLs.';
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

REVOKE EXECUTE ON FUNCTION app_private.normalize_username(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.username_is_reserved(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.is_platform_admin(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.safe_profile_username(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.enforce_profile_username_rules() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.enforce_community_post_safety() FROM PUBLIC, anon, authenticated;
```

## 3. Learning Progress Table

```sql
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
```

## 4. Release Hardening For Grants And RLS

```sql
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
```

## 5. Storage Buckets And Storage Policies Corrected

```sql
-- Step 5: Storage buckets and storage policies.
-- This was the corrected live-safe version after Supabase reported that public.update_project_likes_count() did not exist.

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
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Public can view project images" ON storage.objects;
DROP POLICY IF EXISTS "project_images_select_own" ON storage.objects;
DROP POLICY IF EXISTS "project_images_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "project_images_update_own" ON storage.objects;
DROP POLICY IF EXISTS "project_images_delete_own" ON storage.objects;

CREATE POLICY "Public can view project images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'project-images');

CREATE POLICY "project_images_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "project_images_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "project_images_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app_private'
      AND p.proname = 'normalize_username'
  ) THEN
    REVOKE EXECUTE ON FUNCTION app_private.normalize_username(TEXT) FROM PUBLIC, anon, authenticated;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app_private'
      AND p.proname = 'username_is_reserved'
  ) THEN
    REVOKE EXECUTE ON FUNCTION app_private.username_is_reserved(TEXT) FROM PUBLIC, anon, authenticated;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app_private'
      AND p.proname = 'is_platform_admin'
  ) THEN
    REVOKE EXECUTE ON FUNCTION app_private.is_platform_admin(UUID) FROM PUBLIC, anon, authenticated;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app_private'
      AND p.proname = 'safe_profile_username'
  ) THEN
    REVOKE EXECUTE ON FUNCTION app_private.safe_profile_username(TEXT, UUID) FROM PUBLIC, anon, authenticated;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app_private'
      AND p.proname = 'enforce_profile_username_rules'
  ) THEN
    REVOKE EXECUTE ON FUNCTION app_private.enforce_profile_username_rules() FROM PUBLIC, anon, authenticated;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app_private'
      AND p.proname = 'handle_new_user'
  ) THEN
    REVOKE EXECUTE ON FUNCTION app_private.handle_new_user() FROM PUBLIC, anon, authenticated;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app_private'
      AND p.proname = 'enforce_community_post_safety'
  ) THEN
    REVOKE EXECUTE ON FUNCTION app_private.enforce_community_post_safety() FROM PUBLIC, anon, authenticated;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'handle_new_user'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_project_likes_count'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.update_project_likes_count() FROM PUBLIC, anon, authenticated;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'set_updated_at'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
```

## 6. Final Verification Checks

```sql
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname in ('public', 'app_private')
  and tablename in (
    'profiles',
    'projects',
    'questions',
    'answers',
    'comments',
    'likes',
    'saved_projects',
    'community_posts',
    'learning_progress',
    'platform_admins'
  )
order by schemaname, tablename;

-- Role grant check used after applying the migrations.

select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema in ('public', 'app_private')
  and grantee in ('anon', 'authenticated')
  and table_name in (
    'profiles',
    'projects',
    'questions',
    'answers',
    'comments',
    'likes',
    'saved_projects',
    'community_posts',
    'learning_progress',
    'platform_admins'
  )
order by table_schema, table_name, grantee, privilege_type;
```

## 7. Community Persistence and Editorial Seed (2026-06-22)

Live angewendet als Migration `20260622151253_community_persistence_and_editorial_seed`.

- `community_posts` um redaktionelle Kennzeichnung und echte Zähler erweitert
- `community_post_comments` mit Owner-RLS und Rate-Limits erstellt
- `community_post_likes` mit privater Nutzerzuordnung und eindeutigen Likes erstellt
- Zähler werden ausschließlich über geschützte Trigger aktualisiert
- zehn Startbeiträge unter dem echten Owner-Konto eingefügt und als `Redaktion` markiert
- keine künstlichen Likes, Kommentare oder Fake-Nutzer angelegt

Der vollständige, reproduzierbare SQL-Stand liegt in:
`supabase/migrations/20260622151253_community_persistence_and_editorial_seed.sql`

## 8. Community Moderation and Relationships (2026-06-22)

Live angewendet als Migration `20260622160701_community_moderation_and_relationships`.

- `user_follows` speichert Folgen und Glocken-Einstellungen dauerhaft
- `user_blocks` speichert Blockierungen und entfernt gegenseitige Follow-Beziehungen
- `content_reports` speichert Meldungen mit Grund, Snapshot und Bearbeitungsstatus
- `user_restrictions` speichert zeitliche Suspendierungen und dauerhafte Sperren
- `profiles.platform_role` zeigt Rollen an, kann aber nicht vom Nutzer selbst geaendert werden
- Admin-Rechte werden weiterhin ausschliesslich aus `app_private.platform_admins` abgeleitet
- gesperrte Konten koennen keine Posts, Kommentare, Likes, Follows oder Meldungen erstellen
- blockierte Nutzer werden serverseitig aus Posts und Kommentaren gefiltert
- zehn Meldungen pro Stunde und Nutzer verhindern Missbrauch der Meldefunktion
- Admins koennen Inhalte per `is_removed` ausblenden, ohne Nachweise physisch zu loeschen

Der vollstaendige SQL-Stand liegt in:
`supabase/migrations/20260622160701_community_moderation_and_relationships.sql`

## 9. Storage and Moderation Index Hardening (2026-06-22)

Live angewendet als Migration `20260622163338_harden_public_storage_and_moderation_indexes`.

- breite SELECT-Policies der oeffentlichen Buckets `avatars` und `project-images` entfernt
- direkte oeffentliche Objekt-URLs bleiben nutzbar, Bucket-Inhalte sind nicht mehr auflistbar
- fehlende Indizes fuer Moderations-Audit-Fremdschluessel ergaenzt

Der vollstaendige SQL-Stand liegt in:
`supabase/migrations/20260622163338_harden_public_storage_and_moderation_indexes.sql`

## 10. Verification (2026-06-22)

Die neuen Regeln wurden in einer Transaktion mit zwei temporaeren Auth-Nutzern getestet und
vollstaendig zurueckgerollt. Erfolgreich geprueft wurden:

- nur der angemeldete Nutzer kann eigene Follow-Beziehungen anlegen
- Blockieren entfernt bestehende Follow-Beziehungen und verhindert neue
- normale Nutzer koennen Meldungen nicht moderieren
- der echte Owner kann Meldungen sehen und bearbeiten
- suspendierte Nutzer koennen nicht mehr interagieren
- der Produktions-Build fuer Vercel wird erfolgreich erzeugt

## 11. Private Meetings (2026-06-22)

Live angewendet als Migration `20260622171810_meetings_persistence`.

- private Zwei-Personen-Meetings mit registrierten Solvix-Nutzern
- nur Ersteller und Teilnehmer duerfen einen Termin lesen
- nur der Ersteller darf einen Termin aendern, absagen oder loeschen
- Startzeit muss in der Zukunft liegen
- Dauer ist auf 15 bis 180 Minuten begrenzt
- maximal 20 kommende Meetings pro Ersteller schuetzen vor Spam
- blockierte oder gesperrte Konten koennen keine neuen Meetings erstellen
- Meeting-Code fuer kopierbare, nicht fortlaufend erratbare Links
- explizite Data-API-Rechte und erzwungene Row Level Security

Die RLS-Regeln wurden mit drei temporaeren Nutzern in einer zurueckgerollten
Transaktion geprueft: Teilnehmer-Leserecht, fehlendes Bearbeitungsrecht fuer
Teilnehmer, keine Sichtbarkeit fuer unbeteiligte Nutzer und Blockierungswirkung.

Der vollstaendige SQL-Stand liegt in:
`supabase/migrations/20260622171810_meetings_persistence.sql`

## 12. Learning, Project and Profile Loop (2026-06-23)

Live angewendet als Migration `20260622222148_learning_project_profile_loop`.

- alle sechs Lernmodule besitzen eine direkt verknuepfte Projektaufgabe
- Projekt-Uploads speichern das zugehoerige Lernmodul
- Projektansichten kennzeichnen Lernprojekte und verlinken zum Lernpfad
- Profile zeigen abgeschlossene Module, Builder-Badges und Community-Aktivitaet
- Quizantworten werden serverseitig ausgewertet; der Browser kann Abschluesse nicht faelschen
- oeffentliche Lern-Achievements werden nur durch geschuetzte Trigger geschrieben
- Nutzer koennen Lern-Achievements lesen, aber nicht selbst anlegen oder manipulieren

Der vollstaendige SQL-Stand liegt in:
`supabase/migrations/20260622222148_learning_project_profile_loop.sql`

## 13. Legacy RLS Policy Optimization (2026-06-23)

Live angewendet als Migration `20260622224759_optimize_legacy_rls_policies`.

- doppelte Legacy-Policies fuer Profile, Projekte, Fragen, Antworten, Kommentare, Likes und gespeicherte Projekte entfernt
- Verhalten mit je einer eindeutigen Policy pro Rolle und Aktion erhalten
- `auth.uid()` in RLS-Policies als stabiler Init-Plan ausgefuehrt
- doppelte Avatar-Storage-Policies konsolidiert
- Projektbild- und Community-Delete-Policies ebenfalls optimiert
- Supabase-Performance-Advisor meldet danach keine RLS-Initplan- oder Mehrfach-Policy-Warnungen mehr

Der vollstaendige SQL-Stand liegt in:
`supabase/migrations/20260622224759_optimize_legacy_rls_policies.sql`

## 14. Learning Loop Verification (2026-06-23)

Die Regeln wurden in einer vollstaendig zurueckgerollten Transaktion mit einem
realen Auth-Kontext geprueft:

- eine falsche Quizantwort erzeugt weder Abschluss noch Achievement
- eine richtige Quizantwort setzt den Abschluss serverseitig
- das Achievement wird automatisch synchronisiert und ist oeffentlich lesbar
- `anon` und `authenticated` besitzen keine Schreibrechte auf Achievements
- der Lernmodul-Check fuer Projekte ist in der Datenbank aktiv
- Linter fuer die geaenderten Dateien und Vercel-Produktions-Build sind erfolgreich

## 15. Reserved Username Hardening (2026-06-23)

Live angewendet als Migration `20260623064800_strengthen_reserved_usernames`.

- reservierte Solvix-Namen werden nach Unicode-Normalisierung geprueft
- diakritische Zeichen und kyrillische Lookalikes werden vereinheitlicht
- Leetspeak wie `s0lvix` und wiederholte Buchstaben koennen die Sperre nicht umgehen
- nur das private Owner-/Admin-Register darf reservierte Markennamen verwenden

Der vollstaendige SQL-Stand liegt in:
`supabase/migrations/20260623064800_strengthen_reserved_usernames.sql`

## 16. Secure Data API Defaults (2026-06-23)

Live angewendet als Migration `20260623160309_harden_future_data_api_grants`.

- neue Tabellen, Sequenzen und Funktionen der Rolle `postgres` erhalten keine automatischen Client-Rechte
- neue Data-API-Freigaben muessen explizit zusammen mit RLS und Policies migriert werden
- bestehende Tabellenrechte und das aktuelle Anwendungsverhalten bleiben unveraendert
- die Aenderung wurde vorab in einer Transaktion getestet und vollstaendig zurueckgerollt

Der vollstaendige SQL-Stand liegt in:
`supabase/migrations/20260623160309_harden_future_data_api_grants.sql`

## 17. Final Security Audit (2026-06-23)

Live geprueft wurden:

- keine oeffentliche Solvix-Tabelle ohne RLS, FORCE RLS oder Policy
- keine Client-Tabellenrechte im privaten Admin-Schema
- keine oeffentlich ausfuehrbare `SECURITY DEFINER`-Funktion im `public`-Schema
- ein konsistenter Owner-Eintrag ohne Rollenabweichung im Profil
- keine RLS- oder Mehrfach-Policy-Warnungen im Performance Advisor
- nur bekannte Hinweise fuer den privaten Adminspeicher, den tarifabhaengigen Passwortschutz und noch unbenutzte Indizes

## 18. Profile Author Relationships (2026-06-23)

Live angewendet als Migration `20260623162424_add_profile_author_relationships`.

- Projekte, Fragen, Antworten und Kommentare verweisen neben `auth.users` eindeutig auf `public.profiles`
- PostgREST kann Autorenprofile dadurch als echte Relation aufloesen
- die bestehenden Kaskaden beim Loeschen eines Kontos bleiben erhalten
- die Migration ist idempotent und wurde vor der Live-Anwendung in einer Transaktion getestet
- die Supabase-TypeScript-Typen wurden danach aus dem Live-Schema neu erzeugt

Der vollstaendige SQL-Stand liegt in:
`supabase/migrations/20260623162424_add_profile_author_relationships.sql`
