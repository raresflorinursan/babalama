-- Remove duplicate legacy policies and avoid per-row auth.uid() evaluation.

-- Public builder profiles.
drop policy if exists "Public profiles are viewable" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists profiles_select_all on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;

create policy profiles_select_all
  on public.profiles for select to anon, authenticated
  using (true);
create policy profiles_insert_self
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update_self
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Public projects with owner-only writes.
drop policy if exists "Projects are public" on public.projects;
drop policy if exists "Users can insert own projects" on public.projects;
drop policy if exists "Users can update own projects" on public.projects;
drop policy if exists "Users can delete own projects" on public.projects;
drop policy if exists projects_select_all on public.projects;
drop policy if exists projects_insert_own on public.projects;
drop policy if exists projects_update_own on public.projects;
drop policy if exists projects_delete_own on public.projects;

create policy projects_select_all
  on public.projects for select to anon, authenticated
  using (true);
create policy projects_insert_own
  on public.projects for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy projects_update_own
  on public.projects for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy projects_delete_own
  on public.projects for delete to authenticated
  using (user_id = (select auth.uid()));

-- Public questions with owner-only writes.
drop policy if exists "Questions are public" on public.questions;
drop policy if exists "Users can insert own questions" on public.questions;
drop policy if exists "Users can update own questions" on public.questions;
drop policy if exists "Users can delete own questions" on public.questions;
drop policy if exists questions_select_all on public.questions;
drop policy if exists questions_insert_own on public.questions;
drop policy if exists questions_update_own on public.questions;
drop policy if exists questions_delete_own on public.questions;

create policy questions_select_all
  on public.questions for select to anon, authenticated
  using (true);
create policy questions_insert_own
  on public.questions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy questions_update_own
  on public.questions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy questions_delete_own
  on public.questions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Public answers with owner-only writes.
drop policy if exists "Answers are public" on public.answers;
drop policy if exists "Users can insert own answers" on public.answers;
drop policy if exists "Users can update own answers" on public.answers;
drop policy if exists "Users can delete own answers" on public.answers;
drop policy if exists answers_select_all on public.answers;
drop policy if exists answers_insert_own on public.answers;
drop policy if exists answers_update_own on public.answers;
drop policy if exists answers_delete_own on public.answers;

create policy answers_select_all
  on public.answers for select to anon, authenticated
  using (true);
create policy answers_insert_own
  on public.answers for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy answers_update_own
  on public.answers for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy answers_delete_own
  on public.answers for delete to authenticated
  using (user_id = (select auth.uid()));

-- Public project comments with owner-only writes.
drop policy if exists "Comments are public" on public.comments;
drop policy if exists "Users can insert own comments" on public.comments;
drop policy if exists "Users can update own comments" on public.comments;
drop policy if exists "Users can delete own comments" on public.comments;
drop policy if exists comments_select_all on public.comments;
drop policy if exists comments_insert_own on public.comments;
drop policy if exists comments_update_own on public.comments;
drop policy if exists comments_delete_own on public.comments;

create policy comments_select_all
  on public.comments for select to anon, authenticated
  using (true);
create policy comments_insert_own
  on public.comments for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy comments_update_own
  on public.comments for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy comments_delete_own
  on public.comments for delete to authenticated
  using (user_id = (select auth.uid()));

-- Project likes stay publicly readable for counts; writes remain owner-only.
drop policy if exists "Likes are public" on public.likes;
drop policy if exists "Users can insert own likes" on public.likes;
drop policy if exists "Users can delete own likes" on public.likes;
drop policy if exists likes_select_own on public.likes;
drop policy if exists likes_select_all on public.likes;
drop policy if exists likes_insert_own on public.likes;
drop policy if exists likes_delete_own on public.likes;

create policy likes_select_all
  on public.likes for select to anon, authenticated
  using (true);
create policy likes_insert_own
  on public.likes for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy likes_delete_own
  on public.likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Saved projects are private to their owner.
drop policy if exists "Users can view own saved projects" on public.saved_projects;
drop policy if exists "Users can insert own saved projects" on public.saved_projects;
drop policy if exists "Users can delete own saved projects" on public.saved_projects;
drop policy if exists saved_select_own on public.saved_projects;
drop policy if exists saved_insert_own on public.saved_projects;
drop policy if exists saved_delete_own on public.saved_projects;

create policy saved_select_own
  on public.saved_projects for select to authenticated
  using (user_id = (select auth.uid()));
create policy saved_insert_own
  on public.saved_projects for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy saved_delete_own
  on public.saved_projects for delete to authenticated
  using (user_id = (select auth.uid()));

-- Community deletes stay owner-only and use a stable auth init plan.
drop policy if exists community_posts_delete_own on public.community_posts;
create policy community_posts_delete_own
  on public.community_posts for delete to authenticated
  using ((select auth.uid()) is not null and user_id = (select auth.uid()));

-- Consolidate avatar policies and optimize both public upload buckets.
drop policy if exists "Users can delete own avatar" on storage.objects;
drop policy if exists "Users can upload own avatar" on storage.objects;
drop policy if exists "Users can select own avatar objects" on storage.objects;
drop policy if exists "Users can update own avatar" on storage.objects;
drop policy if exists avatars_select_own on storage.objects;
drop policy if exists avatars_insert_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;
drop policy if exists avatars_delete_own on storage.objects;
drop policy if exists project_images_insert_own on storage.objects;
drop policy if exists project_images_update_own on storage.objects;
drop policy if exists project_images_delete_own on storage.objects;

create policy avatars_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy avatars_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy avatars_update_own
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy avatars_delete_own
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy project_images_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy project_images_update_own
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy project_images_delete_own
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
