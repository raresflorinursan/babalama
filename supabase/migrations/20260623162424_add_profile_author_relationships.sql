-- Author-facing pages join these rows to public.profiles. The original foreign
-- keys only target auth.users, which is not exposed as a PostgREST relationship.
-- Applied to the live Solvix project as migration 20260623162424.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'projects_user_profile_fkey'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_user_profile_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'questions_user_profile_fkey'
      and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
      add constraint questions_user_profile_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'answers_user_profile_fkey'
      and conrelid = 'public.answers'::regclass
  ) then
    alter table public.answers
      add constraint answers_user_profile_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'comments_user_profile_fkey'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comments_user_profile_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end
$$;

notify pgrst, 'reload schema';
