-- Public buckets serve object URLs without a broad SELECT policy. Removing these
-- policies prevents clients from enumerating every uploaded object in a bucket.
drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "Public can view project images" on storage.objects;

-- Cover moderation foreign keys used for audit and restriction lookups.
create index if not exists content_reports_reviewed_by_idx
  on public.content_reports (reviewed_by)
  where reviewed_by is not null;

create index if not exists user_restrictions_created_by_idx
  on public.user_restrictions (created_by);
