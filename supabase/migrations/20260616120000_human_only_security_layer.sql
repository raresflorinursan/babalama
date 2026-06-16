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
