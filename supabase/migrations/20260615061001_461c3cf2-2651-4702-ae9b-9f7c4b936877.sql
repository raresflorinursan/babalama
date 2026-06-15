
-- 1) Restrict likes SELECT to owner
DROP POLICY IF EXISTS likes_select_all ON public.likes;
CREATE POLICY likes_select_own ON public.likes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 2) Protect likes_count from direct owner updates
CREATE OR REPLACE FUNCTION public.protect_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.likes_count = OLD.likes_count;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS protect_likes_count_trigger ON public.projects;
CREATE TRIGGER protect_likes_count_trigger
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.protect_likes_count();

-- 3) URL protocol constraints
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_github_url_protocol CHECK (github_url IS NULL OR github_url ~* '^https?://'),
  ADD CONSTRAINT profiles_website_url_protocol CHECK (website_url IS NULL OR website_url ~* '^https?://'),
  ADD CONSTRAINT profiles_avatar_url_protocol CHECK (avatar_url IS NULL OR avatar_url ~* '^https?://');

ALTER TABLE public.projects
  ADD CONSTRAINT projects_github_url_protocol CHECK (github_url IS NULL OR github_url ~* '^https?://'),
  ADD CONSTRAINT projects_demo_url_protocol CHECK (demo_url IS NULL OR demo_url ~* '^https?://'),
  ADD CONSTRAINT projects_image_url_protocol CHECK (image_url IS NULL OR image_url ~* '^https?://');

-- 4) Storage RLS for project-images bucket: owner-scoped via first path segment = user id
CREATE POLICY "project_images_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "project_images_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "project_images_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "project_images_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1]);
