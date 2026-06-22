-- Close the Solvix learning -> project -> public builder profile loop.

alter table public.projects
  add column if not exists learning_module_id text;

alter table public.projects
  drop constraint if exists projects_learning_module_id_check;
alter table public.projects
  add constraint projects_learning_module_id_check check (
    learning_module_id is null
    or learning_module_id in ('foundations', 'python', 'apis', 'ai-practice', 'automation', 'saas')
  );

create index if not exists projects_learning_module_idx
  on public.projects (learning_module_id)
  where learning_module_id is not null;

create table if not exists public.profile_learning_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null check (
    module_id in ('foundations', 'python', 'apis', 'ai-practice', 'automation', 'saas')
  ),
  completed_at timestamptz not null,
  primary key (user_id, module_id)
);

create index if not exists profile_learning_achievements_completed_idx
  on public.profile_learning_achievements (completed_at desc);

revoke all on public.profile_learning_achievements from anon, authenticated;
grant select on public.profile_learning_achievements to anon, authenticated;
grant all on public.profile_learning_achievements to service_role;

alter table public.profile_learning_achievements enable row level security;
alter table public.profile_learning_achievements force row level security;

drop policy if exists profile_learning_achievements_select_public
  on public.profile_learning_achievements;
create policy profile_learning_achievements_select_public
  on public.profile_learning_achievements
  for select to anon, authenticated
  using (true);

-- Normalize existing rows before the validation trigger becomes active.
update public.learning_progress
set
  quiz_correct = quiz_answer = case module_id
    when 'foundations' then 1
    when 'python' then 0
    when 'apis' then 0
    when 'ai-practice' then 1
    when 'automation' then 0
    when 'saas' then 0
    else -1
  end,
  completed_at = case
    when quiz_answer = case module_id
      when 'foundations' then 1
      when 'python' then 0
      when 'apis' then 0
      when 'ai-practice' then 1
      when 'automation' then 0
      when 'saas' then 0
      else -1
    end then completed_at
    else null
  end;

insert into public.profile_learning_achievements (user_id, module_id, completed_at)
select user_id, module_id, completed_at
from public.learning_progress
where quiz_correct = true and completed_at is not null
on conflict (user_id, module_id) do update
set completed_at = excluded.completed_at;

create or replace function app_private.enforce_learning_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  correct_answer integer;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Learning progress requires the authenticated owner.';
  end if;

  correct_answer := case new.module_id
    when 'foundations' then 1
    when 'python' then 0
    when 'apis' then 0
    when 'ai-practice' then 1
    when 'automation' then 0
    when 'saas' then 0
    else null
  end;

  if correct_answer is null then
    raise exception 'Unknown learning module.';
  end if;

  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.module_id := old.module_id;
    new.created_at := old.created_at;
  end if;

  new.quiz_correct := new.quiz_answer is not null and new.quiz_answer = correct_answer;
  if not new.quiz_correct then
    new.completed_at := null;
  elsif new.completed_at is not null and (tg_op = 'INSERT' or old.completed_at is null) then
    new.completed_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function app_private.enforce_learning_progress()
  from public, anon, authenticated;

drop trigger if exists enforce_learning_progress on public.learning_progress;
create trigger enforce_learning_progress
  before insert or update on public.learning_progress
  for each row execute function app_private.enforce_learning_progress();

create or replace function app_private.sync_profile_learning_achievement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.profile_learning_achievements
    where user_id = old.user_id and module_id = old.module_id;
    return old;
  end if;

  if new.quiz_correct and new.completed_at is not null then
    insert into public.profile_learning_achievements (user_id, module_id, completed_at)
    values (new.user_id, new.module_id, new.completed_at)
    on conflict (user_id, module_id) do update
    set completed_at = excluded.completed_at;
  else
    delete from public.profile_learning_achievements
    where user_id = new.user_id and module_id = new.module_id;
  end if;
  return new;
end;
$$;

revoke all on function app_private.sync_profile_learning_achievement()
  from public, anon, authenticated;

drop trigger if exists sync_profile_learning_achievement on public.learning_progress;
create trigger sync_profile_learning_achievement
  after insert or update or delete on public.learning_progress
  for each row execute function app_private.sync_profile_learning_achievement();

alter table public.learning_progress force row level security;

drop policy if exists learning_progress_select_own on public.learning_progress;
drop policy if exists learning_progress_insert_own on public.learning_progress;
drop policy if exists learning_progress_update_own on public.learning_progress;
drop policy if exists learning_progress_delete_own on public.learning_progress;

create policy learning_progress_select_own
  on public.learning_progress
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy learning_progress_insert_own
  on public.learning_progress
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy learning_progress_update_own
  on public.learning_progress
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy learning_progress_delete_own
  on public.learning_progress
  for delete to authenticated
  using (user_id = (select auth.uid()));
