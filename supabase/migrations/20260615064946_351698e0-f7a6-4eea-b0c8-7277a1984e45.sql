
-- 1) Revoke direct column update on likes_count from authenticated
REVOKE UPDATE (likes_count) ON public.projects FROM authenticated;

-- 2) Public read access for project-images bucket
DROP POLICY IF EXISTS "Public can view project images" ON storage.objects;
CREATE POLICY "Public can view project images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'project-images');
