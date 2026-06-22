-- Solvix community moderation, follows, blocks and account restrictions.
-- The private platform_admins table remains the authorization source of truth.

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated;

CREATE OR REPLACE FUNCTION app_private.current_user_is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app_private.platform_admins
    WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION app_private.current_user_is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.current_user_is_platform_admin() TO authenticated, service_role;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS platform_role TEXT NOT NULL DEFAULT 'member';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_platform_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_platform_role_check
      CHECK (platform_role IN ('member', 'moderator', 'admin', 'owner'));
  END IF;
END
$$;

UPDATE public.profiles AS profile
SET platform_role = admin.role
FROM app_private.platform_admins AS admin
WHERE profile.id = admin.user_id;

CREATE OR REPLACE FUNCTION app_private.enforce_profile_platform_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  assigned_role TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT role INTO assigned_role
    FROM app_private.platform_admins
    WHERE user_id = NEW.id;
    NEW.platform_role := coalesce(assigned_role, 'member');
  ELSE
    NEW.platform_role := OLD.platform_role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_platform_role ON public.profiles;
CREATE TRIGGER enforce_profile_platform_role
  BEFORE INSERT OR UPDATE OF platform_role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION app_private.enforce_profile_platform_role();

REVOKE ALL ON FUNCTION app_private.enforce_profile_platform_role() FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT user_follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS user_follows_following_idx
  ON public.user_follows(following_id);

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT user_blocks_no_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx
  ON public.user_blocks(blocked_id);

CREATE TABLE IF NOT EXISTS public.user_restrictions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('suspended', 'banned')),
  reason TEXT NOT NULL CHECK (length(btrim(reason)) BETWEEN 3 AND 300),
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_restrictions_expiry_check
    CHECK (status = 'banned' OR expires_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS user_restrictions_status_idx
  ON public.user_restrictions(status, expires_at);

CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'user')),
  target_id UUID NOT NULL,
  target_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_excerpt TEXT NOT NULL CHECK (length(target_excerpt) <= 500),
  reason TEXT NOT NULL CHECK (
    reason IN ('spam', 'harassment', 'hate', 'misinformation', 'impersonation', 'illegal', 'other')
  ),
  details TEXT CHECK (details IS NULL OR length(btrim(details)) <= 500),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  admin_notes TEXT CHECK (admin_notes IS NULL OR length(btrim(admin_notes)) <= 1000),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS content_reports_open_unique
  ON public.content_reports(reporter_id, target_type, target_id)
  WHERE status IN ('pending', 'reviewing');
CREATE INDEX IF NOT EXISTS content_reports_status_created_idx
  ON public.content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS content_reports_target_owner_idx
  ON public.content_reports(target_owner_id);

CREATE OR REPLACE FUNCTION app_private.current_user_can_interact()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_restrictions
      WHERE user_id = auth.uid()
        AND (status = 'banned' OR expires_at > now())
    );
$$;

CREATE OR REPLACE FUNCTION app_private.users_are_blocked(first_user UUID, second_user UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT first_user IS NOT NULL
    AND second_user IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_blocks
      WHERE (blocker_id = first_user AND blocked_id = second_user)
         OR (blocker_id = second_user AND blocked_id = first_user)
    );
$$;

REVOKE ALL ON FUNCTION app_private.current_user_can_interact() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app_private.users_are_blocked(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.current_user_can_interact() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.users_are_blocked(UUID, UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.enforce_follow_safety()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NEW.follower_id <> auth.uid() THEN
    RAISE EXCEPTION 'Follow relationships require the authenticated owner.';
  END IF;
  IF NEW.follower_id = NEW.following_id THEN
    RAISE EXCEPTION 'You cannot follow yourself.';
  END IF;
  IF NOT app_private.current_user_can_interact() THEN
    RAISE EXCEPTION 'This account cannot currently interact.';
  END IF;
  IF app_private.users_are_blocked(NEW.follower_id, NEW.following_id) THEN
    RAISE EXCEPTION 'This follow relationship is not available.';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.follower_id := OLD.follower_id;
    NEW.following_id := OLD.following_id;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_follow_safety ON public.user_follows;
CREATE TRIGGER enforce_follow_safety
  BEFORE INSERT OR UPDATE ON public.user_follows
  FOR EACH ROW
  EXECUTE FUNCTION app_private.enforce_follow_safety();

CREATE OR REPLACE FUNCTION app_private.enforce_block_safety()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NEW.blocker_id <> auth.uid() THEN
    RAISE EXCEPTION 'Blocks require the authenticated owner.';
  END IF;
  IF NEW.blocker_id = NEW.blocked_id THEN
    RAISE EXCEPTION 'You cannot block yourself.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_block_safety ON public.user_blocks;
CREATE TRIGGER enforce_block_safety
  BEFORE INSERT ON public.user_blocks
  FOR EACH ROW
  EXECUTE FUNCTION app_private.enforce_block_safety();

CREATE OR REPLACE FUNCTION app_private.remove_blocked_follows()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.user_follows
  WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
     OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS remove_blocked_follows ON public.user_blocks;
CREATE TRIGGER remove_blocked_follows
  AFTER INSERT ON public.user_blocks
  FOR EACH ROW
  EXECUTE FUNCTION app_private.remove_blocked_follows();

CREATE OR REPLACE FUNCTION app_private.enforce_restriction_safety()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT app_private.current_user_is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform administrators can restrict accounts.';
  END IF;
  IF app_private.is_platform_admin(NEW.user_id) THEN
    RAISE EXCEPTION 'Platform administrators cannot be restricted here.';
  END IF;
  NEW.reason := btrim(NEW.reason);
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
  ELSE
    NEW.user_id := OLD.user_id;
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
  END IF;
  IF NEW.status = 'banned' THEN
    NEW.expires_at := NULL;
  ELSIF NEW.expires_at IS NULL OR NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'Suspensions require a future expiry.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_restriction_safety ON public.user_restrictions;
CREATE TRIGGER enforce_restriction_safety
  BEFORE INSERT OR UPDATE ON public.user_restrictions
  FOR EACH ROW
  EXECUTE FUNCTION app_private.enforce_restriction_safety();

CREATE OR REPLACE FUNCTION app_private.enforce_report_safety()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  reports_last_hour INTEGER;
  owner_id UUID;
  excerpt TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL OR NEW.reporter_id <> auth.uid() THEN
      RAISE EXCEPTION 'Reports require the authenticated reporter.';
    END IF;
    IF NOT app_private.current_user_can_interact() THEN
      RAISE EXCEPTION 'This account cannot currently submit reports.';
    END IF;

    IF NEW.target_type = 'post' THEN
      SELECT user_id, left(body, 500) INTO owner_id, excerpt
      FROM public.community_posts
      WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'comment' THEN
      SELECT user_id, left(body, 500) INTO owner_id, excerpt
      FROM public.community_post_comments
      WHERE id = NEW.target_id;
    ELSE
      SELECT id, left(coalesce(username, full_name, id::TEXT), 500) INTO owner_id, excerpt
      FROM public.profiles
      WHERE id = NEW.target_id;
    END IF;

    IF owner_id IS NULL THEN
      RAISE EXCEPTION 'The reported target does not exist.';
    END IF;
    IF owner_id = auth.uid() THEN
      RAISE EXCEPTION 'You cannot report your own content or profile.';
    END IF;

    SELECT count(*) INTO reports_last_hour
    FROM public.content_reports
    WHERE reporter_id = auth.uid()
      AND created_at > now() - interval '1 hour';
    IF reports_last_hour >= 10 THEN
      RAISE EXCEPTION 'Hourly report limit reached.';
    END IF;

    NEW.target_owner_id := owner_id;
    NEW.target_excerpt := coalesce(excerpt, '');
    NEW.details := NULLIF(btrim(NEW.details), '');
    NEW.status := 'pending';
    NEW.admin_notes := NULL;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
  ELSE
    IF NOT app_private.current_user_is_platform_admin() THEN
      RAISE EXCEPTION 'Only platform administrators can review reports.';
    END IF;
    NEW.reporter_id := OLD.reporter_id;
    NEW.target_type := OLD.target_type;
    NEW.target_id := OLD.target_id;
    NEW.target_owner_id := OLD.target_owner_id;
    NEW.target_excerpt := OLD.target_excerpt;
    NEW.reason := OLD.reason;
    NEW.details := OLD.details;
    NEW.created_at := OLD.created_at;
    NEW.admin_notes := NULLIF(btrim(NEW.admin_notes), '');
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_report_safety ON public.content_reports;
CREATE TRIGGER enforce_report_safety
  BEFORE INSERT OR UPDATE ON public.content_reports
  FOR EACH ROW
  EXECUTE FUNCTION app_private.enforce_report_safety();

REVOKE ALL ON FUNCTION app_private.enforce_follow_safety() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.enforce_block_safety() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.remove_blocked_follows() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.enforce_restriction_safety() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.enforce_report_safety() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON public.user_follows FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_follows TO authenticated;
GRANT ALL ON public.user_follows TO service_role;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_follows_select_own ON public.user_follows;
DROP POLICY IF EXISTS user_follows_insert_own ON public.user_follows;
DROP POLICY IF EXISTS user_follows_update_own ON public.user_follows;
DROP POLICY IF EXISTS user_follows_delete_own ON public.user_follows;
CREATE POLICY user_follows_select_own ON public.user_follows
  FOR SELECT TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND follower_id = (select auth.uid()));
CREATE POLICY user_follows_insert_own ON public.user_follows
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND follower_id = (select auth.uid())
    AND (select app_private.current_user_can_interact())
  );
CREATE POLICY user_follows_update_own ON public.user_follows
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND follower_id = (select auth.uid()))
  WITH CHECK (
    follower_id = (select auth.uid())
    AND (select app_private.current_user_can_interact())
  );
CREATE POLICY user_follows_delete_own ON public.user_follows
  FOR DELETE TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND follower_id = (select auth.uid()));

REVOKE ALL ON public.user_blocks FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_blocks_select_own ON public.user_blocks;
DROP POLICY IF EXISTS user_blocks_insert_own ON public.user_blocks;
DROP POLICY IF EXISTS user_blocks_delete_own ON public.user_blocks;
CREATE POLICY user_blocks_select_own ON public.user_blocks
  FOR SELECT TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND blocker_id = (select auth.uid()));
CREATE POLICY user_blocks_insert_own ON public.user_blocks
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND blocker_id = (select auth.uid()));
CREATE POLICY user_blocks_delete_own ON public.user_blocks
  FOR DELETE TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND blocker_id = (select auth.uid()));

REVOKE ALL ON public.user_restrictions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_restrictions TO authenticated;
GRANT ALL ON public.user_restrictions TO service_role;
ALTER TABLE public.user_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_restrictions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_restrictions_select_authorized ON public.user_restrictions;
DROP POLICY IF EXISTS user_restrictions_insert_admin ON public.user_restrictions;
DROP POLICY IF EXISTS user_restrictions_update_admin ON public.user_restrictions;
DROP POLICY IF EXISTS user_restrictions_delete_admin ON public.user_restrictions;
CREATE POLICY user_restrictions_select_authorized ON public.user_restrictions
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR (select app_private.current_user_is_platform_admin())
  );
CREATE POLICY user_restrictions_insert_admin ON public.user_restrictions
  FOR INSERT TO authenticated
  WITH CHECK ((select app_private.current_user_is_platform_admin()));
CREATE POLICY user_restrictions_update_admin ON public.user_restrictions
  FOR UPDATE TO authenticated
  USING ((select app_private.current_user_is_platform_admin()))
  WITH CHECK ((select app_private.current_user_is_platform_admin()));
CREATE POLICY user_restrictions_delete_admin ON public.user_restrictions
  FOR DELETE TO authenticated
  USING ((select app_private.current_user_is_platform_admin()));

REVOKE ALL ON public.content_reports FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_reports_select_authorized ON public.content_reports;
DROP POLICY IF EXISTS content_reports_insert_own ON public.content_reports;
DROP POLICY IF EXISTS content_reports_update_admin ON public.content_reports;
CREATE POLICY content_reports_select_authorized ON public.content_reports
  FOR SELECT TO authenticated
  USING (
    reporter_id = (select auth.uid())
    OR (select app_private.current_user_is_platform_admin())
  );
CREATE POLICY content_reports_insert_own ON public.content_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = (select auth.uid())
    AND (select app_private.current_user_can_interact())
  );
CREATE POLICY content_reports_update_admin ON public.content_reports
  FOR UPDATE TO authenticated
  USING ((select app_private.current_user_is_platform_admin()))
  WITH CHECK ((select app_private.current_user_is_platform_admin()));

DROP POLICY IF EXISTS community_posts_select_visible ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_select_visible" ON public.community_posts;
DROP POLICY IF EXISTS community_posts_select_anon ON public.community_posts;
DROP POLICY IF EXISTS community_posts_select_authenticated ON public.community_posts;
DROP POLICY IF EXISTS community_posts_insert_own_human ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_insert_own_human" ON public.community_posts;
DROP POLICY IF EXISTS community_posts_update_own_human ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_update_own_human" ON public.community_posts;

CREATE POLICY community_posts_select_anon ON public.community_posts
  FOR SELECT TO anon
  USING (is_removed = false);
CREATE POLICY community_posts_select_authenticated ON public.community_posts
  FOR SELECT TO authenticated
  USING (
    (is_removed = false AND NOT app_private.users_are_blocked((select auth.uid()), user_id))
    OR (select app_private.current_user_is_platform_admin())
  );
CREATE POLICY community_posts_insert_own_human ON public.community_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND source_type = 'human'
    AND is_editorial = false
    AND is_removed = false
    AND (select app_private.current_user_can_interact())
  );
CREATE POLICY community_posts_update_own_human ON public.community_posts
  FOR UPDATE TO authenticated
  USING (
    (user_id = (select auth.uid()) AND is_editorial = false AND is_removed = false)
    OR (select app_private.current_user_is_platform_admin())
  )
  WITH CHECK (
    (
      user_id = (select auth.uid())
      AND source_type = 'human'
      AND is_editorial = false
      AND is_removed = false
      AND (select app_private.current_user_can_interact())
    )
    OR (select app_private.current_user_is_platform_admin())
  );

DROP POLICY IF EXISTS community_post_comments_select_visible ON public.community_post_comments;
DROP POLICY IF EXISTS "community_post_comments_select_visible" ON public.community_post_comments;
DROP POLICY IF EXISTS community_post_comments_select_anon ON public.community_post_comments;
DROP POLICY IF EXISTS community_post_comments_select_authenticated ON public.community_post_comments;
DROP POLICY IF EXISTS community_post_comments_insert_own ON public.community_post_comments;
DROP POLICY IF EXISTS "community_post_comments_insert_own" ON public.community_post_comments;
DROP POLICY IF EXISTS community_post_comments_update_own ON public.community_post_comments;
DROP POLICY IF EXISTS "community_post_comments_update_own" ON public.community_post_comments;

CREATE POLICY community_post_comments_select_anon ON public.community_post_comments
  FOR SELECT TO anon
  USING (is_removed = false);
CREATE POLICY community_post_comments_select_authenticated ON public.community_post_comments
  FOR SELECT TO authenticated
  USING (
    (is_removed = false AND NOT app_private.users_are_blocked((select auth.uid()), user_id))
    OR (select app_private.current_user_is_platform_admin())
  );
CREATE POLICY community_post_comments_insert_own ON public.community_post_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND source_type = 'human'
    AND is_removed = false
    AND (select app_private.current_user_can_interact())
  );
CREATE POLICY community_post_comments_update_own ON public.community_post_comments
  FOR UPDATE TO authenticated
  USING (
    (user_id = (select auth.uid()) AND is_removed = false)
    OR (select app_private.current_user_is_platform_admin())
  )
  WITH CHECK (
    (
      user_id = (select auth.uid())
      AND source_type = 'human'
      AND is_removed = false
      AND (select app_private.current_user_can_interact())
    )
    OR (select app_private.current_user_is_platform_admin())
  );

DROP POLICY IF EXISTS community_post_likes_insert_own ON public.community_post_likes;
DROP POLICY IF EXISTS "community_post_likes_insert_own" ON public.community_post_likes;
CREATE POLICY community_post_likes_insert_own ON public.community_post_likes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND (select app_private.current_user_can_interact())
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

  IF TG_OP = 'UPDATE' AND app_private.is_platform_admin(current_user_id) THEN
    NEW.user_id := OLD.user_id;
    NEW.body := OLD.body;
    NEW.image_url := OLD.image_url;
    NEW.tags := OLD.tags;
    NEW.category := OLD.category;
    NEW.source_type := OLD.source_type;
    NEW.is_editorial := OLD.is_editorial;
    NEW.seed_key := OLD.seed_key;
    NEW.like_count := OLD.like_count;
    NEW.comment_count := OLD.comment_count;
    NEW.share_count := OLD.share_count;
    NEW.created_at := OLD.created_at;
    NEW.removed_at := CASE WHEN NEW.is_removed THEN coalesce(OLD.removed_at, now()) ELSE NULL END;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF current_user_id IS NULL OR NEW.user_id <> current_user_id THEN
    RAISE EXCEPTION 'Community posts require the authenticated owner.';
  END IF;
  IF NOT app_private.current_user_can_interact() THEN
    RAISE EXCEPTION 'This account cannot currently post.';
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
  WHERE user_id = NEW.user_id AND created_at > now() - interval '1 minute';
  IF posts_last_minute >= 3 THEN
    RAISE EXCEPTION 'Posting too fast. Please wait a moment.';
  END IF;

  SELECT count(*) INTO posts_last_hour
  FROM public.community_posts
  WHERE user_id = NEW.user_id AND created_at > now() - interval '1 hour';
  IF posts_last_hour >= 30 THEN
    RAISE EXCEPTION 'Hourly post limit reached.';
  END IF;
  RETURN NEW;
END;
$$;

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
  IF TG_OP = 'UPDATE' AND app_private.is_platform_admin(current_user_id) THEN
    NEW.post_id := OLD.post_id;
    NEW.user_id := OLD.user_id;
    NEW.body := OLD.body;
    NEW.source_type := OLD.source_type;
    NEW.created_at := OLD.created_at;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF current_user_id IS NULL OR NEW.user_id <> current_user_id THEN
    RAISE EXCEPTION 'Comments require the authenticated owner.';
  END IF;
  IF NOT app_private.current_user_can_interact() THEN
    RAISE EXCEPTION 'This account cannot currently comment.';
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
  WHERE user_id = NEW.user_id AND created_at > now() - interval '1 minute';
  IF comments_last_minute >= 5 THEN
    RAISE EXCEPTION 'Commenting too fast. Please wait a moment.';
  END IF;

  SELECT count(*) INTO comments_last_hour
  FROM public.community_post_comments
  WHERE user_id = NEW.user_id AND created_at > now() - interval '1 hour';
  IF comments_last_hour >= 60 THEN
    RAISE EXCEPTION 'Hourly comment limit reached.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app_private.enforce_community_post_safety() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.enforce_community_comment_safety() FROM PUBLIC, anon, authenticated;
